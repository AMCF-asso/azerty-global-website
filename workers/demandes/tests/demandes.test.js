import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { demarrer, multipart, URL_API, URL_COMPTE, valide } from './aide.js';

const JSON_ACCEPT = { Accept: 'application/json' };
const LOCATION_OK = '/autocollants-claviers#envoi-ok';
const LOCATION_ERREUR = '/autocollants-claviers#envoi-erreur';
const LOCATION_ATTENTE = '/autocollants-claviers#envoi-attente';

async function corpsJson(reponse) {
  return JSON.parse(await reponse.text());
}

function verifierEntetesSecurite(reponse) {
  assert.equal(reponse.headers.get('cache-control'), 'no-store');
  assert.equal(reponse.headers.get('x-content-type-options'), 'nosniff');
}

describe('POST /api/demandes', () => {
  let t;
  before(async () => {
    t = await demarrer();
  });
  after(async () => {
    await t.fermer();
  });

  async function vider() {
    await t.db.prepare('DELETE FROM demandes').run();
  }

  test('succes JSON : 200 {"ok":true}, ligne normalisee, facultatifs a NULL', async () => {
    await vider();
    const r = await t.poster(valide(), { entetes: JSON_ACCEPT });
    assert.equal(r.status, 200);
    assert.deepEqual(await corpsJson(r), { ok: true });
    verifierEntetesSecurite(r);
    const lignes = await t.lignes();
    assert.equal(lignes.length, 1);
    const l = lignes[0];
    assert.equal(l.email, 'alice@example.org');
    assert.equal(l.pays, 'FR');
    assert.equal(l.autocollants, 1);
    assert.equal(l.clavier, 0);
    for (const c of ['couleur_touches', 'disposition_physique', 'type_clavier', 'prix_autocollants',
      'prix_clavier', 'profil', 'organisation', 'postes', 'page_origine']) {
      assert.equal(l[c], null, c);
    }
    assert.match(l.jeton, /^[0-9a-f]{64}$/);
    assert.match(l.cree_le, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    assert.equal(l.cree_le, l.maj_le);
  });

  test('succes sans JS : 303 vers #envoi-ok', async () => {
    await vider();
    const r = await t.poster(valide());
    assert.equal(r.status, 303);
    assert.equal(r.headers.get('location'), LOCATION_OK);
    verifierEntetesSecurite(r);
    assert.equal((await t.lignes()).length, 1);
  });

  test('multipart/form-data accepte, tous les champs stockes', async () => {
    await vider();
    const r = await t.poster({
      email: 'bob@example.be',
      pays: 'BE',
      produits: ['autocollants', 'clavier'],
      couleur_touches: 'noires',
      disposition_physique: 'azerty-be',
      type_clavier: ['portable', 'mecanique'],
      prix_autocollants: 'jusqu-10',
      prix_clavier: 'plus-100',
      profil: 'ecole',
      organisation: '  Lycée   Test ',
      postes: '120',
      page: '/autocollants-claviers',
      consentement: 'oui',
      site_web: ''
    }, { type: 'multipart', entetes: JSON_ACCEPT });
    assert.equal(r.status, 200);
    const [l] = await t.lignes();
    assert.equal(l.autocollants, 1);
    assert.equal(l.clavier, 1);
    assert.equal(l.couleur_touches, 'noires');
    assert.equal(l.disposition_physique, 'azerty-be');
    assert.equal(l.type_clavier, 'portable,mecanique');
    assert.equal(l.prix_autocollants, 'jusqu-10');
    assert.equal(l.prix_clavier, 'plus-100');
    assert.equal(l.profil, 'ecole');
    assert.equal(l.organisation, 'Lycée Test');
    assert.equal(l.postes, 120);
    assert.equal(l.page_origine, '/autocollants-claviers');
  });

  const invalides = [
    ['email absent', { email: undefined }, 'email', 'requis'],
    ['email vide', { email: '   ' }, 'email', 'requis'],
    ['email sans arobase', { email: 'alice.example.org' }, 'email', 'format'],
    ['email sans domaine', { email: 'alice@example' }, 'email', 'format'],
    ['email avec espace', { email: 'al ice@example.org' }, 'email', 'format'],
    ['email avec points consecutifs', { email: 'a@exa..mple.org' }, 'email', 'format'],
    ['email trop long', { email: `${'a'.repeat(250)}@b.fr` }, 'email', 'format'],
    ['pays absent', { pays: undefined }, 'pays', 'requis'],
    ['pays en minuscules', { pays: 'fr' }, 'pays', 'format'],
    ['pays a trois lettres', { pays: 'FRA' }, 'pays', 'format'],
    ['produits absents', { produits: undefined }, 'produits', 'requis'],
    ['produits vides', { produits: [''] }, 'produits', 'requis'],
    ['produit inconnu', { produits: ['autocollants', 'souris'] }, 'produits', 'valeur'],
    ['couleur inconnue', { couleur_touches: 'rouges' }, 'couleur_touches', 'valeur'],
    ['disposition inconnue', { disposition_physique: 'dvorak' }, 'disposition_physique', 'valeur'],
    ['type de clavier inconnu', { type_clavier: ['portable', 'tactile'] }, 'type_clavier', 'valeur'],
    ['prix autocollants inconnu', { prix_autocollants: 'gratuit' }, 'prix_autocollants', 'valeur'],
    ['prix clavier inconnu', { prix_clavier: 'jusqu-5' }, 'prix_clavier', 'valeur'],
    ['profil inconnu', { profil: 'alien' }, 'profil', 'valeur'],
    ['organisation trop longue', { organisation: 'x'.repeat(121) }, 'organisation', 'format'],
    ['postes non numerique', { postes: 'beaucoup' }, 'postes', 'format'],
    ['postes decimal', { postes: '1.5' }, 'postes', 'format'],
    ['postes nul', { postes: '0' }, 'postes', 'valeur'],
    ['postes trop grand', { postes: '100001' }, 'postes', 'valeur'],
    ['consentement absent', { consentement: undefined }, 'consentement', 'requis'],
    ['consentement different de oui', { consentement: 'non' }, 'consentement', 'valeur']
  ];
  for (const [nom, extra, champ, code] of invalides) {
    test(`champ invalide : ${nom} -> 400 ${champ}:${code}`, async () => {
      await vider();
      const corps = valide();
      for (const [k, v] of Object.entries(extra)) {
        if (v === undefined) delete corps[k];
        else corps[k] = v;
      }
      const r = await t.poster(corps, { entetes: JSON_ACCEPT });
      assert.equal(r.status, 400);
      assert.deepEqual(await corpsJson(r), { ok: false, erreurs: { [champ]: code } });
      verifierEntetesSecurite(r);
      assert.equal((await t.lignes()).length, 0);

      // Sans JS : retour au formulaire avec l'etat d'erreur.
      const s = await t.poster(corps);
      assert.equal(s.status, 303);
      assert.equal(s.headers.get('location'), LOCATION_ERREUR);
    });
  }

  test('plusieurs erreurs sont rendues ensemble', async () => {
    const r = await t.poster({ email: 'x', pays: 'zz' }, { entetes: JSON_ACCEPT });
    assert.equal(r.status, 400);
    assert.deepEqual((await corpsJson(r)).erreurs, {
      email: 'format', pays: 'format', produits: 'requis', consentement: 'requis'
    });
  });

  test('un champ inconnu est ignore', async () => {
    await vider();
    const r = await t.poster(valide({ role: 'admin', id: '7' }), { entetes: JSON_ACCEPT });
    assert.equal(r.status, 200);
    assert.equal((await t.lignes()).length, 1);
  });

  test('un fichier envoye dans un champ est refuse', async () => {
    await vider();
    const f = new FormData();
    f.append('email', 'a@example.org');
    f.append('pays', 'FR');
    f.append('produits', 'autocollants');
    f.append('consentement', 'oui');
    f.append('postes', new Blob(['12'], { type: 'text/plain' }), 'postes.txt');
    const { body, type } = await multipart(f);
    const r = await t.mf.dispatchFetch(URL_API, {
      method: 'POST', body, headers: { 'Content-Type': type, 'CF-Connecting-IP': '198.51.100.9', ...JSON_ACCEPT }
    });
    assert.equal(r.status, 400);
    assert.deepEqual((await corpsJson(r)).erreurs, { postes: 'format' });
  });

  test('page d origine : chemin gardé, requête retirée, reste ignoré', async () => {
    const cas = [
      ['/autocollants-claviers', '/autocollants-claviers'],
      ['/autocollants-claviers?mail=a@b.fr#x', '/autocollants-claviers'],
      ['https://evil.example/', null],
      ['//evil.example', null],
      ['autocollants', null],
      [`/${'a'.repeat(100)}`, null],
      ['/a b', null],
      ['', null]
    ];
    for (const [entree, attendu] of cas) {
      await vider();
      const r = await t.poster(valide({ page: entree }), { entetes: JSON_ACCEPT });
      assert.equal(r.status, 200, entree);
      assert.equal((await t.lignes())[0].page_origine, attendu, entree);
    }
  });

  test('organisation : caracteres de controle retires', async () => {
    await vider();
    await t.poster(valide({ organisation: 'Acme\u0000\u0007\r\nSA\u202e  Corp' }), { entetes: JSON_ACCEPT });
    assert.equal((await t.lignes())[0].organisation, 'Acme SA Corp');
  });

  test('pot de miel : reponse de succes identique, rien de stocke', async () => {
    await vider();
    const normal = await t.poster(valide({ email: 'vrai@example.org' }), { entetes: JSON_ACCEPT });
    await vider();
    const piege = await t.poster(valide({ site_web: 'http://spam.example' }), { entetes: JSON_ACCEPT });
    assert.equal(piege.status, normal.status);
    assert.equal(await piege.text(), await normal.text());
    assert.equal((await t.lignes()).length, 0);

    const sansJs = await t.poster(valide({ site_web: 'x' }));
    assert.equal(sansJs.status, 303);
    assert.equal(sansJs.headers.get('location'), LOCATION_OK);
    assert.equal((await t.lignes()).length, 0);

    // Meme avec un formulaire par ailleurs invalide.
    const invalide = await t.poster({ site_web: 'x' }, { entetes: JSON_ACCEPT });
    assert.equal(invalide.status, 200);
    assert.equal((await t.lignes()).length, 0);
  });

  test('Origin etranger : 403 sans rien stocker', async () => {
    await vider();
    for (const origine of ['https://evil.example', 'http://azerty.global', 'https://azerty.global.evil.example', 'null']) {
      const r = await t.poster(valide(), { entetes: { ...JSON_ACCEPT, Origin: origine } });
      assert.equal(r.status, 403, origine);
      verifierEntetesSecurite(r);
    }
    assert.equal((await t.lignes()).length, 0);
  });

  test('Origin azerty.global ou absent : accepte', async () => {
    await vider();
    const a = await t.poster(valide(), { entetes: { ...JSON_ACCEPT, Origin: 'https://azerty.global' } });
    assert.equal(a.status, 200);
    const b = await t.poster(valide({ email: 'autre@example.org' }), { entetes: JSON_ACCEPT });
    assert.equal(b.status, 200);
    assert.equal((await t.lignes()).length, 2);
  });

  test('doublon : upsert, produits additionnes, derniere reponse non vide, cree_le conserve', async () => {
    await vider();
    const premiere = await t.poster(valide({
      produits: ['autocollants'], couleur_touches: 'noires', profil: 'particulier', postes: '3',
      organisation: 'Ancienne', page: '/a'
    }), { entetes: JSON_ACCEPT });
    const avant = (await t.lignes())[0];
    await new Promise((resolve) => setTimeout(resolve, 15));

    const seconde = await t.poster(valide({
      email: ' ALICE@example.org',
      produits: ['clavier'], couleur_touches: '', disposition_physique: 'qwertz',
      type_clavier: ['bureau'], profil: 'entreprise', postes: '', organisation: '', page: ''
    }), { entetes: JSON_ACCEPT });

    assert.equal(seconde.status, premiere.status);
    assert.equal(await seconde.text(), '{"ok":true}');
    const lignes = await t.lignes();
    assert.equal(lignes.length, 1);
    const l = lignes[0];
    assert.equal(l.id, avant.id);
    assert.equal(l.autocollants, 1, 'produit conserve');
    assert.equal(l.clavier, 1, 'produit ajoute');
    assert.equal(l.couleur_touches, 'noires', 'vide : ancienne valeur conservee');
    assert.equal(l.disposition_physique, 'qwertz');
    assert.equal(l.type_clavier, 'bureau');
    assert.equal(l.profil, 'entreprise', 'derniere reponse non vide');
    assert.equal(l.postes, 3);
    assert.equal(l.organisation, 'Ancienne');
    assert.equal(l.page_origine, '/a');
    assert.equal(l.cree_le, avant.cree_le);
    assert.ok(l.maj_le > avant.maj_le, 'maj_le mis a jour');
    assert.equal(l.jeton, avant.jeton, 'jeton conserve');
  });

  test('doublon sans JS : meme redirection qu une adresse nouvelle', async () => {
    await vider();
    const a = await t.poster(valide());
    const b = await t.poster(valide());
    assert.equal(a.status, 303);
    assert.equal(b.status, 303);
    assert.equal(b.headers.get('location'), a.headers.get('location'));
    assert.equal((await t.lignes()).length, 1);
  });

  test('type de contenu non pris en charge : 415', async () => {
    const r = await t.poster(JSON.stringify(valide()), {
      type: 'brut', entetes: { 'Content-Type': 'application/json', ...JSON_ACCEPT }
    });
    assert.equal(r.status, 415);
  });

  test('corps de plus de 8 Ko : 413 (Content-Length)', async () => {
    await vider();
    const r = await t.poster(valide({ organisation: 'x'.repeat(9000) }), { entetes: JSON_ACCEPT });
    assert.equal(r.status, 413);
    assert.equal((await t.lignes()).length, 0);
  });

  test('corps de plus de 8 Ko : 413 (flux sans Content-Length)', async () => {
    const gros = new TextEncoder().encode(`email=a%40b.fr&organisation=${'x'.repeat(9000)}`);
    const flux = new ReadableStream({
      start(c) {
        c.enqueue(gros.slice(0, 4000));
        c.enqueue(gros.slice(4000));
        c.close();
      }
    });
    const r = await t.mf.dispatchFetch(URL_API, {
      method: 'POST', body: flux, duplex: 'half',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'CF-Connecting-IP': '198.51.100.20', ...JSON_ACCEPT }
    });
    assert.equal(r.status, 413);
  });

  test('un corps de 8 Ko pile passe', async () => {
    await vider();
    const base = 'email=a%40example.org&pays=FR&produits=autocollants&consentement=oui&inconnu=';
    const corps = base + 'x'.repeat(8192 - base.length);
    assert.equal(corps.length, 8192);
    const r = await t.poster(corps, { entetes: { 'Content-Type': 'application/x-www-form-urlencoded', ...JSON_ACCEPT } });
    assert.equal(r.status, 200);
  });

  test('journaux : evenements seulement, ni e-mail, ni organisation, ni IP', async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const tout = t.journaux.join('');
    assert.match(tout, /demande_ok/, 'les journaux du Worker sont bien captures');
    assert.match(tout, /demande_invalide/);
    for (const interdit of ['example.org', 'example.be', 'alice', 'Lyc', 'Acme', '203.0.113', '198.51.100', 'sel-de-test']) {
      assert.ok(!tout.includes(interdit), `journaux : "${interdit}" ne doit pas apparaitre`);
    }
  });

  test('methodes et chemins : 405 et 404', async () => {
    for (const methode of ['GET', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD']) {
      const r = await t.mf.dispatchFetch(URL_API, { method: methode });
      assert.equal(r.status, 405, methode);
      assert.equal(r.headers.get('allow'), 'POST');
    }
    for (const methode of ['POST', 'PUT', 'DELETE', 'HEAD']) {
      const r = await t.mf.dispatchFetch(URL_COMPTE, { method: methode });
      assert.equal(r.status, 405, `compte ${methode}`);
      assert.equal(r.headers.get('allow'), 'GET');
    }
    for (const chemin of ['/api/demandes/autre', '/api/demandesXYZ', '/api/demandes/compte/x', '/api/demandes/compte.json']) {
      const r = await t.mf.dispatchFetch(`https://azerty.global${chemin}`, { method: 'GET' });
      assert.equal(r.status, 404, chemin);
    }
  });
});

