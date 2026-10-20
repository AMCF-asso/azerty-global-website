#!/usr/bin/env node
// wt : worktrees du site pour les sessions d'agents.
// Mode d'emploi : scripts/wt.md. Aucune commande ne pousse, ne fetch (sauf --fetch) ni ne prune.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const MAX_WT = Number(process.env.WT_MAX || 8);
const PORT_MIN = Number(process.env.WT_PORT_MIN || 4200);
const PORT_MAX = Number(process.env.WT_PORT_MAX || 4299);
// Ports codés en dur ailleurs : dev (3000), e2e (4173-4182).
const RESERVED_PORTS = new Set([3000, ...Array.from({ length: 10 }, (_, i) => 4173 + i)]);
const MIN_DIST_FILES = 20;
const META = 'wt.json';

function git(args, opts = {}) {
  const r = spawnSync('git', args, { encoding: 'utf8', cwd: opts.cwd || SCRIPT_DIR });
  if (opts.check !== false && r.status !== 0) {
    throw new Error(`git ${args.join(' ')} : ${(r.stderr || r.stdout).trim()}`);
  }
  return opts.raw ? r : r.stdout.trim();
}

function repo() {
  const common = path.resolve(SCRIPT_DIR, git(['rev-parse', '--git-common-dir']));
  const main = path.dirname(common);
  const root = process.env.WT_ROOT || path.join(path.dirname(main), `${path.basename(main)}-wt`);
  return { common, main, root };
}

function samePath(a, b) {
  return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
}

function worktrees() {
  const out = git(['worktree', 'list', '--porcelain']);
  const list = [];
  let cur = null;
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('worktree ')) {
      cur = { path: path.resolve(line.slice(9)) };
      list.push(cur);
    } else if (!cur || line === '') {
      continue;
    } else if (line.startsWith('HEAD ')) cur.head = line.slice(5);
    else if (line.startsWith('branch ')) cur.branch = line.slice(7).replace('refs/heads/', '');
    else if (line === 'detached') cur.detached = true;
    else if (line.startsWith('locked')) cur.locked = true;
    else if (line.startsWith('prunable')) cur.prunable = true;
  }
  const { common } = repo();
  const gitdirs = path.join(common, 'worktrees');
  const ids = fs.existsSync(gitdirs) ? fs.readdirSync(gitdirs) : [];
  for (const id of ids) {
    const dir = path.join(gitdirs, id);
    let target;
    try {
      target = path.dirname(fs.readFileSync(path.join(dir, 'gitdir'), 'utf8').trim());
    } catch {
      continue;
    }
    const wt = list.find((w) => samePath(w.path, target));
    if (!wt) continue;
    wt.gitdir = dir;
    const meta = path.join(dir, META);
    if (fs.existsSync(meta)) wt.meta = JSON.parse(fs.readFileSync(meta, 'utf8'));
  }
  list[0].main = true;
  return list;
}

function owned() {
  return worktrees().filter((w) => w.meta);
}

function findOwned(name) {
  const w = owned().find((x) => x.meta.name === name);
  if (!w) throw new Error(`aucun worktree wt nommé « ${name} » (voir : wt list)`);
  return w;
}

function writeMeta(w, patch) {
  w.meta = { ...w.meta, ...patch };
  fs.writeFileSync(path.join(w.gitdir, META), `${JSON.stringify(w.meta, null, 2)}\n`);
}

function portFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, '127.0.0.1', () => srv.close(() => resolve(true)));
  });
}

async function pickPort() {
  const used = new Set(owned().map((w) => w.meta.port));
  for (let p = PORT_MIN; p <= PORT_MAX; p += 1) {
    if (used.has(p) || RESERVED_PORTS.has(p)) continue;
    if (await portFree(p)) return p;
  }
  throw new Error(`aucun port libre entre ${PORT_MIN} et ${PORT_MAX}`);
}

function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? countFiles(path.join(dir, e.name)) : 1;
  }
  return n;
}

