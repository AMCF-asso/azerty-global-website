/* Refonte — pages caractère : charge le composant clavier et le mini-essai à la
   demande (PERF-02 de l'audit du 2026-10-09 : 113 Ko de JS décodés, 95 Ko
   jamais exécutés avant que le visiteur n'arrive à la section).

   La section « Essayez AZERTY Global » est rendue au build, clavier dessiné
   compris : les scripts qu'on charge ici ne changent ni sa hauteur ni sa place
   (mesuré en navigateur avant et après, 2026-10-11). Il n'y a donc rien à
   réserver ; ils n'apportent que l'interaction.

   Quand charger :
     - jamais sans pointeur fin et survol : la section est masquée au tactile
       (caractere.css), la même requête que mini-essai.js ;
     - dès que la section est à moins de 100 px de l'écran
       (IntersectionObserver) : la section est à plus de 1 100 px du haut de la page, elle
       n'est pas dans le premier écran d'un ordinateur ordinaire ;
     - au premier focus ou clic dedans, si le visiteur y arrive avant ;
     - sans IntersectionObserver, au repos du navigateur.

   Les adresses (versionnées au build, src/landings.njk) sont dans
   data-essai-scripts, dans l'ordre : mini-essai.js emprunte la table et le
   dessin de clavier.js (window.AGClavier), qui doit donc passer d'abord. Un
   script ajouté par ce fichier s'exécute après le parsing : clavier.js et
   mini-essai.js lisent le DOM à l'exécution, sans attendre d'événement.
   Externe et sans inline : la CSP (`script-src 'self'`) l'exige. */

(function () {
  "use strict";

  var zone = document.querySelector("[data-essai-scripts]");
  if (!zone) return;
  if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  var adresses = (zone.getAttribute("data-essai-scripts") || "").split(/\s+/).filter(Boolean);
  var lance = false;
  var observateur = null;

  function charger(rang) {
    if (rang >= adresses.length) return;
    var script = document.createElement("script");
    script.src = adresses[rang];
    script.onload = function () { charger(rang + 1); };
    /* Échec réseau : le dessin du build reste, le testeur reste accessible. */
    document.head.appendChild(script);
  }

  function lancer() {
    if (lance) return;
    lance = true;
    if (observateur) observateur.disconnect();
    zone.removeEventListener("focusin", lancer);
    zone.removeEventListener("pointerdown", lancer);
    charger(0);
  }

  zone.addEventListener("focusin", lancer);
  zone.addEventListener("pointerdown", lancer);

  if ("IntersectionObserver" in window) {
    observateur = new IntersectionObserver(function (entrees) {
      if (entrees.some(function (entree) { return entree.isIntersecting; })) lancer();
    }, { rootMargin: "100px 0px" });
    observateur.observe(zone);
  } else if (window.requestIdleCallback) {
    window.requestIdleCallback(lancer, { timeout: 3000 });
  } else {
    setTimeout(lancer, 1500);
  }
})();
