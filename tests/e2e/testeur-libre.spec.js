/* Testeur v2 — la vue « Taper librement » de /testeur (lot 2, 2026-11-12).

   Le testeur émule AZERTY Global : le caractère écrit est celui du moteur, pas
   celui du système. Deux familles de frappes ici :
   - des KeyboardEvent synthétiques (comme testeur.spec.js) pour les gestes qui
     demandent Verr. Maj. ou AltGr, que `page.keyboard` ne pilote pas de façon
     portable ; un événement synthétique n'écrit rien tout seul : seul le
     `preventDefault` rendu par `dispatchEvent` prouve que la vue a pris la
     frappe ;
   - de vraies touches (`page.keyboard.press`) pour ce qui doit rester natif
     (Ctrl + A, Retour arrière, Tab, flèches, Entrée) et pour prouver que le
     caractère du moteur remplace celui du système.
   La plateforme est fixée à Windows, comme dans les autres specs. */

const fs = require('fs');
const path = require('path');
const { test, expect } = require('../helpers/local-site');

const siteRoot = process.env.TEST_SITE_ROOT || '.';
const table = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), siteRoot, 'tester', 'azerty-global.json'), 'utf8'));

/* Espace fine insécable : la vue la pose devant le deux-points (le moteur,
   lui, écrit une espace ordinaire : `ligneGeste` ne la porte pas). */
const FINE = ' ';

/* Rang dans la table : AltGr×4 + Verr. Maj.×2 + Maj×1. */
function modificateursDuRang(rang) {
  return { altgr: Boolean(rang & 4), verrmaj: Boolean(rang & 2), maj: Boolean(rang & 1) };
}

/* La frappe la plus simple d'un caractère : le moins de modificateurs, puis le
   rang le plus bas. */
function frappeDe(caractere) {
  const trouves = [];
  for (const [code, valeurs] of Object.entries(table.keymap)) {
    if (code.startsWith('Numpad')) continue;
    valeurs.forEach((valeur, rang) => {
      if (valeur === caractere) trouves.push({ code, rang });
    });
  }
  trouves.sort((a, b) => {
    const poids = (rang) => Object.values(modificateursDuRang(rang)).filter(Boolean).length;
    return poids(a.rang) - poids(b.rang) || a.rang - b.rang;
  });
  if (!trouves.length) throw new Error(`Aucune frappe pour ${caractere} dans tester/azerty-global.json`);
  return { code: trouves[0].code, ...modificateursDuRang(trouves[0].rang) };
}

/* Envoie un événement et rend `true` si personne n'a appelé preventDefault
   (la frappe reste native), `false` si la vue l'a prise. */
async function envoyer(zone, type, { code, key = code, maj = false, verrmaj = false, altgr = false, ctrl = false, alt = false, meta = false, repeat = false }) {
  return zone.evaluate((cible, init) => {
    const evenement = new KeyboardEvent(init.type, {
      key: init.key,
      code: init.code,
      bubbles: true,
      cancelable: true,
      repeat: init.repeat,
      shiftKey: init.maj,
      ctrlKey: init.ctrl,
      altKey: init.alt,
      metaKey: init.meta
    });
    Object.defineProperty(evenement, 'getModifierState', {
      configurable: true,
      value: (nom) => (nom === 'CapsLock' && init.verrmaj) || (nom === 'AltGraph' && init.altgr)
    });
    return cible.dispatchEvent(evenement);
  }, { type, code, key, maj, verrmaj, altgr, ctrl, alt, meta, repeat });
}

async function presser(zone, frappe) {
  const natif = await envoyer(zone, 'keydown', frappe);
  await envoyer(zone, 'keyup', frappe);
  return natif;
}

async function taper(zone, texte) {
  for (const caractere of Array.from(texte)) {
    await presser(zone, frappeDe(caractere));
  }
}

