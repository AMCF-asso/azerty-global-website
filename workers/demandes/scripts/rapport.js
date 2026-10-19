#!/usr/bin/env node
// Rapport agrege des demandes "Previens-moi", a joindre aux courriers aux fabricants.
// Interroge D1 par `npx wrangler d1 execute` (distant par defaut, --local en option).
// Le rapport ne contient JAMAIS d'adresse e-mail ni de nom d'organisation : les
// requetes ne lisent que des agregats (comptes, sommes, valeurs d'une liste fermee).
//
// Usage : node scripts/rapport.js [--remote | --local] [--persist-to <dossier>]
//                                 [--base <nom>] [--sortie <fichier.md>]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DOSSIER_WORKER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_PAR_DEFAUT = 'azerty-global-demandes';

// Une requete par rubrique. Pas de guillemets doubles, de %, de $ ni de \ : la
// commande passe par un shell (cmd.exe sous Windows, sh ailleurs).
export const REQUETES = {
  totaux: `SELECT COUNT(*) AS n, COUNT(DISTINCT lower(trim(organisation))) AS organisations,
    COALESCE(SUM(postes), 0) AS postes, MIN(substr(cree_le, 1, 10)) AS premiere, MAX(substr(cree_le, 1, 10)) AS derniere
    FROM demandes`,
  produits: `SELECT COALESCE(SUM(autocollants), 0) AS autocollants, COALESCE(SUM(clavier), 0) AS clavier,
    COALESCE(SUM(autocollants AND clavier), 0) AS les_deux FROM demandes`,
  pays: 'SELECT pays AS valeur, COUNT(*) AS n FROM demandes GROUP BY pays ORDER BY n DESC, pays',
  couleur: 'SELECT couleur_touches AS valeur, COUNT(*) AS n FROM demandes GROUP BY couleur_touches ORDER BY n DESC',
  disposition: 'SELECT disposition_physique AS valeur, COUNT(*) AS n FROM demandes GROUP BY disposition_physique ORDER BY n DESC',
  type: 'SELECT type_clavier AS valeur, COUNT(*) AS n FROM demandes GROUP BY type_clavier',
  prix_autocollants: 'SELECT prix_autocollants AS valeur, COUNT(*) AS n FROM demandes WHERE autocollants = 1 GROUP BY prix_autocollants',
  prix_clavier: 'SELECT prix_clavier AS valeur, COUNT(*) AS n FROM demandes WHERE clavier = 1 GROUP BY prix_clavier',
  profils: `SELECT profil AS valeur, COUNT(*) AS n, COUNT(DISTINCT lower(trim(organisation))) AS organisations,
    COALESCE(SUM(postes), 0) AS postes FROM demandes GROUP BY profil ORDER BY n DESC`,
  pages: 'SELECT page_origine AS valeur, COUNT(*) AS n FROM demandes GROUP BY page_origine ORDER BY n DESC LIMIT 50',
  semaines: `SELECT date(substr(cree_le, 1, 10), '-6 days', 'weekday 1') AS valeur, COUNT(*) AS n
    FROM demandes GROUP BY valeur ORDER BY valeur`
};

const LIBELLES = {
  couleur: { noires: 'Touches noires', blanches: 'Touches blanches', autre: 'Autre couleur', 'ne-sais-pas': 'Ne sait pas' },
  disposition: {
    'azerty-fr': 'AZERTY français', 'azerty-be': 'AZERTY belge', qwerty: 'QWERTY', qwertz: 'QWERTZ',
    autre: 'Autre', 'ne-sais-pas': 'Ne sait pas'
  },
  type: { portable: 'Portable', bureau: 'De bureau', 'sans-fil': 'Sans fil', mecanique: 'Mécanique' },
  prix_autocollants: { 'jusqu-5': "Jusqu'à 5 €", 'jusqu-10': "Jusqu'à 10 €", 'jusqu-15': "Jusqu'à 15 €", 'plus-15': 'Plus de 15 €', 'ne-sais-pas': 'Ne sait pas' },
  prix_clavier: { 'jusqu-40': "Jusqu'à 40 €", 'jusqu-70': "Jusqu'à 70 €", 'jusqu-100': "Jusqu'à 100 €", 'plus-100': 'Plus de 100 €', 'ne-sais-pas': 'Ne sait pas' },
  profil: {
    particulier: 'Particuliers', ecole: 'Écoles', entreprise: 'Entreprises',
    administration: 'Administrations', association: 'Associations'
  }
};
const ORDRE = {
  prix_autocollants: ['jusqu-5', 'jusqu-10', 'jusqu-15', 'plus-15', 'ne-sais-pas'],
  prix_clavier: ['jusqu-40', 'jusqu-70', 'jusqu-100', 'plus-100', 'ne-sais-pas']
};
const NON_PRECISE = 'Non précisé';

