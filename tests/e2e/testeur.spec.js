/* Testeur v2 — page /testeur, composant `js/v2/testeur.js`.

   Remplace, le 2026-10-02, les specs du testeur v1 (`tester*.spec.js`), qui
   pilotaient la modale `#tester-modal` de la chaîne `init-tester.js` : aucune
   page FR ne l'a plus. La modale v1 ne vit que sur les pages EN, couvertes par
   `tester-v1-en.spec.js` jusqu'à la migration EN.

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

/* Intro sautée : « Essayer directement » démarre l'exercice 1. */
async function commencerDirectement(page) {
  await ouvrir(page);
  await page.getByRole('button', { name: 'Essayer directement' }).click();
  await expect(page.locator('#testeur')).toHaveAttribute('data-ecran', 'parcours');
  return page.locator('#tc-frappe');
}

const racine = (page) => page.locator('#testeur');
const titre = (page) => page.locator('[data-titre]');
const indice = (page) => page.locator('[data-indice]');
const annonce = (page) => page.locator('[data-annonce]');
const ligne = (page) => page.locator('[data-ligne]');
const continuer = (page) => page.locator('[data-action="suivant"]');

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

test('intro : usages, méthode actuelle, puis départ sur l’exercice 1', async ({ page }) => {
  await ouvrir(page);
  await expect(racine(page)).toHaveAttribute('data-ecran', 'intro');
  await expect(titre(page)).toHaveText('Essayez AZERTY Global.');

  const code = page.getByRole('button', { name: 'Du code' });
  await expect(code).toHaveAttribute('aria-pressed', 'false');
  await code.click();
  await expect(code).toHaveAttribute('aria-pressed', 'true');
  await code.click();
  await expect(code).toHaveAttribute('aria-pressed', 'false');

  await page.locator('[data-action="questions-suite"]').click();
  await expect(page.locator('[data-question="2"]')).toBeHidden();
  await expect(page.locator('[data-question="1"]')).toBeVisible();
  await expect(page.locator('[data-reponse="copier"]')).toBeFocused();

  await page.getByRole('button', { name: 'Copier-coller' }).click();
  await expect(page.locator('[data-question="3"]')).toBeVisible();
  await expect(page.locator('[data-replique]')).toHaveText('Ici, É se tape avec Verr. Maj. puis é.');
  await expect(page.locator('[data-action="commencer"]')).toBeFocused();

  await page.locator('[data-action="commencer"]').click();
  await expect(racine(page)).toHaveAttribute('data-ecran', 'parcours');
  await expect(titre(page)).toHaveText('Les majuscules accentuées.');
  await expect(page.locator('#tc-frappe')).toBeFocused();
  await expect(page.locator('[data-jalon="0"]')).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('[data-jalon="1"]')).not.toHaveAttribute('aria-current', 'step');
});

test('qui connaît Verr. Maj. + é commence par la typographie', async ({ page }) => {
  await ouvrir(page);
  await page.locator('[data-action="questions-suite"]').click();
  await page.getByRole('button', { name: 'Verr. Maj. + é' }).click();
  await expect(page.locator('[data-replique]')).toHaveText('Vous connaissez déjà ce geste. Nous commencerons par la typographie.');
  await page.locator('[data-action="commencer"]').click();

  await expect(titre(page)).toHaveText('La typographie française.');
  await expect(page.locator('[data-jalon="1"]')).toHaveAttribute('aria-current', 'step');

  await page.locator('[data-action="passer-parcours"]').click();
  await expect(page.locator('[data-bilan="0"]')).toHaveText('Déjà connu');
});

