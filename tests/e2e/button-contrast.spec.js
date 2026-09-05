const fs = require('fs');
const path = require('path');
const { test, expect } = require('../helpers/local-site');

const evidenceRoot = path.resolve(__dirname, '../../.internal/night-v15/contrast');
const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 667 }
];
// Explicit, existing blue CTAs: the English online tester has a separate yellow
// gradient and is outside this blue-button change. Hidden lesson controls and
// inactive OS tabs are covered by their own functional tests.
const pages = [
  { route: '/', buttons: [
    { selector: '.hero__actions--home .btn--primary', label: 'Voir les 5 changements' },
    { selector: 'main a.btn--primary[href="/soutien"]', label: 'Soutenir le projet' },
    { selector: '[data-track-detail-source="home-zevent"]', label: 'Demander un pilote gratuit' }
  ] },
  { route: '/download', buttons: [
    { selector: '#btn-download-store', label: 'Télécharger depuis le Microsoft Store' },
    { selector: '[data-track-detail-source="download-zevent"]', label: 'Demander un pilote gratuit' }
  ] },
  { route: '/en/download', buttons: [
    { selector: '#btn-download-store', label: 'Download from the Microsoft Store' }
  ] },
  { route: '/bienvenue', buttons: [
    { selector: '#welcome-start', label: 'Essayer en 1 minute' }
  ] }
];

function opaqueRgb(value) {
  const match = /^rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*([\d.]+))?\)$/.exec(value);
  expect(match, `Supported computed sRGB colour: ${value}`).not.toBeNull();
  expect(Number(match[4] ?? 1), `Opaque colour required: ${value}`).toBe(1);
  return match.slice(1, 4).map(Number);
}

function luminance(rgb) {
  const linear = rgb.map(channel => {
    const srgb = channel / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

async function settleButton(button) {
  // Wait for the real colour transition; do not replace production styles.
  await button.evaluate(async node => {
    await Promise.all(node.getAnimations()
      .filter(animation => animation.effect.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {})));
  });
}

for (const viewport of viewports) {
  test.describe(`blue CTA contrast ${viewport.name}`, () => {
    // The narrow viewport exercises responsive CSS; mouse/keyboard states are
    // intentionally retained in Chromium rather than pretending phones hover.
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const config of pages) {
      test(`${config.route}: existing labels meet 4.5:1 in rest, hover and focus`, async ({ page, network }, testInfo) => {
        const measurements = [];
        fs.mkdirSync(evidenceRoot, { recursive: true });
        try {
          const response = await page.goto(config.route);
          expect(response.status()).toBe(200);
          // Light mode is paused by js/theme.js. Test the real public theme.
          await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
          await page.evaluate(() => document.fonts.ready);
          let targets = config.buttons;
          // Some mobile entries expose the desktop relay instead of the Store.
          // Assert its actual CTA in that case; desktop always requires Store.
          if (config.route === '/download' && viewport.name === 'mobile' && !await page.locator('#btn-download-store').isVisible()) {
            targets = [{ selector: '[data-relay-copy]', label: 'Copier le lien' }, ...config.buttons.slice(1)];
          }
          expect(targets.length, 'At least one known CTA must be checked').toBeGreaterThan(0);

          for (const target of targets) {
            const button = page.locator(target.selector);
            await expect(button).toHaveCount(1);
            await expect(button).toBeVisible();
            await expect(button).toHaveText(target.label);
            const href = await button.getAttribute('href');
            for (const state of ['rest', 'hover', 'focus']) {
              await button.scrollIntoViewIfNeeded();
              await page.mouse.move(0, 0);
              await button.evaluate(node => node.blur());
              if (state === 'hover') {
                await button.hover();
                expect(await button.evaluate(node => node.matches(':hover'))).toBe(true);
              } else if (state === 'focus') {
                await page.keyboard.press('Tab');
                await button.focus();
                await expect(button).toBeFocused();
                expect(await button.evaluate(node => node.matches(':focus-visible'))).toBe(true);
              } else {
                expect(await button.evaluate(node => node.matches(':hover, :focus'))).toBe(false);
              }
              await settleButton(button);
              const colours = await button.evaluate(node => {
                const style = getComputedStyle(node);
                return {
                  foreground: style.color,
                  background: style.backgroundColor,
                  backgroundImage: style.backgroundImage,
                  opacity: style.opacity
                };
              });
              expect(colours.backgroundImage, `${target.selector}: solid blue CTA`).toBe('none');
              expect(Number(colours.opacity)).toBe(1);
              const foreground = luminance(opaqueRgb(colours.foreground));
              const background = luminance(opaqueRgb(colours.background));
              const ratio = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
              const measurement = { route: config.route, viewport: viewport.name, theme: 'dark', selector: target.selector, label: target.label, state, ...colours, ratio };
              measurements.push(measurement);
              // Use the unrounded ratio, including for large text, for a single
              // conservative legibility floor across all existing CTA labels.
              expect(ratio, JSON.stringify(measurement)).toBeGreaterThanOrEqual(4.5);
              await expect(button).toHaveText(target.label);
              expect(await button.getAttribute('href'), 'Existing action remains unchanged').toBe(href);
              if (state === 'rest' && target === targets[0] &&
                  ((viewport.name === 'desktop' && config.route === '/') ||
                   (viewport.name === 'mobile' && config.route === '/download'))) {
                const file = `${process.env.CONTRAST_PHASE || 'current'}-${viewport.name}-${config.route === '/' ? 'home' : 'download'}-cta.png`;
                await button.screenshot({ path: path.join(evidenceRoot, file) });
              }
            }
          }
          expect(measurements).toHaveLength(targets.length * 3);
          expect(network.web3FormsRequests, 'No form submission').toEqual([]);
          expect(network.pageErrors).toEqual([]);
          expect(network.cspViolations).toEqual([]);
        } finally {
          fs.mkdirSync(evidenceRoot, { recursive: true });
          const routeName = config.route === '/' ? 'home' : config.route.slice(1).replace(/\//g, '-');
          const file = path.join(evidenceRoot, `${process.env.CONTRAST_PHASE || 'current'}-${viewport.name}-${routeName}-${testInfo.project.name}.json`);
          fs.writeFileSync(file, JSON.stringify({ title: testInfo.title, measurements }, null, 2) + '\n');
          await testInfo.attach('computed-button-contrast', { path: file, contentType: 'application/json' });
        }
      });
    }
  });
}
