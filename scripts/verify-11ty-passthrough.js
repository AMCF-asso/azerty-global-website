const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist-11ty");

const REQUIRED_ROOT_FILES = [
  "_headers",
  "_redirects",
  "LICENSE",
  "robots.txt",
  "sitemap.xml",
];

const LOCAL_ONLY_HTML_NAMES = new Set([
  "aide-memoire.html",
]);

const GENERATED_HTML_NAMES = new Set([
  "e-aigu-majuscule.html",
  "licence.html",
  "mentions-legales.html",
]);

const PROTECTED_PUBLIC_DATA = [
  "data/AZERTY Global.json",
  "data/AZERTY Global Beta.json",
];

const EXCLUDED_PUBLIC_DATA = [
  "data/AZERTY Global Final.json",
];

const errors = [];

function relPath(absolutePath) {
  return path.relative(ROOT, absolutePath).replace(/\\/g, "/");
}

function distPath(rel) {
  return path.join(DIST, rel);
}

function fail(message) {
  errors.push(message);
  console.log(`  [FAIL] ${message}`);
}

function ok(message) {
  console.log(`  [OK] ${message}`);
}

function readUtf8(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function lineNumberFor(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function getTrackedRootHtmlFiles() {
  const output = execFileSync("git", ["ls-files", "--", "*.html"], {
    cwd: ROOT,
    encoding: "utf8",
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((rel) => rel.endsWith(".html"))
    .filter((rel) => !rel.includes("/") && !rel.includes("\\"))
    .filter((rel) => !LOCAL_ONLY_HTML_NAMES.has(rel))
    .filter((rel) => !rel.endsWith("-v2.html"))
    .sort();
}

function getDistRootHtmlFiles() {
  if (!fs.existsSync(DIST)) return [];

  return fs.readdirSync(DIST, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => entry.name)
    .sort();
}

function checkDistRoot() {
  console.log("\n[1/6] Sortie 11ty");

  if (!fs.existsSync(DIST)) {
    fail("dist-11ty absent. Lancer `npm run build:11ty` avant la verification.");
    return;
  }

  ok("dist-11ty existe");

  for (const rel of REQUIRED_ROOT_FILES) {
    if (!fs.existsSync(distPath(rel))) {
      fail(`${rel} absent de dist-11ty`);
    }
  }

  if (REQUIRED_ROOT_FILES.every((rel) => fs.existsSync(distPath(rel)))) {
    ok("fichiers racine requis presents");
  }

  const headers = fs.existsSync(distPath("_headers"))
    ? fs.readFileSync(distPath("_headers"), "utf8")
    : "";
  if (headers && headers.includes("Content-Security-Policy:") && headers.includes("script-src") && headers.includes("style-src")) {
    ok("_headers contient une CSP avec script-src et style-src");
  } else if (headers) {
    fail("_headers ne contient pas la CSP attendue");
  }
}

function checkHtmlSurface() {
  console.log("\n[2/6] Surface HTML publique");

  const expected = getTrackedRootHtmlFiles();
  const actual = getDistRootHtmlFiles();
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);

  for (const file of expected) {
    if (!actualSet.has(file)) {
      fail(`${file} absent de dist-11ty`);
    }
  }

  for (const file of actual) {
    if (!expectedSet.has(file)) {
      fail(`${file} present dans dist-11ty mais absent des HTML publics suivis par Git`);
    }
  }

  if (expected.length === actual.length && expected.every((file) => actualSet.has(file))) {
    ok(`${actual.length} pages HTML publiques presentes`);
  }

  if (fs.existsSync(distPath("aide-memoire.html"))) {
    fail("aide-memoire.html ne doit pas etre publie par le passthrough initial");
  } else {
    ok("aide-memoire.html absent de dist-11ty");
  }

  for (const file of GENERATED_HTML_NAMES) {
    const generated = fs.existsSync(distPath(file));
    const source = fs.existsSync(path.join(ROOT, file));
    if (!generated) {
      fail(`${file} devrait etre genere par 11ty`);
    } else if (!source) {
      fail(`${file} source de reference absent a la racine`);
    } else if (sha256(distPath(file)) === sha256(path.join(ROOT, file))) {
      fail(`${file} est identique a la source racine : la page semble encore en passthrough`);
    } else {
      ok(`${file} genere par 11ty`);
    }
  }
}

function checkCspUnsafePatterns() {
  console.log("\n[3/6] Garde-fou CSP HTML");

  let issueCount = 0;
  for (const fileName of getDistRootHtmlFiles()) {
    const filePath = distPath(fileName);
    const html = fs.readFileSync(filePath, "utf8");

    const replacementIndex = html.indexOf("\uFFFD");
    if (replacementIndex !== -1) {
      issueCount++;
      fail(`${fileName}:${lineNumberFor(html, replacementIndex)} contient U+FFFD`);
    }

    for (const pattern of [
      { name: "handler inline", regex: /\son[a-z]+\s*=/gi },
      { name: "style inline", regex: /\sstyle\s*=/gi },
    ]) {
      let match;
      while ((match = pattern.regex.exec(html)) !== null) {
        issueCount++;
        fail(`${fileName}:${lineNumberFor(html, match.index)} contient ${pattern.name}`);
      }
    }

    const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      const attrs = match[1] || "";
      const body = match[2] || "";
      const hasSrc = /\ssrc\s*=/.test(attrs);
      const typeMatch = /\stype\s*=\s*["']?([^"'\s>]+)["']?/i.exec(attrs);
      const type = typeMatch ? typeMatch[1].toLowerCase() : "";
      const isJsonLd = type === "application/ld+json";

      if (!hasSrc && !isJsonLd && body.trim()) {
        issueCount++;
        fail(`${fileName}:${lineNumberFor(html, match.index)} contient un script inline non JSON-LD`);
      }
    }
  }

  if (issueCount === 0) {
    ok("aucun handler inline, style inline, script inline non JSON-LD ou U+FFFD detecte");
  }
}

function checkProtectedDataCopies() {
  console.log("\n[4/6] Donnees protegees");

  for (const rel of PROTECTED_PUBLIC_DATA) {
    const sourcePath = path.join(ROOT, rel);
    const targetPath = distPath(rel);

    if (!fs.existsSync(sourcePath)) {
      fail(`${rel} absent de la source`);
      continue;
    }
    if (!fs.existsSync(targetPath)) {
      fail(`${rel} absent de dist-11ty`);
      continue;
    }
    if (sha256(sourcePath) !== sha256(targetPath)) {
      fail(`${rel} differe entre la source et dist-11ty`);
      continue;
    }

    ok(`${rel} copie sans modification`);
  }

  for (const rel of EXCLUDED_PUBLIC_DATA) {
    if (fs.existsSync(distPath(rel))) {
      fail(`${rel} ne doit pas etre copie dans dist-11ty`);
    } else {
      ok(`${rel} exclu de dist-11ty`);
    }
  }
}

function checkPassthroughAssets() {
  console.log("\n[5/6] Assets critiques");

  const criticalPaths = [
    "css/variables.css",
    "css/base.css",
    "css/components.css",
    "js/theme.js",
    "js/app.js",
    "tester/keyboard.js",
    "tester/keyboard.css",
    "tester/lessons.json",
    "assets/logo-azerty-global.webp",
    "assets/og-image.png",
  ];

  for (const rel of criticalPaths) {
    if (!fs.existsSync(distPath(rel))) {
      fail(`${rel} absent de dist-11ty`);
    }
  }

  if (criticalPaths.every((rel) => fs.existsSync(distPath(rel)))) {
    ok("assets critiques presents");
  }
}

function checkGitProtectedFiles() {
  console.log("\n[6/6] Etat Git des sources protegees");

  const protectedPaths = [
    "data/AZERTY Global.json",
    "data/AZERTY Global Beta.json",
  ];

  const output = execFileSync("git", ["diff", "--name-status", "--", ...protectedPaths], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();

  if (output) {
    for (const line of output.split(/\r?\n/)) {
      fail(`source protegee modifiee: ${line}`);
    }
  } else {
    ok("aucune source protegee du site modifiee dans Git");
  }
}

function main() {
  console.log("Verification 11ty passthrough - AZERTY Global");
  console.log(`Racine : ${ROOT}`);

  checkDistRoot();
  checkHtmlSurface();
  checkCspUnsafePatterns();
  checkProtectedDataCopies();
  checkPassthroughAssets();
  checkGitProtectedFiles();

  console.log("\n============================================================");
  if (errors.length > 0) {
    console.log(`ECHEC - ${errors.length} probleme(s) detecte(s)`);
    process.exit(1);
  }

  console.log("OK - passthrough 11ty conforme aux garde-fous initiaux");
}

main();
