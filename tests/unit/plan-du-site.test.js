/* /plan-du-site liste toutes les pages indexables : une page ajoutee sans
   entree dans src/_data/planDuSite.js ferait mentir le plan. Le test lit les
   sources (front matter permalink + robots) et les landings, sans build. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const racine = path.join(__dirname, "..", "..");
const plan = require("../../src/_data/planDuSite.js");
const landings = require("../../src/_data/landings.js");

function frontMatter(fichier) {
  const texte = fs.readFileSync(fichier, "utf8");
  const bloc = texte.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!bloc) return null;
  const lire = (cle) => {
    const ligne = bloc[1].match(new RegExp(`^${cle}:\\s*"?([^"\\r\\n]*)"?`, "m"));
    return ligne ? ligne[1].trim() : null;
  };
  return { permalink: lire("permalink"), robots: lire("robots") };
}

function pagesIndexables() {
  const fichiers = [
    ...fs.readdirSync(path.join(racine, "src", "pages"))
      .filter((f) => f.endsWith(".njk"))
      .map((f) => path.join(racine, "src", "pages", f)),
    ...fs.readdirSync(path.join(racine, "src"))
      .filter((f) => f.endsWith(".njk"))
      .map((f) => path.join(racine, "src", f)),
  ];
  const chemins = new Set();
  for (const fichier of fichiers) {
    const fm = frontMatter(fichier);
    if (!fm || !fm.permalink || !fm.permalink.endsWith(".html")) continue;
    if (/noindex/i.test(fm.robots || "")) continue;
    const chemin = "/" + fm.permalink.replace(/(^|\/)index\.html$/, "").replace(/\.html$/, "");
    if (chemin === "/plan-du-site") continue;
    chemins.add(chemin);
  }
  for (const landing of landings) chemins.add(landing.canonicalPath);
  return chemins;
}

const dansLePlan = plan.flatMap((rubrique) => rubrique.pages.map((p) => p.chemin));

test("chaque page indexable figure dans le plan du site", () => {
  const manquantes = [...pagesIndexables()].filter((c) => !dansLePlan.includes(c));
  assert.deepEqual(manquantes, [], "pages a ajouter dans src/_data/planDuSite.js");
});

test("le plan ne cite que des pages indexables, une seule fois", () => {
  const indexables = pagesIndexables();
  const inconnues = dansLePlan.filter((c) => !indexables.has(c));
  assert.deepEqual(inconnues, [], "entrees du plan sans page indexable");
  assert.equal(new Set(dansLePlan).size, dansLePlan.length, "entree en double");
});