function npm(args, cwd) {
  // shell requis pour npm.cmd sous Windows ; arguments fixes, aucun texte utilisateur.
  if (process.platform === 'win32') return spawnSync(`npm ${args.join(' ')}`, { cwd, stdio: 'inherit', shell: true });
  return spawnSync('npm', args, { cwd, stdio: 'inherit' });
}

function boot(w) {
  const dir = w.path;
  console.log(`\n[1/3] npm ci dans ${dir}`);
  if (npm(['ci', '--no-audit', '--no-fund'], dir).status !== 0) throw new Error('npm ci a échoué');
  const lock = path.join(dir, 'node_modules', '.package-lock.json');
  const packages = fs.existsSync(lock)
    ? Object.keys(JSON.parse(fs.readFileSync(lock, 'utf8')).packages || {}).length
    : 0;
  if (packages === 0) throw new Error('node_modules vide après npm ci');
  console.log(`      paquets installés : ${packages}`);

  console.log('[2/3] npm run build');
  const start = Date.now();
  if (npm(['run', 'build'], dir).status !== 0) throw new Error('npm run build a échoué');

  // Un build qui sort en 0 ne prouve rien (lessons.md:113) : on vérifie dist/.
  console.log('[3/3] vérification de dist/');
  const index = path.join(dir, 'dist', 'index.html');
  if (!fs.existsSync(index)) throw new Error('dist/index.html absent : build vide');
  if (fs.statSync(index).mtimeMs < start - 2000) throw new Error('dist/index.html antérieur au build : rien n\'a été construit');
  const files = countFiles(path.join(dir, 'dist'));
  const baseline = countFiles(path.join(repo().main, 'dist'));
  const floor = Math.max(MIN_DIST_FILES, Math.floor(baseline / 2));
  if (files < floor) throw new Error(`dist/ : ${files} fichiers, seuil ${floor} (référence checkout principal : ${baseline})`);
  console.log(`      dist/ : ${files} fichiers (seuil ${floor}, référence ${baseline}), index.html neuf`);
  writeMeta(w, { booted: { at: new Date().toISOString(), packages, distFiles: files } });
}

async function cmdNew(name, opts) {
  if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(name || '')) throw new Error('nom attendu : minuscules, chiffres, tirets (41 car. max)');
  const { root } = repo();
  const mine = owned();
  if (mine.length >= MAX_WT) {
    throw new Error(`plafond atteint : ${mine.length}/${MAX_WT} worktrees wt (wt tidy, wt rm, ou WT_MAX)`);
  }
  if (mine.some((w) => w.meta.name === name)) throw new Error(`« ${name} » existe déjà`);
  const dir = path.join(root, name);
  if (fs.existsSync(dir)) throw new Error(`${dir} existe déjà`);
  const branch = opts.branch || `agent/${name}`;
  const base = opts.base || 'origin/main';
  if (opts.fetch) git(['fetch', 'origin', 'main']);
  const baseSha = git(['rev-parse', '--verify', `${base}^{commit}`]);
  const exists = git(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { check: false, raw: true }).status === 0;
  fs.mkdirSync(root, { recursive: true });
  // --no-track : sans upstream, un `git push` nu ne vise jamais main.
  git(exists ? ['worktree', 'add', dir, branch] : ['worktree', 'add', '--no-track', '-b', branch, dir, baseSha]);
  const port = await pickPort();
  const w = worktrees().find((x) => samePath(x.path, dir));
  writeMeta(w, { name, branch, base, baseSha, port, created: new Date().toISOString() });
  console.log(`créé : ${dir}\n      branche ${branch} sur ${base} (${baseSha.slice(0, 7)}), port ${port}`);
  console.log(`      worktrees wt : ${mine.length + 1}/${MAX_WT}`);
  if (opts['no-boot']) {
    console.log(`\nnon amorcé : node scripts/wt.mjs boot ${name} avant tout build ou test`);
    return;
  }
  boot(w);
  console.log(`\nprêt. Aperçu : node scripts/serve-static.js dist ${port}   (depuis ${dir})`);
}

