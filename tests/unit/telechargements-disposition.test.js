/* Plan B des zips (QCM du 2026-10-14) : /download et /guide disent quels zips
   installent encore la disposition 2026, d'apres le champ `disposition` du
   registre (src/_data/telechargements.js). */
const test = require("node:test");
const assert = require("node:assert/strict");

const telechargements = require("../../src/_data/telechargements.js");

const ZIPS = ["windows", "macos", "linux"];

function avecDispositions(valeurs, fn) {
  const avant = ZIPS.map((id) => telechargements.kit(id).disposition);
  ZIPS.forEach((id, i) => { telechargements.kit(id).disposition = valeurs[i]; });
  try {
    fn();
  } finally {
    ZIPS.forEach((id, i) => { telechargements.kit(id).disposition = avant[i]; });
  }
}

test("chaque zip a un champ disposition", () => {
  for (const id of ZIPS) {
    assert.match(String(telechargements.kit(id).disposition), /^\d{4}(\.\d+)?$/, id);
  }
});

test("zipsAnciens nomme les zips encore en 2026", () => {
  avecDispositions(["2026", "2026", "2026"], () => {
    assert.equal(telechargements.zipsAnciens("fr"), "les zips Windows, macOS et Linux");
    assert.equal(telechargements.zipsAnciens("en"), "the Windows, macOS and Linux zips");
  });
  avecDispositions(["2026", "2026.1", "2026"], () => {
    assert.equal(telechargements.zipsAnciens("fr"), "les zips Windows et Linux");
    assert.equal(telechargements.zipsAnciens("en"), "the Windows and Linux zips");
  });
  avecDispositions(["2026", "2026.1", "2026.1"], () => {
    assert.equal(telechargements.zipsAnciens("fr"), "le zip Windows");
    assert.equal(telechargements.zipsAnciens("en"), "the Windows zip");
    assert.equal(telechargements.dispositionAncienne("macos"), false);
  });
  avecDispositions(["2026.1", "2026.1", "2026.1"], () => {
    assert.equal(telechargements.zipsAnciens("fr"), "");
    assert.equal(telechargements.dispositionAncienne("windows"), false);
  });
});
