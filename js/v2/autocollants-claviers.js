/* /autocollants-claviers — ce qui est propre à la page. L'envoi, la validation
   et les messages sont dans js/v2/formulaire.js, branché par `data-formulaire`
   sur l'`action` du formulaire (/api/demandes, Worker workers/demandes).

   1. `page` reçoit la page d'origine passée par l'encart (`?depuis=/download`) :
      le rapport agrégé compte les demandes par page d'origine.
   2. `?produit=clavier` (encart de /afrique) et les deux boutons du héros
      précochent la carte correspondante.
   3. « Au moins un des deux choix » : `required` sur les deux cases tant
      qu'aucune n'est cochée. En HTML, il exigerait les deux.
   4. Le compteur public n'apparaît qu'à partir du seuil rendu par le Worker. */

(function () {
  "use strict";

  var formulaire = document.getElementById("formulaire-demandes");
  if (!formulaire) return;

  var parametres = new URLSearchParams(window.location.search);

  var depuis = parametres.get("depuis");
  var champPage = document.getElementById("demandes-page");
  if (champPage && depuis && /^\/[\w\-\/.#]{0,99}$/.test(depuis)) {
    champPage.value = depuis;
  }

  var produits = Array.prototype.slice.call(formulaire.querySelectorAll("input[name=\"produits\"]"));

  function exigerUnProduit() {
    var aucun = !produits.some(function (caseProduit) { return caseProduit.checked; });
    produits.forEach(function (caseProduit) { caseProduit.required = aucun; });
  }

  function cocher(valeur) {
    produits.forEach(function (caseProduit) {
      if (caseProduit.value === valeur) caseProduit.checked = true;
    });
    exigerUnProduit();
  }

  produits.forEach(function (caseProduit) {
    caseProduit.addEventListener("change", exigerUnProduit);
  });

  var produit = parametres.get("produit");
  if (produit === "clavier" || produit === "autocollants") cocher(produit);
  else exigerUnProduit();

  Array.prototype.forEach.call(document.querySelectorAll("[data-produit]"), function (lien) {
    lien.addEventListener("click", function () {
      cocher(lien.getAttribute("data-produit"));
    });
  });

  var compteur = document.getElementById("demandes-compteur");
  if (compteur && window.fetch) {
    fetch("/api/demandes/compte", { headers: { Accept: "application/json" } })
      .then(function (reponse) { return reponse.ok ? reponse.json() : null; })
      .then(function (resultat) {
        if (!resultat || typeof resultat.total !== "number") return;
        var total = document.createElement("span");
        total.className = "ac-compteur__total";
        total.textContent = resultat.total.toLocaleString("fr-FR");
        compteur.textContent = "";
        compteur.appendChild(total);
        compteur.appendChild(document.createTextNode(
          resultat.total > 1 ? "demandes enregistrées à ce jour" : "demande enregistrée à ce jour"));
      })
      .catch(function () { /* sans compteur, le texte d'attente reste */ });
  }
})();
