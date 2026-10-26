/* Variante de /download selon le continent (functions/download.js en
   production). scripts/serve-static.js applique la même transformation sur
   `?variante=afrique`, comme les aperçus Cloudflare. */

const { test, expect, devices } = require('@playwright/test');

const MOBILE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: devices['iPhone SE'].userAgent
};

async function varianteVue(page) {
  await page.waitForFunction(() => window.AGMesure && window.AGMesure.journal.some((e) => e.nom === 'variante_vue'));
  return page.evaluate(() => window.AGMesure.journal.find((e) => e.nom === 'variante_vue').params.variante);
}

test('standard : la page se déclare standard et garde son héros', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/download');
  await expect(page.locator('html')).toHaveAttribute('data-variante', 'standard');
  await expect(page.locator('meta[name="ag-variante"]')).toHaveAttribute('content', 'standard');
  await expect(page.locator('.hero-download__compat')).toBeHidden();
  await expect(page.locator('.relais-mobile--heros')).toBeHidden();
  expect(await varianteVue(page)).toBe('standard');
});

test('afrique, bureau : Windows 10 dit dans le héros, mesuré comme afrique', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/download?variante=afrique');
  await expect(page.locator('html')).toHaveAttribute('data-variante', 'afrique');
  await expect(page.locator('.hero-download__compat')).toBeVisible();
  await expect(page.locator('.hero-download__compat')).toContainText('Windows 10 (version 1809 ou plus récente)');
  await expect(page.locator('.relais-mobile--heros')).toBeHidden();
  expect(await varianteVue(page)).toBe('afrique');
});

test('afrique, mobile : le relais passe avant le bouton du Store', async ({ browser }) => {
  const contexte = await browser.newContext(MOBILE);
  const page = await contexte.newPage();
  await page.goto('/download?variante=afrique');
  const relais = page.locator('.relais-mobile--heros');
  await expect(relais).toBeVisible();
  await expect(page.locator('.relais-mobile--installation')).toBeHidden();
  const yRelais = (await relais.boundingBox()).y;
  const yStore = (await page.locator('#btn-download-store').boundingBox()).y;
  expect(yRelais).toBeLessThan(yStore);
  /* La ligne de recommandation répéterait le relais : elle s'efface. */
  await expect(page.locator('[data-os-reco]')).toBeHidden();
  await contexte.close();
});

test('standard, mobile : le relais reste dans l’installation', async ({ browser }) => {
  const contexte = await browser.newContext(MOBILE);
  const page = await contexte.newPage();
  await page.goto('/download');
  await expect(page.locator('.relais-mobile--heros')).toBeHidden();
  await expect(page.locator('.relais-mobile--installation')).toBeVisible();
  await expect(page.locator('[data-os-reco]')).toContainText('plus bas');
  await contexte.close();
});
