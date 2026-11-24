/* Vue « Taper librement » du testeur (lot 2 de la refonte, 2026-11-12).

   Une zone de texte que le moteur de frappe de AZERTY Global émule : le
   caractère écrit est celui de la table (`info.caractere`), jamais celui du
   système. Le clavier partagé s'allume sous la zone ; pour le dernier
   caractère spécial écrit, une ligne dit le geste (« É : Verr. Maj., puis é. »)
   et garde ses touches allumées jusqu'à la frappe suivante ; trois boutons à
   bascule (Maj, AltGr, Verr. Maj.) montrent les légendes d'un niveau.

   Tout passe par `window.Testeur` (interface documentée en tête de
   `js/v2/testeur.js`) : `pret`/`enregistrerVue`, `allumer`, `eteindre`,
   `poserNiveau`, `annoncer`. Ce fichier ne touche ni `testeur.js` ni
   `testeur.njk` ; le moteur (`info.moteur`) fournit `ligneGeste`,
   `trouverGeste`, `composer`, `texteAbsent`, `lireCaractere`.

   Rien n'est enregistré sur l'appareil, rien n'est envoyé : ni stockage ni
   mesure. Le texte tapé vit dans la zone, le temps de la visite.

   Ce que la vue laisse au navigateur, sans `preventDefault` : tout raccourci
   (Ctrl ou Meta, hors AltGr qui arrive comme Ctrl + Alt sous Windows), Tab,
   Échap, Retour arrière, Suppr, Entrée, flèches, Début, Fin, Page ↑/↓, la
   composition de saisie. Coller est natif. Les insertions passent par
   `execCommand('insertText')` pour que Ctrl + Z les défasse ; `setRangeText`
   ne sert que si le navigateur le refuse.

   `data-pret` sur le point de montage dit que la vue est active (la spec
   `tests/e2e/testeur-vues.spec.js` s'en sert).

   CSP : `script-src 'self'`. Aucun `style=`, aucun `<style>`. */

