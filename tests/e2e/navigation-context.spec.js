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
 * /en/download est restée en v1 et charge encore `js/nav-context.js` : ce qui
 * suit la couvre réellement, et virera au rouge le jour où elle bascule — c'est
 * le signal voulu, pas une régression à contourner.
 *
 * Le contrat n'est pas abandonné pour autant : le réimplémenter en v2 (~2 h)
 * reste ouvert. Preuve fichier par fichier et chiffrage dans
 * `IA/studies/2026-09-03-navigation-context-tests-refonte-v2.md`.
 */

const downloadPages = [
  { language: 'FR', path: '/download.html', guidePath: '/guide.html', hasCallout: false, hasEntryMode: false },
  { language: 'EN', path: '/en/download.html', guidePath: '/en/guide.html', hasCallout: true, hasEntryMode: true }
];

// La page qui porte encore l'encart, pour les tests qui portent sur lui.
const calloutPage = downloadPages.find((page) => page.hasCallout);

// Même principe pour le mode d'entrée : déclaré par un drapeau, jamais supposé.
// La FR est en v2 et ne l'implémente plus (voir l'en-tête).
const entryModePages = downloadPages.filter((page) => page.hasEntryMode);
const entryModePage = entryModePages[0];

for (const downloadPage of entryModePages) {
  test(`${downloadPage.language} — a direct visit stays in discover mode after reload`, async ({ page }) => {
    await page.goto(downloadPage.path, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'discover');
    if (downloadPage.hasCallout) {
      await expect(page.locator('.download-callout-section')).toBeVisible();
    }

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'discover');
    if (downloadPage.hasCallout) {
      await expect(page.locator('.download-callout-section')).toBeVisible();
    }
  });

  test(`${downloadPage.language} — an internal navigation uses continue mode`, async ({ page }) => {
    await page.goto(downloadPage.guidePath, { waitUntil: 'domcontentloaded' });
    // `Télécharger` est un lien visible de la barre dans les deux langues.
    await page.locator(`.nav a[href="${downloadPage.path.replace('.html', '')}"]`).click();

    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'continue');
    if (downloadPage.hasCallout) {
      await expect(page.locator('.download-callout-section')).toBeHidden();
    }
  });

  test(`${downloadPage.language} — the mobile relay uses task mode`, async ({ page }) => {
    await page.goto(`${downloadPage.path}?utm_source=mobile-relay`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'task');
    if (downloadPage.hasCallout) {
      await expect(page.locator('.download-callout-section')).toBeHidden();
    }
  });

  test(`${downloadPage.language} — download_entry_view is emitted once with entry_mode`, async ({ page }) => {
    await page.goto(`${downloadPage.path}?utm_source=mobile-relay`, { waitUntil: 'domcontentloaded' });

    await expect.poll(() => page.evaluate(() => (
      window.dataLayer.filter((item) => item.event === 'download_entry_view')
    ))).toEqual([
      expect.objectContaining({
        event: 'download_entry_view',
        entry_mode: 'task'
      })
    ]);
    await expect.poll(() => page.evaluate(() => typeof window.AzertyTrack?.event)).toBe('function');
  });
}

test('an external referrer starts a new discover entry after a previous visit', async ({ page }) => {
  await page.goto(entryModePage.path, { waitUntil: 'domcontentloaded' });
  await page.goto(entryModePage.guidePath, { waitUntil: 'domcontentloaded' });
  await page.goto(entryModePage.path, {
    referer: 'https://www.google.com/search?q=azerty+global',
    waitUntil: 'domcontentloaded'
  });

  await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'discover');
});

test('reload preserves the entry mode and unrelated history state', async ({ page }) => {
  await page.goto(entryModePage.path, {
    referer: 'https://www.google.com/search?q=azerty+global',
    waitUntil: 'domcontentloaded'
  });
  await page.evaluate(() => {
    history.replaceState(Object.assign({}, history.state, { routerData: 'keep-me' }), document.title);
  });

  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'discover');
  await expect.poll(() => page.evaluate(() => history.state.routerData)).toBe('keep-me');
});

test('a legacy ag_seen value does not affect a direct entry', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('ag_seen', '1'));
  await page.goto(entryModePage.path, { waitUntil: 'domcontentloaded' });

  await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'discover');
});

test('the callout remains available when JavaScript is disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto(calloutPage.path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).not.toHaveAttribute('data-entry-mode', /.+/);
  await expect(page.locator('.download-callout-section')).toBeVisible();

  await context.close();
});

test('the discover callout has one primary action and secondary links', async ({ page }) => {
  await page.goto(calloutPage.path, { waitUntil: 'domcontentloaded' });

  const callout = page.locator('.download-callout');
  await expect(callout).toContainText(/not a virtual keyboard|pas un clavier virtuel/i);
  await expect(callout.locator('.btn')).toHaveCount(1);
  await expect(callout.locator('#open-tester-btn')).toBeVisible();
  await expect(callout.locator('.download-callout__links a')).toHaveCount(2);
});

test('Download conversion clicks inherit entry_mode', async ({ page }) => {
  await page.goto(entryModePage.path, { waitUntil: 'domcontentloaded' });

  const trackedPayloads = await page.evaluate(() => {
    const ids = ['btn-download-store', 'btn-download-msix', 'btn-download-exe', 'open-tester-btn'];

    return ids.map((id) => {
      const element = document.getElementById(id);
      const startIndex = window.dataLayer.length;
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return window.dataLayer.slice(startIndex).find((item) => item.event === 'conversion');
    });
  });

  expect(trackedPayloads).toHaveLength(4);
  trackedPayloads.forEach((payload) => {
    expect(payload).toEqual(expect.objectContaining({ entry_mode: 'discover' }));
  });
});

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

    for (const entry of sameLanguage) {
      await page.goto(hrefToPath(entry.href), { waitUntil: 'domcontentloaded' });

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
