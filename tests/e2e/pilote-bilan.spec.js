const { test, expect } = require('../helpers/local-site');

// PBILAN (lot P2, 19/10/2026) : « Oui, prolonger ou étendre » rend l'e-mail
// obligatoire (js/v2/pilote-bilan.js) ; tout autre choix le laisse facultatif.
// Aucun envoi : on ne teste que la validation et le texte de confirmation.
const form = '#pilot-report-form';

async function remplirSansSuite(page) {
  await page.locator('#report-role-referente').check();
  await page.locator('#report-moment-j14').check();
  await page.locator('#report-structure').fill('École test');
  await page.locator('label[for="report-score-7"]').click();
  await page.locator('#report-positive').fill('Les accents se trouvent vite.');
  await page.locator('#report-quote-oui').check();
}

test('pilote-bilan : l’e-mail n’est obligatoire que pour « Oui, prolonger ou étendre »', async ({ page, network }) => {
  await page.goto('/pilote-bilan');
  const email = page.locator('#report-email');
  const bilan = page.locator(`${form} .formulaire__bilan`);
  await remplirSansSuite(page);

  await expect(email).not.toHaveAttribute('required', /.*/);
  await expect(page.locator('label[for="report-email"] .champ__facultatif')).toHaveText('(obligatoire pour prolonger ou étendre)');

  await page.locator('#report-continue-oui').check();
  await expect(email).toHaveAttribute('required', '');
  await page.getByRole('button', { name: 'Envoyer le bilan' }).click();
  await expect(bilan).toBeVisible();
  await expect(bilan).toContainText('E-mail');

  // Un autre choix lève l'obligation et l'erreur affichée.
  await page.locator('#report-continue-a-voir').check();
  await expect(email).not.toHaveAttribute('required', /.*/);
  await expect(page.locator('#report-email-erreur')).toHaveText('');
  expect(network.pageErrors).toEqual([]);
});

test('pilote-bilan : la confirmation annonce la suite seulement après « oui »', async ({ page, network }) => {
  await page.goto('/pilote-bilan');
  const phrase = page.locator('#bilan-confirmation-prolonger');
  // Le bloc de confirmation est lui-même masqué avant l'envoi : on lit la propriété.
  await expect(phrase).toHaveJSProperty('hidden', true);
  await page.locator('#report-continue-oui').check();
  await expect(phrase).toHaveJSProperty('hidden', false);
  await page.locator('#report-continue-non').check();
  await expect(phrase).toHaveJSProperty('hidden', true);
  expect(network.pageErrors).toEqual([]);
});
