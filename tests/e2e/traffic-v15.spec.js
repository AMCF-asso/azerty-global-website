const fs = require('fs');
const path = require('path');
const { test, expect } = require('../helpers/local-site');

const pages = ['/', '/download', '/en/download', '/soutien', '/pilote', '/feedback', '/en/feedback', '/bug', '/questionnaire', '/pilote-bilan'];
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'desktop', width: 1280, height: 900 }
];
const screenshotRoot = path.resolve(__dirname, '../../.internal/night-v15/screenshots');
const forms = [
  { route: '/pilote', id: 'pilot-request-form', email: 'pilote@azerty.global' },
  { route: '/feedback', id: 'feedback-form', email: 'feedback@azerty.global' },
  { route: '/en/feedback', id: 'feedback-form', email: 'feedback@azerty.global' },
  { route: '/bug', id: 'bug-form', email: 'support@azerty.global' },
  { route: '/questionnaire', id: 'beta-feedback-form', email: 'feedback@azerty.global' },
  { route: '/pilote-bilan', id: 'pilot-report-form', email: 'pilote@azerty.global' }
];

async function assertCleanPage(network) {
  expect(network.pageErrors, 'Uncaught page errors').toEqual([]);
  expect(network.cspViolations, 'Production CSP violations').toEqual([]);
  expect(network.consoleErrors, 'Console errors, including local assets').toEqual([]);
}

async function completeRequiredFields(form) {
  // Exercise the real validation and submit handlers, with synthetic test data.
  // Two passes cover required inputs revealed by selecting an earlier answer.
  for (let pass = 0; pass < 2; pass++) {
    const fields = form.locator('input[required], select[required], textarea[required]');
    for (let i = 0; i < await fields.count(); i++) {
      const field = fields.nth(i);
      if (await field.isDisabled()) continue;
      const info = await field.evaluate(node => ({ id: node.id, tag: node.tagName, type: node.type, name: node.name, value: node.value, checked: node.checked }));
      if (info.tag === 'SELECT') {
        const value = await field.locator('option').evaluateAll(options => options.find(option => option.value && !option.disabled && !/autre|other/i.test(option.value))?.value);
        if (value) await field.selectOption(value);
      } else if (info.type === 'checkbox' || info.type === 'radio') {
        if (!info.checked) {
          const label = form.locator(`label[for="${info.id}"]`);
          if (await label.count()) await label.click();
          else await field.locator('xpath=ancestor::label').click();
          await expect(field).toBeChecked();
        }
      } else if (await field.isVisible()) {
        await field.fill(info.type === 'email' ? 'local-test@example.invalid' : info.type === 'number' ? '3' : 'Essai local automatisé, sans envoi réel.');
      }
    }
  }
  for (const group of ['utilisation', 'apprentissage', 'points-positifs', 'points-negatifs']) {
    const choices = form.locator(`input[type="checkbox"][name="${group}"]`);
    if (await choices.count()) {
      const neutral = form.locator(`input[type="checkbox"][name="${group}"][value="aucun"]`);
      const choice = await neutral.count() ? neutral : choices.first();
      if (!(await choice.isChecked())) {
        const id = await choice.getAttribute('id');
        const label = form.locator(`label[for="${id}"]`);
        if (await label.count()) await label.click();
        else await choice.locator('xpath=ancestor::label').click();
        await expect(choice).toBeChecked();
      }
    }
  }
  const invalid = await form.evaluate(node => [...node.elements].filter(field => field.willValidate && !field.validity.valid).map(field => ({ id: field.id, reason: field.validationMessage })));
  expect(invalid, 'The form is completed before clicking submit').toEqual([]);
}

