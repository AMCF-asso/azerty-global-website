const { test, expect } = require('../helpers/local-site');

// /autocollants-claviers (boutique.md § 4). L'API /api/demandes est le Worker
// workers/demandes, testé à part sous Miniflare (npm test dans son dossier) ;
// ici elle est simulée, page par page. Aucun envoi réel.

async function simulerApi(page, { reponse = { status: 200, body: { ok: true } }, compte = { total: null, seuil: 200 } } = {}) {
  const envois = [];
  await page.route('**/api/demandes/compte', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(compte)
  }));
  await page.route('**/api/demandes', route => {
    envois.push(route.request());
    return route.fulfill({ status: reponse.status, contentType: 'application/json', body: JSON.stringify(reponse.body) });
  });
  return envois;
}

async function remplirObligatoires(page) {
  await page.locator('#email').fill('test@example.org');
  await page.locator('#pays').selectOption('SN');
  await page.locator('#consentement').check();
}

test('autocollants-claviers : au moins un produit exigé, puis envoi vers /api/demandes avec la page d’origine', async ({ page }) => {
  const envois = await simulerApi(page);
  await page.goto('/autocollants-claviers?depuis=/download#formulaire', { waitUntil: 'load' });

  await remplirObligatoires(page);
  await page.getByRole('button', { name: 'Me prévenir' }).click();
  const bilan = page.locator('#formulaire-demandes .formulaire__bilan');
  await expect(bilan).toBeVisible();
  await expect(bilan).toContainText('Cochez au moins un des deux choix.');
  expect(envois).toHaveLength(0);

  await page.locator('label[for="p-clavier"]').click();
  await page.locator('label.ac-couleur', { hasText: 'Blanches' }).click();
  await page.locator('#postes').fill('30');
  await page.getByRole('button', { name: 'Me prévenir' }).click();

  await expect(page.locator('#demandes-confirmation')).toBeVisible();
  await expect(page.locator('#demandes-confirmation')).toBeFocused();
  await expect(page.locator('#formulaire-demandes')).toBeHidden();
  expect(envois).toHaveLength(1);
  const donnees = new URLSearchParams();
  const corps = envois[0].postDataBuffer().toString('latin1');
  // multipart/form-data : on relit les champs nommés.
  for (const [, nom, valeur] of corps.matchAll(/name="([^"]+)"\r\n\r\n([^\r]*)\r\n/g)) donnees.append(nom, valeur);
  expect(donnees.getAll('produits')).toEqual(['clavier']);
  expect(donnees.get('pays')).toBe('SN');
  expect(donnees.get('page')).toBe('/download');
  expect(donnees.get('couleur_touches')).toBe('blanches');
  expect(donnees.get('postes')).toBe('30');
  expect(donnees.get('consentement')).toBe('oui');
  expect(donnees.get('site_web')).toBe('');
  expect(donnees.has('h-captcha-response')).toBe(false);
});

test('autocollants-claviers : refus du Worker (ok:false) → bloc d’échec, formulaire conservé', async ({ page }) => {
  await simulerApi(page, { reponse: { status: 429, body: { ok: false, erreur: 'trop-de-demandes' } } });
  await page.goto('/autocollants-claviers', { waitUntil: 'load' });
  await page.locator('label[for="p-autocollants"]').click();
  await remplirObligatoires(page);
  await page.getByRole('button', { name: 'Me prévenir' }).click();
  await expect(page.locator('#demandes-echec')).toBeVisible();
  await expect(page.locator('#formulaire-demandes')).toBeVisible();
  await expect(page.locator('#email')).toHaveValue('test@example.org');
});

test('autocollants-claviers : ?produit=clavier précoche la carte, les boutons du héros aussi', async ({ page }) => {
  await simulerApi(page);
  await page.goto('/autocollants-claviers?produit=clavier', { waitUntil: 'load' });
  await expect(page.locator('#p-clavier')).toBeChecked();
  await expect(page.locator('#p-autocollants')).not.toBeChecked();
  await page.getByRole('link', { name: 'Je veux des autocollants' }).click();
  await expect(page.locator('#p-autocollants')).toBeChecked();
});

test('autocollants-claviers : compteur caché sous le seuil, affiché au-delà', async ({ page }) => {
  await simulerApi(page);
  await page.goto('/autocollants-claviers', { waitUntil: 'load' });
  await expect(page.locator('#demandes-compteur')).toHaveText('Le nombre de demandes s’affichera ici à partir de 200.');

  await page.unrouteAll();
  await simulerApi(page, { compte: { total: 1234, seuil: 200 } });
  await page.reload({ waitUntil: 'load' });
  await expect(page.locator('#demandes-compteur .ac-compteur__total')).toHaveText(/1\s?234/);
});

test('autocollants-claviers : retour sans JS par fragment (#envoi-ok) affiché par :target', async ({ page }) => {
  await simulerApi(page);
  await page.goto('/autocollants-claviers#envoi-ok', { waitUntil: 'load' });
  await expect(page.locator('#envoi-ok')).toBeVisible();
  await expect(page.locator('#envoi-erreur')).toBeHidden();
});

test('contact : le motif « autocollants » renvoie vers le formulaire dédié', async ({ page }) => {
  await page.goto('/contact', { waitUntil: 'load' });
  const renvoi = page.locator('[data-motifs="autocollants"]');
  await expect(renvoi).toBeHidden();
  await page.locator('#motif').selectOption('autocollants');
  await expect(renvoi).toBeVisible();
  await expect(renvoi.getByRole('link', { name: 'autocollants et claviers' }))
    .toHaveAttribute('href', '/autocollants-claviers?depuis=/contact#formulaire');
});
