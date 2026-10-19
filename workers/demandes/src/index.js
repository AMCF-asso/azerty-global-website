const ORIGINE = 'https://azerty.global';
const CHEMIN_API = '/api/demandes';
const CHEMIN_COMPTE = '/api/demandes/compte';
const PAGE_FORMULAIRE = '/autocollants-claviers';
const TAILLE_MAX = 8 * 1024;
const SEUIL_PAR_DEFAUT = 200;

const PRODUITS = ['autocollants', 'clavier'];
const COULEURS = ['noires', 'blanches', 'autre', 'ne-sais-pas'];
const DISPOSITIONS = ['azerty-fr', 'azerty-be', 'qwerty', 'qwertz', 'autre', 'ne-sais-pas'];
const TYPES_CLAVIER = ['portable', 'bureau', 'sans-fil', 'mecanique'];
const PRIX_AUTOCOLLANTS = ['jusqu-5', 'jusqu-10', 'jusqu-15', 'plus-15', 'ne-sais-pas'];
const PRIX_CLAVIER = ['jusqu-40', 'jusqu-70', 'jusqu-100', 'plus-100', 'ne-sais-pas'];
const PROFILS = ['particulier', 'ecole', 'entreprise', 'administration', 'association'];

const EN_TETES_SECURITE = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};

const UPSERT = `INSERT INTO demandes (
  email, pays, autocollants, clavier, couleur_touches, disposition_physique,
  type_clavier, prix_autocollants, prix_clavier, profil, organisation, postes,
  page_origine, cree_le, maj_le, jeton
) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?14, ?15)
ON CONFLICT(email) DO UPDATE SET
  pays = excluded.pays,
  autocollants = MAX(demandes.autocollants, excluded.autocollants),
  clavier = MAX(demandes.clavier, excluded.clavier),
  couleur_touches = COALESCE(excluded.couleur_touches, demandes.couleur_touches),
  disposition_physique = COALESCE(excluded.disposition_physique, demandes.disposition_physique),
  type_clavier = COALESCE(excluded.type_clavier, demandes.type_clavier),
  prix_autocollants = COALESCE(excluded.prix_autocollants, demandes.prix_autocollants),
  prix_clavier = COALESCE(excluded.prix_clavier, demandes.prix_clavier),
  profil = COALESCE(excluded.profil, demandes.profil),
  organisation = COALESCE(excluded.organisation, demandes.organisation),
  postes = COALESCE(excluded.postes, demandes.postes),
  page_origine = COALESCE(excluded.page_origine, demandes.page_origine),
  maj_le = excluded.maj_le`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const chemin = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;

    if (chemin === CHEMIN_API) {
      if (request.method !== 'POST') return methodeRefusee('POST');
      return recevoirDemande(request, env);
    }
    if (chemin === CHEMIN_COMPTE) {
      if (request.method !== 'GET') return methodeRefusee('GET');
      return compter(url, env);
    }
    return json({ ok: false, erreur: 'introuvable' }, 404);
  }
};

// ---------------------------------------------------------------- POST

async function recevoirDemande(request, env) {
  const veutJson = (request.headers.get('Accept') || '').toLowerCase().includes('application/json');

  const origine = request.headers.get('Origin');
  if (origine !== null && origine !== ORIGINE) {
    journal('demande_origine_refusee');
    return json({ ok: false, erreur: 'origine' }, 403);
  }

  const declare = request.headers.get('Content-Length');
  if (declare !== null && Number(declare) > TAILLE_MAX) {
    return json({ ok: false, erreur: 'corps-trop-gros' }, 413);
  }

  const type = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!type.startsWith('application/x-www-form-urlencoded') && !type.startsWith('multipart/form-data')) {
    return json({ ok: false, erreur: 'type-non-pris-en-charge' }, 415);
  }

  if (!(await sousLaLimite(request, env))) {
    journal('demande_limitee');
    return veutJson
      ? json({ ok: false, erreur: 'trop-de-demandes' }, 429)
      : redirection('attente');
  }

  const octets = await lireCorps(request, TAILLE_MAX);
  if (octets === null) return json({ ok: false, erreur: 'corps-trop-gros' }, 413);

  let formulaire;
  try {
    formulaire = await new Response(octets, { headers: { 'Content-Type': request.headers.get('Content-Type') } }).formData();
  } catch {
    return echec({ corps: 'format' }, veutJson);
  }

  // Pot de miel : meme reponse qu'un succes, rien n'est stocke.
  if (texte(formulaire, 'site_web') !== '') {
    journal('demande_pot_de_miel');
    return succes(veutJson);
  }

  const { valeurs, erreurs } = valider(formulaire);
  if (Object.keys(erreurs).length > 0) {
    journal('demande_invalide', { champs: Object.keys(erreurs) });
    return echec(erreurs, veutJson);
  }

  try {
    await enregistrer(env.DB, valeurs);
  } catch {
    journal('demande_erreur_stockage');
    return veutJson ? json({ ok: false, erreur: 'indisponible' }, 500) : redirection('erreur');
  }
  journal('demande_ok');
  return succes(veutJson);
}

