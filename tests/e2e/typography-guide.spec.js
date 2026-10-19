const { test, expect } = require('@playwright/test');

// Guide typographique v2 (/francais-correct, /en/french-typography), gabarit
// src/_includes/typography-guide.njk. Réécrit le 2026-09-30 (lot 7, vague 5) :
// la conversion v2 du 2026-09-24 a retiré le finder, l'index de chapitre, le
// sommaire latéral et la barre mobile (A252), et SEO.md § 3 interdit FAQPage.

test.describe.configure({ timeout: 120000 });

const guides = [
  {
    language: 'FR',
    lang: 'fr',
    route: '/francais-correct.html',
    canonical: 'https://azerty.global/francais-correct',
    alternate: 'https://azerty.global/en/french-typography',
    alternateLang: 'en',
    heading: 'Écrire correctement en français',
    feedbackSource: 'guide-typographique',
    feedbackText: 'Règle typographique à vérifier'
  },
  {
    language: 'EN',
    lang: 'en',
    route: '/en/french-typography.html',
    canonical: 'https://azerty.global/en/french-typography',
    alternate: 'https://azerty.global/francais-correct',
    alternateLang: 'fr',
    heading: 'French Typography: The Complete Guide',
    feedbackSource: 'typography-guide',
    feedbackText: 'French typography rule to review'
  }
];

const RULES = 47;

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({ status: 204, body: '' }));
});

for (const guide of guides) {
  test(`${guide.language} typography guide exposes the complete reference and metadata`, async ({ page }) => {
    const errors = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', error => errors.push(error.message));

    const response = await page.goto(guide.route, { waitUntil: 'load' });
    expect(response?.ok()).toBe(true);
    await expect(page.locator('h1')).toHaveText(guide.heading);
    // 9 chapitres, la FAQ et les sources.
    await expect(page.locator('.guide-typo__article > .chapitre-typo')).toHaveCount(11);
    await expect(page.locator('#questions-frequentes > details.notice')).toHaveCount(8);
    await expect(page.locator('[data-mesure="vers_telechargement"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', guide.canonical);
    await expect(page.locator(`link[rel="alternate"][hreflang="${guide.alternateLang}"]`)).toHaveAttribute('href', guide.alternate);

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(content => JSON.parse(content)).flatMap(item => item['@graph'] || [item]).map(item => item['@type']);
    expect(types).toEqual(expect.arrayContaining(['Article', 'BreadcrumbList']));
    expect(types).not.toContain('FAQPage');
    expect(errors).toEqual([]);
  });
}

test('both guides provide direct, rule-level paths to the information', async ({ page }) => {
  for (const guide of guides) {
    await page.goto(guide.route, { waitUntil: 'load' });

    // Un seul sommaire : les chapitres, la FAQ et les sources, chaque ancre existe ;
    // chaque chapitre et la FAQ se terminent par un retour au sommaire (44 px).
    await expect(page.locator('nav.sommaire#sommaire')).toHaveCount(1);
    const targets = await page.locator('nav.sommaire a').evaluateAll(links => links.map(a => a.getAttribute('href')));
    expect(targets).toHaveLength(11);
    expect(targets).toEqual(expect.arrayContaining(['#questions-frequentes', '#sources']));
    for (const href of targets) {
      await expect(page.locator(href), `${guide.language} ${href}`).toHaveCount(1);
    }
    const retours = page.locator('.chapitre-typo > .chapitre-typo__retour a[href="#sommaire"]');
    await expect(retours).toHaveCount(10);
    expect((await retours.first().boundingBox()).height).toBeGreaterThanOrEqual(44);

    // Ancres de règle `<chapitre>-r<n>` stables (liens entrants), titre lié à sa règle.
    const rules = await page.locator('.regle-typo[id]').evaluateAll(sections => sections.map(s => ({
      id: s.id,
      href: s.querySelector('h3 > a')?.getAttribute('href')
    })));
    expect(rules).toHaveLength(RULES);
    for (const rule of rules) {
      expect(rule.id).toMatch(/^[a-z-]+-r\d+$/);
      expect(rule.href).toBe(`#${rule.id}`);
    }
    expect(new Set(rules.map(r => r.id)).size).toBe(RULES);
    await expect(page.locator('#sources')).toHaveCount(1);
  }
});

test('French examples mark the correction and show the spaces', async ({ page }) => {
  await page.goto('/francais-correct.html', { waitUntil: 'load' });
  const paire = page.locator('#espaces-ponctuation-r2 .paire-typo');
  await expect(paire.locator('.exemple-typo--eviter .ecart--espace')).toHaveCount(2);
  await expect(paire.locator('.exemple-typo--ecrire .ecart--fine .visuellement-cache')).toHaveText(' (espace fine insécable) ');
  await expect(paire.locator('.exemple-typo--ecrire .ecart--espace:not(.ecart--fine) .visuellement-cache')).toHaveText(' (espace insécable) ');
  const marque = await page.locator('#nombres-dates-unites-r2 .exemple-typo--eviter .ecart').first().evaluate(m => {
    const s = getComputedStyle(m);
    return { fond: s.backgroundColor, filet: s.borderBottomWidth };
  });
  expect(marque).toEqual({ fond: 'rgba(0, 0, 0, 0)', filet: '2px' });

  // Glyphes cités en <kbd> (REDACTION § 5) et pont vers les pages caractère.
  expect(await page.locator('.guide-typo .prose kbd').count()).toBeGreaterThanOrEqual(20);
  const pages = await page.locator('.copies__clavier a').evaluateAll(links => links.map(a => a.getAttribute('href')));
  expect(pages).toEqual(['/a-grave-majuscule', '/e-aigu-majuscule', '/c-cedille-majuscule', '/e-dans-l-o', '/e-dans-l-a', '/guillemets', '/tiret-cadratin', '/tiret-cadratin']);
  for (const href of new Set(pages)) {
    expect((await page.request.get(`${href}.html`)).ok(), href).toBe(true);
  }
});

test('a refused copy is announced', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('refus')) }
    });
  });
  await page.goto('/francais-correct.html', { waitUntil: 'load' });
  await page.locator('[data-copier-id="capital-e-aigu"]').click();
  await expect(page.locator('#accents-ligatures [data-copier-statut]')).toHaveText('Copie impossible, sélectionnez le caractère');
});

