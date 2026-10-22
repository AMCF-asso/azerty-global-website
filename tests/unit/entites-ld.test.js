/* Entités JSON-LD uniques (src/_data/entitesLd.js) : l'auteur Antoine Olivier
   (lot B2 du plan GEO v2) est défini une seule fois, sur /association, et
   cité ailleurs par `@id` ; Robert Hodge reste une Person simple. Le test
   appelle le normaliseur sans build, sur des blocs comme ceux des pages. */
const test = require("node:test");
const assert = require("node:assert/strict");

const ld = require("../../src/_data/entitesLd.js");

const personne = (nom) => ({ "@type": "Person", "name": nom });
const blocPersonne = { "@context": "https://schema.org", ...personne("Antoine Olivier") };
const howTo = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Comment taper É majuscule facilement",
  "author": personne("Antoine Olivier")
};

test("la définition complète de l'auteur n'est posée que sur /association", () => {
  for (const page of ["association.html", "en/association.html"]) {
    const [, auteur] = ld.normaliserJsonLd([{ "@type": "NGO", "name": "AMCF", "alternateName": "AMCF" }, blocPersonne], page, page.startsWith("en/"));
    assert.equal(auteur["@id"], ld.ID_AUTEUR);
    assert.equal(auteur.jobTitle, "Président de l'AMCF");
    assert.equal(auteur.url, "https://azerty.global/association");
    assert.deepEqual(auteur.worksFor, { "@id": ld.ID_ORGANISATION });
    assert.ok(auteur.sameAs.includes("https://orcid.org/0009-0009-9710-3682"));
    assert.equal(auteur["@context"], "https://schema.org");
  }
});

test("ailleurs, l'auteur devient une référence et son bloc autonome disparaît", () => {
  const [bloc, howToNormalise] = ld.normaliserJsonLd([blocPersonne, howTo], "guillemets.html", false);
  assert.equal(bloc, null);
  assert.deepEqual(howToNormalise.author, { "@id": ld.ID_AUTEUR });
  const [enAnglais] = ld.normaliserJsonLd([howTo], "en/guide.html", true);
  assert.deepEqual(enAnglais.author, { "@id": ld.ID_AUTEUR });
});

test("Robert Hodge reste une Person simple, à côté de la référence", () => {
  const apropos = { "@type": "AboutPage", "author": [personne("Robert Hodge"), personne("Antoine Olivier")] };
  const [resultat] = ld.normaliserJsonLd([apropos], "a-propos.html", false);
  assert.deepEqual(resultat.author, [personne("Robert Hodge"), { "@id": ld.ID_AUTEUR }]);
  assert.deepEqual(ld.logiciel.author, [personne("Robert Hodge"), { "@id": ld.ID_AUTEUR }]);
});

test("le texte de l'auteur reste en apostrophe droite (C-02)", () => {
  assert.ok(!JSON.stringify(ld.auteur).includes("’"));
});