async function ouvrir(page, requete = '?vue=libre') {
  await page.goto(`/testeur.html${requete}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#testeur')).toHaveAttribute('data-ready', 'true');
}

const racine = (page) => page.locator('#testeur');
const zoneTexte = (page) => page.getByRole('textbox', { name: 'Taper librement' });
const ligneGeste = (page) => page.locator('[data-montage="libre"] .tl__geste');
const annonce = (page) => page.locator('[data-annonce]');
const bascule = (page, nom) => page.getByRole('button', { name: nom, exact: true });
const positionDe = (page, code) => page.evaluate((c) => window.Testeur.moteur.positionParCode[c], code);

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

test('1 · une phrase avec majuscules accentuées s’écrit telle quelle, quel que soit le caractère natif', async ({ page }) => {
  await ouvrir(page);
  const zone = zoneTexte(page);
  await expect(zone).toBeFocused();
  await expect(zone).toHaveAttribute('placeholder', 'Écrivez ce que vous voulez.');

  const phrase = 'ÇA GÈLE À L’ÉCOLE';
  for (const caractere of Array.from(phrase)) {
    const natif = await presser(zone, frappeDe(caractere));
    expect(natif, `${caractere} : la vue prend la frappe`).toBe(false);
  }
  await expect(zone).toHaveValue(phrase);

  /* Une vraie touche : la touche du 2 écrit « é », pas le « 2 » du système. */
  await zone.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
  await zone.press('Backspace');
  await expect(zone).toHaveValue('');
  await page.keyboard.press('Digit2');
  await expect(zone).toHaveValue('é');
});

test('2 · touche morte : ^ puis e donne ê, la ligne de geste dit comment', async ({ page }) => {
  await ouvrir(page);
  const zone = zoneTexte(page);
  await presser(zone, { code: 'BracketLeft', key: 'Dead' });
  await expect(zone).toHaveValue('');
  await presser(zone, { code: 'KeyE', key: 'e' });
  await expect(zone).toHaveValue('ê');

  /* La sortie du moteur, puis la ligne de la vue : même geste, espace fine devant « : ». */
  const brut = await page.evaluate(() => window.Testeur.moteur.ligneGeste('ê'));
  expect(brut).toBe('ê : ^, puis E.');
  expect(await ligneGeste(page).textContent()).toBe(`ê${FINE}: ^, puis E.`);
  expect(await annonce(page).textContent()).toBe(`ê${FINE}: ^, puis E.`);
  /* Temps 1 du geste : la touche morte reste allumée. */
  const morte = await positionDe(page, 'BracketLeft');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  await expect(page.locator(`[data-position="${morte}"]`)).toHaveAttribute('data-attendue', '');
});

test('3 · AltGr : € est écrit, la ligne dit € : AltGr + E., AltGr et E sont allumés', async ({ page }) => {
  await ouvrir(page);
  const zone = zoneTexte(page);
  /* AltGr arrive comme Ctrl + Alt sous Windows : ce n’est pas un raccourci. */
  const natif = await presser(zone, { code: 'KeyE', key: '€', ctrl: true, alt: true });
  expect(natif).toBe(false);
  await expect(zone).toHaveValue('€');
  expect(await ligneGeste(page).textContent()).toBe(`€${FINE}: AltGr + E.`);
  expect(await annonce(page).textContent()).toBe(`€${FINE}: AltGr + E.`);

  const position = await positionDe(page, 'KeyE');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  await expect(page.locator(`[data-position="${position}"]`)).toHaveAttribute('data-attendue', '');
  await expect(page.locator('[data-mod="altgr"][data-mod-attendu], [data-mod^="altgr-"][data-mod-attendu]').first()).toBeVisible();

  /* L’autre forme d’AltGr (getModifierState) écrit pareil. */
  await presser(zone, { code: 'KeyE', key: '€', altgr: true });
  await expect(zone).toHaveValue('€€');
});

test('4 · un caractère ordinaire ne change pas la ligne de geste', async ({ page }) => {
  await ouvrir(page);
  const zone = zoneTexte(page);
  /* L’indice tant qu’aucun caractère spécial n’a été écrit, et la place est réservée. */
  expect(await ligneGeste(page).textContent()).toBe('Essayez É, œ ou —.');
  await taper(zone, 'a7 ');
  await presser(zone, { code: 'Digit2', key: 'é' });
  await presser(zone, frappeDe('A'));
  await expect(zone).toHaveValue('a7 éA');
  expect(await ligneGeste(page).textContent()).toBe('Essayez É, œ ou —.');
  expect(await annonce(page).textContent()).toBe('');

  /* Un caractère spécial, puis des caractères ordinaires : la ligne reste, une seule annonce. */
  await presser(zone, frappeDe('É'));
  const attendue = `É${FINE}: Verr. Maj., puis é.`;
  expect(await ligneGeste(page).textContent()).toBe(attendue);
  expect(await annonce(page).textContent()).toBe(attendue);
  await taper(zone, 'b1');
  await expect(zone).toHaveValue('a7 éAÉb1');
  expect(await ligneGeste(page).textContent()).toBe(attendue);
  expect(await annonce(page).textContent()).toBe(attendue);
  /* La frappe suivante éteint les touches du geste précédent. */
  await expect(page.locator('[data-attendue]')).toHaveCount(0);
  await expect(page.locator('[data-mod-attendu]')).toHaveCount(0);
});

test('5 · la bascule : AltGr affiche le niveau 4, relâché rend le niveau réel, Maj + AltGr se combinent', async ({ page }) => {
  await ouvrir(page);
  const zone = zoneTexte(page);
  const euro = await positionDe(page, 'KeyE');
  const legende = page.locator(`[data-position="${euro}"] [data-slot="altgr"]`);
  const mode = page.locator('[data-mode]');
  await expect(mode).toHaveText('Sans modificateur');
  for (const nom of ['Maj', 'AltGr', 'Verr. Maj.']) {
    await expect(bascule(page, nom)).toHaveAttribute('aria-pressed', 'false');
  }

  await bascule(page, 'AltGr').click();
  await expect(bascule(page, 'AltGr')).toHaveAttribute('aria-pressed', 'true');
  await expect(mode).toHaveText('AltGr actif');
  await expect(legende).toHaveText('€');
  await expect(legende).toHaveAttribute('data-actif', '');
  /* Le bouton n’allume pas la touche AltGr du dessin : elle n’est pas enfoncée. */
  await expect(page.locator('[data-mod-actif]')).toHaveCount(0);

  /* La bascule ne change que l’affichage : la frappe vaut son niveau réel. */
  await expect(zone).toBeFocused();
  await presser(zone, frappeDe('a'));
  await expect(zone).toHaveValue('a');
  await expect(mode).toHaveText('AltGr actif');

  await bascule(page, 'Maj').click();
  await expect(mode).toHaveText('AltGr + Maj actifs');
  await bascule(page, 'Verr. Maj.').click();
  await expect(mode).toHaveText('Verr. Maj. + AltGr + Maj actifs');

  await bascule(page, 'AltGr').click();
  await bascule(page, 'Maj').click();
  await expect(mode).toHaveText('Verr. Maj. actif');
  await expect(legende).not.toHaveAttribute('data-actif', /.*/);

  await bascule(page, 'Verr. Maj.').click();
  await expect(mode).toHaveText('Sans modificateur');
  for (const nom of ['Maj', 'AltGr', 'Verr. Maj.']) {
    await expect(bascule(page, nom)).toHaveAttribute('aria-pressed', 'false');
  }
});

test('6 · Ctrl + A puis Retour arrière vident la zone, Tab en sort', async ({ page }) => {
  await ouvrir(page);
  const zone = zoneTexte(page);
  await taper(zone, 'abc');
  await presser(zone, frappeDe('É'));
  await expect(zone).toHaveValue('abcÉ');

  /* De vraies touches : le raccourci n’est pas intercepté, rien n’est écrit. */
  await zone.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
  await expect(zone).toHaveValue('abcÉ');
  await page.keyboard.press('Backspace');
  await expect(zone).toHaveValue('');

  await page.keyboard.press('Tab');
  await expect(zone).not.toBeFocused();
});

test('7 · Effacer vide la zone, la ligne de geste et les touches, et rend le focus', async ({ page }) => {
  await ouvrir(page);
  const zone = zoneTexte(page);
  await taper(zone, 'ab');
  await presser(zone, frappeDe('É'));
  await expect(zone).toHaveValue('abÉ');
  expect(await ligneGeste(page).textContent()).not.toBe('');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Effacer', exact: true }).click();
  await expect(zone).toHaveValue('');
  expect(await ligneGeste(page).textContent()).toBe('Essayez É, œ ou —.');
  await expect(page.locator('[data-attendue]')).toHaveCount(0);
  await expect(page.locator('[data-mod-attendu]')).toHaveCount(0);
  await expect(zone).toBeFocused();
});

test('8 · quitter la vue et revenir : le texte est gardé, les touches sont éteintes', async ({ page }) => {
  await ouvrir(page);
  const zone = zoneTexte(page);
  await taper(zone, 'ab');
  /* ê par la touche morte : aucun modificateur réel ne reste enfoncé. */
  await presser(zone, { code: 'BracketLeft', key: 'Dead' });
  await presser(zone, { code: 'KeyE', key: 'e' });
  await bascule(page, 'AltGr').click();
  await expect(page.locator('[data-mode]')).toHaveText('AltGr actif');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Revenir au parcours' }).click();
  await expect(racine(page)).toHaveAttribute('data-vue', 'parcours');
  await expect(page.locator('[data-mode]')).toHaveText('Sans modificateur');
  await expect(page.locator('[data-mod-actif]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Taper librement' }).click();
  await expect(racine(page)).toHaveAttribute('data-vue', 'libre');
  await expect(zone).toHaveValue('abê');
  await expect(zone).toBeFocused();
  await expect(page.locator('[data-attendue]')).toHaveCount(0);
  await expect(page.locator('[data-mod-attendu]')).toHaveCount(0);
  await expect(bascule(page, 'AltGr')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-mode]')).toHaveText('Sans modificateur');
});

test('9 · aucune erreur console ni violation CSP sur un parcours de la vue', async ({ page, network }) => {
  await ouvrir(page, '');
  await page.getByRole('button', { name: 'Taper librement' }).click();
  const zone = zoneTexte(page);
  await expect(zone).toBeFocused();
  await taper(zone, 'ÇA va');
  await presser(zone, { code: 'BracketLeft', key: 'Dead' });
  await presser(zone, { code: 'KeyE', key: 'e' });
  await presser(zone, { code: 'KeyE', key: '€', altgr: true });
  await bascule(page, 'Maj').click();
  await page.getByRole('button', { name: 'Effacer', exact: true }).click();
  await page.getByRole('button', { name: 'Revenir au parcours' }).click();
  await page.getByRole('button', { name: 'Taper librement' }).click();
  await expect(zoneTexte(page)).toHaveValue('');
  expect(network.pageErrors).toEqual([]);
  expect(network.consoleErrors).toEqual([]);
  expect(network.cspViolations).toEqual([]);
  expect(await page.locator('[data-montage="libre"] [style]').count()).toBe(0);
});

test('10 · le curseur et la sélection sont respectés, Entrée fait un saut de ligne', async ({ page }) => {
  await ouvrir(page);
  const zone = zoneTexte(page);
  await taper(zone, 'ab');
  await page.keyboard.press('ArrowLeft');
  await presser(zone, frappeDe('É'));
  await expect(zone).toHaveValue('aÉb');
  /* Le curseur est après le caractère écrit. */
  await taper(zone, 'c');
  await expect(zone).toHaveValue('aÉcb');
  /* Une sélection est remplacée. */
  await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.press('Shift+ArrowLeft');
  await presser(zone, { code: 'KeyE', key: '€', altgr: true });
  await expect(zone).toHaveValue('a€b');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+ArrowRight' : 'End');
  await page.keyboard.press('Enter');
  await taper(zone, 'x');
  await expect(zone).toHaveValue('a€b\nx');
  /* Une répétition écrit aussi. */
  await envoyer(zone, 'keydown', { ...frappeDe('w'), repeat: true });
  await expect(zone).toHaveValue('a€b\nxw');
  /* Ctrl + Z (Cmd + Z sous macOS) reste natif : il défait une insertion de la vue. */
  await zone.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
  await expect(zone).not.toHaveValue('a€b\nxw');
});

test('11 · Échap annule une touche morte en attente, un clic aussi', async ({ page }) => {
  await ouvrir(page);
  const zone = zoneTexte(page);
  await presser(zone, { code: 'BracketLeft', key: 'Dead' });
  await presser(zone, { code: 'ShiftLeft', key: 'Shift', maj: true });
  await presser(zone, { code: 'Escape', key: 'Escape' });
  await presser(zone, { code: 'KeyE', key: 'e' });
  await expect(zone).toHaveValue('e');

  await presser(zone, { code: 'BracketLeft', key: 'Dead' });
  await zone.click();
  await presser(zone, { code: 'KeyE', key: 'e' });
  await expect(zone).toHaveValue('ee');

  /* Une touche de modification ne l’annule pas : ^, Maj, puis E donne Ê. */
  await presser(zone, { code: 'BracketLeft', key: 'Dead' });
  await envoyer(zone, 'keydown', { code: 'ShiftLeft', key: 'Shift', maj: true });
  await presser(zone, { code: 'KeyE', key: 'E', maj: true });
  await expect(zone).toHaveValue('eeÊ');
  expect(await ligneGeste(page).textContent()).toBe(`Ê${FINE}: ^, puis Maj + E.`);
});

test('11 ter · au repos, la ligne dit quoi essayer ; chaque caractère cité a son geste ; les cibles font 44 px', async ({ page }) => {
  await ouvrir(page);
  const zone = zoneTexte(page);
  const indice = 'Essayez É, œ ou —.';
  await expect(ligneGeste(page)).toHaveText(indice);
  for (const caractere of ['É', 'œ', '—']) {
    await presser(zone, frappeDe(caractere));
    const ligne = await ligneGeste(page).textContent();
    expect(ligne.startsWith(`${caractere}${FINE}: `), `${caractere} : ${ligne}`).toBe(true);
  }
  await expect(zone).toHaveValue('Éœ—');
  /* « Effacer » rend l’indice. */
  await page.getByRole('button', { name: 'Effacer' }).click();
  await expect(ligneGeste(page)).toHaveText(indice);

  for (const bouton of [bascule(page, 'Maj'), bascule(page, 'AltGr'), bascule(page, 'Verr. Maj.'), page.getByRole('button', { name: 'Effacer' })]) {
    const boite = await bouton.boundingBox();
    expect(boite.height).toBeGreaterThanOrEqual(44);
    expect(boite.width).toBeGreaterThanOrEqual(44);
  }
  /* Enfoncer une bascule ne la déplace pas et ne l’élargit pas. */
  const avant = await bascule(page, 'Maj').boundingBox();
  await bascule(page, 'Maj').click();
  expect(await bascule(page, 'Maj').boundingBox()).toEqual(avant);
});

test('11 bis ·une touche morte seule se voit : message, touche allumée ; l’accent n’est pas avalé', async ({ page }) => {
  await ouvrir(page);
  const zone = zoneTexte(page);
  const message = page.locator('[data-montage="libre"] .tl__absent');
  const texte = 'Touche morte : tapez le caractère à combiner, ou Échap pour annuler.';
  const position = await positionDe(page, 'Quote');

  /* La touche ù (accent aigu, touche morte) : rien d’écrit, mais on le dit. */
  await presser(zone, { code: 'Quote', key: 'Dead' });
  await expect(zone).toHaveValue('');
  await expect(message).toHaveText(texte);
  await expect(annonce(page)).toHaveText(texte);
  await expect(page.locator(`[data-position="${position}"]`)).toHaveAttribute('data-attendue', '');

  /* Échap : le message et la touche allumée s’en vont. */
  await presser(zone, { code: 'Escape', key: 'Escape' });
  await expect(message).toBeHidden();
  await expect(page.locator('[data-attendue]')).toHaveCount(0);

  /* Accent aigu puis @, qu’il ne combine pas : l’accent, puis @. */
  await presser(zone, { code: 'Quote', key: 'Dead' });
  await presser(zone, { code: 'Backquote', key: '@' });
  await expect(zone).toHaveValue('´@');
  await expect(message).toBeHidden();
  expect(await ligneGeste(page).textContent()).toContain('@');

  /* Accent aigu puis é (touche 2), non combiné : « ´é », et pas de ligne « é : é. ». */
  await presser(zone, { code: 'Quote', key: 'Dead' });
  await presser(zone, { code: 'Digit2', key: 'é' });
  await expect(zone).toHaveValue('´@´é');
  expect(await ligneGeste(page).textContent()).not.toContain('é');

  /* Accent aigu puis Espace : l’accent seul. */
  await presser(zone, { code: 'Quote', key: 'Dead' });
  await presser(zone, { code: 'Space', key: ' ' });
  await expect(zone).toHaveValue('´@´é´');
});

test('12 · une frappe sans caractère à ce niveau n’écrit rien et le dit ; @ a sa ligne, é seul non', async ({ page }) => {
  await ouvrir(page);
  const zone = zoneTexte(page);
  const natif = await presser(zone, { code: 'KeyR', key: 'r', altgr: true });
  expect(natif).toBe(false);
  await expect(zone).toHaveValue('');
  const texte = 'Aucun caractère sur la touche R avec AltGr.';
  await expect(page.locator('[data-montage="libre"] .tl__absent')).toHaveText(texte);
  await expect(annonce(page)).toHaveText(texte);
  /* La frappe suivante le retire. */
  await presser(zone, frappeDe('a'));
  await expect(page.locator('[data-montage="libre"] .tl__absent')).toBeHidden();

  /* @ est sur la touche ², sans modificateur ; sur l’AZERTY traditionnel, cette touche donne ². */
  await presser(zone, frappeDe('@'));
  await expect(zone).toHaveValue('a@');
  expect(await ligneGeste(page).textContent()).toBe(`@${FINE}: ².`);
});

/* La vue entière et les cinq rangées du clavier tiennent sans défiler, dans le
   cas le plus plein : deux lignes tapées, ligne de geste affichée, une bascule
   enfoncée. Le clavier ne bouge pas par rapport au parcours. */
for (const [largeur, hauteur] of [[1440, 900], [1366, 768], [1366, 641], [1280, 620]]) {
  test(`13 · ${largeur} × ${hauteur} : la vue pleine tient dans la fenêtre, le clavier ne bouge pas`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: hauteur });
    await ouvrir(page, '');
    const haut = async () => (await page.locator('.tc__instrument').boundingBox()).y;
    const reference = await haut();

    await page.getByRole('button', { name: 'Taper librement' }).click();
    const zone = zoneTexte(page);
    await taper(zone, 'ÇA GÈLE À L’ÉCOLE, ');
    await presser(zone, { code: 'Enter', key: 'Enter' });
    await page.keyboard.press('Enter');
    await taper(zone, 'ÉCOLE €');
    await presser(zone, { code: 'KeyE', key: '€', altgr: true });
    await bascule(page, 'AltGr').click();
    expect(await ligneGeste(page).textContent()).not.toBe('');

    const m = await page.evaluate(() => {
      const boite = (selecteur) => {
        const r = document.querySelector(selecteur).getBoundingClientRect();
        return { haut: r.top, bas: r.bottom, hauteur: r.height };
      };
      const taille = (selecteur) => parseFloat(getComputedStyle(document.querySelector(selecteur)).fontSize);
      return {
        defilement: Math.round(window.scrollY),
        clavier: boite('.tc__instrument'),
        montage: boite('[data-montage="libre"]'),
        zone: boite('.tc__zone'),
        texte: boite('.tl__texte'),
        geste: boite('.tl__geste'),
        effacer: boite('.tl__effacer'),
        bascule: boite('.tl__bascule'),
        tailles: ['.tl__niveaux-label', '.tl__bascule', '.tl__effacer', '.tl__geste', '.tl__absent'].map(taille)
      };
    });
    console.log(`MESURE ${largeur}x${hauteur} bas du clavier ${m.clavier.bas}, haut ${m.clavier.haut}, montage ${m.montage.haut}-${m.montage.bas}, texte ${m.texte.hauteur}`);
    expect(m.defilement, 'la page ne défile pas').toBe(0);
    expect(m.clavier.bas, 'bas du clavier').toBeLessThanOrEqual(hauteur - 8);
    expect(Math.abs(m.clavier.haut - reference), 'même haut que le parcours').toBeLessThanOrEqual(1);
    expect(m.montage.bas, 'la vue finit au-dessus du clavier').toBeLessThanOrEqual(m.clavier.haut);
    expect(m.montage.bas, 'la vue reste dans sa zone').toBeLessThanOrEqual(m.zone.bas);
    expect(m.bascule.hauteur, 'bascule ≥ 32 px').toBeGreaterThanOrEqual(32);
    expect(m.effacer.hauteur, 'Effacer ≥ 32 px').toBeGreaterThanOrEqual(32);
    for (const t of m.tailles) expect(t, 'texte ≥ 14 px').toBeGreaterThanOrEqual(14);
    /* L’espace d’AltGr, dernière rangée, est dans la fenêtre. */
    const altgr = await page.locator('[data-mod="altgr"]').first().boundingBox();
    expect(altgr.y + altgr.height).toBeLessThanOrEqual(hauteur - 8);
  });
}
