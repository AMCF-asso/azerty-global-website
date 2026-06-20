// Mesure le rendu reel des titres de la home (avant refactor) pour calibrer la
// formule length-aware. Usage : node scripts/measure-da-titles.js
const { chromium } = require('@playwright/test');

const widths = [360, 390, 768, 1440];
const url = 'http://localhost:3000/index.html';
const sels = ['.hero__title', '.section__title', '.card__title'];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    console.log(`\n=== viewport ${w}px ===`);
    for (const sel of sels) {
      const data = await page.$$eval(sel, els => els.map(el => {
        const cs = getComputedStyle(el);
        const fs = parseFloat(cs.fontSize);
        const lh = parseFloat(cs.lineHeight) || fs * 1.2;
        const lines = Math.round(el.getBoundingClientRect().height / lh);
        // texte visible sans icone decorative
        const clone = el.cloneNode(true);
        clone.querySelectorAll('[aria-hidden="true"]').forEach(n => n.remove());
        const text = clone.textContent.replace(/\s+/g, ' ').trim();
        return {
          text: text.slice(0, 30),
          chars: text.length,
          fontPx: Math.round(fs * 10) / 10,
          width: Math.round(el.clientWidth),
          scrollW: Math.round(el.scrollWidth),
          lines,
        };
      }));
      data.forEach(d => console.log(`  ${sel.padEnd(16)} "${d.text}" chars=${d.chars} font=${d.fontPx}px box=${d.width} scroll=${d.scrollW} lines=${d.lines}`));
    }
    await ctx.close();
  }
  await browser.close();
})();