test('exercice 1 : É avec Verr. Maj. + é, guidage et annonce', async ({ page }) => {
  const zone = await commencerDirectement(page);

  /* Caractère enseigné par l'exercice : indice immédiat, touche et
     modificateur désignés, nom de touche gravé sur l'AZERTY traditionnel. */
  await expect(indice(page)).toHaveText('Activez Verr. Maj., puis appuyez sur é.');
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  await expect(page.locator('[data-mod="verrmaj"]')).toHaveAttribute('data-mod-attendu', '');
  await expect(page.locator('[data-mode]')).toHaveText('Sans modificateur');

  await envoyer(zone, 'keydown', { code: 'CapsLock', key: 'CapsLock', verrmaj: true });
  await expect(page.locator('[data-mode]')).toHaveText('Verr. Maj. actif');
  await expect(indice(page)).toHaveText('Verr. Maj. est actif : appuyez sur é.');
  await expect(racine(page)).toHaveAttribute('data-majuscules-actives', '');

  await presser(zone, { code: 'Digit2', key: 'é', verrmaj: true });
  await expect(ligne(page).locator('span')).toHaveText(['É']);
  await expect(ligne(page).locator('span').first()).toHaveAttribute('data-etat', 'juste');
  await expect(annonce(page)).toHaveText('Exercice réussi. Bouton Continuer pour la suite.');
  await expect(indice(page)).toHaveText('C’est écrit. Continuez quand vous voulez.');
  await expect(continuer(page)).toBeVisible();
  await expect(page.locator('#tc-frappe')).toHaveAttribute('aria-label', 'À écrire : É. Saisi : É');
});

test('exercice 1 : erreur annoncée, retour arrière, « Passer » après deux erreurs', async ({ page }) => {
  const zone = await commencerDirectement(page);
  const passer = page.locator('[data-action="passer-exercice"]');

  /* Sans Verr. Maj., la touche é donne é : c'est une erreur sur É. */
  await presser(zone, { code: 'Digit2', key: 'é' });
  await expect(ligne(page).locator('span').first()).toHaveAttribute('data-etat', 'erreur');
  await expect(ligne(page).locator('span').first()).toHaveText('é');
  await expect(annonce(page)).toHaveText('é au lieu de É. Retour arrière pour corriger.');
  await expect(passer).toBeHidden();

  /* Le champ est plein : une frappe de plus n'ajoute rien. */
  await presser(zone, { code: 'KeyQ', key: 'a' });
  await expect(ligne(page).locator('span')).toHaveText(['é']);

  await presser(zone, { code: 'Backspace', key: 'Backspace' });
  await expect(annonce(page)).toHaveText('é effacé. À écrire : É.');
  await expect(ligne(page).locator('span').first()).toHaveAttribute('data-etat', 'attendu');

  await presser(zone, { code: 'Backspace', key: 'Backspace' });
  await expect(annonce(page)).toHaveText('Rien à effacer.');

  /* Deuxième erreur de suite (le retour arrière ne remet pas le compte à
     zéro) : on propose de passer l'exercice. */
  await presser(zone, { code: 'KeyQ', key: 'a' });
  await expect(passer).toBeVisible();

  await passer.click();
  await expect(titre(page)).toHaveText('La typographie française.');
  await page.locator('[data-action="passer-parcours"]').click();
  await expect(page.locator('[data-bilan="0"]')).toHaveText('Pas encore essayé');
});

test('Entrée valide une phrase juste, et seulement une phrase juste', async ({ page }) => {
  const zone = await commencerDirectement(page);

  await presser(zone, { code: 'Enter', key: 'Enter' });
  await expect(titre(page)).toHaveText('Les majuscules accentuées.');
  await expect(ligne(page).locator('span')).toHaveText(['É']);

  await presser(zone, { code: 'Digit2', key: 'é', verrmaj: true });
  await presser(zone, { code: 'Enter', key: 'Enter' });
  /* Deuxième phrase du même exercice. */
  await expect(titre(page)).toHaveText('Les majuscules accentuées.');
  await expect(page.locator('#tc-frappe')).toHaveAttribute('aria-label', /^À écrire : ÇA GÈLE DÉJÀ !\. Saisi : rien$/);
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

  await presser(zone, { code: 'Digit2', key: 'é', verrmaj: true });
  await continuer(page).click();
  await expect(zone).toBeFocused();
  await taper(zone, 'ÇA GÈLE DÉJÀ !');
  await expect(ligne(page).locator('[data-etat="erreur"]')).toHaveCount(0);
  await continuer(page).click();

  await expect(titre(page)).toHaveText('La typographie française.');
  await expect(page.locator('[data-jalon="1"]')).toHaveAttribute('aria-current', 'step');
  /* Geste annoncé : AltGr + W donne «. */
  await presser(zone, { code: 'KeyZ', key: 'w', altgr: true });
  await expect(ligne(page).locator('span').first()).toHaveAttribute('data-etat', 'juste');
  await taper(zone, Array.from('« Un chef-d\'œuvre » — Lætitia').slice(1).join(''));
  await expect(ligne(page).locator('[data-etat="erreur"]')).toHaveCount(0);
  await continuer(page).click();

  await expect(titre(page)).toHaveText('Une adresse, sans détour.');
  await taper(zone, 'jean.dupont');
  /* Geste annoncé : l'arobase sur l'ancienne touche ², sans modificateur. */
  await presser(zone, { code: 'Backquote', key: '²' });
  await taper(zone, 'email.fr #contact');
  await expect(ligne(page).locator('[data-etat="erreur"]')).toHaveCount(0);
  await presser(zone, { code: 'Enter', key: 'Enter' });

  await expect(racine(page)).toHaveAttribute('data-ecran', 'synthese');
  await expect(titre(page)).toHaveText('Votre clavier peut maintenant faire plus avec AZERTY Global.');
  await expect(titre(page)).toBeFocused();
  await expect(page.locator('[data-bilan]')).toHaveText(['Essayé', 'Essayé', 'Essayé']);
  await expect(page.locator('[data-bilan][data-valide]')).toHaveCount(3);
  await expect(page.getByRole('link', { name: 'Télécharger AZERTY Global' })).toBeVisible();
});

