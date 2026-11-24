/* Testeur v2 — page /testeur, composant `js/v2/testeur.js`.

   Remplace, le 2026-10-02, les specs du testeur v1 (`tester*.spec.js`), qui
   pilotaient la modale `#tester-modal` de la chaîne `init-tester.js` : aucune
   page FR ne l'a plus. Les pages EN l'ont quittée en passant en v2 (branche
   v2-en, 2026-10-20), avec `tester-v1-en.spec.js` : leur bouton mène à /testeur.

   Les frappes sont des KeyboardEvent synthétiques envoyés à la zone de frappe :
   Verr. Maj. et AltGr ne se pilotent pas de façon portable par
   `page.keyboard`, et le composant lit `getModifierState`. La plateforme est
   fixée à Windows, sauf dans le test macOS : sans cela, les runners macOS de
   la CI prendraient le chemin Option et l'échange Backquote/IntlBackslash. */

const fs = require('fs');
const path = require('path');
const { test, expect } = require('../helpers/local-site');

const siteRoot = process.env.TEST_SITE_ROOT || '.';
const table = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), siteRoot, 'tester', 'azerty-global.json'), 'utf8'));

/* Rang dans la table : AltGr×4 + Verr. Maj.×2 + Maj×1 (`tester/keyboard.js`). */
function modificateursDuRang(rang) {
  return { altgr: Boolean(rang & 4), verrmaj: Boolean(rang & 2), maj: Boolean(rang & 1) };
}

/* La frappe la plus simple d'un caractère, pour taper une phrase entière.
   Les gestes que le produit annonce (É = Verr. Maj. + é, « = AltGr + W, @ sur
   l'ancienne touche ²) sont vérifiés à part, écrits en dur. */
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

/* Le geste d'un visiteur dont Verr. Maj. est resté actif : la frappe qui donne
   le caractère avec le bit Verr. Maj. du rang, sinon la plus simple, Verr. Maj.
   tenu dans l'état de la touche. */
function geste(caractere, verrmajActif) {
  const trouves = [];
  for (const [code, valeurs] of Object.entries(table.keymap)) {
    if (code.startsWith('Numpad')) continue;
    valeurs.forEach((valeur, rang) => {
      if (valeur === caractere && Boolean(rang & 2) === verrmajActif) trouves.push({ code, rang });
    });
  }
  if (!trouves.length) return { ...frappeDe(caractere), verrmaj: verrmajActif };
  trouves.sort((a, b) => [a.rang & 4, a.rang & 1].filter(Boolean).length - [b.rang & 4, b.rang & 1].filter(Boolean).length || a.rang - b.rang);
  return { code: trouves[0].code, altgr: Boolean(trouves[0].rang & 4), maj: Boolean(trouves[0].rang & 1), verrmaj: verrmajActif };
}

async function envoyer(zone, type, { code, key = code, maj = false, verrmaj = false, altgr = false, ctrl = false, alt = false, meta = false, repeat = false }) {
  await zone.evaluate((cible, init) => {
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
    cible.dispatchEvent(evenement);
  }, { type, code, key, maj, verrmaj, altgr, ctrl, alt, meta, repeat });
}

async function presser(zone, frappe) {
  await envoyer(zone, 'keydown', frappe);
  await envoyer(zone, 'keyup', frappe);
}

async function taper(zone, texte) {
  for (const caractere of Array.from(texte)) {
    await presser(zone, frappeDe(caractere));
  }
}

async function fixerPlateforme(page, plateforme) {
  await page.addInitScript((valeur) => {
    Object.defineProperty(Navigator.prototype, 'platform', { configurable: true, get: () => valeur });
  }, plateforme);
}

