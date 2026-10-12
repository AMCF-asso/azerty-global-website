/* CONT-03 : /nouveautes suit la version servie par le registre des
   telechargements (src/_data/telechargements.js), comme /download et le JSON-LD.
   Quand le registre annonce une version du Store, la page doit avoir son entree
   « Version X » : sans elle, la phrase d'etat citerait une version sans notes. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const telechargements = require("../../src/_data/telechargements.js");
const page = fs.readFileSync(
  path.join(__dirname, "..", "..", "src", "pages", "nouveautes.njk"),
  "utf8"
);

test("versionAuMoins compare numero par numero", () => {
  const version = telechargements.kit("store").version;
  assert.equal(telechargements.versionAuMoins("store", version), true);
  assert.equal(telechargements.versionAuMoins("store", "0.9.8"), true);
  assert.equal(telechargements.versionAuMoins("store", "99.0.0"), false);
  // 1.10.0 est plus recente que 1.3.0 : jamais une comparaison de texte.
  const original = telechargements.kit("store").version;
  telechargements.kit("store").version = "1.10.0";
  try {
    assert.equal(telechargements.versionAuMoins("store", "1.3.0"), true);
  } finally {
    telechargements.kit("store").version = original;
  }
});

test("/nouveautes a l'entree de la version servie par le Store", () => {
  const version = telechargements.kit("store").version;
  const entree = new RegExp(
    `<h3 class="nouveautes-version">Version ${version.replace(/\./g, "\\.")}</h3>`
  );
  assert.match(page, entree, `nouveautes.njk n'a pas d'entree « Version ${version} »`);
});

test("/nouveautes lit la version du registre, pas un numero ecrit en dur", () => {
  assert.match(page, /telechargements\.kit\('store'\)\.version/);
  assert.match(page, /telechargements\.versionAuMoins\('store', '1\.3\.0'\)/);
});