for (const viewport of viewports) {
  test.describe(`traffic v1.5 ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of pages) {
      test(`${route}: layout, keyboard, CSP and local screenshot`, async ({ page, network }, testInfo) => {
        const response = await page.goto(route);
        expect(response.status()).toBe(200);
        await expect(page.locator('main h1').first()).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        const overflow = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
        expect(overflow.document, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport + 1);
        expect(overflow.body, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport + 1);
        await page.keyboard.press('Tab');
        await expect(page.locator(':focus')).toBeVisible();
        expect(await page.locator(':focus').evaluate(node => ['A', 'BUTTON', 'INPUT', 'SUMMARY'].includes(node.tagName))).toBe(true);
        await page.keyboard.press('Tab');
        await expect(page.locator(':focus')).toBeVisible();
        await page.locator('body').click({ position: { x: 2, y: 2 } });
        await page.evaluate(() => scrollTo(0, 0));
        // Check the page before capture: Windows WebKit reports the inline
        // style injected by Playwright's screenshot helper as a CSP violation.
        await assertCleanPage(network);
        fs.mkdirSync(screenshotRoot, { recursive: true });
        const file = `${route === '/' ? 'home' : route.slice(1).replace(/\//g, '-')}-${viewport.name}-${testInfo.project.name}.png`;
        await page.screenshot({ path: path.join(screenshotRoot, file), fullPage: true, animations: 'disabled' });
        if (['/', '/download', '/en/download', '/soutien', '/pilote'].includes(route)) {
          await page.screenshot({ path: path.join(screenshotRoot, file.replace('.png', '-viewport.png')), animations: 'disabled' });
        }
        expect(network.web3FormsRequests).toEqual([]);
      });
    }
  });
}

