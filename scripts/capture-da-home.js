// Capture before/after de la home pour la Phase 1 DA (audit 2026-06-20).
// Usage : node scripts/capture-da-home.js <before|after>
// Necessite le serveur local sur :3000 et Chrome (channel 'chrome').
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const phase = process.argv[2] || 'before';
const outDir = path.join(__dirname, '..', '.internal', 'audit-da-phase1', phase);
fs.mkdirSync(outDir, { recursive: true });

const widths = [1440, 390, 360];
const url = 'http://localhost:3000/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  for (const w of widths) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: 900 },
      deviceScaleFactor: 2,
      colorScheme: 'light',
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const file = path.join(outDir, `home-${w}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log('saved', file);
    await ctx.close();
  }
  await browser.close();
})();
