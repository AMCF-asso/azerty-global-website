// Aide des tests : Worker reel sous Miniflare, avec une vraie D1 locale (SQLite)
// et le binding de limitation de debit. Rien n'est envoye au compte Cloudflare.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const racine = new URL('..', import.meta.url);
export const ORIGINE = 'https://azerty.global';
export const URL_API = `${ORIGINE}/api/demandes`;
export const URL_COMPTE = `${ORIGINE}/api/demandes/compte`;

export function instructionsMigration() {
  const sql = readFileSync(new URL('migrations/0001_demandes.sql', racine), 'utf8');
  return sql
    .split('\n')
    .filter((ligne) => !ligne.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

export async function demarrer({ seuil = '200', cache = false } = {}) {
  const journaux = [];
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    scriptPath: fileURLToPath(new URL('src/index.js', racine)),
    compatibilityDate: '2026-07-01',
    d1Databases: { DB: 'azerty-global-demandes-test' },
    ratelimits: { LIMITEUR: { namespace_id: '4101', simple: { limit: 5, period: 60 } } },
    bindings: { SEUIL: seuil, SEL_IP: 'sel-de-test' },
    cacheAPI: cache,
    // Journaux du Worker (console.log) captures pour verifier l'absence de donnees personnelles.
    handleStructuredLogs(entree) {
      journaux.push(JSON.stringify(entree));
    }
  }));
  const { DB: db } = await mf.getBindings();
  await db.batch(instructionsMigration().map((s) => db.prepare(s)));

  let compteurIp = 0;
  const api = {
    mf,
    db,
    journaux,
    async fermer() {
      await mf.dispose();
    },
    // Chaque requete part d'une IP differente, sauf si `ip` est fourni.
    async poster(corps, { ip, entetes = {}, type = 'form' } = {}) {
      const h = {
        'CF-Connecting-IP': ip ?? `203.0.113.${(compteurIp += 1)}`,
        ...entetes
      };
      let body = corps;
      if (type === 'form' && typeof corps !== 'string') {
        body = formUrl(corps);
        h['Content-Type'] = 'application/x-www-form-urlencoded';
      } else if (type === 'multipart') {
        const f = new FormData();
        for (const [k, v] of paires(corps)) f.append(k, v);
        ({ body, type: h['Content-Type'] } = await multipart(f));
      }
      return mf.dispatchFetch(URL_API, { method: 'POST', headers: h, body, redirect: 'manual' });
    },
    async lignes() {
      const { results } = await db.prepare('SELECT * FROM demandes ORDER BY id').all();
      return results;
    }
  };
  return api;
}

// dispatchFetch de Miniflare n'ecrit pas l'en-tete multipart d'un FormData :
// on serialise avec le Request de Node et on passe corps et type explicitement.
export async function multipart(formData) {
  const requete = new Request('https://azerty.global/', { method: 'POST', body: formData });
  return { body: new Uint8Array(await requete.arrayBuffer()), type: requete.headers.get('content-type') };
}

export function paires(corps) {
  const sortie = [];
  for (const [k, v] of Object.entries(corps)) {
    if (Array.isArray(v)) for (const x of v) sortie.push([k, x]);
    else sortie.push([k, v]);
  }
  return sortie;
}

export function formUrl(corps) {
  return new URLSearchParams(paires(corps)).toString();
}

export function valide(extra = {}) {
  return {
    email: 'Alice@Example.org ',
    pays: 'FR',
    produits: ['autocollants'],
    consentement: 'oui',
    ...extra
  };
}
