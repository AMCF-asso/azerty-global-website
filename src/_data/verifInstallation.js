/**
 * Vérification « une frappe » du héros de /guide.
 *
 * Contrat : operations/refonte-site/2026-08-29-decisions-composant-clavier-et-guide.md §2.1.1.
 *
 *   « Toute extension de la table de signatures se calcule depuis les
 *     définitions du dépôt, jamais de mémoire. »
 *
 * Le principe : une seule touche suffit à nommer la disposition active, parce
 * que les trois AZERTY connus y mettent trois caractères différents. Ce fichier
 * ne contient donc aucune signature écrite ; il lit les trois définitions et
 * les calcule. Si deux dispositions se mettaient à partager le même caractère,
 * le témoin cesserait de discriminer et le build échoue — c'est exactement le
 * piège qui a tué l'idée du @ sur E00 le 2026-08-29 (l'AFNOR y met aussi @).
 *
 * Le repli QWERTY ne se lit dans aucun JSON du dépôt : un utilisateur QWERTY
 * qui cherche « ; » presse la touche de sa rangée de repos, pas celle de sa
 * rangée du bas. On l'identifie par le code physique de cette touche, sans
 * jamais prétendre lire une disposition qu'on n'a pas ici.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..', '..');

/* Le témoin : position ISO B08. Elle porte le point sur AZERTY Global, et
   c'est elle qui est gravée « ; » sur un clavier français du commerce. */
const TEMOIN = 'B08';

/* Le témoin QWERTY : position ISO C10, la touche « ; » d'une rangée de repos
   QWERTY. Sur les AZERTY du dépôt elle porte le M — c'est ce qui la rend
   utilisable comme repli : personne d'autre n'a de raison de la presser
   quand on demande « ; ». */
const TEMOIN_QWERTY = 'C10';

/* Scancode → KeyboardEvent.code. Deux entrées, celles des deux témoins.
   C'est la table du clavier physique (jeu 1) : elle décrit un emplacement,
   pas un caractère, et ne dépend d'aucune disposition. Le scancode attendu
   est vérifié dans les définitions ci-dessous, donc une erreur ici ne peut
   pas passer en silence. */
const CODES = {
  SC033: 'Comma',
  SC027: 'Semicolon'
};

/* L'ordre compte : la cible d'abord, les autres ensuite. Les noms sont ceux
   qui s'affichent au lecteur, article compris (« Vous êtes sur … »). */
const DISPOSITIONS = [
  { fichier: 'AZERTY Global.json', nom: 'AZERTY Global', cible: true },
  { fichier: 'AZERTY Traditionnel.json', nom: 'l’AZERTY classique', cible: false },
  { fichier: 'AZERTY AFNOR.json', nom: 'l’AFNOR', cible: false }
];

function lire(fichier) {
  return JSON.parse(fs.readFileSync(path.join(RACINE, 'data', fichier), 'utf-8'));
}

function toucheDe(definition, position, fichier) {
  for (const rangee of definition.rows || []) {
    for (const touche of rangee.keys || []) {
      if (touche.position === position) return touche;
    }
  }
  throw new Error(`verifInstallation : position ${position} absente de ${fichier}.`);
}

function codeDe(touche, position, fichier) {
  const code = CODES[touche.scancode];
  if (!code) {
    throw new Error(
      `verifInstallation : scancode ${touche.scancode} (${position}, ${fichier}) ` +
        'absent de la table des codes physiques.'
    );
  }
  return code;
}

function construire() {
  const signatures = {};
  const parNom = [];
  let cible = null;
  let code = null;

  for (const { fichier, nom, cible: estCible } of DISPOSITIONS) {
    const definition = lire(fichier);
    const touche = toucheDe(definition, TEMOIN, fichier);
    const valeur = touche.base;

    if (!valeur) {
      throw new Error(`verifInstallation : ${TEMOIN} sans niveau de base dans ${fichier}.`);
    }
    if (Object.prototype.hasOwnProperty.call(signatures, valeur)) {
      throw new Error(
        `verifInstallation : « ${valeur} » sur ${TEMOIN} pour ${signatures[valeur]} ` +
          `et pour ${nom}. Le témoin ne discrimine plus, il faut en changer.`
      );
    }

    const codeTouche = codeDe(touche, TEMOIN, fichier);
    if (code && code !== codeTouche) {
      throw new Error(
        `verifInstallation : ${TEMOIN} n'est pas au même endroit physique dans ` +
          `${fichier} (${codeTouche}) que dans les définitions précédentes (${code}).`
      );
    }
    code = codeTouche;

    signatures[valeur] = nom;
    parNom.push({ nom, valeur, cible: estCible });
    if (estCible) cible = valeur;
  }

  if (!cible) throw new Error('verifInstallation : aucune disposition cible déclarée.');

  /* Ce qui est gravé sur la touche témoin d'un clavier français du commerce,
     donc ce qu'on demande au lecteur d'aller chercher des yeux. */
  const reference = DISPOSITIONS.find((d) => d.fichier === 'AZERTY Traditionnel.json');
  const marquage = signatures[cible] === reference.nom ? null : parNom.find((d) => d.nom === reference.nom);
  if (!marquage) throw new Error('verifInstallation : pas de référence pour le marquage de la touche.');

  const qwerty = toucheDe(lire('AZERTY Traditionnel.json'), TEMOIN_QWERTY, 'AZERTY Traditionnel.json');

  return {
    position: TEMOIN,
    code,
    marquage: marquage.valeur,
    cible,
    signatures,
    /* Le repli : même caractère demandé, autre touche pressée. */
    qwerty: {
      position: TEMOIN_QWERTY,
      code: codeDe(qwerty, TEMOIN_QWERTY, 'AZERTY Traditionnel.json'),
      touche: marquage.valeur,
      nom: 'un clavier QWERTY'
    }
  };
}

module.exports = construire();