test('AltGr arrive aussi comme Ctrl+Alt sous Windows', async ({ page }) => {
  await ouvrir(page, '?ecran=parcours&etape=2');
  const zone = page.locator('#tc-frappe');
  await expect(titre(page)).toHaveText('La typographie française.');

  await envoyer(zone, 'keydown', { code: 'ControlLeft', key: 'Control', ctrl: true });
  await envoyer(zone, 'keydown', { code: 'AltRight', key: 'Alt', ctrl: true, alt: true });
  await expect(page.locator('[data-mode]')).toHaveText('AltGr actif');
  await presser(zone, { code: 'KeyZ', key: 'w', ctrl: true, alt: true });
  await expect(ligne(page).locator('span').first()).toHaveText('«');
  await expect(ligne(page).locator('span').first()).toHaveAttribute('data-etat', 'juste');
});

test('une touche morte compose le caractère suivant', async ({ page }) => {
  const zone = await commencerDirectement(page);

  /* ^ puis e : ê, attendu É, donc une erreur qui montre ê. */
  await presser(zone, { code: 'BracketLeft', key: 'Dead' });
  await expect(page.locator('#tc-frappe')).toHaveAttribute('aria-label', 'À écrire : É. Saisi : rien');
  await presser(zone, { code: 'KeyE', key: 'e' });
  await expect(ligne(page).locator('span').first()).toHaveText('ê');
  await expect(annonce(page)).toHaveText('ê au lieu de É. Retour arrière pour corriger.');
});

test('macOS : Option tient lieu d’AltGr, Backquote et IntlBackslash échangés', async ({ page }) => {
  await fixerPlateforme(page, 'MacIntel');
  await ouvrir(page, '?ecran=parcours&etape=3');
  const zone = page.locator('#tc-frappe');
  await expect(titre(page)).toHaveText('Une adresse, sans détour.');

  await taper(zone, 'jean.dupont');
  /* Sur un Mac ISO, la touche ² envoie IntlBackslash. */
  await presser(zone, { code: 'IntlBackslash', key: '@' });
  await expect(ligne(page).locator('span').nth(11)).toHaveText('@');
  await expect(ligne(page).locator('span').nth(11)).toHaveAttribute('data-etat', 'juste');

  await ouvrir(page, '?ecran=parcours&etape=2');
  await expect(titre(page)).toHaveText('La typographie française.');
  await presser(zone, { code: 'KeyZ', key: 'w', alt: true });
  await expect(ligne(page).locator('span').first()).toHaveText('«');
});

test('les caractères non enseignés ne sont soufflés qu’après trois secondes', async ({ page }) => {
  await page.clock.install();
  const zone = await commencerDirectement(page);
  await presser(zone, { code: 'Digit2', key: 'é', verrmaj: true });
  await continuer(page).click();

  /* Ç est enseigné : indice immédiat. Puis « A », lettre connue : différé. */
  await expect(indice(page)).toHaveText('Verr. Maj. est actif : appuyez sur ç.');
  await presser(zone, { code: 'Digit9', key: 'ç', verrmaj: true });
  await expect(indice(page)).toHaveText('Continuez à votre rythme.');
  await expect(page.locator('[data-attendue]')).toHaveCount(0);

  await page.clock.runFor(3100);
  await expect(page.locator('[data-attendue]')).toHaveCount(1);
  await page.clock.runFor(3600);
  await expect(page.locator('[data-attendue]')).toHaveCount(0);
  await expect(indice(page)).toHaveText('Continuez à votre rythme.');
});

