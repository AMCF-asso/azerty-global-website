const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Contrat de la page /afrique v2 (décisions du 2026-09-11, nuit du 2026-09-13).
 *
 * Ce que le test tient :
 *  - les chiffres du héros sont ceux de data/afrique/index.json, jamais des
 *    littéraux (décision 26) ;
 *  - le fragment #cc/lang ouvre le pays et la langue (décision 15) ;
 *  - un clic sur la carte et un choix dans la liste rendent le même panneau,
 *    et la liste reste synchronisée (décisions 3 et 18) ;
 *  - jamais de panneau vide : la première langue est ouverte (décision 19) ;
 *  - une langue sans lettre hors ASCII dit « votre AZERTY suffit déjà »
 *    (décision 34), un caractère hors répertoire est montré « non
 *    saisissable » (décision 33), un pays sans fiche le dit (décision 7).
 *
 * Les pays et langues témoins sont lus dans les données, pas codés en dur :
 * si la curation change, le test suit.
 */

const racine = path.join(__dirname, '..', '..');
const index = JSON.parse(fs.readFileSync(path.join(racine, 'data', 'afrique', 'index.json'), 'utf8'));
const lire = (code) => JSON.parse(fs.readFileSync(path.join(racine, 'data', 'afrique', `${code.toLowerCase()}.json`), 'utf8'));

const paysAvecLettres = index.pays.find((p) => p.vedettes.length && lire(p.code).langues.some((l) => l.caracteres.length));
const langueSansLettre = index.langues.find((l) => l.nb === 0);
const paysSansLettre = index.pays.find((p) => p.langues.includes(langueSansLettre.id));
const paysSansFiche = index.pays.find((p) => !p.langues.length && !(p.horsPerimetre || []).length);
const paysNonLatin = index.pays.find((p) => (p.horsPerimetre || []).length);
const paysNonSaisissable = index.pays.find((p) => lire(p.code).langues.some((l) => (l.nonSaisissables || []).length));

