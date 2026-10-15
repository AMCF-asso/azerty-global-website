import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { commandeWrangler, construireRapport, interroger, REQUETES } from '../scripts/rapport.js';

const DOSSIER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const LIGNES = [
  ['secret1@exemple.fr', 'FR', 1, 0, "'noires'", "'azerty-fr'", 'NULL', "'jusqu-10'", 'NULL', "'particulier'", 'NULL', 'NULL', "'/autocollants-claviers'", '2026-10-05'],
  ['secret2@exemple.be', 'BE', 1, 1, "'blanches'", "'azerty-be'", "'portable,mecanique'", "'jusqu-5'", "'jusqu-70'", "'ecole'", "'Lycee Secret'", 120, "'/autocollants-claviers'", '2026-10-11'],
  ['secret3@exemple.fr', 'FR', 0, 1, 'NULL', 'NULL', "'bureau'", 'NULL', "'plus-100'", "'entreprise'", "'ACME Secret'", 300, "'/entreprise'", '2026-10-12'],
  ['secret4@exemple.fr', 'FR', 0, 1, "'noires'", "'qwertz'", "'portable'", 'NULL', "'jusqu-40'", "'entreprise'", "'acme secret'", 50, 'NULL', '2026-10-14']
];

function sqlGraines() {
  return LIGNES.map((l, i) => `INSERT INTO demandes (email, pays, autocollants, clavier, couleur_touches, disposition_physique, type_clavier, prix_autocollants, prix_clavier, profil, organisation, postes, page_origine, cree_le, maj_le, jeton) VALUES ('${l[0]}', '${l[1]}', ${l[2]}, ${l[3]}, ${l[4]}, ${l[5]}, ${l[6]}, ${l[7]}, ${l[8]}, ${l[9]}, ${l[10]}, ${l[11]}, ${l[12]}, '${l[13]}T10:00:00.000Z', '${l[13]}T10:00:00.000Z', 'jeton${i}');`).join('\n');
}

function verifierRapport(rapport) {
  assert.match(rapport, /Demandes \(adresses distinctes\) \| 4 \|/);
  assert.match(rapport, /\| Autocollants \| 2 \| 50,0 % \|/);
  assert.match(rapport, /\| Claviers \| 3 \| 75,0 % \|/);
  assert.match(rapport, /\| Les deux \| 1 \| 25,0 % \|/);
  assert.match(rapport, /\| FR \| 3 \| 75,0 % \|/);
  assert.match(rapport, /\| BE \| 1 \| 25,0 % \|/);
  assert.match(rapport, /\| Touches noires \| 2 \|/);
  assert.match(rapport, /\| Non précisé \| 1 \|/);
  assert.match(rapport, /\| Portable \| 2 \|/, 'types eclates');
  assert.match(rapport, /\| Mécanique \| 1 \|/);
  assert.match(rapport, /\| Jusqu'à 5 € \| 1 \|/);
  assert.match(rapport, /\| Plus de 100 € \| 1 \|/);
  // 2 organisations distinctes pour les entreprises (casse ignoree) : "ACME" et "acme" comptent pour une.
  assert.match(rapport, /\| Entreprises \| 2 \| 50,0 % \| 1 \| 350 \|/);
  assert.match(rapport, /\| Écoles \| 1 \| 25,0 % \| 1 \| 120 \|/);
  assert.match(rapport, /Organisations distinctes déclarées \| 2 \|/);
  assert.match(rapport, /Postes déclarés \(somme\) \| 470 \|/);
  assert.match(rapport, /\| \/autocollants-claviers \| 2 \|/);
  assert.match(rapport, /\| 2026-10-05 \| 2 \|/);
  assert.match(rapport, /\| 2026-10-12 \| 2 \|/);
  // Jamais d'e-mail ni de nom d'organisation.
  assert.doesNotMatch(rapport, /secret|exemple\.|@|lycee|acme/i);
}

describe('rapport.js', () => {
  test('les requetes sont acceptees par la commande shell (aucun caractere interdit)', () => {
    for (const sql of Object.values(REQUETES)) {
      const commande = commandeWrangler(sql, { local: true });
      assert.match(commande, /^npx wrangler d1 execute azerty-global-demandes --json --local --command "/);
    }
    assert.match(commandeWrangler('SELECT 1'), /--remote/, 'distant par defaut');
    assert.throws(() => commandeWrangler('SELECT "x"'), /interdit/);
  });

  test('aucune requete ne lit une adresse e-mail ou le nom d une organisation', () => {
    for (const [nom, sql] of Object.entries(REQUETES)) {
      assert.doesNotMatch(sql, /\bemail\b|\bjeton\b/i, nom);
      // organisation : seulement dans COUNT(DISTINCT ...), jamais comme colonne rendue.
      const sansCompte = sql
        .replace(/COUNT\(DISTINCT lower\(trim\(organisation\)\)\) AS organisations/g, '');
      assert.doesNotMatch(sansCompte, /organisation/i, nom);
    }
  });

  test('construireRapport : aucune donnee personnelle meme si les lignes en contiennent', () => {
    const rapport = construireRapport({
      totaux: [{ n: 2, organisations: 1, postes: 10, premiere: '2026-10-01', derniere: '2026-10-02', email: 'x@y.fr', organisation: 'Nom Secret' }],
      produits: [{ autocollants: 2, clavier: 1, les_deux: 1 }],
      pays: [{ valeur: 'FR', n: 2 }],
      couleur: [], disposition: [], type: [{ valeur: null, n: 2 }],
      prix_autocollants: [], prix_clavier: [],
      profils: [{ valeur: 'ecole', n: 2, organisations: 1, postes: 10 }],
      pages: [{ valeur: '/a|b', n: 2 }],
      semaines: [{ valeur: '2026-09-28', n: 2 }]
    }, { date: '2026-10-15' });
    assert.match(rapport, /Rapport généré le 2026-10-15/);
    assert.match(rapport, /\/a\\\|b/, 'barre verticale echappee');
    assert.doesNotMatch(rapport, /x@y\.fr|Nom Secret/);
  });

  test('construireRapport : base vide', () => {
    const vide = {};
    for (const cle of Object.keys(REQUETES)) vide[cle] = [];
    const rapport = construireRapport(vide, { date: '2026-10-15' });
    assert.match(rapport, /Demandes \(adresses distinctes\) \| 0 \|/);
    assert.match(rapport, /_Aucune donnée\._/);
  });

  test('de bout en bout sur une D1 locale (wrangler --local) : agregats exacts, sans donnee personnelle', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'demandes-rapport-'));
    try {
      const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' };
      const persist = path.join(tmp, 'etat').replace(/\\/g, '/');
      const options = { cwd: DOSSIER, env, stdio: 'pipe', encoding: 'utf8' };
      execSync(`npx wrangler d1 migrations apply azerty-global-demandes --local --persist-to "${persist}"`, options);
      const graines = path.join(tmp, 'graines.sql');
      writeFileSync(graines, sqlGraines());
      execSync(`npx wrangler d1 execute azerty-global-demandes --local --persist-to "${persist}" --file "${graines.replace(/\\/g, '/')}"`, options);

      const rapport = construireRapport(interroger({ local: true, persistTo: persist }), { date: '2026-10-15' });
      verifierRapport(rapport);

      // Meme chose par la ligne de commande, avec --sortie.
      const sortie = path.join(tmp, 'rapport.md');
      execSync(`node scripts/rapport.js --local --persist-to "${persist}" --sortie "${sortie.replace(/\\/g, '/')}"`, options);
      verifierRapport(readFileSync(sortie, 'utf8'));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
