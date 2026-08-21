const { test, expect } = require('@playwright/test');

/**
 * Le logo de l'en-tête ne doit jamais se déformer.
 *
 * `.header__logo` est un enfant flex avec `flex-shrink: 1` et `min-width: auto`.
 * Quand la navigation s'élargit — une entrée ajoutée, une étiquette allongée —
 * le logo absorbe le déficit et s'écrase horizontalement, à hauteur constante.
 * Les garde-fous existants ne voient pas ce cas : ils cherchent les
 * débordements de viewport et la hauteur de l'en-tête, or ni l'un ni l'autre ne
 * change.
 *
 * Mesuré le 2026-08-19 : l'ajout d'une 7e entrée a réduit le logo de 192×100 à
 * 125×100 entre 1366 et 1990 px, et à 42×100 à 1025 px. Le site en production
 * était déjà à 168×100 à 1025 px avant ce changement.
 *
 * À lancer contre `dist/`, l'artefact déployé : `npm run test:e2e:dist`.
 * Les `.html` de la racine du dépôt sont des copies legacy périmées.
 */

// La largeur la plus étroite où la barre horizontale est encore affichée est
// 1025 px : en dessous, `@media (max-width: 1024px)` la replie en menu burger.
const DESKTOP_WIDTHS = [1025, 1100, 1240, 1366, 1990];

const PAGES = [
  { label: 'FR accueil', path: '/index.html' },
  { label: 'FR association', path: '/association.html' },
  { label: 'EN accueil', path: '/en/index.html' }
];

async function measureLogo(page) {
  return page.evaluate(() => {
    const img = document.querySelector('.header__logo-img');
    if (!img) return null;
    const box = img.getBoundingClientRect();
    return {
      width: box.width,
      height: box.height,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    };
  });
}

for (const { label, path } of PAGES) {
  for (const width of DESKTOP_WIDTHS) {
    test(`${label} — le logo garde ses proportions à ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: 'load' });
      await page.locator('.header__logo-img').waitFor({ state: 'visible' });

      const logo = await measureLogo(page);
      expect(logo, 'le logo de l’en-tête doit être présent').not.toBeNull();
      expect(logo.naturalWidth, 'l’image du logo doit être chargée').toBeGreaterThan(0);

      const rendered = logo.width / logo.height;
      const natural = logo.naturalWidth / logo.naturalHeight;

      // 1 % de tolérance : au-delà, la déformation est visible à l'œil.
      expect(
        Math.abs(rendered - natural),
        `logo rendu ${Math.round(logo.width)}×${Math.round(logo.height)} `
          + `(ratio ${rendered.toFixed(3)}) contre un ratio naturel de ${natural.toFixed(3)} `
          + `— la navigation prend trop de place et comprime le logo`
      ).toBeLessThan(natural * 0.01);
    });
  }
}

test('la barre horizontale tient sur une seule ligne à 1025 px', async ({ page }) => {
  await page.setViewportSize({ width: 1025, height: 900 });
  await page.goto('/index.html', { waitUntil: 'load' });

  const result = await page.evaluate(() => {
    const nav = document.querySelector('.nav');
    const inner = document.querySelector('.header__inner');
    const items = [...nav.querySelectorAll(':scope > .nav__link')];
    const toggle = nav.querySelector('.nav__dropdown-toggle');
    const boxes = items.map((el) => el.getBoundingClientRect());
    if (toggle) boxes.push(toggle.getBoundingClientRect());
    // On compare les CENTRES, pas les `top`. Le bouton « Plus » est haut de
    // 36 px quand les liens font 40 : mesuré le 2026-08-19, ses `top` valent
    // 18 contre 16, et tous les centres valent 36. Un test bâti sur `top`
    // rougit sur une navigation parfaitement alignée — vérifié aussi sur la
    // version en production, donc ce n'était pas un signe de régression.
    const centres = boxes.map((b) => b.top + b.height / 2);
    const median = centres.slice().sort((a, b) => a - b)[Math.floor(centres.length / 2)];
    return {
      ecartCentreMax: Math.max(...centres.map((c) => Math.abs(c - median))),
      debordeInner: nav.getBoundingClientRect().right > inner.getBoundingClientRect().right + 1,
      rogne: nav.scrollWidth > nav.clientWidth + 2,
      scrollHorizontal: document.documentElement.scrollWidth > 1025 + 1
    };
  });

  // Un vrai retour à la ligne décale un centre d'au moins une hauteur de lien
  // (36 px). 4 px de tolérance couvre l'arrondi sous-pixel sans laisser passer
  // un saut de ligne.
  expect(
    result.ecartCentreMax,
    'les entrées de navigation doivent rester sur une ligne'
  ).toBeLessThan(4);
  expect(result.debordeInner, 'la navigation ne doit pas dépasser l’en-tête').toBe(false);
  expect(result.rogne, 'la navigation ne doit pas être rognée').toBe(false);
  expect(result.scrollHorizontal, 'la page ne doit pas défiler horizontalement').toBe(false);
});
