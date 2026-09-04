const { test, expect } = require('@playwright/test');

const automationPages = [
  {
    language: 'FR',
    route: '/automatisation-clavier.html',
    canonical: 'https://azerty.global/automatisation-clavier',
    alternate: 'https://azerty.global/en/keyboard-automation',
    defaultLanguage: 'https://azerty.global/automatisation-clavier',
    heading: /frappes physiques pour les agents IA/i
  },
  {
    language: 'EN',
    route: '/en/keyboard-automation.html',
    canonical: 'https://azerty.global/en/keyboard-automation',
    alternate: 'https://azerty.global/automatisation-clavier',
    defaultLanguage: 'https://azerty.global/automatisation-clavier',
    heading: /physical keystrokes for AI agents/i
  }
];

test('FR automation page starts with an AZERTY Global-specific example', async ({ page }) => {
  await page.goto('/automatisation-clavier.html', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#automation-input')).toHaveValue(
    'AZERTY Global : « Écrire en français, coder et créer — sur le même clavier. »'
  );
});

for (const automationPage of automationPages) {
  test(`${automationPage.language} automation page exposes the documented conversion interface`, async ({ page }) => {
    const response = await page.goto(automationPage.route, { waitUntil: 'domcontentloaded' });

    expect(response?.ok()).toBe(true);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', automationPage.canonical);
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute(
      'href',
      'https://azerty.global/automatisation-clavier'
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      'href',
      'https://azerty.global/en/keyboard-automation'
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      'href',
      automationPage.defaultLanguage
    );

    await expect(page.locator('h1')).toContainText(automationPage.heading);
    await expect(page.locator('#automation-converter')).toBeVisible();
    await expect(page.locator('#automation-input')).toBeVisible();
    await expect(page.locator('#automation-submit')).toBeVisible();
    await expect(page.locator('#automation-status[aria-live]')).toBeVisible();
    await expect(page.locator('#automation-results')).toBeHidden();
    await expect(page.locator('#automation-json')).toBeHidden();
    await expect(page.locator('#automation-copy')).toBeVisible();
    await expect(page.locator('#automation-copy')).toBeDisabled();

    const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = structuredData.map((content) => JSON.parse(content)['@type']);
    expect(types).toEqual(expect.arrayContaining(['TechArticle', 'Dataset', 'BreadcrumbList']));

    await expect(page.locator('a[href="/docs/automation/v0.1/azerty-global.json"]')).toBeVisible();
    await expect(page.locator('a[href="/docs/automation/v0.1/schema.json"]')).toBeVisible();
    await expect(page.locator('a[href="https://github.com/AMCF-asso/azerty-global-website/issues"]')).toBeVisible();
  });
}