describe('limitation de debit', () => {
  let t;
  before(async () => {
    t = await demarrer();
  });
  after(async () => {
    await t.fermer();
  });

  test('6e envoi de la meme IP en 60 s : 429 JSON ; une autre IP passe', async () => {
    const ip = '192.0.2.77';
    for (let i = 1; i <= 5; i += 1) {
      const r = await t.poster(valide({ email: `u${i}@example.org` }), { ip, entetes: JSON_ACCEPT });
      assert.equal(r.status, 200, `envoi ${i}`);
    }
    const trop = await t.poster(valide({ email: 'u6@example.org' }), { ip, entetes: JSON_ACCEPT });
    assert.equal(trop.status, 429);
    assert.deepEqual(await corpsJson(trop), { ok: false, erreur: 'trop-de-demandes' });
    verifierEntetesSecurite(trop);

    const sansJs = await t.poster(valide({ email: 'u7@example.org' }), { ip });
    assert.equal(sansJs.status, 303);
    assert.equal(sansJs.headers.get('location'), LOCATION_ATTENTE);

    assert.equal((await t.lignes()).length, 5, 'les envois limites ne sont pas stockes');

    const autre = await t.poster(valide({ email: 'u8@example.org' }), { ip: '192.0.2.78', entetes: JSON_ACCEPT });
    assert.equal(autre.status, 200);
  });
});

