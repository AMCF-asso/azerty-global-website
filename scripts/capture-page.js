/* Captures d'une page v2 pour les arrêts visuels : pleine page ivoire par
   largeur demandée, plus la vue au-dessus de la ligne de flottaison et la
   pleine page sombre à la première largeur. Usage :
     node scripts/capture-page.js /download sorties/ 1920,1440,390
   Base : BASE_URL (défaut http://localhost:3200). Requiert Playwright et un
   Edge local (channel msedge). */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const route = process.argv[2] || '/';
  const out = process.argv[3] || '.';
  const widths = (process.argv[4] || '1920').split(',').map(Number);
  const base = process.env.BASE_URL || 'http://localhost:3200';
  const slug = route.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'accueil';
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (let i = 0; i < widths.length; i++) {
    const width = widths[i];
    const ctx = await browser.newContext({ viewport: { width, height: 1080 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    if (i === 0) {
      await page.screenshot({ path: path.join(out, `${slug}-${width}-fold.png`) });
    }
    await page.screenshot({ path: path.join(out, `${slug}-${width}-ivoire.png`), fullPage: true });
    if (i === 0) {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(out, `${slug}-${width}-sombre.png`), fullPage: true });
    }
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