(function () {
  'use strict';

  var Testeur = window.Testeur;
  if (!Testeur) return;
  var montage = Testeur.montage('libre');
  if (!montage) return;

  /* Espace fine insécable devant « : ». `ligneGeste` du moteur écrit une espace
     ordinaire : la vue pose la fine. */
  var FINE = ' ';
  /* Ni une lettre ASCII non accentuée, ni un chiffre, ni l'espace ordinaire :
     ces caractères-là ne méritent jamais une ligne de geste. */
  var ORDINAIRE = /^[A-Za-z0-9 ]$/;
  /* Touches qui gardent leur effet natif, quel que soit le niveau. */
  var NATIVES = /^(Backspace|Delete|Enter|Tab|Escape|Home|End|PageUp|PageDown|Arrow(Up|Down|Left|Right)|Insert|ContextMenu)$/;

  /* Dit quand une touche morte attend sa lettre (le début reprend l'alerte du
     parcours ; ici Échap annule, l'espace écrirait l'accent seul). */
  var TEXTE_MORTE = 'Touche morte : tapez le caractère à combiner, ou Échap pour annuler.';

  /* Au repos, la ligne de geste dit quoi essayer (texte d'Antoine, QCM du
     2026-11-12 : pas « € », déjà sur l'AZERTY traditionnel). */
  var INDICE = 'Essayez É, œ ou —.';

  var ligneGeste = null;   /* le paragraphe de la ligne de geste */
  var moteur = null;
  var morte = null;      /* identifiant de la touche morte en attente, ou null */
  var zone = null;         /* la zone de texte, construite à la première entrée */
  var car = null;          /* le caractère de la ligne de geste */
  var geste = null;        /* le geste, après le caractère */
  var absent = null;       /* « Aucun caractère sur la touche… » */
  var boutons = {};

  function creer(balise, classe, texte) {
    var element = document.createElement(balise);
    if (classe) element.className = classe;
    if (texte) element.textContent = texte;
    return element;
  }

  /* Le niveau des boutons : AltGr×4 + Verr. Maj.×2 + Maj×1. */
  function niveauBascule() {
    return (boutons.altgr.getAttribute('aria-pressed') === 'true' ? 4 : 0)
      + (boutons.verrmaj.getAttribute('aria-pressed') === 'true' ? 2 : 0)
      + (boutons.maj.getAttribute('aria-pressed') === 'true' ? 1 : 0);
  }

  function appliquerBascule() {
    var niveau = niveauBascule();
    Testeur.poserNiveau(niveau === 0 ? null : niveau);
  }

  function relacherBoutons() {
    Object.keys(boutons).forEach(function (nom) {
      boutons[nom].setAttribute('aria-pressed', 'false');
    });
  }

  function construire() {
    /* La bascule des niveaux, à droite du titre. */
    var niveaux = creer('div', 'tl__niveaux');
    niveaux.setAttribute('role', 'group');
    niveaux.setAttribute('aria-labelledby', 'tl-niveaux-label');
    var libelle = creer('span', 'tl__niveaux-label', 'Voir les caractères avec');
    libelle.id = 'tl-niveaux-label';
    niveaux.appendChild(libelle);
    var liste = creer('div', 'tl__bascules');
    [['maj', 'Maj'], ['altgr', 'AltGr'], ['verrmaj', 'Verr. Maj.']].forEach(function (definition) {
      var bouton = creer('button', 'tl__bascule', definition[1]);
      bouton.type = 'button';
      bouton.setAttribute('aria-pressed', 'false');
      boutons[definition[0]] = bouton;
      liste.appendChild(bouton);
    });
    niveaux.appendChild(liste);

    /* La zone de texte : deux lignes, pleine largeur, nommée par le titre. */
    zone = creer('textarea', 'tc__frappe tl__texte');
    zone.setAttribute('aria-labelledby', 'tc-titre-libre');
    zone.setAttribute('placeholder', 'Écrivez ce que vous voulez.');
    zone.setAttribute('rows', '2');
    zone.setAttribute('spellcheck', 'false');
    zone.setAttribute('autocomplete', 'off');
    zone.setAttribute('autocapitalize', 'off');
    zone.setAttribute('autocorrect', 'off');

    /* La ligne de geste, et « Effacer » à sa droite. La place est réservée. */
    var pied = creer('div', 'tl__pied');
    var retour = creer('div', 'tl__retour');
    absent = creer('p', 'tl__absent');
    absent.hidden = true;
    var ligne = creer('p', 'tl__geste tl__geste--indice');
    ligneGeste = ligne;
    car = creer('span', 'tl__car');
    geste = creer('span', 'tl__texte-geste', INDICE);
    ligne.appendChild(car);
    ligne.appendChild(geste);
    retour.appendChild(absent);
    retour.appendChild(ligne);
    var effacer = creer('button', 'tc__lien tl__effacer', 'Effacer');
    effacer.type = 'button';
    pied.appendChild(retour);
    pied.appendChild(effacer);

    montage.appendChild(niveaux);
    montage.appendChild(zone);
    montage.appendChild(pied);

    /* Un clic sur un bouton ne lui prend pas le focus : la frappe suivante va à
       la zone, et Espace ne bascule pas le bouton. Au clavier, le focus reste
       sur le bouton, comme partout. */
    niveaux.addEventListener('mousedown', function (evenement) {
      if (evenement.target.closest('button')) evenement.preventDefault();
    });
    niveaux.addEventListener('click', function (evenement) {
      var bouton = evenement.target.closest('button');
      if (!bouton) return;
      bouton.setAttribute('aria-pressed', bouton.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      appliquerBascule();
      if (evenement.detail > 0) zone.focus({ preventScroll: true });
    });
    effacer.addEventListener('click', vider);
    /* Un clic annule une touche morte en attente. */
    zone.addEventListener('mousedown', annulerMorte);
  }

  function masquerAbsent() {
    absent.hidden = true;
    absent.textContent = '';
  }

  /* La ligne de geste et les touches allumées s'en vont ensemble. */
  function viderGeste() {
    car.textContent = '';
    geste.textContent = INDICE;
    ligneGeste.classList.add('tl__geste--indice');
    masquerAbsent();
    Testeur.eteindre();
  }

  /* Une touche morte n'écrit rien : sans retour, la frappe semble perdue. La
     ligne le dit, la touche reste allumée jusqu'à la frappe suivante. `info`
     manque quand la touche morte vient d'une composition (chaînée). */
  function poserMorte(identifiant, info) {
    morte = identifiant;
    car.textContent = '';
    geste.textContent = '';
    absent.textContent = TEXTE_MORTE;
    absent.hidden = false;
    if (info && info.position) Testeur.allumer({ position: info.position, rang: info.niveau }, 1);
    if (!info || !info.evenement.repeat) Testeur.annoncer(TEXTE_MORTE);
  }

  /* Échap ou un clic : la touche morte en attente s'en va, son message aussi. */
  function annulerMorte() {
    if (!morte) return;
    morte = null;
    viderGeste();
  }

  /* « Effacer » : la zone (Ctrl + Z la rend), la ligne, les touches. */
  function vider() {
    zone.focus({ preventScroll: true });
    zone.select();
    var fait = false;
    try { fait = document.execCommand('delete'); } catch (erreur) { fait = false; }
    if (!fait || zone.value !== '') zone.value = '';
    morte = null;
    viderGeste();
  }

  /* Insère à la position du curseur, la sélection est remplacée, le curseur
     passe après le caractère. */
  function ecrire(texte) {
    if (document.activeElement !== zone) zone.focus({ preventScroll: true });
    var fait = false;
    try { fait = document.execCommand('insertText', false, texte); } catch (erreur) { fait = false; }
    if (fait) return;
    zone.setRangeText(texte, zone.selectionStart, zone.selectionEnd, 'end');
    zone.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* Un caractère « spécial » déclenche la ligne de geste : obtenu avec un
     modificateur (Maj, AltGr, Verr. Maj.) ou par une touche morte, et autre
     qu'une lettre ASCII, un chiffre ou l'espace. Sans modificateur, seul un
     caractère que la même touche ne donne pas sur l'AZERTY traditionnel de
     Windows compte (« @ » sur ², « . » sans Maj) : « é » seul, non. */
  function special(caractere, info, compose) {
    if (ORDINAIRE.test(caractere)) return false;
    if (compose || info.niveau !== 0) return true;
    var traditionnelle = info.position && moteur.positionTraditionnelle[info.position];
    return Boolean(traditionnelle) && traditionnelle.base !== caractere;
  }

  /* Le geste du dernier caractère spécial : la ligne, l'annonce, les touches. */
  function montrerGeste(caractere, silencieux) {
    var ligne = moteur.ligneGeste(caractere);
    if (!ligne) return;
    var suite = ligne.slice(caractere.length + 3);   /* « c : » + suite */
    ligneGeste.classList.remove('tl__geste--indice');
    car.textContent = caractere;
    geste.textContent = FINE + ': ' + suite;
    Testeur.allumer(moteur.trouverGeste(caractere), 1);
    if (!silencieux) Testeur.annoncer(moteur.lireCaractere(caractere) + FINE + ': ' + suite);
  }

  function frappe(info) {
    if (!zone || !moteur || info.type !== 'keydown') return;
    var evenement = info.evenement;

    if (evenement.key === 'Escape') { annulerMorte(); return; }
    if (evenement.metaKey || evenement.isComposing
        || evenement.key === 'Process' || evenement.key === 'Unidentified' || !evenement.code) return;
    if (NATIVES.test(evenement.key)) return;
    /* AltGr arrive comme Ctrl + Alt : `niveau` le sait déjà (bit 4). Ctrl ou Alt
       seuls sont des raccourcis. */
    if ((evenement.ctrlKey || evenement.altKey) && !(info.niveau & 4)) return;

    var caractere = info.caractere;
    if (!caractere) {
      /* Touche de la table sans caractère à ce niveau : on n'écrit rien, et le
         système n'écrit pas non plus le sien. Une touche hors table (commande,
         navigation) reste native. */
      if (!moteur.codeConnu(info.code)) return;
      evenement.preventDefault();
      if (evenement.repeat) return;
      var texte = moteur.texteAbsent(info.code, info.niveau);
      absent.textContent = texte;
      absent.hidden = false;
      Testeur.annoncer(texte);
      return;
    }

    evenement.preventDefault();
    masquerAbsent();
    /* La frappe suivante éteint les touches du geste précédent. */
    Testeur.eteindre();

    if (info.morte) {
      /* Rien n'est écrit ; une seconde touche morte remplace la première (comme
         dans le parcours). */
      poserMorte(caractere, info);
      return;
    }

    var ecrit = caractere;
    var compose = false;
    if (morte) {
      var suite = moteur.table.deadkeys[morte] || {};
      morte = null;
      if (Object.prototype.hasOwnProperty.call(suite, caractere)) {
        ecrit = suite[caractere];
        compose = true;
        /* Jamais un identifiant de touche morte dans le texte. */
        if (moteur.estMorte(ecrit)) { poserMorte(ecrit, null); return; }
      } else {
        /* La touche morte ne combine pas ce caractère : l'accent seul (celui
           que donne l'espace), puis le caractère, comme le fait Windows.
           L'accent n'est pas avalé. */
        ecrit = (suite[' '] || '') + caractere;
      }
    }
    ecrire(ecrit);
    /* La ligne de geste dit le caractère composé, ou, sans composition, celui
       de la touche. Une répétition écrit et garde la ligne à jour, mais ne la
       ré-annonce pas. */
    var montre = compose ? ecrit : caractere;
    if (special(montre, info, compose)) montrerGeste(montre, evenement.repeat);
  }

  Testeur.enregistrerVue('libre', {
    entrer: function (infos) {
      moteur = infos.moteur;
      if (!zone) construire();
      morte = null;
      montage.dataset.pret = 'true';
      zone.focus({ preventScroll: true });
    },
    sortir: function () {
      montage.removeAttribute('data-pret');
      morte = null;
      if (!zone) return;
      relacherBoutons();
      Testeur.poserNiveau(null);
      viderGeste();
    },
    frappe: frappe
  });
})();
