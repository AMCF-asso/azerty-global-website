const { test, expect } = require('@playwright/test');

const automationSpec = {
  schemaVersion: '0.1.0',
  layout: { version: '2026' },
  characters: {
    'U+0061': { methods: [{ steps: [{ code: 'KeyA' }], recommendedForAutomation: true }] }
  },
  controls: {
    'U+0009': { methods: [{ steps: [{ code: 'Tab' }], recommendedForAutomation: true }] },
    'U+000A': { methods: [{ steps: [{ code: 'Enter' }], recommendedForAutomation: true }] },
    'U+000D': { methods: [{ steps: [{ code: 'Enter' }], recommendedForAutomation: true }] }
  }
};

function parseRgb(value) {
  return value.match(/[\d.]+/g).slice(0, 3).map(Number);
}

function relativeLuminance([red, green, blue]) {
  const channels = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrastRatio(foreground, background) {
  const light = Math.max(relativeLuminance(parseRgb(foreground)), relativeLuminance(parseRgb(background)));
  const dark = Math.min(relativeLuminance(parseRgb(foreground)), relativeLuminance(parseRgb(background)));
  return (light + 0.05) / (dark + 0.05);
}

test('keeps automation status text at WCAG AA contrast in light and dark themes', async ({ page }) => {
  await page.goto('/automatisation-clavier.html', { waitUntil: 'domcontentloaded' });

  for (const theme of ['light', 'dark']) {
    await page.evaluate((selectedTheme) => {
      document.documentElement.dataset.theme = selectedTheme;
    }, theme);
    await page.waitForTimeout(300);
    for (const state of ['success', 'partial', 'empty']) {
      const status = page.locator('#automation-status');
      await status.evaluate((element, selectedState) => {
        element.dataset.state = selectedState;
      }, state);
      const colors = await status.evaluate((element) => ({
        foreground: getComputedStyle(element).color,
        background: getComputedStyle(element.closest('.card')).backgroundColor,
      }));

      expect(
        contrastRatio(colors.foreground, colors.background),
        `${theme}/${state}: ${colors.foreground} on ${colors.background}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('converts locally after one contract load and publishes JSON', async ({ page }) => {
  let specRequests = 0;
  await page.route('**/docs/automation/v0.1/azerty-global.json', async (route) => {
    specRequests += 1;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(automationSpec) });
  });
  await page.goto('/automatisation-clavier.html', { waitUntil: 'domcontentloaded' });
  expect(specRequests).toBe(0);

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText(value) {
          window.__automationCopiedText = value;
          return Promise.resolve();
        }
      }
    });
  });

  await page.locator('#automation-input').fill('a\t');
  await page.locator('#automation-submit').click();

  await expect(page.locator('#automation-status')).toHaveAttribute('data-state', 'success');
  await expect(page.locator('#automation-results')).toBeVisible();
  await expect(page.locator('#automation-results .automation-token')).toHaveCount(2);
  await expect(page.locator('#automation-results .automation-token').first()).toContainText('U+0061');
  await expect(page.locator('#automation-results .automation-token').nth(1)).toContainText('Tab');
  await expect(page.locator('#automation-copy')).toBeEnabled();
  await expect.poll(async () => JSON.parse(await page.locator('#automation-json').textContent())).toMatchObject({
    schemaVersion: '0.1.0', layoutVersion: '2026', input: 'a\t',
    tokens: [
      { codePoint: 'U+0061', supported: true },
      { codePoint: 'U+0009', action: 'Tab', supported: true }
    ]
  });

  await page.locator('#automation-submit').click();
  expect(specRequests).toBe(1);

  await page.locator('#automation-copy').click();
  await expect(page.locator('#automation-status')).toHaveAttribute('data-state', 'copy-success');
  const copied = await page.evaluate(() => window.__automationCopiedText);
  expect(JSON.parse(copied)).toMatchObject({ input: 'a\t' });
});

test('reports empty input without loading the contract', async ({ page }) => {
  let specRequests = 0;
  await page.route('**/docs/automation/v0.1/azerty-global.json', async (route) => {
    specRequests += 1;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(automationSpec) });
  });
  await page.goto('/automatisation-clavier.html', { waitUntil: 'domcontentloaded' });

  await page.locator('#automation-input').fill('');
  await page.locator('#automation-submit').click();

  await expect(page.locator('#automation-status')).toHaveAttribute('data-state', 'empty');
  await expect(page.locator('#automation-results')).toBeHidden();
  await expect(page.locator('#automation-copy')).toBeDisabled();
  expect(specRequests).toBe(0);
});

test('announces loading then a partial result without exposing the input to analytics', async ({ page }) => {
  let releaseResponse;
  await page.route('**/docs/automation/v0.1/azerty-global.json', async (route) => {
    await new Promise((resolve) => { releaseResponse = resolve; });
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(automationSpec) });
  });
  await page.goto('/automatisation-clavier.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.dataLayer = [];
    window.__automationEvents = [];
    window.AzertyTrack = {
      event(name, properties) {
        window.__automationEvents.push({ name, properties });
      }
    };
  });

  const privateInput = 'a\u{1F600}';
  await page.locator('#automation-input').fill(privateInput);
  await page.locator('#automation-submit').click();
  await expect(page.locator('#automation-status')).toHaveAttribute('data-state', 'loading');
  await expect(page.locator('#automation-results')).toHaveAttribute('aria-busy', 'true');

  await expect.poll(() => typeof releaseResponse).toBe('function');
  releaseResponse();
  await expect(page.locator('#automation-status')).toHaveAttribute('data-state', 'partial');
  await expect(page.locator('.automation-token--unsupported')).toHaveCount(1);
  await expect(page.locator('.automation-token--unsupported')).toContainText('U+1F600');

  const tracking = await page.evaluate(() => ({
    events: window.__automationEvents,
    dataLayer: window.dataLayer
  }));
  expect(tracking.events).toEqual([{
    name: 'automation_conversion',
    properties: { input_length: 2, supported_count: 1, unsupported_count: 1 }
  }]);
  expect(JSON.stringify(tracking)).not.toContain(privateInput);
});

test('converts the validated snapshot when the field changes during lazy loading', async ({ page }) => {
  let releaseResponse;
  await page.route('**/docs/automation/v0.1/azerty-global.json', async (route) => {
    await new Promise((resolve) => { releaseResponse = resolve; });
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(automationSpec) });
  });
  await page.goto('/automatisation-clavier.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#automation-input').fill('a');
  await page.locator('#automation-submit').click();

  await expect(page.locator('#automation-status')).toHaveAttribute('data-state', 'loading');
  await expect.poll(() => typeof releaseResponse).toBe('function');
  const disabledDuringLoading = await page.locator('#automation-input').isDisabled();
  await page.locator('#automation-input').evaluate((element) => {
    element.value = 'a'.repeat(201);
  });

  releaseResponse();
  await expect(page.locator('#automation-status')).toHaveAttribute('data-state', 'success');
  await expect(page.locator('#automation-input')).toBeEnabled();
  const output = JSON.parse(await page.locator('#automation-json').textContent());
  expect(disabledDuringLoading).toBe(true);
  expect(output.input).toBe('a');
  expect(output.tokens).toHaveLength(1);
});

test('rejects more than 200 code points without loading the contract', async ({ page }) => {
  let specRequests = 0;
  await page.route('**/docs/automation/v0.1/azerty-global.json', async (route) => {
    specRequests += 1;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(automationSpec) });
  });
  await page.goto('/en/keyboard-automation.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#automation-input').fill('a'.repeat(201));
  await page.locator('#automation-submit').click();

  await expect(page.locator('#automation-status')).toHaveAttribute('data-state', 'too-long');
  await expect(page.locator('#automation-results')).toBeHidden();
  expect(specRequests).toBe(0);
});

test('announces a network error and permits a later retry', async ({ page }) => {
  let attempts = 0;
  await page.route('**/docs/automation/v0.1/azerty-global.json', async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.abort('failed');
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(automationSpec) });
  });
  await page.goto('/automatisation-clavier.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#automation-input').fill('a');

  await page.locator('#automation-submit').click();
  await expect(page.locator('#automation-status')).toHaveAttribute('data-state', 'fetch-error');
  await expect(page.locator('#automation-copy')).toBeDisabled();

  await page.locator('#automation-submit').click();
  await expect(page.locator('#automation-status')).toHaveAttribute('data-state', 'success');
  expect(attempts).toBe(2);
});

test('selects visible JSON when clipboard copying fails', async ({ page }) => {
  await page.route('**/docs/automation/v0.1/azerty-global.json', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(automationSpec) });
  });
  await page.goto('/automatisation-clavier.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) }
    });
  });
  await page.locator('#automation-input').fill('a');
  await page.locator('#automation-submit').click();
  await expect(page.locator('#automation-status')).toHaveAttribute('data-state', 'success');

  await page.locator('#automation-copy').click();
  await expect(page.locator('#automation-status')).toHaveAttribute('data-state', 'copy-fail');
  const selected = await page.evaluate(() => window.getSelection().toString());
  const visibleJson = await page.locator('#automation-json').textContent();
  expect(selected).toBe(visibleJson);
});
