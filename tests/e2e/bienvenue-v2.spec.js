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
 *  - la fiche contact est une vCard publique sans téléphone ;
 *  - un profil sans URL n'est pas affiché.
 *
 * Les tests v1 de la page (bienvenue*.spec.js, waitlist, traffic-v15,
 * zevent-follow-through) décrivent l'ancienne page et ne valent plus pour elle.
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
