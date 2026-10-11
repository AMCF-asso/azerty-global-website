const { test, expect } = require('../helpers/local-site');
const telechargements = require('../../src/_data/telechargements.js');

// Parcours des pages v2 vivantes (réécrit le 2026-10-10 à partir de
// traffic-v15.spec.js, dont les blocs ZEVENT, parrainage, home v1 et relais de
// téléchargement décrivaient l'ancien site).
//
// Routes : celles qui répondent 200 sans règle de _redirects. /feedback et
// /bug (301 vers /contact), /beta et /merci n'y figurent donc pas.

const pages = ['/', '/download', '/en/download', '/soutien', '/pilote', '/pilote-bilan', '/questionnaire', '/contact', '/en/contact'];
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'desktop', width: 1280, height: 900 }
];

async function assertCleanPage(network) {
  expect(network.pageErrors, 'Uncaught page errors').toEqual([]);
  expect(network.cspViolations, 'Production CSP violations').toEqual([]);
  expect(network.consoleErrors, 'Console errors, including local assets').toEqual([]);
}

async function completeRequiredFields(form) {
  // Exercise the real validation and submit handlers, with synthetic test data.
  // Two passes cover required inputs revealed by selecting an earlier answer.
  for (let pass = 0; pass < 2; pass++) {
    const fields = form.locator('input[required], select[required], textarea[required]');
    for (let i = 0; i < await fields.count(); i++) {
      const field = fields.nth(i);
      if (await field.isDisabled()) continue;
      const info = await field.evaluate(node => ({ id: node.id, tag: node.tagName, type: node.type, checked: node.checked }));
      if (info.tag === 'SELECT') {
        const value = await field.locator('option').evaluateAll(options => options.find(option => option.value && !option.disabled && !/autre|other/i.test(option.value))?.value);
        if (value) await field.selectOption(value);
      } else if (info.type === 'checkbox' || info.type === 'radio') {
        if (!info.checked) {
          const label = form.locator(`label[for="${info.id}"]`);
          if (await label.count()) await label.click();
          else await field.locator('xpath=ancestor::label').click();
          await expect(field).toBeChecked();
        }
      } else if (await field.isVisible()) {
        await field.fill(info.type === 'email' ? 'local-test@example.invalid' : info.type === 'number' ? '3' : 'Essai local automatisé, sans envoi réel.');
      }
    }
  }
  const invalid = await form.evaluate(node => [...node.elements].filter(field => field.willValidate && !field.validity.valid).map(field => ({ id: field.id, reason: field.validationMessage })));
  expect(invalid, 'Le formulaire est complet avant l’envoi').toEqual([]);
}