function dirty(w) {
  return git(['status', '--porcelain'], { cwd: w.path }) !== '';
}

// `git worktree remove` efface aussi les fichiers ignorés. Seuls ceux qui se
// régénèrent partent ; le reste (.internal/, archive/, *-v2.html…) bloque le retrait.
const REGENERABLE = [
  /(^|\/)node_modules\/$/,
  /^dist[^/]*\/$/,
  /(^|\/)__pycache__\/$/,
  /\.pyc$/,
  /^test-results[^/]*\/$/,
  /^playwright-report\/$/,
  /^\.wrangler\/$/,
];

function ignoredToKeep(w) {
  const out = git(['ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--directory'], { cwd: w.path });
  return out.split('\0').filter((p) => p && !REGENERABLE.some((re) => re.test(p)));
}

function isAncestor(a, b) {
  return git(['merge-base', '--is-ancestor', a, b], { check: false, raw: true }).status === 0;
}

// Prune sûr ? Index identique à HEAD et reflog atteignable depuis les refs (lessons.md:123).
function pruneCheck(w, reachable) {
  if (!w.gitdir) return 'gitdir introuvable';
  const env = ['--git-dir', w.gitdir];
  const r = git([...env, 'diff-index', '--cached', '--quiet', w.head], { check: false, raw: true });
  if (r.status !== 0) return 'index non commité : garder';
  const log = path.join(w.gitdir, 'logs', 'HEAD');
  const shas = fs.existsSync(log)
    ? fs.readFileSync(log, 'utf8').split(/\r?\n/).map((l) => l.split(' ')[1]).filter(Boolean)
    : [];
  const lost = [...new Set(shas)].filter((s) => !/^0+$/.test(s) && !reachable.has(s));
  return lost.length ? `${lost.length} commit(s) hors refs : garder` : 'prune sûr';
}

function verdict(w, base, reachable) {
  if (w.main) return { label: 'checkout principal' };
  if (w.locked) return { label: 'verrouillé' };
  if (w.prunable) return { label: `prunable, dossier absent (${pruneCheck(w, reachable)})` };
  if (dirty(w)) return { label: 'modifications non commitées' };
  const keep = ignoredToKeep(w);
  if (keep.length) return { label: `fichiers ignorés à garder (${keep.slice(0, 3).join(', ')}${keep.length > 3 ? '…' : ''})` };
  if (w.meta && w.head === w.meta.baseSha) return { label: 'neuf, sans commit' };
  if (isAncestor(w.head, base)) return { label: 'fusionnée dans la base', candidate: true };
  const ahead = git(['rev-list', '--count', `${base}..${w.head}`]);
  return { label: `en cours (${ahead} commit(s) hors base)` };
}

function cmdList() {
  const all = worktrees();
  const mine = all.filter((w) => w.meta);
  for (const w of all) {
    const tag = w.main ? 'principal' : w.meta ? `wt:${w.meta.name} port ${w.meta.port}` : '-';
    const ref = w.branch || (w.detached ? `détaché ${w.head.slice(0, 7)}` : '?');
    const flags = [w.locked && 'verrouillé', w.prunable && 'prunable', w.meta?.booted && `amorcé (${w.meta.booted.distFiles} fichiers dist)`].filter(Boolean);
    console.log(`${tag.padEnd(24)} ${ref.padEnd(34)} ${w.path}${flags.length ? `  [${flags.join(', ')}]` : ''}`);
  }
  console.log(`\nworktrees : ${all.length} au total, dont ${mine.length}/${MAX_WT} gérés par wt`);
}

