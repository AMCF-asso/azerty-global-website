/* Clavier v2 — cadre défilant et impression (correctifs du 2026-10-05).

   1. Le cadre `.clavier-defilement` n'est un arrêt de tabulation que s'il
      défile, y compris sur les pages qui ne chargent pas clavier.js
      (js/v2/shell.js, reglerDefilement).
   2. La CSS d'impression ne masque la page que là où vit la feuille A4
      (/guide). Ailleurs, la page s'imprime ; le bouton « Imprimer
      l'aide-mémoire » de l'accueil reste un lien vers le PDF. */

const { test, expect } = require('../helpers/local-site');

const INERTES = ['/a-propos', '/francais-etranger', '/pilote'];

async function textesVisibles(page) {
  return page.$$eval('main *', (els) => els.filter((e) =>
    e.offsetParent !== null && e.children.length === 0 && e.textContent.trim()).length);
}

for (const url of INERTES) {
  test(`cadre du clavier inerte de ${url} : arrêt de tabulation seulement s'il défile`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: 'load' });
    const cadre = page.locator('.clavier-defilement').first();
    await expect(cadre).not.toHaveAttribute('tabindex', /.*/);
    await expect(cadre).not.toHaveAttribute('role', /.*/);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(cadre).toHaveAttribute('tabindex', '0');
    await expect(cadre).toHaveAttribute('role', 'region');
  });
}

test('cadre du clavier interactif de /dev : jamais un arrêt de tabulation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev', { waitUntil: 'load' });
  const cadre = page.locator('.clavier-defilement').first();
  await expect(page.locator('.clavier[data-interactif]').first()).toBeAttached();
  await expect(cadre).not.toHaveAttribute('tabindex', /.*/);
});

for (const url of ['/', '/a-propos', '/dev', '/faq']) {
  test(`impression de ${url} : la page sort`, async ({ page }) => {
    await page.goto(url, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    expect(await textesVisibles(page)).toBeGreaterThan(10);
  });
}

test('impression de /guide : seule la feuille A4 sort', async ({ page }) => {
  await page.goto('/guide', { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.feuille-impression')).toBeVisible();
  await expect(page.locator('main > :not(.feuille-impression)').first()).toBeHidden();
  await expect(page.locator('button[data-clavier-imprimer]').first()).toBeAttached();
});

test("accueil : « Imprimer l'aide-mémoire » reste un lien vers le PDF", async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  const lien = page.locator('[data-clavier-imprimer]').first();
  await expect(lien).toHaveJSProperty('tagName', 'A');
  await expect(lien).toHaveAttribute('href', /\.pdf$/);
});
