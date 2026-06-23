// Capture + mesure before/after du rythme vertical (etape 2 DA, audit 2026-06-20).
// Usage : node scripts/capture-da-rythme.js <before|after>
// Necessite le serveur local sur :3000 et Chrome (channel 'chrome').
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const phase = process.argv[2] || 'before';
const outDir = path.join(__dirname, '..', '.internal', 'audit-da-phase1', `rythme-${phase}`);
fs.mkdirSync(outDir, { recursive: true });

const pages = [
  'index.html',
  'download.html',
  'guide.html',
  'e-aigu-majuscule.html',
  'comparatif.html', // page-global
  'pilote.html',     // reference saine
];
const widths = [1440, 1024, 768, 360];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const measures = {};
  for (const p of pages) {
    measures[p] = {};
    for (const w of widths) {
      const ctx = await browser.newContext({
        viewport: { width: w, height: 900 },
        deviceScaleFactor: 1,
        colorScheme: 'light',
      });
      const page = await ctx.newPage();
      try {
        await page.goto(`http://localhost:3000/${p}`, { waitUntil: 'networkidle', timeout: 15000 });
      } catch (e) {
        console.log('SKIP', p, w, e.message);
        await ctx.close();
        continue;
      }
      await page.waitForTimeout(300);
      const slug = p.replace('.html', '');
      await page.screenshot({ path: path.join(outDir, `${slug}-${w}.png`), fullPage: true });

      // Mesures objectives du rythme
      const m = await page.evaluate(() => {
        const read = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const cs = getComputedStyle(el);
          return { pt: cs.paddingTop, pb: cs.paddingBottom, mb: cs.marginBottom };
        };
        return {
          section: read('main .section'),
          benefits: read('main .benefits'),
          header: read('main .section__header'),
          title: read('main .section__title'),
        };
      });
      measures[p][w] = m;
      await ctx.close();
    }
  }
  fs.writeFileSync(path.join(outDir, '_measures.json'), JSON.stringify(measures, null, 2));
  console.log('Captures + mesures =>', outDir);
  await browser.close();
})();
