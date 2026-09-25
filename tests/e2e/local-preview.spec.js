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
    await expect(page.locator('meta[name="gtm-id"]')).toHaveAttribute('content', 'GTM-PWWRV6JT');
    const loader = page.locator('script[src*="/analytics-loader.js"]');
    await expect(loader).toHaveCount(1);
    await expect(loader).toHaveAttribute('data-cf-beacon', '{"token": "bc30c343130f4bfa88c667173f84e324"}');
    await expect(loader).toHaveAttribute('data-website-id', '54fa0bee-e290-4779-b00a-2683e625bf36');
    await page.evaluate(() => {
      window.AzertyTrack.event('local_preview_probe', { source: 'test' });
      window.AzertyTrack.conversion('local_preview_probe', { source: 'test' });
    });
    await assertNoAnalytics(page, network);

    if (route === '/bienvenue') {
      await page.locator('#welcome-start').click();
      await expect(page.locator('#welcome-trial')).toBeVisible();
      await expect(page.locator('#welcome-input')).toBeVisible();
      await expect(page.locator('#welcome-error')).toBeHidden();
      await page.locator('#welcome-quit').click();
      await expect(page.locator('#welcome-trial')).toBeHidden();
    } else {
      await page.locator('#open-tester-btn').click();
      await expect(page.locator('#tester-modal')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#tester-modal')).toBeHidden();
    }
    await assertNoAnalytics(page, network);
  });
}
