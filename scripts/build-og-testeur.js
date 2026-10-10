/* Génère `assets/og-testeur.png` (1200 × 630) depuis `scripts/og/testeur.html`.
   Image sociale propre à /testeur — P14c, spec du 2026-09-19 §5.3.

   Usage : npm run build:og:testeur
   Requiert Playwright et un Edge local (channel msedge), comme les autres
   captures du dépôt. ⛔ Le PNG ne se retouche pas à la main : il se régénère. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, 'og', 'testeur.html');
const SORTIE = path.join(__dirname, '..', 'assets', 'og-testeur.png');

(async () => {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Source introuvable : ${SOURCE}`);
  }
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1
  });
  const page = await ctx.newPage();
  await page.goto('file://' + SOURCE.replace(/\\/g, '/'), { waitUntil: 'load' });
  // Les fontes sont locales : attendre leur chargement, sinon la capture part
  // en Georgia et l'image livrée n'est pas celle du site.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: SORTIE });
  await ctx.close();
  await browser.close();
  console.log(`og:image écrite : ${SORTIE}`);
})().catch((e) => { console.error(e); process.exit(1); });
