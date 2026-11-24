/* Testeur v2 — les vues de /testeur et l'interface `window.Testeur`.

   Lot 1 de la refonte (2026-11-11) : la page a trois vues autour du même
   clavier, le parcours, « Taper librement » et « Chercher un caractère ». Les
   lots 2 et 3 remplissent les deux dernières depuis `testeur-libre.js` et
   `testeur-recherche.js`, sans toucher `testeur.js` ni `testeur.njk` : tout ce
   qu'ils pilotent passe par `window.Testeur`, documentée en tête de
   `js/v2/testeur.js`. Cette spec est le contrat : si elle casse, un lot 2 ou 3
   casse avec elle.

   Les frappes sont des KeyboardEvent synthétiques, comme dans testeur.spec.js. */

const fs = require('fs');
const path = require('path');
const { test, expect } = require('../helpers/local-site');

const siteRoot = process.env.TEST_SITE_ROOT || '.';
const table = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), siteRoot, 'tester', 'azerty-global.json'), 'utf8'));

/* La frappe la plus simple d'un caractère (rang dans la table : AltGr×4 +
   Verr. Maj.×2 + Maj×1), comme dans testeur.spec.js. */
function frappeDe(caractere) {
  const trouves = [];
  for (const [code, valeurs] of Object.entries(table.keymap)) {
    if (code.startsWith('Numpad')) continue;
    valeurs.forEach((valeur, rang) => {
      if (valeur === caractere) trouves.push({ code, rang });
    });
  }
  const poids = (rang) => [rang & 4, rang & 2, rang & 1].filter(Boolean).length;
  trouves.sort((a, b) => poids(a.rang) - poids(b.rang) || a.rang - b.rang);
  if (!trouves.length) throw new Error(`Aucune frappe pour ${caractere} dans tester/azerty-global.json`);
  const { code, rang } = trouves[0];
  return { code, altgr: Boolean(rang & 4), verrmaj: Boolean(rang & 2), maj: Boolean(rang & 1) };
}

async function taper(zone, texte) {
  for (const caractere of Array.from(texte)) {
    const frappe = frappeDe(caractere);
    await envoyer(zone, 'keydown', frappe);
    await envoyer(zone, 'keyup', frappe);
  }
}

async function envoyer(zone, type, { code, key = code, maj = false, verrmaj = false, altgr = false }) {
  await zone.evaluate((cible, init) => {
    const evenement = new KeyboardEvent(init.type, {
      key: init.key,
      code: init.code,
      bubbles: true,
      cancelable: true,
      shiftKey: init.maj
    });
    Object.defineProperty(evenement, 'getModifierState', {
      configurable: true,
      value: (nom) => (nom === 'CapsLock' && init.verrmaj) || (nom === 'AltGraph' && init.altgr)
    });
    cible.dispatchEvent(evenement);
  }, { type, code, key, maj, verrmaj, altgr });
}

