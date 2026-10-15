const { test, expect } = require('../helpers/local-site');

const providerHost = /(^|\.)(googletagmanager\.com|google-analytics\.com|googleadservices\.com|doubleclick\.net|umami\.is|cloudflareinsights\.com)$/;

async function assertNoAnalytics(page, network) {
  expect(network.externalRequests.filter(request => providerHost.test(new URL(request.url).hostname)), 'No analytics script or transport may even be requested in local preview').toEqual([]);
  expect(await page.evaluate(() => window.dataLayer ?? []), 'No analytics event may be queued locally').toEqual([]);
  expect(await page.evaluate(() => typeof window.gtag)).toBe('undefined');
  expect(network.web3FormsRequests).toEqual([]);
  expect(network.pageErrors).toEqual([]);
  expect(network.cspViolations).toEqual([]);
}

for (const route of ['/', '/en/', '/bienvenue']) {
  test(`${route}: local preview keeps analytics inert while the trial remains usable`, async ({ page, network }) => {
    const response = await page.goto(route);
    expect(response.status()).toBe(200);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.locator('script[src*="js/v2/mesure.js"]')).toHaveCount(1);
    expect(await page.evaluate(() => [window.AGMesure.actif, window.AGMesure.test])).toEqual([false, false]);
    expect(await page.evaluate(() => window.AGMesure.evenement('telechargement', { os: 'windows', canal: 'store' }))).toBe(true);
    expect(await page.evaluate(() => window.AGMesure.journal.map((e) => e.envoye))).toEqual([false]);
    await assertNoAnalytics(page, network);

    if (route === '/bienvenue') {
      /* v2 /bienvenue : l'essai vit sur /testeur, la page y mène. */
      await expect(page.locator('main a[href="/testeur"]').first()).toBeVisible();
    } else if (route === '/') {
      /* v2 home: the trial lives on /testeur, not in a modal. */
      await expect(page.locator('main a[href="/testeur"]').first()).toBeVisible();
    } else {
      await page.locator('#open-tester-btn').click();
      await expect(page.locator('#tester-modal')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#tester-modal')).toBeHidden();
    }
    await assertNoAnalytics(page, network);
  });
}
