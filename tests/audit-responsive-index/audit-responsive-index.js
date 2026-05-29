const fs = require('fs');
const path = require('path');
const { chromium, webkit } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:3000/index.html';
const OUT_DIR = path.join(__dirname);
const SCREENSHOT_DIR = path.join(OUT_DIR, 'screenshots');
const METRICS_PATH = path.join(OUT_DIR, 'metrics.json');

const CHROMIUM_WIDTHS = [320, 360, 390, 412, 430, 500, 600, 640, 768, 769, 834, 1024, 1025, 1200, 1366, 1440, 1600];
const WEBKIT_WIDTHS = [320, 360, 500, 768, 769, 1024];
const FULL_SCREENSHOT_WIDTHS = new Set([320, 360, 500, 768, 769, 1024, 1366]);

function viewportFor(width) {
  if (width <= 500) return { width, height: 740 };
  if (width <= 768) return { width, height: 1000 };
  if (width <= 1024) return { width, height: 1200 };
  return { width, height: 900 };
}

function contextOptions(width, browserName) {
  return {
    viewport: viewportFor(width),
    deviceScaleFactor: width <= 768 ? 2 : 1,
    isMobile: width <= 768,
    hasTouch: width <= 1024,
    colorScheme: 'dark',
    userAgent: browserName === 'webkit' && width <= 768
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined
  };
}

async function waitForPage(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForFunction(() => document.fonts && document.fonts.ready, null, { timeout: 5000 });
  } catch {}
  await page.waitForLoadState('networkidle', { timeout: 7000 }).catch(() => {});
  await page.waitForTimeout(250);
}

async function getMetrics(page) {
  return await page.evaluate(() => {
    const selectors = {
      header: '.header',
      headerInner: '.header__inner',
      headerLogo: '.header__logo-img',
      nav: '.nav',
      navToggle: '.nav__toggle',
      themeToggle: '.theme-toggle',
      hero: '.hero',
      heroTitle: '.hero__title',
      heroLead: '.hero__lead',
      heroSubtitle: '.hero__subtitle',
      keyboard: '.hero__keyboard',
      ctas: '.hero__actions--home',
      benefits: '.benefits',
      benefitsGrid: '.benefits__grid',
      benefitCards: '.benefits__grid .card',
      wowTable: '.table--wow',
      wowWrapper: '.table-wrapper',
      testimonials: '#temoignages-carousel',
      footer: '.footer',
      footerBrand: '.footer__brand',
      footerLinks: '.footer__links',
      footerBottom: '.footer__bottom'
    };

    function rectFor(selector) {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height),
        right: Math.round(r.right),
        bottom: Math.round(r.bottom),
        display: cs.display,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        whiteSpace: cs.whiteSpace,
        overflowX: cs.overflowX
      };
    }

    const components = {};
    for (const [key, selector] of Object.entries(selectors)) {
      if (key === 'benefitCards') {
        components[key] = Array.from(document.querySelectorAll(selector)).map((el) => {
          const r = el.getBoundingClientRect();
          const title = el.querySelector('.card__title');
          const text = el.querySelector('.card__text');
          return {
            width: Math.round(r.width),
            height: Math.round(r.height),
            title: title ? title.textContent.trim() : '',
            titleFontSize: title ? getComputedStyle(title).fontSize : null,
            textFontSize: text ? getComputedStyle(text).fontSize : null
          };
        });
      } else {
        components[key] = rectFor(selector);
      }
    }

    const tinyTargetsAll = Array.from(document.querySelectorAll('a, button, [role="button"], input, select, textarea'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          selector: el.className || el.id || el.tagName,
          text: (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 60),
          width: Math.round(r.width),
          height: Math.round(r.height)
        };
      });
    const tinyTargets = tinyTargetsAll.slice(0, 20);

    const resources = performance.getEntriesByType('resource')
      .map((entry) => ({
        name: entry.name.replace(location.origin + '/', ''),
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        duration: Math.round(entry.duration)
      }))
      .sort((a, b) => (b.transferSize || b.encodedBodySize) - (a.transferSize || a.encodedBodySize));

    return {
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        bodyScrollWidth: document.body.scrollWidth
      },
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      components,
      tinyTargets,
      tinyTargetsCount: tinyTargetsAll.length,
      resources: resources.slice(0, 20),
      resourceTotals: {
        count: resources.length,
        transferSize: resources.reduce((sum, item) => sum + (item.transferSize || 0), 0),
        encodedBodySize: resources.reduce((sum, item) => sum + (item.encodedBodySize || 0), 0)
      },
      layoutShift: performance.getEntriesByType('layout-shift')
        .filter((entry) => !entry.hadRecentInput)
        .reduce((sum, entry) => sum + entry.value, 0)
    };
  });
}