test('M1: version 2 banners state the date and maintained current release in both languages', async ({ page }) => {
  for (const [route, date, reassurance] of [
    ['/download', /fin septembre 2026/, /complète, gratuite et maintenue/],
    ['/en/download', /end of September 2026/, /complete, free and maintained/]
  ]) {
    await page.goto(route);
    const banner = page.locator('[data-traffic-version]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/version 2/i);
    await expect(banner).toContainText(date);
    await expect(banner).toContainText(reassurance);
  }
});

for (const [route, source] of [['/', 'home-zevent'], ['/download', 'download-zevent']]) {
  test(`M2: pilot CTA ${route} keeps tracking metadata and navigates without local analytics`, async ({ page, network }) => {
    await page.goto(route);
    const cta = page.locator('[data-track-conversion="pilot_cta_click"]');
    await expect(cta).toHaveAttribute('href', '/pilote');
    await expect(cta).toHaveAttribute('data-track-detail-source', source);
    expect(await page.evaluate(() => window.dataLayer ?? [])).toEqual([]);
    await cta.click();
    await expect(page).toHaveURL(/\/pilote$/);
    await expect(page.locator('#pilot-request-form')).toBeAttached();
    expect(await page.evaluate(() => window.dataLayer ?? [])).toEqual([]);
    expect(network.externalRequests.filter(request => /googletagmanager\.com|google-analytics\.com|umami\.is|cloudflareinsights\.com/.test(request.url))).toEqual([]);
  });
}

for (const route of pages) {
  test(`M3: referral welcome ${route} is session-local`, async ({ page }) => {
    await page.goto(`${route}?utm_source=vingtmillions`);
    const welcome = page.locator('#referral-welcome');
    await expect(welcome).toBeVisible();
    await expect(welcome).toContainText('vingtmillions.fr');
    await expect(welcome.locator('a')).toHaveAttribute('href', '/#pourquoi');
    expect(await page.evaluate(() => sessionStorage.getItem('azertyVingtmillionsWelcome'))).toBe('1');
    await page.goto('/guide?utm_source=vingtmillions');
    await expect(page.locator('#referral-welcome')).toHaveCount(0);
  });
}

test('M3: no referral banner without matching source, and never on bienvenue', async ({ page }) => {
  for (const route of ['/?utm_source=unrelated', '/bienvenue?utm_source=vingtmillions', '/bienvenue.html?utm_source=vingtmillions']) {
    await page.goto(route);
    await expect(page.locator('#referral-welcome')).toHaveCount(0);
  }
  expect(await page.evaluate(() => sessionStorage.getItem('azertyVingtmillionsWelcome'))).toBeNull();
  await page.goto('/download?utm_source=vingtmillions');
  await expect(page.locator('#referral-welcome')).toBeVisible();
});

test('M4: support message links to ZEVENT donations', async ({ page, network }) => {
  await page.goto('/soutien');
  const message = page.locator('#zevent-support-message');
  await expect(message).toBeVisible();
  await expect(message).toContainText('du 4 au 6 septembre');
  await expect(message).toContainText('à partir de lundi');
  await expect(message.locator('a')).toHaveAttribute('href', 'https://zevent.fr/don');
  expect(network.externalRequests.filter(request => request.url.includes('zevent.fr'))).toEqual([]);
});

for (const config of forms) {
  test(`M5: ${config.route} keeps clickable email below submit and survives failure then success`, async ({ page, network, browserName }, testInfo) => {
    await page.goto(config.route);
    const form = page.locator(`#${config.id}`);
    const submit = form.locator('button[type="submit"]');
    const fallback = form.locator('.form-email-fallback');
    await expect(fallback.locator('a')).toHaveAttribute('href', `mailto:${config.email}`);
    expect(await form.evaluate(node => {
      const button = node.querySelector('button[type="submit"]');
      const email = node.querySelector('.form-email-fallback');
      return Boolean(button.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING);
    })).toBe(true);
    await fallback.scrollIntoViewIfNeeded();
    const buttonBox = await submit.boundingBox();
    const fallbackBox = await fallback.boundingBox();
    expect(fallbackBox.y).toBeGreaterThanOrEqual(buttonBox.y + buttonBox.height - 1);
    await submit.focus();
    if (browserName === 'webkit' && process.platform === 'win32') {
      // This WebKit runtime skips links on both Tab and Alt+Tab. Keep checking
      // focus reachability here; Chromium/Firefox cover sequential Tab order.
      testInfo.annotations.push({ type: 'coverage', description: 'Windows WebKit: explicit link focus, not sequential Tab order.' });
      await fallback.locator('a').focus();
    } else await page.keyboard.press('Tab');
    await expect(fallback.locator('a')).toBeFocused();
    await expect(page.locator('script[src*="web3forms.js"]')).toHaveCount(1);
    await completeRequiredFields(form);
    const questionnairePosts = [];
    if (config.route === '/questionnaire') {
      page.on('request', request => {
        if (request.method() === 'POST') questionnairePosts.push({
          host: new URL(request.url()).hostname,
          body: request.postData() || ''
        });
      });
    }
    page.on('dialog', dialog => dialog.dismiss());
    network.failWeb3FormsNetwork();
    await submit.click();
    await expect(form.locator('[data-form-send-error][role="alert"] a')).toHaveAttribute('href', `mailto:${config.email}`);
    await expect(submit).toBeEnabled();
    expect(network.web3FormsRequests.filter(request => request.method === 'POST')).toHaveLength(1);
    if (config.route === '/questionnaire') {
      expect(questionnairePosts.map(request => request.host)).toEqual(['api.web3forms.com']);
      expect(questionnairePosts[0].body).not.toContain('name="userAgent"');
      expect(network.cspViolations.filter(violation => /script\.google\.com/.test(violation.blockedURI))).toEqual([]);
    }

    if (config.route === '/feedback') {
      network.setWeb3FormsResponse({ status: 200, body: {} });
      await submit.click();
      await expect(form.locator('[data-form-send-error][role="alert"] a')).toHaveAttribute('href', `mailto:${config.email}`);
      await expect(form.locator('.form-success')).toHaveCount(0);
      await expect(submit).toBeEnabled();
    }

    network.setWeb3FormsResponse({ status: 200, body: { success: true, message: 'Local test success' } });
    await submit.click();
    await expect(form.locator('.form-success')).toBeVisible();
    await expect(form.locator('[data-form-send-error]')).toHaveCount(0);
    expect(network.web3FormsRequests.filter(request => request.method === 'POST')).toHaveLength(config.route === '/feedback' ? 3 : 2);
    expect(network.cspViolations).toEqual([]);
    expect(network.pageErrors).toEqual([]);
  });
}

for (const route of ['/download', '/en/download']) {
  test(`M5: ${route} has no form and retains every download target without requesting it`, async ({ page, network }) => {
    await page.goto(route);
    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.locator('script[src*="web3forms.js"]')).toHaveCount(0);
    const expected = {
      'btn-download-msix': 'https://download.azerty.global/AZERTY_Global_Entreprise.zip',
      'btn-download-exe': 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Windows.zip/download',
      'btn-download-macos': 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_macOS.zip/download',
      'btn-download-linux': 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Linux.zip/download'
    };
    for (const [id, href] of Object.entries(expected)) await expect(page.locator(`#${id}`)).toHaveAttribute('href', href);
    await expect(page.locator('#btn-download-store')).toHaveAttribute('href', /https:\/\/apps\.microsoft\.com\/detail\/9n4bts43sssz\?/);
    await expect(page.locator('a[href="https://download.azerty.global/AZERTY_Global_1.1.0.msixbundle"]')).toHaveCount(1);
    expect(network.externalRequests.filter(request => /download\.azerty\.global|sourceforge\.net|apps\.microsoft\.com/.test(request.url))).toEqual([]);
  });
}

