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

/* Depuis l'accueil v2.2 (Option 3 · Duo règle + éventail, 2026-11-24), le héros
   affiche la scène 3D 65° (avec repli image WebP) et l'arrière-plan SVG Option 3,
   sans aide-mémoire plein écran ; la scène interactive « Bœuf ou poulet ? » vit
   dans #disposition juste dessous. */
test("accueil : plus d'aide-mémoire plein écran dans le héros", async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await expect(page.locator('.heros-accueil [data-clavier-imprimer]')).toHaveCount(0);
  await expect(page.locator('.heros-accueil #hero-backdrop-svg')).toBeVisible();
  await expect(page.locator('.heros-accueil #hero-3d-canvas, .heros-accueil #hero-fallback-img').first()).toBeVisible();
});

test("accueil : héros 3D et scène « Bœuf ou poulet ? » synchronisés sans décalage", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'load' });
  const interrupteur = page.locator('#disposition #repair-switch');
  const phrase = page.locator('#disposition #kinetic-phrase');
  const touches = page.locator('#disposition #hk-keys-layer .hk-key');
  await expect(interrupteur).toHaveAttribute('aria-checked', 'false');
  await expect(phrase).toHaveClass(/is-broken/);
  expect(await touches.count()).toBe(62);

  await interrupteur.click();
  await expect(interrupteur).toHaveAttribute('aria-checked', 'true');
  await expect(phrase).toHaveClass(/is-healed/);
  await expect(page.locator('#hero-controls [data-hero-mode="after"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#hero-3d-reset')).toBeVisible();
  await expect(page.locator('#hero-3d-pause')).toBeVisible();
});
