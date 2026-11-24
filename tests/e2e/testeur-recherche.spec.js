/* Testeur v2 — la vue « Chercher un caractère » de /testeur (lot 3, 2026-11-12).

   Un champ, 20 résultats au plus, le premier choisi d'office, et le clavier de
   la page qui s'allume pour le résultat choisi (en deux temps pour une touche
   morte). Les attentes de texte sont écrites en dur : « œ : AltGr + O. » avec
   l'espace fine insécable U+202F devant les deux-points, que `moteur.ligneGeste`
   n'écrit pas (il met une espace ordinaire) ; la vue recompose la ligne.
   Les gestes des listes (wolof, résultats) se comparent à ceux du moteur, qui
   reste la seule source des touches. */

const { test, expect } = require('../helpers/local-site');

const FINE = ' ';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'platform', { configurable: true, get: () => 'Win32' });
  });
});

test.afterEach(async ({ network }) => {
  expect(network.pageErrors).toEqual([]);
  expect(network.consoleErrors).toEqual([]);
  expect(network.cspViolations).toEqual([]);
});

const racine = (page) => page.locator('#testeur');
const montage = (page) => page.locator('[data-montage="recherche"]');
const champ = (page) => page.getByRole('searchbox', { name: 'Chercher un caractère' });
const options = (page) => page.locator('[data-montage="recherche"] [role="option"]');
const choisie = (page) => page.locator('[data-montage="recherche"] [role="option"][aria-selected="true"]');
const geste = (page) => page.locator('.tr__geste');

async function ouvrir(page, requete = '?vue=recherche') {
  await page.goto(`/testeur.html${requete}`, { waitUntil: 'domcontentloaded' });
  await expect(racine(page)).toHaveAttribute('data-ready', 'true');
}

async function ouvrirRecherche(page) {
  await ouvrir(page);
  await expect(montage(page)).toHaveAttribute('data-pret', 'true');
  await expect(champ(page)).toBeVisible();
}

/* Le texte exact d'un élément (textContent), sans la normalisation des
   espaces de `toHaveText` : U+202F compte. */
const texteExact = (locator) => locator.evaluate((n) => n.textContent);

/* Les touches allumées : positions, puis modificateurs. */
const touches = (page) => page.evaluate(() => Array.from(document.querySelectorAll('[data-attendue]'), (t) => t.dataset.position).sort());
const modificateurs = (page) => page.evaluate(() => Array.from(document.querySelectorAll('[data-mod-attendu]'), (t) => t.dataset.mod).sort());

/* Les positions que le moteur dit pour un caractère, au temps donné. */
const positionsMoteur = (page, caractere, temps = 1) => page.evaluate(([c, t]) => {
  const g = window.Testeur.moteur.trouverGeste(c);
  if (g.direct) return [g.direct.position];
  return [t === 1 ? g.sequence.morte.position : g.sequence.base.position];
}, [caractere, temps]);

const premierCaractere = async (option) => (await option.getAttribute('aria-label')).split(', ')[0];

test('« œ » : premier résultat œ, ligne de geste exacte, touches allumées', async ({ page }) => {
  await ouvrirRecherche(page);
  await champ(page).fill('œ');
  await expect(choisie(page)).toHaveCount(1);
  expect(await premierCaractere(options(page).first())).toBe('œ');
  await expect(options(page).first()).toHaveAttribute('aria-selected', 'true');
  await expect(champ(page)).toHaveAttribute('aria-activedescendant', 'tr-o-0');
  expect(await texteExact(geste(page))).toBe(`œ${FINE}: AltGr + O.`);

  const position = await page.evaluate(() => window.Testeur.moteur.positionParCode.KeyO);
  await expect(page.locator(`[data-position="${position}"]`)).toHaveAttribute('data-attendue', '');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  await expect(page.locator('[data-mod^="altgr"][data-mod-attendu]').first()).toBeVisible();
  await expect(page.locator('[data-mod^="maj"][data-mod-attendu], [data-mod^="verrmaj"][data-mod-attendu]')).toHaveCount(0);
  /* Le focus reste dans le champ. */
  await expect(champ(page)).toBeFocused();
});