test('M6: home has two hero CTA buttons and a keyboard-accessible tester text link preserving its modal', async ({ page, network, browserName }, testInfo) => {
  await page.goto('/');
  const buttons = page.locator('.hero__actions--home > a.btn');
  await expect(buttons).toHaveCount(2);
  await expect(buttons.nth(0)).toHaveAttribute('href', '/guide');
  await expect(buttons.nth(1)).toHaveAttribute('href', '/download');
  const tester = page.locator('a#open-tester-btn');
  await expect(tester).toHaveAttribute('href', '/?mode=lessons&tutorial=skip');
  expect(await tester.evaluate(node => Boolean(node.closest('.hero__actions')))).toBe(false);
  await buttons.nth(0).focus();
  const webkitWindows = browserName === 'webkit' && process.platform === 'win32';
  if (webkitWindows) {
    testInfo.annotations.push({ type: 'coverage', description: 'Windows WebKit: explicit link focus, not sequential Tab order.' });
    await buttons.nth(1).focus();
  } else await page.keyboard.press('Tab');
  await expect(buttons.nth(1)).toBeFocused();
  if (webkitWindows) await tester.focus();
  else await page.keyboard.press('Tab');
  await expect(tester).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#tester-modal')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
  await page.keyboard.press('Escape');
  await expect(page.locator('#tester-modal')).not.toBeVisible();
  await expect(tester).toBeFocused();
  await assertCleanPage(network);
});

test('M7: the tester fallback URL resolves and opens the tester after direct navigation', async ({ page, network }) => {
  await page.goto('/');
  const href = await page.locator('a#open-tester-btn').getAttribute('href');
  const response = await page.goto(href);
  expect(response.status()).toBe(200);
  await expect(page).toHaveURL(/\/\?mode=lessons&tutorial=skip$/);
  await expect(page.locator('#tester-modal')).toBeVisible();
  await assertCleanPage(network);
});

test('M8: home gaming answer reproduces the FAQ and links to its anchor', async ({ page }) => {
  await page.goto('/faq');
  const expected = await page.locator('#jeux-video .faq-answer p').allTextContents();
  await page.goto('/');
  const answer = page.locator('details').filter({ has: page.getByText('Et pour les jeux vidéo ?', { exact: true }) });
  await answer.locator('summary').focus();
  await page.keyboard.press('Enter');
  const actual = await answer.locator('.faq-answer p').allTextContents();
  expect(actual.slice(0, expected.length)).toEqual(expected);
  await expect(answer.locator('a[href="/faq#jeux-video"]')).toBeVisible();
});