async function captureInteractions(page, browserName, width) {
  const interactionDir = path.join(SCREENSHOT_DIR, browserName, String(width), 'interactions');
  fs.mkdirSync(interactionDir, { recursive: true });

  const interactions = {};

  const navToggle = page.locator('.nav__toggle');
  if (await navToggle.count()) {
    await navToggle.click().catch(() => {});
    await page.waitForTimeout(200);
    await page.screenshot({ fullPage: false, path: path.join(interactionDir, 'menu-open.png') });
    interactions.menuOpen = await page.evaluate(() => ({
      navToggleExpanded: document.querySelector('.nav__toggle')?.getAttribute('aria-expanded'),
      navDisplay: getComputedStyle(document.querySelector('.nav')).display,
      navRect: (() => {
        const r = document.querySelector('.nav')?.getBoundingClientRect();
        return r ? { width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) } : null;
      })()
    }));
    await navToggle.click().catch(() => {});
  }

  const keyboard = page.locator('.hero__keyboard');
  if (await keyboard.count()) {
    await keyboard.click({ position: { x: 10, y: 10 } }).catch(() => {});
    await page.waitForTimeout(250);
    interactions.keyboardFullscreen = await page.evaluate(() => {
      const overlay = document.querySelector('.keyboard-fullscreen');
      const image = document.querySelector('.keyboard-fullscreen__image');
      const r = image?.getBoundingClientRect();
      return {
        isOpen: overlay ? !overlay.hidden : false,
        image: r ? { width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left) } : null,
        transform: image ? getComputedStyle(image).transform : null
      };
    });
    if (interactions.keyboardFullscreen?.isOpen) {
      await page.screenshot({ fullPage: false, path: path.join(interactionDir, 'keyboard-fullscreen.png') });
      await page.locator('.keyboard-fullscreen__close').click().catch(() => {});
    }
  }

  const rightChevron = page.locator('.temoignages-chevron--right');
  if (await rightChevron.count()) {
    await page.locator('#temoignages-carousel').scrollIntoViewIfNeeded().catch(() => {});
    await rightChevron.click().catch(() => {});
    await page.waitForTimeout(200);
    await page.screenshot({ fullPage: false, path: path.join(interactionDir, 'testimonials-next.png') });
    interactions.testimonials = await page.evaluate(() => ({
      cardCount: document.querySelectorAll('.temoignages-card').length,
      chevronCount: document.querySelectorAll('.temoignages-chevron').length
    }));
  }

  return interactions;
}

async function auditOne(browserType, browserName, width, launchOptions = {}) {
  const browser = await browserType.launch(launchOptions);
  const context = await browser.newContext(contextOptions(width, browserName));
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on('pageerror', (err) => consoleErrors.push(`PAGE_ERROR: ${err.message.slice(0, 300)}`));

  await waitForPage(page);

  const screenshotDir = path.join(SCREENSHOT_DIR, browserName, String(width));
  fs.mkdirSync(screenshotDir, { recursive: true });
  if (FULL_SCREENSHOT_WIDTHS.has(width)) {
    await page.screenshot({ fullPage: true, path: path.join(screenshotDir, 'full-page.png') });
  }

  const metrics = await getMetrics(page);
  let axeViolations = [];
  try {
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    axeViolations = axeResults.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      count: v.nodes.length,
      help: v.help,
      sample: v.nodes[0]?.target?.join(' ') || ''
    }));
  } catch (err) {
    axeViolations = [{ id: '__axe_failed__', impact: 'unknown', count: 0, help: err.message.slice(0, 200), sample: '' }];
  }

  const interactions = FULL_SCREENSHOT_WIDTHS.has(width) || width <= 1024
    ? await captureInteractions(page, browserName, width)
    : {};

  await context.close();
  await browser.close();

  return {
    browser: browserName,
    width,
    timestamp: new Date().toISOString(),
    url: BASE_URL,
    consoleErrors,
    a11yViolations: axeViolations,
    interactions,
    ...metrics
  };
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const results = [];

  for (const width of CHROMIUM_WIDTHS) {
    console.log(`chromium ${width}`);
    results.push(await auditOne(chromium, 'chromium', width, { channel: 'msedge' }));
  }

  for (const width of WEBKIT_WIDTHS) {
    console.log(`webkit ${width}`);
    try {
      results.push(await auditOne(webkit, 'webkit', width));
    } catch (err) {
      results.push({
        browser: 'webkit',
        width,
        timestamp: new Date().toISOString(),
        url: BASE_URL,
        skipped: true,
        skipReason: err.message
      });
      console.warn(`webkit ${width} skipped: ${err.message.split('\n')[0]}`);
    }
  }

  fs.writeFileSync(METRICS_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    chromiumWidths: CHROMIUM_WIDTHS,
    webkitWidths: WEBKIT_WIDTHS,
    fullScreenshotWidths: Array.from(FULL_SCREENSHOT_WIDTHS),
    results
  }, null, 2));
  console.log(`metrics written to ${METRICS_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