test('copy buttons copy the exact character and announce it', async ({ page }) => {
  await page.addInitScript(() => {
    window.__copied = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: value => { window.__copied.push(value); return Promise.resolve(); } }
    });
  });
  await page.goto('/francais-correct.html', { waitUntil: 'load' });

  // Les espaces à copier sont les vrais caractères (A541, A567).
  await expect(page.locator('[data-copier-id="nbsp"]')).toHaveAttribute('data-copier', ' ');
  await expect(page.locator('[data-copier-id="nnbsp"]')).toHaveAttribute('data-copier', ' ');
  await expect(page.locator('[data-copier-id="quotes-fr"]')).toHaveAttribute('data-copier', '«  »');

  const button = page.locator('[data-copier-id="capital-e-aigu"]');
  await button.focus();
  await button.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__copied)).toEqual(['É']);
  await expect(button).toHaveClass(/est-copie/);
  await expect(button.locator('[data-copier-libelle]')).toHaveText('Copié');
  await expect(page.locator('#accents-ligatures [data-copier-statut]')).toHaveText('Copié : É majuscule');
  // Hôte local sans ?mesure=test : l'événement est journalisé, rien n'est envoyé.
  expect(await page.evaluate(() => window.AGMesure.journal)).toEqual([
    { nom: 'copie_caractere', params: { caractere: 'É' }, envoye: false }
  ]);
  await expect(button.locator('[data-copier-libelle]')).toHaveText('E aigu', { timeout: 3000 });
  await expect(page.locator('#accents-ligatures [data-copier-statut]')).toHaveText('');
});

test('print opens every accordion, shows the address and hides navigation', async ({ page }) => {
  await page.goto('/francais-correct.html', { waitUntil: 'load' });
  await page.evaluate(() => {
    window.print = () => { window.__printed = (window.__printed || 0) + 1; };
  });

  await page.locator('.hero-guide-typo__actions [data-guide-imprimer]').click();
  expect(await page.evaluate(() => window.__printed)).toBe(1);
  // L'impression n'est pas mesurée (plan de marquage du 2026-10-05).
  expect(await page.evaluate(() => window.AGMesure.journal)).toEqual([]);

  const closed = await page.locator('.guide-typo details:not([open])').count();
  expect(closed).toBeGreaterThan(8);
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await expect(page.locator('.guide-typo details:not([open])')).toHaveCount(0);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.guide-typo__suite')).toBeHidden();
  await expect(page.locator('.guide-typo nav.sommaire')).toBeHidden();
  await expect(page.locator('.guide-typo__adresse')).toBeVisible();
  await expect(page.locator('.guide-typo__adresse')).toContainText('https://azerty.global/francais-correct');
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.locator('.guide-typo details:not([open])')).toHaveCount(closed);
});

test('guides stay within the viewport at every width in both themes, accordions open', async ({ page }) => {
  for (const guide of guides) {
    for (const colorScheme of ['light', 'dark']) {
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme });
        await page.goto(guide.route, { waitUntil: 'load' });
        await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${guide.language} ${colorScheme} ${width}px overflow`).toBeLessThanOrEqual(0);
      }
    }
  }
});

test('feedback links prefill the contact form with an allowed source', async ({ page }) => {
  for (const guide of guides) {
    await page.goto(guide.route, { waitUntil: 'load' });
    const href = await page.locator('#sources a[href*="contact"]').getAttribute('href');
    const url = new URL(href, 'http://localhost');
    expect(url.searchParams.get('source')).toBe(guide.feedbackSource);
    await page.goto(url.pathname.replace(/\/?$/, '.html') + url.search, { waitUntil: 'load' });
    await expect(page.locator('#description')).toHaveValue(guide.feedbackText);
    await expect(page.locator('#contact-source')).toHaveValue(guide.feedbackSource);
  }
});