async function ouvrir(page, requete = '') {
  await page.goto(`/testeur.html${requete}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#testeur')).toHaveAttribute('data-ready', 'true');
}

const racine = (page) => page.locator('#testeur');

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

test('les quatre coquilles des vues sont chargées par la page', async ({ page }) => {
  await ouvrir(page);
  for (const src of ['/js/v2/testeur-libre.js', '/js/v2/testeur-recherche.js']) {
    await expect(page.locator(`script[src^="${src}"]`)).toHaveCount(1);
  }
  for (const href of ['/css/v2/testeur-libre.css', '/css/v2/testeur-recherche.css']) {
    await expect(page.locator(`link[rel="stylesheet"][href^="${href}"]`)).toHaveCount(1);
  }
  /* Les points de montage existent, avec leur titre, cachés dans le parcours. */
  await expect(page.locator('[data-montage="libre"] h2')).toHaveText('Taper librement');
  await expect(page.locator('[data-montage="recherche"] h2')).toHaveText('Chercher un caractère');
  await expect(page.locator('[data-montage="libre"]')).toBeHidden();
  await expect(page.locator('[data-montage="recherche"]')).toBeHidden();
});

test('window.Testeur : les dix membres documentés, posés avant la fin du chargement', async ({ page }) => {
  await ouvrir(page);
  const forme = await page.evaluate(() => {
    const t = window.Testeur;
    return {
      pret: typeof t.pret.then,
      moteur: typeof t.moteur,
      fonctions: ['vue', 'surVue', 'enregistrerVue', 'allumer', 'eteindre', 'poserNiveau', 'annoncer', 'montage']
        .map((nom) => [nom, typeof t[nom]])
    };
  });
  expect(forme.pret).toBe('function');
  expect(forme.moteur).toBe('object');
  expect(forme.fonctions).toEqual([
    ['vue', 'function'], ['surVue', 'function'], ['enregistrerVue', 'function'],
    ['allumer', 'function'], ['eteindre', 'function'], ['poserNiveau', 'function'],
    ['annoncer', 'function'], ['montage', 'function']
  ]);
});

test('Testeur.pret : résolue avec le moteur, et le moteur sait trouver un geste', async ({ page }) => {
  await ouvrir(page);
  const resultat = await page.evaluate(async () => {
    const moteur = await window.Testeur.pret;
    return {
      identique: moteur === window.Testeur.moteur,
      ligne: moteur.ligneGeste('É'),
      positions: Object.keys(moteur.positionParCode).length > 40
    };
  });
  expect(resultat.identique).toBe(true);
  expect(resultat.ligne).toBe('É : Verr. Maj., puis é.');
  expect(resultat.positions).toBe(true);
});

test('Testeur.pret : sans les données, elle ne se résout pas (et ne rejette pas)', async ({ page, network }) => {
  await page.route('**/tester/azerty-global.json', (route) => route.fulfill({ status: 500, body: '' }));
  await page.goto('/testeur.html', { waitUntil: 'load' });
  await expect(page.locator('[data-sous-titre]')).toBeVisible();
  const etat = await page.evaluate(async () => {
    const sentinelle = Symbol('en attente');
    const issue = await Promise.race([
      window.Testeur.pret.then(() => 'résolue', () => 'rejetée'),
      new Promise((resoudre) => setTimeout(() => resoudre(sentinelle), 300))
    ]);
    return issue === sentinelle ? 'en attente' : issue;
  });
  expect(etat).toBe('en attente');
  /* L'erreur attendue est journalisée par le composant : elle n'est pas une régression. */
  network.consoleErrors.length = 0;
});

test('Testeur.vue : lire, changer, refuser un nom inconnu', async ({ page }) => {
  await ouvrir(page);
  expect(await page.evaluate(() => window.Testeur.vue())).toBe('parcours');
  expect(await page.evaluate(() => window.Testeur.vue('inconnue'))).toBe(false);
  expect(await page.evaluate(() => window.Testeur.vue('libre'))).toBe('libre');
  await expect(racine(page)).toHaveAttribute('data-vue', 'libre');
  expect(await page.evaluate(() => window.Testeur.vue('recherche'))).toBe('recherche');
  await expect(racine(page)).toHaveAttribute('data-vue', 'recherche');
  expect(await page.evaluate(() => window.Testeur.vue('parcours'))).toBe('parcours');
  await expect(racine(page)).toHaveAttribute('data-vue', 'parcours');
});

test('les deux outils : un lien chacun, le montage s’affiche, le parcours se cache, le clavier reste', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ouvrir(page);
  const clavier = page.locator('.tc__instrument');
  await expect(clavier).toBeVisible();

  await page.getByRole('button', { name: 'Taper librement' }).click();
  await expect(racine(page)).toHaveAttribute('data-vue', 'libre');
  await expect(page.locator('[data-montage="libre"]')).toBeVisible();
  await expect(page.locator('[data-montage="libre"]')).toHaveAttribute('data-pret', 'true');
  await expect(page.locator('.tc__exercice')).toBeHidden();
  await expect(page.locator('[data-etape-numero]')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Taper librement' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: 'Revenir au parcours' })).toBeVisible();
  await expect(clavier).toBeVisible();
  expect(await clavier.evaluate((element) => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(900);

  /* D'un outil à l'autre sans repasser par le parcours. */
  await page.getByRole('button', { name: 'Chercher un caractère' }).click();
  await expect(racine(page)).toHaveAttribute('data-vue', 'recherche');
  await expect(page.locator('[data-montage="recherche"]')).toBeVisible();
  await expect(page.locator('[data-montage="recherche"]')).toHaveAttribute('data-pret', 'true');
  await expect(page.locator('[data-montage="libre"]')).toBeHidden();
  await expect(page.locator('[data-montage="libre"]')).not.toHaveAttribute('data-pret', 'true');

  await page.getByRole('button', { name: 'Revenir au parcours' }).click();
  await expect(racine(page)).toHaveAttribute('data-vue', 'parcours');
  await expect(page.locator('.tc__exercice')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revenir au parcours' })).toBeHidden();
  await expect(page.locator('[data-montage="recherche"]')).not.toHaveAttribute('data-pret', 'true');
});

test('changer de vue puis revenir : le parcours reprend là où il était', async ({ page }) => {
  await ouvrir(page);
  const zone = page.locator('#tc-frappe');
  /* Un É réussi, sa question passée (la phrase suivante ne vient qu'après, 2026-11-12),
     puis la phrase suivante entamée : Ç. */
  await envoyer(zone, 'keydown', { code: 'Digit2', key: 'é', verrmaj: true });
  await envoyer(zone, 'keyup', { code: 'Digit2', key: 'é', verrmaj: true });
  await page.locator('[data-action="passer-question"]').click();
  await expect(racine(page)).not.toHaveAttribute('data-question', /.*/);
  await envoyer(zone, 'keydown', { code: 'Digit9', key: 'ç', verrmaj: true });
  await envoyer(zone, 'keyup', { code: 'Digit9', key: 'ç', verrmaj: true });
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN !. Saisi : Ç');

  await page.getByRole('button', { name: 'Chercher un caractère' }).click();
  await page.getByRole('button', { name: 'Revenir au parcours' }).click();
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN !. Saisi : Ç');
  await expect(page.locator('[data-etape-numero]')).toHaveText('Étape 1 sur 3');
  /* Le guidage reprend sur la lettre suivante, la zone reprend la frappe. */
  await expect(zone).toBeFocused();
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
});

/* Le É n'a plus de pause de réussite (la question sur la méthode attend sa réponse,
   2026-11-12) : la pause se joue sur la première cible de l'étape 2. */
test('changer de vue pendant la pause de réussite : la cible suivante est prête au retour', async ({ page }) => {
  await page.clock.install();
  await ouvrir(page, '?ecran=parcours&etape=2');
  await page.clock.pauseAt(Date.now() + 2000);
  const zone = page.locator('#tc-frappe');
  await taper(zone, '.fr .com .org .net');
  await expect(zone).toHaveAttribute('data-reussie', '');

  await page.getByRole('button', { name: 'Taper librement' }).click();
  await page.getByRole('button', { name: 'Revenir au parcours' }).click();
  await expect(zone).toHaveAttribute('aria-label', 'À écrire : contact@exemple.com. Saisi : rien');
  await expect(zone).not.toHaveAttribute('data-reussie', /.*/);
});

test('?vue=libre et ?vue=recherche : la page s’ouvre sur l’outil', async ({ page }) => {
  await ouvrir(page, '?vue=libre');
  await expect(racine(page)).toHaveAttribute('data-vue', 'libre');
  await expect(page.locator('[data-montage="libre"]')).toHaveAttribute('data-pret', 'true');

  await ouvrir(page, '?vue=recherche');
  await expect(racine(page)).toHaveAttribute('data-vue', 'recherche');
  await expect(page.locator('[data-montage="recherche"]')).toHaveAttribute('data-pret', 'true');
});

test('Testeur.surVue : le rappel reçoit la vue et la précédente, jusqu’au désabonnement', async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => {
    window.__vues = [];
    window.__desabonner = window.Testeur.surVue((nom, precedent) => window.__vues.push([nom, precedent]));
    window.Testeur.vue('libre');
    window.Testeur.vue('recherche');
    window.Testeur.vue('recherche');
    window.__desabonner();
    window.Testeur.vue('parcours');
  });
  /* Un changement vers la même vue n'en est pas un ; après le désabonnement,
     plus d'appel. */
  expect(await page.evaluate(() => window.__vues)).toEqual([['libre', 'parcours'], ['recherche', 'libre']]);
});

test('Testeur.enregistrerVue : entrer, sortir et frappe, avec le détail de chaque frappe', async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => {
    window.__journal = [];
    window.Testeur.enregistrerVue('libre', {
      entrer: (info) => window.__journal.push(['entrer', info.vue, info.precedent, info.montage === window.Testeur.montage('libre'), Boolean(info.moteur)]),
      sortir: () => window.__journal.push(['sortir']),
      frappe: (info) => window.__journal.push(['frappe', info.type, info.code, info.position, info.niveau, info.caractere, info.morte])
    });
    window.Testeur.vue('libre');
  });
  const corps = page.locator('body');
  /* É : Verr. Maj. + é (niveau 2). */
  await envoyer(corps, 'keydown', { code: 'Digit2', key: 'é', verrmaj: true });
  const position = await page.evaluate(() => window.Testeur.moteur.positionParCode.Digit2);
  await expect(page.locator(`[data-position="${position}"]`)).toHaveAttribute('data-appuyee', '');
  await envoyer(corps, 'keyup', { code: 'Digit2', key: 'é', verrmaj: true });
  await expect(page.locator(`[data-position="${position}"]`)).not.toHaveAttribute('data-appuyee', /.*/);
  /* ^ : touche morte. */
  await envoyer(corps, 'keydown', { code: 'BracketLeft', key: 'Dead' });
  /* Une touche de commande : pas de caractère. */
  await envoyer(corps, 'keydown', { code: 'ShiftLeft', key: 'Shift', maj: true });
  await page.evaluate(() => window.Testeur.vue('parcours'));

  const journal = await page.evaluate(() => window.__journal);
  expect(journal[0]).toEqual(['entrer', 'libre', 'parcours', true, true]);
  expect(journal[1]).toEqual(['frappe', 'keydown', 'Digit2', position, 2, 'É', false]);
  expect(journal[2]).toEqual(['frappe', 'keyup', 'Digit2', position, 2, 'É', false]);
  const morte = journal[3];
  expect(morte.slice(0, 3)).toEqual(['frappe', 'keydown', 'BracketLeft']);
  expect(typeof morte[5]).toBe('string');
  expect(morte[6]).toBe(true);
  expect(journal[4].slice(0, 3)).toEqual(['frappe', 'keydown', 'ShiftLeft']);
  expect(journal[4][5]).toBe(null);
  expect(journal[journal.length - 1]).toEqual(['sortir']);

  /* Le parcours n'a rien compté de tout cela. */
  await expect(page.locator('#tc-frappe')).toHaveAttribute('aria-label', 'À écrire : É. Saisi : rien');
  expect(await page.evaluate(() => window.AGMesure.journal.length)).toBe(0);
});

test('Testeur.enregistrerVue : une vue enregistrée quand elle est déjà active est appelée tout de suite', async ({ page }) => {
  await ouvrir(page, '?vue=recherche');
  const appels = await page.evaluate(() => {
    const noms = [];
    window.Testeur.enregistrerVue('recherche', { entrer: (info) => noms.push(info.vue) });
    return noms;
  });
  expect(appels).toEqual(['recherche']);
  expect(await page.evaluate(() => window.Testeur.enregistrerVue('parcours', {}))).toBe(false);
});

test('appuyees: false coupe l’allumage de la touche enfoncée (recherche dans un champ)', async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => {
    window.Testeur.enregistrerVue('recherche', { appuyees: false, frappe: () => {} });
    window.Testeur.vue('recherche');
  });
  await envoyer(page.locator('body'), 'keydown', { code: 'Digit2', key: 'é' });
  await expect(page.locator('[data-appuyee]')).toHaveCount(0);
});

test('Testeur.allumer : un geste direct, ses modificateurs, puis eteindre', async ({ page }) => {
  await ouvrir(page);
  const temps = await page.evaluate(() => window.Testeur.allumer(window.Testeur.moteur.trouverGeste('É')));
  expect(temps).toBe(1);
  /* É : Verr. Maj., puis la touche é. */
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  await expect(page.locator('[data-mod="verrmaj"]')).toHaveAttribute('data-mod-attendu', '');

  await page.evaluate(() => window.Testeur.eteindre());
  await expect(page.locator('[data-attendue]')).toHaveCount(0);
  await expect(page.locator('[data-mod-attendu]')).toHaveCount(0);
});

test('Testeur.allumer : une touche morte se joue en deux temps', async ({ page }) => {
  await ouvrir(page);
  const resultat = await page.evaluate(() => {
    const geste = window.Testeur.moteur.trouverGeste('ã');
    const temps = window.Testeur.allumer(geste);
    const premiere = Array.from(document.querySelectorAll('[data-attendue]'), (touche) => touche.dataset.position);
    window.Testeur.allumer(geste, 2);
    const seconde = Array.from(document.querySelectorAll('[data-attendue]'), (touche) => touche.dataset.position);
    return { sequence: Boolean(geste.sequence), temps, premiere, seconde };
  });
  expect(resultat.sequence).toBe(true);
  expect(resultat.temps).toBe(2);
  expect(resultat.premiere).toHaveLength(1);
  expect(resultat.seconde).toHaveLength(1);
  expect(resultat.seconde).not.toEqual(resultat.premiere);
});

test('Testeur.allumer : une touche factice, un tableau de touches, et un geste vide', async ({ page }) => {
  await ouvrir(page);
  /* ZZ99 n'existe pas : rien à allumer, mais le nombre de temps est rendu. */
  const sansEffet = await page.evaluate(() => window.Testeur.allumer({ position: 'ZZ99', rang: 0 }));
  expect(sansEffet).toBe(1);
  await expect(page.locator('[data-attendue]')).toHaveCount(0);

  const position = await page.evaluate(() => window.Testeur.moteur.positionParCode.KeyA);
  /* Maj + AltGr ensemble : les deux modificateurs s'allument. */
  await page.evaluate((pos) => window.Testeur.allumer([{ position: pos, rang: 5 }]), position);
  await expect(page.locator(`[data-position="${position}"]`)).toHaveAttribute('data-attendue', '');
  await expect(page.locator('[data-mod^="maj"][data-mod-attendu]').first()).toBeVisible();
  await expect(page.locator('[data-mod^="altgr"][data-mod-attendu]').first()).toBeVisible();

  expect(await page.evaluate(() => window.Testeur.allumer(null))).toBe(0);
  expect(await page.evaluate(() => window.Testeur.allumer({}))).toBe(0);
  /* Un geste vide laisse l'allumage en place. */
  await expect(page.locator(`[data-position="${position}"]`)).toHaveAttribute('data-attendue', '');
});

test('Testeur.poserNiveau : les légendes d’un niveau forcé, puis le niveau réel', async ({ page }) => {
  await ouvrir(page);
  await expect(page.locator('[data-mode]')).toHaveText('Sans modificateur');

  await page.evaluate(() => window.Testeur.poserNiveau(4));
  await expect(page.locator('[data-mode]')).toHaveText('AltGr actif');
  /* Aucune touche de modification ne s’allume : rien n’est enfoncé. */
  await expect(page.locator('[data-mod-actif]')).toHaveCount(0);
  /* Un niveau forcé tient pendant une frappe qui ne change pas de niveau. */
  await page.evaluate(() => window.Testeur.vue('libre'));
  await page.evaluate(() => window.Testeur.poserNiveau(5));
  await expect(page.locator('[data-mode]')).toHaveText('AltGr + Maj actifs');

  await page.evaluate(() => window.Testeur.poserNiveau(null));
  await expect(page.locator('[data-mode]')).toHaveText('Sans modificateur');
  await page.evaluate(() => window.Testeur.poserNiveau(9));
  await expect(page.locator('[data-mode]')).toHaveText('Sans modificateur');
});

test('quitter une vue éteint les touches allumées et rend le niveau réel', async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => {
    window.Testeur.vue('libre');
    window.Testeur.poserNiveau(4);
    window.Testeur.allumer(window.Testeur.moteur.trouverGeste('É'));
  });
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  await page.evaluate(() => window.Testeur.vue('recherche'));
  await expect(page.locator('[data-mode]')).toHaveText('Sans modificateur');
  await expect(page.locator('[data-mod-attendu]')).toHaveCount(0);
});

test('Testeur.annoncer : écrit dans la zone aria-live', async ({ page }) => {
  await ouvrir(page);
  await page.evaluate(() => window.Testeur.annoncer('É : Verr. Maj., puis é.'));
  await expect(page.locator('[data-annonce]')).toHaveText('É : Verr. Maj., puis é.');
  await expect(page.locator('[data-annonce]')).toHaveAttribute('aria-live', 'polite');
});

test('Testeur.montage : l’élément de chaque vue, rien pour un nom inconnu', async ({ page }) => {
  await ouvrir(page);
  const resultat = await page.evaluate(() => ({
    libre: window.Testeur.montage('libre').dataset.montage,
    recherche: window.Testeur.montage('recherche').dataset.montage,
    inconnu: window.Testeur.montage('parcours')
  }));
  expect(resultat).toEqual({ libre: 'libre', recherche: 'recherche', inconnu: null });
});

test('tactile : l’objet existe, mais le testeur ne démarre pas et pret reste en attente', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (requete) => (requete === '(hover: none) and (pointer: coarse)'
      ? { matches: true, media: requete, addEventListener() {}, removeEventListener() {} }
      : original(requete));
  });
  await page.goto('/testeur.html', { waitUntil: 'load' });
  await expect(racine(page)).toHaveAttribute('data-tactile', 'true');
  expect(await page.evaluate(() => typeof window.Testeur.pret.then)).toBe('function');
  /* Les coquilles s'enregistrent sans erreur, et n'entrent jamais. */
  await expect(page.locator('[data-montage="libre"]')).not.toHaveAttribute('data-pret', 'true');
});

/* Lot 1b (2026-11-11) : le clavier ne bouge jamais. À 1440 × 900, son `top` est
   le même dans les trois vues, avant et après le É (±1 px) ; au bilan il
   n'est plus affiché, et revient à la même place. */
test('1440 × 900 : le clavier est au même top dans le parcours, en vue libre et en recherche, et s’efface au bilan', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ouvrir(page);
  const top = async () => (await page.locator('.tc__instrument').boundingBox()).y;
  const bas = async () => {
    const b = await page.locator('.tc__instrument').boundingBox();
    return b.y + b.height;
  };
  const ref = await top();
  expect(await bas()).toBeLessThanOrEqual(880);

  /* Après le É : la bande de retour est réservée, rien ne bouge. */
  await envoyer(page.locator('body'), 'keydown', { code: 'Digit2', key: 'é', verrmaj: true });
  await envoyer(page.locator('body'), 'keyup', { code: 'Digit2', key: 'é', verrmaj: true });
  await expect(page.locator('[data-bravo]')).toBeVisible();
  await expect(racine(page)).toHaveAttribute('data-question', '');
  expect(Math.abs((await top()) - ref)).toBeLessThanOrEqual(1);
  /* La question passée (la barre et ses deux outils reparaissent), rien ne bouge. */
  await page.locator('[data-action="passer-question"]').click();
  await expect(racine(page)).not.toHaveAttribute('data-question', /.*/);
  expect(Math.abs((await top()) - ref)).toBeLessThanOrEqual(1);

  for (const vue of ['libre', 'recherche', 'parcours', 'libre', 'parcours']) {
    await page.evaluate((nom) => window.Testeur.vue(nom), vue);
    await expect(racine(page)).toHaveAttribute('data-vue', vue);
    expect(Math.abs((await top()) - ref), vue).toBeLessThanOrEqual(1);
    expect(await bas()).toBeLessThanOrEqual(880);
  }

  /* Par les liens de la barre, comme un visiteur. */
  await page.getByRole('button', { name: 'Taper librement' }).click();
  expect(Math.abs((await top()) - ref)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Revenir au parcours' }).click();
  expect(Math.abs((await top()) - ref)).toBeLessThanOrEqual(1);

  /* Les arrivées par adresse : même top. */
  for (const requete of ['?ecran=parcours&etape=2', '?vue=libre', '?vue=recherche']) {
    await ouvrir(page, requete);
    expect(Math.abs((await top()) - ref), requete).toBeLessThanOrEqual(1);
  }
  /* Le bilan n'affiche plus le clavier (retour d'Antoine du 2026-11-12) ; il
     revient au même top dès qu'on ouvre un outil depuis le bilan. */
  await ouvrir(page, '?ecran=synthese');
  await expect(page.locator('.tc__instrument')).toBeHidden();
  await page.getByRole('button', { name: 'Taper librement' }).click();
  await expect(page.locator('.tc__instrument')).toBeVisible();
  expect(Math.abs((await top()) - ref), 'vue libre depuis le bilan').toBeLessThanOrEqual(1);

  /* La question d'usage, entre l'étape 2 et l'étape 3, tient dans la même zone. */
  await ouvrir(page);
  await page.locator('[data-action="passer"]:visible').click();
  await page.locator('[data-action="passer"]:visible').click();
  await expect(racine(page)).toHaveAttribute('data-ecran', 'usage');
  expect(Math.abs((await top()) - ref), 'usage').toBeLessThanOrEqual(1);
  expect(await bas()).toBeLessThanOrEqual(880);
  const continuer = (await page.getByRole('button', { name: 'Continuer' }).boundingBox());
  expect(continuer.y + continuer.height).toBeLessThanOrEqual(900);
});

/* Lot 1c (2026-11-12) : sur une fenêtre de portable, le clavier entier tient
   aussi en vue libre et en recherche, au même endroit que dans le parcours. */
for (const [largeur, hauteur] of [[1366, 641], [1366, 768], [1536, 730], [1440, 900]]) {
  test(`${largeur} × ${hauteur} : le clavier entier tient dans la fenêtre en vue libre et en recherche`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: hauteur });
    await ouvrir(page);
    const mesure = async () => page.evaluate(() => {
      const boite = (selecteur) => {
        const element = document.querySelector(selecteur);
        if (!element) return null;
        const r = element.getBoundingClientRect();
        return r.width || r.height ? { haut: r.top, bas: r.bottom } : null;
      };
      return { defilement: Math.round(window.scrollY), clavier: boite('.tc__instrument'), espace: boite('[data-position="A03"]'), altgr: boite('[data-mod="altgr"]') };
    });
    const reference = (await mesure()).clavier.haut;
    for (const requete of ['?vue=libre', '?vue=recherche']) {
      await ouvrir(page, requete);
      const m = await mesure();
      expect(m.defilement, `${requete} : la page ne défile pas`).toBe(0);
      expect(m.clavier.bas, `${requete} : bas du clavier`).toBeLessThanOrEqual(hauteur - 8);
      for (const nom of ['espace', 'altgr']) {
        expect(m[nom], `${requete} : ${nom} affiché`).not.toBeNull();
        expect(m[nom].bas, `${requete} : ${nom} dans la fenêtre`).toBeLessThanOrEqual(hauteur - 8);
      }
      expect(Math.abs(m.clavier.haut - reference), `${requete} : même haut que le parcours`).toBeLessThanOrEqual(1);
    }
  });
}
