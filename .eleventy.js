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
  // Manifestes OKLM : sources de build des vues ci-dessus (chantier C3), pas
  // encore des fichiers publies. Les servir est une decision d'Antoine, pas un
  // effet de bord du pivot — sans cette ligne, `data/` les copierait dans dist.
  "data/azerty-global.oklm.json",
  "data/azerty-traditionnel.oklm.json",
  "data/azerty-global-beta.oklm.json",
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

// data/temoignages.json est servi tel quel : il ne doit contenir que des avis
// publiables et les champs affichés. Le fichier complet reste hors du dépôt public.
const TEMOIGNAGE_PUBLIC_KEYS = new Set(["name", "role", "roleEn", "quote", "quoteEn", "stars", "display", "source", "sourceEn"]);

function assertPublicTemoignages() {
  const entries = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "temoignages.json"), "utf8"));
  entries.forEach((entry, index) => {
    const extra = Object.keys(entry).filter((key) => !TEMOIGNAGE_PUBLIC_KEYS.has(key));
    if (entry.display !== true || extra.length) {
      throw new Error(`data/temoignages.json, entrée ${index} non publiable : ${extra.join(", ") || "display différent de true"}`);
    }
  });
}

function addPassthrough(eleventyConfig, relPath) {
  const normalized = toPosix(relPath);
  if (PUBLIC_EXCLUDED_FILES.has(normalized) || !exists(normalized)) return;
  eleventyConfig.addPassthroughCopy({ [normalized]: normalized });
}

module.exports = function (eleventyConfig) {
  assertPublicTemoignages();

  /* Cache-busting des ressources v2. `_headers` les sert sept jours, donc sans
     jeton une correction n'atteint pas un visiteur revenu dans la semaine —
     défaut vécu le 2026-08-31 sur la v1, menu inerte à cause d'un `app.js`
     périmé. Le jeton vient de `src/_data/versionAssets.js`, qui l'empreinte sur
     le contenu réel des feuilles et des scripts.
     ⚠️ Le séparateur se choisit : un chemin qui porte déjà une requête doit
     recevoir `&`, jamais un second `?`. */
  eleventyConfig.addFilter("versionne", function (chemin, jeton) {
    if (!chemin || !jeton) return chemin;
    return chemin + (chemin.indexOf("?") === -1 ? "?" : "&") + "v=" + jeton;
  });

  /* Socle JSON-LD de chaque page (SEO.md § 3, QCM du 2026-09-28) : WebPage,
     BreadcrumbList et Organization. Le filtre lit les blocs déclarés par la
     page et n'ajoute que ce qui manque ; le type propre reste dans la page.
     Apostrophe droite dans le JSON-LD (C-02). */
  const SITE = "https://azerty.global";
  const TYPES_PAGE = ["WebPage", "AboutPage", "ContactPage", "CollectionPage", "ItemPage",
    "ProfilePage", "QAPage", "SearchResultsPage", "CheckoutPage"];
  const TYPES_ORG = ["Organization", "NGO", "Corporation", "EducationalOrganization"];
  eleventyConfig.addFilter("socleJsonLd", function (blocs, titre, description, chemin, langue) {
    const types = new Set();
    const parcourir = (v) => {
      if (Array.isArray(v)) return v.forEach(parcourir);
      if (!v || typeof v !== "object") return;
      [].concat(v["@type"] || []).forEach((t) => types.add(t));
      Object.values(v).forEach(parcourir);
    };
    for (const b of blocs || []) {
      try { parcourir(typeof b === "string" ? JSON.parse(b) : b); } catch { /* bloc illisible : la recette le relève */ }
    }
    const droite = (s) => String(s || "").replace(/’/g, "'");
    const en = langue === "en";
    const url = SITE + (chemin || "/");
    const organisation = {
      "@type": "Organization",
      "name": "Association pour la Modernisation du Clavier Français",
      "alternateName": "AMCF",
      "url": SITE + "/association",
      "logo": SITE + "/assets/logo-azerty-global.png"
    };
    const aOrg = TYPES_ORG.some((t) => types.has(t));
    const ajouts = [];
    if (!TYPES_PAGE.some((t) => types.has(t))) {
      const pageLd = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "url": url,
        "name": droite(titre),
        "inLanguage": en ? "en" : "fr",
        "isPartOf": { "@type": "WebSite", "name": "AZERTY Global", "url": SITE }
      };
      if (description) pageLd.description = droite(description);
      if (!aOrg) pageLd.publisher = organisation;
      ajouts.push(pageLd);
    } else if (!aOrg) {
      ajouts.push({ "@context": "https://schema.org", ...organisation });
    }
    const accueil = en ? "/en/" : "/";
    if (!types.has("BreadcrumbList") && (chemin || "/") !== accueil && chemin !== "/en") {
      ajouts.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": en ? "Home" : "Accueil", "item": SITE + accueil },
          { "@type": "ListItem", "position": 2, "name": droite(titre).replace(/ – AZERTY Global$/, ""), "item": url }
        ]
      });
    }
    return (blocs || []).concat(ajouts.map((a) => JSON.stringify(a, null, 2)));
  });

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