test.describe('/afrique v2', () => {
  test('le héros porte les chiffres du générateur', async ({ page }) => {
    await page.goto('/afrique');
    const definition = (await page.locator('.hero-afrique__mesure').textContent()).replace(/\s+/g, ' ');
    expect(definition).toContain(`${index.meta.nbPays} pays`);
    expect(definition).toContain(`${index.meta.nbLangues} langues`);
    expect(definition).toContain(`${index.meta.nbCaracteres} caractères`);
    if (index.meta.saisissables) {
      expect(definition).toContain('tous saisissables');
    } else {
      expect(definition).toContain(`${index.meta.nbSaisissables} saisissables`);
      expect(definition).not.toContain('tous saisissables');
    }
    await expect(page).toHaveTitle(/Afrique francophone/);
    await expect(page.locator('h1')).not.toContainText('francophone');
    await expect(page.locator('#afrique-pays option')).toHaveCount(index.meta.nbPays + 1);
    await expect(page.locator('svg[data-carte-afrique]')).toHaveAttribute('aria-hidden', 'true');
  });

  test('le fragment ouvre le pays et la langue, la liste suit', async ({ page }) => {
    const fiche = lire(paysAvecLettres.code);
    const langue = fiche.langues.find((l) => l.caracteres.length && paysAvecLettres.vedettes.includes(l.id)) || fiche.langues.find((l) => l.caracteres.length);
    await page.goto(`/afrique#${paysAvecLettres.code.toLowerCase()}/${langue.id}`);
    await expect(page.locator('#afrique-panneau h2')).toHaveText(paysAvecLettres.nom);
    await expect(page.locator('.afrique-langue h3')).toHaveText(langue.nom);
    await expect(page.locator('.afrique-chip[aria-pressed="true"]')).toHaveText(langue.nom);
    await expect(page.locator('#afrique-pays')).toHaveValue(paysAvecLettres.code.toLowerCase());
    await expect(page.locator('.carte-afrique__pays--actif').first()).toBeVisible();
    const cellules = await page.locator('.syllabaire__cellule').count();
    expect(cellules).toBeGreaterThanOrEqual(langue.caracteres.length);
    await expect(page.locator('.syllabaire__glyphe').first()).toHaveCSS('font-family', /Andika/);
  });

  test('un clic sur la carte rend le panneau et écrit le fragment', async ({ page }) => {
    const code = paysAvecLettres.code.toLowerCase();
    await page.goto('/afrique');
    await page.locator(`.carte-afrique__pays[data-pays="${code}"], .carte-afrique__pastille-groupe[data-pays="${code}"]`).first().click();
    await expect(page.locator('#afrique-panneau h2')).toHaveText(paysAvecLettres.nom);
    await expect(page.locator('.afrique-chip')).toHaveCount(paysAvecLettres.vedettes.length);
    await expect(page.locator('.afrique-langue h3')).not.toBeEmpty();
    await expect(page).toHaveURL(new RegExp(`#${code}/`));
    await expect(page.locator('#afrique-pays')).toHaveValue(code);
    await expect(page.locator('.afrique-panneau__actions a')).toHaveCount(2);
  });

  test('une langue sans lettre hors ASCII dit que l’AZERTY suffit', async ({ page }) => {
    await page.goto('/afrique');
    await page.locator('#afrique-recherche').fill(paysSansLettre.nom);
    await expect(page.locator('#afrique-panneau h2')).toHaveText(paysSansLettre.nom);
    await page.locator(`.afrique-chip[data-langue="${langueSansLettre.id}"]`).click();
    await expect(page.locator('.afrique-langue__suffit')).toContainText('votre AZERTY suffit déjà');
    await expect(page.locator('.syllabaire')).toHaveCount(0);
  });

  test('un caractère hors répertoire est montré non saisissable', async ({ page }) => {
    test.skip(!paysNonSaisissable, 'tous les caractères sont saisissables');
    const fiche = lire(paysNonSaisissable.code);
    const langue = fiche.langues.find((l) => (l.nonSaisissables || []).length);
    await page.goto(`/afrique#${paysNonSaisissable.code.toLowerCase()}/${langue.id}`);
    await expect(page.locator('.syllabaire__bande--non-saisissable')).toHaveCount(1);
    await expect(page.locator('.syllabaire__cellule--non-saisissable')).toHaveCount(langue.nonSaisissables.length);
  });

  test('un pays sans fiche et un pays hors périmètre le disent', async ({ page }) => {
    await page.goto('/afrique');
    if (paysSansFiche) {
      await page.locator('#afrique-recherche').fill(paysSansFiche.nom);
      await expect(page.locator('#afrique-panneau h2')).toHaveText(paysSansFiche.nom);
      await expect(page.locator('#afrique-panneau')).toContainText('Aucune langue à fiche');
    }
    await page.locator('#afrique-recherche').fill(paysNonLatin.nom);
    await expect(page.locator('#afrique-panneau h2')).toHaveText(paysNonLatin.nom);
    await expect(page.locator('.afrique-panneau__meta').first()).toContainText('hors du périmètre');
  });

  test('la bulle ne montre que le nom et disparaît au clic', async ({ page }) => {
    const code = paysAvecLettres.code.toLowerCase();
    await page.goto('/afrique');
    await page.locator(`.carte-afrique__pays[data-pays="${code}"]`).first().hover();
    const bulle = page.locator('[data-afrique-bulle]');
    await expect(bulle).toBeVisible();
    await expect(bulle).toHaveText(paysAvecLettres.nom);
    await page.locator(`.carte-afrique__pays[data-pays="${code}"]`).first().click();
    await expect(bulle).toBeHidden();
  });

  test('la recherche exacte ouvre le pays', async ({ page }) => {
    await page.goto('/afrique');
    await page.locator('#afrique-recherche').fill(paysAvecLettres.nom);
    await expect(page.locator('#afrique-panneau h2')).toHaveText(paysAvecLettres.nom);
    await expect(page.locator('#afrique-pays')).toHaveValue(paysAvecLettres.code.toLowerCase());
  });
});