// ------------------------------------------------------------ Rapport

export function construireRapport(r, { date = new Date().toISOString().slice(0, 10) } = {}) {
  const totaux = r.totaux[0] || { n: 0, organisations: 0, postes: 0, premiere: null, derniere: null };
  const total = Number(totaux.n) || 0;
  const part = (n) => (total > 0 ? `${((100 * n) / total).toFixed(1).replace('.', ',')} %` : '-');
  const tableau = (entetes, lignes) => [
    `| ${entetes.join(' | ')} |`,
    `| ${entetes.map((_, i) => (i === 0 ? '---' : '---:')).join(' | ')} |`,
    ...lignes.map((l) => `| ${l.join(' | ')} |`)
  ].join('\n');
  const repartition = (rubrique, lignes, libelles = {}, ordre = null) => {
    let l = lignes.map((x) => ({ valeur: x.valeur, n: Number(x.n) }));
    if (ordre) l.sort((a, b) => rang(ordre, a.valeur) - rang(ordre, b.valeur));
    if (l.length === 0) return '_Aucune donnée._';
    return tableau([rubrique, 'Demandes', 'Part'], l.map((x) => [
      echapper(x.valeur === null || x.valeur === undefined ? NON_PRECISE : libelles[x.valeur] || x.valeur),
      String(x.n),
      part(x.n)
    ]));
  };

  // type_clavier : liste separee par des virgules, a eclater.
  const types = new Map();
  for (const ligne of r.type) {
    const n = Number(ligne.n);
    const liste = ligne.valeur ? String(ligne.valeur).split(',') : [null];
    for (const t of liste) types.set(t, (types.get(t) || 0) + n);
  }
  const lignesType = [...types].map(([valeur, n]) => ({ valeur, n })).sort((a, b) => b.n - a.n);

  const p = r.produits[0] || { autocollants: 0, clavier: 0, les_deux: 0 };
  const sections = [
    '# Demandes AZERTY Global : synthèse agrégée',
    '',
    `Rapport généré le ${date}. Il ne contient aucune adresse e-mail ni aucun nom d'organisation : seulement des comptes et des sommes.`,
    '',
    '## Total',
    '',
    tableau(['Indicateur', 'Valeur'], [
      ['Demandes (adresses distinctes)', String(total)],
      ['Première demande', totaux.premiere || '-'],
      ['Dernière demande', totaux.derniere || '-'],
      ['Organisations distinctes déclarées', String(Number(totaux.organisations) || 0)],
      ['Postes déclarés (somme)', String(Number(totaux.postes) || 0)]
    ]),
    '',
    '## Par produit',
    '',
    tableau(['Produit', 'Demandes', 'Part'], [
      ['Autocollants', String(Number(p.autocollants)), part(Number(p.autocollants))],
      ['Claviers', String(Number(p.clavier)), part(Number(p.clavier))],
      ['Les deux', String(Number(p.les_deux)), part(Number(p.les_deux))]
    ]),
    '',
    '## Par pays',
    '',
    repartition('Pays (code ISO)', r.pays),
    '',
    '## Couleur des touches',
    '',
    repartition('Couleur', r.couleur, LIBELLES.couleur),
    '',
    '## Disposition physique actuelle',
    '',
    repartition('Disposition', r.disposition, LIBELLES.disposition),
    '',
    '## Type de clavier',
    '',
    'Plusieurs types possibles par demande : les parts peuvent dépasser 100 % au total.',
    '',
    repartition('Type', lignesType, LIBELLES.type),
    '',
    '## Prix acceptable : autocollants',
    '',
    'Demandes incluant des autocollants.',
    '',
    repartition('Budget', r.prix_autocollants, LIBELLES.prix_autocollants, ORDRE.prix_autocollants),
    '',
    '## Prix acceptable : claviers',
    '',
    'Demandes incluant des claviers.',
    '',
    repartition('Budget', r.prix_clavier, LIBELLES.prix_clavier, ORDRE.prix_clavier),
    '',
    '## Profils, organisations et postes',
    '',
    r.profils.length === 0 ? '_Aucune donnée._' : tableau(
      ['Profil', 'Demandes', 'Part', 'Organisations distinctes', 'Postes déclarés'],
      r.profils.map((x) => [
        echapper(x.valeur ? LIBELLES.profil[x.valeur] || x.valeur : NON_PRECISE),
        String(Number(x.n)), part(Number(x.n)), String(Number(x.organisations) || 0), String(Number(x.postes) || 0)
      ])
    ),
    '',
    "## Page d'origine",
    '',
    repartition('Page', r.pages),
    '',
    '## Par semaine (lundi de la semaine)',
    '',
    repartition('Semaine du', r.semaines)
  ];
  return `${sections.join('\n')}\n`;
}

