const fs = require('fs');
const path = require('path');
const { test } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const PAGES = [
  'index', 'download', 'guide', 'faq', 'comparatif', 'compatibilite',
  'licence', 'mentions-legales', 'presse', 'soutien', 'nouveautes',
  'a-propos', 'dev', 'entreprises', 'ecoles',
  'questionnaire', 'bug', 'feedback', 'merci', '404',
  'afrique', 'aide-memoire',
  'a-grave-majuscule', 'c-cedille-majuscule', 'e-aigu-majuscule',
  'e-grave-majuscule', 'e-dans-l-a', 'e-dans-l-o', 'guillemets'
];

const SCREENS_DIR = path.join('tests', 'audit-mobile', 'screenshots');
const METRICS_PATH = path.join('tests', 'audit-mobile', 'metrics.json');

function loadMetrics() {
  if (fs.existsSync(METRICS_PATH)) {
    try { return JSON.parse(fs.readFileSync(METRICS_PATH, 'utf8')); } catch { return {}; }
  }
  return {};
}

function saveMetrics(data) {
  fs.mkdirSync(path.dirname(METRICS_PATH), { recursive: true });
  fs.writeFileSync(METRICS_PATH, JSON.stringify(data, null, 2));
}

for (const page of PAGES) {
  test(`audit ${page}`, async ({ page: p, browserName }, testInfo) => {
    const consoleErrors = [];
    p.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200)); });
    p.on('pageerror', err => consoleErrors.push(`PAGE_ERROR: ${err.message.slice(0, 200)}`));

    const url = `/${page}.html`;
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    try { await p.waitForFunction(() => document.fonts && document.fonts.ready, null, { timeout: 5000 }); } catch {}
    await p.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const projectName = testInfo.project.name;
    const screenshotDir = path.join(SCREENS_DIR, projectName);
    fs.mkdirSync(screenshotDir, { recursive: true });
    await p.screenshot({ fullPage: true, path: path.join(screenshotDir, `${page}.png`) });

    const overflow = await p.evaluate(() =>
      document.documentElement.scrollWidth - window.innerWidth
    );
    const tinyTargets = await p.$$eval(
      'a, button, [role="button"], input[type="submit"], input[type="checkbox"], input[type="radio"], select',
      els => els
        .filter(e => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
        })
        .slice(0, 10)
        .map(e => {
          const r = e.getBoundingClientRect();
          return {
            tag: e.tagName,
            text: (e.innerText || e.value || e.getAttribute('aria-label') || '').slice(0, 40),
            w: Math.round(r.width),
            h: Math.round(r.height)
          };
        })
    );
    const lang = await p.evaluate(() => document.documentElement.lang || '');
    const hasViewportMeta = await p.evaluate(() => !!document.querySelector('meta[name="viewport"]'));
    const missingAriaExpanded = await p.$$eval(
      '.nav__dropdown-toggle',
      els => els.filter(e => !e.hasAttribute('aria-expanded')).length
    );

    let axeViolations = [];
    try {
      const axeResults = await new AxeBuilder({ page: p })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      axeViolations = axeResults.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        count: v.nodes.length,
        help: v.help
      }));
    } catch (err) {
      axeViolations = [{ id: '__axe_failed__', impact: 'unknown', count: 0, help: err.message.slice(0, 200) }];
    }

    const all = loadMetrics();
    const key = `${projectName}::${page}`;
    all[key] = {
      overflow,
      tinyTargets,
      tinyTargetsCount: tinyTargets.length,
      lang,
      hasViewportMeta,
      missingAriaExpanded,
      consoleErrors: consoleErrors.slice(0, 10),
      a11yViolations: axeViolations
    };
    saveMetrics(all);
  });
}
