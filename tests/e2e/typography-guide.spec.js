const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

test.describe.configure({ timeout: 120000 });

const guides = [
  {
    language: 'FR',
    route: '/francais-correct.html',
    canonical: 'https://azerty.global/francais-correct',
    alternate: 'https://azerty.global/en/french-typography',
    alternateLang: 'en',
    heading: 'Écrire correctement en français'
  },
  {
    language: 'EN',
    route: '/en/french-typography.html',
    canonical: 'https://azerty.global/en/french-typography',
    alternate: 'https://azerty.global/francais-correct',
    alternateLang: 'fr',
    heading: 'French Typography: The Complete Guide'
  }
];

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

    const response = await page.goto(guide.route, { waitUntil: 'commit' });
    await page.locator('h1').waitFor();
    expect(response?.ok()).toBe(true);
    await expect(page.locator('h1')).toHaveText(guide.heading);
    await expect(page.locator('[data-typography-section]')).toHaveCount(11);
    await expect(page.locator('.typography-chapter').filter({ has: page.locator(':scope > .typography-chapter__header') })).toHaveCount(11);
    await expect(page.locator('.typography-article > .typography-chapter').nth(8)).toBeVisible();
    await expect(page.locator('.typography-faq__item')).toHaveCount(8);
    await expect(page.locator('[data-track-conversion="typography_try"]')).toHaveCount(1);
    await expect(page.locator('[data-track-conversion="typography_download"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', guide.canonical);
    await expect(page.locator(`link[rel="alternate"][hreflang="${guide.alternateLang}"]`)).toHaveAttribute('href', guide.alternate);

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const jsonLd = blocks.map(content => JSON.parse(content));
    const types = jsonLd.map(item => item['@type']);
    expect(types).toEqual(expect.arrayContaining(['Article', 'BreadcrumbList', 'FAQPage']));
    const faqData = jsonLd.find(item => item['@type'] === 'FAQPage');
    expect(faqData.mainEntity).toHaveLength(8);
    const visibleQuestions = await page.locator('.typography-faq__item > summary').allTextContents();
    const visibleAnswers = await page.locator('.typography-faq__item .faq-answer').allTextContents();
    const normalizeWhitespace = value => value.replace(/\s+/gu, ' ').trim();
    expect(faqData.mainEntity.map(item => normalizeWhitespace(item.name))).toEqual(
      visibleQuestions.map(normalizeWhitespace)
    );
    expect(faqData.mainEntity.map(item => normalizeWhitespace(item.acceptedAnswer.text))).toEqual(
      visibleAnswers.map(normalizeWhitespace)
    );
    expect(errors).toEqual([]);
  });
}

test('both guides provide direct, rule-level paths to the information', async ({ page }) => {
  for (const guide of guides) {
    await page.goto(guide.route, { waitUntil: 'commit' });
    await page.locator('h1').waitFor();

    await expect(page.locator('[data-typography-finder]')).toBeVisible();
    expect(await page.locator('[data-typography-finder] a').count()).toBeGreaterThanOrEqual(8);
    await expect(page.locator('.typography-chapter__index').first()).toBeVisible();
    await expect(page.locator('.typography-rule[id]')).toHaveCount(48);
    await expect(page.locator('.typography-toc a[href="#questions-frequentes"]')).toHaveCount(1);
    await expect(page.locator('.typography-toc a[href="#sources"]')).toHaveCount(1);
    await expect(page.locator('[data-typography-mobile-bar]')).toHaveCount(1);
  }
});

test('copy, table of contents, section views and print use stable analytics identifiers', async ({ page }) => {
  await page.goto('/francais-correct.html', { waitUntil: 'commit' });
  await page.locator('h1').waitFor();
  await page.waitForFunction(() => window.AzertyTrack && typeof window.AzertyTrack.event === 'function');
  await page.evaluate(() => {
    window.__typographyEvents = [];
    window.AzertyTrack.event = (name, details) => window.__typographyEvents.push({ name, details });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: value => {
        window.__typographyCopied = value;
        return Promise.resolve();
      } }
    });
  });

  const copyButton = page.locator('[data-typography-copy]').first();
  const expectedCopy = await copyButton.getAttribute('data-copy-value');
  await copyButton.focus();
  await copyButton.press('Enter');
  await expect(page.locator('.typography-copy-status')).toContainText('Caractère copié');
  expect(await page.evaluate(() => window.__typographyCopied)).toBe(expectedCopy);

  const tocLink = page.locator('.typography-sidebar .typography-toc > ol > li > [data-typography-toc]').nth(1);
  await tocLink.click();
  await expect(page).toHaveURL(/#espaces-ponctuation$/);
  await page.locator('#espaces-ponctuation').scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await expect(page.locator('.typography-sidebar [data-section-id="espaces-ponctuation"]')).toHaveAttribute('aria-current', 'location');

  const closedAdvanced = page.locator('.typography-advanced:not([open])');
  expect(await closedAdvanced.count()).toBeGreaterThan(0);
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await expect(page.locator('.typography-advanced:not([open])')).toHaveCount(0);
  await expect(page.locator('.typography-faq__item:not([open])')).toHaveCount(0);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.typography-final')).toBeHidden();
  await expect(page.locator('.typography-print-url')).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));

  const events = await page.evaluate(() => window.__typographyEvents);
  expect(events).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'typography_copy', details: expect.objectContaining({ item_id: expect.any(String), item_type: expect.any(String), language: 'fr' }) }),
    expect.objectContaining({ name: 'typography_toc_click', details: expect.objectContaining({ section_id: 'espaces-ponctuation', language: 'fr' }) }),
    expect.objectContaining({ name: 'typography_section_view', details: expect.objectContaining({ section_id: expect.any(String), language: 'fr' }) }),
    expect.objectContaining({ name: 'typography_print', details: expect.objectContaining({ trigger: 'print', language: 'fr' }) })
  ]));
  expect(JSON.stringify(events)).not.toContain(expectedCopy);
});

test('guides stay within the viewport and capture every required width in both themes', async ({ page }) => {
  const captureDir = path.join('.codex_tmp', 'typography-captures');
  fs.mkdirSync(captureDir, { recursive: true });

  for (const guide of guides) {
    for (const theme of ['light', 'dark']) {
      for (const width of [360, 390, 768, 1366, 1920]) {
        await page.setViewportSize({ width, height: width < 700 ? 780 : 900 });
        await page.addInitScript(value => localStorage.setItem('azerty-theme', value), theme);
        await page.goto(guide.route, { waitUntil: 'commit' });
        await page.locator('h1').waitFor();
        await page.evaluate(value => {
          document.documentElement.setAttribute('data-theme', value);
          window.scrollTo(0, 0);
        }, theme);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${guide.language} ${theme} ${width}px overflow`).toBeLessThanOrEqual(1);
        await page.screenshot({
          path: path.join(captureDir, `${guide.language.toLowerCase()}-${theme}-${width}.png`),
          fullPage: false
        });
      }
    }
  }
});

test('feedback links prefill the appropriate form without exposing arbitrary source values', async ({ page }) => {
  await page.goto('/feedback.html?source=guide-typographique&subject=R%C3%A8gle%20typographique%20%C3%A0%20v%C3%A9rifier', { waitUntil: 'commit' });
  await page.locator('#description').waitFor();
  await expect(page.locator('#description')).toHaveValue('Règle typographique à vérifier');

  await page.goto('/en/feedback.html?source=typography-guide&subject=French%20typography%20rule%20to%20review', { waitUntil: 'commit' });
  await page.locator('#description').waitFor();
  await expect(page.locator('#description')).toHaveValue('French typography rule to review');
});
