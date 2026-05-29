const fs = require('fs');
const path = require('path');
const { test } = require('@playwright/test');

const DARK_PAGES = [
  'index', 'download', 'merci', 'comparatif', 'aide-memoire',
  'questionnaire', 'feedback', 'bug', 'e-aigu-majuscule',
  'dev', 'entreprises', 'ecoles'
];

const SCREENS_DIR = path.join('tests', 'audit-mobile', 'screenshots');
const THEME_KEY = 'azerty-theme';

for (const page of DARK_PAGES) {
  test(`dark ${page}`, async ({ page: p, browserName }, testInfo) => {
    await p.addInitScript(([key]) => {
      try { window.localStorage.setItem(key, 'dark'); } catch {}
    }, [THEME_KEY]);

    await p.goto(`/${page}.html`, { waitUntil: 'domcontentloaded' });
    try { await p.waitForFunction(() => document.fonts && document.fonts.ready, null, { timeout: 5000 }); } catch {}
    await p.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const projectName = testInfo.project.name;
    const dir = path.join(SCREENS_DIR, projectName, 'dark');
    fs.mkdirSync(dir, { recursive: true });
    await p.screenshot({ fullPage: true, path: path.join(dir, `${page}.png`) });
  });
}