function rang(ordre, valeur) {
  const i = ordre.indexOf(valeur);
  return i === -1 ? ordre.length : i;
}

function echapper(valeur) {
  return String(valeur).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
}

// ---------------------------------------------------------- Acces D1

export function commandeWrangler(sql, { base = BASE_PAR_DEFAUT, local = false, persistTo = null } = {}) {
  if (/["%$`\\^&|<>]/.test(sql)) throw new Error('Requete refusee : caractere special interdit.');
  const mode = local ? '--local' : '--remote';
  const persistance = persistTo ? ` --persist-to "${persistTo}"` : '';
  return `npx wrangler d1 execute ${base} --json ${mode}${persistance} --command "${sql.replace(/\s+/g, ' ').trim()}"`;
}

function executer(sql, options) {
  const sortie = execSync(commandeWrangler(sql, options), {
    cwd: DOSSIER_WORKER,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }
  });
  const debut = sortie.search(/^\[/m);
  if (debut === -1) throw new Error('Reponse wrangler sans JSON.');
  return JSON.parse(sortie.slice(debut));
}

export function interroger(options = {}) {
  const cles = Object.keys(REQUETES);
  const resultats = {};
  let lots = null;
  try {
    lots = executer(cles.map((c) => REQUETES[c]).join('; '), options);
  } catch {
    lots = null;
  }
  if (Array.isArray(lots) && lots.length === cles.length && lots.every((l) => l && l.success !== false)) {
    cles.forEach((c, i) => { resultats[c] = lots[i].results || []; });
    return resultats;
  }
  // Repli : une requete par appel.
  for (const c of cles) {
    const [lot] = executer(REQUETES[c], options);
    if (!lot || lot.success === false) throw new Error(`Requete en echec : ${c}`);
    resultats[c] = lot.results || [];
  }
  return resultats;
}

// ---------------------------------------------------------------- CLI

function lireArguments(argv) {
  const options = { local: false, base: BASE_PAR_DEFAUT, persistTo: null, sortie: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--local') options.local = true;
    else if (a === '--remote') options.local = false;
    else if (a === '--base') options.base = argv[++i];
    else if (a === '--persist-to') options.persistTo = argv[++i];
    else if (a === '--sortie') options.sortie = argv[++i];
    else throw new Error(`Argument inconnu : ${a}`);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(options.base || '')) throw new Error('Nom de base invalide.');
  if (options.persistTo && /["%$`^&|<>]/.test(options.persistTo)) throw new Error('Chemin --persist-to invalide.');
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = lireArguments(process.argv.slice(2));
    const rapport = construireRapport(interroger(options));
    if (options.sortie) {
      mkdirSync(path.dirname(path.resolve(options.sortie)), { recursive: true });
      writeFileSync(options.sortie, rapport, 'utf8');
      console.error(`Rapport ecrit : ${options.sortie}`);
    } else {
      process.stdout.write(rapport);
    }
  } catch (erreur) {
    console.error(`Echec du rapport : ${erreur.message}`);
    process.exit(1);
  }
}