function cmdTidy(opts) {
  const base = opts.base || 'origin/main';
  git(['rev-parse', '--verify', `${base}^{commit}`]);
  const reachable = new Set(git(['rev-list', '--branches', '--tags', '--remotes']).split(/\r?\n/));
  const counts = { total: 0, candidats: 0, candidatsWt: 0, retires: 0 };
  console.log(opts.apply ? `rangement réel, base ${base}` : `rangement à blanc (rien n'est retiré), base ${base}`);
  for (const w of worktrees()) {
    counts.total += 1;
    const v = verdict(w, base, reachable);
    let action = '';
    if (v.candidate) {
      counts.candidats += 1;
      if (w.meta) {
        counts.candidatsWt += 1;
        action = opts.apply ? remove(w, base) : '→ serait retiré (wt tidy --apply)';
        if (opts.apply && action.startsWith('retiré')) counts.retires += 1;
      } else {
        action = '→ hors wt : laissé (retrait à la main, après relecture)';
      }
    }
    const who = w.meta ? `wt:${w.meta.name}` : path.basename(w.path);
    console.log(`  ${who.padEnd(30)} ${v.label} ${action}`);
  }
  console.log(`\nworktrees ${counts.total} · fusionnés ${counts.candidats} · dont wt ${counts.candidatsWt} · retirés ${counts.retires}`);
  console.log('aucun git worktree prune lancé.');
}

function remove(w, base) {
  const keep = ignoredToKeep(w);
  if (keep.length) return `refusé : fichiers ignorés à garder (${keep.join(', ')}) ; les déplacer ou les supprimer d'abord`;
  // Sans --force : git refuse un worktree modifié ou avec des fichiers non suivis.
  const r = git(['worktree', 'remove', w.path], { check: false, raw: true });
  const gone = !fs.existsSync(w.path) && !fs.existsSync(w.gitdir);
  if (r.status !== 0 || !gone) {
    return `échec du retrait (${(r.stderr || '').trim() || 'dossier encore présent'}) ; rien forcé`;
  }
  let msg = 'retiré';
  if (base && w.branch) {
    // La branche ne part que si sa tête est dans la base : aucun commit perdu.
    if (isAncestor(w.head, base)) {
      git(['update-ref', '-d', `refs/heads/${w.branch}`, w.head]);
      msg += `, branche ${w.branch} supprimée (contenue dans ${base})`;
    } else {
      msg += `, branche ${w.branch} gardée (commits hors ${base})`;
    }
  }
  return msg;
}

function cmdRm(name, opts) {
  const w = findOwned(name);
  if (dirty(w)) throw new Error(`${w.path} a des modifications non commitées : commit ou abandon d'abord`);
  const msg = remove(w, opts['keep-branch'] ? null : w.meta.base);
  console.log(`${name} : ${msg}`);
  if (!msg.startsWith('retiré')) process.exitCode = 2;
}

function parse(argv) {
  const args = [];
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (['base', 'branch'].includes(key)) opts[key] = argv[(i += 1)];
      else opts[key] = true;
    } else args.push(a);
  }
  return { args, opts };
}

const USAGE = `wt — worktrees du site pour les agents (mode d'emploi : scripts/wt.md)
  node scripts/wt.mjs new <nom> [--base origin/main] [--branch agent/<nom>] [--fetch] [--no-boot]
  node scripts/wt.mjs boot <nom>        npm ci + build + vérification de dist/
  node scripts/wt.mjs list
  node scripts/wt.mjs port <nom>
  node scripts/wt.mjs tidy [--apply] [--base origin/main]
  node scripts/wt.mjs rm <nom> [--keep-branch]`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { args, opts } = parse(rest);
  switch (cmd) {
    case 'new': return cmdNew(args[0], opts);
    case 'boot': return boot(findOwned(args[0]));
    case 'list': return cmdList();
    case 'port': return console.log(findOwned(args[0]).meta.port);
    case 'tidy': return cmdTidy(opts);
    case 'rm': return cmdRm(args[0], opts);
    default:
      console.log(USAGE);
      if (cmd && cmd !== 'help') process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(`wt : ${e.message}`);
  process.exitCode = 1;
});
