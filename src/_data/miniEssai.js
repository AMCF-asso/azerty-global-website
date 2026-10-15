/* Mini-essai des 11 pages caractère : données calculées au build.

   Les textes vivent dans src/_data/landings.js (table ESSAIS, QCM d'Antoine du
   2026-09-30). Ce module en tire, pour chaque page :
   - la méthode de chaque caractère (suite de touches : code physique et
     niveau), qui nourrit les indices (« Appuyez sur AltGr + O ») ;
   - le nom gravé des touches utiles sur le clavier physique AZERTY ;
   - la sortie de l'AZERTY traditionnel de Windows pour les mêmes touches,
     caractère par caractère (égal, faux, perdu), pour le retour « A ».

   ⛔ Le build échoue si une phrase ne se retape pas exactement avec la table
   2026.1 (Verr. Maj. compris) ou si un caractère manque de l'index : une page
   ne peut pas demander un geste qui n'existe pas. Port de
   operations/2026-09-29-contenu-lecons/outils/gen_donnees_landings.py, qui a
   vérifié les textes avant le QCM.

   Sources : tester/azerty-global.json (8 niveaux par code physique :
   AltGr × 4 + Verr. Maj. × 2 + Maj × 1, touches mortes en « dk_* »),
   tester/character-index.json (méthodes recommandées), data/AZERTY
   Traditionnel.json. */

const fs = require("fs");
const path = require("path");
const landings = require("./landings.js");

const RACINE = path.join(__dirname, "..", "..");
const lire = (...morceaux) => JSON.parse(fs.readFileSync(path.join(RACINE, ...morceaux), "utf-8"));

const NB = " ";
const FI = " ";
const APOSTROPHE = "’";

/* Position ISO → code physique (KeyboardEvent.code), pour lire la table
   traditionnelle avec les mêmes codes que la table AZERTY Global. */
function positionsVersCodes() {
  const table = {
    E00: "Backquote", E11: "Minus", E12: "Equal", D11: "BracketLeft", D12: "BracketRight",
    C10: "Semicolon", C11: "Quote", C12: "Backslash", B00: "IntlBackslash", B07: "KeyM",
    B08: "Comma", B09: "Period", B10: "Slash", A03: "Space",
  };
  "1234567890".split("").forEach((chiffre, i) => { table[`E${String(i + 1).padStart(2, "0")}`] = "Digit" + chiffre; });
  "QWERTYUIOP".split("").forEach((lettre, i) => { table[`D${String(i + 1).padStart(2, "0")}`] = "Key" + lettre; });
  "ASDFGHJKL".split("").forEach((lettre, i) => { table[`C${String(i + 1).padStart(2, "0")}`] = "Key" + lettre; });
  "ZXCVBN".split("").forEach((lettre, i) => { table[`B${String(i + 1).padStart(2, "0")}`] = "Key" + lettre; });
  return table;
}

const COUCHE = {
  Base: 0, Shift: 1, Caps: 2, "Caps+Shift": 3, AltGr: 4, "Shift+AltGr": 5, "AltGr+Shift": 5,
  "Caps+AltGr": 6, "Caps+Shift+AltGr": 7,
};
const SANS_VERR = [0, 1, 4, 5];
const AVEC_VERR = [2, 3, 6, 7];
const NIVEAU_TRADITIONNEL = ["base", "shift", "caps", "caps_shift", "alt_gr", "shift_alt_gr", "alt_gr", "shift_alt_gr"];

const estEspace = (c) => c === " " || c === NB || c === FI;
const tolere = (texte) => texte.replace(/[  ]/g, " ").replace(/’/g, "'");

const echapper = (texte) => texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* « [[O]] » devient <kbd>O</kbd> ; une ponctuation collée à la touche reste
   sur sa ligne avec elle. Même rendu que le script (js/v2/mini-essai.js), pour
   que la consigne écrite au build ne change pas quand il prend la main. */
