/* Refonte — composant clavier v2.
   Contrat : operations/refonte-site/2026-08-29-decisions-composant-clavier-et-guide.md §1.

   Trois rôles, aucun autre :
     - basculer la couche affichée (le CSS fait le reste, ce script ne touche
       qu'un attribut) ;
     - piloter le parcours « Ce qui change » étape par étape ;
     - ouvrir le plein écran et lancer l'impression.

   Le composant est une visualisation, pas un exercice : aucun événement
   clavier n'est écouté sur le dessin (décision 9). Les états CSS existent pour
   que le testeur v2 s'y branche plus tard sans refonte.

   Sans ce script la page reste complète : le clavier rend la vue synthèse, les
   six étapes se lisent à la suite, et les deux boutons qui en dépendent
   restent cachés. */

(function () {
  "use strict";

  /* ——— Vue d'un clavier ——— */

  function appliquerCouche(clavier, couche, libelle) {
    if (!clavier) return;
    clavier.setAttribute("data-couche", couche);
    clavier.setAttribute(
      "aria-label",
      "Clavier AZERTY Global, bloc ISO complet, vue « " + libelle + " ». " +
        "Le détail se lit dans la légende, les explications et le mémo qui accompagnent cette image."
    );
  }

  /* Les modificateurs ne s'atténuent jamais : leur état enfoncé fait partie de
     l'explication (« Verr. maj puis é »). Seules les touches à caractères
     portent l'atténuation. */
  /* `marques` est une table position → marque valable pour cette étape seule.
     Elle existe parce que la marque d'une touche vaut pour la touche entière :
     à l'étape des symboles de programmation, le circonflexe et le dièse sont
     des ajouts posés sur des touches dont la gravure a changé pour une autre
     raison. Sans surcharge, l'étape peindrait « emplacement modifié ». */
  function surligner(clavier, positions, marques) {
    var touches = clavier.querySelectorAll(".clavier__touche--car");
    Array.prototype.forEach.call(touches, function (touche) {
      touche.removeAttribute("data-marque-etape");
      if (!positions) {
        touche.removeAttribute("data-etat");
        return;
      }
      var position = touche.getAttribute("data-position");
      var dedans = position && positions.indexOf(position) !== -1;
      touche.setAttribute("data-etat", dedans ? "surlignee" : "attenuee");
      if (dedans && marques && marques[position]) {
        touche.setAttribute("data-marque-etape", marques[position]);
      }
    });
  }

  /* « B09:ajoutee B07:ajoutee » → { B09: "ajoutee", B07: "ajoutee" } */
  function lireMarques(etape) {
    var table = {};
    (etape.getAttribute("data-marques") || "").split(" ").forEach(function (paire) {
      var morceaux = paire.split(":");
      if (morceaux.length === 2) table[morceaux[0]] = morceaux[1];
    });
    return table;
  }

  /* ——— Parcours « Ce qui change » ——— */

  function monterParcours(figure) {
    var clavier = figure.querySelector(".clavier");
    var etapes = Array.prototype.slice.call(figure.querySelectorAll(".clavier-parcours__etape"));
    var navigation = figure.querySelector("[data-parcours-navigation]");
    var jalons = figure.querySelector("[data-parcours-jalons]");
    var compteur = figure.querySelector("[data-parcours-compteur]");
    var precedent = figure.querySelector("[data-parcours-precedent]");
    var suivant = figure.querySelector("[data-parcours-suivant]");

    if (!clavier || etapes.length < 2 || !navigation || !jalons) return;

    var courante = 0;
    var boutonsJalons = [];

    etapes.forEach(function (etape, index) {
      var element = document.createElement("li");
      var bouton = document.createElement("button");
      bouton.type = "button";
      bouton.className = "clavier-parcours__jalon";
      bouton.textContent = String(index + 1);
      bouton.setAttribute(
        "aria-label",
        "Étape " + (index + 1) + " sur " + etapes.length + " : " + titreDe(etape)
      );
      bouton.addEventListener("click", function () {
        aller(index, true);
      });
      element.appendChild(bouton);
      jalons.appendChild(element);
      boutonsJalons.push(bouton);
    });

    function titreDe(etape) {
      var titre = etape.querySelector(".clavier-parcours__titre");
      return titre ? titre.textContent.replace(/^\d+\.\s*/, "") : "";
    }

    function aller(index, focusEtape) {
      courante = (index + etapes.length) % etapes.length;
      etapes.forEach(function (etape, rang) {
        var actif = rang === courante;
        etape.hidden = !actif;
        if (actif) etape.setAttribute("aria-current", "step");
        else etape.removeAttribute("aria-current");
      });
      boutonsJalons.forEach(function (bouton, rang) {
        bouton.setAttribute("aria-current", rang === courante ? "step" : "false");
      });

      var etape = etapes[courante];
      var couche = etape.getAttribute("data-couche") || "base";
      appliquerCouche(clavier, couche, libelleCouche(couche));
      /* Les touches mortes ne se distinguent qu'à l'étape qui en parle : sinon
         une touche surlignée pour tout autre chose s'annoncerait « morte »
         pour un caractère dont l'étape ne dit rien. */
      if (etape.hasAttribute("data-mortes-distinguees")) {
        clavier.setAttribute("data-mortes", "distinguees");
      } else {
        clavier.removeAttribute("data-mortes");
      }
      surligner(
        clavier,
        (etape.getAttribute("data-positions") || "").split(" ").filter(Boolean),
        lireMarques(etape)
      );

      if (compteur) {
        compteur.textContent = "Étape " + (courante + 1) + " sur " + etapes.length + " — " + titreDe(etape);
      }
      if (focusEtape) {
        var titre = etape.querySelector(".clavier-parcours__titre");
        if (titre) {
          titre.setAttribute("tabindex", "-1");
          titre.focus();
        }
      }
    }

    if (precedent) precedent.addEventListener("click", function () { aller(courante - 1, true); });
    if (suivant) suivant.addEventListener("click", function () { aller(courante + 1, true); });

    figure.setAttribute("data-pilote", "");
    navigation.hidden = false;
    if (compteur) compteur.hidden = false;
    aller(0, false);
  }

  /* Le libellé lisible d'une couche vient des onglets du plein écran, seul
     endroit où il est écrit. Repli sur l'identifiant si la page n'a pas de
     plein écran. */
  var LIBELLES = {};
  Array.prototype.forEach.call(document.querySelectorAll("[data-couche-cible]"), function (onglet) {
    LIBELLES[onglet.getAttribute("data-couche-cible")] = onglet.textContent.trim();
  });

  function libelleCouche(couche) {
    return LIBELLES[couche] || couche;
  }

  /* ——— Plein écran : onglets de couches ——— */

  function monterPleinEcran(dialogue) {
    var onglets = Array.prototype.slice.call(dialogue.querySelectorAll("[data-couche-cible]"));
    var clavier = dialogue.querySelector(".clavier");
    var panneau = dialogue.querySelector("[role='tabpanel']");
    if (!onglets.length || !clavier) return;

    function activer(couche, prendreLeFocus) {
      onglets.forEach(function (onglet) {
        var actif = onglet.getAttribute("data-couche-cible") === couche;
        onglet.setAttribute("aria-selected", actif ? "true" : "false");
        onglet.tabIndex = actif ? 0 : -1;
        if (actif) {
          if (panneau) panneau.setAttribute("aria-labelledby", onglet.id);
          if (prendreLeFocus) onglet.focus();
        }
      });
      appliquerCouche(clavier, couche, libelleCouche(couche));
      surligner(clavier, null);
    }

    onglets.forEach(function (onglet, index) {
      onglet.addEventListener("click", function () {
        activer(onglet.getAttribute("data-couche-cible"), false);
      });
      onglet.addEventListener("keydown", function (evenement) {
        var pas = evenement.key === "ArrowRight" ? 1 : evenement.key === "ArrowLeft" ? -1 : 0;
        if (!pas) return;
        evenement.preventDefault();
        var cible = onglets[(index + pas + onglets.length) % onglets.length];
        activer(cible.getAttribute("data-couche-cible"), true);
      });
    });
  }

  /* ——— Ouverture, impression ——— */

  /* Les contrôles qui n'existent que par le script se révèlent un par un : la
     rangée qui les porte peut aussi contenir un lien (le PDF), qui lui ne
     dépend de rien et ne doit jamais être caché. */
  Array.prototype.forEach.call(document.querySelectorAll("[data-clavier-js]"), function (controle) {
    if (typeof HTMLDialogElement !== "undefined") controle.hidden = false;
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-clavier-ouvrir]"), function (bouton) {
    bouton.addEventListener("click", function () {
      var dialogue = document.getElementById(bouton.getAttribute("data-clavier-ouvrir"));
      if (dialogue && dialogue.showModal) dialogue.showModal();
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-clavier-imprimer]"), function (bouton) {
    bouton.addEventListener("click", function () {
      window.print();
    });
  });

  /* ——— Bulle de nom ———

     Les touches mortes et les caractères invisibles portent un nom qui ne se
     lit pas sur la touche. Il voyageait en `title` : la bulle native met près
     d'une seconde à sortir, quand la carte interactive du site v1 répondait
     tout de suite (retour d'Antoine, 2026-08-30). Une seule bulle par clavier,
     posée dans le conteneur — ⛔ pas dans la touche, qui est en
     `overflow: hidden` et la couperait. */

  function monterBulles(clavier) {
    if (!clavier.querySelector("[data-nom]")) return;

    var bulle = document.createElement("span");
    bulle.className = "clavier__bulle";
    bulle.setAttribute("aria-hidden", "true");
    bulle.hidden = true;
    clavier.appendChild(bulle);

    function porteur(element) {
      while (element && element !== clavier) {
        if (element.getAttribute && element.getAttribute("data-nom")) return element;
        element = element.parentNode;
      }
      return null;
    }

    /* La bulle se pose sur la TOUCHE et non sur le glyphe : un glyphe de coin
       fait quelques pixels de haut, et la bulle retombait dessus. */
    function toucheDe(element) {
      while (element && element !== clavier) {
        if (element.className && String(element.className).indexOf("clavier__touche") !== -1) {
          return element;
        }
        element = element.parentNode;
      }
      return null;
    }

    function montrer(glyphe) {
      var cadre = clavier.getBoundingClientRect();
      var cible = (toucheDe(glyphe) || glyphe).getBoundingClientRect();
      bulle.textContent = glyphe.getAttribute("data-nom");
      bulle.hidden = false;
      /* Posée après l'affichage : sa largeur n'existe pas tant qu'elle est
         cachée, et c'est elle qui centre la bulle sur la touche. */
      var mesure = bulle.getBoundingClientRect();
      var gauche = cible.left - cadre.left + cible.width / 2 - mesure.width / 2;
      gauche = Math.max(0, Math.min(gauche, cadre.width - mesure.width));
      bulle.style.left = gauche + "px";

      /* Au-dessus de la touche, sauf sur la rangée du haut : la bulle sortirait
         du clavier et serait coupée par la page. */
      var haut = cible.top - cadre.top - mesure.height - 4;
      if (haut < 0) haut = cible.bottom - cadre.top + 4;
      bulle.style.top = haut + "px";
    }

    clavier.addEventListener("mouseover", function (evenement) {
      var glyphe = porteur(evenement.target);
      if (glyphe) montrer(glyphe);
      else bulle.hidden = true;
    });

    clavier.addEventListener("mouseleave", function () {
      bulle.hidden = true;
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll(".clavier-plein"), monterPleinEcran);
  Array.prototype.forEach.call(document.querySelectorAll("[data-parcours]"), monterParcours);
  Array.prototype.forEach.call(document.querySelectorAll(".clavier"), monterBulles);
})();
