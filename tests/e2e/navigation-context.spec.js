const { test, expect } = require('@playwright/test');

/**
 * Contrat de navigation et de mode d'entrée, réécrit le 2026-08-22.
 *
 * Ce fichier était rouge sur 7 assertions depuis le commit d8199c7
 * (« /download : téléchargement en premier, page dégraissée »), qui a
 * retiré `.download-callout-section` de la version FR. Il encodait donc
 * l'état d'avant, et un test rouge en permanence ne signale plus rien.
 *
 * Deux principes pour qu'il ne rementte pas :
 *  - l'encart n'est attendu que sur les pages qui le portent réellement,
 *    déclaré par un drapeau et pas supposé partout ;
 *  - l'appartenance d'une entrée de navigation — lien visible ou élément
 *    de déroulant — est LUE DANS LE DOM au lieu d'être codée en dur. La
 *    barre a bougé deux fois en trois jours, et une liste figée mentait à
 *    chaque fois.
 *
 * Restreint aux pages EN le 2026-09-03, sur arbitrage d'Antoine. La page
 * /download FR est passée en v2 (`layout: v2/base.njk`, scripts
 * `js/v2/download.js`) et la v2 n'implémente pas le contrat de mode d'entrée :
 * ni `data-entry-mode`, ni `download_entry_view`, ni `aria-current="page"` dans
 * sa barre. Neuf tests étaient donc rouges en permanence, sans rien signaler.
 *
 * /en/download est passée en v2 à son tour le 2026-10-10 (roadmap E1, QCM
 * d'Antoine) : plus aucune page ne porte l'encart ni le mode d'entrée. Les
 * dix tests qui les couvraient sont retirés (historique git, commit de E1) ;
 * restent la barre EN v1 et l'absence de débordement des deux /download.
 *
 * Le contrat n'est pas abandonné pour autant : le réimplémenter en v2 (~2 h)
 * reste ouvert. Preuve fichier par fichier et chiffrage dans
 * `IA/studies/2026-09-03-navigation-context-tests-refonte-v2.md`.
 */

const downloadPages = [
  { language: 'FR', path: '/download.html', guidePath: '/guide.html', hasCallout: false, hasEntryMode: false },
  { language: 'EN', path: '/en/download.html', guidePath: '/en/guide.html', hasCallout: false, hasEntryMode: false }
];

/**
 * Traduit un href de navigation en chemin de fichier servi.
 * `/` -> `/index.html`, `/en/` -> `/en/index.html`, `/guide` -> `/guide.html`.
 */
function hrefToPath(href) {
  if (href.endsWith('/')) return `${href}index.html`;
  return `${href}.html`;
}

// FR retiré le 2026-09-03 : la barre v2 ne pose pas `aria-current="page"`
// (0 occurrence dans `dist/index.html`). À rétablir quand elle le portera.
for (const { language, home, prefix } of [
  { language: 'EN', home: '/en/index.html', prefix: '/en/' }
]) {
  test(`${language} — main navigation marks the normalized current page`, async ({ page }) => {
    await page.goto(home, { waitUntil: 'domcontentloaded' });

    // Appartenance lue dans le DOM, pas codée en dur : chaque entrée sait
    // si elle est un lien visible ou l'élément d'un déroulant, et duquel.
    const entries = await page.evaluate(() => {
      const nav = document.querySelector('.nav');
      const found = [];

      nav.querySelectorAll(':scope > .nav__link').forEach((link) => {
        found.push({ href: link.getAttribute('href'), menuId: null });
      });
      nav.querySelectorAll(':scope > .nav__dropdown').forEach((dropdown) => {
        const menuId = dropdown.querySelector('.nav__dropdown-menu').id;
        dropdown.querySelectorAll('.nav__dropdown-item').forEach((item) => {
          found.push({ href: item.getAttribute('href'), menuId });
        });
      });
      return found;
    });

    expect(entries.length, 'la barre doit porter des entrées').toBeGreaterThan(4);
    expect(
      entries.filter((entry) => entry.menuId !== null).length,
      'au moins un déroulant doit être peuplé'
    ).toBeGreaterThan(0);

    // Les liens qui changent de langue sortent du périmètre : ils mènent à
    // une page dont la barre est l'autre barre.
    const sameLanguage = entries.filter((entry) => (
      prefix === '/en/' ? entry.href.startsWith('/en/') : !entry.href.startsWith('/en/')
    ));

    let pagesV1 = 0;
    for (const entry of sameLanguage) {
      await page.goto(hrefToPath(entry.href), { waitUntil: 'domcontentloaded' });
      // Une page EN passée en v2 (E1 : /en/download, /en/comparison, /en/guide)
      // n'a plus la barre v1 : elle sort du contrat, comme la FR.
      if (await page.locator('.nav').count() === 0) continue;
      pagesV1 += 1;

      const activeLink = page.locator(`.nav a[href="${entry.href}"]`);
      await expect(activeLink, `${entry.href} doit être marqué courant`)
        .toHaveAttribute('aria-current', 'page');
      await expect(page.locator('.nav a[aria-current="page"]')).toHaveCount(1);

      const toggles = page.locator('.nav__dropdown-toggle');
      const toggleCount = await toggles.count();

      if (entry.menuId === null) {
        await expect(activeLink).toHaveClass(/nav__link--active/);
        // Aucun toggle ne doit s'allumer pour un lien visible.
        for (let index = 0; index < toggleCount; index += 1) {
          await expect(toggles.nth(index)).not.toHaveClass(/nav__dropdown-toggle--active/);
        }
      } else {
        await expect(activeLink).toHaveClass(/nav__dropdown-item--active/);
        // Seul le toggle du déroulant QUI CONTIENT le lien doit s'allumer :
        // depuis l'ajout de « Organisations » la barre en porte deux, et un
        // querySelector au singulier allumait toujours le premier du DOM.
        const owner = page.locator(`.nav__dropdown-toggle[aria-controls="${entry.menuId}"]`);
        await expect(owner).toHaveClass(/nav__dropdown-toggle--active/);
        await expect(page.locator('.nav__dropdown-toggle--active')).toHaveCount(1);
      }
    }
    expect(pagesV1, 'au moins une page EN encore en v1').toBeGreaterThan(0);
  });
}

test('Download entry modes keep a compact, overflow-free layout at required widths', async ({ page }) => {
  const widths = [360, 390, 768, 1366, 1920];

  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });

    for (const downloadPage of downloadPages) {
      await page.goto(downloadPage.path, { waitUntil: 'domcontentloaded' });
      if (downloadPage.hasCallout) {
        await expect(page.locator('.download-callout-section')).toBeVisible();
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      await page.goto(downloadPage.guidePath, { waitUntil: 'domcontentloaded' });
      await page.evaluate((path) => {
        window.location.href = path;
      }, downloadPage.path);
      await page.waitForURL(`**${downloadPage.path}`);

      if (downloadPage.hasCallout) {
        await expect(page.locator('.download-callout-section')).toBeHidden();
        await expect.poll(() => page.locator('.download-callout-section').evaluate((element) => (
          getComputedStyle(element).display === 'none' && element.getBoundingClientRect().height === 0
        ))).toBe(true);
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});
