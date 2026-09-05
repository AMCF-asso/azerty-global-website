const { test, expect } = require('../helpers/local-site');

test('la démonstration est finie, rejouable et ne charge pas le moteur de saisie', async ({ page, network }) => {
  const trialRequests = [];
  page.on('request', request => {
    if (/bienvenue-trial|tester\/keyboard\.js/.test(request.url())) trialRequests.push(request.url());
  });
  await page.clock.install();
  await page.goto('/bienvenue');
  await expect(page.locator('#welcome-demo')).toHaveClass(/is-playing/);
  await page.clock.runFor(3500);
  await expect(page.locator('#welcome-demo')).not.toHaveClass(/is-playing/);
  await page.locator('#welcome-replay').click();
  await expect(page.locator('#welcome-demo')).toHaveClass(/is-playing/);
  await page.clock.runFor(3500);
  await expect(page.locator('#welcome-demo')).not.toHaveClass(/is-playing/);
  expect(trialRequests).toEqual([]);
  await expect(page.locator('#welcome-trial')).toBeHidden();
  expect(network.pageErrors).toEqual([]);
  expect(network.cspViolations).toEqual([]);
});

test('le mouvement réduit garde un exemple lisible sans animation', async ({ page, network }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/bienvenue');
  await expect(page.locator('#welcome-demo')).not.toHaveClass(/is-playing/);
  await expect(page.locator('#welcome-replay')).toBeHidden();
  await expect(page.locator('.welcome-demo-output')).toHaveAttribute('aria-label', 'ÇA GÈLE DÉJÀ ?');
  expect(await page.locator('[data-demo-key]').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).opacity === '1'))).toBe(true);
  expect(network.pageErrors).toEqual([]);
  expect(network.cspViolations).toEqual([]);
});

test('la navigation immersive donne accès aux pages principales en haut et en bas', async ({ page, network }) => {
  await page.goto('/bienvenue');
  await expect(page.locator('header.header')).toHaveCount(0);
  for (const href of ['/', '/download', '/guide', '/association']) {
    await expect(page.locator(`.welcome-nav a[href="${href}"]`)).toBeInViewport();
  }
  await expect(page.locator('.welcome-footer nav a[href="/"]')).toBeAttached();
  await expect(page.locator('.welcome-footer nav a[href="/download"]')).toBeAttached();
  await expect(page.locator('.welcome-footer nav a[href="/guide"]')).toBeAttached();
  await expect(page.locator('.welcome-footer a[href="/mentions-legales"]')).toBeAttached();
  await page.goto('/');
  await expect(page.locator('header.header')).toBeVisible();
  await expect(page.locator('footer.footer')).toBeAttached();
  expect(network.pageErrors).toEqual([]);
  expect(network.cspViolations).toEqual([]);
});

for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 720 }, { width: 1536, height: 864 }]) {
  test(`navigation et essai compacts à ${viewport.width}×${viewport.height}`, async ({ page, network }) => {
    await page.setViewportSize(viewport);
    await page.goto('/bienvenue');
    await expect(page.locator('.welcome-brand')).toBeInViewport();
    for (const link of await page.locator('.welcome-nav a').all()) await expect(link).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('#welcome-start').click();
    await expect(page.locator('#welcome-input')).toBeFocused();
    await expect(page.locator('#welcome-keyboard-container .key').first()).toBeVisible();
    const input = await page.locator('#welcome-input').boundingBox();
    expect(input.height).toBeLessThanOrEqual(52);
    expect(input.width).toBeLessThanOrEqual(609);
    if (viewport.width > 760) {
      await expect.poll(async () => {
        const box = await page.locator('#welcome-keyboard-container').boundingBox();
        return box.y >= 0 && box.y + box.height <= viewport.height;
      }).toBe(true);
      await expect(page.locator('#welcome-input')).toBeInViewport({ ratio: 1 });
      await expect(page.locator('#welcome-instruction')).toBeInViewport({ ratio: 1 });
    }
    expect(network.pageErrors).toEqual([]);
    expect(network.cspViolations).toEqual([]);
  });
}