for (const profile of [
  {
    name: 'Android', mobile: true, viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36'
  },
  {
    name: 'Android with sharing support', mobile: true, sharing: true, viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36'
  },
  {
    name: 'iPad with desktop user agent', mobile: true, ipadDesktop: true, viewport: { width: 768, height: 1024 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
  },
  {
    name: 'Windows desktop', mobile: false, viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
  }
]) {
  test.describe(`download relay ${profile.name}`, () => {
    test.use({ viewport: profile.viewport, userAgent: profile.userAgent,
      // Firefox cannot emulate mobile mode; still exercise its responsive
      // viewport, touch capability and supplied user agent.
      isMobile: async ({ browserName }, use) => use(browserName !== 'firefox' && profile.mobile),
      hasTouch: profile.mobile });

    test('reserves its final layout before the deferred relay script executes', async ({ page, network }) => {
      if (profile.sharing) {
        await page.addInitScript(() => {
          Object.defineProperty(navigator, 'share', { configurable: true, value: async () => undefined });
        });
      }
      if (profile.ipadDesktop) {
        await page.addInitScript(() => {
          Object.defineProperty(navigator, 'platform', { configurable: true, get: () => 'MacIntel' });
          Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
        });
      }
      let releaseRelay;
      let relayRequested = false;
      const gate = new Promise(resolve => { releaseRelay = resolve; });
      await page.route('**/js/download-relay.js*', async route => {
        relayRequested = true;
        await gate;
        // Return to the safe context fixture; never bypass its network guard.
        await route.fallback();
      });

      try {
        const response = await page.goto('/download', { waitUntil: 'commit' });
        expect(response.status()).toBe(200);
        await expect.poll(() => relayRequested).toBe(true);
        await page.waitForFunction(() => Boolean(document.querySelector('link[href*="download-traffic.css"]')?.sheet));
        // The load event is intentionally held by the deferred script. External
        // fonts are stubbed by the fixture; wait only for a painted local layout.
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await expect(page.locator('html')).toHaveAttribute('data-download-relay-mobile', String(profile.mobile));
        const relay = page.locator('[data-download-relay]');
        if (profile.mobile) await expect(relay).toBeVisible();
        else await expect(relay).toBeHidden();
        const sharingAvailable = await page.evaluate(() => typeof navigator.share === 'function');
        await expect(page.locator('html')).toHaveAttribute('data-download-relay-share', String(sharingAvailable));
        if (profile.mobile && sharingAvailable) await expect(relay.locator('[data-relay-share]')).toBeVisible();
        else await expect(relay.locator('[data-relay-share]')).toBeHidden();
        const section = page.locator('section').filter({ has: page.locator('.os-tabs') });
        const before = await section.boundingBox();
        expect(before).not.toBeNull();

        releaseRelay();
        await page.waitForLoadState('load');
        if (profile.mobile) await expect(relay).toBeVisible();
        else await expect(relay).toBeHidden();
        const after = await section.boundingBox();
        expect(Math.abs(after.y - before.y), `OS section moved after relay script: ${before.y} → ${after.y}`).toBeLessThan(0.5);
        await assertCleanPage(network);
      } finally {
        releaseRelay();
      }
    });
  });
}

test('download accessibility: all three English OS panels reference their tab labels', async ({ page, network }) => {
  await page.goto('/en/download');
  await expect(page.locator('[aria-labeledby]')).toHaveCount(0);
  for (const os of ['windows', 'macos', 'linux']) {
    const tab = page.locator(`#tab-${os}`);
    const panel = page.locator(`#os-${os}`);
    await expect(panel).toHaveAttribute('aria-labelledby', `tab-${os}`);
    await expect(tab).toHaveAttribute('aria-controls', `os-${os}`);
    await tab.click();
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAccessibleName(await tab.locator('.os-tab__label').innerText());
  }
  await assertCleanPage(network);
});