async function ouvrir(page, requete = '') {
  await page.goto(`/testeur.html${requete}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#testeur')).toHaveAttribute('data-ready', 'true');
}

/* Refonte du 2026-11-11 : plus d'intro. La page arrive sur l'exercice 1, prêt à
   taper, sans clic : ouvrir la page suffit. */
async function commencerDirectement(page) {
  await ouvrir(page);
  await expect(page.locator('#testeur')).toHaveAttribute('data-ecran', 'parcours');
  return page.locator('#tc-frappe');
}

const racine = (page) => page.locator('#testeur');

/* Décision du 2026-11-12 : après le premier É, la question sur la méthode prend
   la zone et le parcours l'attend (`data-question` sur #testeur) : la cible
   suivante ne s'affiche qu'après une réponse, « Passer la question », Entrée ou
   Échap, et aucun minuteur ne l'avance. Les tests qui visent la suite du parcours
   passent donc la question avec ce bouton. */
const E_REUSSI = { code: 'Digit2', key: 'é', verrmaj: true };

async function passerLaQuestion(page) {
  await page.locator('[data-action="passer-question"]').click();
  await expect(racine(page)).not.toHaveAttribute('data-question', /.*/);
}

async function ecrireEPuisPasserLaQuestion(page, zone) {
  await presser(zone, E_REUSSI);
  await expect(racine(page)).toHaveAttribute('data-question', '');
  await passerLaQuestion(page);
}

/* La pause de réussite de 0,8 s (la cible suivante arrive seule) ne vient plus
   après le É, mais après toute autre cible : la première de l'étape 2, tapée sur
   une horloge figée, en est la plus courte. */
async function reussirLaPremiereCibleDeLEtape2(page, zone) {
  await taper(zone, '.fr .com .org .net');
  await expect(zone).toHaveAttribute('data-reussie', '');
}
const CIBLE_2_DE_L_ETAPE_2 = 'À écrire : contact@exemple.com. Saisi : rien';

/* L'h1 de la page : constant pendant le parcours, il ne change qu'au bilan. */
const titre = (page) => page.locator('[data-titre]');
/* Le titre de l'exercice en cours, dans la barre « Étape N sur M ». */
const titreEtape = (page) => page.locator('[data-etape-titre]');
const numeroEtape = (page) => page.locator('[data-etape-numero]');
const indice = (page) => page.locator('[data-indice]');
const alerte = (page) => page.locator('[data-alerte]');
const annonce = (page) => page.locator('[data-annonce]');
const ligne = (page) => page.locator('[data-ligne]');
const bravo = (page) => page.locator('[data-bravo]');

test.beforeEach(async ({ page }) => {
  await fixerPlateforme(page, 'Win32');
});

test.afterEach(async ({ network }) => {
  expect(network.pageErrors).toEqual([]);
  expect(network.consoleErrors).toEqual([]);
  expect(network.cspViolations).toEqual([]);
  /* Seul le script de mesure d'audience du site sort de l'origine (la fixture
     le remplace par un script vide) : le testeur, lui, n'envoie rien. */
  expect(network.externalRequests.filter((requete) => requete.url !== 'https://cloud.umami.is/script.js')).toEqual([]);
});

/* Du début au bilan sans rien taper : « Passer » saute l'exercice en cours, la
   question d'usage se valide par « Continuer » (usages cochés ou non). */
async function passerJusquAuBilan(page, usages = []) {
  for (let tour = 0; tour < 8; tour += 1) {
    const ecran = await racine(page).getAttribute('data-ecran');
    if (ecran === 'synthese') return;
    if (ecran === 'usage') {
      for (const usage of usages) await page.getByRole('button', { name: USAGES[usage] }).click();
      await page.getByRole('button', { name: 'Continuer' }).click();
    } else {
      await page.locator('[data-action="passer"]:visible, [data-action="passer-exercice"]:visible').click();
    }
  }
  await expect(racine(page)).toHaveAttribute('data-ecran', 'synthese');
}

test('arrivée : l’exercice É est prêt, sans clic ni question avant', async ({ page }) => {
  await ouvrir(page);
  await expect(racine(page)).toHaveAttribute('data-ecran', 'parcours');
  await expect(racine(page)).toHaveAttribute('data-vue', 'parcours');
  await expect(titre(page)).toHaveText('Essayez AZERTY Global.');
  await expect(indice(page)).toHaveText('Tapez un É : Verr. Maj., puis la touche é.');
  await expect(page.locator('#tc-frappe')).toHaveAttribute('aria-label', 'À écrire : É. Saisi : rien');
  await expect(numeroEtape(page)).toHaveText('Étape 1 sur 3');
  await expect(titreEtape(page)).toHaveText('Les majuscules accentuées.');
  /* Les trois pas (décor) sont dans la ligne d'étape, et la racine dit l'étape. */
  await expect(racine(page)).toHaveAttribute('data-etape', '1');
  await expect(page.locator('.tc__etape .tc__pas i')).toHaveCount(3);
  await expect(page.locator('.tc__pas')).toHaveAttribute('aria-hidden', 'true');
  /* La touche é est allumée dès l'arrivée, Verr. Maj. aussi. */
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  await expect(page.locator('[data-mod="verrmaj"]')).toHaveAttribute('data-mod-attendu', '');
  /* Ni la question d'usage ni la question de méthode ne précèdent le É. */
  await expect(page.locator('[data-methode]')).toBeHidden();
  await expect(page.locator('.tc__usage')).toBeHidden();
  /* Rien n'est compté avant la première frappe. */
  expect(await page.evaluate(() => window.AGMesure.journal.length)).toBe(0);

  /* Le clavier tient dans l'écran de 1440 × 900 (bas ≤ 880 px, lot 1b) : au
     chargement et après le É. */
  await page.setViewportSize({ width: 1440, height: 900 });
  const basClavier = () => page.locator('.tc__instrument').evaluate((element) => element.getBoundingClientRect().bottom);
  expect(await basClavier()).toBeLessThanOrEqual(880);
  await presser(page.locator('body'), { code: 'Digit2', key: 'é', verrmaj: true });
  await expect(page.locator('#tc-frappe')).toHaveAttribute('data-reussie', '');
  await expect(page.locator('[data-methode]')).toBeVisible();
  expect(await basClavier()).toBeLessThanOrEqual(880);
});

/* Lot 1b : le halo des touches attendues se voit du premier coup d'œil. Filet de
   4 px (la forme, pas seulement la couleur), contraste du filet ≥ 3:1 contre la
   touche voisine, ordre du geste 1 puis 2 sur le modificateur et la touche. */
test('halo : les touches attendues ont un filet épais et contrasté, et l’ordre du geste (1, puis 2)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ouvrir(page);
  const mesure = await page.evaluate(() => {
    const luminance = (rgb) => {
      const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const rapport = (a, b) => {
      const [haut, bas] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (haut + 0.05) / (bas + 0.05);
    };
    const touche = document.querySelector('.clavier__touche[data-attendue]');
    const modificateur = document.querySelector('.clavier__touche[data-mod-attendu]');
    const voisine = document.querySelector('.clavier__touche[data-position="E03"]');
    const style = getComputedStyle(touche);
    return {
      largeurFilet: style.outlineWidth,
      styleFilet: style.outlineStyle,
      contrasteVoisine: rapport(style.outlineColor, getComputedStyle(voisine).backgroundColor),
      contrastePapier: rapport(style.outlineColor, getComputedStyle(document.querySelector('.tc .clavier')).backgroundColor),
      filetVoisine: getComputedStyle(voisine).outlineStyle,
      numeroTouche: getComputedStyle(touche, '::after').content,
      numeroModificateur: getComputedStyle(modificateur, '::after').content
    };
  });
  expect(mesure.styleFilet).toBe('solid');
  expect(parseFloat(mesure.largeurFilet)).toBeGreaterThanOrEqual(3);
  /* Une touche ordinaire n'a aucun filet de ce genre. */
  expect(mesure.filetVoisine).toBe('none');
  expect(mesure.contrasteVoisine).toBeGreaterThanOrEqual(3);
  expect(mesure.contrastePapier).toBeGreaterThanOrEqual(3);
  /* L'ordre du geste : Verr. Maj. d'abord (1), puis é (2). */
  expect(mesure.numeroModificateur).toContain('1');
  expect(mesure.numeroTouche).toContain('2');
});

/* Lot 1b : la note d'arrivée occupe la bande jusqu'à la première frappe
   comptée, pas jusqu'au chargement (une arrivée `?de=` compte déjà le début). */
test('note d’arrivée : visible jusqu’à la première frappe comptée, y compris sur ?de=', async ({ page }) => {
  await ouvrir(page, '?de=e-aigu-majuscule');
  await expect(page.locator('[data-note]')).toBeVisible();
  await expect(page.locator('[data-note]')).toContainText('Tapez sur votre propre clavier.');
  await presser(page.locator('#tc-frappe'), { code: 'Digit2', key: 'é', verrmaj: true });
  await expect(page.locator('[data-note]')).toBeHidden();
  /* Elle ne revient pas après la faute ni l'indice suivant. */
  await presser(page.locator('#tc-frappe'), { code: 'KeyZ', key: 'z' });
  await expect(page.locator('[data-note]')).toBeHidden();
});

/* Lot 1b (2026-11-11) : à 1440 × 900, tout ce qui sert à l'étape en cours tient
   dans le premier écran, et le clavier ne bouge jamais. */
test('1440 × 900 : après le É, la question prend la zone, puis la réponse tient dans la bande ; le clavier ne bouge pas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const zone = await commencerDirectement(page);
  const boite = async (selecteur) => {
    const b = await page.locator(selecteur).boundingBox();
    if (!b) throw new Error(`${selecteur} n’a pas de boîte`);
    return b;
  };

  const clavierAvant = await boite('.tc__instrument');
  const bandeAvant = await boite('.tc__retours');
  /* La note d'arrivée occupe déjà la bande réservée. */
  await expect(page.locator('[data-note]')).toBeVisible();
  /* Hauteur réservée à la bande : 4,25 rem (2026-11-12). */
  expect(await page.locator('.tc').evaluate((element) => getComputedStyle(element).getPropertyValue('--tc-retour-h').trim())).toBe('4.25rem');

  await presser(zone, E_REUSSI);
  await expect(racine(page)).toHaveAttribute('data-question', '');
  await expect(bravo(page).locator('[data-bravo-titre]')).toBeVisible();
  await expect(page.locator('[data-methode]')).toBeVisible();
  /* La note cède la place à la bande, pour de bon. */
  await expect(page.locator('[data-note]')).toBeHidden();

  /* Le titre du bravo, la question, « Passer la question » et ses sept réponses
     sont entièrement dans la fenêtre, au-dessus du clavier. */
  for (const selecteur of ['[data-bravo-titre]', '.tc__methode-titre', '[data-action="passer-question"]', '.tc__choix']) {
    const b = await boite(selecteur);
    expect(b.y, selecteur).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height, selecteur).toBeLessThanOrEqual(clavierAvant.y);
  }
  const reponses = page.locator('[data-reponse]');
  await expect(reponses).toHaveCount(7);
  const lignes = new Set();
  for (let i = 0; i < 7; i += 1) {
    const b = await reponses.nth(i).boundingBox();
    expect(b.y + b.height).toBeLessThanOrEqual(900);
    lignes.add(Math.round(b.y));
  }
  /* Sept réponses sur deux lignes au plus. */
  expect(lignes.size).toBeLessThanOrEqual(2);

  /* Le clavier n'a pas bougé : la zone reprend la hauteur de la barre, qui
     s'efface pendant la question, et la bande n'a plus de hauteur minimale. */
  const clavierApres = await boite('.tc__instrument');
  expect(Math.abs(clavierApres.y - clavierAvant.y)).toBeLessThanOrEqual(1);
  expect(clavierApres.y + clavierApres.height).toBeLessThanOrEqual(880);

  /* Une réponse : sa phrase prend la place de la question, dans la bande, et la
     cible suivante s'affiche aussitôt. */
  await page.getByRole('button', { name: 'Je le copie-colle' }).click();
  await expect(racine(page)).not.toHaveAttribute('data-question', /.*/);
  const phrase = page.locator('[data-methode-reponse]');
  await expect(phrase).toBeVisible();
  await expect(page.locator('[data-methode]')).toBeHidden();
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN !. Saisi : rien');
  /* La bande est en bloc : le bravo et la phrase se suivent sur la même ligne, le
     titre du bravo est masqué. */
  const bande = await page.locator('.tc__bande').evaluate((element) => ({
    bande: getComputedStyle(element).display,
    bravo: getComputedStyle(element.querySelector('[data-bravo]')).display,
    phrase: getComputedStyle(element.querySelector('[data-methode-reponse]')).display
  }));
  expect(bande).toEqual({ bande: 'block', bravo: 'inline', phrase: 'inline' });
  await expect(bravo(page).locator('[data-bravo-titre]')).toBeHidden();
  const b = await boite('[data-methode-reponse]');
  expect(b.y + b.height).toBeLessThanOrEqual(clavierAvant.y);
  expect(Math.abs((await boite('.tc__instrument')).y - clavierAvant.y)).toBeLessThanOrEqual(1);
  /* La bande a retrouvé sa hauteur réservée. */
  expect(Math.abs((await boite('.tc__retours')).height - bandeAvant.height)).toBeLessThanOrEqual(1);

  /* Jusqu'à la frappe suivante, qui efface tout : le clavier reste. */
  await presser(zone, { code: 'Digit9', key: 'ç', verrmaj: true });
  await expect(phrase).toBeHidden();
  expect(Math.abs((await boite('.tc__instrument')).y - clavierAvant.y)).toBeLessThanOrEqual(1);
});

test('1440 × 900 : le bravo des étapes suivantes tient dans la bande, et une faute n’y change rien', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const zone = await commencerDirectement(page);
  const top = async () => (await page.locator('.tc__instrument').boundingBox()).y;
  const bande = async () => (await page.locator('.tc__retours').boundingBox()).height;
  const ref = await top();
  const hauteur = await bande();

  await ecrireEPuisPasserLaQuestion(page, zone);
  await taper(zone, 'ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN !');
  await taper(zone, '.fr .com .org .net');
  await expect(bravo(page).locator('[data-bravo-texte]')).toContainText('Avec les mêmes touches');
  const b = await page.locator('[data-bravo]').boundingBox();
  expect(b.y + b.height).toBeLessThanOrEqual(900);
  expect(Math.abs((await top()) - ref)).toBeLessThanOrEqual(1);
  expect(Math.abs((await bande()) - hauteur)).toBeLessThanOrEqual(1);

  /* Une faute prend la place de la bande sans rien pousser. */
  await presser(zone, { code: 'KeyZ', key: 'z' });
  await expect(alerte(page)).toBeVisible();
  const a = await page.locator('[data-alerte]').boundingBox();
  expect(a.y + a.height).toBeLessThanOrEqual(900);
  expect(Math.abs((await top()) - ref)).toBeLessThanOrEqual(1);
  expect(Math.abs((await bande()) - hauteur)).toBeLessThanOrEqual(1);
});

test('1440 × 900 : au bilan, le titre, le dernier retour et les trois liens sont dans la fenêtre', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ouvrir(page, '?ecran=synthese');
  const bas = async (locator) => {
    const b = await locator.boundingBox();
    if (!b) throw new Error('élément sans boîte');
    return b.y + b.height;
  };
  expect(await bas(titre(page))).toBeLessThanOrEqual(900);
  const liens = [
    page.getByRole('link', { name: 'Le guide et l’aide-mémoire' }),
    page.getByRole('button', { name: 'Partager le testeur' }),
    page.getByRole('button', { name: 'Recommencer avec un autre usage' })
  ];
  for (const lien of liens) {
    await expect(lien).toBeVisible();
    expect(await bas(lien)).toBeLessThanOrEqual(900);
  }
  /* Les deux entrées d'outils aussi. */
  for (const nom of ['Taper librement', 'Chercher un caractère']) {
    expect(await bas(page.locator('.tc__outils').getByRole('button', { name: nom }))).toBeLessThanOrEqual(900);
  }
  /* Retour d'Antoine du 2026-11-12 : le clavier dessiné n'est plus affiché au
     bilan (aucune frappe n'y est lue) ; le détail du bilan prend sa place, la
     phrase sous « Télécharger » est affichée, et le clavier revient avec
     « Recommencer ». */
  await expect(page.locator('.tc__instrument')).toBeHidden();
  await expect(page.locator('.tc__resultat-actions p')).toBeVisible();
  expect(await bas(page.locator('[data-bilan-faits]'))).toBeLessThanOrEqual(900);
  await liens[2].click();
  await expect(page.locator('.tc__instrument')).toBeVisible();
  expect(await bas(page.locator('.tc__instrument'))).toBeLessThanOrEqual(880);
});

/* Lot 1c (2026-11-12) : sur une fenêtre de portable (largeur ≥ 1280 px, hauteur
   ≥ 620 px), le clavier entier tient dans la fenêtre à chaque écran de frappe,
   sans défiler : cinq rangées (la dernière est celle d'Espace et d'AltGr), la
   consigne, la saisie et la bande de retour au-dessus. Le bas du clavier garde
   8 px de la fenêtre. 1366 × 641 est un portable 1366 × 768 sous la barre d'un
   navigateur ; 1536 × 730 un 1536 × 864 de même. */
const FENETRES = [[1366, 641], [1366, 768], [1536, 730], [1440, 900]];

/* Mesure la fenêtre à cet instant ; renvoie le haut du clavier. `ou` nomme
   l'écran dans le message d'échec. */
async function clavierDansLaFenetre(page, hauteur, ou, { frappe = true } = {}) {
  const m = await page.evaluate(() => {
    const boite = (selecteur) => {
      const element = document.querySelector(selecteur);
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return r.width || r.height ? { haut: r.top, bas: r.bottom } : null;
    };
    return {
      defilement: Math.round(window.scrollY),
      clavier: boite('.tc__instrument'),
      espace: boite('[data-position="A03"]'),
      altgr: boite('[data-mod="altgr"]'),
      indice: boite('[data-indice]'),
      frappe: boite('#tc-frappe'),
      retours: boite('.tc__retours')
    };
  });
  expect(m.defilement, `${ou} : la page ne défile pas`).toBe(0);
  expect(m.clavier, `${ou} : clavier affiché`).not.toBeNull();
  expect(m.clavier.bas, `${ou} : bas du clavier`).toBeLessThanOrEqual(hauteur - 8);
  for (const nom of ['espace', 'altgr']) {
    expect(m[nom], `${ou} : ${nom} affiché`).not.toBeNull();
    expect(m[nom].haut, `${ou} : ${nom} dans la fenêtre`).toBeGreaterThanOrEqual(0);
    expect(m[nom].bas, `${ou} : ${nom} dans la fenêtre`).toBeLessThanOrEqual(hauteur - 8);
  }
  if (frappe) {
    for (const nom of ['indice', 'frappe']) {
      expect(m[nom], `${ou} : ${nom} affiché`).not.toBeNull();
      expect(m[nom].haut, `${ou} : ${nom} dans la fenêtre`).toBeGreaterThanOrEqual(0);
      expect(m[nom].bas, `${ou} : ${nom} au-dessus du clavier`).toBeLessThanOrEqual(m.clavier.haut);
    }
    if (m.retours) expect(m.retours.bas, `${ou} : bande de retour`).toBeLessThanOrEqual(m.clavier.haut + 1);
  }
  return m.clavier.haut;
}

for (const [largeur, hauteur] of FENETRES) {
  test(`${largeur} × ${hauteur} : le clavier entier tient dans la fenêtre à chaque écran, et ne bouge pas à un bravo`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: hauteur });
    const zone = await commencerDirectement(page);
    const haut = async () => (await page.locator('.tc__instrument').boundingBox()).y;
    /* Point 2 du lot : à chaque bravo, le haut du clavier est celui de
       l'arrivée (à 1 px près) : la partie droite vide ne doit pas écraser le bravo. */
    const memeHaut = async (ou) => expect(Math.abs((await haut()) - reference), `${ou} : le clavier ne bouge pas`).toBeLessThanOrEqual(1);

    const reference = await clavierDansLaFenetre(page, hauteur, 'arrivée');
    /* Les trois lignes que le visiteur lit sont assez grandes : 14 px au moins
       pour le texte, 12 px au moins pour une légende de touche. */
    const polices = await page.evaluate(() => {
      const taille = (selecteur) => Array.from(document.querySelectorAll(selecteur))
        .filter((e) => e.offsetWidth || e.offsetHeight)
        .map((e) => parseFloat(getComputedStyle(e).fontSize));
      return {
        texte: [...taille('[data-indice]'), ...taille('#tc-frappe'), ...taille('.tc__barre'), ...taille('[data-note]')],
        legendes: taille('.clavier__glyphe[data-slot]')
      };
    });
    expect(Math.min(...polices.texte), 'texte ≥ 14 px').toBeGreaterThanOrEqual(14);
    expect(Math.min(...polices.legendes), 'légendes ≥ 12 px').toBeGreaterThanOrEqual(12);

    await presser(zone, E_REUSSI);
    await expect(racine(page)).toHaveAttribute('data-question', '');
    await expect(bravo(page)).toBeVisible();
    await expect(page.locator('[data-methode]')).toBeVisible();
    await memeHaut('après le É');
    /* Plus d'une seconde après le É : la question tient toujours la zone, la
       cible suivante n'est pas venue seule, et rien ne dépasse au-dessus du
       clavier (la consigne et la saisie sont masquées, pas déplacées). */
    await page.waitForTimeout(1300);
    await expect(zone).toHaveAttribute('aria-label', 'À écrire : É. Saisi : É');
    await clavierDansLaFenetre(page, hauteur, 'après le É (1,3 s)', { frappe: false });
    const question = await page.evaluate(() => {
      const clavier = document.querySelector('.tc__instrument').getBoundingClientRect();
      return ['[data-bravo-titre]', '.tc__methode-titre', '[data-action="passer-question"]', '.tc__choix'].map((selecteur) => {
        const r = document.querySelector(selecteur).getBoundingClientRect();
        return { selecteur, haut: r.top, bas: r.bottom, clavier: clavier.top };
      });
    });
    for (const q of question) {
      expect(q.haut, `${q.selecteur} dans la fenêtre`).toBeGreaterThanOrEqual(0);
      expect(q.bas, `${q.selecteur} au-dessus du clavier`).toBeLessThanOrEqual(q.clavier);
    }
    await memeHaut('après le É (1,3 s)');

    /* La question passée, la cible suivante est là, avec sa consigne et sa saisie. */
    await passerLaQuestion(page);
    await clavierDansLaFenetre(page, hauteur, 'cible suivante de l’étape 1');
    await memeHaut('cible suivante de l’étape 1');

    await taper(zone, 'ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN !');
    await expect(bravo(page).locator('[data-bravo-titre]')).toHaveText('Bravo, É, È, À et Ç sont écrits.');
    await memeHaut('bravo de la fin de l’étape 1');
    await expect(numeroEtape(page)).toHaveText('Étape 2 sur 3');
    await clavierDansLaFenetre(page, hauteur, 'étape 2');

    await taper(zone, '.fr .com .org .net');
    await expect(bravo(page).locator('[data-bravo-texte]')).toContainText('Avec les mêmes touches');
    await memeHaut('bravo de la première cible de l’étape 2');
    await taper(zone, 'contact');
    await presser(zone, { code: 'Backquote', key: '²' });
    await taper(zone, 'exemple.com');
    await expect(racine(page)).toHaveAttribute('data-ecran', 'usage');
    await clavierDansLaFenetre(page, hauteur, 'question d’usage', { frappe: false });
    await memeHaut('question d’usage');

    /* Une frappe vaut « Continuer » : pas de clic, donc pas de défilement. */
    await presser(page.locator('body'), { code: 'KeyZ', key: 'w', altgr: true });
    await expect(racine(page)).toHaveAttribute('data-ecran', 'parcours');
    await expect(numeroEtape(page)).toHaveText('Étape 3 sur 3');
    await clavierDansLaFenetre(page, hauteur, 'étape 3');
    await memeHaut('étape 3');

    await taper(zone, Array.from('« Un chef-d’œuvre ! » — Maman').slice(1).join(''));
    await expect(racine(page)).toHaveAttribute('data-ecran', 'synthese');
    /* Au bilan, plus de clavier dessiné : le titre, « Télécharger » avec sa
       phrase et le début du détail tiennent dans la fenêtre, sans défiler. */
    await expect(page.locator('.tc__instrument')).toBeHidden();
    expect(await page.evaluate(() => Math.round(window.scrollY)), 'bilan : la page ne défile pas').toBe(0);
    for (const selecteur of ['[data-titre]', '.tc__resultat-actions p', '[data-action="refaire"]', '.tc__outils [data-vue-cible="recherche"]', '[data-bilan-faits-titre]']) {
      const boite = await page.locator(selecteur).boundingBox();
      expect(boite, `bilan : ${selecteur} affiché`).not.toBeNull();
      expect(boite.y + boite.height, `bilan : ${selecteur} dans la fenêtre`).toBeLessThanOrEqual(hauteur);
    }
  });
}

/* Retour d'Antoine du 2026-11-12 : au bureau, le titre est masqué à l'œil à
   toutes les hauteurs (il prenait une ligne entière au-dessus de l'exercice),
   mais reste dans la page (un seul h1, lu par les lecteurs d'écran) et revient
   au bilan, où il porte le résultat. */
for (const [largeur, hauteur] of [[1366, 641], [1440, 900], [1920, 1080]]) {
  test(`${largeur} × ${hauteur} : le h1 est masqué à l’œil, reste dans la page, et revient au bilan`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: hauteur });
    await commencerDirectement(page);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(titre(page)).toHaveText('Essayez AZERTY Global.');
    const boite = await titre(page).boundingBox();
    expect(boite.width).toBeLessThanOrEqual(1);
    expect(boite.height).toBeLessThanOrEqual(1);

    await ouvrir(page, '?ecran=synthese');
    expect((await titre(page).boundingBox()).height).toBeGreaterThan(30);
  });
}

/* Lot 1c, point 3 : Verr. Maj. resté actif à l'étape 2. La consigne demande
   d'abord de le désactiver et la touche Verr. Maj. est allumée, dès l'entrée
   dans l'étape. Aucun texte nouveau : la branche existante de la consigne. */
test('étape 2 avec Verr. Maj. resté actif : la consigne demande de le désactiver d’abord', async ({ page }) => {
  const zone = await commencerDirectement(page);
  const verrmaj = page.locator('[data-mod="verrmaj"]');
  /* Le visiteur a tapé l'étape 1 avec Verr. Maj. : il reste actif. */
  await envoyer(zone, 'keydown', { code: 'CapsLock', key: 'CapsLock', verrmaj: true });
  await ecrireEPuisPasserLaQuestion(page, zone);
  for (const caractere of Array.from('ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN !')) {
    await presser(zone, geste(caractere, true));
  }
  await expect(numeroEtape(page)).toHaveText('Étape 2 sur 3');
  /* Le texte validé par Antoine (QCM du 2026-11-12) : « puis appuyez sur » + le geste, un seul point. */
  await expect(indice(page)).toHaveText('Désactivez Verr. Maj., puis appuyez sur ;.');
  await expect(verrmaj).toHaveAttribute('data-mod-attendu', '');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);

  /* Verr. Maj. éteint : la consigne redevient celle du geste simple. */
  await envoyer(zone, 'keydown', { code: 'CapsLock', key: 'CapsLock', verrmaj: false });
  await expect(indice(page)).toHaveText(/^Appuyez sur/);
  await expect(verrmaj).not.toHaveAttribute('data-mod-attendu', '');
});

/* Lot 1d, point 2 (2026-11-12) : les pastilles 1 et 2 sont dans le filet de 4 px
   de leur propre touche. L'écart entre touches est de 4 px : une pastille qui
   déborde de ce filet recouvre une voisine (mesuré avant correction à 1366 × 641 :
   la « 1 » mordait sur Tab, la « 2 » sur K, L et « ? »). Aucune légende visible de
   la touche n'est non plus recouverte, et le chiffre reste lisible. */
async function mesurerPastilles(page) {
  return page.evaluate(() => {
    const luminance = (rgb) => {
      const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const rapport = (a, b) => {
      const [haut, bas] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (haut + 0.05) / (bas + 0.05);
    };
    const touches = Array.from(document.querySelectorAll('.clavier__touche[data-mod-attendu], .clavier__touche[data-attendue]'));
    return touches.map((touche) => {
      const pastille = getComputedStyle(touche, '::after');
      const r = touche.getBoundingClientRect();
      const style = getComputedStyle(touche);
      /* Le bloc conteneur d'un élément positionné est la boîte de remplissage. */
      const x0 = r.left + parseFloat(style.borderLeftWidth);
      const y0 = r.top + parseFloat(style.borderTopWidth);
      const largeur = parseFloat(pastille.width);
      const hauteur = parseFloat(pastille.height);
      const gauche = Number.isNaN(parseFloat(pastille.left)) ? NaN : x0 + parseFloat(pastille.left);
      const haut = y0 + parseFloat(pastille.top);
      const legendes = Array.from(touche.querySelectorAll('.clavier__glyphe[data-slot], .clavier__libelle'))
        .filter((e) => (e.offsetWidth || e.offsetHeight) && e.textContent.trim() !== '')
        .map((e) => {
          const plage = document.createRange();
          plage.selectNodeContents(e);
          const t = plage.getBoundingClientRect();
          return { nom: e.dataset.slot || 'libelle', texte: e.textContent.trim(), gauche: t.left, droite: t.right, haut: t.top, bas: t.bottom };
        });
      return {
        position: touche.dataset.position,
        mod: touche.hasAttribute('data-mod-attendu'),
        contenu: pastille.content,
        police: parseFloat(pastille.fontSize),
        contraste: rapport(pastille.color, pastille.backgroundColor),
        pastille: { gauche, droite: gauche + largeur, haut, bas: haut + hauteur, largeur, hauteur },
        touche: { gauche: r.left, droite: r.right, haut: r.top, bas: r.bottom },
        legendes
      };
    });
  });
}

function verifierPastilles(mesures, ou) {
  const avecPastille = mesures.filter((m) => /[12]/.test(m.contenu));
  expect(avecPastille.length, `${ou} : au moins une pastille`).toBeGreaterThan(0);
  for (const m of avecPastille) {
    const nom = `${ou}, touche ${m.position} (« ${m.contenu} »)`;
    const p = m.pastille;
    expect(Number.isFinite(p.gauche + p.haut + p.largeur + p.hauteur), `${nom} : rectangle mesuré`).toBe(true);
    /* Dans la boîte de la touche agrandie de 4 px (le filet) : aucune voisine recouverte. */
    expect(p.gauche, `${nom} : bord gauche`).toBeGreaterThanOrEqual(m.touche.gauche - 4 - 0.5);
    expect(p.droite, `${nom} : bord droit`).toBeLessThanOrEqual(m.touche.droite + 4 + 0.5);
    expect(p.haut, `${nom} : bord haut`).toBeGreaterThanOrEqual(m.touche.haut - 4 - 0.5);
    expect(p.bas, `${nom} : bord bas`).toBeLessThanOrEqual(m.touche.bas + 4 + 0.5);
    /* Aucune légende visible de la touche n'est recouverte. */
    for (const l of m.legendes) {
      const recouvre = p.gauche < l.droite && p.droite > l.gauche && p.haut < l.bas && p.bas > l.haut;
      expect(recouvre, `${nom} : recouvre la légende « ${l.texte} » (${l.nom})`).toBe(false);
    }
    expect(m.police, `${nom} : chiffre ≥ 12 px`).toBeGreaterThanOrEqual(12);
    expect(m.contraste, `${nom} : contraste ≥ 4,5`).toBeGreaterThanOrEqual(4.5);
  }
}

for (const [largeur, hauteur] of [[1366, 641], [1440, 900]]) {
  test(`${largeur} × ${hauteur} : les pastilles 1 et 2 restent dans le filet de leur touche, à l’arrivée et à l’étape 2`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: hauteur });
    const zone = await commencerDirectement(page);
    /* L'arrivée : « 1 » sur Verr. Maj., « 2 » sur é. */
    const arrivee = await mesurerPastilles(page);
    expect(arrivee.map((m) => (m.contenu.match(/[12]/) || [''])[0]).sort()).toEqual(['1', '2']);
    verifierPastilles(arrivee, 'arrivée');

    /* L'étape 2 avec Verr. Maj. resté actif : « 1 » sur Verr. Maj., « 2 » sur ;. */
    await envoyer(zone, 'keydown', { code: 'CapsLock', key: 'CapsLock', verrmaj: true });
    await ecrireEPuisPasserLaQuestion(page, zone);
    for (const caractere of Array.from('ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN !')) {
      await presser(zone, geste(caractere, true));
    }
    await expect(numeroEtape(page)).toHaveText('Étape 2 sur 3');
    await expect(page.locator('[data-mod="verrmaj"]')).toHaveAttribute('data-mod-attendu', '');
    /* Au moins 1,2 s : la bande et le clavier ont fini de bouger. */
    await page.waitForTimeout(1300);
    const etape2 = await mesurerPastilles(page);
    expect(etape2.map((m) => (m.contenu.match(/[12]/) || [''])[0]).sort()).toEqual(['1', '2']);
    verifierPastilles(etape2, 'étape 2');

    /* La seule touche du profil général qui a une légende en haut à droite (Maj +
       AltGr) est T, « — » (D05), allumée par l'étape des documents avec Maj +
       AltGr : sa pastille ne doit pas cacher ce tiret. */
    await page.evaluate(() => window.Testeur.allumer({ position: 'D05', rang: 5 }));
    const tiret = await mesurerPastilles(page);
    expect(tiret.some((m) => m.position === 'D05' && m.legendes.some((l) => l.nom === 'majaltgr')), 'T porte sa légende « — »').toBe(true);
    verifierPastilles(tiret, 'documents, « — » sur T');
  });
}

/* Lot 1c, point 4 : le bravo de l'étape 2 ne reparaît pas à l'étape 3. */
test('le bravo de l’étape 2 est effacé en entrant dans l’écran d’usage, et ne reparaît pas à l’étape 3', async ({ page }) => {
  const zone = await commencerDirectement(page);
  await ecrireEPuisPasserLaQuestion(page, zone);
  await taper(zone, 'ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN !');
  await taper(zone, '.fr .com .org .net');
  await taper(zone, 'contact');
  await presser(zone, { code: 'Backquote', key: '²' });
  await taper(zone, 'exemple.com');
  await expect(racine(page)).toHaveAttribute('data-ecran', 'usage');
  await expect(bravo(page)).toBeHidden();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(numeroEtape(page)).toHaveText('Étape 3 sur 3');
  await expect(bravo(page)).toBeHidden();
});

/* Lot 1c, point 4 : la consigne reste affichée pendant la pause de réussite
   de 0,8 s, et la touche reste allumée ; elle change avec la cible suivante.
   Le É n'a plus de pause (la question attend sa réponse, 2026-11-12) : le test
   joue la première cible de l'étape 2, dont la dernière lettre est fautée une
   fois, ce qui allume la consigne de façon immédiate et durable. La cible
   suivante commence par une lettre connue : sa consigne est vide (« Continuez à
   votre rythme. » n'existe plus). */
test('la consigne reste affichée pendant la pause de réussite, puis passe à la cible suivante', async ({ page }) => {
  await page.clock.install();
  await ouvrir(page, '?ecran=parcours&etape=2');
  const zone = page.locator('#tc-frappe');
  await page.clock.pauseAt(Date.now() + 2000);
  await taper(zone, '.fr .com .org .ne');
  await presser(zone, { code: 'KeyZ', key: 'z' });
  await expect(alerte(page)).toBeVisible();
  const consigne = await indice(page).textContent();
  expect(consigne).not.toBe('');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  await taper(zone, 't');
  await expect(zone).toHaveAttribute('data-reussie', '');
  await expect(indice(page)).toHaveText(consigne);
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  await page.clock.runFor(900);
  await expect(zone).not.toHaveAttribute('data-reussie', '');
  await expect(zone).toHaveAttribute('aria-label', CIBLE_2_DE_L_ETAPE_2);
  await expect(indice(page)).toHaveText('');
  await expect(page.locator('[data-attendue]')).toHaveCount(0);
});

test('arrivée : un É tapé sans aucun clic est compté', async ({ page }) => {
  await ouvrir(page);
  /* La frappe arrive sur la page, pas sur la zone. Le É ouvre aussitôt la
     question, qui masque la zone (display: none) : le focus n'y reste pas, il y
     revient dès que la question est passée. */
  await presser(page.locator('body'), E_REUSSI);
  await expect(ligne(page).locator('span')).toHaveText(['É']);
  await expect(ligne(page).locator('span').first()).toHaveAttribute('data-etat', 'juste');
  await expect(bravo(page).locator('[data-bravo-titre]')).toHaveText('Bravo, vous avez écrit É.');
  await expect(racine(page)).toHaveAttribute('data-question', '');
  expect(await page.evaluate(() => window.AGMesure.journal.map((e) => e.nom))).toEqual(['testeur_debut']);
  await passerLaQuestion(page);
  await expect(page.locator('#tc-frappe')).toBeFocused();
});

test('après le É : la question prend la zone, n’avance pas seule, et la cible suivante vient avec « Passer la question »', async ({ page }) => {
  await page.clock.install();
  const zone = await commencerDirectement(page);
  await page.clock.pauseAt(Date.now() + 2000);
  await presser(zone, E_REUSSI);

  /* Rien d'autre que le bravo (son titre) et la question : la consigne, la saisie,
     la barre (étape, « Passer », outils) et la comparaison avec Windows sont
     masquées ; le titre du bravo, la question, « Passer la question » et les sept
     réponses sont affichés. */
  await expect(racine(page)).toHaveAttribute('data-question', '');
  const methode = page.locator('[data-methode]');
  await expect(methode).toBeVisible();
  await expect(methode).toContainText('Et d’habitude, comment tapez-vous un É ?');
  await expect(page.locator('[data-reponse]')).toHaveCount(7);
  for (const visible of ['[data-bravo-titre]', '.tc__methode-titre', '[data-action="passer-question"]', '[data-reponse]']) {
    await expect(page.locator(visible).first(), visible).toBeVisible();
  }
  for (const masque of ['.tc__indice', '.tc__frappe', '.tc__barre', '[data-bravo-texte]']) {
    await expect(page.locator(masque), masque).toBeHidden();
  }
  /* « Passer la question » suit le titre de la question, avant les réponses. */
  const ordre = await page.evaluate(() => {
    const avant = (a, b) => Boolean(document.querySelector(a).compareDocumentPosition(document.querySelector(b)) & Node.DOCUMENT_POSITION_FOLLOWING);
    return [
      avant('.tc__methode-titre', '[data-action="passer-question"]'),
      avant('[data-action="passer-question"]', '.tc__choix')
    ];
  });
  expect(ordre).toEqual([true, true]);

  /* Pas de minuteur : la cible suivante n'arrive pas seule, même longtemps après. */
  await page.clock.runFor(5000);
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : É. Saisi : É');
  await expect(racine(page)).toHaveAttribute('data-question', '');
  await expect(methode).toBeVisible();

  /* « Passer la question » : la cible suivante est là aussitôt, le bravo reste. */
  await page.getByRole('button', { name: 'Passer la question' }).click();
  await expect(racine(page)).not.toHaveAttribute('data-question', /.*/);
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN !. Saisi : rien');
  await expect(methode).toBeHidden();
  await expect(zone).toBeFocused();
  await expect(bravo(page)).toBeVisible();
  await expect(page.locator('[data-methode-reponse]')).toBeHidden();

  /* La première frappe réelle de la cible suivante efface le bravo. */
  await presser(zone, { code: 'Digit9', key: 'ç', verrmaj: true });
  await expect(bravo(page)).toBeHidden();
});

test('après le É : une réponse cliquée affiche la phrase validée, la cible suivante vient aussitôt, et la frappe continue', async ({ page }) => {
  const zone = await commencerDirectement(page);
  await presser(zone, E_REUSSI);

  await page.getByRole('button', { name: 'Je le copie-colle' }).click();
  await expect(racine(page)).not.toHaveAttribute('data-question', /.*/);
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN !. Saisi : rien');
  const reponse = page.locator('[data-methode-reponse]');
  await expect(reponse).toBeVisible();
  await expect(reponse).toHaveText('Fini le copier-coller : avec AZERTY Global, c’est Verr. Maj. puis é.');
  await expect(page.locator('[data-methode]')).toBeHidden();
  /* Le clic ne garde pas le focus : la frappe suivante s'écrit. */
  await expect(zone).toBeFocused();
  await presser(zone, { code: 'Digit9', key: 'ç', verrmaj: true });
  await expect(ligne(page).locator('span').first()).toHaveAttribute('data-etat', 'juste');
  await expect(reponse).toBeHidden();
});

test('après le É : « Avec Verr. Maj. puis é » garde le geste, et le bilan dit « Déjà connu »', async ({ page }) => {
  const zone = await commencerDirectement(page);
  await presser(zone, { code: 'Digit2', key: 'é', verrmaj: true });
  await page.getByRole('button', { name: 'Avec Verr. Maj. puis é' }).click();
  await expect(page.locator('[data-methode-reponse]')).toHaveText('Votre geste habituel : AZERTY Global le garde.');

  /* On saute la suite : l'exercice É n'est pas terminé, il reste à essayer. */
  await passerJusquAuBilan(page);
  await expect(page.locator('[data-bilan-reste="0"]')).toContainText('Déjà connu');
});

test('exercice 1 : É avec Verr. Maj. + é, guidage et annonce', async ({ page }) => {
  await page.clock.install();
  const zone = await commencerDirectement(page);
  /* Horloge figée dès l'écran du parcours : installée seule, elle continue de
     s'écouler en temps réel. Seul runFor() la fait maintenant avancer. */
  await page.clock.pauseAt(Date.now() + 2000);

  /* Caractère enseigné par l'exercice : indice immédiat, touche et
     modificateur désignés, nom de touche gravé sur l'AZERTY traditionnel. */
  await expect(indice(page)).toHaveText('Tapez un É : Verr. Maj., puis la touche é.');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  await expect(page.locator('[data-mod="verrmaj"]')).toHaveAttribute('data-mod-attendu', '');
  await expect(page.locator('[data-mode]')).toHaveText('Sans modificateur');

  await envoyer(zone, 'keydown', { code: 'CapsLock', key: 'CapsLock', verrmaj: true });
  await expect(page.locator('[data-mode]')).toHaveText('Verr. Maj. actif');
  await expect(indice(page)).toHaveText('Verr. Maj. est actif : appuyez sur é.');
  await expect(page.locator('[data-mod="verrmaj"]')).not.toHaveAttribute('data-mod-attendu', '');
  await expect(racine(page)).toHaveAttribute('data-majuscules-actives', '');

  await presser(zone, { code: 'Digit2', key: 'é', verrmaj: true });
  await expect(ligne(page).locator('span')).toHaveText(['É']);
  await expect(ligne(page).locator('span').first()).toHaveAttribute('data-etat', 'juste');
  await expect(page.locator('#tc-frappe')).toHaveAttribute('data-reussie', '');
  /* Lot 1c : la consigne reste affichée pendant la pause de réussite, touche allumée. */
  await expect(indice(page)).toHaveText('Verr. Maj. est actif : appuyez sur é.');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  /* Félicitations sans bouton Continuer (QCM du 2026-10-03). Le bravo du É est
     neutre : la comparaison avec l'AZERTY traditionnel de Windows, et la
     question sur la méthode vient après, sous le clavier (2026-11-11). */
  await expect(bravo(page)).toBeVisible();
  await expect(bravo(page).locator('[data-bravo-titre]')).toHaveText('Bravo, vous avez écrit É.');
  await expect(bravo(page).locator('[data-bravo-texte]')).toHaveText('Sur l’AZERTY traditionnel de Windows, vous auriez eu 2.');
  /* Le lien « Télécharger AZERTY Global » n'est plus dans le bravo (2026-11-12) :
     il reste en tête du bilan (test « bilan : les liens de fin »). */
  await expect(bravo(page).getByRole('link')).toHaveCount(0);
  await expect(racine(page).locator('a[href="/download"]')).toBeHidden();
  await expect(annonce(page)).toHaveText('Bravo, vous avez écrit É. Sur l’AZERTY traditionnel de Windows, vous auriez eu 2. À écrire maintenant : ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN\u202F!');
  await expect(page.locator('[data-action="suivant"]')).toHaveCount(0);
  await expect(page.locator('#tc-frappe')).toHaveAttribute('aria-label', 'À écrire : É. Saisi : É');

  /* La question attend sa réponse : la phrase n'arrive pas seule, la comparaison
     avec Windows (texte du bravo) et la consigne sont masquées. */
  await expect(racine(page)).toHaveAttribute('data-question', '');
  await expect(bravo(page).locator('[data-bravo-texte]')).toBeHidden();
  await page.clock.runFor(2000);
  await expect(page.locator('#tc-frappe')).toHaveAttribute('aria-label', 'À écrire : É. Saisi : É');

  /* Passée la question, la phrase arrive aussitôt ; les félicitations restent affichées. */
  await passerLaQuestion(page);
  await expect(page.locator('#tc-frappe')).toHaveAttribute('aria-label', 'À écrire : ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN !. Saisi : rien');
  await expect(page.locator('#tc-frappe')).toBeFocused();
  await expect(bravo(page)).toBeVisible();
});

test('une frappe pendant la pause appelle la cible suivante et compte pour elle', async ({ page }) => {
  await page.clock.install();
  await ouvrir(page, '?ecran=parcours&etape=2');
  const zone = page.locator('#tc-frappe');
  /* Horloge figée, comme pour l'exercice 1 : sous charge, la pause de réussite
     de 800 ms échoit en temps réel avant la première assertion, qui lit alors
     déjà la cible suivante (20 échecs sur 30 en WebKit, 24 workers). Le É n'a
     plus de pause (2026-11-12) : la première cible de l'étape 2 en est la plus courte. */
  await page.clock.pauseAt(Date.now() + 2000);

  await reussirLaPremiereCibleDeLEtape2(page, zone);
  /* Retour arrière et répétition n'effacent pas une réussite. */
  await presser(zone, { code: 'Backspace', key: 'Backspace' });
  await envoyer(zone, 'keydown', { ...frappeDe('t'), repeat: true });
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : .fr .com .org .net. Saisi : .fr .com .org .net');

  /* « c » tout de suite, sans attendre la fin de la pause. */
  await presser(zone, frappeDe('c'));
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : contact@exemple.com. Saisi : c');
  await expect(ligne(page).locator('span').first()).toHaveAttribute('data-etat', 'juste');

  /* La pause annulée ne fait pas sauter la cible plus tard. */
  await page.clock.runFor(2000);
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : contact@exemple.com. Saisi : c');
});

test('une frappe hors de la zone revient dans la zone ; le clavier ne prend pas le focus', async ({ page }) => {
  /* L'étape 2 : le É ouvrirait la question, qui masque la zone (elle ne peut plus
     recevoir le focus) ; le point, lui, s'écrit dans une zone affichée. */
  await ouvrir(page, '?ecran=parcours&etape=2');
  const zone = page.locator('#tc-frappe');

  /* Le cadre du clavier ne défile pas au-dessus de 900 px : pas d'arrêt de
     tabulation, donc pas d'anneau de focus autour du clavier. */
  await expect(page.locator('.clavier-defilement')).not.toHaveAttribute('tabindex', /.*/);

  /* Un clic sur le clavier dessiné laisse le focus à la zone. */
  await page.locator('.tc__instrument').click({ position: { x: 40, y: 40 } });
  await expect(zone).toBeFocused();

  /* Focus parti ailleurs : la frappe suivante revient dans la zone et compte. */
  await zone.evaluate((element) => element.blur());
  await presser(page.locator('body'), frappeDe('.'));
  await expect(zone).toBeFocused();
  await expect(ligne(page).locator('span').first()).toHaveAttribute('data-etat', 'juste');
});

test('zone hors de l’écran : Espace fait défiler la page, rien ne s’écrit', async ({ page }) => {
  const zone = await commencerDirectement(page);
  await zone.evaluate((element) => element.blur());
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await presser(page.locator('body'), { code: 'Space', key: ' ' });
  await expect(zone).not.toBeFocused();
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : É. Saisi : rien');
});

test('Espace pendant la pause passe à la suite sans compter comme faute', async ({ page }) => {
  await page.clock.install();
  await ouvrir(page, '?ecran=parcours&etape=2');
  const zone = page.locator('#tc-frappe');
  /* Horloge figée : sinon, sous charge, la pause échoit avant l'Espace, qui
     s'écrit alors dans la cible suivante (11 échecs sur 30 en WebKit). Le É n'a
     plus de pause : la première cible de l'étape 2 en est la plus courte. */
  await page.clock.pauseAt(Date.now() + 2000);
  await reussirLaPremiereCibleDeLEtape2(page, zone);
  await presser(zone, { code: 'Space', key: ' ' });
  await expect(zone).toHaveAttribute('aria-label', CIBLE_2_DE_L_ETAPE_2);
});

test('une faute ne s’écrit pas : la bonne touche reste allumée et la frappe juste continue', async ({ page }) => {
  await page.clock.install();
  const zone = await commencerDirectement(page);
  await ecrireEPuisPasserLaQuestion(page, zone);

  /* « ÇZ… » : le Z est refusé, la ligne ne bouge pas. */
  await presser(zone, { code: 'Digit9', key: 'ç', verrmaj: true });
  await presser(zone, { code: 'KeyW', key: 'z', verrmaj: true });
  await expect(alerte(page)).toHaveText('Z au lieu de A.');
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN\u202F!. Saisi : Ç');
  await expect(ligne(page).locator('span').nth(1)).toHaveAttribute('data-etat', 'attendu');
  await expect(annonce(page)).toHaveText('Z au lieu de A. Verr. Maj. est actif : appuyez sur A.');

  /* La consigne ne s'éteint pas : A n'est pas enseigné ici, le soufflage
     retombait à 3,5 s avant ce correctif. */
  await expect(indice(page)).toHaveText('Verr. Maj. est actif : appuyez sur A.');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  await page.clock.runFor(5000);
  await expect(indice(page)).toHaveText('Verr. Maj. est actif : appuyez sur A.');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);

  /* Une espace de trop est refusée de même, et se nomme. */
  await presser(zone, { code: 'Space', key: ' ', verrmaj: true });
  await expect(alerte(page)).toHaveText('espace au lieu de A.');
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN\u202F!. Saisi : Ç');

  /* La frappe juste suivante continue et retire l'alerte. */
  await presser(zone, { code: 'KeyQ', key: 'a', verrmaj: true });
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN\u202F!. Saisi : ÇA');
  await expect(alerte(page)).toBeHidden();
});

test('exercice 1 : faute annoncée sans rien écrire, « Passer » après deux fautes', async ({ page }) => {
  const zone = await commencerDirectement(page);
  const passer = page.locator('[data-action="passer-exercice"]');

  /* Sans Verr. Maj., la touche é donne é : c'est une faute sur É. */
  await presser(zone, { code: 'Digit2', key: 'é' });
  await expect(ligne(page).locator('span')).toHaveText(['É']);
  await expect(ligne(page).locator('span').first()).toHaveAttribute('data-etat', 'attendu');
  await expect(alerte(page)).toHaveText('é au lieu de É.');
  await expect(alerte(page)).not.toHaveAttribute('data-ton', 'neutre');
  await expect(annonce(page)).toContainText('é au lieu de É.');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  await expect(passer).toBeHidden();

  /* Deuxième faute de suite : on propose de passer l'exercice. */
  await presser(zone, { code: 'KeyQ', key: 'a' });
  await expect(alerte(page)).toHaveText('a au lieu de É.');
  await expect(passer).toBeVisible();

  /* Rien n'a été écrit : le retour arrière n'a rien à effacer. */
  await presser(zone, { code: 'Backspace', key: 'Backspace' });
  await expect(annonce(page)).toHaveText('Rien à effacer.');
  await expect(alerte(page)).toBeHidden();
  await expect(passer).toBeVisible();

  await passer.click();
  await expect(titreEtape(page)).toHaveText('Une adresse, sans détour.');
  await passerJusquAuBilan(page);
  /* Le É n'a pas été réussi : il reste dans « Pas encore essayé ». */
  await expect(page.locator('[data-bilan-reste="0"]')).toBeVisible();
  await expect(page.locator('[data-bilan-fait="0"]')).toHaveCount(0);
});

test('Entrée valide une phrase juste, et seulement une phrase juste', async ({ page }) => {
  const zone = await commencerDirectement(page);

  await presser(zone, { code: 'Enter', key: 'Enter' });
  await expect(titreEtape(page)).toHaveText('Les majuscules accentuées.');
  await expect(ligne(page).locator('span')).toHaveText(['É']);

  await presser(zone, { code: 'Digit2', key: 'é', verrmaj: true });
  await presser(zone, { code: 'Enter', key: 'Enter' });
  /* Après le É, Entrée vaut « Passer la question » (2026-11-12) : deuxième phrase
     du même exercice, aussitôt. */
  await expect(titreEtape(page)).toHaveText('Les majuscules accentuées.');
  await expect(page.locator('#tc-frappe')).toHaveAttribute('aria-label', /^À écrire : ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN\u202F!\. Saisi : rien$/);
});

test('une touche répétée, Ctrl seul et Cmd n’écrivent rien', async ({ page }) => {
  const zone = await commencerDirectement(page);

  await envoyer(zone, 'keydown', { code: 'Digit2', key: 'é', verrmaj: true, repeat: true });
  await envoyer(zone, 'keydown', { code: 'KeyC', key: 'c', ctrl: true });
  await envoyer(zone, 'keydown', { code: 'KeyV', key: 'v', meta: true });
  await expect(page.locator('#tc-frappe')).toHaveAttribute('aria-label', 'À écrire : É. Saisi : rien');
});

test('parcours complet : les trois exercices, puis la synthèse', async ({ page }) => {
  const zone = await commencerDirectement(page);

  /* Après le É, la question sur la méthode attend : « Passer la question » ouvre
     la cible suivante. Ensuite, aucun clic entre deux cibles : la frappe enchaîne. */
  await ecrireEPuisPasserLaQuestion(page, zone);
  await taper(zone, 'ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN\u202F!');
  await expect(zone).toBeFocused();
  await expect(ligne(page).locator('[data-etat="erreur"]')).toHaveCount(0);
  await expect(bravo(page).locator('[data-bravo-titre]')).toHaveText('Bravo, É, È, À et Ç sont écrits.');

  await expect(titreEtape(page)).toHaveText('Une adresse, sans détour.');
  await expect(numeroEtape(page)).toHaveText('Étape 2 sur 3');
  await expect(racine(page)).toHaveAttribute('data-etape', '2');
  await taper(zone, '.fr .com .org .net');
  await expect(bravo(page).locator('[data-bravo-texte]')).toHaveText('Avec les mêmes touches, l’AZERTY traditionnel de Windows écrit «\u00A0;fr ;com ;org ;net\u00A0».');
  await taper(zone, 'contact');
  /* Geste annoncé : l'arobase sur l'ancienne touche ², sans modificateur. */
  await presser(zone, { code: 'Backquote', key: '²' });
  await taper(zone, 'exemple.com');
  await expect(ligne(page).locator('[data-etat="erreur"]')).toHaveCount(0);

  /* La question d'usage s'intercale avant la troisième étape. Rien de coché :
     l'étape d'usage est Documents. */
  await expect(racine(page)).toHaveAttribute('data-ecran', 'usage');
  /* La ligne d'étape reste affichée à la question d'usage : « Étape 3 sur 3 », sans
     intitulé (il dépend de la réponse), et « Continuer » est la touche du bas. */
  await expect(page.locator('.tc__etape')).toBeVisible();
  await expect(numeroEtape(page)).toHaveText('Étape 3 sur 3');
  await expect(titreEtape(page)).toHaveText('');
  await expect(racine(page)).toHaveAttribute('data-etape', '3');
  await expect(page.getByRole('button', { name: 'Continuer' })).toHaveClass(/\btc__usage-suite\b/);
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(titreEtape(page)).toHaveText('La typographie française avec AltGr');
  await expect(numeroEtape(page)).toHaveText('Étape 3 sur 3');
  /* Geste annoncé : AltGr + W donne «. */
  await presser(zone, { code: 'KeyZ', key: 'w', altgr: true });
  await expect(ligne(page).locator('span').first()).toHaveAttribute('data-etat', 'juste');
  await taper(zone, Array.from('«\u202FUn chef-d’œuvre\u202F!\u202F» — Maman').slice(1).join(''));
  await expect(ligne(page).locator('[data-etat="erreur"]')).toHaveCount(0);
  await presser(zone, { code: 'Enter', key: 'Enter' });

  await expect(racine(page)).toHaveAttribute('data-ecran', 'synthese');
  await expect(titre(page)).toHaveText('Pour écrire ainsi au quotidien, installez AZERTY Global.');
  await expect(titre(page)).toBeFocused();
  /* Le dernier retour (décision du 2026-10-03, lot 1b) : celui de la dernière
     cible, en tête du bilan, sans clic ni délai. */
  await expect(page.locator('[data-dernier]')).toBeVisible();
  await expect(page.locator('[data-dernier-titre]')).toHaveText('C’est écrit.');
  await expect(page.locator('[data-dernier-texte]')).toContainText('Avec les mêmes touches, l’AZERTY traditionnel de Windows écrit');
  /* Bilan du 20/10 : trois des cinq changements essayés (É È À Ç, le point,
     l'arobase), les deux autres à essayer, les documents « en plus ». */
  await expect(page.locator('[data-bilan-faits] li')).toHaveCount(3);
  await expect(page.locator('[data-bilan-reste] li')).toHaveCount(2);
  await expect(page.locator('[data-bilan-plus] li')).toHaveText(['La typographie françaiseAltGr + W, X, 4 et O pour « » ’ œ']);
  await expect(page.getByRole('link', { name: 'Télécharger AZERTY Global' }).first()).toBeVisible();

  /* Mesure (plan de marquage du 2026-10-05) : journalisée, jamais envoyée en local. */
  expect(await page.evaluate(() => window.AGMesure.journal.map((e) => [e.nom, e.params, e.envoye]))).toEqual([
    ['testeur_debut', {}, false],
    ['testeur_etape', { etape: 'majuscules' }, false],
    ['testeur_etape', { etape: 'adresse' }, false],
    ['testeur_etape', { etape: 'documents' }, false],
    ['testeur_fin', {}, false]
  ]);
});

test('AltGr arrive aussi comme Ctrl+Alt sous Windows', async ({ page }) => {
  await ouvrir(page, '?ecran=parcours&etape=3');
  const zone = page.locator('#tc-frappe');
  await expect(titreEtape(page)).toHaveText('La typographie française avec AltGr');

  await envoyer(zone, 'keydown', { code: 'ControlLeft', key: 'Control', ctrl: true });
  await envoyer(zone, 'keydown', { code: 'AltRight', key: 'Alt', ctrl: true, alt: true });
  await expect(page.locator('[data-mode]')).toHaveText('AltGr actif');
  await presser(zone, { code: 'KeyZ', key: 'w', ctrl: true, alt: true });
  await expect(ligne(page).locator('span').first()).toHaveText('«');
  await expect(ligne(page).locator('span').first()).toHaveAttribute('data-etat', 'juste');
});

test('une touche morte compose le caractère suivant', async ({ page }) => {
  const zone = await commencerDirectement(page);

  /* ^ puis e : ê, attendu É, donc une faute qui nomme ê sans l'écrire. */
  await presser(zone, { code: 'BracketLeft', key: 'Dead' });
  await expect(page.locator('#tc-frappe')).toHaveAttribute('aria-label', 'À écrire : É. Saisi : rien');
  await expect(alerte(page)).toHaveText('Touche morte : tapez le caractère à combiner. Si ce n’était pas voulu, tapez Espace.');
  await expect(alerte(page)).toHaveAttribute('data-ton', 'neutre');
  await presser(zone, { code: 'KeyE', key: 'e' });
  await expect(ligne(page).locator('span')).toHaveText(['É']);
  await expect(alerte(page)).toHaveText('ê au lieu de É.');
  await expect(annonce(page)).toContainText('ê au lieu de É.');
});

test('le bravo reste jusqu’à la première frappe de la cible suivante', async ({ page }) => {
  const zone = await commencerDirectement(page);
  await presser(zone, E_REUSSI);
  await expect(bravo(page)).toBeVisible();

  /* La question passée, la cible suivante est là, le bravo reste le temps de le lire. */
  await passerLaQuestion(page);
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN\u202F!. Saisi : rien');
  await expect(bravo(page)).toBeVisible();

  /* Une touche de commande n'est pas une frappe. */
  await presser(zone, { code: 'ShiftLeft', key: 'Shift', maj: true });
  await expect(bravo(page)).toBeVisible();

  await presser(zone, { code: 'Digit9', key: 'ç', verrmaj: true });
  await expect(bravo(page)).toBeHidden();
});

test('une frappe ignorée le dit ; les touches de commande restent muettes', async ({ page }) => {
  const zone = await commencerDirectement(page);

  for (const frappe of [
    { code: 'ShiftLeft', key: 'Shift', maj: true },
    { code: 'CapsLock', key: 'CapsLock' },
    { code: 'ArrowLeft', key: 'ArrowLeft' },
    { code: 'F5', key: 'F5' },
    { code: 'Escape', key: 'Escape' }
  ]) {
    await presser(zone, frappe);
    await expect(alerte(page)).toBeHidden();
  }

  await presser(zone, { code: 'MediaPlayPause', key: 'MediaPlayPause' });
  await expect(alerte(page)).toHaveText('Le testeur ne traite pas cette touche.');
  await expect(alerte(page)).toHaveAttribute('data-ton', 'neutre');
  await expect(annonce(page)).toHaveText('Le testeur ne traite pas cette touche.');

  /* Clavier virtuel : pas de `code`, la frappe ne se lit pas. */
  await presser(zone, { code: '', key: 'Unidentified' });
  await expect(alerte(page)).toContainText('ne lit pas cette frappe');

  /* AltGr + R ne donne aucun caractère dans la table. */
  await presser(zone, { code: 'KeyR', key: 'r', ctrl: true, alt: true });
  await expect(alerte(page)).toHaveText('Aucun caractère sur la touche R avec AltGr.');
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : É. Saisi : rien');
});

test('macOS : Option tient lieu d’AltGr, Backquote et IntlBackslash échangés', async ({ page }) => {
  await fixerPlateforme(page, 'MacIntel');
  await ouvrir(page, '?ecran=parcours&etape=2');
  const zone = page.locator('#tc-frappe');
  await expect(titreEtape(page)).toHaveText('Une adresse, sans détour.');

  await taper(zone, '.fr .com .org .net');
  await taper(zone, 'contact');
  /* Sur un Mac ISO, la touche ² envoie IntlBackslash. */
  await presser(zone, { code: 'IntlBackslash', key: '@' });
  await expect(ligne(page).locator('span').nth(7)).toHaveText('@');
  await expect(ligne(page).locator('span').nth(7)).toHaveAttribute('data-etat', 'juste');

  await ouvrir(page, '?ecran=parcours&etape=3');
  await expect(titreEtape(page)).toHaveText('La typographie française avec AltGr');
  await presser(zone, { code: 'KeyZ', key: 'w', alt: true });
  await expect(ligne(page).locator('span').first()).toHaveText('«');
});

test('les caractères non enseignés ne sont soufflés qu’après trois secondes', async ({ page }) => {
  await page.clock.install();
  const zone = await commencerDirectement(page);
  await ecrireEPuisPasserLaQuestion(page, zone);

  /* Ç est enseigné : indice immédiat. Puis « A », lettre connue : différé, et la
     ligne de consigne reste vide en attendant (« Continuez à votre rythme. »
     n'existe plus, 2026-11-12 : sa hauteur reste réservée). */
  await expect(indice(page)).toHaveText('Verr. Maj. est actif : appuyez sur ç.');
  await presser(zone, { code: 'Digit9', key: 'ç', verrmaj: true });
  await expect(indice(page)).toHaveText('');
  await expect(page.locator('[data-attendue]')).toHaveCount(0);

  await page.clock.runFor(3100);
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  /* Verr. Maj. est actif : une simple frappe donne A, sans Maj et sans
     désactiver le verrouillage (indice faux avant le 2026-10-02). */
  await expect(indice(page)).toHaveText('Verr. Maj. est actif : appuyez sur A.');
  await expect(page.locator('[data-mod-attendu]')).toHaveCount(0);
  await page.clock.runFor(3600);
  await expect(page.locator('[data-attendue]')).toHaveCount(0);
  await expect(indice(page)).toHaveText('');
});

test('perdre le focus annonce une frappe inactive', async ({ page }) => {
  const zone = await commencerDirectement(page);
  await zone.focus();
  await envoyer(zone, 'keydown', { code: 'ShiftLeft', key: 'Shift', maj: true });
  await expect(page.locator('[data-mode]')).toHaveText('Maj actif');
  await zone.evaluate((element) => element.blur());
  await expect(page.locator('[data-mode]')).toHaveText('Frappe inactive');
});

test('« Passer » les exercices, puis « Recommencer avec un autre usage »', async ({ page }) => {
  await commencerDirectement(page);
  await passerJusquAuBilan(page);

  await expect(racine(page)).toHaveAttribute('data-ecran', 'synthese');
  /* Rien d'essayé : le bilan donne les cinq changements, sans « Vous venez
     d'essayer » ni « En plus ». */
  await expect(titre(page)).toHaveText('Les 5 changements d’AZERTY Global');
  /* Aucune cible réussie juste avant : pas de dernier retour. */
  await expect(page.locator('[data-dernier]')).toBeHidden();
  await expect(page.locator('[data-bilan-faits] li')).toHaveCount(0);
  await expect(page.locator('[data-bilan-reste] li')).toHaveCount(5);
  await expect(page.locator('[data-bilan-plus] li')).toHaveCount(0);
  await expect(page.locator('[data-bilan-faits-titre]')).toBeHidden();

  await page.getByRole('button', { name: 'Recommencer avec un autre usage' }).click();
  await expect(racine(page)).toHaveAttribute('data-ecran', 'parcours');
  await expect(titreEtape(page)).toHaveText('Les majuscules accentuées.');
  await expect(page.locator('#tc-frappe')).toHaveAttribute('aria-label', 'À écrire : É. Saisi : rien');

  /* Passer le parcours n'est pas une fin : pas de testeur_fin. */
  expect(await page.evaluate(() => window.AGMesure.journal.map((e) => [e.nom, e.params]))).toEqual([
    ['testeur_debut', {}],
    ['testeur_cta', { cible: 'refaire' }],
    ['testeur_debut', {}]
  ]);
});

test('partage : copie du lien quand navigator.share manque', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: undefined });
    window.__lienCopie = null;
    Object.defineProperty(Navigator.prototype, 'clipboard', {
      configurable: true,
      get: () => ({ writeText: async (texte) => { window.__lienCopie = texte; } })
    });
  });
  await ouvrir(page, '?ecran=synthese');
  await expect(titre(page)).toHaveText('Pour écrire ainsi au quotidien, installez AZERTY Global.');

  await page.locator('[data-action="partager"]').click();
  await expect(page.locator('[data-action="partager"]')).toHaveText('Lien copié');
  await expect(annonce(page)).toHaveText('Lien copié.');
  expect(await page.evaluate(() => window.__lienCopie)).toBe('https://azerty.global/testeur');
});

test('partage : le texte du bouton natif est celui validé (M3)', async ({ page }) => {
  await page.addInitScript(() => {
    window.__partage = null;
    Object.defineProperty(Navigator.prototype, 'share', {
      configurable: true,
      value: async (donnees) => { window.__partage = donnees; }
    });
  });
  await ouvrir(page, '?ecran=synthese');
  await page.locator('[data-action="partager"]').click();
  await expect.poll(() => page.evaluate(() => window.__partage)).toEqual({
    title: 'AZERTY Global',
    text: 'J’ai essayé AZERTY Global, un AZERTY amélioré, gratuit et libre : É, È, À, Ç en majuscules et @ en accès direct. Enfin.',
    url: 'https://azerty.global/testeur'
  });
});

test('bilan : les liens de fin (C2 et L2) mènent où ils disent', async ({ page }) => {
  await ouvrir(page, '?ecran=synthese');
  /* C2 : le téléchargement est en tête de page, à côté du titre. */
  const telecharger = page.locator('.tc__resultat-actions').getByRole('link', { name: 'Télécharger AZERTY Global' });
  await expect(telecharger).toBeVisible();
  await expect(telecharger).toHaveAttribute('href', '/download');
  await expect(page.locator('.tc__resultat-actions p')).toHaveText('Gratuit et libre, pour Windows, macOS et Linux. Les lettres A à Z et les chiffres restent à leur place.');
  /* L2 : le guide, le partage, puis le retour à l'essai. */
  await expect(page.getByRole('link', { name: 'Le guide et l’aide-mémoire' })).toHaveAttribute('href', '/guide');
  await expect(page.getByRole('button', { name: 'Partager le testeur' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recommencer avec un autre usage' })).toBeVisible();
});

/* P14d : une page caractère mène à /testeur?de=<slug>. La carte
   `slug:module:leçon` vient de `src/_data/landings.js` ; le module choisit
   l'exercice (1 → majuscules, 0 → adresse, 3 → typographie, étape d'usage Documents). */
for (const { slug, titreAttendu } of [
  { slug: 'e-aigu-majuscule', titreAttendu: 'Les majuscules accentuées.' },
  { slug: 'guillemets', titreAttendu: 'La typographie française avec AltGr' },
  { slug: 'arobase', titreAttendu: 'Une adresse, sans détour.' }
]) {
  test(`depuis la page caractère ${slug}`, async ({ page }) => {
    await ouvrir(page, `?de=${slug}`);
    await expect(racine(page)).toHaveAttribute('data-ecran', 'parcours');
    await expect(titreEtape(page)).toHaveText(titreAttendu);
    await expect(page.locator('#tc-frappe')).toBeFocused();
  });
}

test('un caractère sans exercice correspondant ouvre le parcours au début, prêt à taper', async ({ page }) => {
  const carte = await (await page.request.get('/testeur.html')).text();
  /* crochets est au module 4, qu'aucun exercice ne couvre. */
  expect(carte).toContain('crochets:4:');
  for (const requete of ['?de=crochets', '?de=inconnu']) {
    await ouvrir(page, requete);
    await expect(racine(page)).toHaveAttribute('data-ecran', 'parcours');
    await expect(racine(page)).toHaveAttribute('data-vue', 'parcours');
    await expect(titreEtape(page)).toHaveText('Les majuscules accentuées.');
    await expect(indice(page)).toHaveText('Tapez un É : Verr. Maj., puis la touche é.');
  }
});

test('accès direct : ?ecran=parcours&etape=2 et ?ecran=synthese', async ({ page }) => {
  await ouvrir(page, '?ecran=parcours&etape=2');
  await expect(titreEtape(page)).toHaveText('Une adresse, sans détour.');
  await expect(numeroEtape(page)).toHaveText('Étape 2 sur 3');

  await ouvrir(page, '?ecran=synthese');
  await expect(racine(page)).toHaveAttribute('data-ecran', 'synthese');
  /* Les trois exercices comptent pour faits : É È À Ç, le point, l'arobase. */
  await expect(page.locator('[data-bilan-faits] li')).toHaveCount(3);
  await expect(page.locator('[data-bilan-reste] li')).toHaveCount(2);
});

test('accès direct : ?lecon=programmation montre le # en AltGr de la touche B09', async ({ page }) => {
  await ouvrir(page, '?lecon=programmation');
  /* Hors programmation, ce # double celui de la touche ² et reste masqué. */
  await expect(page.locator('[data-position="B09"] [data-slot="altgr"]')).toHaveText('#');
});

test('légendes : profil général filtré, carte complète sur ?profil=complet', async ({ page }) => {
  await ouvrir(page);
  const legende = page.locator('[data-legende]');
  await expect(legende).toHaveText('Les lettres gardent leur place. Les caractères avec AltGr se lisent à droite des touches.');
  await expect(page.locator('#testeur .clavier')).toHaveAttribute('aria-label', /Caractères utiles au français\.$/);
  /* Le # en AltGr de B09 double celui de la touche ² : masqué hors programmation. */
  await expect(page.locator('[data-position="B09"] [data-slot="altgr"]')).toHaveCount(0);
  const generales = await page.locator('#testeur .clavier__glyphe[data-slot]').count();

  await ouvrir(page, '?profil=complet');
  await expect(legende).toHaveText('Carte complète des légendes directes. Les caractères avec AltGr se lisent à droite des touches.');
  await expect(page.locator('#testeur .clavier')).toHaveAttribute('aria-label', /Carte complète des légendes directes\.$/);
  await expect(page.locator('[data-position="B09"] [data-slot="altgr"]')).toHaveText('#');
  expect(await page.locator('#testeur .clavier__glyphe[data-slot]').count()).toBeGreaterThan(generales);
});

test('appareil tactile : le testeur ne démarre pas', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (requete) => (requete === '(hover: none) and (pointer: coarse)'
      ? { matches: true, media: requete, addEventListener() {}, removeEventListener() {} }
      : original(requete));
  });
  await page.goto('/testeur.html', { waitUntil: 'domcontentloaded' });
  await expect(racine(page)).toHaveAttribute('data-tactile', 'true');
  await page.waitForLoadState('load');
  await expect(racine(page)).not.toHaveAttribute('data-ready', 'true');
});

// SEO-02 (audit du 2026-10-09) : un seul h1 dans la page, et il reste affiché
// sous 768 px et sur tactile, où le parcours est masqué : un téléphone,
// Googlebot mobile compris, y lit le sujet de la page. Au bureau, il n'est
// affiché à aucune hauteur (2026-11-12, test « le h1 est masqué à l'œil ») mais
// reste dans la page.
test('un seul h1 : dans la page au bureau, affiché sous 768 px et sur tactile', async ({ page }) => {
  const h1Visibles = () => page.locator('h1:visible');
  /* Un titre « affiché » a une vraie boîte : le masquage visuel du bureau en
     laisse une de 1 px, que `:visible` compte quand même. */
  const hauteurDuH1 = async () => (await page.locator('h1').boundingBox()).height;
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/testeur.html', { waitUntil: 'load' });
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Essayez AZERTY Global.');
  expect(await hauteurDuH1()).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 390, height: 800 });
  await expect(h1Visibles()).toHaveCount(1);
  await expect(h1Visibles()).toHaveText('Essayez AZERTY Global.');
  expect(await hauteurDuH1()).toBeGreaterThan(20);
  await expect(page.getByRole('heading', { level: 2, name: 'À essayer sur ordinateur' })).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (requete) => (requete === '(hover: none) and (pointer: coarse)'
      ? { matches: true, media: requete, addEventListener() {}, removeEventListener() {} }
      : original(requete));
  });
  await page.reload({ waitUntil: 'load' });
  await expect(racine(page)).toHaveAttribute('data-tactile', 'true');
  await expect(h1Visibles()).toHaveCount(1);
  await expect(h1Visibles()).toHaveText('Essayez AZERTY Global.');
  expect(await hauteurDuH1()).toBeGreaterThan(20);
  await expect(page.getByRole('heading', { level: 2, name: 'À essayer sur ordinateur' })).toBeVisible();
});

test('rien n’est écrit sur l’appareil pendant le parcours', async ({ page }) => {
  const zone = await commencerDirectement(page);
  await ecrireEPuisPasserLaQuestion(page, zone);
  await passerJusquAuBilan(page);

  const stockage = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    cookies: document.cookie
  }));
  expect(stockage).toEqual({ local: [], session: [], cookies: '' });
});

test('chargement impossible : message dans la page, pas de composant inerte prêt', async ({ page, network }) => {
  await page.route('**/tester/azerty-global.json', (route) => route.fulfill({ status: 500, body: '' }));
  await page.goto('/testeur.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-sous-titre]')).toHaveText('Le clavier n’a pas pu être chargé. Rechargez la page pour réessayer.');
  await expect(annonce(page)).toHaveText('Chargement du clavier impossible.');
  await expect(racine(page)).not.toHaveAttribute('data-ready', 'true');
  /* L'erreur attendue est journalisée par le composant et par le navigateur
     (ressource en 500) ; elle ne doit pas faire échouer le contrôle commun. */
  network.consoleErrors.length = 0;
});

/* Lot B (2026-11-10) : étape d'usage, frappe tolérante, geste à deux temps. */

const USAGES = {
  documents: 'Des mails et des documents',
  messages: 'Des messages et des réseaux sociaux',
  code: 'Du code',
  langues: 'D’autres langues que le français',
  afrique: 'Une langue d’Afrique'
};

/* Les deux premières étapes jouées : la question d'usage arrive. Les usages
   voulus sont cochés, puis « Continuer » ouvre la troisième étape. */
async function jusqueALUsage(page, zone, usages = []) {
  await ecrireEPuisPasserLaQuestion(page, zone);
  await taper(zone, 'ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN !');
  await taper(zone, '.fr .com .org .net');
  await taper(zone, 'contact@exemple.com');
  await expect(racine(page)).toHaveAttribute('data-ecran', 'usage');
  for (const usage of usages) {
    await page.getByRole('button', { name: USAGES[usage] }).click();
  }
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(racine(page)).toHaveAttribute('data-ecran', 'parcours');
}

for (const { coches, attendu } of [
  { coches: [], attendu: 'La typographie française avec AltGr' },
  { coches: ['messages', 'documents'], attendu: 'La typographie française avec AltGr' },
  { coches: ['messages', 'langues'], attendu: 'Les accents des autres langues' },
  { coches: ['documents', 'code', 'langues'], attendu: 'Les symboles du code sur la rangée de repos' },
  { coches: ['messages', 'code', 'afrique'], attendu: 'Les lettres des langues d’Afrique' }
]) {
  test(`usages cochés [${coches.join(', ') || 'aucun'}] : l’étape est « ${attendu} »`, async ({ page }) => {
    await ouvrir(page);
    /* Les deux premiers exercices passés : la question d'usage s'ouvre. */
    await page.locator('[data-action="passer"]').click();
    await page.locator('[data-action="passer"]').click();
    await expect(racine(page)).toHaveAttribute('data-ecran', 'usage');
    await expect(page.getByRole('heading', { level: 2, name: 'Qu’écrivez-vous au quotidien ?' })).toBeVisible();
    for (const usage of coches) {
      await page.getByRole('button', { name: USAGES[usage] }).click();
    }
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(racine(page)).toHaveAttribute('data-ecran', 'parcours');
    await expect(titreEtape(page)).toHaveText(attendu);
    await expect(numeroEtape(page)).toHaveText('Étape 3 sur 3');
  });
}

test('la question d’usage : une frappe vaut « Continuer » et compte pour la première cible', async ({ page }) => {
  await ouvrir(page);
  await page.locator('[data-action="passer"]').click();
  await page.locator('[data-action="passer"]').click();
  await expect(racine(page)).toHaveAttribute('data-ecran', 'usage');
  await page.getByRole('button', { name: USAGES.messages }).click();

  /* À, geste de Messages : ^ puis à. La touche morte ouvre l'étape. */
  await presser(page.locator('body'), { code: 'BracketLeft', key: 'Dead' });
  await expect(racine(page)).toHaveAttribute('data-ecran', 'parcours');
  await expect(titreEtape(page)).toHaveText('La majuscule accentuée en début de phrase');
  await expect(indice(page)).toHaveText('Maintenant, appuyez sur à.');
});

test('usages cochés en plus : un bouton « Essayer aussi » après le bilan', async ({ page }) => {
  await ouvrir(page);
  await passerJusquAuBilan(page, ['messages', 'documents']);
  /* L'étape d'usage jouée est Documents ; Messages reste à essayer, avec les
     adresses (l'étape passée). K4 : des mots et leurs caractères. */
  await expect(page.locator('[data-bonus]')).toHaveText(['Des adresses . @', 'Des messages À Ç']);
  await page.locator('[data-bonus="messages"]').click();
  await expect(titreEtape(page)).toHaveText('La majuscule accentuée en début de phrase');
  await expect(numeroEtape(page)).toHaveText('Étape 3 sur 3');
});

test('un seul usage coché : un seul « Essayer aussi », les adresses passées', async ({ page }) => {
  await ouvrir(page);
  await passerJusquAuBilan(page, ['code']);
  await expect(page.locator('[data-bonus]')).toHaveText(['Des adresses . @']);
  /* « Ou encore » n'apparaît qu'avec un second lien. */
  await expect(page.locator('.tc__ou-encore')).toHaveCount(0);
});

test('Messages : le geste préféré est ^ puis la lettre, à deux temps', async ({ page }) => {
  await ouvrir(page);
  const zone = page.locator('#tc-frappe');
  await jusqueALUsage(page, zone, ['messages']);
  await expect(titreEtape(page)).toHaveText('La majuscule accentuée en début de phrase');
  await expect(page.locator('#tc-frappe')).toHaveAttribute('aria-label', /^À écrire : À table/);

  /* À s'obtient aussi par Verr. Maj. + 0 ; l'étape enseigne ^ puis à. */
  await expect(indice(page)).toHaveText('Appuyez sur ^, puis sur à.');
  await presser(zone, { code: 'BracketLeft', key: 'Dead' });
  await expect(alerte(page)).toBeHidden();
  await expect(indice(page)).toHaveText('Maintenant, appuyez sur à.');
  await presser(zone, { code: 'Digit0', key: 'à' });
  await expect(ligne(page).locator('span').first()).toHaveText('À');
  await expect(ligne(page).locator('span').first()).toHaveAttribute('data-etat', 'juste');
});

test('frappe tolérante : l’espace ordinaire vaut la fine, ' + "l’apostrophe droite vaut ’", async ({ page }) => {
  await ouvrir(page);
  const zone = page.locator('#tc-frappe');
  await jusqueALUsage(page, zone, ['messages']);

  await presser(zone, { code: 'BracketLeft', key: 'Dead' });
  await presser(zone, { code: 'Digit0', key: 'à' });
  await taper(zone, ' table');
  /* Espace ordinaire à la place de la fine avant « ! » : acceptée, et la
     ligne garde le caractère du modèle. */
  await presser(zone, { code: 'Space', key: ' ' });
  await expect(alerte(page)).toBeHidden();
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : À table\u202F! Ça refroidit\u202F!. Saisi : À table\u202F');
});

test('Documents, frappe stricte : l’espace ordinaire est refusée et nommée, les deux insécables se valent', async ({ page }) => {
  await ouvrir(page, '?ecran=parcours&etape=3');
  const zone = page.locator('#tc-frappe');
  await presser(zone, { code: 'KeyZ', key: 'w', altgr: true });

  await presser(zone, { code: 'Space', key: ' ' });
  await expect(alerte(page)).toHaveText('espace au lieu de espace fine insécable.');
  await expect(annonce(page)).toContainText('espace au lieu de espace fine insécable.');
  await expect(ligne(page).locator('span').nth(1)).toHaveAttribute('data-etat', 'attendu');

  /* L'insécable ordinaire (Maj + AltGr + Espace) vaut la fine (AltGr + Espace). */
  await presser(zone, { code: 'Space', key: ' ', maj: true, altgr: true });
  await expect(ligne(page).locator('span').nth(1)).toHaveAttribute('data-etat', 'juste');
  await expect(alerte(page)).toBeHidden();
});

test('retour arrière sur une espace : elle est nommée', async ({ page }) => {
  await ouvrir(page, '?ecran=parcours&etape=3');
  const zone = page.locator('#tc-frappe');
  await presser(zone, { code: 'KeyZ', key: 'w', altgr: true });
  await presser(zone, { code: 'Space', key: ' ', altgr: true });
  await presser(zone, { code: 'Backspace', key: 'Backspace' });
  await expect(annonce(page)).toHaveText('espace fine insécable effacé. À écrire\u00A0: espace fine insécable.');
});

/* Retouches du 2026-11-12 : ce que le visiteur voit ne bouge pas, ne déborde pas,
   et la question sur la méthode ne laisse rien passer. */

/* Le clavier ne bouge pas : son haut est celui de l'arrivée (à 1 px près) pendant
   la question, après la réponse et à l'écran d'usage. */
for (const [largeur, hauteur] of [[1440, 900], [1366, 641]]) {
  test(`${largeur} × ${hauteur} : le haut du clavier est le même à l’arrivée, pendant la question, après la réponse et à l’écran d’usage`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: hauteur });
    const zone = await commencerDirectement(page);
    const haut = async () => (await page.locator('#testeur .clavier').boundingBox()).y;
    const arrivee = await haut();
    const memeHaut = async (ou) => expect(Math.abs((await haut()) - arrivee), `${ou} : le haut du clavier`).toBeLessThanOrEqual(1);

    await presser(zone, E_REUSSI);
    await expect(racine(page)).toHaveAttribute('data-question', '');
    await expect(page.locator('[data-methode]')).toBeVisible();
    await memeHaut('pendant la question');

    await page.getByRole('button', { name: 'Je le copie-colle' }).click();
    await expect(page.locator('[data-methode-reponse]')).toBeVisible();
    await expect(racine(page)).not.toHaveAttribute('data-question', /.*/);
    await memeHaut('après la réponse');

    /* Les deux « Passer » mènent des deux premières étapes à la question d'usage. */
    await page.locator('[data-action="passer"]:visible').click();
    await page.locator('[data-action="passer"]:visible').click();
    await expect(racine(page)).toHaveAttribute('data-ecran', 'usage');
    await memeHaut('à l’écran d’usage');
  });
}

/* La colonne ne dépasse pas le clavier : la consigne, la saisie et la barre
   s'alignent sur ses bords (« moche que le champ de texte soit plus large que le
   clavier »). */
for (const [largeur, hauteur] of [[1440, 900], [1366, 641], [1920, 1080]]) {
  test(`${largeur} × ${hauteur} : la saisie, la barre et le haut de page ne sont pas plus larges que le clavier`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: hauteur });
    const zone = await commencerDirectement(page);
    const largeurDe = async (selecteur) => {
      const boite = await page.locator(selecteur).boundingBox();
      if (!boite) throw new Error(`${selecteur} n’a pas de boîte`);
      return boite.width;
    };
    const verifier = async (ou) => {
      const clavier = await largeurDe('#testeur .clavier');
      for (const selecteur of ['.tc__frappe', '.tc__barre', '.tc__haut']) {
        expect(await largeurDe(selecteur), `${ou} : ${selecteur} ≤ clavier (${clavier} px)`).toBeLessThanOrEqual(clavier + 0.5);
      }
    };
    await verifier('arrivée');

    /* Après la question, avec la bande et sa phrase : saisie et barre sont revenues. */
    await presser(zone, E_REUSSI);
    await page.getByRole('button', { name: 'Je le copie-colle' }).click();
    await expect(page.locator('[data-methode-reponse]')).toBeVisible();
    await verifier('après la réponse');
  });
}

/* Pendant la question, le parcours attend : toute frappe est ignorée, sauf Entrée
   et Échap, qui valent « Passer la question ». La frappe arrive sur la page : la
   zone de saisie est masquée pendant la question, elle ne garde pas le focus. */
test('pendant la question : une frappe de lettre ne change rien ; Entrée ou Échap la ferme', async ({ page }) => {
  for (const touche of ['Enter', 'Escape']) {
    await ouvrir(page);
    const zone = page.locator('#tc-frappe');
    await presser(zone, E_REUSSI);
    await expect(racine(page)).toHaveAttribute('data-question', '');
    const etat = () => page.evaluate(() => ({
      cible: document.querySelector('#tc-frappe').getAttribute('aria-label'),
      ligne: document.querySelector('[data-ligne]').textContent,
      alerte: document.querySelector('[data-alerte]').hidden,
      question: document.querySelector('[data-methode]').hidden,
      indice: document.querySelector('[data-indice]').textContent,
      note: document.querySelector('[data-note]').hidden,
      bravo: document.querySelector('[data-bravo-titre]').textContent
    }));
    const avant = await etat();
    expect(avant.cible).toBe('À écrire : É. Saisi : É');
    expect(avant.question).toBe(false);

    /* Une lettre juste pour la cible suivante, une faute, une espace : sur la page
       comme sur la zone. */
    for (const cible of [page.locator('body'), zone]) {
      await presser(cible, { code: 'Digit9', key: 'ç', verrmaj: true });
      await presser(cible, { code: 'KeyW', key: 'z', verrmaj: true });
      await presser(cible, { code: 'Space', key: ' ' });
    }
    expect(await etat()).toEqual(avant);
    await expect(racine(page)).toHaveAttribute('data-question', '');
    await expect(page.locator('[data-methode]')).toBeVisible();

    /* La vraie touche du clavier, comme la presse le visiteur : le focus est sur la
       page (la zone masquée l'a perdu), c'est là que la frappe arrive. */
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    await page.keyboard.press(touche);
    await expect(racine(page), `${touche} ferme la question`).not.toHaveAttribute('data-question', /.*/);
    await expect(page.locator('[data-methode]')).toBeHidden();
    await expect(zone).toHaveAttribute('aria-label', 'À écrire : ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN !. Saisi : rien');
  }
});

/* Les contrôles ont la forme de touches : plus de soulignement, bordure basse de 3 px. */
test('les contrôles ont la forme de touches : outils, « Passer », réponses, « Passer la question » et usages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const zone = await commencerDirectement(page);
  const forme = (selecteur) => page.locator(selecteur).first().evaluate((element) => {
    const style = getComputedStyle(element);
    return { bordureBasse: style.borderBottomWidth, soulignement: style.textDecorationLine };
  });
  const touche = { bordureBasse: '3px', soulignement: 'none' };

  for (const selecteur of ['.tc__outils .tc__lien', '.tc__barre-gauche .tc__lien']) {
    expect(await forme(selecteur), selecteur).toEqual(touche);
  }
  await presser(zone, E_REUSSI);
  await expect(racine(page)).toHaveAttribute('data-question', '');
  for (const selecteur of ['.tc__choix button', '[data-action="passer-question"]']) {
    expect(await forme(selecteur), selecteur).toEqual(touche);
  }
  await passerLaQuestion(page);
  await page.locator('[data-action="passer"]:visible').click();
  await page.locator('[data-action="passer"]:visible').click();
  await expect(racine(page)).toHaveAttribute('data-ecran', 'usage');
  expect(await forme('.tc__usages button')).toEqual(touche);
});
