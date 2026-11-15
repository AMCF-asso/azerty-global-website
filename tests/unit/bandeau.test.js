/* Bandeau d'annonce : comportement de js/v2/bandeau.js (masquage à la date de fin,
   fermeture mémorisée, stockage bloqué) et cohérence des données avec la page
   /confidentialite (src/_data/bandeau.js et src/_data/mesure.js). */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "..", "js", "v2", "bandeau.js"), "utf8");

function monter({
  maintenant,
  fin = "2026-12-11T00:00:00+01:00",
  stockage = {},
  stockageBloque = false,
  sansBandeau = false
}) {
  const ecouteurs = {};
  const bouton = { addEventListener(type, fn) { ecouteurs[type] = fn; } };
  const attributs = { "data-bandeau-cle": "cle-test", "data-bandeau-fin": fin };
  const bandeau = {
    hidden: false,
    getAttribute: (nom) => attributs[nom],
    querySelector: (sel) => (sel === "[data-bandeau-fermer]" ? bouton : null)
  };
  const localStorage = stockageBloque
    ? {
        getItem() { throw new Error("stockage bloqué"); },
        setItem() { throw new Error("stockage bloqué"); }
      }
    : {
        getItem: (cle) => (cle in stockage ? stockage[cle] : null),
        setItem: (cle, valeur) => { stockage[cle] = String(valeur); }
      };
  const contexte = {
    document: { querySelector: (sel) => (sel === "[data-bandeau]" && !sansBandeau ? bandeau : null) },
    window: { localStorage },
    Date: { now: () => Date.parse(maintenant), parse: Date.parse }
  };
  vm.runInNewContext(source, contexte);
  return { bandeau, stockage, cliquer: () => ecouteurs.click() };
}

test("affiché pendant l'événement quand il n'a pas été fermé", () => {
  const { bandeau } = monter({ maintenant: "2026-12-09T10:00:00+01:00" });
  assert.equal(bandeau.hidden, false);
});

test("affiché jusqu'à la dernière seconde du 10 décembre, masqué à minuit", () => {
  assert.equal(monter({ maintenant: "2026-12-10T23:59:59+01:00" }).bandeau.hidden, false);
  assert.equal(monter({ maintenant: "2026-12-11T00:00:00+01:00" }).bandeau.hidden, true);
});

test("masqué d'emblée quand le visiteur l'a déjà fermé", () => {
  const { bandeau } = monter({
    maintenant: "2026-12-09T10:00:00+01:00",
    stockage: { "cle-test": "1" }
  });
  assert.equal(bandeau.hidden, true);
});

test("le clic sur la croix masque le bandeau et mémorise le choix", () => {
  const { bandeau, stockage, cliquer } = monter({ maintenant: "2026-12-09T10:00:00+01:00" });
  cliquer();
  assert.equal(bandeau.hidden, true);
  assert.equal(stockage["cle-test"], "1");
});

test("stockage bloqué : affiché, et la croix le masque pour la page sans lever d'erreur", () => {
  const { bandeau, cliquer } = monter({
    maintenant: "2026-12-09T10:00:00+01:00",
    stockageBloque: true
  });
  assert.equal(bandeau.hidden, false);
  assert.doesNotThrow(cliquer);
  assert.equal(bandeau.hidden, true);
});

test("sans bandeau dans la page, le script ne fait rien", () => {
  assert.doesNotThrow(() => monter({ maintenant: "2026-12-09T10:00:00+01:00", sansBandeau: true }));
});

test("données : textes FR et EN complets, typographie A541, apostrophe ’", () => {
  const bandeau = require("../../src/_data/bandeau.js");
  for (const langue of ["fr", "en"]) {
    for (const champ of ["avant", "lien", "fermer"]) {
      assert.ok(bandeau[langue][champ], `${langue}.${champ} manque`);
    }
    assert.equal(typeof bandeau[langue].apres, "string", `${langue}.apres doit être une chaîne (vide permise)`);
    assert.ok(bandeau[langue].avant.includes("Open Source Experience"), `${langue} : l'annonce nomme le salon`);
  }
  assert.ok(bandeau.fr.avant.includes("10\u00a0décembre\u00a0:"), "U+00A0 entre quantième et mois, et avant les deux-points");
  assert.ok(bandeau.en.avant.includes("10\u00a0December:"), "U+00A0 entre quantième et mois (EN)");
  assert.ok(bandeau.fr.avant.includes("mercredi\u00a09."), "U+00A0 entre le jour et le quantième du stand (FR)");
  assert.ok(bandeau.en.avant.includes("Wednesday\u00a09."), "U+00A0 entre le jour et le quantième du stand (EN)");
  for (const texte of [bandeau.fr.avant, bandeau.fr.apres, bandeau.fr.fermer]) {
    assert.ok(!texte.includes("'"), "apostrophe droite dans : " + texte);
  }
  assert.ok(!Number.isNaN(Date.parse(bandeau.fin)), "date de fin illisible");
  assert.match(bandeau.fr.url, /^https:\/\/www\.opensource-experience\.com\/fr\//);
  assert.match(bandeau.en.url, /^https:\/\/www\.opensource-experience\.com\/en\//);
});

test("la clé de mémorisation est déclarée dans le stockage local de /confidentialite", () => {
  const bandeau = require("../../src/_data/bandeau.js");
  const mesure = require("../../src/_data/mesure.js");
  assert.ok(
    mesure.stockageLocal.some((entree) => entree.cle === bandeau.cle),
    "la clé " + bandeau.cle + " manque dans src/_data/mesure.js (stockageLocal)"
  );
});