function consigneHtml(texte) {
  return echapper(texte).replace(/\[\[(.+?)\]\]([.,;:!?]?)/g, (tout, touche, ponctuation) => {
    const kbd = `<kbd>${touche}</kbd>`;
    return ponctuation ? `<span class="mini-essai__insecable">${kbd}${ponctuation}</span>` : kbd;
  });
}

function construire() {
  const global = lire("tester", "azerty-global.json");
  const index = lire("tester", "character-index.json").characters;
  const traditionnel = lire("data", "AZERTY Traditionnel.json");
  const carte = global.keymap;
  const mortes = global.deadkeys;

  const POS = positionsVersCodes();
  const T = {};
  traditionnel.rows.forEach((rangee) => rangee.keys.forEach((touche) => {
    if (POS[touche.position]) T[POS[touche.position]] = touche;
  }));
  const tablesTrad = {};
  Object.entries(traditionnel.dead_keys).forEach(([nom, d]) => { tablesTrad[nom] = d.table; });

  /* Nom gravé sur le clavier physique AZERTY, comme le testeur ; le chiffre
     sert pour la rangée du haut avec Maj ou AltGr. */
  const noms = {};
  const chiffres = {};
  Object.entries(T).forEach(([code, touche]) => {
    const base = touche.base;
    if (base === " ") noms[code] = "Espace";
    else if (base && base.startsWith("dk_")) noms[code] = "^";
    else if (base && base.length === 1 && /[a-z]/.test(base)) noms[code] = base.toUpperCase();
    else noms[code] = base;
    if (code.startsWith("Digit")) chiffres[code] = code.slice(5);
  });

  const directs = (c, niveaux) => {
    const trouves = [];
    niveaux.forEach((n) => Object.entries(carte).forEach(([code, niv]) => { if (niv[n] === c) trouves.push([code, n]); }));
    return trouves;
  };

  /* Suite de touches pour un caractère. Verr. Maj. allumé : niveaux 2, 3, 6, 7
     seulement. Méthode recommandée de l'index d'abord, sinon touche directe. */
  function methode(c, verr) {
    const niveaux = verr ? AVEC_VERR : SANS_VERR;
    if (estEspace(c)) return [["Space", niveaux[0]]];
    if (c === APOSTROPHE) {
      const d = directs("'", niveaux);
      return d.length ? [d[0]] : null;
    }
    const methodes = ((index[c] || {}).methods || []).slice()
      .sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0));
    for (const m of methodes) {
      const n = COUCHE[m.layer];
      if (n === undefined) throw new Error(`miniEssai : couche inconnue « ${m.layer} » pour « ${c} ».`);
      if (!niveaux.includes(n)) continue;
      if (m.type === "direct") return [[m.key, n]];
      const declencheurs = directs(m.deadkey, niveaux);
      if (declencheurs.length) return [declencheurs[0], [m.key, n]];
    }
    const d = directs(c, niveaux);
    return d.length ? [d[0]] : null;
  }

  function frappeGlobal(touches) {
    let sortie = "";
    let morte = null;
    touches.forEach(([code, n]) => {
      let v = carte[code][n];
      if (v == null) return;
      if (v.startsWith("dk_")) { morte = v; return; }
      if (morte) { v = (mortes[morte] || {})[v] || v; morte = null; }
      sortie += v;
    });
    return sortie;
  }

  /* Les mêmes touches sur l'AZERTY traditionnel de Windows. Le JSON n'a pas de
     niveau Verr. Maj. pour l'espace : Verr. Maj. n'y agit pas, comme le pilote
     kbdfr interrogé par ToUnicodeEx le 2026-09-30 (outils/verr_trad.ps1). */
  function frappeTraditionnelle(touches) {
    let sortie = "";
    let morte = null;
    touches.forEach(([code, n]) => {
      const touche = T[code] || {};
      let v = touche[NIVEAU_TRADITIONNEL[n]];
      if (v == null && (n === 2 || n === 3)) v = touche[NIVEAU_TRADITIONNEL[n - 2]];
      if (v == null) return;
      if (v.startsWith("dk_")) {
        if (morte) sortie += tablesTrad[morte][" "] || "";
        morte = v;
        return;
      }
      if (morte) {
        const table = tablesTrad[morte];
        sortie += table[v] || (table[" "] || "") + v;
        morte = null;
      } else {
        sortie += v;
      }
    });
    if (morte) sortie += tablesTrad[morte][" "] || "";
    return sortie;
  }

  const resultat = {};
  landings.forEach((landing) => {
    const essai = landing.essai;
    if (!essai) throw new Error(`miniEssai : la page « ${landing.slug} » n'a pas de mini-essai (table ESSAIS de landings.js).`);
    const verr = essai.verr === true;
    const methodes = {};
    const codesUtiles = new Set();

    const segments = [essai.texte1, essai.phrase].map((brut) => {
      const texte = brut.normalize("NFC");
      const touches = [];
      const correspondance = [];
      Array.from(texte).forEach((c) => {
        const m = methode(c, verr);
        if (!m || (!estEspace(c) && c !== APOSTROPHE && !index[c])) {
          throw new Error(`miniEssai : « ${c} » (${landing.slug}) n'a pas de geste dans la table 2026.1.`);
        }
        touches.push(...m);
        if (!estEspace(c)) {
          if (!methodes[c]) methodes[c] = m;
          m.forEach(([code]) => codesUtiles.add(code));
        }
        const sortie = frappeTraditionnelle(m);
        const statut = sortie === tolere(c) ? "egal" : sortie === "" ? "perdu" : "faux";
        correspondance.push({ caractere: c, sortie, statut });
      });
      const relu = frappeGlobal(touches);
      if (relu !== tolere(texte)) {
        throw new Error(`miniEssai : « ${texte} » (${landing.slug}) se retape « ${relu} » avec la table 2026.1.`);
      }
      return { texte, correspondance };
    });

    const longueur = Array.from(segments[1].texte).length;
    if (longueur < 10 || longueur > 25) {
      throw new Error(`miniEssai : la phrase de ${landing.slug} fait ${longueur} caractères (10 à 25, QCM du 2026-09-30).`);
    }
    if (!Array.from(segments[1].texte).some((c) => essai.focus.includes(c))) {
      throw new Error(`miniEssai : la phrase de ${landing.slug} ne contient pas le caractère de la page.`);
    }
    if (essai.retour === "A" && segments[1].correspondance.every((c) => c.statut === "egal")) {
      throw new Error(`miniEssai : retour « A » sur ${landing.slug}, mais l'AZERTY traditionnel écrit la même phrase.`);
    }

    const nomsUtiles = {};
    const chiffresUtiles = {};
    codesUtiles.forEach((code) => {
      nomsUtiles[code] = noms[code];
      if (chiffres[code]) chiffresUtiles[code] = chiffres[code];
    });

    resultat[landing.slug] = {
      verr,
      code: essai.code === true,
      retour: essai.retour,
      classiqueHtml: essai.classique ? consigneHtml(essai.classique) : null,
      /* Le premier texte, écrit au build dans son état de départ. */
      depart: {
        texte: segments[0].texte,
        consigneHtml: consigneHtml(essai.consigne1),
        caracteres: Array.from(segments[0].texte).map((c) => ({ c, cible: essai.focus.includes(c) })),
      },
      /* Pour le retour « A » : la phrase, caractère par caractère, sur
         l'AZERTY traditionnel. */
      sortieTraditionnelle: segments[1].correspondance,
      /* Ce que lit le script de la page (js/v2/mini-essai.js). */
      client: {
        verr,
        focus: essai.focus,
        segments: [
          { texte: segments[0].texte, consigne: essai.consigne1 },
          { texte: segments[1].texte, consigne: essai.consigne2 },
        ],
        methodes,
        noms: nomsUtiles,
        chiffres: chiffresUtiles,
      },
    };
  });
  return resultat;
}

module.exports = construire();
