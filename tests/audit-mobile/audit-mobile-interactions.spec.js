const fs = require('fs');
const path = require('path');
const { test } = require('@playwright/test');

const SCREENS_DIR = path.join('tests', 'audit-mobile', 'screenshots');

function intDir(testInfo) {
  const dir = path.join(SCREENS_DIR, testInfo.project.name, 'interactions');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function settle(p) {
  try { await p.waitForFunction(() => document.fonts && document.fonts.ready, null, { timeout: 5000 }); } catch {}
  await p.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

test('INT-01 nav mobile ouverte (index)', async ({ page: p }, testInfo) => {
  await p.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await settle(p);
  try {
    await p.locator('.nav__toggle').click({ timeout: 3000 });
    await p.waitForTimeout(300);
  } catch {}
  await p.screenshot({ fullPage: true, path: path.join(intDir(testInfo), 'INT-01-nav-open-index.png') });
});

test('INT-02 testeur ouvert (e-aigu-majuscule)', async ({ page: p }, testInfo) => {
  await p.goto('/e-aigu-majuscule.html', { waitUntil: 'domcontentloaded' });
  await settle(p);
  try {
    await p.locator('#open-tester-btn').click({ timeout: 3000 });
    await p.waitForSelector('#tester-modal', { state: 'visible', timeout: 3000 });
    await p.waitForSelector('#modal-keyboard-container .key', { state: 'visible', timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(400);
  } catch {}
  await p.screenshot({ fullPage: true, path: path.join(intDir(testInfo), 'INT-02-tester-eaigu.png') });
});

test('INT-03 testeur ouvert (index)', async ({ page: p }, testInfo) => {
  await p.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await settle(p);
  try {
    await p.locator('#open-tester-btn').click({ timeout: 3000 });
    await p.waitForSelector('#tester-modal', { state: 'visible', timeout: 3000 });
    await p.waitForSelector('#modal-keyboard-container .key', { state: 'visible', timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(400);
  } catch {}
  await p.screenshot({ fullPage: true, path: path.join(intDir(testInfo), 'INT-03-tester-index.png') });
});

test('INT-04 questionnaire - milieu de formulaire scrollé', async ({ page: p }, testInfo) => {
  await p.goto('/questionnaire.html', { waitUntil: 'domcontentloaded' });
  await settle(p);
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
  await p.waitForTimeout(300);
  await p.screenshot({ fullPage: true, path: path.join(intDir(testInfo), 'INT-04-questionnaire-mid.png') });
});

test('INT-05 feedback - milieu de formulaire scrollé', async ({ page: p }, testInfo) => {
  await p.goto('/feedback.html', { waitUntil: 'domcontentloaded' });
  await settle(p);
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
  await p.waitForTimeout(300);
  await p.screenshot({ fullPage: true, path: path.join(intDir(testInfo), 'INT-05-feedback-mid.png') });
});

test('INT-06 bug - formulaire scrollé', async ({ page: p }, testInfo) => {
  await p.goto('/bug.html', { waitUntil: 'domcontentloaded' });
  await settle(p);
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
  await p.waitForTimeout(300);
  await p.screenshot({ fullPage: true, path: path.join(intDir(testInfo), 'INT-06-bug-mid.png') });
});

test('INT-07 comparatif - tableau scrollé en bas', async ({ page: p }, testInfo) => {
  await p.goto('/comparatif.html', { waitUntil: 'domcontentloaded' });
  await settle(p);
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await p.waitForTimeout(300);
  await p.screenshot({ fullPage: true, path: path.join(intDir(testInfo), 'INT-07-comparatif-bottom.png') });
});

test('INT-08 aide-memoire - questionnaire', async ({ page: p }, testInfo) => {
  await p.goto('/aide-memoire.html', { waitUntil: 'domcontentloaded' });
  await settle(p);
  await p.evaluate(() => window.scrollTo(0, 400));
  await p.waitForTimeout(300);
  await p.screenshot({ fullPage: true, path: path.join(intDir(testInfo), 'INT-08-aide-memoire.png') });
});

test('INT-09 download - section SmartScreen', async ({ page: p }, testInfo) => {
  await p.goto('/download.html', { waitUntil: 'domcontentloaded' });
  await settle(p);
  await p.evaluate(() => {
    const ss = document.querySelector('[data-smartscreen], .smartscreen, summary');
    if (ss && typeof ss.scrollIntoView === 'function') ss.scrollIntoView({ block: 'center' });
  });
  await p.waitForTimeout(300);
  await p.screenshot({ fullPage: true, path: path.join(intDir(testInfo), 'INT-09-download-smartscreen.png') });
});

test('INT-10 faq - accordéon ouvert', async ({ page: p }, testInfo) => {
  await p.goto('/faq.html', { waitUntil: 'domcontentloaded' });
  await settle(p);
  try {
    const firstDetails = p.locator('details').first();
    await firstDetails.evaluate(el => el.setAttribute('open', ''));
    await p.waitForTimeout(200);
  } catch {}
  await p.screenshot({ fullPage: true, path: path.join(intDir(testInfo), 'INT-10-faq-open.png') });
});

test('INT-11 toast clipboard (e-aigu)', async ({ page: p }, testInfo) => {
  await p.goto('/e-aigu-majuscule.html', { waitUntil: 'domcontentloaded' });
  await settle(p);
  await p.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  try {
    await p.locator('[data-copy-char]').first().click({ timeout: 3000 });
    await p.waitForTimeout(400);
  } catch {}
  await p.screenshot({ fullPage: false, path: path.join(intDir(testInfo), 'INT-11-toast-clipboard.png') });
});

test('INT-12 dropdown nav "Plus" ouvert', async ({ page: p }, testInfo) => {
  await p.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await settle(p);
  try {
    await p.locator('.nav__toggle').click({ timeout: 3000 });
    await p.waitForTimeout(200);
    await p.locator('.nav__dropdown-toggle').first().click({ timeout: 3000 });
    await p.waitForTimeout(200);
  } catch {}
  await p.screenshot({ fullPage: true, path: path.join(intDir(testInfo), 'INT-12-dropdown-open.png') });
});
