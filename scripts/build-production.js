const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const COMMON_CSS = [
  'css/variables.css',
  'css/base.css',
  'css/components.css',
  'css/utilities.css'
];

const COMMON_JS = [
  'js/app.js',
  'js/easter-eggs.js',
  'js/web3forms.js'
];

const PUBLIC_ROOT_FILES = [
  '_headers',
  '_redirects',
  'LICENSE',
  'robots.txt',
  'sitemap.xml'
];

const PUBLIC_DIRECTORIES = [
  '.well-known',
  'assets',
  'css',
  'data',
  'docs',
  'images',
  'js',
  'tester'
];

const COMMON_LOCAL_PREFIXES = [
  'dist',
  'test-results'
];

const COMMON_LOCAL_NAMES = new Set([
  '.git',
  '.internal',
  'archive',
  'node_modules',
  'scripts',
  'tests',
  'README.md',
  'Page-Review.md',
  '.gitignore',
  '.gitattributes',
  'package.json',
  'package-lock.json',
  'playwright.config.js'
]);

const LOCAL_ONLY_HTML_NAMES = new Set([
  'aide-memoire.html'
]);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function writeDistFile(relPath, content) {
  const targetPath = path.join(DIST, relPath);
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content, 'utf8');
}

function assertPublicRootEntry(entry) {
  if (COMMON_LOCAL_NAMES.has(entry)) {
    throw new Error(`Refusing to copy local-only root entry: ${entry}`);
  }

  if (COMMON_LOCAL_PREFIXES.some(prefix => entry === prefix || entry.startsWith(`${prefix} `) || entry.startsWith(`${prefix} (`))) {
    throw new Error(`Refusing to copy generated root entry: ${entry}`);
  }
}

function copyRecursive(sourcePath, targetPath) {
  const stats = fs.statSync(sourcePath);

  if (stats.isDirectory()) {
    ensureDir(targetPath);

    for (const entry of fs.readdirSync(sourcePath)) {
      copyRecursive(path.join(sourcePath, entry), path.join(targetPath, entry));
    }

    return;
  }

  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function copyPublicEntry(relPath) {
  assertPublicRootEntry(relPath.split(/[\\/]/)[0]);

  const sourcePath = path.join(ROOT, relPath);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing public build entry: ${relPath}`);
  }

  copyRecursive(sourcePath, path.join(DIST, relPath));
}

function getTrackedRootHtmlFiles() {
  let output;

  try {
    output = execFileSync('git', ['ls-files', '--', '*.html'], {
      cwd: ROOT,
      encoding: 'utf8'
    });
  } catch (error) {
    throw new Error('Unable to list tracked HTML files with git. Build aborted to avoid publishing local-only pages.');
  }

  return output
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(relPath => relPath.endsWith('.html') && !relPath.includes('/') && !relPath.includes('\\'))
    .filter(relPath => !LOCAL_ONLY_HTML_NAMES.has(relPath) && !relPath.endsWith('-v2.html'));
}

function copyPublicFiles() {
  for (const relPath of PUBLIC_ROOT_FILES) {
    copyPublicEntry(relPath);
  }

  for (const relPath of getTrackedRootHtmlFiles()) {
    copyPublicEntry(relPath);
  }

  for (const relPath of PUBLIC_DIRECTORIES) {
    copyPublicEntry(relPath);
  }
}

function minifyCss(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function minifyJsLight(source) {
  const withoutBlockComments = source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  return withoutBlockComments
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'))
    .join('\n');
}

function rewriteHtml(html) {
  let output = html;

  output = output.replace(
    /<link rel="stylesheet" href="css\/variables\.css">\s*<link rel="stylesheet" href="css\/base\.css">\s*<link rel="stylesheet" href="css\/components\.css">\s*<link rel="stylesheet" href="css\/utilities\.css">/g,
    '<link rel="stylesheet" href="css/site.min.css">'
  );

  output = output.replace(/href="css\/beta\.css([?#][^"]*)?"/g, (match, suffix = '') => `href="css/beta.min.css${suffix}"`);
  output = output.replace(/<script src="js\/theme\.js([?#][^"]*)?"><\/script>/g, (match, suffix = '') => `<script src="js/theme.min.js${suffix}"></script>`);
  output = output.replace(/\s*<script defer src="js\/easter-eggs\.js(?:[?#][^"]*)?"><\/script>/g, '');
  output = output.replace(/\s*<script defer src="js\/web3forms\.js(?:[?#][^"]*)?"><\/script>/g, '');
  output = output.replace(/<script defer src="js\/app\.js([?#][^"]*)?"><\/script>/g, '<script defer src="js/site.min.js"></script>');
  output = output.replace(/src="js\/([a-z0-9-]+)\.js([?#][^"]*)?"/gi, (match, name, suffix = '') => {
    if (['theme', 'app', 'easter-eggs', 'web3forms'].includes(name)) {
      return match;
    }

    return `src="js/${name}.min.js${suffix}"`;
  });

  return output;
}

function buildCss() {
  const cssDir = path.join(ROOT, 'css');

  for (const fileName of fs.readdirSync(cssDir)) {
    if (!fileName.endsWith('.css') || fileName.endsWith('.min.css')) continue;

    const relPath = path.join('css', fileName);
    const minified = minifyCss(readFile(relPath));
    writeDistFile(path.join('css', fileName.replace(/\.css$/, '.min.css')), minified);
  }

  const siteBundle = COMMON_CSS
    .map(relPath => minifyCss(readFile(relPath)))
    .join('');

  writeDistFile('css/site.min.css', siteBundle);
}

function buildJs() {
  const jsDir = path.join(ROOT, 'js');

  for (const fileName of fs.readdirSync(jsDir)) {
    if (!fileName.endsWith('.js') || fileName.endsWith('.min.js')) continue;

    const relPath = path.join('js', fileName);
    const minified = minifyJsLight(readFile(relPath));
    writeDistFile(path.join('js', fileName.replace(/\.js$/, '.min.js')), minified);
  }

  const siteBundle = COMMON_JS
    .map(relPath => minifyJsLight(readFile(relPath)))
    .join('\n');

  writeDistFile('js/site.min.js', siteBundle);
}

function rewriteDistHtml() {
  for (const fileName of fs.readdirSync(DIST)) {
    if (!fileName.endsWith('.html')) continue;

    const htmlPath = path.join(DIST, fileName);
    const html = fs.readFileSync(htmlPath, 'utf8');
    fs.writeFileSync(htmlPath, rewriteHtml(html), 'utf8');
  }
}

function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  copyPublicFiles();
  buildCss();
  buildJs();
  rewriteDistHtml();

  console.log('Build complete:', DIST);
}

main();