describe('GET /api/demandes/compte', () => {
  async function inserer(t, n) {
    for (let i = 0; i < n; i += 1) {
      const r = await t.poster(valide({ email: `n${Date.now()}${i}@example.org` }), { entetes: JSON_ACCEPT });
      assert.equal(r.status, 200);
    }
  }

  test('sous le seuil : total null ; au seuil et au-dessus : total reel', async () => {
    const t = await demarrer({ seuil: '3', cache: false });
    try {
      await inserer(t, 2);
      let r = await t.mf.dispatchFetch(URL_COMPTE);
      assert.equal(r.status, 200);
      assert.deepEqual(await corpsJson(r), { total: null, seuil: 3 });
      assert.equal(r.headers.get('cache-control'), 'public, max-age=300');
      assert.match(r.headers.get('content-type'), /^application\/json/);

      await inserer(t, 1);
      r = await t.mf.dispatchFetch(URL_COMPTE);
      assert.deepEqual(await corpsJson(r), { total: 3, seuil: 3 });

      await inserer(t, 2);
      r = await t.mf.dispatchFetch(URL_COMPTE);
      assert.deepEqual(await corpsJson(r), { total: 5, seuil: 3 });
    } finally {
      await t.fermer();
    }
  });

  test('seuil par defaut 200 si SEUIL est invalide ; vide : total null', async () => {
    const t = await demarrer({ seuil: 'abc', cache: false });
    try {
      const r = await t.mf.dispatchFetch(URL_COMPTE);
      assert.deepEqual(await corpsJson(r), { total: null, seuil: 200 });
    } finally {
      await t.fermer();
    }
  });

  test('la reponse est mise en cache (caches.default) : D1 n est pas relu', async () => {
    const t = await demarrer({ seuil: '1', cache: true });
    try {
      await inserer(t, 1);
      const a = await t.mf.dispatchFetch(URL_COMPTE);
      assert.deepEqual(await corpsJson(a), { total: 1, seuil: 1 });
      await inserer(t, 2);
      const b = await t.mf.dispatchFetch(`${URL_COMPTE}?x=1`);
      assert.deepEqual(await corpsJson(b), { total: 1, seuil: 1 }, 'valeur en cache');
    } finally {
      await t.fermer();
    }
  });
});