for (const viewport of viewports) {
  test.describe(`pages v2 ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of pages) {
      test(`${route} : mise en page, clavier et CSP`, async ({ page, network }) => {
        const response = await page.goto(route);
        expect(response.status()).toBe(200);
        await expect(page.locator('main h1').first()).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        const overflow = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
        expect(overflow.document, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport + 1);
        expect(overflow.body, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport + 1);
        await page.keyboard.press('Tab');
        await expect(page.locator(':focus')).toBeVisible();
        expect(await page.locator(':focus').evaluate(node => ['A', 'BUTTON', 'INPUT', 'SUMMARY'].includes(node.tagName))).toBe(true);
        await page.keyboard.press('Tab');
        await expect(page.locator(':focus')).toBeVisible();
        await page.locator('body').click({ position: { x: 2, y: 2 } });
        await assertCleanPage(network);
        expect(network.web3FormsRequests).toEqual([]);
      });
    }
  });
}

// Formulaires pilote : js/v2/formulaire.js lit data-echec et data-fin sur le
// <form>. hCaptcha est simulé par le fixture (jeton « jeton-test-local »,
// posé à la première interaction avec le formulaire).
const formulairesPilote = [
  { route: '/pilote', id: 'pilot-request-form', echec: 'pilote-echec', fin: 'pilote-confirmation' },
  { route: '/pilote-bilan', id: 'pilot-report-form', echec: 'bilan-echec', fin: 'bilan-confirmation' }
];

for (const config of formulairesPilote) {
  test(`${config.route} : échec réseau puis succès de l’envoi`, async ({ page, network }) => {
    await page.goto(config.route, { waitUntil: 'load' });
    const form = page.locator(`#${config.id}`);
    const echec = page.locator(`#${config.echec}`);
    const fin = page.locator(`#${config.fin}`);
    await expect(form).toHaveAttribute('data-echec', config.echec);
    await expect(form).toHaveAttribute('data-fin', config.fin);

    await completeRequiredFields(form);
    await expect(form.locator('textarea[name="h-captcha-response"]')).toHaveCount(1);
    // Ce que le visiteur a saisi, hors jeton hCaptcha.
    const saisie = () => form.evaluate(node => [...new FormData(node).entries()].filter(([nom]) => nom !== 'h-captcha-response'));
    const avant = await saisie();
    const bouton = form.locator('button[type="submit"]');
    const libelle = await bouton.innerText();

    // 1. La requête n'aboutit pas : message d'échec, champs conservés.
    network.failWeb3FormsNetwork();
    await bouton.click();
    await expect(echec).toBeVisible();
    await expect(fin).toBeHidden();
    await expect(form).toBeVisible();
    await expect(bouton).toBeEnabled();
    await expect(bouton).toHaveText(libelle);
    expect(await saisie()).toEqual(avant);
    expect(network.web3FormsRequests.filter(request => request.method === 'POST')).toHaveLength(1);

    // 2. Réessai : le prestataire répond, confirmation à la place du formulaire.
    network.setWeb3FormsResponse({ status: 200, body: { success: true, message: 'Succès local' } });
    await bouton.click();
    await expect(fin).toBeVisible();
    await expect(form).toBeHidden();
    await expect(echec).toBeHidden();
    expect(network.web3FormsRequests.filter(request => request.method === 'POST')).toHaveLength(2);
    expect(network.pageErrors).toEqual([]);
    expect(network.cspViolations).toEqual([]);
  });
}

for (const route of ['/download', '/en/download']) {
  test(`${route} : aucun formulaire, chaque cible de téléchargement conservée sans être requêtée`, async ({ page, network }) => {
    await page.goto(route);
    // Le <form method="dialog"> de la visionneuse (js/v2/visionneuse.js) ne fait
    // que fermer la fenêtre : il n'envoie rien.
    await expect(page.locator('form:not([method="dialog"])')).toHaveCount(0);
    await expect(page.locator('script[src*="web3forms.js"]')).toHaveCount(0);
    // Les URL viennent du registre servi (src/_data/telechargements.js).
    const attendu = {
      'btn-download-msix': telechargements.kit('entreprise').url,
      'btn-download-exe': telechargements.kit('windows').url,
      'btn-download-macos': telechargements.kit('macos').url,
      'btn-download-linux': telechargements.kit('linux').url
    };
    for (const [id, href] of Object.entries(attendu)) await expect(page.locator(`#${id}`)).toHaveAttribute('href', href);
    const urlStore = telechargements.kit('store').url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(page.locator('#btn-download-store')).toHaveAttribute('href', new RegExp(`^${urlStore}\\?`));
    await expect(page.locator(`a[href="${telechargements.kit('msixbundle').url}"]`)).toHaveCount(1);
    expect(network.externalRequests.filter(request => /download\.azerty\.global|sourceforge\.net|apps\.microsoft\.com/.test(request.url))).toEqual([]);
  });
}

// Les deux /download sont en v2 depuis le 2026-10-10 (roadmap E1) : l'onglet
// est le bouton lui-même (.selecteur-os__onglet), sans .os-tab__label v1.
for (const route of ['/download', '/en/download']) {
  test(`${route} : les trois panneaux d’OS référencent leur onglet`, async ({ page, network }) => {
    await page.goto(route);
    await expect(page.locator('[aria-labeledby]')).toHaveCount(0);
    for (const os of ['windows', 'macos', 'linux']) {
      const tab = page.locator(`#tab-${os}`);
      const panel = page.locator(`#os-${os}`);
      await expect(panel).toHaveAttribute('aria-labelledby', `tab-${os}`);
      await expect(tab).toHaveAttribute('aria-controls', `os-${os}`);
      await tab.click();
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAccessibleName((await tab.innerText()).trim());
    }
    await assertCleanPage(network);
  });
}
