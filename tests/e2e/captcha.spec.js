const { test, expect } = require('../helpers/local-site');

// Vérification anti-spam (js/v2/captcha.js, S-02 du 2026-10-05). hCaptcha est
// simulé par le fixture (tests/helpers/local-site.js) ; aucun envoi réel.

async function remplirContact(page) {
  await page.locator('#motif').selectOption('positif');
  await page.locator('#description').fill('Message de test local.');
  await page.locator('label[for="note-8"]').click();
}

test('contact : hCaptcha n’est chargé qu’à la première interaction, zone avant le bouton', async ({ page, network }) => {
  await page.goto('/contact', { waitUntil: 'load' });
  const zone = page.locator('#formulaire-contact .formulaire__captcha-zone');
  await expect(zone).toHaveCount(1);
  expect(network.hcaptchaRequests).toHaveLength(0);

  // La zone précède le bloc d'envoi et porte son intitulé.
  expect(await zone.evaluate(node => {
    const envoi = node.closest('form').querySelector('.formulaire__envoi');
    return Boolean(node.compareDocumentPosition(envoi) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  await expect(page.getByRole('group', { name: 'Vérification anti-spam' })).toHaveCount(1);

  await page.locator('#description').focus();
  await expect(zone.locator('textarea[name="h-captcha-response"]')).toHaveCount(1);
  expect(network.hcaptchaRequests).toHaveLength(1);
  expect(network.hcaptchaRequests[0].url).toContain('render=explicit');
  expect(network.hcaptchaRequests[0].url).toContain('hl=fr');
  expect(network.cspViolations).toEqual([]);
});

test('contact : le jeton part avec le message', async ({ page, network }) => {
  await page.goto('/contact', { waitUntil: 'load' });
  await remplirContact(page);
  await expect(page.locator('#formulaire-contact textarea[name="h-captcha-response"]')).toHaveCount(1);
  const envoi = page.waitForRequest(request => request.url().includes('api.web3forms.com') && request.method() === 'POST');
  await page.locator('#formulaire-contact button[type="submit"]').click();
  expect((await envoi).postData()).toContain('jeton-test-local');
  await expect(page.locator('#contact-confirmation')).toBeVisible();
  expect(network.pageErrors).toEqual([]);
  expect(network.cspViolations).toEqual([]);
});

test('contact : case non cochée, rien ne part et le bilan le dit', async ({ page, network }) => {
  await page.addInitScript(() => { window.__hcaptchaJetonTest = ''; });
  await page.goto('/contact', { waitUntil: 'load' });
  await remplirContact(page);
  await expect(page.locator('#formulaire-contact textarea[name="h-captcha-response"]')).toHaveCount(1);
  await page.locator('#formulaire-contact button[type="submit"]').click();
  const bilan = page.locator('#formulaire-contact .formulaire__bilan');
  await expect(bilan).toBeVisible();
  await expect(bilan).toContainText('Cochez la case de vérification');
  await expect(page.locator('#formulaire-contact .formulaire__captcha .champ__erreur')).toBeVisible();
  expect(network.web3FormsRequests).toHaveLength(0);
});

test('contact : après un refus, la case est remise à zéro', async ({ page, network }) => {
  network.setWeb3FormsResponse({ status: 200, body: { success: false, message: 'Refus local' } });
  await page.goto('/contact', { waitUntil: 'load' });
  await remplirContact(page);
  await expect(page.locator('#formulaire-contact textarea[name="h-captcha-response"]')).toHaveCount(1);
  await page.locator('#formulaire-contact button[type="submit"]').click();
  await expect(page.locator('#contact-echec')).toBeVisible();
  expect(await page.evaluate(() => window.__hcaptchaReinitialisations)).toBe(1);
});

test('contact EN : consignes et hCaptcha en anglais', async ({ page, network }) => {
  await page.goto('/en/contact', { waitUntil: 'load' });
  await page.locator('#description').focus();
  await expect(page.locator('#formulaire-contact textarea[name="h-captcha-response"]')).toHaveCount(1);
  await expect(page.getByRole('group', { name: 'Spam check' })).toHaveCount(1);
  expect(network.hcaptchaRequests[0].url).toContain('hl=en');
});

test('colonne étroite : taille compacte et hauteur réservée', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/contact', { waitUntil: 'load' });
  const zone = page.locator('#formulaire-contact .formulaire__captcha-zone');
  await expect(zone).toHaveClass(/captcha--compact/);
  expect(await zone.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(144);
  await page.locator('#description').focus();
  await expect(zone).toHaveAttribute('data-hcaptcha-simule', 'compact');
});

test('liste d’attente de /bienvenue : vérification avant l’envoi, jeton transmis', async ({ page, network }) => {
  await page.goto('/bienvenue', { waitUntil: 'load' });
  const form = page.locator('#welcome-waitlist');
  await expect(form.locator('.waitlist-captcha')).toHaveCount(1);
  await form.locator('input[type="email"]').fill('visiteur@example.com');
  await expect(form.locator('textarea[name="h-captcha-response"]')).toHaveCount(1);
  const envoi = page.waitForRequest(request => request.url().includes('api.web3forms.com') && request.method() === 'POST');
  await form.locator('button[type="submit"]').click();
  expect((await envoi).postData()).toContain('jeton-test-local');
  await expect(form).toHaveAttribute('data-state', 'sent');
  expect(network.cspViolations).toEqual([]);
});
