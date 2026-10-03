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
    /* Tout changement de couche rend le dessin gravé d'une table. */
    quitterTable(clavier, false);
    clavier.setAttribute("data-couche", couche);
    /* Un clavier rendu interactif se parcourt touche par touche : son nom le
       dit, au lieu de renvoyer au texte comme une image. */
    clavier.setAttribute(
      "aria-label",
      clavier.hasAttribute("data-interactif")
        ? "Clavier AZERTY Global, vue « " + libelle + " ». Les flèches passent d’une touche à l’autre."
        : "Clavier AZERTY Global, bloc ISO complet, vue « " + libelle + " ». " +
          "Le détail se lit dans la légende, les explications et le mémo qui accompagnent cette image."
    );
    if (typeof fermer === "function") fermer();
    suivreReglage(clavier, couche);
    synchroniserOnglets(clavier, couche);
  }

  /* Les onglets de couche disent toujours la couche dessinée : une recherche
     ou l'essai qui la changent déplacent aussi l'onglet sélectionné. L'onglet
     « AltGr » restait sélectionné sur un dessin en Maj (critique du
     2026-10-02). Le focus ne bouge pas. */
  function synchroniserOnglets(clavier, couche) {
    var listes = [];
    var enPage = clavier.id && document.querySelector('[data-clavier-onglets="' + clavier.id + '"]');
    if (enPage) listes.push(enPage);
    var dialogue = clavier.closest("dialog");
    if (dialogue) listes.push(dialogue);
    listes.forEach(function (liste) {
      var onglets = Array.prototype.slice.call(liste.querySelectorAll("[data-couche-cible]"));
      var cible = onglets.filter(function (onglet) { return onglet.getAttribute("data-couche-cible") === couche; })[0];
      if (!cible) return;
      onglets.forEach(function (onglet) {
        onglet.setAttribute("aria-selected", onglet === cible ? "true" : "false");
        onglet.tabIndex = onglet === cible ? 0 : -1;
      });
      var panneau = liste.querySelector("[role='tabpanel']");
      if (panneau && cible.id) panneau.setAttribute("aria-labelledby", cible.id);
    });
  }

  /* Un clavier réglé pour une page (bulle ouverte, touches mises en avant)
     ne vaut que dans sa couche : sur un autre onglet, ou pendant l'essai
     quand Maj ou AltGr sont tenus, la bulle se masque et le surlignage
     s'éteint ; ils reviennent avec la couche du réglage. Sans cela, la
     touche É restait surlignée sous « ◌̋ » et la bulle disait encore « É »
     (critique du 2026-10-01). */
  function suivreReglage(clavier, couche) {
    var reglee = clavier.getAttribute("data-couche-reglage");
    if (!reglee) return;
    if (couche !== reglee) {
      if (clavier.hasAttribute("data-hors-reglage")) return;
      clavier.setAttribute("data-hors-reglage", "");
      var zone = [];
      var marques = {};
      Array.prototype.forEach.call(clavier.querySelectorAll('.clavier__touche[data-etat="surlignee"]'), function (t) {
        var position = t.getAttribute("data-position");
        zone.push(position);
        if (t.getAttribute("data-marque-etape")) marques[position] = t.getAttribute("data-marque-etape");
      });
      clavier.zoneReglage = { positions: zone, marques: marques };
      surligner(clavier, null);
    } else if (clavier.hasAttribute("data-hors-reglage")) {
      clavier.removeAttribute("data-hors-reglage");
      var gardee = clavier.zoneReglage;
      if (gardee && gardee.positions.length) surligner(clavier, gardee.positions, gardee.marques);
    }
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

  /* En mobile, le clavier défile dans son cadre (A002) : sans aide, les
     touches d'une étape pouvaient rester hors champ (Ç et À à l'étape 1, [ ]
     à l'étape 4, ù à l'étape 5 — GU-04). On centre l'étendue des touches
     surlignées, seulement si elle sort du cadre ; plus large que le cadre, on
     cale sur la première touche changée. ⛔ Pas de scrollIntoView : il ferait
     aussi défiler la page. Seul le conteneur bouge. */
  var mouvementReduit = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  /* `doux` : seulement pour un geste du visiteur (étape suivante, choix d'un
     résultat). Au chargement le cadre se cale d'un coup : un défilement
     animé est un mouvement au chargement (critique du 2026-10-01).
     `premiere` : la touche à presser en premier, qui reste dans le cadre
     quand toutes ne tiennent pas. */
  function montrerTouchesChangees(clavier, doux, premiere) {
    var cadre = clavier.closest(".clavier-defilement");
    if (!cadre || cadre.scrollWidth <= cadre.clientWidth) return;
    var touches = clavier.querySelectorAll('.clavier__touche[data-etat="surlignee"]');
    var bulle = clavier.querySelector(".clavier-bulle--epinglee");
    if (bulle && (bulle.hidden || getComputedStyle(bulle).visibility === "hidden")) bulle = null;
    if (!touches.length && !bulle) return;

    var repere = cadre.getBoundingClientRect().left + cadre.clientLeft - cadre.scrollLeft;
    var debut = Infinity;
    var fin = -Infinity;
    Array.prototype.forEach.call(touches, function (touche) {
      var rect = touche.getBoundingClientRect();
      debut = Math.min(debut, rect.left - repere);
      fin = Math.max(fin, rect.right - repere);
    });

    /* La bulle ouverte au chargement est la réponse de la page : le cadre se
       cale sur les touches et sur elle ensemble. Sur /dev à 390 px, le
       centrage des seules touches coupait « { » de 49 px à gauche. Une bulle
       masquée (une autre bulle est ouverte, ou la couche n'est plus celle du
       réglage) ne compte pas. */
    var largeur = cadre.clientWidth;
    var bulleDebut = Infinity;
    var bulleFin = -Infinity;
    if (bulle) {
      var rectBulle = bulle.getBoundingClientRect();
      bulleDebut = rectBulle.left - repere;
      bulleFin = rectBulle.right - repere;

      /* Centrée sur sa touche, elle peut dépasser l'étendue des touches au
         point de rendre l'ensemble plus large que le cadre. Calée sur un bord
         de sa touche, comme près des côtés du clavier, elle y rentre. */
      var ancre = clavier.querySelector('.clavier__touche[data-position="' + bulle.getAttribute("data-ancre") + '"]');
      var etendueCentree = Math.max(fin, bulleFin) - Math.min(debut, bulleDebut);
      if (ancre && bulle.getAttribute("data-cote") === "centre" && etendueCentree > largeur) {
        var rectAncre = ancre.getBoundingClientRect();
        var largeurBulle = bulleFin - bulleDebut;
        var bordGauche = rectAncre.left - repere;
        var bordDroit = rectAncre.right - repere;
        var etendueGauche = Math.max(fin, bordGauche + largeurBulle) - Math.min(debut, bordGauche);
        var etendueDroite = Math.max(fin, bordDroit) - Math.min(debut, bordDroit - largeurBulle);
        if (Math.min(etendueGauche, etendueDroite) < etendueCentree) {
          bulle.setAttribute("data-cote", etendueGauche <= etendueDroite ? "gauche" : "droite");
          rectBulle = bulle.getBoundingClientRect();
          bulleDebut = rectBulle.left - repere;
          bulleFin = rectBulle.right - repere;
        }
      }
    }
    var etendueDebut = Math.min(debut, bulleDebut);
    var etendueFin = Math.max(fin, bulleFin);

    var visibleDebut = cadre.scrollLeft;
    if (etendueDebut >= visibleDebut && etendueFin <= visibleDebut + largeur) return;

    /* « Première » au sens du défilement : la plus à gauche, là où l'étendue
       commence — pas la première du DOM, qui suit l'ordre des rangées. */
    var cible;
    if (etendueFin - etendueDebut <= largeur) {
      cible = (etendueDebut + etendueFin) / 2 - largeur / 2;
    } else {
      cible = fin - debut > largeur ? debut : (debut + fin) / 2 - largeur / 2;
      if (bulle) cible = Math.max(bulleFin + 8 - largeur, Math.min(bulleDebut - 8, cible));
      else if (premiere) {
        var rectPremiere = premiere.getBoundingClientRect();
        cible = Math.max(rectPremiere.right - repere + 8 - largeur, Math.min(rectPremiere.left - repere - 8, cible));
      }
    }
    var maximum = cadre.scrollWidth - largeur;
    cadre.scrollTo({
      left: Math.max(0, Math.min(maximum, Math.round(cible))),
      behavior: doux && !(mouvementReduit && mouvementReduit.matches) ? "smooth" : "auto"
    });
  }

  /* Le cadre n'est une région focalisable que s'il défile et que rien dedans
     ne prend le focus (niveau « image ») : un clavier interactif se parcourt
     par ses touches, que le focus amène dans le cadre. Ailleurs, la région
     n'était qu'un arrêt de tabulation de plus, jusqu'à 1280 px où rien ne
     défile (DEV-09, critique du 2026-10-02). Sans script, le marquage du
     build la garde focalisable. */
  function reglerDefilement(cadre) {
    var clavier = cadre.querySelector(".clavier");
    var focalisable = cadre.scrollWidth > cadre.clientWidth &&
      !(clavier && clavier.hasAttribute("data-interactif"));
    if (focalisable) {
      cadre.setAttribute("tabindex", "0");
      cadre.setAttribute("role", "region");
      cadre.setAttribute("aria-label", "Clavier, défilement horizontal");
    } else {
      cadre.removeAttribute("tabindex");
      cadre.removeAttribute("role");
      cadre.removeAttribute("aria-label");
    }
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

    /* Les jalons sont déjà posés par le gabarit (clavier.njk) : une liste
       vide au premier rendu grandirait quand ce script les peuplerait, un
       cran plus tard, ce qui pousse Précédent/Suivant vers le bas (retour
       d'Antoine, 2026-09-24). On ne les recrée que si le marquage manque. */
    var existants = Array.prototype.slice.call(jalons.querySelectorAll(".clavier-parcours__jalon"));
    if (existants.length !== etapes.length) {
      jalons.textContent = "";
      existants = etapes.map(function () {
        var element = document.createElement("li");
        var bouton = document.createElement("button");
        bouton.type = "button";
        bouton.className = "clavier-parcours__jalon";
        element.appendChild(bouton);
        jalons.appendChild(element);
        return bouton;
      });
    }
    existants.forEach(function (bouton, index) {
      bouton.textContent = String(index + 1);
      bouton.setAttribute(
        "aria-label",
        "Étape " + (index + 1) + " sur " + etapes.length + " : " + titreDe(etapes[index])
      );
      bouton.addEventListener("click", function () {
        aller(index, true);
      });
      boutonsJalons.push(bouton);
    });

    function titreDe(etape) {
      var titre = etape.querySelector(".clavier-parcours__titre");
      return titre ? titre.textContent.replace(/^\d+\.\s*/, "") : "";
    }

    function aller(index, focusEtape) {
      /* Le fondu ne vaut que le temps d'un changement d'étape voulu par le
         visiteur. Posé en permanence, il animait aussi le passage du système
         en sombre, qui arrive sans prévenir : une image à 2,19:1 sur les
         libellés (critique du 2026-10-02). */
      if (focusEtape) {
        figure.setAttribute("data-en-transition", "");
        clearTimeout(figure.finTransition);
        figure.finTransition = setTimeout(function () { figure.removeAttribute("data-en-transition"); }, 400);
      }
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
      montrerTouchesChangees(clavier, focusEtape);

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

    /* Une table gravée : le premier Échap la retire, le second ferme. */
    dialogue.addEventListener("cancel", function (evenement) {
      if (!clavier.hasAttribute("data-table-morte")) return;
      evenement.preventDefault();
      quitterTable(clavier, true);
    });
    dialogue.addEventListener("close", function () { quitterTable(clavier, false); });

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
      clavier.coucheChoisie = couche;
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

  /* Un lien d'ouverture ou d'impression (bouton du héros de l'accueil, rangée
     de l'aide-mémoire) mène sans script à /guide ou au PDF. Avec le script, il
     devient un bouton de même allure à la même place : rien ne se décale au
     chargement, alors qu'un bouton caché puis révélé abaissait la page de 60 px
     à 390 (critique du 2026-10-02), et de 44 à 100 px à l'arrivée par une
     ancre (critique du 2026-10-03). L'ouverture demande les dialogs. */
  function enBouton(lien, attribut) {
    var bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = lien.className;
    bouton.setAttribute(attribut, lien.getAttribute(attribut));
    while (lien.firstChild) bouton.appendChild(lien.firstChild);
    lien.parentNode.replaceChild(bouton, lien);
  }
  if (typeof HTMLDialogElement !== "undefined") {
    Array.prototype.forEach.call(document.querySelectorAll("a[data-clavier-ouvrir]"), function (lien) {
      enBouton(lien, "data-clavier-ouvrir");
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll("a[data-clavier-imprimer]"), function (lien) {
    enBouton(lien, "data-clavier-imprimer");
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

  /* ——— Clavier interactif : infobulle, survol, toucher, clavier ———

     Remplace la bulle de nom du 2026-08-30, qui ne disait qu'un nom et ne
     répondait qu'à la souris. Comme la carte du site v1, jugée meilleure par
     Antoine (2026-10-01) : le caractère, son nom, la frappe en touches
     dessinées et les exemples d'une touche morte ; au survol, au toucher et
     au clavier.

     Une seule bulle par page, en popover : ni le cadre qui défile en mobile,
     ni le dialog plein écran ne la coupent. Elle se rattache au dialog quand
     le clavier y vit, sans quoi le dialog modal la rendrait inerte.

     ⚠️ Le marquage de la bulle est aussi écrit au build pour une bulle ouverte
     au chargement (contenuBulle dans src/_includes/v2/clavier.njk) : toute
     retouche se fait des deux côtés. */

  var COUCHES_GLYPHES = ["base", "maj", "verrmaj", "altgr", "majaltgr"];

  function element(nom, classe, contenu) {
    var e = document.createElement(nom);
    if (classe) e.className = classe;
    if (contenu != null) e.textContent = contenu;
    return e;
  }

  function texte(parent, chaine) {
    parent.appendChild(document.createTextNode(chaine));
  }

  /* « AltGr|1 » → AltGr + 1 en touches dessinées ; vide : accès direct. */
  function frappeDans(parent, morceaux) {
    if (!morceaux) {
      texte(parent, "Accès direct");
      return;
    }
    morceaux.split("|").forEach(function (morceau, rang) {
      if (rang) texte(parent, " + ");
      parent.appendChild(element("kbd", null, morceau));
    });
  }

  function exemplesDe(glyphe) {
    return (glyphe.getAttribute("data-exemples") || "").split("|").filter(Boolean).map(function (paire) {
      var espace = paire.indexOf(" ");
      return { lettre: paire.slice(0, espace), resultat: paire.slice(espace + 1) };
    });
  }

  function coucheDuGlyphe(glyphe) {
    var trouve = /clavier__glyphe--(base|maj|verrmaj|altgr|majaltgr)(\s|$)/.exec(glyphe.className);
    return trouve ? trouve[1] : null;
  }

  /* Les glyphes de la disposition affichée : la bascule avant / après garde
     dans chaque touche les deux gravures, une seule se montre. */
  function glyphesDe(touche, clavier) {
    var avant = clavier.getAttribute("data-disposition") === "traditionnel";
    return Array.prototype.filter.call(touche.querySelectorAll(".clavier__glyphe"), function (g) {
      return g.classList.contains("clavier__glyphe--avant") === avant;
    });
  }

  function glypheDeCouche(touche, clavier, couche) {
    var liste = glyphesDe(touche, clavier);
    for (var i = 0; i < liste.length; i++) {
      if (coucheDuGlyphe(liste[i]) === couche) return liste[i];
    }
    return null;
  }

  function visible(noeud) {
    return noeud.getClientRects().length > 0;
  }

  /* Un glyphe a quelque chose à dire s'il a un nom ou s'il est mort : une
     lettre ou un chiffre se lisent sur la touche. */
  function parlant(glyphe) {
    return glyphe && (glyphe.hasAttribute("data-nom") || glyphe.getAttribute("data-morte") === "1");
  }

  /* Le glyphe que vise le pointeur : le plus proche parmi ceux que la vue
     montre. Les coins de la vue « Tout » font quelques pixels ; le pointeur
     n'a pas à tomber dessus, la touche entière se partage entre eux. */
  function glypheVise(touche, clavier, x, y) {
    var meilleur = null;
    var distance = Infinity;
    glyphesDe(touche, clavier).forEach(function (g) {
      if (!parlant(g) || !visible(g)) return;
      var r = g.getBoundingClientRect();
      var d = Math.pow(r.left + r.width / 2 - x, 2) + Math.pow(r.top + r.height / 2 - y, 2);
      if (d < distance) {
        distance = d;
        meilleur = g;
      }
    });
    return meilleur;
  }

  /* Sans pointeur (focus clavier) : le glyphe de la couche affichée, ou en
     vue « Tout » le plus rare d'abord — AltGr, puis la base. */
  function glypheParDefaut(touche, clavier) {
    var couche = clavier.getAttribute("data-couche");
    if (couche !== "synthese") {
      var seul = glypheDeCouche(touche, clavier, couche);
      return parlant(seul) ? seul : null;
    }
    var ordre = ["altgr", "base", "majaltgr", "maj"];
    for (var i = 0; i < ordre.length; i++) {
      var g = glypheDeCouche(touche, clavier, ordre[i]);
      if (parlant(g) && visible(g)) return g;
    }
    return null;
  }

  /* Un caractère sans dessin (les espaces de la barre d'espace) : la case
     pointillée de la recherche et de l'explorateur, muette, puisque son nom
     suit. ␣ tombait sur une police du système (critique du 2026-10-02). */
  function caseVide(classe) {
    var vide = element("span", (classe ? classe + " " : "") + "clavier-glyphe-vide");
    vide.setAttribute("aria-hidden", "true");
    return vide;
  }

  /* La cellule du glyphe dans la bulle et la fiche : le texte gravé, ou la
     case d'un invisible. */
  function celluleGlyphe(g, contenu) {
    var cellule = element("span", "clavier-bulle__glyphe");
    if (contenu == null && g.hasAttribute("data-invisible")) cellule.appendChild(caseVide(""));
    else cellule.textContent = contenu == null ? g.textContent : contenu;
    return cellule;
  }

  function remplirCaractere(bulle, touche, g, clavier) {
    var exemples = exemplesDe(g);
    var tete = element("p", "clavier-bulle__tete");
    tete.appendChild(celluleGlyphe(g, exemples.length
      ? exemples.map(function (e) { return e.resultat; }).join(" ")
      : null));
    if (g.getAttribute("data-nom")) {
      texte(tete, " ");
      tete.appendChild(element("span", "clavier-bulle__nom", g.getAttribute("data-nom")));
    }
    bulle.appendChild(tete);

    var morte = g.getAttribute("data-morte") === "1";
    var ligne = element("p", "clavier-bulle__frappe");
    frappeDans(ligne, g.getAttribute("data-frappe"));
    if (morte) texte(ligne, " puis la lettre");
    bulle.appendChild(ligne);

    if (morte && g.getAttribute("data-alphabet") === "1") {
      var paires = element("p", "clavier-bulle__paires");
      exemples.forEach(function (e) {
        var paire = element("span", "clavier-bulle__paire");
        paire.appendChild(element("kbd", null, e.lettre));
        texte(paire, " " + e.resultat);
        paires.appendChild(paire);
      });
      bulle.appendChild(paires);
    }

    /* La capitale qui ne se grave pas : É par Verr. Maj. sous é, Æ sous æ. */
    var couche = coucheDuGlyphe(g);
    var autre = null;
    if (couche === "base") {
      var capitale = glypheDeCouche(touche, clavier, "verrmaj");
      var maj = glypheDeCouche(touche, clavier, "maj");
      if (capitale && /^Verr\. Maj\./.test(capitale.getAttribute("data-frappe") || "") &&
          !(maj && maj.textContent === capitale.textContent)) {
        autre = capitale;
      }
    } else if (couche === "altgr" && touche.getAttribute("data-majaltgr-redondante") === "1") {
      autre = glypheDeCouche(touche, clavier, "majaltgr");
    }
    if (autre) {
      var ajout = element("p", "clavier-bulle__autre");
      texte(ajout, "Majuscule " + autre.textContent + " : ");
      frappeDans(ajout, autre.getAttribute("data-frappe"));
      bulle.appendChild(ajout);
    }
  }

  function remplirFiche(bulle, touche, actif, clavier) {
    bulle.appendChild(element("p", "clavier-bulle__titre", "Touche " + touche.getAttribute("data-nom-touche")));
    var liste = element("ul", "clavier-bulle__lignes");
    var maj = glypheDeCouche(touche, clavier, "maj");
    COUCHES_GLYPHES.forEach(function (couche) {
      var g = glypheDeCouche(touche, clavier, couche);
      if (!g) return;
      if (couche === "verrmaj" &&
          (!/^Verr\. Maj\./.test(g.getAttribute("data-frappe") || "") || (maj && maj.textContent === g.textContent))) return;
      if (couche === "maj" && touche.getAttribute("data-maj-redondante") === "1") return;
      /* Sur une touche de lettre, « d : accès direct » et « D : Maj + D »
         n'apprennent rien : la fiche ne garde que ce qu'AltGr ajoute. */
      if ((couche === "base" || couche === "maj") && touche.getAttribute("data-lettre") === "1") return;

      var ligne = element("li", "clavier-bulle__ligne");
      if (g === actif) ligne.setAttribute("data-actif", "");
      ligne.appendChild(celluleGlyphe(g, null));
      var corps = element("span", "clavier-bulle__corps");
      if (g.getAttribute("data-nom")) corps.appendChild(element("span", "clavier-bulle__nom", g.getAttribute("data-nom")));
      var exemples = exemplesDe(g);
      if (exemples.length) {
        var suite = element("span", "clavier-bulle__suite");
        texte(suite, "puis ");
        exemples.forEach(function (e, rang) {
          if (rang) texte(suite, " ");
          if (g.getAttribute("data-alphabet") === "1") {
            suite.appendChild(element("kbd", null, e.lettre));
            texte(suite, " " + e.resultat);
          } else {
            texte(suite, e.resultat);
          }
        });
        corps.appendChild(suite);
      }
      /* Une touche morte ouvre sa table entière (explorateur, QCM du
         2026-10-01). */
      if (g.getAttribute("data-morte") === "1" && g.getAttribute("data-cle")) {
        var explorer = element("button", "clavier-bulle__explorer",
          "Voir les " + g.getAttribute("data-combinaisons") + " combinaisons");
        explorer.type = "button";
        explorer.setAttribute("aria-label", "Voir les " + g.getAttribute("data-combinaisons") +
          " combinaisons de la touche morte " + (g.getAttribute("data-nom") || "").toLowerCase());
        explorer.setAttribute("data-explorer", g.getAttribute("data-cle"));
        explorer.setAttribute("data-nom", g.getAttribute("data-nom") || "");
        explorer.setAttribute("data-frappe", g.getAttribute("data-frappe") || "");
        corps.appendChild(explorer);
        prechargerPoliceEtendue();
        /* Sur un clavier à onglets, la table se gravera : ses données
           arrivent avant le clic. */
        if (rangeeOnglets(clavier)) chargerDonneesEssai().catch(function () { /* l'explorateur le dira */ });
      }
      ligne.appendChild(corps);
      var frappe = element("span", "clavier-bulle__frappe");
      frappeDans(frappe, g.getAttribute("data-frappe"));
      ligne.appendChild(frappe);
      liste.appendChild(ligne);
    });
    bulle.appendChild(liste);
  }

  var bulle = null;
  var ouverte = null; /* { touche, glyphe, epinglee } */

  function obtenirBulle(clavier) {
    var hote = clavier.closest("dialog") || document.body;
    if (!bulle) {
      bulle = document.createElement("div");
      bulle.setAttribute("aria-hidden", "true");
      if (typeof bulle.showPopover === "function") bulle.setAttribute("popover", "manual");
      else bulle.hidden = true;
      /* Dans la fiche, Échap rend le focus à la touche ; sortir de la fiche
         ailleurs que vers son clavier la ferme. */
      bulle.addEventListener("keydown", function (evenement) {
        if (evenement.key !== "Escape" || !ouverte) return;
        evenement.preventDefault();
        evenement.stopPropagation();
        var retour = ouverte.touche;
        fermer();
        retour.focus();
      });
      bulle.addEventListener("focusout", function (evenement) {
        if (!ouverte) return;
        var vers = evenement.relatedTarget;
        if (vers && (bulle.contains(vers) || ouverte.touche.closest(".clavier").contains(vers))) return;
        fermer();
      });
    }
    if (bulle.parentNode !== hote) hote.appendChild(bulle);
    return bulle;
  }

  function placer(touche) {
    var r = touche.getBoundingClientRect();
    var m = bulle.getBoundingClientRect();
    var marge = 8;
    var gauche = r.left + r.width / 2 - m.width / 2;
    gauche = Math.max(marge, Math.min(gauche, window.innerWidth - m.width - marge));
    /* Au-dessus de la touche ; dessous quand la place manque en haut ; ni
       l'un ni l'autre (fiche haute sur un téléphone, mesurée à 428 px pour la
       touche * µ я ө) : calée dans l'écran, quitte à couvrir la touche. La
       fiche défile alors elle-même (max-height en CSS). */
    var dessus = r.top - m.height - 8;
    var dessous = r.bottom + 8;
    var haut;
    if (dessus >= marge) haut = dessus;
    else if (dessous + m.height <= window.innerHeight - marge) haut = dessous;
    else haut = Math.max(marge, Math.min(dessous, window.innerHeight - m.height - marge));
    bulle.style.left = Math.round(gauche) + "px";
    bulle.style.top = Math.round(haut) + "px";
  }

  /* Survol : la bulle du caractère visé. Clic, toucher, flèches : la fiche de
     toute la touche, qui reste ouverte (choix d'Antoine sur planche, QCM du
     2026-10-01). */
  function ouvrir(clavier, touche, glyphe, epinglee) {
    /* Gravé d'une table, le dessin ne dit plus ce que portent ses glyphes
       d'origine : pas de bulle ; chaque touche dit son résultat par son nom. */
    if (clavier.hasAttribute("data-table-morte")) {
      fermer();
      return;
    }
    var fiche = !!epinglee;
    if (!fiche && !glyphe) {
      fermer();
      return;
    }
    if (fiche && !Array.prototype.some.call(touche.querySelectorAll(".clavier__glyphe"), parlant)) {
      fermer();
      return;
    }
    obtenirBulle(clavier);
    bulle.className = "clavier-bulle" + (fiche ? " clavier-bulle--fiche" : "");
    /* La fiche porte des boutons : elle ne se cache pas aux lecteurs d'écran.
       La bulle de survol redit le nom de la touche, elle reste muette. */
    if (fiche) {
      bulle.removeAttribute("aria-hidden");
      bulle.setAttribute("role", "group");
      bulle.setAttribute("aria-label", "Touche " + (touche.getAttribute("data-nom-touche") || ""));
    } else {
      bulle.setAttribute("aria-hidden", "true");
      bulle.removeAttribute("role");
      bulle.removeAttribute("aria-label");
    }
    bulle.textContent = "";
    if (fiche) remplirFiche(bulle, touche, glyphe, clavier);
    else remplirCaractere(bulle, touche, glyphe, clavier);

    if (typeof bulle.showPopover === "function") {
      if (!bulle.matches(":popover-open")) bulle.showPopover();
    } else {
      bulle.hidden = false;
      bulle.style.position = "fixed";
    }
    placer(touche);

    if (ouverte && ouverte.touche !== touche) {
      ouverte.touche.removeAttribute("data-ouverte");
      ouverte.touche.closest(".clavier").removeAttribute("data-bulle-active");
    }
    touche.setAttribute("data-ouverte", "");
    /* Une bulle ouverte au chargement s'efface tant qu'une autre bulle est
       ouverte : la seconde la recouvrait (critique du 2026-10-01). */
    clavier.setAttribute("data-bulle-active", "");
    ouverte = { touche: touche, glyphe: glyphe, epinglee: !!epinglee };
  }

  function fermer() {
    if (bulle) {
      if (typeof bulle.hidePopover === "function") {
        if (bulle.matches(":popover-open")) bulle.hidePopover();
      } else {
        bulle.hidden = true;
      }
    }
    if (ouverte) {
      ouverte.touche.removeAttribute("data-ouverte");
      ouverte.touche.closest(".clavier").removeAttribute("data-bulle-active");
    }
    ouverte = null;
  }

  /* La touche voisine dans la direction d'une flèche, par géométrie : le cadre
     ISO décale les rangées, une colonne de grille ne vaut pas une colonne de
     touches. */
  function voisine(touches, depart, direction) {
    var r = depart.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var meilleure = null;
    var score = Infinity;
    touches.forEach(function (t) {
      if (t === depart) return;
      var s = t.getBoundingClientRect();
      var dx = s.left + s.width / 2 - cx;
      var dy = s.top + s.height / 2 - cy;
      var memeRangee = Math.abs(dy) < r.height / 2;
      var valable =
        direction === "ArrowRight" ? dx > 1 && memeRangee :
        direction === "ArrowLeft" ? dx < -1 && memeRangee :
        direction === "ArrowDown" ? dy > r.height / 2 :
        direction === "ArrowUp" ? dy < -r.height / 2 : false;
      if (!valable) return;
      var d = memeRangee ? Math.abs(dx) : Math.abs(dy) * 1000 + Math.abs(dx);
      if (d < score) {
        score = d;
        meilleure = t;
      }
    });
    return meilleure;
  }

  function rendreInteractif(clavier) {
    var niveau = clavier.getAttribute("data-interaction") || "bulles";
    if (niveau === "image" || clavier.closest(".feuille-impression")) return;

    var touches = Array.prototype.slice.call(clavier.querySelectorAll(".clavier__touche--car"));
    if (!touches.length) return;

    clavier.setAttribute("data-interactif", "");
    clavier.setAttribute("role", "group");
    clavier.setAttribute(
      "aria-label",
      "Clavier AZERTY Global. Les flèches passent d’une touche à l’autre ; chaque touche dit ce qu’elle produit, couche par couche."
    );
    touches.forEach(function (t, rang) {
      t.setAttribute("role", "button");
      t.setAttribute("tabindex", rang === 0 ? "0" : "-1");
      t.setAttribute("aria-label", t.getAttribute("data-aria") || "");
      Array.prototype.forEach.call(t.children, function (enfant) {
        enfant.setAttribute("aria-hidden", "true");
      });
    });

    function toucheDe(cible) {
      var t = cible && cible.closest ? cible.closest(".clavier__touche--car") : null;
      return t && clavier.contains(t) ? t : null;
    }

    clavier.addEventListener("pointermove", function (evenement) {
      if (evenement.pointerType === "touch") return;
      var t = toucheDe(evenement.target);
      if (!t) {
        if (ouverte && !ouverte.epinglee) fermer();
        return;
      }
      /* Une fiche ouverte au clic ne cède pas au survol : en montant vers ses
         boutons, le pointeur traverse la touche du dessus, et la fiche
         disparaissait en route (critique du 2026-10-01). Un clic ailleurs ou
         Échap la ferment. */
      if (ouverte && ouverte.epinglee) return;
      var g = glypheVise(t, clavier, evenement.clientX, evenement.clientY);
      if (ouverte && ouverte.touche === t && ouverte.glyphe === g) return;
      ouvrir(clavier, t, g, false);
    });

    clavier.addEventListener("pointerleave", function () {
      if (ouverte && !ouverte.epinglee) fermer();
    });

    /* Un clic ou un toucher garde la bulle ouverte ; le même geste sur la même
       touche la referme. */
    clavier.addEventListener("click", function (evenement) {
      var t = toucheDe(evenement.target);
      if (!t) return;
      var g = evenement.detail
        ? glypheVise(t, clavier, evenement.clientX, evenement.clientY)
        : glypheParDefaut(t, clavier);
      if (ouverte && ouverte.epinglee && ouverte.touche === t && ouverte.glyphe === g) {
        fermer();
        return;
      }
      ouvrir(clavier, t, g || glypheParDefaut(t, clavier), true);
    });

    clavier.addEventListener("focusin", function (evenement) {
      var t = toucheDe(evenement.target);
      if (!t) return;
      touches.forEach(function (autre) {
        autre.setAttribute("tabindex", autre === t ? "0" : "-1");
      });
      var auClavier = true;
      try { auClavier = t.matches(":focus-visible"); } catch (e) { /* ancien moteur */ }
      if (auClavier) ouvrir(clavier, t, glypheParDefaut(t, clavier), true);
    });

    clavier.addEventListener("focusout", function (evenement) {
      var vers = evenement.relatedTarget;
      if (clavier.contains(vers) || (bulle && vers && bulle.contains(vers))) return;
      fermer();
    });

    clavier.addEventListener("keydown", function (evenement) {
      var t = toucheDe(evenement.target);
      if (!t) return;
      if (evenement.key === "Escape" && ouverte) {
        /* Échap ferme d'abord la bulle ; un second Échap fermera le dialog. */
        evenement.preventDefault();
        evenement.stopPropagation();
        fermer();
        return;
      }
      if (evenement.key === "Enter" || evenement.key === " ") {
        evenement.preventDefault();
        /* Entrée ouvre la fiche et y porte le focus quand elle a des boutons
           (les tables de chaque touche morte) : la fiche vit au bout de la
           page, hors de l'ordre de tabulation. Échap y rend le focus à la
           touche. */
        var visee = glypheParDefaut(t, clavier);
        var dejaOuverte = !!(ouverte && ouverte.touche === t && ouverte.epinglee);
        if (!dejaOuverte) ouvrir(clavier, t, visee, true);
        var premier = ouverte && ouverte.touche === t && bulle ? bulle.querySelector("button") : null;
        if (premier) premier.focus();
        else if (dejaOuverte) fermer();
        return;
      }
      var suivante = voisine(touches, t, evenement.key);
      if (suivante) {
        evenement.preventDefault();
        suivante.focus();
      }
    });
  }

  /* Un toucher hors de tout clavier referme la bulle ; un défilement la
     replace, ou la ferme si sa touche est sortie de l'écran. */
  document.addEventListener("click", function (evenement) {
    var cible = evenement.target;
    var bouton = cible.closest ? cible.closest("[data-explorer]") : null;
    if (bouton && ouverte) {
      var clavierOuvert = ouverte.touche.closest(".clavier");
      var cle = bouton.getAttribute("data-explorer");
      var nom = bouton.getAttribute("data-nom");
      var morceaux = bouton.getAttribute("data-frappe");
      /* La table se grave sur un clavier à onglets ; ailleurs, l'explorateur. */
      if (graverSurPlace(clavierOuvert, cle, nom, morceaux, ouverte.touche)) return;
      ouvrirExplorateur(clavierOuvert, cle, nom, morceaux, ouverte.touche);
      return;
    }
    if (bulle && bulle.contains(cible)) return;
    if (ouverte && !ouverte.touche.contains(cible)) {
      var clavier = cible.closest ? cible.closest(".clavier") : null;
      if (!clavier) fermer();
    }
  });

  /* ——— Explorateur de touches mortes (QCM d'Antoine du 2026-10-01) ———
     Toute la table d'une touche morte, dans un dialog : la page ne bouge pas
     (rien ne s'insère dans le flux au clic). Données du testeur, chargées à
     la première ouverture. */
  var explorateur = null;

  /* Le second fichier d'AG Clavier (cyrillique, grec, symboles) se demande
     dès qu'une fiche propose une table : il arrive avant l'ouverture, au lieu
     de changer le dessin des cases sous les yeux (font-display: swap). */
  var policeEtendueDemandee = false;
  function prechargerPoliceEtendue() {
    if (policeEtendueDemandee || !document.fonts || !document.fonts.load) return;
    policeEtendueDemandee = true;
    document.fonts.load('1em "AG Clavier"', "Ж").catch(function () { /* police du système */ });
  }

  function ouvrirExplorateur(clavier, cle, nom, morceaux, toucheDeRetour) {
    fermer();
    if (!explorateur) {
      explorateur = document.createElement("dialog");
      explorateur.className = "clavier-explorateur";
      explorateur.setAttribute("aria-labelledby", "clavier-explorateur-titre");
      var barre = element("div", "clavier-explorateur__barre");
      barre.appendChild(element("h2", "clavier-explorateur__titre"));
      barre.lastChild.id = "clavier-explorateur-titre";
      var forme = element("form", "clavier-plein__fermer-forme");
      forme.method = "dialog";
      var fermerBouton = element("button", "visionneuse__fermer", "Fermer");
      fermerBouton.value = "fermer";
      forme.appendChild(fermerBouton);
      barre.appendChild(forme);
      explorateur.appendChild(barre);
      explorateur.appendChild(element("p", "clavier-explorateur__frappe"));
      explorateur.appendChild(element("ul", "clavier-explorateur__grille"));
      explorateur.addEventListener("close", function () {
        if (explorateur.retour && document.contains(explorateur.retour)) explorateur.retour.focus();
      });
    }
    var hote = (clavier && clavier.closest("dialog")) || document.body;
    if (explorateur.parentNode !== hote) hote.appendChild(explorateur);
    explorateur.retour = toucheDeRetour || null;

    explorateur.querySelector(".clavier-explorateur__titre").textContent = nom || "Touche morte";
    var ligne = explorateur.querySelector(".clavier-explorateur__frappe");
    ligne.textContent = "";
    /* Une touche morte en accès direct se nomme par sa touche : « Accès
       direct, puis la touche indiquée » ne disait pas laquelle (critique du
       2026-10-02). */
    if (!morceaux && toucheDeRetour) morceaux = toucheDeRetour.getAttribute("data-nom-touche") || "";
    frappeDans(ligne, morceaux);
    texte(ligne, ", puis la touche indiquée :");
    var grille = explorateur.querySelector(".clavier-explorateur__grille");
    grille.textContent = "";
    grille.setAttribute("aria-busy", "true");
    if (typeof explorateur.showModal === "function" && !explorateur.open) explorateur.showModal();

    chargerDonneesEssai().then(function (donnees) {
      var table = donnees.deadkeys[cle] || {};
      grille.textContent = "";
      Object.keys(table).forEach(function (lettre) {
        var item = element("li", "clavier-explorateur__item");
        item.appendChild(element("kbd", null, lettre === " " ? "Espace" : lettre));
        item.appendChild(glyphe("clavier-explorateur__resultat", table[lettre], true));
        grille.appendChild(item);
      });
      grille.removeAttribute("aria-busy");
    }).catch(function () {
      grille.removeAttribute("aria-busy");
      grille.appendChild(element("li", "clavier-explorateur__vide", "La table ne peut pas se charger."));
    });
  }

  /* ——— Table d'une touche morte, gravée sur le clavier (piste A, QCM
     d'Antoine du 2026-10-03) ———
     Sur un clavier qui porte ses onglets de couche (/guide, plein écran),
     « Voir les combinaisons » grave la table sur le dessin : chaque touche
     montre ce qu'elle donne après la touche morte (minuscule en bas,
     capitale en haut, AltGr à droite), la touche morte reste cerclée avec sa
     gravure, les touches sans combinaison s'atténuent. Un bandeau prend la
     place des onglets, à leur hauteur : rien ne bouge. Échap, « Revenir au
     clavier » ou un changement de couche rendent le dessin. Chaque touche
     gravée porte son nom accessible, et la liste complète suit en texte pour
     les lecteurs d'écran. Sans onglets (héros, parcours), l'explorateur
     s'ouvre comme avant. Maquettes et critique : planches G-2026-10-03 de
     operations/refonte-site/2026-10-01-clavier-adaptatif/. */

  var RANGS_TABLE = { base: 0, maj: 1, altgr: 4, majaltgr: 5 };
  var COUCHES_LUES = { base: "", maj: " avec Maj", altgr: " avec AltGr", majaltgr: " avec AltGr et Maj" };
  var DRAPEAUX_TABLE = ["data-lettre", "data-maj-redondante", "data-majaltgr-redondante", "data-marque-etape"];
  var CERCLE = String.fromCharCode(0x25CC);

  function rangeeOnglets(clavier) {
    if (!clavier) return null;
    var enPage = clavier.id && document.querySelector('[data-clavier-onglets="' + clavier.id + '"]');
    if (enPage) return enPage;
    var dialogue = clavier.closest("dialog.clavier-plein");
    return dialogue ? dialogue.querySelector('.clavier-plein__barre [role="tablist"]') : null;
  }

  /* Un attribut mis de côté le temps de la table : « =valeur » s'il était
     posé, vide s'il ne l'était pas. */
  function garder(noeud, attribut) {
    var copie = "data-table-" + attribut.replace(/^data-/, "");
    if (noeud.hasAttribute(copie)) return;
    noeud.setAttribute(copie, noeud.hasAttribute(attribut) ? "=" + noeud.getAttribute(attribut) : "");
  }

  function rendre(noeud, attribut) {
    var copie = "data-table-" + attribut.replace(/^data-/, "");
    if (!noeud.hasAttribute(copie)) return;
    var valeur = noeud.getAttribute(copie);
    if (valeur.charAt(0) === "=") noeud.setAttribute(attribut, valeur.slice(1));
    else noeud.removeAttribute(attribut);
    noeud.removeAttribute(copie);
  }

  /* Grave la table et rend, touche par touche, ce qu'un lecteur d'écran en
     dit : « Touche A : α ; Α avec Maj ». */
  function graverTable(clavier, cle, donnees) {
    var table = donnees.deadkeys[cle] || {};
    var codes = {};
    Object.keys(CODE_POSITION).forEach(function (code) { codes[CODE_POSITION[code]] = code; });
    ["data-couche", "data-mortes"].forEach(function (attribut) { garder(clavier, attribut); });
    clavier.setAttribute("data-table-morte", cle);
    clavier.setAttribute("data-couche", "synthese");
    clavier.setAttribute("data-mortes", "distinguees");

    var lignes = [];
    Array.prototype.forEach.call(clavier.querySelectorAll(".clavier__touche--car"), function (touche) {
      var niveaux = donnees.keymap[codes[touche.getAttribute("data-position")]] || [];
      var nom = touche.getAttribute("data-nom-touche") || "";
      ["data-etat", "aria-label"].concat(DRAPEAUX_TABLE).forEach(function (attribut) { garder(touche, attribut); });
      touche.removeAttribute("data-marque-etape");

      /* La touche morte garde sa gravure, cerclée : on la reconnaît. */
      if (niveaux.indexOf(cle) !== -1) {
        touche.setAttribute("data-etat", "surlignee");
        touche.setAttribute("data-marque-etape", "ajoutee");
        if (touche.hasAttribute("role")) touche.setAttribute("aria-label", "Touche " + nom + " : la touche morte");
        return;
      }

      /* Les quatre coins, même sur une touche de lettre : une capitale seule
         ressemble trop souvent au latin (Α, Β, Ε). */
      ["data-lettre", "data-maj-redondante", "data-majaltgr-redondante"].forEach(function (drapeau) {
        touche.removeAttribute(drapeau);
      });
      var vus = {};
      var lus = [];
      Object.keys(RANGS_TABLE).forEach(function (couche) {
        var g = touche.querySelector(".clavier__glyphe--" + couche + ":not(.clavier__glyphe--avant)");
        if (!g) return;
        var valeur = niveaux[RANGS_TABLE[couche]];
        /* Une autre touche morte ne s'enchaîne pas ici : son accent seul
           faisait sortir des résultats parasites (µ, ύ en double). */
        var r = valeur && valeur.indexOf("dk_") !== 0 ? table[valeur] || null : null;
        if (r && vus[r]) r = null;
        if (r) vus[r] = true;
        if (!g.hasAttribute("data-table-texte")) g.setAttribute("data-table-texte", g.textContent);
        garder(g, "data-morte");
        g.removeAttribute("data-morte");
        g.textContent = r ? (marqueSeule(r) ? CERCLE + r : r) : "";
        if (r) lus.push(r + COUCHES_LUES[couche]);
      });
      if (lus.length) {
        touche.removeAttribute("data-etat");
        lignes.push("Touche " + nom + " : " + lus.join(" ; "));
      } else {
        touche.setAttribute("data-etat", "attenuee");
      }
      if (touche.hasAttribute("role")) {
        touche.setAttribute("aria-label", "Touche " + nom + " : " + (lus.length ? lus.join(" ; ") : "aucune combinaison"));
      }
    });

    /* Au téléphone, le cadre montre d'abord les lettres, à gauche ; la
       touche morte se dit dans le bandeau. */
    var cadre = clavier.closest(".clavier-defilement");
    if (cadre) cadre.scrollLeft = 0;
    return lignes;
  }

  function rendreGravure(clavier) {
    Array.prototype.forEach.call(clavier.querySelectorAll("[data-table-texte]"), function (g) {
      g.textContent = g.getAttribute("data-table-texte");
      g.removeAttribute("data-table-texte");
      rendre(g, "data-morte");
    });
    Array.prototype.forEach.call(clavier.querySelectorAll(".clavier__touche--car"), function (touche) {
      ["data-etat", "aria-label"].concat(DRAPEAUX_TABLE).forEach(function (attribut) { rendre(touche, attribut); });
    });
    clavier.removeAttribute("data-table-morte");
    ["data-couche", "data-mortes"].forEach(function (attribut) { rendre(clavier, attribut); });
  }

  function quitterTable(clavier, rendreLeFocus) {
    if (!clavier || !clavier.hasAttribute("data-table-morte")) return;
    rendreGravure(clavier);
    if (clavier.bandeauTable) clavier.bandeauTable.hidden = true;
    if (clavier.ongletsTable) {
      clavier.ongletsTable.hidden = false;
      var actif = clavier.ongletsTable.querySelector('[aria-selected="true"]');
      if (rendreLeFocus && actif) actif.focus();
    }
  }

  function bandeauTable(clavier) {
    if (clavier.bandeauTable) return clavier.bandeauTable;
    var onglets = rangeeOnglets(clavier);
    if (!onglets) return null;
    var bandeau = element("div", "clavier-table");
    bandeau.hidden = true;
    var annonce = element("p", "clavier-table__texte");
    annonce.setAttribute("role", "status");
    var retour = element("button", "bouton bouton--secondaire clavier-table__retour", "Revenir au clavier");
    retour.type = "button";
    retour.addEventListener("click", function () { quitterTable(clavier, true); });
    var liste = element("ul", "visuellement-cache clavier-table__liste");
    bandeau.appendChild(annonce);
    bandeau.appendChild(retour);
    bandeau.appendChild(liste);
    onglets.parentNode.insertBefore(bandeau, onglets.nextSibling);
    bandeau.clavierTable = clavier;
    clavier.bandeauTable = bandeau;
    clavier.ongletsTable = onglets;
    return bandeau;
  }

  /* Rend faux quand le clavier n'a pas d'onglets : l'explorateur prend le
     relais. */
  function graverSurPlace(clavier, cle, nom, morceaux, toucheDeRetour) {
    var bandeau = bandeauTable(clavier);
    if (!bandeau) return false;
    fermer();
    chargerDonneesEssai().then(function (donnees) {
      quitterTable(clavier, false);
      var lignes = graverTable(clavier, cle, donnees);
      var onglets = clavier.ongletsTable;
      bandeau.style.minHeight = onglets.offsetHeight + "px";
      onglets.hidden = true;
      bandeau.hidden = false;

      var garde = clavier.querySelector('.clavier__glyphe[data-cle="' + cle + '"]');
      var annonce = bandeau.querySelector(".clavier-table__texte");
      annonce.textContent = "";
      var titre = element("span", "clavier-table__titre");
      if (garde) titre.appendChild(element("span", "clavier-table__gravure", garde.textContent));
      texte(titre, (garde ? " " : "") + (nom || "Touche morte"));
      annonce.appendChild(titre);
      /* Une espace entre les deux : sans elle, la synthèse vocale lisait
         « grecMaj ». Dans la rangée flexible, elle ne prend aucune place. */
      texte(annonce, " ");
      var frappe = element("span", "clavier-table__frappe");
      if (!morceaux && toucheDeRetour) morceaux = toucheDeRetour.getAttribute("data-nom-touche") || "";
      frappeDans(frappe, morceaux);
      texte(frappe, ", puis la touche");
      annonce.appendChild(frappe);

      var liste = bandeau.querySelector(".clavier-table__liste");
      liste.textContent = "";
      liste.setAttribute("aria-label", "Combinaisons de la touche morte " + (nom || "").toLowerCase());
      lignes.forEach(function (ligne) { liste.appendChild(element("li", null, ligne)); });
      bandeau.querySelector(".clavier-table__retour").focus();
    }).catch(function () {
      /* Données indisponibles : l'explorateur le dit, comme avant. */
      ouvrirExplorateur(clavier, cle, nom, morceaux, toucheDeRetour);
    });
    return true;
  }

  /* Échap rend le dessin, depuis une touche ou le bandeau. Dans le plein
     écran, l'événement cancel du dialog s'en charge (monterPleinEcran) : le
     premier Échap quitte la table, le second ferme le dialog. */
  document.addEventListener("keydown", function (evenement) {
    if (evenement.key !== "Escape" || ouverte) return;
    var actif = document.activeElement;
    if (!actif || !actif.closest || actif.closest("dialog.clavier-plein")) return;
    var bandeau = actif.closest(".clavier-table");
    var clavier = bandeau ? bandeau.clavierTable : actif.closest(".clavier[data-table-morte]");
    if (!clavier || !clavier.hasAttribute("data-table-morte")) return;
    evenement.preventDefault();
    quitterTable(clavier, true);
  });

  window.addEventListener("scroll", function () {
    if (!ouverte) return;
    var r = ouverte.touche.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) fermer();
    else placer(ouverte.touche);
  }, { passive: true, capture: true });

  window.addEventListener("resize", function () {
    if (ouverte) placer(ouverte.touche);
  });

  /* ——— Onglets de couches dans la page (niveaux « onglets » et « essai ») ——— */

  function monterOngletsEnPage(liste) {
    var clavier = document.getElementById(liste.getAttribute("data-clavier-onglets"));
    var onglets = Array.prototype.slice.call(liste.querySelectorAll("[data-couche-cible]"));
    if (!clavier || !onglets.length) return;

    function activer(couche, prendreLeFocus) {
      onglets.forEach(function (onglet) {
        var actif = onglet.getAttribute("data-couche-cible") === couche;
        onglet.setAttribute("aria-selected", actif ? "true" : "false");
        onglet.tabIndex = actif ? 0 : -1;
        if (actif && prendreLeFocus) onglet.focus();
      });
      fermer();
      clavier.coucheChoisie = couche;
      appliquerCouche(clavier, couche, libelleCouche(couche));
      if (clavier.hasAttribute("data-interactif")) {
        clavier.setAttribute(
          "aria-label",
          "Clavier AZERTY Global, vue « " + libelleCouche(couche) + " ». Les flèches passent d’une touche à l’autre."
        );
      }
    }

    onglets.forEach(function (onglet, rang) {
      onglet.addEventListener("click", function () {
        activer(onglet.getAttribute("data-couche-cible"), false);
      });
      onglet.addEventListener("keydown", function (evenement) {
        var pas = evenement.key === "ArrowRight" ? 1 : evenement.key === "ArrowLeft" ? -1 : 0;
        if (!pas) return;
        evenement.preventDefault();
        var cible = onglets[(rang + pas + onglets.length) % onglets.length];
        activer(cible.getAttribute("data-couche-cible"), true);
      });
    });
    liste.hidden = false;
  }

  /* ——— Essai en direct (niveau « essai », QCM d'Antoine du 2026-10-01) ———

     Le visiteur tape sur son propre clavier dans le champ : la touche
     pressée s'allume sur le dessin, Maj et AltGr maintenus changent la couche
     affichée, et le champ reçoit ce qu'AZERTY Global écrirait, touches mortes
     comprises. Les données sont celles du testeur (tester/azerty-global.json,
     généré depuis la définition par scripts/generate-tester-data.js) : une
     seule source pour le testeur et ce mini-essai. Chargées au premier focus,
     pas avant. Clavier physique seulement : un clavier d'écran ne donne pas
     de code de touche, le bloc reste caché sur un appareil tactile. */

  /* Code physique (KeyboardEvent.code, nommé d'après le QWERTY) → position
     ISO. C'est de la géométrie de clavier, pas une disposition. */
  var CODE_POSITION = {
    Backquote: "E00", Digit1: "E01", Digit2: "E02", Digit3: "E03", Digit4: "E04", Digit5: "E05",
    Digit6: "E06", Digit7: "E07", Digit8: "E08", Digit9: "E09", Digit0: "E10", Minus: "E11", Equal: "E12",
    KeyQ: "D01", KeyW: "D02", KeyE: "D03", KeyR: "D04", KeyT: "D05", KeyY: "D06", KeyU: "D07",
    KeyI: "D08", KeyO: "D09", KeyP: "D10", BracketLeft: "D11", BracketRight: "D12",
    KeyA: "C01", KeyS: "C02", KeyD: "C03", KeyF: "C04", KeyG: "C05", KeyH: "C06", KeyJ: "C07",
    KeyK: "C08", KeyL: "C09", Semicolon: "C10", Quote: "C11", Backslash: "C12",
    IntlBackslash: "B00", KeyZ: "B01", KeyX: "B02", KeyC: "B03", KeyV: "B04", KeyB: "B05",
    KeyN: "B06", KeyM: "B07", Comma: "B08", Period: "B09", Slash: "B10",
    Space: "A03"
  };

  var plateforme = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
  var MAC = /mac|iphone|ipad|ipod/i.test(plateforme);
  var donneesEssai = null;

  function chargerDonneesEssai() {
    if (!donneesEssai) {
      donneesEssai = fetch("/tester/azerty-global.json").then(function (reponse) {
        if (!reponse.ok) throw new Error("données de l’essai indisponibles");
        return reponse.json();
      });
    }
    return donneesEssai;
  }

  /* Sur Mac, les deux touches de la rangée du haut et du bas à gauche sont
     échangées par le navigateur, et Option tient lieu d'AltGr (même règle que
     js/tester-keyboard-input.js). */
  function codePhysique(evenement) {
    var code = evenement.code;
    if (MAC && code === "Backquote") return "IntlBackslash";
    if (MAC && code === "IntlBackslash") return "Backquote";
    return code;
  }

  function modificateurs(evenement) {
    var etat = function (nom) {
      return typeof evenement.getModifierState === "function" && evenement.getModifierState(nom);
    };
    return {
      maj: evenement.shiftKey,
      verr: !!etat("CapsLock"),
      altgr: !!(etat("AltGraph") || (MAC ? evenement.altKey : evenement.ctrlKey && evenement.altKey))
    };
  }

  /* Rang dans keymap : base, Maj, Verr., Verr.+Maj, AltGr, AltGr+Maj,
     Verr.+AltGr, Verr.+AltGr+Maj (scripts/generate-tester-data.js). */
  function rang(m) {
    return (m.altgr ? 4 : 0) + (m.verr ? 2 : 0) + (m.maj ? 1 : 0);
  }

  function coucheTenue(m) {
    if (m.altgr) return m.maj ? "majaltgr" : "altgr";
    if (m.maj) return "maj";
    return m.verr ? "verrmaj" : null;
  }

  function entreGuillemets(texte) {
    return "« " + texte + " »";
  }

  function monterEssai(bloc) {
    var clavier = document.getElementById(bloc.getAttribute("data-clavier-essai"));
    var champ = bloc.querySelector(".clavier-essai__champ");
    var sortie = bloc.querySelector(".clavier-essai__sortie");
    if (!clavier || !champ || !sortie) return;
    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    bloc.hidden = false;

    var coucheDeDepart = clavier.getAttribute("data-couche");
    var morteEnAttente = null;
    var allumees = {};

    function allumer(position, oui) {
      var touche = clavier.querySelector('.clavier__touche--car[data-position="' + position + '"]');
      if (!touche) return;
      if (oui) touche.setAttribute("data-appuyee", "");
      else touche.removeAttribute("data-appuyee");
    }

    function suivreCouche(m) {
      var couche = coucheTenue(m) || coucheDeDepart;
      if (clavier.getAttribute("data-couche") !== couche) appliquerCouche(clavier, couche, libelleCouche(couche));
    }

    function nomDeMorte(cle) {
      var glyphe = clavier.querySelector('.clavier__glyphe[data-cle="' + cle + '"]');
      return glyphe ? glyphe.getAttribute("data-nom") : "touche morte";
    }

    function inserer(texteAjoute) {
      champ.setRangeText(texteAjoute, champ.selectionStart, champ.selectionEnd, "end");
    }

    champ.addEventListener("focus", function () {
      /* La couche choisie dans les onglets au moment de l'essai, pas celle du
         chargement : sinon une frappe ramenait le dessin à la couche de
         départ, onglet laissé sur une autre (critique du 2026-10-01). */
      coucheDeDepart = clavier.getAttribute("data-couche");
      chargerDonneesEssai().catch(function () {
        sortie.textContent = "L’essai ne peut pas se charger. Le testeur reste disponible.";
      });
    });

    champ.addEventListener("keydown", function (evenement) {
      if (evenement.isComposing) return;
      var m = modificateurs(evenement);
      suivreCouche(m);
      var code = codePhysique(evenement);
      var position = CODE_POSITION[code];
      /* Effacement, flèches, Tab et raccourcis restent au navigateur. */
      if (!position || ((evenement.ctrlKey || evenement.metaKey) && !m.altgr)) return;
      evenement.preventDefault();
      allumer(position, true);
      allumees[code] = position;
      var natif = evenement.key && evenement.key.length === 1 ? evenement.key : null;

      chargerDonneesEssai().then(function (donnees) {
        var niveaux = donnees.keymap[code];
        if (!niveaux) return;
        var valeur = niveaux[rang(m)];
        if (valeur == null) valeur = niveaux[rang({ maj: m.maj, verr: false, altgr: m.altgr })];
        if (valeur == null) {
          sortie.textContent = "Cette combinaison ne donne aucun caractère.";
          return;
        }

        if (/^dk_/.test(valeur)) {
          if (morteEnAttente) {
            /* Deux touches mortes : la seconde vaut son accent d'espacement
               dans la table de la première (deux fois la même donne
               l'accent combinant). Sinon, les deux accents s'écrivent. */
            var tablePrecedente = donnees.deadkeys[morteEnAttente] || {};
            var accent = (donnees.deadkeys[valeur] || {})[" "];
            var combine = accent && tablePrecedente[accent];
            morteEnAttente = null;
            if (combine) {
              inserer(combine);
              sortie.textContent = "AZERTY Global écrit " + entreGuillemets(combine) + ".";
              return;
            }
            inserer((tablePrecedente[" "] || "") + (accent || ""));
            sortie.textContent = "Ces deux touches mortes ne se combinent pas : leurs accents s’écrivent seuls.";
            return;
          }
          morteEnAttente = valeur;
          sortie.textContent = nomDeMorte(valeur) + " : tapez maintenant une lettre.";
          return;
        }

        var produit = valeur;
        if (morteEnAttente) {
          var table = donnees.deadkeys[morteEnAttente] || {};
          produit = table[valeur] || (table[" "] || "") + valeur;
          morteEnAttente = null;
        }
        inserer(produit);
        if (natif && natif !== produit) {
          sortie.textContent = "AZERTY Global écrit " + entreGuillemets(produit) +
            " ; votre clavier actuel écrirait " + entreGuillemets(natif) + ".";
        } else {
          sortie.textContent = "AZERTY Global écrit " + entreGuillemets(produit) + ".";
        }
      }).catch(function () {
        sortie.textContent = "L’essai ne peut pas se charger. Le testeur reste disponible.";
      });
    });

    champ.addEventListener("keyup", function (evenement) {
      var code = codePhysique(evenement);
      if (allumees[code]) {
        allumer(allumees[code], false);
        delete allumees[code];
      }
      suivreCouche(modificateurs(evenement));
    });

    champ.addEventListener("blur", function () {
      Object.keys(allumees).forEach(function (code) { allumer(allumees[code], false); });
      allumees = {};
      morteEnAttente = null;
      appliquerCouche(clavier, coucheDeDepart, libelleCouche(coucheDeDepart));
    });
  }

  /* ——— Recherche d'un caractère (QCM d'Antoine du 2026-10-01) ———
     Un caractère collé ou un nom tapé : la liste donne la frappe recommandée,
     un choix allume la touche (ou la touche morte puis la lettre) sur le
     dessin. L'index est celui du testeur (tester/character-index.json, 1 130
     caractères), chargé au premier focus. */

  var indexCaracteres = null;

  function chargerIndex() {
    if (!indexCaracteres) {
      indexCaracteres = fetch("/tester/character-index.json").then(function (reponse) {
        if (!reponse.ok) throw new Error("index indisponible");
        return reponse.json();
      }).then(function (donnees) {
        return donnees.characters || {};
      });
    }
    return indexCaracteres;
  }

  function normaliser(chaine) {
    return chaine.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[’'\-_]/g, " ").replace(/\s+/g, " ").trim();
  }

  function enPhrase(nom) {
    return nom ? nom.charAt(0) + nom.slice(1).toLowerCase() : "";
  }

  /* Le glyphe d'un caractère dans la recherche et l'explorateur, comme la
     gravure (INVISIBLE, src/_data/clavier.js) : une marque combinante seule se
     pose sur ◌, comme sur les touches mortes, au lieu de se poser sur rien ;
     un caractère sans dessin (espaces, trait d'union conditionnel) va dans une
     case pointillée, et non sous ␣, qui est lui-même un caractère des tables
     (critique du 2026-10-02). Les codes sont écrits en nombres : aucun
     caractère invisible dans la source. */
  var PLAGES_MARQUES = [[0x0300, 0x036F], [0x1AB0, 0x1AFF], [0x1DC0, 0x1DFF], [0x20D0, 0x20FF], [0xFE20, 0xFE2F]];

  function sansDessin(caractere) {
    if (!caractere || caractere.length !== 1) return false;
    var code = caractere.charCodeAt(0);
    return caractere.trim() === "" || code === 0xAD || (code >= 0x200B && code <= 0x200F) ||
      (code >= 0x2060 && code <= 0x2064) || code === 0xFEFF;
  }

  function marqueSeule(caractere) {
    if (!caractere) return false;
    for (var i = 0; i < caractere.length; i++) {
      var code = caractere.charCodeAt(i);
      if (!PLAGES_MARQUES.some(function (plage) { return code >= plage[0] && code <= plage[1]; })) return false;
    }
    return true;
  }

  /* Noms français normalisés (ISO/IEC 10646) : dans l'explorateur, rien
     d'autre ne nomme ces caractères, et une case vide ne disait rien. */
  var NOMS_SANS_DESSIN = {
    0x20: "espace", 0xA0: "espace insécable", 0xAD: "trait d’union conditionnel",
    0x2002: "espace demi-cadratin", 0x2003: "espace cadratin", 0x2007: "espace tabulaire",
    0x2009: "espace fine", 0x200A: "espace ultrafine", 0x200B: "espace sans chasse",
    0x202F: "espace fine insécable"
  };

  /* `nomme` : la case porte le nom (explorateur). Dans la recherche le nom
     suit déjà, et la case reste muette. */
  function glyphe(classe, caractere, nomme) {
    if (sansDessin(caractere)) {
      if (!nomme) return caseVide(classe);
      return element("span", classe + " clavier-glyphe-vide",
        NOMS_SANS_DESSIN[caractere.charCodeAt(0)] || "caractère invisible");
    }
    return element("span", classe, marqueSeule(caractere) ? "◌" + caractere : caractere);
  }

  var MODIFICATEURS_COUCHE = {
    "Base": [], "Shift": ["Maj"], "Caps": ["Verr. Maj."], "Caps+Shift": ["Verr. Maj.", "Maj"],
    "AltGr": ["AltGr"], "Shift+AltGr": ["AltGr", "Maj"], "Caps+AltGr": ["Verr. Maj.", "AltGr"],
    "Caps+Shift+AltGr": ["Verr. Maj.", "AltGr", "Maj"]
  };

  var COUCHE_DE_LA_COUCHE = {
    "Base": "base", "Shift": "maj", "Caps": "verrmaj", "Caps+Shift": "base",
    "AltGr": "altgr", "Shift+AltGr": "majaltgr", "Caps+AltGr": "altgr", "Caps+Shift+AltGr": "majaltgr"
  };

  function toucheDuCode(clavier, code) {
    var position = CODE_POSITION[code];
    return position ? clavier.querySelector('.clavier__touche--car[data-position="' + position + '"]') : null;
  }

  /* Le nom d'une touche dans une frappe : celui du clavier physique, sauf le
     Verr. Maj. de la rangée des chiffres, qui garde la lettre (« Verr. Maj. + é »). */
  function morceauxDe(clavier, methode) {
    var touche = toucheDuCode(clavier, methode.key);
    if (!touche) return null;
    var nom = touche.getAttribute("data-nom-touche");
    if (/Caps/.test(methode.layer) && /^E(0[1-9]|10)$/.test(touche.getAttribute("data-position"))) {
      var base = touche.querySelector(".clavier__glyphe--base:not(.clavier__glyphe--avant)");
      if (base) nom = base.textContent;
    }
    return { touche: touche, morceaux: (MODIFICATEURS_COUCHE[methode.layer] || []).concat([nom]) };
  }

  function recommandee(entree) {
    var methodes = (entree && entree.methods) || [];
    for (var i = 0; i < methodes.length; i++) if (methodes[i].recommended) return methodes[i];
    return methodes[0] || null;
  }

  /* Une touche morte vaut une frappe de plus que n'importe quel modificateur ;
     une marque combinante seule, rarement cherchée pour elle-même, passe
     après tout le reste. */
  function effort(caractere, entree) {
    var methode = recommandee(entree);
    if (!methode) return 99;
    return (methode.type === "deadkey" ? 10 : 0) + (MODIFICATEURS_COUCHE[methode.layer] || []).length +
      (marqueSeule(caractere) ? 20 : 0);
  }

  /* À effort égal, l'alphabet de l'Europe de l'Ouest d'abord : á í ó ú
     (latin-1) avant ć ǵ (latin étendu). */
  function rangUnicode(caractere) {
    var code = caractere.charCodeAt(0);
    return code < 0x80 ? 0 : code < 0x100 ? 1 : code < 0x180 ? 2 : 3;
  }

  function codeDe(caractere) {
    var hexa = caractere.codePointAt(0).toString(16).toUpperCase();
    return "U+" + ("0000" + hexa).slice(-Math.max(4, hexa.length));
  }

  /* `nomGrave` : le nom affiché sur le dessin compte comme un nom. « - » ne
     s'appelle que « trait d'union-signe moins » dans l'index, et le « ‐ »
     typographique, seul à s'appeler « trait d'union », passait devant lui.
     Rend les 8 premiers et le nombre total de correspondances. */
  function chercher(index, requete, nomGrave) {
    var trouves = [];
    /* « ◌́ » collé tel que la liste l'affiche : ◌ n'est pas cherché. Une
       espace insécable collée seule se cherche aussi, avant que trim()
       ne l'efface. */
    var sansCercle = requete.split("◌").join("");
    var seul = Array.from(sansCercle);
    if (seul.length === 1 && index[seul[0]] && !sansCercle.trim()) return { liste: [seul[0]], total: 1 };
    var brute = sansCercle.trim().normalize("NFC");
    if (!brute) return { liste: trouves, total: 0 };
    var lettres = Array.from(brute);
    if (lettres.length === 1 && index[lettres[0]]) trouves.push(lettres[0]);
    var direct = trouves.length;
    var cherche = normaliser(brute);
    if (cherche.length < 2) return { liste: trouves, total: direct };
    var notes = [];
    Object.keys(index).forEach(function (caractere) {
      if (caractere.indexOf("dk:") === 0 || trouves.indexOf(caractere) !== -1) return;
      var entree = index[caractere];
      var meilleure = 0;
      var noms = [entree.unicodeNameFr || ""].concat(entree.frenchAliases || []);
      var grave = nomGrave && nomGrave(caractere);
      if (grave) noms.push(grave);
      /* Six espaces n'ont pas de nom français dans l'index : « espace fine »
         ou « cadratin » ne les trouvaient pas. */
      var invisible = sansDessin(caractere) && NOMS_SANS_DESSIN[caractere.charCodeAt(0)];
      if (invisible) noms.push(invisible);
      /* 3 : le nom exact ; 2 : un mot entier du nom, ou son pluriel ; 1 : un
         début de mot (« s pointu » faisait sortir ß pour « point »). */
      noms.forEach(function (nom) {
        var n = normaliser(nom);
        var mots = " " + n + " ";
        if (n === cherche) meilleure = 3;
        else if (mots.indexOf(" " + cherche + " ") !== -1 || mots.indexOf(" " + cherche + "s ") !== -1) {
          meilleure = Math.max(meilleure, 2);
        } else if (mots.indexOf(" " + cherche) !== -1) meilleure = Math.max(meilleure, 1);
      });
      if (meilleure) notes.push([meilleure, caractere, effort(caractere, entree), rangUnicode(caractere)]);
    });
    /* La note d'abord, puis le plus simple à taper. Pour « point », le point
       souscrit combinant et le point d'interrogation grec passaient devant
       « ! », « ? » et « : » (critiques des 2026-10-01 et 2026-10-02). */
    notes.sort(function (a, b) {
      return b[0] - a[0] || a[2] - b[2] || a[3] - b[3] || a[1].localeCompare(b[1]);
    });
    notes.slice(0, 8 - trouves.length).forEach(function (note) { trouves.push(note[1]); });
    return { liste: trouves, total: direct + notes.length };
  }

  function monterRecherche(bloc) {
    var clavier = document.getElementById(bloc.getAttribute("data-clavier-recherche"));
    var champ = bloc.querySelector(".clavier-recherche__champ");
    var etat = bloc.querySelector(".clavier-recherche__etat");
    var liste = bloc.querySelector(".clavier-recherche__resultats");
    if (!clavier || !champ || !liste) return;
    bloc.hidden = false;

    /* La couche à rendre quand la liste change ou se vide : celle que le
       visiteur a choisie par un onglet, sinon celle du montage. Lue une fois
       au montage, elle effaçait le choix de l'onglet (critique du
       2026-10-02). */
    var coucheInitiale = clavier.getAttribute("data-couche");
    function coucheDeDepart() {
      return clavier.coucheChoisie || coucheInitiale;
    }

    /* Le nom gravé sur le dessin (celui de l'infobulle), relevé une fois. */
    var nomsGraves = null;
    function nomGrave(caractere) {
      if (!nomsGraves) {
        nomsGraves = {};
        Array.prototype.forEach.call(clavier.querySelectorAll(".clavier__glyphe[data-nom]"), function (g) {
          if (!(g.textContent in nomsGraves)) nomsGraves[g.textContent] = g.getAttribute("data-nom");
        });
      }
      return nomsGraves[caractere] || null;
    }

    /* Les noms de l'index portent l'apostrophe droite (« Trait d'union ») :
       le site écrit l'apostrophe typographique. */
    function nomAffiche(caractere, entree) {
      var grave = nomGrave(caractere);
      if (grave) return grave;
      var invisible = sansDessin(caractere) && NOMS_SANS_DESSIN[caractere.charCodeAt(0)];
      if (invisible) return invisible.charAt(0).toUpperCase() + invisible.slice(1);
      var nom = entree.unicodeNameFr || "";
      /* Sans nom français dans l'index, le nom est le code : il garde ses
         capitales (« U+1dc6 » s'affichait). */
      if (nom.indexOf("U+") === 0) return "Caractère " + nom;
      return enPhrase(nom).split("'").join("’");
    }

    /* La frappe en touches dessinées, et les touches à allumer. */
    function frappeDe(index, entree) {
      var methode = recommandee(entree);
      if (!methode) return null;
      var fin = morceauxDe(clavier, methode);
      if (!fin) return null;
      if (methode.type !== "deadkey") {
        /* Un accès direct se dit « Accès direct », comme dans l'infobulle,
           et non par le nom de sa touche (« é : 2 » se lisait comme une
           frappe de 2). */
        if (methode.layer === "Base") fin = { touche: fin.touche, morceaux: [] };
        return { etapes: [fin], couche: COUCHE_DE_LA_COUCHE[methode.layer] || "base" };
      }
      var morte = recommandee(index["dk:" + methode.deadkey.replace(/^dk_/, "")]);
      var debut = morte && morceauxDe(clavier, morte);
      if (!debut) return null;
      return { etapes: [debut, fin], couche: "synthese" };
    }

    function montrer(index, caractere, bouton) {
      var frappe = frappeDe(index, index[caractere]);
      if (!frappe) return;
      Array.prototype.forEach.call(liste.querySelectorAll("[aria-pressed]"), function (b) {
        b.setAttribute("aria-pressed", b === bouton ? "true" : "false");
      });
      appliquerCouche(clavier, frappe.couche, libelleCouche(frappe.couche));
      surligner(clavier, frappe.etapes.map(function (e) { return e.touche.getAttribute("data-position"); }), null);
      /* La touche à presser en premier reste dans le cadre : pour σ, la touche
         morte « * » sortait à droite, S restait seul visible. */
      montrerTouchesChangees(clavier, true, frappe.etapes[0].touche);
      /* Dans le plein écran, la liste peut pousser le dessin hors champ : le
         clavier revient à l'écran, sans faire défiler la page hors du dialog. */
      var cadre = clavier.closest(".clavier-defilement");
      if (cadre && clavier.closest("dialog") && cadre.getBoundingClientRect().top < 0) {
        cadre.scrollIntoView({ block: "start" });
      }
    }

    function afficher(index) {
      var requete = champ.value;
      liste.textContent = "";
      /* Une nouvelle liste éteint la touche du choix précédent. */
      surligner(clavier, null);
      appliquerCouche(clavier, coucheDeDepart(), libelleCouche(coucheDeDepart()));
      var seul = Array.from(requete);
      if (!requete.trim() && !(seul.length === 1 && index[seul[0]])) {
        etat.textContent = "";
        return;
      }
      var resultat = chercher(index, requete, nomGrave);
      var trouves = resultat.liste.filter(function (caractere) { return frappeDe(index, index[caractere]); });
      /* Deux résultats du même nom (« - » et « ‐ », tous deux « Trait
         d’union ») : celui qui n'est pas gravé sur le dessin porte son code. */
      var noms = trouves.map(function (caractere) { return nomAffiche(caractere, index[caractere]); });
      var nombres = {};
      noms.forEach(function (nom) { nombres[nom] = (nombres[nom] || 0) + 1; });
      /* Le compte dit vrai : « 8 caractères trouvés » s'affichait pour
         99 correspondances (critique du 2026-10-02). */
      var total = Math.max(resultat.total, trouves.length);
      etat.textContent = !trouves.length
        ? "Aucun caractère ne correspond. Essayez un autre nom, ou collez le caractère."
        : total > trouves.length
          ? total + " caractères correspondent, voici les " + trouves.length + " premiers. Précisez le nom pour affiner."
          : trouves.length + (trouves.length > 1 ? " caractères trouvés." : " caractère trouvé.");
      trouves.forEach(function (caractere, rang) {
        var entree = index[caractere];
        var frappe = frappeDe(index, entree);
        var nom = noms[rang] + (nombres[noms[rang]] > 1 && !nomGrave(caractere) ? " (" + codeDe(caractere) + ")" : "");
        var item = element("li", "clavier-recherche__resultat");
        var bouton = element("button", "clavier-recherche__choix");
        bouton.type = "button";
        bouton.setAttribute("aria-pressed", "false");
        bouton.appendChild(glyphe("clavier-recherche__glyphe", caractere, false));
        var corps = element("span", "clavier-recherche__corps");
        corps.appendChild(element("span", "clavier-recherche__nom", nom));
        var ligne = element("span", "clavier-recherche__frappe");
        frappe.etapes.forEach(function (etape, rang) {
          if (rang) texte(ligne, ", puis ");
          frappeDans(ligne, etape.morceaux.join("|"));
        });
        corps.appendChild(ligne);
        bouton.appendChild(corps);
        bouton.addEventListener("click", function () { montrer(index, caractere, bouton); });
        item.appendChild(bouton);
        liste.appendChild(item);
      });
      var premier = liste.querySelector(".clavier-recherche__choix");
      if (premier && trouves.length === 1) premier.click();
    }

    champ.addEventListener("focus", function () {
      chargerIndex().catch(function () {
        etat.textContent = "La recherche ne peut pas se charger.";
      });
    });
    champ.addEventListener("input", function () {
      chargerIndex().then(afficher).catch(function () {
        etat.textContent = "La recherche ne peut pas se charger.";
      });
    });
  }

  /* ——— Avant / après : la même touche sous l'AZERTY traditionnel ——— */

  /* Deux onglets, « AZERTY Global » et « AZERTY traditionnel », au lieu d'un
     bouton dont seul aria-pressed changeait : l'état se lit, et les touches
     qui changent restent cerclées dans les deux vues (critique du
     2026-10-01). */
  Array.prototype.forEach.call(document.querySelectorAll("[data-clavier-disposition]"), function (liste) {
    var clavier = document.getElementById(liste.getAttribute("data-clavier-disposition"));
    var onglets = Array.prototype.slice.call(liste.querySelectorAll("[data-disposition-cible]"));
    if (!clavier || !onglets.length) return;

    function activer(disposition, prendreLeFocus) {
      onglets.forEach(function (onglet) {
        var actif = onglet.getAttribute("data-disposition-cible") === disposition;
        onglet.setAttribute("aria-selected", actif ? "true" : "false");
        onglet.tabIndex = actif ? 0 : -1;
        if (actif && prendreLeFocus) onglet.focus();
      });
      fermer();
      clavier.setAttribute("data-disposition", disposition);
      clavier.setAttribute(
        "aria-label",
        disposition === "traditionnel"
          ? "Le même clavier gravé en AZERTY traditionnel. Les touches cerclées changent avec AZERTY Global."
          : "Clavier AZERTY Global. Les touches cerclées changent par rapport à l’AZERTY traditionnel."
      );
    }

    onglets.forEach(function (onglet, rang) {
      onglet.addEventListener("click", function () {
        activer(onglet.getAttribute("data-disposition-cible"), false);
      });
      onglet.addEventListener("keydown", function (evenement) {
        var pas = evenement.key === "ArrowRight" ? 1 : evenement.key === "ArrowLeft" ? -1 : 0;
        if (!pas) return;
        evenement.preventDefault();
        var cible = onglets[(rang + pas + onglets.length) % onglets.length];
        activer(cible.getAttribute("data-disposition-cible"), true);
      });
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll(".clavier-plein"), monterPleinEcran);
  Array.prototype.forEach.call(document.querySelectorAll("[data-parcours]"), monterParcours);
  Array.prototype.forEach.call(document.querySelectorAll("[data-clavier-onglets]"), monterOngletsEnPage);
  Array.prototype.forEach.call(document.querySelectorAll(".clavier"), rendreInteractif);
  Array.prototype.forEach.call(document.querySelectorAll("[data-clavier-essai]"), monterEssai);
  Array.prototype.forEach.call(document.querySelectorAll("[data-clavier-recherche]"), monterRecherche);

  /* Après rendreInteractif : le cadre suit la largeur (rotation, plein écran
     ouvert, fenêtre redimensionnée). */
  Array.prototype.forEach.call(document.querySelectorAll(".clavier-defilement"), function (cadre) {
    reglerDefilement(cadre);
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(function () { reglerDefilement(cadre); }).observe(cadre);
    }
  });

  /* Un clavier dessiné hors parcours dans l'état d'une étape (héros de /dev,
     QCM 2026-09-29) se cale lui aussi sur ses touches surlignées en mobile. */
  Array.prototype.forEach.call(document.querySelectorAll(".clavier"), function (clavier) {
    if (!clavier.closest("[data-parcours]")) montrerTouchesChangees(clavier);
  });
})();