async function sousLaLimite(request, env) {
  if (!env.LIMITEUR) return true;
  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'inconnue';
    const cle = await sha256Hex(`${ip}|${env.SEL_IP || ''}`);
    const { success } = await env.LIMITEUR.limit({ key: cle });
    return success;
  } catch {
    // Une panne du limiteur ne doit pas bloquer le formulaire.
    journal('limiteur_indisponible');
    return true;
  }
}

async function lireCorps(request, max) {
  if (!request.body) return new Uint8Array(0);
  const lecteur = request.body.getReader();
  const morceaux = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await lecteur.cancel();
      return null;
    }
    morceaux.push(value);
  }
  const octets = new Uint8Array(total);
  let position = 0;
  for (const morceau of morceaux) {
    octets.set(morceau, position);
    position += morceau.byteLength;
  }
  return octets;
}

// ---------------------------------------------------------- Validation

function valider(formulaire) {
  const erreurs = {};
  const valeurs = {};

  const email = texte(formulaire, 'email').toLowerCase();
  if (email === '') erreurs.email = 'requis';
  else if (!emailValide(email)) erreurs.email = 'format';
  else valeurs.email = email;

  const pays = texte(formulaire, 'pays');
  if (pays === '') erreurs.pays = 'requis';
  else if (!/^[A-Z]{2}$/.test(pays)) erreurs.pays = 'format';
  else valeurs.pays = pays;

  const produits = liste(formulaire, 'produits', PRODUITS);
  if (produits.erreur) erreurs.produits = produits.erreur;
  else if (produits.valeurs.length === 0) erreurs.produits = 'requis';
  else {
    valeurs.autocollants = produits.valeurs.includes('autocollants') ? 1 : 0;
    valeurs.clavier = produits.valeurs.includes('clavier') ? 1 : 0;
  }

  const unique = [
    ['couleur_touches', COULEURS],
    ['disposition_physique', DISPOSITIONS],
    ['prix_autocollants', PRIX_AUTOCOLLANTS],
    ['prix_clavier', PRIX_CLAVIER],
    ['profil', PROFILS]
  ];
  for (const [champ, permises] of unique) {
    const valeur = texte(formulaire, champ);
    if (valeur === '') valeurs[champ] = null;
    else if (!permises.includes(valeur)) erreurs[champ] = 'valeur';
    else valeurs[champ] = valeur;
  }

  const types = liste(formulaire, 'type_clavier', TYPES_CLAVIER);
  if (types.erreur) erreurs.type_clavier = types.erreur;
  else valeurs.type_clavier = types.valeurs.length > 0 ? types.valeurs.join(',') : null;

  const organisation = nettoyer(texte(formulaire, 'organisation'));
  if ([...organisation].length > 120) erreurs.organisation = 'format';
  else valeurs.organisation = organisation === '' ? null : organisation;

  const postes = texte(formulaire, 'postes');
  if (postes === '') valeurs.postes = null;
  else if (!/^\d{1,9}$/.test(postes)) erreurs.postes = 'format';
  else if (Number(postes) < 1 || Number(postes) > 100000) erreurs.postes = 'valeur';
  else valeurs.postes = Number(postes);

  const consentement = texte(formulaire, 'consentement');
  if (consentement === '') erreurs.consentement = 'requis';
  else if (consentement !== 'oui') erreurs.consentement = 'valeur';

  valeurs.page_origine = pageOrigine(texte(formulaire, 'page'));
  return { valeurs, erreurs };
}