test('« e dans l’o » (apostrophe droite et courbe) trouve œ', async ({ page }) => {
  await ouvrirRecherche(page);
  for (const requete of ['e dans l\'o', 'e dans l’o']) {
    await champ(page).fill(requete);
    await expect(options(page).first()).toBeVisible();
    await expect(page.locator('[data-montage="recherche"] [role="option"][aria-label^="œ, "]'), requete).toHaveCount(1);
    expect(await premierCaractere(options(page).first()), requete).toMatch(/^[œŒ]$/);
  }
});

test('« wolof » : les lettres du wolof, chacune avec son geste', async ({ page }) => {
  await ouvrirRecherche(page);
  /* De vraies frappes : elles passent par le composant, qui ne doit éteindre
     ni les touches allumées ni le champ. */
  await champ(page).click();
  await champ(page).pressSequentially('wolof');
  await expect(options(page)).toHaveCount(14);
  const lettres = await options(page).evaluateAll((liste) => liste.map((o) => o.getAttribute('aria-label').split(', ')[0]));
  for (const l of ['ŋ', 'Ŋ', 'ñ', 'ë', 'é', 'À']) expect(lettres).toContain(l);

  /* Chaque ligne montre le geste du moteur, ni plus ni moins. */
  const ecarts = await page.evaluate(() => {
    const m = window.Testeur.moteur;
    return Array.from(document.querySelectorAll('[data-montage="recherche"] [role="option"]'), (o) => {
      const c = o.getAttribute('aria-label').split(', ')[0];
      const attendu = m.ligneGeste(c).slice(c.length + 3, -1);
      return o.querySelector('.tr__chemin').textContent === attendu ? null : [c, o.querySelector('.tr__chemin').textContent, attendu];
    }).filter(Boolean);
  });
  expect(ecarts).toEqual([]);

  await expect(page.locator('[data-attendue]').first()).toBeVisible();
  await expect(page.locator('[data-appuyee]')).toHaveCount(0);
  await expect(champ(page)).toBeFocused();
});

test('un nom de signe : « guillemet » trouve les guillemets et allume leur touche', async ({ page }) => {
  await ouvrirRecherche(page);
  await champ(page).fill('guillemet');
  await expect(options(page).first()).toBeVisible();
  expect((await options(page).first().innerText()).toLowerCase()).toContain('guillemet');
  const c = await premierCaractere(choisie(page));
  expect(await texteExact(geste(page))).toBe(`${c}${FINE}: ${(await page.evaluate((car) => window.Testeur.moteur.ligneGeste(car), c)).slice(c.length + 3)}`);
  expect(await touches(page)).toEqual(await positionsMoteur(page, c));
});

test('« U+00C9 » trouve É', async ({ page }) => {
  await ouvrirRecherche(page);
  await champ(page).fill('U+00C9');
  await expect(options(page).first()).toBeVisible();
  expect(await premierCaractere(options(page).first())).toBe('É');
  expect(await texteExact(geste(page))).toBe(`É${FINE}: Verr. Maj., puis é.`);
  await expect(page.locator('[data-mod="verrmaj"]')).toHaveAttribute('data-mod-attendu', '');
});