test('perdre le focus annonce une frappe inactive', async ({ page }) => {
  const zone = await commencerDirectement(page);
  await zone.focus();
  await envoyer(zone, 'keydown', { code: 'ShiftLeft', key: 'Shift', maj: true });
  await expect(page.locator('[data-mode]')).toHaveText('Maj actif');
  await zone.evaluate((element) => element.blur());
  await expect(page.locator('[data-mode]')).toHaveText('Frappe inactive');
});

test('« Passer le parcours » puis « Refaire »', async ({ page }) => {
  await commencerDirectement(page);
  await page.locator('[data-action="passer-parcours"]').click();

  await expect(racine(page)).toHaveAttribute('data-ecran', 'synthese');
  await expect(titre(page)).toHaveText('Voici ce que change AZERTY Global.');
  await expect(page.locator('[data-bilan]')).toHaveText(['Pas encore essayé', 'Pas encore essayé', 'Pas encore essayé']);
  await expect(page.locator('[data-bilan][data-valide]')).toHaveCount(0);

  await page.locator('[data-action="refaire"]').click();
  await expect(racine(page)).toHaveAttribute('data-ecran', 'parcours');
  await expect(titre(page)).toHaveText('Les majuscules accentuées.');
  await expect(page.locator('#tc-frappe')).toHaveAttribute('aria-label', 'À écrire : É. Saisi : rien');
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
  await expect(titre(page)).toHaveText('Votre clavier peut maintenant faire plus avec AZERTY Global.');

  await page.locator('[data-action="partager"]').click();
  await expect(page.locator('[data-action="partager"]')).toHaveText('Lien copié');
  await expect(annonce(page)).toHaveText('Lien copié.');
  expect(await page.evaluate(() => window.__lienCopie)).toBe('https://azerty.global/testeur');
});

/* P14d : une page caractère mène à /testeur?de=<slug>. La carte
   `slug:module:leçon` vient de `src/_data/landings.js` ; le module choisit
   l'exercice (1 → majuscules, 3 → typographie, 0 → adresse). */
for (const { slug, titreAttendu } of [
  { slug: 'e-aigu-majuscule', titreAttendu: 'Les majuscules accentuées.' },
  { slug: 'guillemets', titreAttendu: 'La typographie française.' },
  { slug: 'arobase', titreAttendu: 'Une adresse, sans détour.' }
]) {
  test(`depuis la page caractère ${slug}`, async ({ page }) => {
    await ouvrir(page, `?de=${slug}`);
    await expect(racine(page)).toHaveAttribute('data-ecran', 'parcours');
    await expect(titre(page)).toHaveText(titreAttendu);
    await expect(page.locator('#tc-frappe')).toBeFocused();
  });
}

test('un caractère sans exercice correspondant ouvre l’intro', async ({ page }) => {
  const carte = await (await page.request.get('/testeur.html')).text();
  /* crochets est au module 4, qu'aucun exercice ne couvre. */
  expect(carte).toContain('crochets:4:');
  await ouvrir(page, '?de=crochets');
  await expect(racine(page)).toHaveAttribute('data-ecran', 'intro');

  await ouvrir(page, '?de=inconnu');
  await expect(racine(page)).toHaveAttribute('data-ecran', 'intro');
});

test('accès direct : ?ecran=parcours&etape=2 et ?ecran=synthese', async ({ page }) => {
  await ouvrir(page, '?ecran=parcours&etape=2');
  await expect(titre(page)).toHaveText('La typographie française.');

  await ouvrir(page, '?ecran=synthese');
  await expect(racine(page)).toHaveAttribute('data-ecran', 'synthese');
  await expect(page.locator('[data-bilan]')).toHaveText(['Essayé', 'Essayé', 'Essayé']);
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

test('rien n’est écrit sur l’appareil pendant le parcours', async ({ page }) => {
  const zone = await commencerDirectement(page);
  await presser(zone, { code: 'Digit2', key: 'é', verrmaj: true });
  await continuer(page).click();
  await page.locator('[data-action="passer-parcours"]').click();

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
