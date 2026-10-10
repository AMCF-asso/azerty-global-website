const { test, expect } = require('../helpers/local-site');

/**
 * Contrat de /bienvenue v2, arrivée du QR code des cartes de visite
 * (décisions d'Antoine, QCM du 2026-10-02).
 *
 * Ce que le test tient :
 *  - page non indexée, sans aucune mention de 30millions.fr (ZEVENT terminé) ;
 *  - au téléphone (390 × 844), le bouton « Recevoir le lien » est dans le
 *    premier écran et rien ne déborde ;
 *  - le formulaire refuse un e-mail vide, puis confirme un envoi réussi ;
 *  - un échec réseau garde l'e-mail saisi, affiche l'échec et réactive le bouton ;
 *  - la fiche contact est une vCard publique sans téléphone ;
 *  - un profil sans URL n'est pas affiché.
 *
 * Les suites v1 de la page (bienvenue.spec.js, bienvenue-native-input,
 * bienvenue-design, waitlist) ont été supprimées le 2026-10-10 ; le parcours
 * des autres pages v2 est dans parcours-v2.spec.js. zevent-follow-through.spec.js
 * décrit l'ancienne page et ne vaut plus pour elle.
 */

test.use({ viewport: { width: 390, height: 844 } });

test('page non indexée, neutre, formulaire dans le premier écran', async ({ page }) => {
  await page.goto('/bienvenue');
  await expect(page.locator('h1')).toHaveText('Les majuscules prennent l’accent');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  expect(await page.content()).not.toContain('30millions');

  const bouton = page.getByRole('button', { name: 'Recevoir le lien' });
  const boite = await bouton.boundingBox();
  expect(boite.y + boite.height).toBeLessThanOrEqual(844);

  const debordement = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(debordement).toBe(0);
});

test('« Recevoir le lien » : refus d’un e-mail vide, puis confirmation', async ({ page }) => {
  let envoi = null;
  await page.route('https://api.web3forms.com/submit', async (route) => {
    envoi = route.request().postData();
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
  });
  await page.goto('/bienvenue');

  await page.getByRole('button', { name: 'Recevoir le lien' }).click();
  await expect(page.locator('#lien-email-erreur')).toBeVisible();
  expect(envoi).toBeNull();

  await page.getByLabel('Recevoir le lien pour votre ordinateur').fill('visiteur@exemple.fr');
  await page.getByRole('button', { name: 'Recevoir le lien' }).click();
  await expect(page.locator('#lien-confirmation')).toBeVisible();
  expect(envoi).toContain('visiteur@exemple.fr');
});

test('« Recevoir le lien » : échec réseau, message d’échec, e-mail conservé, bouton réactivé', async ({ page, network }) => {
  // Même simulation que captcha.spec.js : hCaptcha et Web3Forms sont ceux du fixture.
  network.failWeb3FormsNetwork();
  await page.goto('/bienvenue', { waitUntil: 'load' });
  const form = page.locator('#formulaire-lien');
  const bouton = form.getByRole('button', { name: 'Recevoir le lien' });
  await form.locator('#lien-email').fill('visiteur@exemple.fr');
  await expect(form.locator('textarea[name="h-captcha-response"]')).toHaveCount(1);
  await bouton.click();

  await expect(page.locator('#lien-echec')).toBeVisible();
  await expect(page.locator('#lien-confirmation')).toBeHidden();
  await expect(form.locator('#lien-email')).toHaveValue('visiteur@exemple.fr');
  await expect(bouton).toBeEnabled();
  await expect(bouton).toHaveText('Recevoir le lien');
  expect(network.web3FormsRequests.filter((requete) => requete.method === 'POST')).toHaveLength(1);
});

test('fiche contact publique, sans téléphone, et profils renseignés seulement', async ({ page, request }) => {
  await page.goto('/bienvenue');
  const lien = page.getByRole('link', { name: 'Enregistrer mon contact' });
  const adresse = await lien.getAttribute('href');
  const reponse = await request.get(adresse);
  expect(reponse.ok()).toBeTruthy();
  const fiche = await reponse.text();
  expect(fiche).toMatch(/^BEGIN:VCARD\r\nVERSION:3\.0\r\n/);
  expect(fiche).toContain('FN:Antoine Olivier');
  expect(fiche).toContain('EMAIL;TYPE=INTERNET,WORK:contact@azerty.global');
  expect(fiche).not.toMatch(/^TEL/m);

  const termes = await page.locator('.bienvenue-liens dt').allTextContents();
  for (const terme of termes) {
    const lienProfil = page.locator('.bienvenue-liens div', { has: page.locator('dt', { hasText: terme }) }).locator('a');
    await expect(lienProfil).toHaveAttribute('href', /^(mailto:|https:\/\/)/);
  }
});