test('touche morte : « Ê » en deux temps, deux segments, le clic sur le second allume le second temps', async ({ page }) => {
  await ouvrirRecherche(page);
  await champ(page).fill('Ê');
  await expect(options(page).first()).toBeVisible();
  expect(await premierCaractere(options(page).first())).toBe('Ê');
  expect(await texteExact(geste(page))).toBe(`Ê${FINE}: ^, puis Maj + E.`);

  const segments = page.locator('.tr__geste button');
  await expect(segments).toHaveCount(2);
  await expect(segments.nth(0)).toHaveText('^');
  await expect(segments.nth(1)).toHaveText('Maj + E');
  /* Le premier temps est allumé d'office, et marqué. */
  await expect(segments.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(segments.nth(1)).toHaveAttribute('aria-pressed', 'false');
  const morte = await positionsMoteur(page, 'Ê', 1);
  const lettre = await positionsMoteur(page, 'Ê', 2);
  expect(morte).not.toEqual(lettre);
  expect(await touches(page)).toEqual(morte);
  expect(await modificateurs(page)).toEqual([]);

  await segments.nth(1).click();
  await expect(segments.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(segments.nth(0)).toHaveAttribute('aria-pressed', 'false');
  expect(await touches(page)).toEqual(lettre);
  await expect(page.locator('[data-mod^="maj"][data-mod-attendu]').first()).toBeVisible();
  /* Revenir au premier temps. */
  await segments.nth(0).click();
  expect(await touches(page)).toEqual(morte);
  /* Le champ garde le focus : on peut continuer à taper. */
  await expect(champ(page)).toBeFocused();
});

test('flèche bas et flèche haut changent le résultat choisi et les touches allumées', async ({ page }) => {
  await ouvrirRecherche(page);
  await champ(page).fill('guillemet');
  await expect(options(page).nth(1)).toBeVisible();
  const premier = await premierCaractere(options(page).nth(0));
  const second = await premierCaractere(options(page).nth(1));
  expect(second).not.toBe(premier);
  expect(await touches(page)).toEqual(await positionsMoteur(page, premier));

  await champ(page).press('ArrowDown');
  await expect(options(page).nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(options(page).nth(0)).toHaveAttribute('aria-selected', 'false');
  await expect(champ(page)).toHaveAttribute('aria-activedescendant', 'tr-o-1');
  await expect(champ(page)).toBeFocused();
  expect(await touches(page)).toEqual(await positionsMoteur(page, second));
  expect((await texteExact(geste(page))).startsWith(second + FINE)).toBe(true);

  await champ(page).press('ArrowUp');
  await expect(options(page).nth(0)).toHaveAttribute('aria-selected', 'true');
  expect(await touches(page)).toEqual(await positionsMoteur(page, premier));
  /* Une flèche haut sur le premier reste sur le premier. */
  await champ(page).press('ArrowUp');
  await expect(options(page).nth(0)).toHaveAttribute('aria-selected', 'true');

  /* Le clic et le survol choisissent aussi, sans prendre le focus. */
  await options(page).nth(1).click();
  await expect(options(page).nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(champ(page)).toBeFocused();
  const boite = await options(page).nth(0).boundingBox();
  await page.mouse.move(boite.x + 10, boite.y + 10);
  await page.mouse.move(boite.x + 14, boite.y + 12);
  await expect(options(page).nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(champ(page)).toBeFocused();
});

test('champ vide : trois exemples cliquables ; un clic lance la recherche, vider les rend', async ({ page }) => {
  await ouvrirRecherche(page);
  const exemples = page.locator('.tr__exemples');
  await expect(exemples).toBeVisible();
  await expect(exemples).toHaveText('Par exemple :œguillemetwolof');
  for (const nom of ['œ', 'guillemet', 'wolof']) {
    const boite = await page.getByRole('button', { name: nom, exact: true }).boundingBox();
    expect(boite.height).toBeGreaterThanOrEqual(44);
    expect(boite.width).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: 'wolof', exact: true }).click();
  await expect(champ(page)).toHaveValue('wolof');
  await expect(champ(page)).toBeFocused();
  await expect(exemples).toBeHidden();
  expect(await options(page).count()).toBeGreaterThan(3);
  await expect(options(page).nth(0)).toHaveAttribute('aria-selected', 'true');

  await champ(page).fill('');
  await expect(exemples).toBeVisible();
});

test('Entrée garde le choix ; le résultat choisi reste au-dessus du fondu ; la liste n’est pas un arrêt de Tab', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 641 });
  await ouvrirRecherche(page);
  await champ(page).click();
  await champ(page).pressSequentially('wolof');
  await expect(options(page).nth(0)).toHaveAttribute('aria-selected', 'true');
  const nombre = await options(page).count();
  for (let i = 1; i < nombre; i += 1) {
    await page.keyboard.press('ArrowDown');
    await expect(options(page).nth(i)).toHaveAttribute('aria-selected', 'true');
    const ecart = await page.evaluate((rang) => {
      const liste = document.querySelector('.tr__liste');
      const fondu = parseFloat(getComputedStyle(liste).paddingBottom);
      const o = liste.children[rang].getBoundingClientRect();
      return liste.getBoundingClientRect().bottom - fondu - o.bottom;
    }, i);
    expect(ecart, `résultat ${i} au-dessus du fondu`).toBeGreaterThanOrEqual(-0.5);
  }
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await expect(options(page).nth(nombre - 3)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.tr__liste')).toHaveAttribute('tabindex', '-1');
});

test('aucun résultat : le message, annoncé ; champ vidé : touches éteintes', async ({ page }) => {
  await ouvrirRecherche(page);
  const message = 'Aucun caractère trouvé. Essayez un autre nom, ou collez le caractère.';
  await champ(page).fill('œ');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);

  await champ(page).fill('zzzzqx');
  await expect(page.locator('.tr__aucun')).toBeVisible();
  await expect(page.locator('.tr__aucun')).toHaveText(message);
  await expect(page.locator('[role="listbox"]')).toBeHidden();
  await expect(page.locator('[data-annonce]')).toHaveText(message);
  await expect(page.locator('[data-attendue]')).toHaveCount(0);
  await expect(champ(page)).not.toHaveAttribute('aria-activedescendant', /.*/);

  /* Un résultat revient, puis le champ est vidé : plus rien n'est allumé. */
  await champ(page).fill('œ');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  await expect(page.locator('.tr__aucun')).toBeHidden();
  await champ(page).fill('');
  await expect(page.locator('[data-attendue]')).toHaveCount(0);
  await expect(page.locator('[data-mod-attendu]')).toHaveCount(0);
  await expect(options(page)).toHaveCount(0);
  await expect(page.locator('.tr__aucun')).toBeHidden();
  /* La place de la ligne de geste reste réservée (elle est vide, mais là). */
  expect(await texteExact(geste(page))).toBe('');
  expect((await geste(page).boundingBox()).height).toBeGreaterThan(20);
});

test('les deux fichiers de données : pas demandés à l’arrivée, demandés à l’ouverture de la vue', async ({ page }) => {
  const vus = [];
  page.on('request', (requete) => {
    if (/\/tester\/(character-index|language-search)\.json/.test(requete.url())) vus.push(new URL(requete.url()).pathname);
  });
  await ouvrir(page, '');
  await page.waitForLoadState('networkidle');
  expect(vus).toEqual([]);

  await page.getByRole('button', { name: 'Chercher un caractère' }).click();
  await expect(montage(page)).toHaveAttribute('data-pret', 'true');
  await expect.poll(() => [...vus].sort()).toEqual(['/tester/character-index.json', '/tester/language-search.json']);
  await champ(page).fill('œ');
  await expect(options(page).first()).toBeVisible();

  /* Revenir, ressortir : pas de seconde demande. */
  await page.getByRole('button', { name: 'Revenir au parcours' }).click();
  await page.getByRole('button', { name: 'Chercher un caractère' }).click();
  await page.waitForTimeout(200);
  expect(vus).toHaveLength(2);
});

test('chargement en échec : le message, puis une nouvelle tentative au retour dans la vue', async ({ page, network }) => {
  await page.route('**/tester/character-index.json', (route) => route.fulfill({ status: 500, body: '' }));
  await ouvrir(page, '');
  await page.getByRole('button', { name: 'Chercher un caractère' }).click();
  const erreur = page.locator('.tr__erreur');
  await expect(erreur).toBeVisible();
  await expect(erreur).toHaveText('La recherche n’a pas pu se charger. Rechargez la page.');
  await expect(erreur).toHaveClass(/\bmessage\b/);
  await expect(champ(page)).toBeHidden();
  /* La réponse 500 est journalisée par le navigateur : ce n'est pas une
     régression (même précaution que testeur-vues.spec.js). */
  network.consoleErrors.length = 0;

  await page.unroute('**/tester/character-index.json');
  await page.getByRole('button', { name: 'Revenir au parcours' }).click();
  await page.getByRole('button', { name: 'Chercher un caractère' }).click();
  await expect(champ(page)).toBeVisible();
  await expect(erreur).toBeHidden();
  await champ(page).fill('œ');
  await expect(options(page).first()).toBeVisible();
});

test('aucune erreur console : taper, flèches, segment, vider, changer de vue', async ({ page, network }) => {
  await ouvrirRecherche(page);
  await champ(page).click();
  await champ(page).pressSequentially('ê');
  await expect(options(page).first()).toBeVisible();
  await champ(page).press('ArrowDown');
  await champ(page).press('ArrowUp');
  const segments = page.locator('.tr__geste button');
  if (await segments.count()) await segments.nth(1).click();
  await champ(page).fill('');
  await champ(page).fill('wolof');
  await expect(options(page).first()).toBeVisible();
  await page.getByRole('button', { name: 'Taper librement' }).click();
  await page.getByRole('button', { name: 'Chercher un caractère' }).click();
  await expect(montage(page)).toHaveAttribute('data-pret', 'true');
  expect(network.pageErrors).toEqual([]);
  expect(network.consoleErrors).toEqual([]);
  expect(network.cspViolations).toEqual([]);
});

test('sortir éteint les touches ; la requête est gardée au retour, avec le champ en focus', async ({ page }) => {
  await ouvrirRecherche(page);
  await champ(page).fill('œ');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Revenir au parcours' }).click();
  await expect(montage(page)).not.toHaveAttribute('data-pret', 'true');
  /* Dans le parcours, une seule touche est attendue (la consigne), pas celle de œ. */
  const position = await page.evaluate(() => window.Testeur.moteur.positionParCode.KeyO);
  await expect(page.locator(`[data-position="${position}"][data-attendue]`)).toHaveCount(0);

  await page.getByRole('button', { name: 'Chercher un caractère' }).click();
  await expect(champ(page)).toHaveValue('œ');
  await expect(champ(page)).toBeFocused();
  await expect(page.locator(`[data-position="${position}"]`)).toHaveAttribute('data-attendue', '');
});

test('caractères invisibles : case pointillée, jamais ␣ ; marque seule posée sur ◌', async ({ page }) => {
  await ouvrirRecherche(page);
  await champ(page).fill('U+202F');
  await expect(options(page).first()).toBeVisible();
  await expect(options(page).first().locator('.tr__car--vide')).toHaveCount(1);
  await expect(geste(page).locator('.tr__car--vide')).toHaveCount(1);
  const nom = await geste(page).locator('.tr__car--vide').getAttribute('aria-label');
  expect(nom).toBeTruthy();
  expect(await page.locator('[data-montage="recherche"]').evaluate((n) => n.textContent.includes('␣'))).toBe(false);
  await expect(page.locator('[data-attendue]').first()).toBeVisible();

  await champ(page).fill('accent grave combinant');
  await expect(options(page).first()).toHaveAttribute('aria-label', /^◌̀, Accent grave combinant/);
  const glyphes = await options(page).evaluateAll((liste) => liste.map((o) => o.querySelector('.tr__car').textContent));
  expect(glyphes).toContain('◌̀');
});

/* Géométrie : 20 résultats ne font bouger ni la page ni le clavier ; la liste
   défile dans sa colonne. Mêmes fenêtres que testeur-vues.spec.js. */
for (const [largeur, hauteur] of [[1366, 641], [1440, 900]]) {
  test(`${largeur} × ${hauteur} : 20 résultats, le clavier ne bouge pas, la liste défile dans sa colonne`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: hauteur });
    await ouvrir(page, '');
    const reference = (await page.locator('.tc__instrument').boundingBox()).y;

    await ouvrir(page);
    await expect(montage(page)).toHaveAttribute('data-pret', 'true');
    await champ(page).fill('lettre');
    await expect(options(page)).toHaveCount(20);
    await page.locator('.tr__option').nth(19).scrollIntoViewIfNeeded();

    const m = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const liste = document.querySelector('.tr__liste');
      return {
        defilement: Math.round(window.scrollY),
        clavier: r('.tc__instrument'),
        vue: r('[data-montage="recherche"]'),
        liste: { haut: r('.tr__liste').top, bas: r('.tr__liste').bottom, defile: liste.scrollHeight > liste.clientHeight + 1 },
        hautLigne: Math.min(...Array.from(document.querySelectorAll('.tr__option'), (o) => o.getBoundingClientRect().height)),
        gauche: { champBas: r('.tr__champ').bottom, gesteBas: r('.tr__geste').bottom },
        debordeX: document.documentElement.scrollWidth > window.innerWidth
      };
    });
    expect(m.defilement, 'la page ne défile pas').toBe(0);
    expect(Math.abs(m.clavier.y - reference), 'même haut du clavier que le parcours').toBeLessThanOrEqual(1);
    expect(m.clavier.bottom, 'bas du clavier').toBeLessThanOrEqual(hauteur - 8);
    expect(m.vue.bottom, 'la vue finit avant le clavier').toBeLessThanOrEqual(m.clavier.y + 1);
    expect(m.liste.bas, 'la liste finit dans la vue').toBeLessThanOrEqual(m.vue.bottom + 1);
    expect(m.gauche.gesteBas, 'la ligne de geste finit dans la vue').toBeLessThanOrEqual(m.vue.bottom + 1);
    expect(m.hautLigne, 'lignes de résultat : 32 px au moins').toBeGreaterThanOrEqual(32);
    expect(m.liste.defile, 'la liste défile dans sa colonne').toBe(true);
    expect(m.debordeX, 'pas de défilement horizontal').toBe(false);
  });
}
