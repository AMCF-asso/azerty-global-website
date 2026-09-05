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

test('la navigation immersive garde les sorties en bas et le chrome habituel sur les autres pages', async ({ page, network }) => {
  await page.goto('/bienvenue');
  await expect(page.locator('header.header')).toHaveCount(0);
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
