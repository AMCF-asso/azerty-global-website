const fs = require('fs');
const path = require('path');
const { test } = require('@playwright/test');

const PAGES = ['index', 'comparatif', 'questionnaire', 'e-aigu-majuscule', 'dev'];
const SCREENS_DIR = path.join('tests', 'audit-desktop', 'screenshots');

for (const page of PAGES) {
  test(`desktop ${page}`, async ({ page: p }) => {
    await p.goto(`/${page}.html`, { waitUntil: 'domcontentloaded' });
    try { await p.waitForFunction(() => document.fonts && document.fonts.ready, null, { timeout: 5000 }); } catch {}
    await p.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    fs.mkdirSync(SCREENS_DIR, { recursive: true });
    await p.screenshot({ fullPage: true, path: path.join(SCREENS_DIR, `${page}.png`) });
  });
}
