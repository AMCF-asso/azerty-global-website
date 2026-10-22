/* IndexNow (lot B1 du plan GEO v2, scripts/lib/indexnow.js) : choix des pages
   à pinguer par diff de deux sitemaps, et preuve qu'un changement est en ligne.
   Sans réseau ni build : le workflow lui-même ne se rejoue pas en local. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ix = require("../../scripts/lib/indexnow.js");

const RACINE = path.resolve(__dirname, "..", "..");
const sitemap = (entrees) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entrees.map(([loc, lastmod]) => `
  <url>
    <loc>${loc}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
  </url>`).join("")}
</urlset>`;

test("un seul fichier de clé à la racine, qui contient sa clé", () => {
  const cle = ix.cleIndexNow(RACINE);
  assert.match(cle, /^[0-9a-f]{32}$/);
  assert.equal(fs.readFileSync(path.join(RACINE, `${cle}.txt`), "utf8").trim(), cle);
});

test("le sitemap se lit en couples loc/lastmod, page sans date comprise", () => {
  const lu = ix.lireSitemap(sitemap([["https://azerty.global/", "2026-10-19"], ["https://azerty.global/faq", ""]]));
  assert.deepEqual([...lu], [["https://azerty.global/", "2026-10-19"], ["https://azerty.global/faq", ""]]);
});

test("seules les pages ajoutées, redatées ou retirées sont pinguées", () => {
  const avant = ix.lireSitemap(sitemap([
    ["https://azerty.global/a", "2026-10-15"],
    ["https://azerty.global/b", "2026-10-15"],
    ["https://azerty.global/retiree", "2026-10-01"]
  ]));
  const apres = ix.lireSitemap(sitemap([
    ["https://azerty.global/a", "2026-10-15"],
    ["https://azerty.global/b", "2026-10-20"],
    ["https://azerty.global/nouvelle", "2026-10-20"]
  ]));
  assert.deepEqual(ix.changements(avant, apres), [
    { loc: "https://azerty.global/b", attendu: "2026-10-20" },
    { loc: "https://azerty.global/nouvelle", attendu: "2026-10-20" },
    { loc: "https://azerty.global/retiree", attendu: null }
  ]);
  assert.deepEqual(ix.changements(apres, apres), []);
});

test("une PR plus ancienne que son merge est vue : on compare les lastmod, pas la date du jour", () => {
  const avant = ix.lireSitemap(sitemap([["https://azerty.global/a", "2026-10-09"]]));
  const apres = ix.lireSitemap(sitemap([["https://azerty.global/a", "2026-10-12"]]));
  assert.equal(ix.changements(avant, apres).length, 1);
});

test("en ligne : lastmod au moins l'attendu, page retirée absente", () => {
  const enLigne = ix.lireSitemap(sitemap([["https://azerty.global/a", "2026-10-21"], ["https://azerty.global/b", "2026-10-15"]]));
  assert.equal(ix.estEnLigne({ loc: "https://azerty.global/a", attendu: "2026-10-20" }, enLigne), true);
  assert.equal(ix.estEnLigne({ loc: "https://azerty.global/b", attendu: "2026-10-20" }, enLigne), false);
  assert.equal(ix.estEnLigne({ loc: "https://azerty.global/c", attendu: "2026-10-20" }, enLigne), false);
  assert.equal(ix.estEnLigne({ loc: "https://azerty.global/c", attendu: null }, enLigne), true);
  assert.equal(ix.estEnLigne({ loc: "https://azerty.global/a", attendu: null }, enLigne), false);
});

test("la requête désigne le fichier de clé servi à la racine du site", () => {
  const corps = ix.corpsRequete("https://azerty.global", "0".repeat(32), ["https://azerty.global/a"]);
  assert.deepEqual(corps, {
    host: "azerty.global",
    key: "0".repeat(32),
    keyLocation: `https://azerty.global/${"0".repeat(32)}.txt`,
    urlList: ["https://azerty.global/a"]
  });
});
