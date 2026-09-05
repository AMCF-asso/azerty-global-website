const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = __dirname;

const PUBLIC_ROOT_FILES = [
  "_headers",
  "_redirects",
  "LICENSE",
  "robots.txt",
  "sitemap.xml",
];

const PUBLIC_DIRECTORIES = [
  ".well-known",
  "assets",
  "css",
  "data",
  "docs",
  "images",
  "js",
  "tester",
];

const PUBLIC_EXCLUDED_FILES = new Set([
  "data/AZERTY Global Final.json",
]);

const LOCAL_ONLY_HTML_NAMES = new Set([
  "aide-memoire.html",
]);

const STATIC_GENERATED_HTML_NAMES = new Set([
  "licence.html",
  "mentions-legales.html",
]);

function toPosix(relPath) {
  return relPath.replace(/\\/g, "/");
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function walkFiles(relDir) {
  // Only reviewed, versioned assets belong in a release. In particular, ignored
  // exports and backups must never be copied just because they sit under assets/.
  const output = execFileSync('git', ['ls-files', '--stage', '-z', '--', relDir], {
    cwd: ROOT, encoding: 'utf8'
  });
  return output.split('\0').filter(Boolean).map((entry) => {
    const [metadata, relPath] = entry.split('\t');
    const mode = metadata.split(' ')[0];
    if (mode !== '100644' && mode !== '100755') {
      throw new Error(`Unsupported public file type: ${relPath}`);
    }
    const publicDotFile = relPath === 'data/.XCompose_global';
    if (!publicDotFile && /(?:^|\/)\.(?!well-known(?:\/|$))|\.(?:env|pem|key|pfx|p12|bak|log|tmp|sql|sqlite|db)$/i.test(relPath)) {
      throw new Error(`Private or temporary file in public directory: ${relPath}`);
    }
    return relPath;
  });
}

function getLandingGeneratedHtmlNames() {
  const landingsPath = path.join(ROOT, "src", "_data", "landings.js");
  if (!fs.existsSync(landingsPath)) return [];

  const landings = require(landingsPath);
  if (!Array.isArray(landings)) return [];

  return landings
    .map((landing) => landing && landing.slug)
    .filter(Boolean)
    .map((slug) => `${slug}.html`);
}

function getGeneratedPageHtmlNames() {
  const pagesDir = path.join(ROOT, "src", "pages");
  if (!fs.existsSync(pagesDir)) return [];

  return fs.readdirSync(pagesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".njk"))
    .map((entry) => entry.name.replace(/\.njk$/, ".html"));
}

function getGeneratedRootHtmlNames() {
  return new Set([
    ...STATIC_GENERATED_HTML_NAMES,
    ...getLandingGeneratedHtmlNames(),
    ...getGeneratedPageHtmlNames(),
  ]);
}

function getTrackedRootHtmlFiles() {
  const generatedHtmlNames = getGeneratedRootHtmlNames();
  const output = execFileSync("git", ["ls-files", "--", "*.html"], {
    cwd: ROOT,
    encoding: "utf8",
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((relPath) => relPath.endsWith(".html"))
    .filter((relPath) => !relPath.includes("/") && !relPath.includes("\\"))
    .filter((relPath) => !LOCAL_ONLY_HTML_NAMES.has(relPath))
    .filter((relPath) => !generatedHtmlNames.has(relPath))
    .filter((relPath) => !relPath.endsWith("-v2.html"));
}

function addPassthrough(eleventyConfig, relPath) {
  const normalized = toPosix(relPath);
  if (PUBLIC_EXCLUDED_FILES.has(normalized) || !exists(normalized)) return;
  eleventyConfig.addPassthroughCopy({ [normalized]: normalized });
}

module.exports = function (eleventyConfig) {
  for (const relPath of PUBLIC_ROOT_FILES) {
    addPassthrough(eleventyConfig, relPath);
  }

  // Convention llmstxt.org : /llms.txt à la racine, en plus de /docs/llms.txt.
  // Un second addPassthroughCopy sur la même source serait dédupliqué : copie post-build.
  eleventyConfig.on("eleventy.after", () => {
    fs.copyFileSync(
      path.join(ROOT, "docs", "llms.txt"),
      path.join(ROOT, "dist", "llms.txt")
    );
  });

  for (const relPath of getTrackedRootHtmlFiles()) {
    addPassthrough(eleventyConfig, relPath);
  }

  for (const relDir of PUBLIC_DIRECTORIES) {
    for (const relPath of walkFiles(relDir)) {
      addPassthrough(eleventyConfig, relPath);
    }
  }

  eleventyConfig.ignores.add("dist/**");
  eleventyConfig.ignores.add("dist-11ty/**");
  eleventyConfig.ignores.add("node_modules/**");
  eleventyConfig.ignores.add("archive/**");
  eleventyConfig.ignores.add(".internal/**");

  return {
    dir: {
      input: ".",
      output: "dist",
      includes: "src/_includes",
      data: "src/_data",
    },
    templateFormats: ["njk"],
    passthroughFileCopy: true,
  };
};
