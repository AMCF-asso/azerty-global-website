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
  const absoluteDir = path.join(ROOT, relDir);
  if (!fs.existsSync(absoluteDir)) return [];

  const files = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relPath = toPosix(path.join(relDir, entry.name));
    if (entry.isDirectory()) {
      files.push(...walkFiles(relPath));
    } else if (entry.isFile()) {
      files.push(relPath);
    }
  }
  return files;
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
