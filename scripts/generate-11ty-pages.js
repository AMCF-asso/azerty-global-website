const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "src", "pages");

const LOCAL_ONLY_HTML_NAMES = new Set([
  "aide-memoire.html",
]);

const RESERVED_GENERATED_HTML_NAMES = new Set([
  "e-aigu-majuscule.html",
  "licence.html",
  "mentions-legales.html",
]);

const DEFAULT_STYLESHEETS = new Set([
  "css/variables.css?v=20260623",
  "css/base.css?v=20260623",
  "css/components.css?v=20260623",
  "css/utilities.css?v=20260623",
]);

function toPosix(relPath) {
  return relPath.replace(/\\/g, "/");
}

function readRootFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8").replace(/^\uFEFF/, "");
}

function trackedRootHtmlFiles() {
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
    .filter((relPath) => !RESERVED_GENERATED_HTML_NAMES.has(relPath))
    .filter((relPath) => !relPath.endsWith("-v2.html"))
    .sort();
}

function extractTagContent(html, regex, fieldName, relPath) {
  const match = regex.exec(html);
  if (!match) {
    throw new Error(`${relPath}: impossible d'extraire ${fieldName}`);
  }
  return match[1].trim();
}

function extractOptionalTagContent(html, regex) {
  const match = regex.exec(html);
  return match ? match[1].trim() : "";
}

function canonicalPathFor(relPath, html) {
  const href = extractOptionalTagContent(
    html,
    /<link\s+rel=["']canonical["']\s+href=["']https:\/\/azerty\.global([^"']*)["'][^>]*>/i,
  );

  if (href) return href;
  if (relPath === "index.html") return "/";
  return `/${relPath.replace(/\.html$/, "")}`;
}

function extractStylesheets(html) {
  const stylesheets = [];
  const regex = /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1].trim();
    if (!href || href.startsWith("https://")) continue;
    if (DEFAULT_STYLESHEETS.has(href)) continue;
    stylesheets.push(href);
  }
  return stylesheets;
}

function normalizeScriptAttrs(attrs) {
  const normalized = attrs
    .replace(/\bdefer\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized ? ` ${normalized}` : "";
}

function extractScripts(html) {
  const scripts = [];
  const regex = /<script\b([^>]*)\bsrc\s*=\s*(["'])(.*?)\2([^>]*)>\s*<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const src = match[3].trim();
    if (!src || src.includes("static.cloudflareinsights.com/beacon.min.js")) continue;

    const attrs = normalizeScriptAttrs(`${match[1]} ${match[4]}`);
    if (attrs) {
      scripts.push({ src, attrs });
    } else {
      scripts.push(src);
    }
  }
  return scripts;
}

function extractJsonLd(html) {
  const blocks = [];
  const regex = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const block = match[1].trim();
    if (block) blocks.push(block);
  }
  return blocks;
}

function extractMain(html, relPath) {
  const match = /<main\b[\s\S]*?<\/main>/i.exec(html);
  if (!match) {
    throw new Error(`${relPath}: impossible d'extraire <main>`);
  }
  return match[0].trim();
}

function yamlString(value) {
  return JSON.stringify(value);
}

function pushStringField(lines, key, value) {
  if (value) lines.push(`${key}: ${yamlString(value)}`);
}

function pushArrayField(lines, key, values) {
  if (!values.length) {
    lines.push(`${key}: []`);
    return;
  }

  lines.push(`${key}:`);
  for (const value of values) {
    if (typeof value === "string") {
      lines.push(`  - ${yamlString(value)}`);
    } else {
      lines.push(`  - src: ${yamlString(value.src)}`);
      if (value.attrs) lines.push(`    attrs: ${yamlString(value.attrs)}`);
    }
  }
}

function pushBlockArrayField(lines, key, values) {
  if (!values.length) {
    lines.push(`${key}: []`);
    return;
  }

  lines.push(`${key}:`);
  for (const value of values) {
    lines.push("  - |-");
    for (const line of value.split(/\r?\n/)) {
      lines.push(`    ${line}`);
    }
  }
}

function buildTemplate(relPath) {
  const html = readRootFile(relPath);
  const bodyClass = extractTagContent(html, /<body\b[^>]*class=["']([^"']*)["'][^>]*>/i, "la classe body", relPath);
  const title = extractTagContent(html, /<title>([\s\S]*?)<\/title>/i, "le title", relPath);
  const description = extractTagContent(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["'][^>]*>/i, "la meta description", relPath);
  const robots = extractOptionalTagContent(html, /<meta\s+name=["']robots["']\s+content=["']([^"']*)["'][^>]*>/i) || "index, follow";
  const ogType = extractOptionalTagContent(html, /<meta\s+property=["']og:type["']\s+content=["']([^"']*)["'][^>]*>/i) || "website";
  const ogDescription = extractOptionalTagContent(html, /<meta\s+property=["']og:description["']\s+content=["']([^"']*)["'][^>]*>/i) || description;
  const twitterDescription = extractOptionalTagContent(html, /<meta\s+name=["']twitter:description["']\s+content=["']([^"']*)["'][^>]*>/i) || ogDescription;

  const lines = [
    "---",
    "layout: base.njk",
    `permalink: ${yamlString(relPath)}`,
  ];

  pushStringField(lines, "title", title);
  pushStringField(lines, "description", description);
  pushStringField(lines, "canonicalPath", canonicalPathFor(relPath, html));
  pushStringField(lines, "ogType", ogType);
  pushStringField(lines, "ogDescription", ogDescription);
  pushStringField(lines, "twitterDescription", twitterDescription);
  pushStringField(lines, "bodyClass", bodyClass);
  pushStringField(lines, "robots", robots);
  pushArrayField(lines, "extraStyles", extractStylesheets(html));
  pushArrayField(lines, "scripts", extractScripts(html));
  pushBlockArrayField(lines, "jsonLd", extractJsonLd(html));
  lines.push("---", "", extractMain(html, relPath), "");

  return lines.join("\n");
}

function removeObsoleteGeneratedPages(expectedNames) {
  if (!fs.existsSync(OUTPUT_DIR)) return;

  for (const entry of fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".njk")) continue;
    if (expectedNames.has(entry.name)) continue;
    fs.unlinkSync(path.join(OUTPUT_DIR, entry.name));
  }
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const pages = trackedRootHtmlFiles();
  const expectedNames = new Set(pages.map((relPath) => relPath.replace(/\.html$/, ".njk")));
  removeObsoleteGeneratedPages(expectedNames);

  for (const relPath of pages) {
    const outputName = relPath.replace(/\.html$/, ".njk");
    fs.writeFileSync(path.join(OUTPUT_DIR, outputName), buildTemplate(relPath), "utf8");
  }

  console.log(`Pages 11ty generees : ${pages.length}`);
  for (const relPath of pages) {
    console.log(`- src/pages/${relPath.replace(/\.html$/, ".njk")}`);
  }
}

main();
