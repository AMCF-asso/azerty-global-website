#!/usr/bin/env node
/**
 * Sonde les états HTTP des routes publiques en production.
 *
 * Usage :
 *   node scripts/check-live-routes.js <baseUrl> <route1,route2,...>
 *   node scripts/check-live-routes.js <baseUrl> @fichier.txt   (une route par ligne, # = commentaire)
 *
 * HEAD d'abord, GET sans corps en repli si HEAD renvoie 405/501.
 * Les redirections ne sont PAS suivies : le code et l'en-tête Location sont
 * rapportés tels quels. Sortie : table markdown sur stdout.
 */
const fs = require('fs');

async function probe(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const resp = await fetch(url, { method, redirect: 'manual' });
      if ((resp.status === 405 || resp.status === 501) && method === 'HEAD') continue;
      return {
        status: resp.status,
        location: resp.headers.get('location') || '',
        method,
      };
    } catch (err) {
      if (method === 'GET') return { status: 'ERREUR', location: err.message, method };
    }
  }
  return { status: 'ERREUR', location: 'aucune réponse', method: '-' };
}

async function main() {
  const [baseUrl, routesArg] = process.argv.slice(2);
  if (!baseUrl || !routesArg) {
    console.error('Usage: node scripts/check-live-routes.js <baseUrl> <routes|@fichier>');
    process.exit(1);
  }
  let routes;
  if (routesArg.startsWith('@')) {
    routes = fs
      .readFileSync(routesArg.slice(1), 'utf-8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
  } else {
    routes = routesArg.split(',').map((r) => r.trim()).filter(Boolean);
  }

  console.log('| Route | Statut | Location |');
  console.log('|---|---|---|');
  let anomalies = 0;
  for (const route of routes) {
    const url = route.startsWith('http') ? route : baseUrl.replace(/\/$/, '') + route;
    const r = await probe(url);
    const ok = r.status === 200 || r.status === 301 || r.status === 308;
    if (!ok) anomalies += 1;
    console.log(`| ${route} | ${r.status}${r.method === 'GET' ? ' (GET)' : ''} | ${r.location} |`);
    await new Promise((res) => setTimeout(res, 120));
  }
  console.error(`\n${routes.length} routes sondées, ${anomalies} hors 200/301/308.`);
}

main();
