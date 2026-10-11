#!/usr/bin/env node
// Vérifie les liens du site avec lychee (https://lychee.cli.rs), réglé par
// ../lychee.toml. Remplace check-links.py (rangé dans scripts/legacy/) après le
// banc du 2026-10-05 : rappel 73 % contre 64 % sur le corpus, et pas de faux
// 403 sur HelloAsso ni l'INPI, qui bloquent le client Python.
//
//   node scripts/check-links.mjs                       # le site en production
//   node scripts/check-links.mjs --root dist           # le build local
//   node scripts/check-links.mjs --root dist --internes-seulement
//
// Mêmes options et même verdict que l'ancien script : code 1 seulement pour un
// lien interne mort ; un lien externe en échec est listé, sans faire échouer
// (un 403 est presque toujours un anti-robot : à confirmer à la main).
//
// Ce que lychee ne lit pas : les attributs data-src et data-macos-src (widgets
// HelloAsso), et la casse des URL, que Cloudflare Pages distingue.
//
// Installer lychee : winget install --id lycheeverse.lychee -e --scope user

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SITE = 'https://azerty.global';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const WINGET = path.join(homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages',
  'lycheeverse.lychee_Microsoft.Winget.Source_8wekyb3d8bbwe',
  'lychee-x86_64-pc-windows-msvc', 'lychee.exe');

function findLychee() {
  const probe = spawnSync('lychee', ['--version'], { encoding: 'utf8' });
  if (probe.status === 0) return 'lychee';
  if (existsSync(WINGET)) return WINGET;
  console.error('lychee introuvable : winget install --id lycheeverse.lychee -e --scope user');
  process.exit(2);
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// _redirects (règles 301 seulement) et URL absolues du site ramenées sur le build.
// lychee applique le premier remap qui correspond : les redirections d'abord.
function remaps(root) {
  const base = pathToFileURL(root).href.replace(/\/$/, '');
  const out = [];
  const rules = readFileSync(path.join(REPO, '_redirects'), 'utf8').split(/\r?\n/);
  for (const line of rules) {
    const [from, to, code] = line.trim().split(/\s+/);
    if (!from || from.startsWith('#') || code !== '301' || from.includes('*')) continue;
    for (const prefix of [SITE, base]) {
      out.push('--remap', `^${escape(prefix + from)}$ ${base}${to === '/' ? '/index.html' : to}`);
    }
  }
  out.push('--remap', `^${escape(SITE)}/(.*)$ ${base}/$1`);
  return out;
}

async function sitemapPages() {
  const response = await fetch(`${SITE}/sitemap.xml`);
  if (!response.ok) {
    console.error(`sitemap.xml illisible (${response.status})`);
    process.exit(1);
  }
  const body = await response.text();
  return [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const args = process.argv.slice(2);
const rootArg = args.includes('--root') ? args[args.indexOf('--root') + 1] : null;
const offline = args.includes('--internes-seulement');
const lychee = findLychee();

const cmd = ['--config', path.join(REPO, 'lychee.toml'), '--format', 'json', '--no-progress'];
let scratch = null;
let isInternal;

if (rootArg) {
  const root = path.resolve(rootArg);
  if (!existsSync(root)) {
    console.error(`${rootArg} n'existe pas : lancer npm run build d'abord`);
    process.exit(1);
  }
  const base = pathToFileURL(root).href;
  cmd.push('--root-dir', root.replaceAll('\\', '/'), ...remaps(root));
  if (offline) cmd.push('--offline');
  cmd.push(root);
  isInternal = (url) => url.startsWith(base) || url.startsWith(SITE);
  console.log(`${rootArg} : build local`);
} else {
  if (offline) console.log('--internes-seulement : seules les URL du site sont vérifiées');
  const pages = await sitemapPages();
  scratch = mkdtempSync(path.join(tmpdir(), 'check-links-'));
  const list = path.join(scratch, 'pages.txt');
  writeFileSync(list, pages.join('\n') + '\n');
  cmd.push('--files-from', list);
  if (offline) cmd.push('--include', `^${escape(SITE)}`);
  isInternal = (url) => url.startsWith(SITE);
  console.log(`${SITE} : ${pages.length} pages au sitemap`);
}

const run = spawnSync(lychee, cmd, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (scratch) rmSync(scratch, { recursive: true, force: true });
if (run.status !== 0 && run.status !== 2) {
  console.error(`lychee a échoué (code ${run.status}) :\n${run.stderr}`);
  process.exit(2);
}

const report = JSON.parse(run.stdout);
// Une entrée par URL : lychee répète « Error (cached) » pour chaque page qui
// reprend un lien déjà en échec.
const failures = new Map();
for (const [source, errors] of Object.entries(report.error_map ?? {})) {
  const page = rootArg ? path.relative(path.resolve(rootArg), source).replaceAll('\\', '/') : source;
  for (const error of errors) {
    const entry = failures.get(error.url) ?? { url: error.url, status: null, pages: new Set() };
    const status = error.status?.text ?? '?';
    if (!entry.status || entry.status.includes('(cached)')) entry.status = status;
    entry.pages.add(page);
    failures.set(error.url, entry);
  }
}
const internal = [...failures.values()].filter((f) => isInternal(f.url));
const external = [...failures.values()].filter((f) => !isInternal(f.url));

console.log(`${report.total} liens vérifiés (${report.unique} uniques), ${report.excludes} exclus`);
const show = (title, list) => {
  console.log(`\n--- ${title} : ${list.length}`);
  for (const { url, status, pages } of list.sort((a, b) => a.url.localeCompare(b.url))) {
    console.log(`  [${status}] ${url}`);
    for (const page of [...pages].sort().slice(0, 3)) console.log(`        <- ${page}`);
  }
};
show('liens internes en echec', internal);
if (offline && rootArg) {
  console.log('\n--- liens externes : non verifies (--internes-seulement)');
} else if (!offline) {
  show('liens externes en echec', external);
  if (external.length) console.log('    un 403 est presque toujours un anti-robot : a confirmer a la main');
}
process.exit(internal.length ? 1 : 0);
