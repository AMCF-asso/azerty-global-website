const { test, expect } = require('@playwright/test');

const downloadPages = [
  { language: 'FR', path: '/download.html' },
  { language: 'EN', path: '/en/download.html' }
];

for (const downloadPage of downloadPages) {
  test(`${downloadPage.language} — a direct visit stays in discover mode after reload`, async ({ page }) => {
    await page.goto(downloadPage.path, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'discover');
    await expect(page.locator('.download-callout-section')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'discover');
    await expect(page.locator('.download-callout-section')).toBeVisible();
  });

  test(`${downloadPage.language} — an internal navigation uses continue mode`, async ({ page }) => {
    const startPath = downloadPage.language === 'FR' ? '/guide.html' : '/en/guide.html';
    const downloadHref = downloadPage.language === 'FR' ? '/download' : '/en/download';

    await page.goto(startPath, { waitUntil: 'domcontentloaded' });
    await page.locator(`.nav__link[href="${downloadHref}"]`).click();

    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'continue');
    await expect(page.locator('.download-callout-section')).toBeHidden();
  });

  test(`${downloadPage.language} — the mobile relay uses task mode`, async ({ page }) => {
    await page.goto(`${downloadPage.path}?utm_source=mobile-relay`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'task');
    await expect(page.locator('.download-callout-section')).toBeHidden();
  });
}

test('an external referrer starts a new discover entry after a previous visit', async ({ page }) => {
  await page.goto('/download.html', { waitUntil: 'domcontentloaded' });
  await page.goto('/guide.html', { waitUntil: 'domcontentloaded' });
  await page.goto('/download.html', {
    referer: 'https://www.google.com/search?q=azerty+global',
    waitUntil: 'domcontentloaded'
  });

  await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'discover');
  await expect(page.locator('.download-callout-section')).toBeVisible();
});

test('reload preserves the entry mode and unrelated history state', async ({ page }) => {
  await page.goto('/download.html', {
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
  await page.goto('/download.html', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'discover');
  await expect(page.locator('.download-callout-section')).toBeVisible();
});

test('the callout remains available when JavaScript is disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto('/download.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).not.toHaveAttribute('data-entry-mode', /.+/);
  await expect(page.locator('.download-callout-section')).toBeVisible();

  await context.close();
});

for (const downloadPage of downloadPages) {
  test(`${downloadPage.language} — the discover callout has one primary action and secondary links`, async ({ page }) => {
    await page.goto(downloadPage.path, { waitUntil: 'domcontentloaded' });

    const callout = page.locator('.download-callout');
    await expect(callout).toContainText(/not a virtual keyboard|pas un clavier virtuel/i);
    await expect(callout.locator('.btn')).toHaveCount(1);
    await expect(callout.locator('#open-tester-btn')).toBeVisible();
    await expect(callout.locator('.download-callout__links a')).toHaveCount(2);
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

test('Download conversion clicks inherit entry_mode', async ({ page }) => {
  await page.goto('/download.html', { waitUntil: 'domcontentloaded' });

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

test('main navigation marks the normalized current page in FR and EN', async ({ page }) => {
  const cases = [
    { path: '/index.html', href: '/', kind: 'main' },
    { path: '/download.html', href: '/download', kind: 'main' },
    { path: '/guide.html', href: '/guide', kind: 'main' },
    { path: '/comparatif.html', href: '/comparatif', kind: 'main' },
    { path: '/feedback.html', href: '/feedback', kind: 'main' },
    { path: '/soutien.html', href: '/soutien', kind: 'main' },
    { path: '/faq.html', href: '/faq', kind: 'dropdown' },
    { path: '/en/', href: '/en/', kind: 'main' },
    { path: '/en/download.html', href: '/en/download', kind: 'main' },
    { path: '/en/guide.html', href: '/en/guide', kind: 'main' },
    { path: '/en/comparison.html', href: '/en/comparison', kind: 'main' },
    { path: '/en/feedback.html', href: '/en/feedback', kind: 'main' },
    { path: '/en/support.html', href: '/en/support', kind: 'main' },
    { path: '/en/faq.html', href: '/en/faq', kind: 'dropdown' }
  ];

  for (const navCase of cases) {
    await page.goto(navCase.path, { waitUntil: 'domcontentloaded' });

    const activeLink = page.locator(`.nav a[href="${navCase.href}"]`);
    await expect(activeLink).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.nav a[aria-current="page"]')).toHaveCount(1);

    if (navCase.kind === 'dropdown') {
      await expect(activeLink).toHaveClass(/nav__dropdown-item--active/);
      await expect(page.locator('.nav__dropdown-toggle')).toHaveClass(/nav__dropdown-toggle--active/);
    } else {
      await expect(activeLink).toHaveClass(/nav__link--active/);
      await expect(page.locator('.nav__dropdown-toggle')).not.toHaveClass(/nav__dropdown-toggle--active/);
    }
  }
});

test('Download entry modes keep a compact, overflow-free layout at required widths', async ({ page }) => {
  const widths = [360, 390, 768, 1366, 1920];

  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });

    for (const downloadPage of downloadPages) {
      await page.goto(downloadPage.path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.download-callout-section')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      const startPath = downloadPage.language === 'FR' ? '/guide.html' : '/en/guide.html';
      await page.goto(startPath, { waitUntil: 'domcontentloaded' });
      await page.evaluate((path) => {
        window.location.href = path;
      }, downloadPage.path);
      await page.waitForURL(`**${downloadPage.path}`);

      await expect(page.locator('.download-callout-section')).toBeHidden();
      await expect.poll(() => page.locator('.download-callout-section').evaluate((element) => (
        getComputedStyle(element).display === 'none' && element.getBoundingClientRect().height === 0
      ))).toBe(true);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});
