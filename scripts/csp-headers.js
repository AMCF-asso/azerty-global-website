/* CSP servie pour un chemin, lue dans _headers comme Cloudflare Pages
   l'applique : celle de /*, remplacée par celle d'un bloc de chemin exact
   qui la détache (« ! Content-Security-Policy »). SEC-05 (audit du
   2026-10-09) : seules les pages à formulaire autorisent hCaptcha.
   Partagé par tests/helpers/local-site.js, scripts/recette-v2.mjs et
   scripts/verify-11ty-passthrough.js. */

const fs = require("fs");
const path = require("path");

function lireBlocs(fichier) {
  const blocs = [];
  let courant = null;
  for (const ligne of fs.readFileSync(fichier, "utf8").split(/\r?\n/)) {
    if (!ligne.trim() || ligne.trim().startsWith("#")) continue;
    if (!/^\s/.test(ligne)) {
      courant = { chemin: ligne.trim(), detache: false, csp: null };
      blocs.push(courant);
    } else if (courant) {
      const l = ligne.trim();
      if (l === "! Content-Security-Policy") courant.detache = true;
      const m = l.match(/^Content-Security-Policy:\s*(.+)$/);
      if (m) courant.csp = m[1];
    }
  }
  return blocs;
}

/* Chemin d'URL ramené à sa forme publique : /contact.html et /contact/
   valent /contact. */
function normaliser(chemin) {
  let p = chemin.split(/[?#]/)[0] || "/";
  p = p.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
  if (p.length > 1) p = p.replace(/\/$/, "");
  return p;
}

function charger(fichier = path.resolve(__dirname, "../_headers")) {
  const blocs = lireBlocs(fichier);
  const globale = (blocs.find((b) => b.chemin === "/*") || {}).csp || null;
  const parChemin = new Map(
    blocs.filter((b) => b.chemin.startsWith("/") && b.chemin !== "/*" && b.detache && b.csp)
      .map((b) => [b.chemin, b.csp])
  );
  return {
    globale,
    parChemin,
    pour(chemin) {
      return parChemin.get(normaliser(chemin)) || globale;
    },
  };
}

module.exports = { charger, normaliser };
