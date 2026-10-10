const { test, expect } = require('@playwright/test');

/**
 * Le logo de l'en-tête ne doit jamais se déformer (réécrit pour la v2 le
 * 2026-10-10).
 *
 * Version précédente (v1) : sélecteurs `.header__logo-img`, `.nav`,
 * `.nav__link`, `.nav__dropdown-toggle`, absents des pages v2 ; elle donnait
 * 13 échecs. Retirés avec elle : le seuil de 1025 px (la v1 repliait sa barre
 * sous 1024 px) et la page EN accueil, encore en en-tête v1 dans dist tant que
 * la migration EN n'est pas faite. L'historique est dans git.
 *
 * Comportement conservé : le logo (`.entete__logo`, dans `.entete__marque`)
 * est un enfant flex ; si la navigation s'élargit, il ne doit pas s'écraser
 * horizontalement. Les garde-fous de débordement et de hauteur d'en-tête ne
 * voient pas ce cas.
 *
 * En v2 (css/v2/shell.css) la barre horizontale s'affiche à partir de
 * 1160 px ; en dessous, un bouton « Menu » replie la navigation.
 *
 * À lancer contre `dist/`, l'artefact déployé : `npm run test:e2e:dist`.
 * Les `.html` de la racine du dépôt sont des copies legacy périmées.
 */

// 1159 et 1160 encadrent le point de bascule burger/barre ; 320 est sous le
// palier `max-width: 359px` du logo.
const WIDTHS = [320, 375, 768, 1024, 1159, 1160, 1366, 1990];
const LARGEUR_BARRE = 1160;

const PAGES = [
  { label: 'FR accueil', path: '/index.html' },
  { label: 'FR association', path: '/association.html' },
  { label: 'EN téléchargement', path: '/en/download.html' }
];

async function measureLogo(page) {
  return page.evaluate(() => {
    const img = document.querySelector('.entete__logo');
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
  for (const width of WIDTHS) {
    test(`${label} — le logo garde ses proportions à ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: 'load' });
      await page.locator('.entete__logo').waitFor({ state: 'visible' });

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

test(`la barre horizontale tient sur une seule ligne à ${LARGEUR_BARRE} px`, async ({ page }) => {
  await page.setViewportSize({ width: LARGEUR_BARRE, height: 900 });
  await page.goto('/index.html', { waitUntil: 'load' });
  await page.locator('.nav-principale').waitFor({ state: 'visible' });

  const result = await page.evaluate((largeur) => {
    const nav = document.querySelector('.nav-principale');
    const inner = document.querySelector('.entete__inner');
    const entrees = [...nav.querySelectorAll(':scope > .nav-principale__lien, :scope > .nav-groupe > summary')];
    // Logo, CTA visible (le CTA tactile est masqué au pointeur fin) et outils
    // partagent la même ligne que la navigation.
    const autres = ['.entete__marque', '.entete__cta', '.entete__outils']
      .flatMap((selecteur) => [...document.querySelectorAll(selecteur)]);
    const boxes = [...entrees, ...autres]
      .map((el) => el.getBoundingClientRect())
      .filter((b) => b.width > 0 && b.height > 0);
    // On compare les CENTRES, pas les `top` : les éléments n'ont pas tous la
    // même hauteur dans une barre pourtant alignée.
    const centres = boxes.map((b) => b.top + b.height / 2);
    const median = centres.slice().sort((a, b) => a - b)[Math.floor(centres.length / 2)];
    return {
      elements: boxes.length,
      ecartCentreMax: Math.max(...centres.map((c) => Math.abs(c - median))),
      debordeInner: nav.getBoundingClientRect().right > inner.getBoundingClientRect().right + 1,
      rogne: nav.scrollWidth > nav.clientWidth + 2,
      scrollHorizontal: document.documentElement.scrollWidth > largeur + 1
    };
  }, LARGEUR_BARRE);

  // Un vrai retour à la ligne décale un centre d'au moins une hauteur de lien
  // (≈ 40 px). 4 px de tolérance couvre l'arrondi sous-pixel sans laisser
  // passer un saut de ligne.
  expect(result.elements, 'la navigation et le reste de la barre doivent être mesurés').toBeGreaterThanOrEqual(8);
  expect(
    result.ecartCentreMax,
    'les entrées de navigation doivent rester sur une ligne'
  ).toBeLessThan(4);
  expect(result.debordeInner, 'la navigation ne doit pas dépasser l’en-tête').toBe(false);
  expect(result.rogne, 'la navigation ne doit pas être rognée').toBe(false);
  expect(result.scrollHorizontal, 'la page ne doit pas défiler horizontalement').toBe(false);
});
