const { test, expect } = require('@playwright/test');

/**
 * Contrat d'historique de la modale du testeur (audit UX 2026-08-15, point
 * « pushState sur la modale d'accueil »).
 *
 * Le témoin n'est valable que si la première navigation est une VRAIE page
 * précédente : sans elle, `goBack()` sur une pile vide ne fait rien et le test
 * passerait aussi sur l'ancien code. Ici, avant le correctif, le Retour
 * quittait /index.html pour /guide.html modale ouverte.
 */

const modal = '#tester-modal';
const openBtn = '#open-tester-btn';
const closeBtn = '.tester-modal__close';

async function landOnHomeWithHistory(page) {
  await page.goto('/guide.html');
  await page.goto('/index.html');
}

test('Retour ferme la modale sans quitter la page', async ({ page }) => {
  await landOnHomeWithHistory(page);

  await page.locator(openBtn).click();
  await expect(page.locator(modal)).toBeVisible();

  await page.goBack();

  await expect(page.locator(modal)).toBeHidden();
  expect(new URL(page.url()).pathname).toBe('/index.html');
});

test('la croix rembobine l’entrée poussée : un seul Retour quitte la page', async ({ page }) => {
  await landOnHomeWithHistory(page);

  await page.locator(openBtn).click();
  await expect(page.locator(modal)).toBeVisible();
  await page.locator(closeBtn).click();
  await expect(page.locator(modal)).toBeHidden();

  await page.goBack();

  expect(new URL(page.url()).pathname).toBe('/guide.html');
});

test('Échap rembobine aussi l’entrée poussée', async ({ page }) => {
  await landOnHomeWithHistory(page);

  await page.locator(openBtn).click();
  await expect(page.locator(modal)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator(modal)).toBeHidden();

  await page.goBack();

  expect(new URL(page.url()).pathname).toBe('/guide.html');
});

test('ouvrir puis fermer deux fois ne laisse aucune entrée morte', async ({ page }) => {
  await landOnHomeWithHistory(page);

  for (let i = 0; i < 2; i += 1) {
    await page.locator(openBtn).click();
    await expect(page.locator(modal)).toBeVisible();
    await page.locator(closeBtn).click();
    await expect(page.locator(modal)).toBeHidden();
  }

  await page.goBack();

  expect(new URL(page.url()).pathname).toBe('/guide.html');
});

test('?mode=lessons ouvre la modale sans coûter un Retour supplémentaire', async ({ page }) => {
  await page.goto('/guide.html');
  await page.goto('/index.html?mode=lessons');
  await expect(page.locator(modal)).toBeVisible();

  await page.goBack();

  expect(new URL(page.url()).pathname).toBe('/guide.html');
});