// Une valeur de fichier (multipart) n'est jamais acceptee : elle vaut "\u0000"
// et echoue donc a chaque validation, sans etre stockee.
function brut(formulaire, nom) {
  return formulaire.getAll(nom).map((v) => (typeof v === 'string' ? v : '\u0000'));
}

function texte(formulaire, nom) {
  const valeurs = brut(formulaire, nom);
  return valeurs.length === 0 ? '' : valeurs[valeurs.length - 1].trim();
}

function liste(formulaire, nom, permises) {
  const valeurs = [];
  for (const v of brut(formulaire, nom).map((x) => x.trim()).filter((x) => x !== '')) {
    if (!permises.includes(v)) return { erreur: 'valeur', valeurs: [] };
    if (!valeurs.includes(v)) valeurs.push(v);
  }
  return { erreur: null, valeurs: permises.filter((p) => valeurs.includes(p)) };
}

function emailValide(email) {
  return email.length <= 254
    && /^[^\s@\u0000-\u001f]+@[^\s@.\u0000-\u001f]+(\.[^\s@.\u0000-\u001f]+)+$/.test(email);
}

function nettoyer(valeur) {
  return valeur
    .replace(/[\p{Cc}\p{Zl}\p{Zp}\p{Bidi_Control}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Chemin seul : requete et fragment sont retires, tout le reste est ignore.
function pageOrigine(valeur) {
  const chemin = valeur.split(/[?#]/)[0];
  if (chemin.length > 100 || !/^\/(?!\/)[A-Za-z0-9._~\/-]*$/.test(chemin)) return null;
  return chemin;
}

// ------------------------------------------------------------ Stockage

async function enregistrer(db, v) {
  const maintenant = new Date().toISOString();
  await db.prepare(UPSERT).bind(
    v.email, v.pays, v.autocollants, v.clavier, v.couleur_touches, v.disposition_physique,
    v.type_clavier, v.prix_autocollants, v.prix_clavier, v.profil, v.organisation, v.postes,
    v.page_origine, maintenant, jetonAleatoire()
  ).run();
}

function jetonAleatoire() {
  const octets = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(entree) {
  const empreinte = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(entree));
  return Array.from(new Uint8Array(empreinte), (o) => o.toString(16).padStart(2, '0')).join('');
}

// ------------------------------------------------------------- Compteur

async function compter(url, env) {
  const seuil = lireSeuil(env.SEUIL);
  const cache = globalThis.caches?.default;
  const cle = new Request(`${url.origin}${CHEMIN_COMPTE}`);
  try {
    const trouve = await cache?.match(cle);
    if (trouve) return trouve;
  } catch {
    // Le cache est une optimisation, jamais une dependance.
  }

  let n;
  try {
    const ligne = await env.DB.prepare('SELECT COUNT(*) AS n FROM demandes').first();
    n = Number(ligne?.n ?? 0);
  } catch {
    journal('compte_erreur_stockage');
    return json({ ok: false, erreur: 'indisponible' }, 500);
  }

  const reponse = new Response(JSON.stringify({ total: n >= seuil ? n : null, seuil }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff'
    }
  });
  try {
    await cache?.put(cle, reponse.clone());
  } catch {
    // Voir ci-dessus.
  }
  return reponse;
}

function lireSeuil(valeur) {
  const n = Number.parseInt(valeur, 10);
  return Number.isInteger(n) && n >= 0 ? n : SEUIL_PAR_DEFAUT;
}

// ------------------------------------------------------------- Reponses

function succes(veutJson) {
  return veutJson ? json({ ok: true }, 200) : redirection('ok');
}

function echec(erreurs, veutJson) {
  return veutJson ? json({ ok: false, erreurs }, 400) : redirection('erreur');
}

function redirection(etat) {
  return new Response(null, {
    status: 303,
    headers: { ...EN_TETES_SECURITE, Location: `${PAGE_FORMULAIRE}#envoi-${etat}` }
  });
}

function methodeRefusee(permise) {
  const reponse = json({ ok: false, erreur: 'methode' }, 405);
  reponse.headers.set('Allow', permise);
  return reponse;
}

function json(corps, statut) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...EN_TETES_SECURITE, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

// Jamais de donnee personnelle : evenement et noms de champs uniquement.
function journal(evenement, extra) {
  console.log(JSON.stringify({ evenement, ...extra }));
}
