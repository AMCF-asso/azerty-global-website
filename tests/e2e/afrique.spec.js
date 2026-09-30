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
const paysNonLatin = index.pays.find((p) => (p.horsPerimetre || []).length && p.langues.length);
const paysSansLatin = index.pays.find((p) => (p.horsPerimetre || []).length && !p.langues.length);
const paysNonSaisissable = index.pays.find((p) => lire(p.code).langues.some((l) => (l.nonSaisissables || []).length));

test.describe('/afrique v2', () => {
  test('le héros porte les chiffres du générateur', async ({ page }) => {
    await page.goto('/afrique');
    // Le héros ne cite plus que pays et langues depuis 5625452 (textes v2 clarifiés).
    const definition = (await page.locator('.hero-afrique__mesure').textContent()).replace(/\s+/g, ' ');
    expect(definition).toContain(`${index.meta.nbPays} pays`);
    expect(definition).toContain(`${index.meta.nbLangues} langues`);
    expect(definition).not.toContain('tous saisissables');
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
    // Télécharger, touches mortes, testeur (A328, QCM du 2026-09-30).
    await expect(page.locator('.afrique-panneau__actions a')).toHaveCount(3);
    await expect(page.locator('.afrique-panneau__actions a[href="/testeur"]')).toHaveText('Essayer en ligne');
  });

  test('choisir un pays amène sa fiche à l’écran et y met le focus', async ({ page }) => {
    // A050 : la fiche s'ouvre sous la carte ; mouvement réduit pour un défilement instantané.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1280, height: 900 });
    const code = paysAvecLettres.code.toLowerCase();
    await page.goto('/afrique');
    await page.locator(`.carte-afrique__pays[data-pays="${code}"], .carte-afrique__pastille-groupe[data-pays="${code}"]`).first().click();
    const titre = page.locator('#afrique-panneau h2');
    await expect(titre).toHaveText(paysAvecLettres.nom);
    await expect(titre).toBeFocused();
    const haut = await titre.evaluate((h) => h.getBoundingClientRect().top);
    expect(haut).toBeGreaterThanOrEqual(0);
    expect(haut).toBeLessThan(900 / 2);
  });

  test('au clavier, une suggestion ouvre la fiche et y met le focus', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/afrique');
    // Préfixe commun à plusieurs pays : un seul résultat ouvrirait le pays à la frappe.
    await page.locator('#afrique-recherche').fill('Guin');
    await page.locator('#afrique-recherche').press('ArrowDown');
    await expect(page.locator('#afrique-pays-options button:focus')).toBeVisible();
    const choisi = await page.locator('#afrique-pays-options button:focus').textContent();
    await page.keyboard.press('Enter');
    await expect(page.locator('#afrique-panneau h2')).toHaveText(choisi);
    await expect(page.locator('#afrique-panneau h2')).toBeFocused();
  });

  test('les étiquettes des îles font 14 px dès 768 px et disparaissent dessous', async ({ page }) => {
    // A190 : taille réglée par js/v2/afrique.js sur la largeur réelle de la carte.
    for (const largeur of [768, 1024, 1280]) {
      await page.setViewportSize({ width: largeur, height: 900 });
      await page.goto('/afrique');
      const rendu = await page.locator('svg[data-carte-afrique]').evaluate((svg) => {
        const t = svg.querySelector('.carte-afrique__etiquette');
        const echelle = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
        return parseFloat(getComputedStyle(t).fontSize) * echelle;
      });
      expect(rendu).toBeGreaterThanOrEqual(14);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/afrique');
    await expect(page.locator('.carte-afrique__etiquette').first()).toBeHidden();
  });

  test('chaque variété de peul a son pays (a09d003 adapté)', async ({ page }) => {
    const ids = (code) => lire(code).langues.map((l) => l.id);
    expect(ids('GN')).toContain('fuf');
    expect(ids('GN')).not.toContain('fuc');
    expect(ids('CM')).toContain('fub');
    expect(ids('CM')).not.toContain('fuc');
    await page.goto('/afrique#gn/fuf');
    await expect(page.locator('.afrique-langue h3')).toHaveText('Pular (peul Guinée)');
    await expect(page.locator('.afrique-note-provisoire')).toContainText('Alphabet à confirmer');
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
    // Nom en clair plutôt que « Non disponible » (critique du 2026-09-30).
    await expect(page.locator('.syllabaire__cellule--non-saisissable .syllabaire__nom').first()).not.toBeEmpty();
    await expect(page.locator('.syllabaire__bande--non-saisissable')).not.toContainText('Non disponible');
  });

  test('un pays sans fiche et un pays hors périmètre le disent', async ({ page }) => {
    await page.goto('/afrique');
    if (paysSansFiche) {
      await page.locator('#afrique-recherche').fill(paysSansFiche.nom);
      await expect(page.locator('#afrique-panneau h2')).toHaveText(paysSansFiche.nom);
      await expect(page.locator('#afrique-panneau')).toContainText('ne sont pas encore documentés');
    }
    await page.locator('#afrique-recherche').fill(paysNonLatin.nom);
    await expect(page.locator('#afrique-panneau h2')).toHaveText(paysNonLatin.nom);
    await expect(page.locator('.afrique-panneau__meta').first()).toContainText('un autre clavier');
    await expect(page.locator('.afrique-panneau__meta').first()).toContainText('Voici les langues du pays');
  });

  test('un pays sans fiche latine propose ses voisins, sans « Télécharger »', async ({ page }) => {
    test.skip(!paysSansLatin, 'chaque pays a au moins une fiche latine');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/afrique#${paysSansLatin.code.toLowerCase()}`);
    await expect(page.locator('.afrique-panneau__hors')).toContainText('un autre clavier');
    await expect(page.locator('#afrique-panneau')).not.toContainText('(arabe)');
    await expect(page.locator('.afrique-panneau__actions')).toHaveCount(0);
    const voisin = page.locator('.afrique-voisins button').first();
    await expect(voisin).toBeVisible();
    const nom = await voisin.textContent();
    await voisin.click();
    await expect(page.locator('#afrique-panneau h2')).toHaveText(nom);
  });

  test('la recherche ignore les accents, connaît les alias et garde la liste si plusieurs pays', async ({ page }) => {
    await page.goto('/afrique');
    const champ = page.locator('#afrique-recherche');
    await champ.fill('senegal');
    await expect(page.locator('#afrique-panneau h2')).toHaveText('Sénégal');
    await champ.fill('RDC');
    await expect(page.locator('#afrique-panneau h2')).toHaveText('République démocratique du Congo');
    await champ.fill('Niger');
    await expect(page.locator('#afrique-pays-options button:not([hidden])')).toHaveText(['Niger', 'Nigeria']);
    await champ.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#afrique-pays-options button:focus')).toHaveText('Nigeria');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(champ).toBeFocused();
    await champ.fill('xyz');
    await expect(page.locator('[data-afrique-recherche-statut]')).toContainText('Aucun pays ne correspond');
  });

  test('l’annonce est une phrase courte, pas la fiche entière', async ({ page }) => {
    await page.goto('/afrique');
    await expect(page.locator('#afrique-panneau')).not.toHaveAttribute('aria-live', /.+/);
    await page.locator('#afrique-recherche').fill(paysAvecLettres.nom);
    await expect(page.locator('[data-afrique-annonce]')).toContainText(paysAvecLettres.nom);
    await expect(page.locator('[data-afrique-annonce]')).toContainText('Fiche ');
  });

  test('sous 768 px, chaque petit État et chaque île offre une cible d’au moins 24 px', async ({ page }) => {
    for (const taille of [{ width: 320, height: 700 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(taille);
      await page.goto('/afrique');
      const tailles = await page.locator('.carte-afrique__zone').evaluateAll((zs) => zs.map((z) => z.getBoundingClientRect().width));
      expect(tailles.length).toBeGreaterThan(0);
      for (const t of tailles) expect(t).toBeGreaterThanOrEqual(24);
    }
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

  test('les suggestions restent ancrées sous le champ', async ({ page }) => {
    await page.goto('/afrique');
    await page.locator('#afrique-recherche').fill('gui');
    const liste = page.locator('#afrique-pays-options');
    await expect(liste).toBeVisible();
    const positions = await page.locator('.afrique-liste').evaluate((bloc) => {
      const champ = bloc.querySelector('input').getBoundingClientRect();
      const suggestions = bloc.querySelector('[role="listbox"]').getBoundingClientRect();
      return { basChamp: champ.bottom, hautSuggestions: suggestions.top };
    });
    expect(positions.hautSuggestions).toBeGreaterThanOrEqual(positions.basChamp);
  });
});
