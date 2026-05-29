const fs = require('fs');
const path = require('path');
const { test } = require('@playwright/test');

const LANDSCAPE_VIEWPORT = { width: 667, height: 375 };
const SCREENS_DIR = path.join('tests', 'audit-mobile', 'screenshots');

const LANDSCAPE_PAGES = [
  'index', 'download', 'comparatif', 'questionnaire', 'e-aigu-majuscule'
];

test.use({ viewport: LANDSCAPE_VIEWPORT });

for (const page of LANDSCAPE_PAGES) {
  test(`landscape ${page}`, async ({ page: p }, testInfo) => {
    await p.goto(`/${page}.html`, { waitUntil: 'domcontentloaded' });
    try { await p.waitForFunction(() => document.fonts && document.fonts.ready, null, { timeout: 5000 }); } catch {}
    await p.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const dir = path.join(SCREENS_DIR, testInfo.project.name, 'landscape');
    fs.mkdirSync(dir, { recursive: true });
    await p.screenshot({ fullPage: true, path: path.join(dir, `${page}.png`) });
  });
}

test('landscape index with tester open', async ({ page: p }, testInfo) => {
  await p.goto('/index.html', { waitUntil: 'domcontentloaded' });
  try { await p.waitForFunction(() => document.fonts && document.fonts.ready, null, { timeout: 5000 }); } catch {}

  try {
    await p.locator('#open-tester-btn').click({ timeout: 3000 });
    await p.waitForSelector('#tester-modal', { state: 'visible', timeout: 3000 });
    await p.waitForSelector('#modal-keyboard-container .key', { state: 'visible', timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(300);
  } catch {}

  const dir = path.join(SCREENS_DIR, testInfo.project.name, 'landscape');
  fs.mkdirSync(dir, { recursive: true });
  await p.screenshot({ fullPage: true, path: path.join(dir, 'index-tester-open.png') });
});
