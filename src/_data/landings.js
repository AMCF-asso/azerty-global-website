/* Les 11 pages caractère du site (/e-aigu-majuscule, /a-grave-majuscule, …) :
   une seule source de contenu, rendue par le gabarit v2 src/landings.njk.

   Historique. Jusqu'au 2026-09-03 seule /e-aigu-majuscule vivait ici ; les dix
   autres étaient des .njk complets de 328 à 421 lignes (src/pages/). P1 les a
   factorisées ici (décision d'Antoine du 2026-09-03 : une source, qui nourrira
   aussi /astuces en P4). Le texte rendu a été prouvé identique à la v1, hors
   écarts voulus listés dans le handoff de la session.

   Schéma d'une page :
   - slug, title, description, canonicalPath, ogType, ogDescription : métadonnées,
     lues par le layout v2 via eleventyComputed dans src/landings.njk.
   - nomTitre : le caractère tel qu'il s'écrit dans un titre (« È majuscule »,
     « les guillemets « » »), pour les H2 en question du lot A2 du plan GEO v2
     (QCM d'Antoine du 2026-10-14).
   - testeur { module, lecon } : leçon du testeur que la v1 ouvrait depuis la page
     (data-module / data-lesson de lazy-tester.js). Sans effet en v2 tant que
     /testeur n'existe pas (P14) ; conservé pour ne pas perdre l'appariement.
   - caractere { glyphe, ariaLabel, bulle } : le bouton carré « glyphe
     Copier » du héros et, dans bulle { copie, pronom, raccourci }, la bulle qui
     s'ouvre après une copie (src/_includes/v2/pastille-copie.njk). Le raccourci
     reprend l'intro et les équations de la page.
   - heros { titre, intro } : HTML inline (strong, kbd, et le lien vers
     /download des 4 intros qui nomment AZERTY Global, emplacement « intro »,
     QCM du 2026-10-10) — jamais de bloc.
   - methodes[3] { systeme, raccourcis[], note } : Windows, macOS, Linux, une
     ou deux combinaisons chacune et une note courte (tableau comparatif du
     lot A5 GEO v2). L'entrée de /e-aigu-majuscule garde l'ancienne forme
     (note, noteCourte) : sa page a son propre tableau.
   - solution { titre, plateformes, noteSystemes, equations[] { touches,
     resultat }, note } : noteSystemes est la note de la ligne AZERTY Global
     du tableau comparatif.
   - pourquoi { titre, cartes[] { titre, texte } } : 2 à 4 cartes d'argument.
   - questions { titre, liste[] { question, reponse } } : facultatif (œ, guillemets).
   - suite { titre, sousTitre, cartes[] { titre, texte } } : les autres apports
     d'AZERTY Global (« Et ce n'est pas tout » jusqu'au lot A2).
   - voirAussi { liens[] { href, libelle }, guideTypographique } : maillage entre
     les 11 pages (13 à 21 liens entrants par page : à conserver).
   - partage : URL de partage sur X.
   - jsonLd[] : objets (FAQPage, HowTo, BreadcrumbList, WebSite), sérialisés en
     sortie de ce module. FAQPage est conservé ici mais filtré à la
     sérialisation (D42, voir en bas du module).
   - essai : textes du mini-essai, ajoutés en bas du module (table ESSAIS) ;
     les gestes et la sortie de l'AZERTY traditionnel sont calculés et
     vérifiés au build par src/_data/miniEssai.js.

   Les chaînes HTML gardent leurs entités (&nbsp;) et leurs espaces insécables
   littéraux : ce sont du texte rendu. ⛔ Aucune icône, aucun emoji : la v2 n'en
   porte pas (DA §1). */

const pages = [
  {
    slug: "e-aigu-majuscule",
    nomTitre: "É majuscule",
    title: "É majuscule : comment le taper au clavier – AZERTY Global",
    description: "Copiez É en un clic ou tapez-le enfin au clavier : Verr. Maj. + é avec AZERTY Global, gratuit, Alt 144 sinon. Windows, macOS et Linux.",
    canonicalPath: "/e-aigu-majuscule",
    ogType: "article",
    testeur: {
      module: 1,
      lecon: 0,
    },
    caractere: {
      glyphe: "É",
      ariaLabel: "Copier É dans le presse-papier",
      bulle: {
        copie: "É copié",
        pronom: "le",
        raccourci: "<span class=\"insecable\">Verr. Maj. + <kbd>é</kbd></span>",
      },
    },
    heros: {
      titre: "Comment taper É majuscule au clavier&#8239;?",
      intro: "Tapez <strong>É majuscule</strong> avec <strong>Verr. Maj. + é</strong> sur Windows, macOS et Linux. Une solution simple, sans code Alt, sans pavé numérique et sans copier-coller.",
      definition: "<strong>É majuscule</strong>, c’est le é en capitale, que l’on garde sur les majuscules comme dans «&nbsp;ÉCOLE&nbsp;» ou «&nbsp;État&nbsp;», car «&nbsp;en français, l’accent a pleine valeur orthographique&nbsp;» (<a href=\"https://www.academie-francaise.fr/questions-de-langue#5_strong-em-accentuation-des-majuscules-em-strong\">Académie française, «&nbsp;Accentuation des majuscules&nbsp;»</a>).",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>Alt</kbd> + <kbd>144</kbd>",
        ],
        note: "Fonctionne uniquement avec le pavé numérique.",
        noteCourte: "pavé numérique requis",
      },
      {
        systeme: "Mac",
        raccourcis: [
          "<kbd>Verr. Maj.</kbd> + <kbd>é</kbd> → É",
        ],
        note: "Déjà natif sur la disposition Apple «&nbsp;Français&nbsp;». Autre voie&nbsp;: maintenir <kbd>Maj</kbd> + <kbd>E</kbd>, puis choisir É dans le menu.",
        noteCourte: "déjà natif",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>é</kbd>",
        ],
        note: "Disposition Français (variante). Pas très intuitif.",
        noteCourte: "peu intuitif",
      },
    ],
    solution: {
      titre: "Comment taper É majuscule avec AZERTY Global ?",
      plateformes: "Windows, macOS, Linux",
      equations: [
        {
          touches: "<kbd>Verr. Maj.</kbd> + <kbd>é</kbd>",
          resultat: "É",
        },
      ],
      note: "Et aussi è → È, ç → Ç, à → À. 99&nbsp;% des frappes inchangées, sur les fréquences du corpus AFNOR (texte à moitié formel, à moitié informel, <a href=\"/comparatif#methode-comparatif\">méthode</a>).",
    },
    pourquoi: {
      titre: "Quelles limites ont les autres méthodes ?",
      cartes: [
        {
          titre: "Alt Codes",
          texte: "Devoir retenir Alt + 144 pour un É&#8239;? C’est de l’informatique des années 80. De plus, sur les PC portables <strong>sans pavé numérique</strong>, c’est tout simplement <strong>impossible</strong>.",
        },
        {
          titre: "Copier-Coller",
          texte: "Ouvrir Google, rechercher «&nbsp;é&nbsp;majuscule&nbsp;», copier, revenir, coller. Vous perdez 15 secondes à chaque fois.",
        },
        {
          titre: "Raccourcis Word",
          texte: "<kbd>Ctrl</kbd> + <kbd>4</kbd> puis <kbd>Maj</kbd> + <kbd>E</kbd>... Sérieusement&#8239;? Et dès que vous sortez de Word pour aller sur Facebook ou sur un navigateur web, ça ne marche plus.",
        },
        {
          titre: "Correcteur automatique",
          texte: "Le correcteur est pratique mais aléatoire. Dans un formulaire web ou pour un mot de passe, vous êtes bloqué.",
        },
      ],
    },
    suite: {
      titre: "Qu’apporte d’autre AZERTY Global ?",
      sousTitre: "Le É majuscule n’est que la partie émergée de l’iceberg de ce que propose AZERTY Global.",
      cartes: [
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point&nbsp;: il est en accès direct, comme partout ailleurs. L’AZERTY français et l’AZERTY belge sont les seuls claviers au monde où le point demande Majuscule.",
        },
        {
          titre: "@robase direct",
          texte: "Fini le <kbd>AltGr</kbd> + <kbd>0</kbd>. L’arobase est sur une touche dédiée à gauche de la touche <kbd>1</kbd>. Idéal pour les e-mails.",
        },
        {
          titre: "Symboles Dev",
          texte: "<kbd>{</kbd> <kbd>}</kbd> <kbd>[</kbd> <kbd>]</kbd> <kbd>|</kbd> <kbd>\\</kbd> sont tous sur la rangée de repos avec <kbd>AltGr</kbd>. Un bonheur pour coder.",
        },
        {
          titre: "International",
          texte: "Espagnol (ñ ¡ ¿), Allemand (ß), Polonais (ł&nbsp;ę&nbsp;ż)... tout est inclus sans changer de clavier.",
        },
      ],
    },
    voirAussi: {
      liens: [
        {
          href: "/e-grave-majuscule",
          libelle: "È majuscule",
        },
        {
          href: "/c-cedille-majuscule",
          libelle: "Ç majuscule",
        },
        {
          href: "/a-grave-majuscule",
          libelle: "À majuscule",
        },
        {
          href: "/e-dans-l-o",
          libelle: "œ Œ (e dans l’o)",
        },
        {
          href: "/e-dans-l-a",
          libelle: "æ Æ (e dans l’a)",
        },
        {
          href: "/guillemets",
          libelle: "« » (guillemets français)",
        },
        {
          href: "/arobase",
          libelle: "Arobase @",
        },
        {
          href: "/crochets",
          libelle: "Crochets [ ]",
        },
        {
          href: "/accolades",
          libelle: "Accolades { }",
        },
        {
          href: "/tiret-cadratin",
          libelle: "Tirets – —",
        },
      ],
      guideTypographique: true,
    },
    partage: "https://twitter.com/intent/tweet?text=J%27ai%20enfin%20trouv%C3%A9%20comment%20taper%20un%20%C3%89%20majuscule%20facilement%20gr%C3%A2ce%20%C3%A0%20%40AZERTY_Global%20%21%20Testez%20en%20ligne%2C%20c%27est%20gratuit%20%F0%9F%91%89%20azerty.global%2Fe-aigu-majuscule",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Comment faire un É majuscule sur Windows ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Maintenez la touche Alt enfoncée, tapez 144 sur le pavé numérique, puis relâchez Alt. Sans pavé numérique, utilisez le clavier tactile Windows (maintenir e → choisir É). Avec AZERTY Global (gratuit) : Verr. Maj. + é = É."
            }
          },
          {
            "@type": "Question",
            "name": "Comment faire un É majuscule sur Mac ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Maintenez la touche e enfoncée pendant une seconde, puis choisissez É dans le menu qui apparaît (ou appuyez sur 2). Avec AZERTY Global, disponible aussi sur Mac : Verr. Maj. + é → É, directement."
            }
          },
          {
            "@type": "Question",
            "name": "Comment faire un É majuscule sur Linux ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sous Linux, avec la disposition « Français (variante) », appuyez sur AltGr + Maj + é pour obtenir É. Avec AZERTY Global, c’est plus simple : Verr. Maj. + é = É."
            }
          },
          {
            "@type": "Question",
            "name": "Faut-il mettre les accents sur les majuscules en français ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Oui. L'Académie française est catégorique : l'accent a pleine valeur orthographique et doit être conservé sur les majuscules. Écrire ECOLE au lieu de ÉCOLE est une faute."
            }
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "Comment taper É majuscule facilement",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Télécharger AZERTY Global",
            "text": "Installez gratuitement la disposition AZERTY Global pour Windows, macOS ou Linux.",
            "url": "https://azerty.global/download"
          },
          {
            "@type": "HowToStep",
            "name": "Activer le Verrouillage Majuscule",
            "text": "Appuyez sur la touche Verrouillage Majuscule (Cadenas) de votre clavier."
          },
          {
            "@type": "HowToStep",
            "name": "Appuyer sur é",
            "text": "Appuyez simplement sur la touche 'é'. Vous obtenez instantanément un É majuscule."
          }
        ],
        "totalTime": "PT3M",
        "tool": {
          "@type": "HowToTool",
          "name": "Clavier AZERTY Global"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Accueil",
            "item": "https://azerty.global/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "É majuscule",
            "item": "https://azerty.global/e-aigu-majuscule"
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "AZERTY Global",
        "alternateName": "AZERTY Global 2026",
        "url": "https://azerty.global",
        "inLanguage": "fr",
        "publisher": {
          "@type": "Organization",
          "name": "Association pour la Modernisation du Clavier Français",
          "alternateName": "AMCF",
          "logo": {
            "@type": "ImageObject",
            "url": "https://azerty.global/assets/favicon-azerty-global.png"
          }
        }
      },
    ],
  },
  {
    slug: "e-grave-majuscule",
    nomTitre: "È majuscule",
    title: "È majuscule : comment le taper au clavier – AZERTY Global",
    description: "Copiez È en un clic ou tapez-le enfin au clavier : Verr. Maj. + è avec AZERTY Global, gratuit, Alt 0200 sinon. Windows, macOS et Linux.",
    canonicalPath: "/e-grave-majuscule",
    ogType: "article",
    testeur: {
      module: 1,
      lecon: 1,
    },
    caractere: {
      glyphe: "È",
      ariaLabel: "Copier È dans le presse-papier",
      bulle: {
        copie: "È copié",
        pronom: "le",
        raccourci: "<span class=\"insecable\">Verr. Maj. + <kbd>è</kbd></span>",
      },
    },
    heros: {
      titre: "Comment taper È majuscule au clavier ?",
      intro: "Sur l’AZERTY traditionnel de Windows, <strong>È majuscule</strong> demande le code <strong>Alt + 0200</strong> et un pavé numérique. Avec <a href=\"/download\" data-mesure-emplacement=\"intro\">AZERTY Global</a>, une disposition de clavier gratuite à installer sur Windows, macOS et Linux, tapez <strong>Verr. Maj. + è</strong>.",
      definition: "<strong>È majuscule</strong>, c’est le è en capitale, que l’on garde sur les majuscules comme dans «&nbsp;Ève&nbsp;» ou «&nbsp;TRÈS&nbsp;», car «&nbsp;en français, l’accent a pleine valeur orthographique&nbsp;» (<a href=\"https://www.academie-francaise.fr/questions-de-langue#5_strong-em-accentuation-des-majuscules-em-strong\">Académie française, «&nbsp;Accentuation des majuscules&nbsp;»</a>).",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>Alt</kbd> + <kbd>0200</kbd>",
        ],
        note: "avec pavé numérique",
      },
      {
        systeme: "macOS",
        raccourcis: [
          "<kbd>Verr. Maj.</kbd> + <kbd>è</kbd>",
        ],
        note: "prévu par Apple",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>è</kbd>",
        ],
        note: "disposition Français (variante)",
      },
    ],
    solution: {
      titre: "Comment taper È majuscule avec AZERTY Global ?",
      plateformes: "Windows, macOS, Linux",
      noteSystemes: "Windows, macOS et Linux",
      equations: [
        {
          touches: "<kbd>Verr. Maj.</kbd> + <kbd>è</kbd>",
          resultat: "È",
        },
      ],
      note: "Et aussi é → É, ç → Ç, à → À. 99&nbsp;% des frappes inchangées, sur les fréquences du corpus AFNOR (texte à moitié formel, à moitié informel, <a href=\"/comparatif#methode-comparatif\">méthode</a>).",
    },
    pourquoi: {
      titre: "Quelles limites ont les autres méthodes ?",
      cartes: [
        {
          titre: "Alt Codes",
          texte: "Devoir retenir Alt + 0200 pour un È ? C’est de l’informatique des années 80. De plus, sur les PC portables <strong>sans pavé numérique</strong>, c’est tout simplement <strong>impossible</strong>.",
        },
        {
          titre: "Copier-Coller",
          texte: "Ouvrir Google, rechercher « è majuscule », copier, revenir, coller. Vous perdez 15 secondes à chaque fois.",
        },
        {
          titre: "Touche morte système",
          texte: "<kbd>AltGr</kbd> + <kbd>7</kbd> puis <kbd>Maj</kbd> + <kbd>E</kbd>... Ça fonctionne, mais un tel raccourci est absurde pour une lettre aussi courante que le È.",
        },
        {
          titre: "Correcteur automatique",
          texte: "Le correcteur est pratique mais aléatoire. Dans un formulaire web ou pour un mot de passe, vous êtes bloqué.",
        },
      ],
    },
    questions: {
      titre: "Questions fréquentes sur È majuscule",
      liste: [
        {
          question: "Quel est le code Alt du È majuscule&#8239;?",
          reponse: "Sur Windows, maintenez <kbd>Alt</kbd>, tapez <kbd>0200</kbd> sur le pavé numérique, puis relâchez <kbd>Alt</kbd>&nbsp;: È s’affiche. Ce code demande un pavé numérique avec Verr. Num. activé&nbsp;; la rangée des chiffres du haut ne convient pas. Avec AZERTY Global, È se tape sans code&nbsp;: <span class=\"insecable\"><kbd>Verr. Maj.</kbd> + <kbd>è</kbd></span>.",
        },
        {
          question: "Comment faire È majuscule sans pavé numérique&#8239;?",
          reponse: "Sur l’AZERTY traditionnel de Windows, tapez <kbd>AltGr</kbd> + <kbd>7</kbd>, relâchez, puis tapez <kbd>Maj</kbd> + <kbd>E</kbd>&nbsp;: È s’affiche. <kbd>AltGr</kbd> + <kbd>7</kbd> est la touche morte de l’accent grave, qui se pose sur la lettre tapée ensuite. Ce geste en deux temps marche sans pavé numérique. Avec <a href=\"/download\">AZERTY Global</a>, disposition gratuite pour Windows, macOS et Linux, tapez <span class=\"insecable\"><kbd>Verr. Maj.</kbd> + <kbd>è</kbd></span> sur votre clavier AZERTY actuel, portable compris.",
        },
        {
          question: "Comment faire È majuscule sur Mac&#8239;?",
          reponse: "Sur la disposition Apple «&nbsp;Français&nbsp;», activez <kbd>Verr. Maj.</kbd> puis tapez <kbd>è</kbd>&nbsp;: È s’affiche. Autre voie&nbsp;: maintenez <kbd>Maj</kbd> + <kbd>E</kbd>, puis choisissez È dans le menu qui apparaît. AZERTY Global garde le même geste sur Mac, Windows et Linux&nbsp;: <span class=\"insecable\"><kbd>Verr. Maj.</kbd> + <kbd>è</kbd></span>.",
        },
        {
          question: "Pourquoi Verr. Maj. + è donne 7 sous Windows&#8239;?",
          reponse: "Sur l’AZERTY traditionnel de Windows, Verr. Maj. agit comme Maj sur la rangée des chiffres. La touche <kbd>è</kbd> porte aussi le <kbd>7</kbd>, qui sort à la place de È. Sur Mac (disposition Apple «&nbsp;Français&nbsp;») et avec AZERTY Global, <span class=\"insecable\"><kbd>Verr. Maj.</kbd> + <kbd>è</kbd></span> écrit È.",
        },
        {
          question: "Faut-il mettre l’accent sur È majuscule&#8239;?",
          reponse: "Oui. L’Académie française rappelle que l’accent a pleine valeur orthographique sur les capitales. On écrit donc «&nbsp;Ève&nbsp;», «&nbsp;TRÈS&nbsp;» et «&nbsp;PÈRE&nbsp;», avec È (<a href=\"https://www.academie-francaise.fr/questions-de-langue#5_strong-em-accentuation-des-majuscules-em-strong\">Académie française, «&nbsp;Accentuation des majuscules&nbsp;»</a>).",
        },
      ],
    },
    suite: {
      titre: "Qu’apporte d’autre AZERTY Global ?",
      sousTitre: "Le È majuscule n’est que la partie émergée de l’iceberg de ce que propose AZERTY Global.",
      cartes: [
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point&nbsp;: il est en accès direct, comme partout ailleurs. L’AZERTY français et l’AZERTY belge sont les seuls claviers au monde où le point demande Majuscule.",
        },
        {
          titre: "@robase direct",
          texte: "Fini le <kbd>AltGr</kbd> + <kbd>0</kbd>. L’arobase est sur une touche dédiée à gauche de la touche <kbd>1</kbd>. Idéal pour les e-mails.",
        },
        {
          titre: "Symboles Dev",
          texte: "<kbd>{</kbd> <kbd>}</kbd> <kbd>[</kbd> <kbd>]</kbd> <kbd>|</kbd> <kbd>\\</kbd> sont tous sur la rangée de repos avec <kbd>AltGr</kbd>. Un bonheur pour coder.",
        },
        {
          titre: "International",
          texte: "Espagnol (ñ ¡ ¿), Allemand (ß), Polonais (ł ę ż)... tout est inclus sans changer de clavier.",
        },
      ],
    },
    voirAussi: {
      liens: [
        {
          href: "/e-aigu-majuscule",
          libelle: "É majuscule",
        },
        {
          href: "/c-cedille-majuscule",
          libelle: "Ç majuscule",
        },
        {
          href: "/a-grave-majuscule",
          libelle: "À majuscule",
        },
        {
          href: "/e-dans-l-o",
          libelle: "œ Œ (e dans l’o)",
        },
        {
          href: "/e-dans-l-a",
          libelle: "æ Æ (e dans l’a)",
        },
        {
          href: "/guillemets",
          libelle: "« » (guillemets français)",
        },
        {
          href: "/arobase",
          libelle: "Arobase @",
        },
        {
          href: "/crochets",
          libelle: "Crochets [ ]",
        },
        {
          href: "/accolades",
          libelle: "Accolades { }",
        },
        {
          href: "/tiret-cadratin",
          libelle: "Tirets – —",
        },
      ],
      guideTypographique: false,
    },
    partage: "https://twitter.com/intent/tweet?text=J%E2%80%99ai%20enfin%20trouv%C3%A9%20comment%20taper%20un%20%C3%88%20majuscule%20facilement%20gr%C3%A2ce%20%C3%A0%20%40AZERTY_Global%20%21%20Testez%20en%20ligne%2C%20c%E2%80%99est%20gratuit%20%F0%9F%91%89%20azerty.global%2Fe-grave-majuscule",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Comment faire un È majuscule sur Windows ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Maintenez la touche Alt enfoncée, tapez 0200 sur le pavé numérique, puis relâchez Alt. Sans pavé numérique, il n’existe pas de solution simple. Avec AZERTY Global : Verr. Maj. + è = È."
            }
          },
          {
            "@type": "Question",
            "name": "Comment faire un È majuscule sur Mac ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Maintenez la touche è enfoncée pendant une seconde, puis choisissez È dans le menu qui apparaît. Avec AZERTY Global, disponible aussi sur Mac : Verr. Maj. + è → È, directement."
            }
          },
          {
            "@type": "Question",
            "name": "Comment faire un È majuscule sur Linux ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sous Linux, avec la disposition « Français (variante) », appuyez sur AltGr + Maj + è pour obtenir È. Avec AZERTY Global, c’est plus simple : Verr. Maj. + è = È."
            }
          },
          {
            "@type": "Question",
            "name": "Faut-il mettre les accents sur les majuscules en français ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Oui. L’accent ou la cédille a pleine valeur orthographique et doit être conservé sur les majuscules en français."
            }
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "Comment taper È majuscule facilement",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Télécharger AZERTY Global",
            "text": "Installez gratuitement la disposition AZERTY Global pour Windows, macOS ou Linux.",
            "url": "https://azerty.global/download"
          },
          {
            "@type": "HowToStep",
            "name": "Activer le Verrouillage Majuscule",
            "text": "Appuyez sur la touche Verrouillage Majuscule de votre clavier."
          },
          {
            "@type": "HowToStep",
            "name": "Appuyer sur è",
            "text": "Appuyez simplement sur la touche è. Vous obtenez instantanément un È majuscule."
          }
        ],
        "totalTime": "PT3M",
        "tool": {
          "@type": "HowToTool",
          "name": "Clavier AZERTY Global"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Accueil",
            "item": "https://azerty.global/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "È majuscule",
            "item": "https://azerty.global/e-grave-majuscule"
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "AZERTY Global",
        "alternateName": "AZERTY Global 2026",
        "url": "https://azerty.global",
        "inLanguage": "fr",
        "publisher": {
          "@type": "Organization",
          "name": "Association pour la Modernisation du Clavier Français",
          "alternateName": "AMCF",
          "logo": {
            "@type": "ImageObject",
            "url": "https://azerty.global/assets/favicon-azerty-global.png"
          }
        }
      },
    ],
  },
  {
    slug: "c-cedille-majuscule",
    nomTitre: "Ç majuscule",
    title: "Ç majuscule : comment le taper au clavier – AZERTY Global",
    description: "Copiez Ç en un clic ou tapez-le enfin au clavier : Verr. Maj. + ç avec AZERTY Global, gratuit, Alt 128 sinon. Windows, macOS et Linux.",
    canonicalPath: "/c-cedille-majuscule",
    ogType: "article",
    testeur: {
      module: 1,
      lecon: 2,
    },
    caractere: {
      glyphe: "Ç",
      ariaLabel: "Copier Ç dans le presse-papier",
      bulle: {
        copie: "Ç copié",
        pronom: "le",
        raccourci: "<span class=\"insecable\">Verr. Maj. + <kbd>ç</kbd></span>",
      },
    },
    heros: {
      titre: "Comment taper Ç majuscule au clavier ?",
      intro: "Sur l’AZERTY traditionnel de Windows, <strong>Ç majuscule</strong> demande le code <strong>Alt + 128</strong> et un pavé numérique. Avec <a href=\"/download\" data-mesure-emplacement=\"intro\">AZERTY Global</a>, une disposition de clavier gratuite à installer sur Windows, macOS et Linux, tapez <strong>Verr. Maj. + ç</strong>.",
      definition: "<strong>Ç majuscule</strong>, c’est le ç en capitale, que l’on garde sur les majuscules comme dans «&nbsp;Ça va&nbsp;» ou «&nbsp;FRANÇAIS&nbsp;», car la cédille y a la même valeur que l’accent (<a href=\"https://www.academie-francaise.fr/questions-de-langue#5_strong-em-accentuation-des-majuscules-em-strong\">Académie française, «&nbsp;Accentuation des majuscules&nbsp;»</a>).",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>Alt</kbd> + <kbd>128</kbd>",
        ],
        note: "avec pavé numérique",
      },
      {
        systeme: "macOS",
        raccourcis: [
          "<kbd>Verr. Maj.</kbd> + <kbd>ç</kbd>",
        ],
        note: "prévu par Apple",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>ç</kbd>",
        ],
        note: "disposition Français (variante)",
      },
    ],
    solution: {
      titre: "Comment taper Ç majuscule avec AZERTY Global ?",
      plateformes: "Windows, macOS, Linux",
      noteSystemes: "Windows, macOS et Linux",
      equations: [
        {
          touches: "<kbd>Verr. Maj.</kbd> + <kbd>ç</kbd>",
          resultat: "Ç",
        },
      ],
      note: "Et aussi é → É, è → È, à → À. 99&nbsp;% des frappes inchangées, sur les fréquences du corpus AFNOR (texte à moitié formel, à moitié informel, <a href=\"/comparatif#methode-comparatif\">méthode</a>).",
    },
    pourquoi: {
      titre: "Quelles limites ont les autres méthodes ?",
      cartes: [
        {
          titre: "Alt Codes",
          texte: "Devoir retenir Alt + 128 pour un Ç ? C’est de l’informatique des années 80. De plus, sur les PC portables <strong>sans pavé numérique</strong>, c’est tout simplement <strong>impossible</strong>.",
        },
        {
          titre: "Copier-Coller",
          texte: "Ouvrir Google, rechercher « ç majuscule », copier, revenir, coller. Vous perdez 15 secondes à chaque fois.",
        },
        {
          titre: "Raccourcis Word",
          texte: "<kbd>Ctrl</kbd> + <kbd>,</kbd> puis <kbd>Maj</kbd> + <kbd>C</kbd>... Sérieusement ?",
        },
        {
          titre: "Correcteur automatique",
          texte: "Le correcteur est pratique mais aléatoire. Dans un formulaire web ou pour un mot de passe, vous êtes bloqué.",
        },
      ],
    },
    questions: {
      titre: "Questions fréquentes sur Ç majuscule",
      liste: [
        {
          question: "Quel est le code Alt du Ç majuscule&#8239;?",
          reponse: "Sur Windows, maintenez <kbd>Alt</kbd>, tapez <kbd>128</kbd> sur le pavé numérique, puis relâchez <kbd>Alt</kbd>&nbsp;: Ç s’affiche. <kbd>Alt</kbd> + <kbd>0199</kbd> donne aussi Ç. Ces codes demandent un pavé numérique avec Verr. Num. activé&nbsp;; la rangée des chiffres du haut ne convient pas. Avec AZERTY Global, Ç se tape sans code&nbsp;: <span class=\"insecable\"><kbd>Verr. Maj.</kbd> + <kbd>ç</kbd></span>.",
        },
        {
          question: "Comment faire Ç majuscule sans pavé numérique&#8239;?",
          reponse: "Sur l’AZERTY traditionnel de Windows, hors de Word, aucun raccourci ne donne Ç sans pavé numérique. Il reste à copier Ç depuis cette page. Avec <a href=\"/download\">AZERTY Global</a>, disposition gratuite pour Windows, macOS et Linux, tapez <span class=\"insecable\"><kbd>Verr. Maj.</kbd> + <kbd>ç</kbd></span> sur votre clavier AZERTY actuel, portable compris.",
        },
        {
          question: "Comment faire Ç majuscule sur Mac&#8239;?",
          reponse: "Sur la disposition Apple «&nbsp;Français&nbsp;», activez <kbd>Verr. Maj.</kbd> puis tapez <kbd>ç</kbd>&nbsp;: Ç s’affiche. Autre voie&nbsp;: maintenez <kbd>Maj</kbd> + <kbd>C</kbd>, puis choisissez Ç dans le menu qui apparaît. AZERTY Global garde le même geste sur Mac, Windows et Linux&nbsp;: <span class=\"insecable\"><kbd>Verr. Maj.</kbd> + <kbd>ç</kbd></span>.",
        },
        {
          question: "Pourquoi Verr. Maj. + ç donne 9 sous Windows&#8239;?",
          reponse: "Sur l’AZERTY traditionnel de Windows, Verr. Maj. agit comme Maj sur la rangée des chiffres. La touche <kbd>ç</kbd> porte aussi le <kbd>9</kbd>, qui sort à la place de Ç. Sur Mac (disposition Apple «&nbsp;Français&nbsp;») et avec AZERTY Global, <span class=\"insecable\"><kbd>Verr. Maj.</kbd> + <kbd>ç</kbd></span> écrit Ç.",
        },
        {
          question: "Comment faire Ç majuscule dans Word&#8239;?",
          reponse: "Dans Word, tapez <kbd>Ctrl</kbd> + <kbd>,</kbd> (virgule), relâchez, puis tapez <kbd>Maj</kbd> + <kbd>C</kbd>&nbsp;: Word écrit Ç. Ce raccourci ne fonctionne que dans Word&nbsp;; dans un navigateur ou un formulaire web, il ne fait rien. Avec AZERTY Global, <span class=\"insecable\"><kbd>Verr. Maj.</kbd> + <kbd>ç</kbd></span> écrit Ç dans Word comme dans le navigateur.",
        },
        {
          question: "Faut-il mettre la cédille sur les majuscules&#8239;?",
          reponse: "Oui. L’Académie française rappelle que l’accent a pleine valeur orthographique sur les capitales, et ajoute&nbsp;: «&nbsp;Il en va de même pour le tréma et la cédille.&nbsp;» On écrit donc «&nbsp;Ça va&nbsp;», «&nbsp;FRANÇAIS&nbsp;» et «&nbsp;GARÇON&nbsp;», avec Ç (<a href=\"https://www.academie-francaise.fr/questions-de-langue#5_strong-em-accentuation-des-majuscules-em-strong\">Académie française, «&nbsp;Accentuation des majuscules&nbsp;»</a>).",
        },
      ],
    },
    suite: {
      titre: "Qu’apporte d’autre AZERTY Global ?",
      sousTitre: "Le Ç majuscule n’est que la partie émergée de l’iceberg de ce que propose AZERTY Global.",
      cartes: [
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point&nbsp;: il est en accès direct, comme partout ailleurs. L’AZERTY français et l’AZERTY belge sont les seuls claviers au monde où le point demande Majuscule.",
        },
        {
          titre: "@robase direct",
          texte: "Fini le <kbd>AltGr</kbd> + <kbd>0</kbd>. L’arobase est sur une touche dédiée à gauche de la touche <kbd>1</kbd>. Idéal pour les e-mails.",
        },
        {
          titre: "Symboles Dev",
          texte: "<kbd>{</kbd> <kbd>}</kbd> <kbd>[</kbd> <kbd>]</kbd> <kbd>|</kbd> <kbd>\\</kbd> sont tous sur la rangée de repos avec <kbd>AltGr</kbd>. Un bonheur pour coder.",
        },
        {
          titre: "International",
          texte: "Espagnol (ñ ¡ ¿), Allemand (ß), Polonais (ł ę ż)... tout est inclus sans changer de clavier.",
        },
      ],
    },
    voirAussi: {
      liens: [
        {
          href: "/e-aigu-majuscule",
          libelle: "É majuscule",
        },
        {
          href: "/e-grave-majuscule",
          libelle: "È majuscule",
        },
        {
          href: "/a-grave-majuscule",
          libelle: "À majuscule",
        },
        {
          href: "/e-dans-l-o",
          libelle: "œ Œ (e dans l’o)",
        },
        {
          href: "/e-dans-l-a",
          libelle: "æ Æ (e dans l’a)",
        },
        {
          href: "/guillemets",
          libelle: "« » (guillemets français)",
        },
        {
          href: "/arobase",
          libelle: "Arobase @",
        },
        {
          href: "/crochets",
          libelle: "Crochets [ ]",
        },
        {
          href: "/accolades",
          libelle: "Accolades { }",
        },
        {
          href: "/tiret-cadratin",
          libelle: "Tirets – —",
        },
      ],
      guideTypographique: false,
    },
    partage: "https://twitter.com/intent/tweet?text=J%E2%80%99ai%20enfin%20trouv%C3%A9%20comment%20taper%20un%20%C3%87%20majuscule%20facilement%20gr%C3%A2ce%20%C3%A0%20%40AZERTY_Global%20%21%20Testez%20en%20ligne%2C%20c%E2%80%99est%20gratuit%20%F0%9F%91%89%20azerty.global%2Fc-cedille-majuscule",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Comment faire un Ç majuscule sur Windows ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Maintenez la touche Alt enfoncée, tapez 128 sur le pavé numérique, puis relâchez Alt. Sans pavé numérique, il n’existe pas de solution simple. Avec AZERTY Global : Verr. Maj. + ç = Ç."
            }
          },
          {
            "@type": "Question",
            "name": "Comment faire un Ç majuscule sur Mac ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Maintenez la touche ç enfoncée pendant une seconde, puis choisissez Ç dans le menu qui apparaît. Avec AZERTY Global, disponible aussi sur Mac : Verr. Maj. + ç → Ç, directement."
            }
          },
          {
            "@type": "Question",
            "name": "Comment faire un Ç majuscule sur Linux ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sous Linux, avec la disposition « Français (variante) », appuyez sur AltGr + Maj + ç pour obtenir Ç. Avec AZERTY Global, c’est plus simple : Verr. Maj. + ç = Ç."
            }
          },
          {
            "@type": "Question",
            "name": "Faut-il mettre la cédille sur les majuscules en français ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Oui. L’accent ou la cédille a pleine valeur orthographique et doit être conservé sur les majuscules en français."
            }
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "Comment taper Ç majuscule facilement",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Télécharger AZERTY Global",
            "text": "Installez gratuitement la disposition AZERTY Global pour Windows, macOS ou Linux.",
            "url": "https://azerty.global/download"
          },
          {
            "@type": "HowToStep",
            "name": "Activer le Verrouillage Majuscule",
            "text": "Appuyez sur la touche Verrouillage Majuscule de votre clavier."
          },
          {
            "@type": "HowToStep",
            "name": "Appuyer sur ç",
            "text": "Appuyez simplement sur la touche ç. Vous obtenez instantanément un Ç majuscule."
          }
        ],
        "totalTime": "PT3M",
        "tool": {
          "@type": "HowToTool",
          "name": "Clavier AZERTY Global"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Accueil",
            "item": "https://azerty.global/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Ç majuscule",
            "item": "https://azerty.global/c-cedille-majuscule"
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "AZERTY Global",
        "alternateName": "AZERTY Global 2026",
        "url": "https://azerty.global",
        "inLanguage": "fr",
        "publisher": {
          "@type": "Organization",
          "name": "Association pour la Modernisation du Clavier Français",
          "alternateName": "AMCF",
          "logo": {
            "@type": "ImageObject",
            "url": "https://azerty.global/assets/favicon-azerty-global.png"
          }
        }
      },
    ],
  },
  {
    slug: "a-grave-majuscule",
    nomTitre: "À majuscule",
    title: "À majuscule : comment le taper au clavier – AZERTY Global",
    description: "Copiez À en un clic ou tapez-le enfin au clavier : Verr. Maj. + à avec AZERTY Global, gratuit, Alt 0192 sinon. Windows, macOS et Linux.",
    canonicalPath: "/a-grave-majuscule",
    ogType: "article",
    testeur: {
      module: 1,
      lecon: 3,
    },
    caractere: {
      glyphe: "À",
      ariaLabel: "Copier À dans le presse-papier",
      bulle: {
        copie: "À copié",
        pronom: "le",
        raccourci: "<span class=\"insecable\">Verr. Maj. + <kbd>à</kbd></span>",
      },
    },
    heros: {
      titre: "Comment taper À majuscule au clavier ?",
      intro: "Sur l’AZERTY traditionnel de Windows, <strong>À majuscule</strong> demande le code <strong>Alt + 0192</strong> et un pavé numérique. Avec <a href=\"/download\" data-mesure-emplacement=\"intro\">AZERTY Global</a>, une disposition de clavier gratuite à installer sur Windows, macOS et Linux, tapez <strong>Verr. Maj. + à</strong>.",
      definition: "<strong>À majuscule</strong>, c’est le à en capitale, que l’Académie française recommande d’écrire sur toutes les majuscules, «&nbsp;y compris la préposition À&nbsp;», comme dans «&nbsp;À bientôt&nbsp;» (<a href=\"https://www.academie-francaise.fr/questions-de-langue#5_strong-em-accentuation-des-majuscules-em-strong\">Académie française, «&nbsp;Accentuation des majuscules&nbsp;»</a>).",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>Alt</kbd> + <kbd>0192</kbd>",
        ],
        note: "avec pavé numérique",
      },
      {
        systeme: "macOS",
        raccourcis: [
          "<kbd>Verr. Maj.</kbd> + <kbd>à</kbd>",
        ],
        note: "prévu par Apple",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>à</kbd>",
        ],
        note: "disposition Français (variante)",
      },
    ],
    solution: {
      titre: "Comment taper À majuscule avec AZERTY Global ?",
      plateformes: "Windows, macOS, Linux",
      noteSystemes: "Windows, macOS et Linux",
      equations: [
        {
          touches: "<kbd>Verr. Maj.</kbd> + <kbd>à</kbd>",
          resultat: "À",
        },
      ],
      note: "Et aussi é → É, è → È, ç → Ç. 99&nbsp;% des frappes inchangées, sur les fréquences du corpus AFNOR (texte à moitié formel, à moitié informel, <a href=\"/comparatif#methode-comparatif\">méthode</a>).",
    },
    pourquoi: {
      titre: "Quelles limites ont les autres méthodes ?",
      cartes: [
        {
          titre: "Alt Codes",
          texte: "Devoir retenir Alt + 0192 pour un À ? C’est de l’informatique des années 80. De plus, sur les PC portables <strong>sans pavé numérique</strong>, c’est tout simplement <strong>impossible</strong>.",
        },
        {
          titre: "Copier-Coller",
          texte: "Ouvrir Google, rechercher « a majuscule », copier, revenir, coller. Vous perdez 15 secondes à chaque fois.",
        },
        {
          titre: "Touche morte système",
          texte: "<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>7</kbd> puis <kbd>Maj</kbd> + <kbd>A</kbd>... Sérieusement ?",
        },
        {
          titre: "Correcteur automatique",
          texte: "Le correcteur est pratique mais aléatoire. Dans un formulaire web ou pour un mot de passe, vous êtes bloqué.",
        },
      ],
    },
    questions: {
      titre: "Questions fréquentes sur À majuscule",
      liste: [
        {
          question: "Quel est le code Alt du À majuscule&#8239;?",
          reponse: "Sur Windows, maintenez <kbd>Alt</kbd>, tapez <kbd>0192</kbd> sur le pavé numérique, puis relâchez <kbd>Alt</kbd>&nbsp;: À s’affiche. Ce code demande un pavé numérique avec Verr. Num. activé&nbsp;; la rangée des chiffres du haut ne convient pas. Avec AZERTY Global, À se tape sans code&nbsp;: <span class=\"insecable\"><kbd>Verr. Maj.</kbd> + <kbd>à</kbd></span>.",
        },
        {
          question: "Comment faire À majuscule sans pavé numérique&#8239;?",
          reponse: "Sur l’AZERTY traditionnel de Windows, tapez <kbd>AltGr</kbd> + <kbd>7</kbd>, relâchez, puis tapez <kbd>Maj</kbd> + <kbd>A</kbd>&nbsp;: À s’affiche. <kbd>AltGr</kbd> + <kbd>7</kbd> est la touche morte de l’accent grave, qui se pose sur la lettre tapée ensuite. Ce geste en deux temps marche sans pavé numérique. Avec <a href=\"/download\">AZERTY Global</a>, disposition gratuite pour Windows, macOS et Linux, tapez <span class=\"insecable\"><kbd>Verr. Maj.</kbd> + <kbd>à</kbd></span> sur votre clavier AZERTY actuel, portable compris.",
        },
        {
          question: "Comment faire À majuscule sur Mac&#8239;?",
          reponse: "Sur la disposition Apple «&nbsp;Français&nbsp;», activez <kbd>Verr. Maj.</kbd> puis tapez <kbd>à</kbd>&nbsp;: À s’affiche. Autre voie&nbsp;: maintenez <kbd>Maj</kbd> + <kbd>A</kbd>, puis choisissez À dans le menu qui apparaît. AZERTY Global garde le même geste sur Mac, Windows et Linux&nbsp;: <span class=\"insecable\"><kbd>Verr. Maj.</kbd> + <kbd>à</kbd></span>.",
        },
        {
          question: "Pourquoi Verr. Maj. + à donne 0 sous Windows&#8239;?",
          reponse: "Sur l’AZERTY traditionnel de Windows, Verr. Maj. agit comme Maj sur la rangée des chiffres. La touche <kbd>à</kbd> porte aussi le <kbd>0</kbd>, qui sort à la place de À. Sur Mac (disposition Apple «&nbsp;Français&nbsp;») et avec AZERTY Global, <span class=\"insecable\"><kbd>Verr. Maj.</kbd> + <kbd>à</kbd></span> écrit À.",
        },
        {
          question: "Faut-il un accent sur la préposition À en majuscule&#8239;?",
          reponse: "Oui. L’Académie française recommande d’utiliser systématiquement les capitales accentuées, «&nbsp;y compris la préposition À&nbsp;». On écrit donc «&nbsp;À bientôt&nbsp;» et «&nbsp;À LOUER&nbsp;», avec À (<a href=\"https://www.academie-francaise.fr/questions-de-langue#5_strong-em-accentuation-des-majuscules-em-strong\">Académie française, «&nbsp;Accentuation des majuscules&nbsp;»</a>).",
        },
      ],
    },
    suite: {
      titre: "Qu’apporte d’autre AZERTY Global ?",
      sousTitre: "Le À majuscule n’est que la partie émergée de l’iceberg de ce que propose AZERTY Global.",
      cartes: [
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point&nbsp;: il est en accès direct, comme partout ailleurs. L’AZERTY français et l’AZERTY belge sont les seuls claviers au monde où le point demande Majuscule.",
        },
        {
          titre: "@robase direct",
          texte: "Fini le <kbd>AltGr</kbd> + <kbd>0</kbd>. L’arobase est sur une touche dédiée à gauche de la touche <kbd>1</kbd>. Idéal pour les e-mails.",
        },
        {
          titre: "Symboles Dev",
          texte: "<kbd>{</kbd> <kbd>}</kbd> <kbd>[</kbd> <kbd>]</kbd> <kbd>|</kbd> <kbd>\\</kbd> sont tous sur la rangée de repos avec <kbd>AltGr</kbd>. Un bonheur pour coder.",
        },
        {
          titre: "International",
          texte: "Espagnol (ñ ¡ ¿), Allemand (ß), Polonais (ł ę ż)... tout est inclus sans changer de clavier.",
        },
      ],
    },
    voirAussi: {
      liens: [
        {
          href: "/e-aigu-majuscule",
          libelle: "É majuscule",
        },
        {
          href: "/e-grave-majuscule",
          libelle: "È majuscule",
        },
        {
          href: "/c-cedille-majuscule",
          libelle: "Ç majuscule",
        },
        {
          href: "/e-dans-l-o",
          libelle: "œ Œ (e dans l’o)",
        },
        {
          href: "/e-dans-l-a",
          libelle: "æ Æ (e dans l’a)",
        },
        {
          href: "/guillemets",
          libelle: "« » (guillemets français)",
        },
        {
          href: "/arobase",
          libelle: "Arobase @",
        },
        {
          href: "/crochets",
          libelle: "Crochets [ ]",
        },
        {
          href: "/accolades",
          libelle: "Accolades { }",
        },
        {
          href: "/tiret-cadratin",
          libelle: "Tirets – —",
        },
      ],
      guideTypographique: false,
    },
    partage: "https://twitter.com/intent/tweet?text=J%E2%80%99ai%20enfin%20trouv%C3%A9%20comment%20taper%20un%20%C3%80%20majuscule%20facilement%20gr%C3%A2ce%20%C3%A0%20%40AZERTY_Global%20%21%20Testez%20en%20ligne%2C%20c%E2%80%99est%20gratuit%20%F0%9F%91%89%20azerty.global%2Fa-grave-majuscule",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Comment faire un À majuscule sur Windows ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Maintenez la touche Alt enfoncée, tapez 0192 sur le pavé numérique, puis relâchez Alt. Sans pavé numérique, il n’existe pas de solution simple. Avec AZERTY Global : Verr. Maj. + à = À."
            }
          },
          {
            "@type": "Question",
            "name": "Comment faire un À majuscule sur Mac ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Maintenez la touche à enfoncée pendant une seconde, puis choisissez À dans le menu qui apparaît. Avec AZERTY Global, disponible aussi sur Mac : Verr. Maj. + à → À, directement."
            }
          },
          {
            "@type": "Question",
            "name": "Comment faire un À majuscule sur Linux ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sous Linux, avec la disposition « Français (variante) », appuyez sur AltGr + Maj + à pour obtenir À. Avec AZERTY Global, c’est plus simple : Verr. Maj. + à = À."
            }
          },
          {
            "@type": "Question",
            "name": "Faut-il mettre les accents sur les majuscules en français ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Oui. L’accent ou la cédille a pleine valeur orthographique et doit être conservé sur les majuscules en français."
            }
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "Comment taper À majuscule facilement",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Télécharger AZERTY Global",
            "text": "Installez gratuitement la disposition AZERTY Global pour Windows, macOS ou Linux.",
            "url": "https://azerty.global/download"
          },
          {
            "@type": "HowToStep",
            "name": "Activer le Verrouillage Majuscule",
            "text": "Appuyez sur la touche Verrouillage Majuscule de votre clavier."
          },
          {
            "@type": "HowToStep",
            "name": "Appuyer sur à",
            "text": "Appuyez simplement sur la touche à. Vous obtenez instantanément un À majuscule."
          }
        ],
        "totalTime": "PT3M",
        "tool": {
          "@type": "HowToTool",
          "name": "Clavier AZERTY Global"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Accueil",
            "item": "https://azerty.global/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "À majuscule",
            "item": "https://azerty.global/a-grave-majuscule"
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "AZERTY Global",
        "alternateName": "AZERTY Global 2026",
        "url": "https://azerty.global",
        "inLanguage": "fr",
        "publisher": {
          "@type": "Organization",
          "name": "Association pour la Modernisation du Clavier Français",
          "alternateName": "AMCF",
          "logo": {
            "@type": "ImageObject",
            "url": "https://azerty.global/assets/favicon-azerty-global.png"
          }
        }
      },
    ],
  },
  {
    slug: "e-dans-l-o",
    nomTitre: "œ et Œ",
    title: "œ Œ à copier ou taper (e dans l’o) – AZERTY Global",
    description: "Copiez œ Œ en un clic ou tapez-les enfin au clavier : AltGr + O avec AZERTY Global, Alt 0156 sinon. Pour écrire cœur, sœur ou œuvre sans faute.",
    canonicalPath: "/e-dans-l-o",
    ogType: "article",
    testeur: {
      module: 3,
      lecon: 0,
    },
    caractere: {
      glyphe: "œ Œ",
      ariaLabel: "Copier œ Œ dans le presse-papier",
      bulle: {
        copie: "œ Œ copiés",
        pronom: "les",
        raccourci: "<span class=\"insecable\">AltGr + <kbd>O</kbd></span> et <span class=\"insecable\">AltGr + Maj + <kbd>O</kbd></span> (<span class=\"insecable\">Option ⌥</span> au lieu d’AltGr sur Mac)",
      },
    },
    heros: {
      titre: "Comment taper œ Œ (e dans l’o) au clavier ?",
      intro: "Sur l’AZERTY traditionnel de Windows, <strong>œ</strong> demande le code <strong>Alt + 0156</strong> et un pavé numérique. Avec <a href=\"/download\" data-mesure-emplacement=\"intro\">AZERTY Global</a>, une disposition de clavier gratuite à installer sur Windows, macOS et Linux, tapez <strong>AltGr + O</strong> (<strong>Option ⌥</strong> au lieu d’AltGr sur Mac).",
      definition: "<strong>Le e dans l’o (œ)</strong>, c’est une lettre double où le o et le e sont soudés, comme dans cœur, sœur ou œuvre, et ces deux lettres «&nbsp;ne doivent jamais être séparées, qu’elles soient minuscules ou majuscules&nbsp;» (<a href=\"https://vitrinelinguistique.oqlf.gouv.qc.ca/21611/lorthographe/problemes-lies-aux-voyelles/ecriture-et-prononciation-des-lettres-doubles-ae-et-oe\">Office québécois de la langue française, «&nbsp;Écriture et prononciation des lettres doubles æ et œ&nbsp;»</a>).",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>Alt</kbd> + <kbd>0156</kbd>",
          "<kbd>Alt</kbd> + <kbd>0140</kbd>",
        ],
        note: "avec pavé numérique",
      },
      {
        systeme: "macOS",
        raccourcis: [
          "<kbd>Option</kbd> + <kbd>O</kbd>",
          "<kbd>Option</kbd> + <kbd>Maj</kbd> + <kbd>O</kbd>",
        ],
        note: "prévu par Apple",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>O</kbd>",
          "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>O</kbd>",
        ],
        note: "disposition Français (variante)",
      },
    ],
    solution: {
      titre: "Comment taper œ et Œ avec AZERTY Global ?",
      plateformes: "Windows et Linux : AltGr ; macOS : Option ⌥ (gauche ou droite)",
      noteSystemes: "Option ⌥ au lieu d’AltGr sur Mac",
      equations: [
        {
          touches: "<kbd>AltGr</kbd> + <kbd>O</kbd>",
          resultat: "œ",
        },
        {
          touches: "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>O</kbd>",
          resultat: "Œ",
        },
      ],
      note: "Et aussi æ Æ, « », €. 99&nbsp;% des frappes inchangées, sur les fréquences du corpus AFNOR (texte à moitié formel, à moitié informel, <a href=\"/comparatif#methode-comparatif\">méthode</a>).",
    },
    pourquoi: {
      titre: "Quelles limites ont les autres méthodes ?",
      cartes: [
        {
          titre: "Alt Codes",
          texte: "Devoir retenir Alt + 0156 pour œ et Alt + 0140 pour Œ ? C’est inhumain. De plus, sur les PC portables <strong>sans pavé numérique</strong>, c’est tout simplement <strong>impossible</strong>.",
        },
        {
          titre: "Copier-Coller",
          texte: "Ouvrir Google, rechercher « e dans l’o », copier, revenir, coller. Vous perdez 15 secondes à chaque fois que vous écrivez « cœur » ou « sœur ».",
        },
        {
          titre: "Écrire oe",
          texte: "Écrire « coeur » au lieu de « cœur » est une faute d’orthographe. Le œ n’est pas une coquetterie typographique, c’est <strong>une lettre à part entière</strong> du français.",
        },
        {
          titre: "Correcteur automatique",
          texte: "Word corrige parfois « coeur » en « cœur ». Mais sur Facebook, WhatsApp Web ou dans vos e-mails ? Rien.",
        },
      ],
    },
    questions: {
      titre: "Questions fréquentes sur œ et Œ",
      liste: [
        {
          question: "Quel est le raccourci clavier pour œ (oe collé)&#8239;?",
          reponse: "Sur l’AZERTY traditionnel de Windows, il n’existe aucun raccourci&nbsp;: seul le code <kbd>Alt</kbd> + <kbd>0156</kbd> fonctionne, avec pavé numérique. Sur Mac, tapez <kbd>Option</kbd> + <kbd>O</kbd>. Avec AZERTY Global (Windows, macOS, Linux), œ est en accès direct&nbsp;: <kbd>AltGr</kbd> + <kbd>O</kbd>.",
        },
        {
          question: "Comment écrire CŒUR en majuscules&#8239;?",
          reponse: "Le Œ majuscule s’obtient avec <kbd>Alt</kbd> + <kbd>0140</kbd> sur Windows (pavé numérique requis) ou en accès direct avec AZERTY Global&nbsp;: <kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>O</kbd>. De quoi écrire CŒUR, SŒUR ou ŒUVRE sans copier-coller.",
        },
        {
          question: "Quels sont les codes Alt de œ et Œ&#8239;?",
          reponse: "œ minuscule = <kbd>Alt</kbd> + <kbd>0156</kbd>, Œ majuscule = <kbd>Alt</kbd> + <kbd>0140</kbd>. Ces codes ne fonctionnent qu’avec un pavé numérique physique&nbsp;: sur la plupart des PC portables, ils sont inutilisables — c’est précisément le problème qu’AZERTY Global corrige.",
        },
        {
          question: "Écrire «&nbsp;oeuf&nbsp;» ou «&nbsp;coeur&nbsp;» sans le e dans l’o (œ), est-ce une faute&#8239;?",
          reponse: "Oui. Le e dans l’o (œ) est obligatoire en français&nbsp;: cœur, sœur, bœuf, œuf, œuvre, œil. Écrire «&nbsp;oe&nbsp;» n’est toléré que lorsque le caractère œ est techniquement indisponible — ce qui n’arrive plus avec un clavier qui sait le taper.",
        },
        {
          question: "Comment faire œ sur Mac&#8239;?",
          reponse: "Sur Mac, tapez <kbd>Option</kbd> + <kbd>O</kbd>&nbsp;: œ s’affiche. Avec AZERTY Global sur Mac, c’est le même geste, et <kbd>Option</kbd> + <kbd>Maj</kbd> + <kbd>O</kbd> donne Œ majuscule.",
        },
      ],
    },
    suite: {
      titre: "Qu’apporte d’autre AZERTY Global ?",
      sousTitre: "Le œ n’est que la partie émergée de l’iceberg de ce que propose AZERTY Global.",
      cartes: [
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point&nbsp;: il est en accès direct, comme partout ailleurs. L’AZERTY français et l’AZERTY belge sont les seuls claviers au monde où le point demande Majuscule.",
        },
        {
          titre: "@robase direct",
          texte: "Fini le <kbd>AltGr</kbd> + <kbd>0</kbd>. L’arobase est sur une touche dédiée à gauche de la touche <kbd>1</kbd>. Idéal pour les e-mails.",
        },
        {
          titre: "Symboles Dev",
          texte: "<kbd>{</kbd> <kbd>}</kbd> <kbd>[</kbd> <kbd>]</kbd> <kbd>|</kbd> <kbd>\\</kbd> sont tous sur la rangée de repos avec <kbd>AltGr</kbd>. Un bonheur pour coder.",
        },
        {
          titre: "International",
          texte: "Espagnol (ñ ¡ ¿), Allemand (ß), Polonais (ł ę ż)... tout est inclus sans changer de clavier.",
        },
      ],
    },
    voirAussi: {
      liens: [
        {
          href: "/e-aigu-majuscule",
          libelle: "É majuscule",
        },
        {
          href: "/e-grave-majuscule",
          libelle: "È majuscule",
        },
        {
          href: "/c-cedille-majuscule",
          libelle: "Ç majuscule",
        },
        {
          href: "/a-grave-majuscule",
          libelle: "À majuscule",
        },
        {
          href: "/e-dans-l-a",
          libelle: "æ Æ (e dans l’a)",
        },
        {
          href: "/guillemets",
          libelle: "« » (guillemets français)",
        },
        {
          href: "/arobase",
          libelle: "Arobase @",
        },
        {
          href: "/crochets",
          libelle: "Crochets [ ]",
        },
        {
          href: "/accolades",
          libelle: "Accolades { }",
        },
        {
          href: "/tiret-cadratin",
          libelle: "Tirets – —",
        },
      ],
      guideTypographique: true,
    },
    partage: "https://twitter.com/intent/tweet?text=J%E2%80%99ai%20enfin%20trouv%C3%A9%20comment%20taper%20%C5%93%20facilement%20gr%C3%A2ce%20%C3%A0%20%40AZERTY_Global%20%21%20Testez%20en%20ligne%2C%20c%E2%80%99est%20gratuit%20%F0%9F%91%89%20azerty.global%2Fe-dans-l-o",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Comment taper œ Œ (e dans l’o) sur Windows ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Maintenez Alt et tapez 0156 sur le pavé numérique pour œ, ou 0140 pour Œ. Sans pavé numérique, il n’existe pas de solution simple. Avec AZERTY Global : AltGr + O = œ."
            }
          },
          {
            "@type": "Question",
            "name": "Comment taper œ (e dans l’o) sur Mac ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Appuyez sur Option + o pour obtenir œ. Avec AZERTY Global, sur Mac comme sur PC : AltGr + O → œ."
            }
          },
          {
            "@type": "Question",
            "name": "Comment taper œ (e dans l’o) sur Linux ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sous Linux, avec la disposition « Français (variante) », appuyez sur AltGr + O pour obtenir œ. Avec AZERTY Global, c’est le même raccourci."
            }
          },
          {
            "@type": "Question",
            "name": "Pourquoi œ est-il important en français ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Le e dans l’o (œ) est obligatoire dans des mots comme cœur, œuvre, bœuf, sœur ou œil. Écrire oe à la place est une faute d’orthographe."
            }
          },
          {
            "@type": "Question",
            "name": "Quel est le raccourci clavier pour œ (oe collé) ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sur l’AZERTY traditionnel de Windows, il n’existe aucun raccourci : seul le code Alt + 0156 fonctionne, avec pavé numérique. Sur Mac, tapez Option + O. Avec AZERTY Global (Windows, macOS, Linux), œ est en accès direct : AltGr + O."
            }
          },
          {
            "@type": "Question",
            "name": "Comment écrire CŒUR en majuscules ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Le Œ majuscule s’obtient avec Alt + 0140 sur Windows (pavé numérique requis) ou en accès direct avec AZERTY Global : AltGr + Maj + O. De quoi écrire CŒUR, SŒUR ou ŒUVRE sans copier-coller."
            }
          },
          {
            "@type": "Question",
            "name": "Quels sont les codes Alt de œ et Œ ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "œ minuscule = Alt + 0156, Œ majuscule = Alt + 0140. Ces codes ne fonctionnent qu’avec un pavé numérique physique : sur la plupart des PC portables, ils sont inutilisables."
            }
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "Comment taper œ facilement",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Télécharger AZERTY Global",
            "text": "Installez gratuitement la disposition AZERTY Global pour Windows, macOS ou Linux.",
            "url": "https://azerty.global/download"
          },
          {
            "@type": "HowToStep",
            "name": "Maintenir AltGr",
            "text": "Maintenez la touche AltGr à droite de la barre d’espace."
          },
          {
            "@type": "HowToStep",
            "name": "Appuyer sur O",
            "text": "Appuyez sur O. Vous obtenez instantanément un œ."
          }
        ],
        "totalTime": "PT3M",
        "tool": {
          "@type": "HowToTool",
          "name": "Clavier AZERTY Global"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Accueil",
            "item": "https://azerty.global/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "œ Œ (e dans l’o)",
            "item": "https://azerty.global/e-dans-l-o"
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "AZERTY Global",
        "alternateName": "AZERTY Global 2026",
        "url": "https://azerty.global",
        "inLanguage": "fr",
        "publisher": {
          "@type": "Organization",
          "name": "Association pour la Modernisation du Clavier Français",
          "alternateName": "AMCF",
          "logo": {
            "@type": "ImageObject",
            "url": "https://azerty.global/assets/favicon-azerty-global.png"
          }
        }
      },
    ],
  },
  {
    slug: "e-dans-l-a",
    nomTitre: "æ et Æ",
    title: "æ Æ : comment taper l’« e dans l’a » au clavier – AZERTY Global",
    description: "Copiez æ Æ en un clic ou tapez-les enfin au clavier : AltGr + A avec AZERTY Global, gratuit, Alt 0230 sinon. Windows, macOS et Linux.",
    canonicalPath: "/e-dans-l-a",
    ogType: "article",
    testeur: {
      module: 3,
      lecon: 0,
    },
    caractere: {
      glyphe: "æ Æ",
      ariaLabel: "Copier æ Æ dans le presse-papier",
      bulle: {
        copie: "æ Æ copiés",
        pronom: "les",
        raccourci: "<span class=\"insecable\">AltGr + <kbd>A</kbd></span> et <span class=\"insecable\">AltGr + Maj + <kbd>A</kbd></span> (<span class=\"insecable\">Option ⌥</span> au lieu d’AltGr sur Mac)",
      },
    },
    heros: {
      titre: "Comment taper æ Æ (e dans l’a) au clavier ?",
      intro: "Sur l’AZERTY traditionnel de Windows, <strong>æ</strong> et <strong>Æ</strong> demandent les codes <strong>Alt + 0230</strong> et <strong>Alt + 0198</strong> et un pavé numérique. Avec <a href=\"/download\" data-mesure-emplacement=\"intro\">AZERTY Global</a>, une disposition de clavier gratuite à installer sur Windows, macOS et Linux, tapez <strong>AltGr + A</strong> et <strong>AltGr + Maj + A</strong> (<strong>Option ⌥</strong> au lieu d’AltGr sur Mac).",
      definition: "<strong>Le e dans l’a (æ)</strong>, c’est une lettre double où le a et le e sont soudés, présente dans quelques mots d’origine latine comme ex æquo ou curriculum vitæ, et qui, comme œ, ne se sépare pas, en minuscule comme en majuscule (<a href=\"https://vitrinelinguistique.oqlf.gouv.qc.ca/21611/lorthographe/problemes-lies-aux-voyelles/ecriture-et-prononciation-des-lettres-doubles-ae-et-oe\">Office québécois de la langue française, «&nbsp;Écriture et prononciation des lettres doubles æ et œ&nbsp;»</a>).",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>Alt</kbd> + <kbd>0230</kbd>",
          "<kbd>Alt</kbd> + <kbd>0198</kbd>",
        ],
        note: "avec pavé numérique",
      },
      {
        systeme: "macOS",
        raccourcis: [
          "<kbd>Option</kbd> + <kbd>A</kbd>",
          "<kbd>Option</kbd> + <kbd>Maj</kbd> + <kbd>A</kbd>",
        ],
        note: "prévu par Apple",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>A</kbd>",
          "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>A</kbd>",
        ],
        note: "par défaut",
      },
    ],
    solution: {
      titre: "Comment taper æ et Æ avec AZERTY Global ?",
      plateformes: "Windows et Linux : AltGr ; macOS : Option ⌥ (gauche ou droite)",
      noteSystemes: "Option ⌥ au lieu d’AltGr sur Mac",
      equations: [
        {
          touches: "<kbd>AltGr</kbd> + <kbd>A</kbd>",
          resultat: "æ",
        },
        {
          touches: "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>A</kbd>",
          resultat: "Æ",
        },
      ],
      note: "Et aussi œ Œ, « », €. 99&nbsp;% des frappes inchangées, sur les fréquences du corpus AFNOR (texte à moitié formel, à moitié informel, <a href=\"/comparatif#methode-comparatif\">méthode</a>).",
    },
    pourquoi: {
      titre: "Quelles limites ont les autres méthodes ?",
      cartes: [
        {
          titre: "Alt Codes",
          texte: "Devoir retenir Alt + 0230 pour æ et Alt + 0198 pour Æ ? C’est inhumain. De plus, sur les PC portables <strong>sans pavé numérique</strong>, c’est tout simplement <strong>impossible</strong>.",
        },
        {
          titre: "Copier-Coller",
          texte: "Ouvrir Google, rechercher « e dans l’a », copier, revenir, coller. Vous perdez 15 secondes à chaque fois que vous écrivez « ex æquo » ou « curriculum vitæ ».",
        },
        {
          titre: "Écrire ae",
          texte: "Écrire « ae » au lieu de « æ » n’est pas la même chose. Le e dans l’a (æ) est la graphie correcte en français pour les mots d’origine latine.",
        },
        {
          titre: "Correcteur automatique",
          texte: "Word corrige parfois certains mots. Mais sur Facebook, WhatsApp Web ou dans vos e-mails ? Rien.",
        },
      ],
    },
    questions: {
      titre: "Questions fréquentes sur æ et Æ",
      liste: [
        {
          question: "Comment faire æ (ae collé) au clavier&#8239;?",
          reponse: "Sur l’AZERTY traditionnel de Windows, æ n’a pas de touche&nbsp;: maintenez <kbd>Alt</kbd> et tapez <kbd>0230</kbd> sur le pavé numérique. Avec AZERTY Global, tapez <kbd>AltGr</kbd> + <kbd>A</kbd>, ou <kbd>Option</kbd> + <kbd>A</kbd> sur Mac.",
        },
        {
          question: "Comment faire Æ majuscule&#8239;?",
          reponse: "Sur Windows, <kbd>Alt</kbd> + <kbd>0198</kbd> donne Æ, avec un pavé numérique. Avec AZERTY Global, tapez <kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>A</kbd>, ou <kbd>Option</kbd> + <kbd>Maj</kbd> + <kbd>A</kbd> sur Mac.",
        },
        {
          question: "Comment faire æ sur Mac&#8239;?",
          reponse: "Sur Mac, tapez <kbd>Option</kbd> + <kbd>A</kbd>&nbsp;: æ s’affiche. Avec AZERTY Global sur Mac, c’est le même geste, et <kbd>Option</kbd> + <kbd>Maj</kbd> + <kbd>A</kbd> donne Æ.",
        },
        {
          question: "Comment faire æ sans pavé numérique&#8239;?",
          reponse: "Sur l’AZERTY traditionnel de Windows, sans pavé numérique, il reste à copier æ depuis cette page. Sous Linux, <kbd>AltGr</kbd> + <kbd>A</kbd> donne æ sur l’AZERTY français par défaut. Avec AZERTY Global, <kbd>AltGr</kbd> + <kbd>A</kbd> donne æ sur Windows, Linux et, avec <kbd>Option</kbd>, sur Mac.",
        },
        {
          question: "Dans quels mots écrit-on æ&#8239;?",
          reponse: "Le e dans l’a (æ) apparaît dans quelques mots d’origine latine, comme ex æquo, curriculum vitæ ou et cætera, et dans des prénoms comme Lætitia.",
        },
      ],
    },
    suite: {
      titre: "Qu’apporte d’autre AZERTY Global ?",
      sousTitre: "Le æ n’est que la partie émergée de l’iceberg de ce que propose AZERTY Global.",
      cartes: [
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point&nbsp;: il est en accès direct, comme partout ailleurs. L’AZERTY français et l’AZERTY belge sont les seuls claviers au monde où le point demande Majuscule.",
        },
        {
          titre: "@robase direct",
          texte: "Fini le <kbd>AltGr</kbd> + <kbd>0</kbd>. L’arobase est sur une touche dédiée à gauche de la touche <kbd>1</kbd>. Idéal pour les e-mails.",
        },
        {
          titre: "Symboles Dev",
          texte: "<kbd>{</kbd> <kbd>}</kbd> <kbd>[</kbd> <kbd>]</kbd> <kbd>|</kbd> <kbd>\\</kbd> sont tous sur la rangée de repos avec <kbd>AltGr</kbd>. Un bonheur pour coder.",
        },
        {
          titre: "International",
          texte: "Espagnol (ñ ¡ ¿), Allemand (ß), Polonais (ł ę ż)... tout est inclus sans changer de clavier.",
        },
      ],
    },
    voirAussi: {
      liens: [
        {
          href: "/e-aigu-majuscule",
          libelle: "É majuscule",
        },
        {
          href: "/e-grave-majuscule",
          libelle: "È majuscule",
        },
        {
          href: "/c-cedille-majuscule",
          libelle: "Ç majuscule",
        },
        {
          href: "/a-grave-majuscule",
          libelle: "À majuscule",
        },
        {
          href: "/e-dans-l-o",
          libelle: "œ Œ (e dans l’o)",
        },
        {
          href: "/guillemets",
          libelle: "« » (guillemets français)",
        },
        {
          href: "/arobase",
          libelle: "Arobase @",
        },
        {
          href: "/crochets",
          libelle: "Crochets [ ]",
        },
        {
          href: "/accolades",
          libelle: "Accolades { }",
        },
        {
          href: "/tiret-cadratin",
          libelle: "Tirets – —",
        },
      ],
      guideTypographique: false,
    },
    partage: "https://twitter.com/intent/tweet?text=J%E2%80%99ai%20enfin%20trouv%C3%A9%20comment%20taper%20%C3%A6%20facilement%20gr%C3%A2ce%20%C3%A0%20%40AZERTY_Global%20%21%20Testez%20en%20ligne%2C%20c%E2%80%99est%20gratuit%20%F0%9F%91%89%20azerty.global%2Fe-dans-l-a",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Comment taper æ Æ (e dans l’a) sur Windows ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Maintenez Alt et tapez 0230 sur le pavé numérique pour æ, ou 0198 pour Æ. Sans pavé numérique, il n’existe pas de solution simple. Avec AZERTY Global : AltGr + A = æ."
            }
          },
          {
            "@type": "Question",
            "name": "Comment taper æ (e dans l’a) sur Mac ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Appuyez sur Option + a pour obtenir æ. Avec AZERTY Global, sur Mac comme sur PC : AltGr + A → æ."
            }
          },
          {
            "@type": "Question",
            "name": "Comment taper æ (e dans l’a) sur Linux ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sur Linux avec la disposition AZERTY française par défaut, appuyez sur AltGr + A pour obtenir æ. Avec AZERTY Global, c’est le même raccourci."
            }
          },
          {
            "@type": "Question",
            "name": "Pourquoi écrire æ plutôt que ae ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Le e dans l’a (æ) est la graphie correcte en français pour des mots d’origine latine comme ex æquo, curriculum vitæ ou et cætera."
            }
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "Comment taper æ facilement",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Télécharger AZERTY Global",
            "text": "Installez gratuitement la disposition AZERTY Global pour Windows, macOS ou Linux.",
            "url": "https://azerty.global/download"
          },
          {
            "@type": "HowToStep",
            "name": "Maintenir AltGr",
            "text": "Maintenez la touche AltGr à droite de la barre d’espace."
          },
          {
            "@type": "HowToStep",
            "name": "Appuyer sur A",
            "text": "Appuyez sur A. Vous obtenez instantanément un æ."
          }
        ],
        "totalTime": "PT3M",
        "tool": {
          "@type": "HowToTool",
          "name": "Clavier AZERTY Global"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Accueil",
            "item": "https://azerty.global/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "æ Æ (e dans l’a)",
            "item": "https://azerty.global/e-dans-l-a"
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "AZERTY Global",
        "alternateName": "AZERTY Global 2026",
        "url": "https://azerty.global",
        "inLanguage": "fr",
        "publisher": {
          "@type": "Organization",
          "name": "Association pour la Modernisation du Clavier Français",
          "alternateName": "AMCF",
          "logo": {
            "@type": "ImageObject",
            "url": "https://azerty.global/assets/favicon-azerty-global.png"
          }
        }
      },
    ],
  },
  {
    slug: "guillemets",
    nomTitre: "les guillemets « »",
    title: "Guillemets français « » à copier ou taper – AZERTY Global",
    description: "Copiez « » en un clic ou tapez-les enfin au clavier : AltGr + W et AltGr + X avec AZERTY Global, Alt 0171/0187 sinon. Windows, macOS et Linux.",
    canonicalPath: "/guillemets",
    ogType: "article",
    testeur: {
      module: 3,
      lecon: 1,
    },
    caractere: {
      glyphe: "« »",
      ariaLabel: "Copier « » dans le presse-papier",
      bulle: {
        copie: "« » copiés",
        pronom: "les",
        raccourci: "<span class=\"insecable\">AltGr + <kbd>W</kbd></span> et <span class=\"insecable\">AltGr + <kbd>X</kbd></span> (<span class=\"insecable\">Option ⌥</span> au lieu d’AltGr sur Mac)",
      },
    },
    heros: {
      titre: "Comment taper les guillemets « » au clavier ?",
      intro: "Sur l’AZERTY traditionnel de Windows, <strong>les guillemets « »</strong> demandent les codes <strong>Alt + 0171</strong> et <strong>Alt + 0187</strong> et un pavé numérique. Avec <a href=\"/download\" data-mesure-emplacement=\"intro\">AZERTY Global</a>, une disposition de clavier gratuite à installer sur Windows, macOS et Linux, tapez <strong>AltGr + W</strong> et <strong>AltGr + X</strong> (<strong>Option ⌥</strong> au lieu d’AltGr sur Mac).",
      definition: "<strong>Les guillemets français «&nbsp;»</strong>, ce sont les chevrons doubles «&nbsp;que l’on utilise normalement dans un texte français&nbsp;», notamment pour une citation ou un dialogue, avec une espace insécable du côté du texte (<a href=\"https://vitrinelinguistique.oqlf.gouv.qc.ca/23363/la-ponctuation/guillemets/generalites-sur-les-guillemets\">Office québécois de la langue française, «&nbsp;Généralités sur les guillemets&nbsp;»</a>).",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>Alt</kbd> + <kbd>0171</kbd>",
          "<kbd>Alt</kbd> + <kbd>0187</kbd>",
        ],
        note: "avec pavé numérique",
      },
      {
        systeme: "macOS",
        raccourcis: [
          "<kbd>Option</kbd> + <kbd>è</kbd>",
          "<kbd>Option</kbd> + <kbd>Maj</kbd> + <kbd>è</kbd>",
        ],
        note: "prévu par Apple",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>W</kbd>",
          "<kbd>AltGr</kbd> + <kbd>X</kbd>",
        ],
        note: "disposition Français (variante)",
      },
    ],
    solution: {
      titre: "Comment taper les guillemets « » avec AZERTY Global ?",
      plateformes: "Windows et Linux : AltGr ; macOS : Option ⌥ (gauche ou droite)",
      noteSystemes: "Option ⌥ au lieu d’AltGr sur Mac",
      equations: [
        {
          touches: "<kbd>AltGr</kbd> + <kbd>W</kbd> / <kbd>X</kbd>",
          resultat: "« »",
        },
      ],
      note: "Et aussi œ Œ, æ Æ, É, È, À, Ç. 99&nbsp;% des frappes inchangées, sur les fréquences du corpus AFNOR (texte à moitié formel, à moitié informel, <a href=\"/comparatif#methode-comparatif\">méthode</a>).",
    },
    pourquoi: {
      titre: "Quelles limites ont les autres méthodes ?",
      cartes: [
        {
          titre: "Alt Codes",
          texte: "Devoir retenir deux codes différents — Alt + 0171 et Alt + 0187 — c’est inhumain. De plus, sur les PC portables <strong>sans pavé numérique</strong>, c’est tout simplement <strong>impossible</strong>.",
        },
        {
          titre: "Copier-Coller",
          texte: "Ouvrir Google, rechercher « guillemets français », copier, revenir, coller. Vous perdez 15 secondes à chaque citation.",
        },
        {
          titre: "Guillemets droits",
          texte: "Utiliser les guillemets droits (&quot; &quot;) est une faute typographique en français. Les vrais guillemets français sont « ».",
        },
        {
          titre: "Correcteur automatique",
          texte: "Word remplace parfois &quot; par « ». Mais dès que vous êtes sur Facebook, WhatsApp Web ou dans un e-mail, vous revenez aux guillemets droits &quot; &quot;.",
        },
      ],
    },
    questions: {
      titre: "Questions fréquentes sur les guillemets français",
      liste: [
        {
          question: "Comment ouvrir et fermer les guillemets sur un clavier AZERTY&#8239;?",
          reponse: "Sur l’AZERTY traditionnel de Windows, aucune touche ne les propose&nbsp;: tapez <kbd>Alt</kbd> + <kbd>0171</kbd> pour ouvrir «&nbsp;et <kbd>Alt</kbd> + <kbd>0187</kbd> pour fermer&nbsp;» (pavé numérique requis). Avec AZERTY Global, <kbd>AltGr</kbd> + <kbd>W</kbd> ouvre et <kbd>AltGr</kbd> + <kbd>X</kbd> ferme, sur n’importe quel PC.",
        },
        {
          question: "Où sont les guillemets français sur le clavier&#8239;?",
          reponse: "Ils n’y sont pas&nbsp;: l’AZERTY traditionnel de Windows ne propose que les guillemets droits <kbd>\"</kbd> (touche 3). Les guillemets français « » s’obtiennent par code Alt, par la correction automatique de Word, ou en accès direct avec une disposition enrichie comme AZERTY Global.",
        },
        {
          question: "Pourquoi Word met les guillemets français mais pas mon navigateur&#8239;?",
          reponse: "C’est la correction automatique de Word qui remplace <kbd>\"</kbd> par « » au moment de la frappe. Dans un navigateur, un e-mail ou WhatsApp Web, cette correction n’existe pas&nbsp;: vous retombez sur les guillemets droits, sauf si votre clavier sait taper « » directement.",
        },
        {
          question: "Faut-il une espace à l’intérieur des guillemets français&#8239;?",
          reponse: "Oui&nbsp;: une espace insécable après le guillemet ouvrant et avant le fermant («&nbsp;exemple&nbsp;»). Avec AZERTY Global, l’espace insécable se tape avec <kbd>Maj</kbd> + <kbd>AltGr</kbd> + <kbd>Espace</kbd> et l’espace fine insécable avec <kbd>AltGr</kbd> + <kbd>Espace</kbd>.",
        },
        {
          question: "Comment copier-coller les guillemets français&#8239;?",
          reponse: "Cliquez sur le bouton Copier en haut de cette page&nbsp;: «&nbsp;» sont copiés. Collez-les avec <kbd>Ctrl</kbd> + <kbd>V</kbd>, ou <kbd>Cmd</kbd> + <kbd>V</kbd> sur Mac. Pour les taper sans copier-coller, AZERTY Global met « sur <kbd>AltGr</kbd> + <kbd>W</kbd> et » sur <kbd>AltGr</kbd> + <kbd>X</kbd> (<kbd>Option</kbd> au lieu d’<kbd>AltGr</kbd> sur Mac).",
        },
      ],
    },
    suite: {
      titre: "Qu’apporte d’autre AZERTY Global ?",
      sousTitre: "Les guillemets « » ne sont que la partie émergée de l’iceberg de ce que propose AZERTY Global.",
      cartes: [
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point&nbsp;: il est en accès direct, comme partout ailleurs. L’AZERTY français et l’AZERTY belge sont les seuls claviers au monde où le point demande Majuscule.",
        },
        {
          titre: "@robase direct",
          texte: "Fini le <kbd>AltGr</kbd> + <kbd>0</kbd>. L’arobase est sur une touche dédiée à gauche de la touche <kbd>1</kbd>. Idéal pour les e-mails.",
        },
        {
          titre: "Symboles Dev",
          texte: "<kbd>{</kbd> <kbd>}</kbd> <kbd>[</kbd> <kbd>]</kbd> <kbd>|</kbd> <kbd>\\</kbd> sont tous sur la rangée de repos avec <kbd>AltGr</kbd>. Un bonheur pour coder.",
        },
        {
          titre: "International",
          texte: "Espagnol (ñ ¡ ¿), Allemand (ß), Polonais (ł ę ż)... tout est inclus sans changer de clavier.",
        },
      ],
    },
    voirAussi: {
      liens: [
        {
          href: "/e-aigu-majuscule",
          libelle: "É majuscule",
        },
        {
          href: "/e-grave-majuscule",
          libelle: "È majuscule",
        },
        {
          href: "/c-cedille-majuscule",
          libelle: "Ç majuscule",
        },
        {
          href: "/a-grave-majuscule",
          libelle: "À majuscule",
        },
        {
          href: "/e-dans-l-o",
          libelle: "œ Œ (e dans l’o)",
        },
        {
          href: "/e-dans-l-a",
          libelle: "æ Æ (e dans l’a)",
        },
        {
          href: "/arobase",
          libelle: "Arobase @",
        },
        {
          href: "/crochets",
          libelle: "Crochets [ ]",
        },
        {
          href: "/accolades",
          libelle: "Accolades { }",
        },
        {
          href: "/tiret-cadratin",
          libelle: "Tirets – —",
        },
      ],
      guideTypographique: true,
    },
    partage: "https://twitter.com/intent/tweet?text=J%E2%80%99ai%20enfin%20trouv%C3%A9%20comment%20taper%20%C2%AB%20%C2%BB%20facilement%20gr%C3%A2ce%20%C3%A0%20%40AZERTY_Global%20%21%20Testez%20en%20ligne%2C%20c%E2%80%99est%20gratuit%20%F0%9F%91%89%20azerty.global%2Fguillemets",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Comment taper les guillemets français « » sur Windows ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Maintenez Alt et tapez 0171 sur le pavé numérique pour «, puis 0187 pour ». Sans pavé numérique, pas de solution simple. Avec AZERTY Global : AltGr + W = « et AltGr + X = »."
            }
          },
          {
            "@type": "Question",
            "name": "Comment taper les guillemets français « » sur Mac ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Appuyez sur Option + è pour « et Option + Maj + è pour ». Avec AZERTY Global : AltGr + W = « et AltGr + X = »."
            }
          },
          {
            "@type": "Question",
            "name": "Comment taper les guillemets français « » sur Linux ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sous Linux, avec la disposition « Français (variante) », appuyez sur AltGr + W pour « et AltGr + X pour »."
            }
          },
          {
            "@type": "Question",
            "name": "Quelle est la différence entre « » et \" \" ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Les guillemets français « » sont la norme typographique en français pour les citations et dialogues. Les guillemets droits \" \" sont anglais."
            }
          },
          {
            "@type": "Question",
            "name": "Comment ouvrir et fermer les guillemets sur un clavier AZERTY ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sur l'AZERTY traditionnel de Windows, aucune touche ne les propose : tapez Alt + 0171 pour ouvrir « et Alt + 0187 pour fermer » (pavé numérique requis). Avec AZERTY Global, AltGr + W ouvre et AltGr + X ferme, sur n'importe quel PC."
            }
          },
          {
            "@type": "Question",
            "name": "Où sont les guillemets français sur le clavier ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Ils n'y sont pas : l’AZERTY traditionnel de Windows ne propose que les guillemets droits \" (touche 3). Les guillemets français « » s'obtiennent par code Alt, par la correction automatique de Word, ou en accès direct avec une disposition enrichie comme AZERTY Global."
            }
          },
          {
            "@type": "Question",
            "name": "Pourquoi Word met les guillemets français mais pas mon navigateur ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "C'est la correction automatique de Word qui remplace \" par « » au moment de la frappe. Dans un navigateur, un e-mail ou WhatsApp Web, cette correction n'existe pas : vous retombez sur les guillemets droits, sauf si votre clavier sait taper « » directement."
            }
          },
          {
            "@type": "Question",
            "name": "Faut-il une espace à l'intérieur des guillemets français ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Oui : une espace insécable après le guillemet ouvrant et avant le fermant (« exemple »). Avec AZERTY Global, l'espace insécable se tape avec Maj + AltGr + Espace et l'espace fine insécable avec AltGr + Espace."
            }
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "Comment taper les guillemets « » facilement",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Télécharger AZERTY Global",
            "text": "Installez gratuitement la disposition AZERTY Global pour Windows, macOS ou Linux.",
            "url": "https://azerty.global/download"
          },
          {
            "@type": "HowToStep",
            "name": "AltGr + W pour «",
            "text": "Maintenez AltGr et appuyez sur W pour obtenir le guillemet ouvrant «."
          },
          {
            "@type": "HowToStep",
            "name": "AltGr + X pour »",
            "text": "Maintenez AltGr et appuyez sur X pour obtenir le guillemet fermant »."
          }
        ],
        "totalTime": "PT3M",
        "tool": {
          "@type": "HowToTool",
          "name": "Clavier AZERTY Global"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Accueil",
            "item": "https://azerty.global/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Guillemets",
            "item": "https://azerty.global/guillemets"
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "AZERTY Global",
        "alternateName": "AZERTY Global 2026",
        "url": "https://azerty.global",
        "inLanguage": "fr",
        "publisher": {
          "@type": "Organization",
          "name": "Association pour la Modernisation du Clavier Français",
          "alternateName": "AMCF",
          "logo": {
            "@type": "ImageObject",
            "url": "https://azerty.global/assets/favicon-azerty-global.png"
          }
        }
      },
    ],
  },
  {
    slug: "arobase",
    nomTitre: "l’arobase @",
    title: "Arobase @ : comment la taper au clavier – AZERTY Global",
    description: "Copiez @ en un clic ou tapez-la en une touche : ² sur AZERTY Global, gratuit, au lieu d'AltGr + 0. Windows, macOS et Linux.",
    canonicalPath: "/arobase",
    ogType: "article",
    testeur: {
      module: 0,
      lecon: 2,
    },
    caractere: {
      glyphe: "@",
      ariaLabel: "Copier @ dans le presse-papier",
      bulle: {
        copie: "@ copiée",
        pronom: "la",
        raccourci: "la touche <kbd>²</kbd>, en haut à gauche",
      },
    },
    heros: {
      titre: "Comment taper arobase @ au clavier ?",
      intro: "Sur l’AZERTY traditionnel de Windows, <strong>@</strong> se tape avec <strong>AltGr + 0</strong>, main droite étirée. Avec <a href=\"/download\" data-mesure-emplacement=\"intro\">AZERTY Global</a>, une disposition de clavier gratuite à installer sur Windows, macOS et Linux, tapez <strong>@</strong> sur la touche <strong>²</strong>, en haut à gauche, et <strong>#</strong> avec <strong>Maj</strong> sur la même touche, comme sur Mac.",
      definition: "<strong>L’arobase @</strong>, c’est le signe qui sépare le nom de l’utilisateur et le nom de domaine dans une adresse e-mail, comme dans nom@exemple.fr, et qui sert aussi à mentionner quelqu’un sur les réseaux sociaux.",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>0</kbd>",
        ],
        note: "rangée des chiffres",
      },
      {
        systeme: "macOS",
        raccourcis: [
          "<kbd>@</kbd>",
        ],
        note: "touche en haut à gauche",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>0</kbd>",
        ],
        note: "comme sur Windows",
      },
    ],
    solution: {
      titre: "Comment taper l’arobase @ avec AZERTY Global ?",
      plateformes: "Windows, macOS, Linux",
      noteSystemes: "Windows, macOS et Linux",
      equations: [
        {
          touches: "<kbd>touche ²</kbd>",
          resultat: "@",
        },
      ],
      note: "Vous retrouvez le geste pratique du Mac sur Windows et Linux, sans changer de clavier.",
    },
    pourquoi: {
      titre: "Pourquoi mettre @ en accès direct ?",
      cartes: [
        {
          titre: "Les e-mails sont partout",
          texte: "Adresse e-mail, identifiant, formulaire, contact professionnel : l’arobase est un caractère quotidien, pas un symbole rare.",
        },
        {
          titre: "AltGr + 0 étire la main",
          texte: "Le raccourci classique fonctionne, mais il demande une combinaison peu naturelle, souvent répétée au moment où l’on saisit vite.",
        },
      ],
    },
    questions: {
      titre: "Questions fréquentes sur l’arobase @",
      liste: [
        {
          question: "Comment faire @ sur un clavier AZERTY&#8239;?",
          reponse: "Sur l’AZERTY traditionnel de Windows, maintenez <kbd>AltGr</kbd> et appuyez sur <kbd>0</kbd> (la touche à)&nbsp;: @ s’affiche. Avec AZERTY Global, @ a sa propre touche&nbsp;: <kbd>²</kbd>, en haut à gauche, sans AltGr. <kbd>Maj</kbd> + <kbd>²</kbd> donne #.",
        },
        {
          question: "Comment faire @ sur Mac&#8239;?",
          reponse: "Sur la disposition Apple «&nbsp;Français&nbsp;», @ a une touche dédiée en haut à gauche du clavier, sans modificateur. AZERTY Global garde cette touche sur Mac et donne le même geste sur Windows et Linux&nbsp;: la touche <kbd>²</kbd>, à gauche du <kbd>1</kbd>.",
        },
        {
          question: "Comment faire @ sous Linux&#8239;?",
          reponse: "Avec l’AZERTY français par défaut de Linux, tapez <kbd>AltGr</kbd> + <kbd>0</kbd>, comme sous Windows. Avec AZERTY Global, la touche <kbd>²</kbd>, en haut à gauche, donne @ sous Linux aussi.",
        },
        {
          question: "AltGr + 0 marche-t-il encore avec AZERTY Global&#8239;?",
          reponse: "Oui. <kbd>AltGr</kbd> + <kbd>0</kbd> continue de donner @. La touche <kbd>²</kbd> s’y ajoute comme accès direct, sans AltGr.",
        },
        {
          question: "Comment copier-coller l’arobase&#8239;?",
          reponse: "Cliquez sur le bouton Copier en haut de cette page&nbsp;: @ est copiée. Collez-la avec <kbd>Ctrl</kbd> + <kbd>V</kbd>, ou <kbd>Cmd</kbd> + <kbd>V</kbd> sur Mac. Pour la taper sans copier-coller, AZERTY Global met @ sur la touche <kbd>²</kbd>, en haut à gauche.",
        },
      ],
    },
    suite: {
      titre: "Qu’apporte d’autre AZERTY Global ?",
      sousTitre: "L’arobase directe fait partie des cinq changements d’AZERTY Global.",
      cartes: [
        {
          titre: "Majuscules accentuées",
          texte: "<kbd>Verr. Maj.</kbd> + <kbd>é</kbd> donne <strong>É</strong>. Même logique pour <strong>È</strong>, <strong>Ç</strong> et <strong>À</strong>.",
        },
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point&nbsp;: il est en accès direct, comme partout ailleurs. L’AZERTY français et l’AZERTY belge sont les seuls claviers au monde où le point demande Majuscule.",
        },
        {
          titre: "Accents internationaux sur la touche ù",
          texte: "Trois accents morts prennent la place du ù&nbsp;: aigu, grave et tilde, pour <strong>á</strong> <strong>ò</strong> <strong>ñ</strong> en deux frappes. Le ù passe en <kbd>AltGr</kbd> + <kbd>U</kbd>, le pour cent passe en <kbd>Maj</kbd> + <kbd>)</kbd>.",
        },
        {
          titre: "Symboles dev",
          texte: "<kbd>{</kbd> <kbd>}</kbd> <kbd>[</kbd> <kbd>]</kbd> <kbd>|</kbd> <kbd>\\</kbd> sont regroupés sur la rangée de repos avec <kbd>AltGr</kbd>.",
        },
      ],
    },
    voirAussi: {
      liens: [
        {
          href: "/e-aigu-majuscule",
          libelle: "É majuscule",
        },
        {
          href: "/e-grave-majuscule",
          libelle: "È majuscule",
        },
        {
          href: "/c-cedille-majuscule",
          libelle: "Ç majuscule",
        },
        {
          href: "/a-grave-majuscule",
          libelle: "À majuscule",
        },
        {
          href: "/e-dans-l-o",
          libelle: "œ Œ (e dans l’o)",
        },
        {
          href: "/e-dans-l-a",
          libelle: "æ Æ (e dans l’a)",
        },
        {
          href: "/guillemets",
          libelle: "« » (guillemets français)",
        },
        {
          href: "/crochets",
          libelle: "Crochets [ ]",
        },
        {
          href: "/accolades",
          libelle: "Accolades { }",
        },
        {
          href: "/tiret-cadratin",
          libelle: "Tirets – —",
        },
      ],
      guideTypographique: false,
    },
    partage: "https://twitter.com/intent/tweet?text=J%E2%80%99ai%20enfin%20un%20arobase%20%40%20en%20acc%C3%A8s%20direct%20sur%20clavier%20AZERTY%20gr%C3%A2ce%20%C3%A0%20%40AZERTY_Global%20%21%20Testez%20en%20ligne%2C%20c%E2%80%99est%20gratuit%20%F0%9F%91%89%20azerty.global%2Farobase",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Comment faire arobase @ sur un clavier AZERTY ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Avec AZERTY Global, @ est en accès direct sur la touche ², en haut à gauche du clavier. Sur l'AZERTY Windows traditionnel, on utilise généralement AltGr + 0."
            }
          },
          {
            "@type": "Question",
            "name": "Où se trouve l'arobase sur macOS avec AZERTY Global ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sur macOS avec AZERTY Global, l'arobase @ est en accès direct sur la touche en haut à gauche du clavier, comme sur la disposition française macOS."
            }
          },
          {
            "@type": "Question",
            "name": "Où se trouve l'arobase sur AZERTY Global ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sur la disposition AZERTY Global, l'arobase @ se trouve sur la touche ², en haut à gauche du clavier, juste avant la touche 1 — en accès direct, sans AltGr."
            }
          },
          {
            "@type": "Question",
            "name": "Faut-il acheter un nouveau clavier pour taper @ plus facilement ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Non. AZERTY Global est une disposition logicielle gratuite pour Windows, macOS et Linux. Elle fonctionne avec votre clavier AZERTY actuel."
            }
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "Comment taper arobase @ facilement avec AZERTY Global",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Télécharger AZERTY Global",
            "text": "Installez gratuitement la disposition AZERTY Global pour Windows, macOS ou Linux.",
            "url": "https://azerty.global/download"
          },
          {
            "@type": "HowToStep",
            "name": "Repérer la touche ²",
            "text": "La touche ² se trouve en haut à gauche du clavier, juste à gauche de la touche 1."
          },
          {
            "@type": "HowToStep",
            "name": "Appuyer directement sur la touche",
            "text": "Avec AZERTY Global, une pression sur cette touche produit @."
          }
        ],
        "totalTime": "PT3M",
        "tool": {
          "@type": "HowToTool",
          "name": "Clavier AZERTY Global"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Accueil",
            "item": "https://azerty.global/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Arobase",
            "item": "https://azerty.global/arobase"
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "AZERTY Global",
        "alternateName": "AZERTY Global 2026",
        "url": "https://azerty.global",
        "inLanguage": "fr",
        "publisher": {
          "@type": "Organization",
          "name": "Association pour la Modernisation du Clavier Français",
          "alternateName": "AMCF",
          "logo": {
            "@type": "ImageObject",
            "url": "https://azerty.global/assets/favicon-azerty-global.png"
          }
        }
      },
    ],
  },
  {
    slug: "crochets",
    nomTitre: "les crochets [ ]",
    title: "Crochets [ ] : comment les taper au clavier – AZERTY Global",
    description: "Avec AZERTY Global, gratuit, tapez [ ] avec AltGr + J et AltGr + K sur la rangée de repos. Idéal pour Markdown, tableaux et code.",
    canonicalPath: "/crochets",
    ogType: "article",
    testeur: {
      module: 4,
      lecon: 2,
    },
    caractere: {
      glyphe: "[ ]",
      ariaLabel: "Copier [ ] dans le presse-papier",
      bulle: {
        copie: "[ ] copiés",
        pronom: "les",
        raccourci: "<span class=\"insecable\">AltGr + <kbd>J</kbd></span> et <span class=\"insecable\">AltGr + <kbd>K</kbd></span> (<span class=\"insecable\">Option ⌥</span> au lieu d’AltGr sur Mac)",
      },
    },
    heros: {
      titre: "Comment taper les crochets [ ] au clavier ?",
      intro: "Sur l’AZERTY traditionnel de Windows, <strong>les crochets [ ]</strong> se tapent avec <strong>AltGr + 5</strong> et <strong>AltGr + °</strong>, loin l’un de l’autre sur la rangée des chiffres. Avec <a href=\"/download\" data-mesure-emplacement=\"intro\">AZERTY Global</a>, une disposition de clavier gratuite à installer sur Windows, macOS et Linux, tapez <strong>AltGr + J</strong> et <strong>AltGr + K</strong> (<strong>Option ⌥</strong> au lieu d’AltGr sur Mac).",
      definition: "<strong>Les crochets [&nbsp;]</strong>, ce sont les parenthèses à angles droits qui, dans une citation, signalent un passage coupé […] ou un mot ajouté (<a href=\"https://vitrinelinguistique.oqlf.gouv.qc.ca/23209/la-redaction-et-la-communication/bibliographie-et-citations/citations/citation-modifiee\">Office québécois de la langue française, «&nbsp;Citation modifiée&nbsp;»</a>), et qui servent en code aux tableaux, aux index et aux liens Markdown.",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>5</kbd> / <kbd>°</kbd>",
        ],
        note: "rangée des chiffres",
      },
      {
        systeme: "macOS",
        raccourcis: [
          "<kbd>Option</kbd> + <kbd>Maj</kbd> + <kbd>(</kbd> / <kbd>)</kbd>",
        ],
        note: "prévu par Apple",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>5</kbd> / <kbd>°</kbd>",
        ],
        note: "comme sur Windows",
      },
    ],
    solution: {
      titre: "Comment taper les crochets [ ] avec AZERTY Global ?",
      plateformes: "Windows et Linux : AltGr ; macOS : Option ⌥ (gauche ou droite)",
      noteSystemes: "Option ⌥ au lieu d’AltGr sur Mac",
      equations: [
        {
          touches: "<kbd>AltGr</kbd> + <kbd>J</kbd> / <kbd>K</kbd>",
          resultat: "[ ]",
        },
      ],
      note: "Les deux gestes sont côte à côte sur la rangée de repos. Pratique pour Markdown, tableaux et code.",
    },
    pourquoi: {
      titre: "Pourquoi mettre [ ] sur la rangée de repos ?",
      cartes: [
        {
          titre: "Les crochets sont partout en code",
          texte: "Tableaux, index, listes, attributs, Markdown : les crochets servent à structurer, cibler et référencer. Ce ne sont pas des symboles secondaires pour quelqu’un qui code.",
        },
        {
          titre: "J et K tombent sous les doigts",
          texte: "<kbd>AltGr</kbd> + <kbd>J</kbd> / <kbd>K</kbd> ouvre et ferme. Les deux touches sont côte à côte sous la main droite, donc le geste se retient vite.",
        },
      ],
    },
    questions: {
      titre: "Questions fréquentes sur les crochets [ ]",
      liste: [
        {
          question: "Comment faire des crochets sur un clavier AZERTY&#8239;?",
          reponse: "Sur l’AZERTY traditionnel de Windows, tapez <kbd>AltGr</kbd> + <kbd>5</kbd> pour [ et <kbd>AltGr</kbd> + <kbd>)</kbd> pour ], sur la touche à droite du <kbd>0</kbd>. Les deux touches sont loin l’une de l’autre sur la rangée des chiffres. Avec AZERTY Global, tapez <kbd>AltGr</kbd> + <kbd>J</kbd> pour [ et <kbd>AltGr</kbd> + <kbd>K</kbd> pour ], côte à côte sous la main droite.",
        },
        {
          question: "Comment faire des crochets sur Mac&#8239;?",
          reponse: "Sur la disposition Apple «&nbsp;Français&nbsp;», tapez <kbd>Option</kbd> + <kbd>Maj</kbd> + <kbd>(</kbd> pour [ et <kbd>Option</kbd> + <kbd>Maj</kbd> + <kbd>)</kbd> pour ]. Avec AZERTY Global sur Mac, tapez <kbd>Option</kbd> + <kbd>J</kbd> pour [ et <kbd>Option</kbd> + <kbd>K</kbd> pour ].",
        },
        {
          question: "Comment faire des crochets sous Linux&#8239;?",
          reponse: "Avec l’AZERTY français par défaut de Linux, les gestes sont ceux de Windows&nbsp;: <kbd>AltGr</kbd> + <kbd>5</kbd> pour [ et <kbd>AltGr</kbd> + <kbd>)</kbd> pour ]. Avec AZERTY Global, <kbd>AltGr</kbd> + <kbd>J</kbd> et <kbd>AltGr</kbd> + <kbd>K</kbd>, comme sous Windows.",
        },
        {
          question: "À quoi servent les crochets [&nbsp;]&#8239;?",
          reponse: "Dans un texte, […] signale une coupure dans une citation, et les crochets encadrent un mot ajouté par celui qui cite. En code et en Markdown, ils servent aux tableaux, aux index et aux liens.",
        },
        {
          question: "Comment copier-coller des crochets&#8239;?",
          reponse: "Cliquez sur le bouton Copier en haut de cette page&nbsp;: [&nbsp;] sont copiés. Collez-les avec <kbd>Ctrl</kbd> + <kbd>V</kbd>, ou <kbd>Cmd</kbd> + <kbd>V</kbd> sur Mac. Pour les taper sans copier-coller, AZERTY Global met [ sur <kbd>AltGr</kbd> + <kbd>J</kbd> et ] sur <kbd>AltGr</kbd> + <kbd>K</kbd> (<kbd>Option</kbd> au lieu d’<kbd>AltGr</kbd> sur Mac).",
        },
      ],
    },
    suite: {
      titre: "Qu’apporte d’autre AZERTY Global ?",
      sousTitre: "Les crochets font partie d’un ensemble complet de symboles développeurs mieux placés.",
      cartes: [
        {
          titre: "Accolades sur D / F",
          texte: "Les accolades suivent la même logique : <kbd>AltGr</kbd> + <kbd>D</kbd> et <kbd>AltGr</kbd> + <kbd>F</kbd>, elles aussi sur la rangée de repos.",
        },
        {
          titre: "Barres sur G / H",
          texte: "L’antislash et la barre verticale sont accessibles avec <kbd>AltGr</kbd> + <kbd>G</kbd> et <kbd>AltGr</kbd> + <kbd>H</kbd>, pratiques pour terminal, chemins et pipes.",
        },
        {
          titre: "Symboles techniques",
          texte: "Dièse, accent grave vif, tilde et circonflexe sont prévus pour les usages dev, Markdown, shell et configuration.",
        },
        {
          titre: "Arobase directe",
          texte: "L’arobase est en accès direct sur la touche <kbd>²</kbd>, en haut à gauche du clavier. Utile pour e-mails, identifiants et code.",
        },
      ],
    },
    voirAussi: {
      liens: [
        {
          href: "/e-aigu-majuscule",
          libelle: "É majuscule",
        },
        {
          href: "/e-grave-majuscule",
          libelle: "È majuscule",
        },
        {
          href: "/c-cedille-majuscule",
          libelle: "Ç majuscule",
        },
        {
          href: "/a-grave-majuscule",
          libelle: "À majuscule",
        },
        {
          href: "/e-dans-l-o",
          libelle: "œ Œ (e dans l’o)",
        },
        {
          href: "/e-dans-l-a",
          libelle: "æ Æ (e dans l’a)",
        },
        {
          href: "/guillemets",
          libelle: "« » (guillemets français)",
        },
        {
          href: "/arobase",
          libelle: "Arobase @",
        },
        {
          href: "/accolades",
          libelle: "Accolades { }",
        },
        {
          href: "/tiret-cadratin",
          libelle: "Tirets – —",
        },
      ],
      guideTypographique: false,
    },
    partage: "https://twitter.com/intent/tweet?text=J%E2%80%99ai%20enfin%20trouv%C3%A9%20comment%20taper%20%5B%20%5D%20facilement%20gr%C3%A2ce%20%C3%A0%20%40AZERTY_Global%20%21%20Testez%20en%20ligne%2C%20c%E2%80%99est%20gratuit%20%F0%9F%91%89%20azerty.global%2Fcrochets",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Comment taper les crochets [ ] sur Windows ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Avec AZERTY Global, appuyez sur AltGr + J pour [ et AltGr + K pour ]. Les deux touches sont côte à côte sur la rangée de repos."
            }
          },
          {
            "@type": "Question",
            "name": "Comment taper les crochets [ ] sur Mac ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Avec AZERTY Global sur macOS, les crochets utilisent les mêmes gestes que sur Windows et Linux : AltGr + J pour [ et AltGr + K pour ]."
            }
          },
          {
            "@type": "Question",
            "name": "Comment taper les crochets [ ] sur Linux ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Avec AZERTY Global sur Linux, appuyez sur AltGr + J pour [ et AltGr + K pour ]. Les crochets sont sur la rangée de repos."
            }
          },
          {
            "@type": "Question",
            "name": "Pourquoi les crochets sont-ils importants pour les développeurs ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Les crochets [ ] sont utilisés dans les tableaux, les index, Markdown, les références et de nombreux langages. AZERTY Global les place sur J et K avec AltGr, accessibles sans quitter la rangée de repos."
            }
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "Comment taper les crochets [ ] facilement",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Télécharger AZERTY Global",
            "text": "Installez gratuitement la disposition AZERTY Global pour Windows, macOS ou Linux.",
            "url": "https://azerty.global/download"
          },
          {
            "@type": "HowToStep",
            "name": "AltGr + J pour [",
            "text": "Maintenez AltGr et appuyez sur J pour obtenir le crochet ouvrant [."
          },
          {
            "@type": "HowToStep",
            "name": "AltGr + K pour ]",
            "text": "Maintenez AltGr et appuyez sur K pour obtenir le crochet fermant ]."
          }
        ],
        "totalTime": "PT3M",
        "tool": {
          "@type": "HowToTool",
          "name": "Clavier AZERTY Global"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Accueil",
            "item": "https://azerty.global/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Crochets",
            "item": "https://azerty.global/crochets"
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "AZERTY Global",
        "alternateName": "AZERTY Global 2026",
        "url": "https://azerty.global",
        "inLanguage": "fr",
        "publisher": {
          "@type": "Organization",
          "name": "Association pour la Modernisation du Clavier Français",
          "alternateName": "AMCF",
          "logo": {
            "@type": "ImageObject",
            "url": "https://azerty.global/assets/favicon-azerty-global.png"
          }
        }
      },
    ],
  },
  {
    slug: "accolades",
    nomTitre: "les accolades { }",
    title: "Accolades { } : comment les taper au clavier – AZERTY Global",
    description: "Avec AZERTY Global, gratuit, tapez { } avec AltGr + D et AltGr + F sur la rangée de repos. Idéal pour CSS, JavaScript et JSON.",
    canonicalPath: "/accolades",
    ogType: "article",
    testeur: {
      module: 4,
      lecon: 0,
    },
    caractere: {
      glyphe: "{ }",
      ariaLabel: "Copier { } dans le presse-papier",
      bulle: {
        copie: "{ } copiées",
        pronom: "les",
        raccourci: "<span class=\"insecable\">AltGr + <kbd>D</kbd></span> et <span class=\"insecable\">AltGr + <kbd>F</kbd></span> (<span class=\"insecable\">Option ⌥</span> au lieu d’AltGr sur Mac)",
      },
    },
    heros: {
      titre: "Comment taper les accolades { } au clavier ?",
      intro: "Sur l’AZERTY traditionnel de Windows, <strong>les accolades { }</strong> se tapent avec <strong>AltGr + 4</strong> et <strong>AltGr + =</strong>, loin l’une de l’autre sur la rangée des chiffres. Avec <a href=\"/download\" data-mesure-emplacement=\"intro\">AZERTY Global</a>, une disposition de clavier gratuite à installer sur Windows, macOS et Linux, tapez <strong>AltGr + D</strong> et <strong>AltGr + F</strong> (<strong>Option ⌥</strong> au lieu d’AltGr sur Mac).",
      definition: "<strong>Les accolades {&nbsp;}</strong>, ce sont les signes qui ouvrent et ferment un bloc ou un objet en code (CSS, JavaScript, JSON) et qui notent un ensemble en mathématiques, comme {1, 2, 3}.",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>4</kbd> / <kbd>=</kbd>",
        ],
        note: "rangée des chiffres",
      },
      {
        systeme: "macOS",
        raccourcis: [
          "<kbd>Option</kbd> + <kbd>(</kbd> / <kbd>)</kbd>",
        ],
        note: "prévu par Apple",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>4</kbd> / <kbd>=</kbd>",
        ],
        note: "comme sur Windows",
      },
    ],
    solution: {
      titre: "Comment taper les accolades { } avec AZERTY Global ?",
      plateformes: "Windows et Linux : AltGr ; macOS : Option ⌥ (gauche ou droite)",
      noteSystemes: "Option ⌥ au lieu d’AltGr sur Mac",
      equations: [
        {
          touches: "<kbd>AltGr</kbd> + <kbd>D</kbd> / <kbd>F</kbd>",
          resultat: "{ }",
        },
      ],
      note: "Les deux gestes sont côte à côte sur la rangée de repos. Pratique pour CSS, JavaScript et JSON.",
    },
    pourquoi: {
      titre: "Pourquoi mettre { } sur la rangée de repos ?",
      cartes: [
        {
          titre: "Les accolades sont partout en code",
          texte: "CSS, JavaScript, JSON, C, Java : les accolades structurent les blocs, les objets et les règles. Ce ne sont pas des symboles secondaires pour quelqu’un qui code.",
        },
        {
          titre: "D et F tombent sous les doigts",
          texte: "<kbd>AltGr</kbd> + <kbd>D</kbd> / <kbd>F</kbd> ouvre et ferme. Les deux touches sont côte à côte sur la rangée de repos, donc le geste se retient vite.",
        },
      ],
    },
    questions: {
      titre: "Questions fréquentes sur les accolades { }",
      liste: [
        {
          question: "Comment faire une accolade sur un clavier AZERTY&#8239;?",
          reponse: "Sur l’AZERTY traditionnel de Windows, tapez <kbd>AltGr</kbd> + <kbd>4</kbd> pour { et <kbd>AltGr</kbd> + <kbd>=</kbd> pour }. Les deux touches sont loin l’une de l’autre sur la rangée des chiffres. Avec AZERTY Global, tapez <kbd>AltGr</kbd> + <kbd>D</kbd> pour { et <kbd>AltGr</kbd> + <kbd>F</kbd> pour }, côte à côte sur la rangée de repos.",
        },
        {
          question: "Comment faire des accolades sur Mac&#8239;?",
          reponse: "Sur la disposition Apple «&nbsp;Français&nbsp;», tapez <kbd>Option</kbd> + <kbd>(</kbd> pour { et <kbd>Option</kbd> + <kbd>)</kbd> pour }. Avec AZERTY Global sur Mac, tapez <kbd>Option</kbd> + <kbd>D</kbd> pour { et <kbd>Option</kbd> + <kbd>F</kbd> pour }.",
        },
        {
          question: "Comment faire des accolades sous Linux&#8239;?",
          reponse: "Avec l’AZERTY français par défaut de Linux, les gestes sont ceux de Windows&nbsp;: <kbd>AltGr</kbd> + <kbd>4</kbd> pour { et <kbd>AltGr</kbd> + <kbd>=</kbd> pour }. Avec AZERTY Global, <kbd>AltGr</kbd> + <kbd>D</kbd> et <kbd>AltGr</kbd> + <kbd>F</kbd>, comme sous Windows.",
        },
        {
          question: "À quoi servent les accolades {&nbsp;}&#8239;?",
          reponse: "En code (CSS, JavaScript, JSON, C, Java), elles délimitent les blocs, les objets et les règles. En mathématiques, elles notent un ensemble, par exemple {1, 2, 3}.",
        },
        {
          question: "Comment copier-coller des accolades&#8239;?",
          reponse: "Cliquez sur le bouton Copier en haut de cette page&nbsp;: {&nbsp;} sont copiées. Collez-les avec <kbd>Ctrl</kbd> + <kbd>V</kbd>, ou <kbd>Cmd</kbd> + <kbd>V</kbd> sur Mac. Pour les taper sans copier-coller, AZERTY Global met { sur <kbd>AltGr</kbd> + <kbd>D</kbd> et } sur <kbd>AltGr</kbd> + <kbd>F</kbd> (<kbd>Option</kbd> au lieu d’<kbd>AltGr</kbd> sur Mac).",
        },
      ],
    },
    suite: {
      titre: "Qu’apporte d’autre AZERTY Global ?",
      sousTitre: "Les accolades font partie d’un ensemble complet de symboles développeurs mieux placés.",
      cartes: [
        {
          titre: "Crochets sur J / K",
          texte: "Les crochets suivent la même logique : <kbd>AltGr</kbd> + <kbd>J</kbd> et <kbd>AltGr</kbd> + <kbd>K</kbd>, eux aussi sur la rangée de repos.",
        },
        {
          titre: "Barres sur G / H",
          texte: "L’antislash et la barre verticale sont accessibles avec <kbd>AltGr</kbd> + <kbd>G</kbd> et <kbd>AltGr</kbd> + <kbd>H</kbd>, pratiques pour terminal, chemins et pipes.",
        },
        {
          titre: "Symboles techniques",
          texte: "Dièse, accent grave vif, tilde et circonflexe sont prévus pour les usages dev, Markdown, shell et configuration.",
        },
        {
          titre: "Arobase directe",
          texte: "L’arobase est en accès direct sur la touche <kbd>²</kbd>, en haut à gauche du clavier. Utile pour e-mails, identifiants et code.",
        },
      ],
    },
    voirAussi: {
      liens: [
        {
          href: "/e-aigu-majuscule",
          libelle: "É majuscule",
        },
        {
          href: "/e-grave-majuscule",
          libelle: "È majuscule",
        },
        {
          href: "/c-cedille-majuscule",
          libelle: "Ç majuscule",
        },
        {
          href: "/a-grave-majuscule",
          libelle: "À majuscule",
        },
        {
          href: "/e-dans-l-o",
          libelle: "œ Œ (e dans l’o)",
        },
        {
          href: "/e-dans-l-a",
          libelle: "æ Æ (e dans l’a)",
        },
        {
          href: "/guillemets",
          libelle: "« » (guillemets français)",
        },
        {
          href: "/arobase",
          libelle: "Arobase @",
        },
        {
          href: "/crochets",
          libelle: "Crochets [ ]",
        },
        {
          href: "/tiret-cadratin",
          libelle: "Tirets – —",
        },
      ],
      guideTypographique: false,
    },
    partage: "https://twitter.com/intent/tweet?text=J%E2%80%99ai%20enfin%20trouv%C3%A9%20comment%20taper%20%7B%20%7D%20facilement%20gr%C3%A2ce%20%C3%A0%20%40AZERTY_Global%20%21%20Testez%20en%20ligne%2C%20c%E2%80%99est%20gratuit%20%F0%9F%91%89%20azerty.global%2Faccolades",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Comment taper les accolades { } sur Windows ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Avec AZERTY Global, appuyez sur AltGr + D pour { et AltGr + F pour }. Les deux touches sont côte à côte sur la rangée de repos."
            }
          },
          {
            "@type": "Question",
            "name": "Comment taper les accolades { } sur Mac ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Avec AZERTY Global sur macOS, les accolades utilisent les mêmes gestes que sur Windows et Linux : AltGr + D pour { et AltGr + F pour }."
            }
          },
          {
            "@type": "Question",
            "name": "Comment taper les accolades { } sur Linux ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Avec AZERTY Global sur Linux, appuyez sur AltGr + D pour { et AltGr + F pour }. Les accolades sont sur la rangée de repos."
            }
          },
          {
            "@type": "Question",
            "name": "Pourquoi les accolades sont-elles importantes pour les développeurs ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Les accolades { } sont utilisées en CSS, JavaScript, JSON, C, Java et dans de nombreux langages. AZERTY Global les place sur D et F avec AltGr, accessibles sans quitter la rangée de repos."
            }
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "Comment taper les accolades { } facilement",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Télécharger AZERTY Global",
            "text": "Installez gratuitement la disposition AZERTY Global pour Windows, macOS ou Linux.",
            "url": "https://azerty.global/download"
          },
          {
            "@type": "HowToStep",
            "name": "AltGr + D pour {",
            "text": "Maintenez AltGr et appuyez sur D pour obtenir l'accolade ouvrante {."
          },
          {
            "@type": "HowToStep",
            "name": "AltGr + F pour }",
            "text": "Maintenez AltGr et appuyez sur F pour obtenir l'accolade fermante }."
          }
        ],
        "totalTime": "PT3M",
        "tool": {
          "@type": "HowToTool",
          "name": "Clavier AZERTY Global"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Accueil",
            "item": "https://azerty.global/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Accolades",
            "item": "https://azerty.global/accolades"
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "AZERTY Global",
        "alternateName": "AZERTY Global 2026",
        "url": "https://azerty.global",
        "inLanguage": "fr",
        "publisher": {
          "@type": "Organization",
          "name": "Association pour la Modernisation du Clavier Français",
          "alternateName": "AMCF",
          "logo": {
            "@type": "ImageObject",
            "url": "https://azerty.global/assets/favicon-azerty-global.png"
          }
        }
      },
    ],
  },
  {
    slug: "tiret-cadratin",
    nomTitre: "les tirets – et —",
    title: "Tiret long — et tiret – : comment les taper au clavier – AZERTY Global",
    description: "Vous cherchez le tiret long, le tiret ChatGPT ou le tiret de dialogue ? Tapez – et — au clavier AZERTY avec AltGr + T et AltGr + Maj + T.",
    canonicalPath: "/tiret-cadratin",
    ogType: "article",
    ogDescription: "Vous cherchez le tiret long, le tiret ChatGPT ou le tiret de dialogue ? Avec AZERTY Global, AltGr + T = – et AltGr + Maj + T = —.",
    testeur: {
      module: 3,
      lecon: 2,
    },
    caractere: {
      glyphe: "– —",
      ariaLabel: "Copier – — dans le presse-papier",
      bulle: {
        copie: "– — copiés",
        pronom: "les",
        raccourci: "<span class=\"insecable\">AltGr + <kbd>T</kbd></span> et <span class=\"insecable\">AltGr + Maj + <kbd>T</kbd></span> (<span class=\"insecable\">Option ⌥</span> au lieu d’AltGr sur Mac)",
      },
    },
    heros: {
      titre: "Comment taper le tiret long — et le tiret – au clavier ?",
      intro: "Sur l’AZERTY traditionnel de Windows, <strong>le tiret cadratin —</strong> demande le code <strong>Alt + 0151</strong> et un pavé numérique. Avec <a href=\"/download\" data-mesure-emplacement=\"intro\">AZERTY Global</a>, une disposition de clavier gratuite à installer sur Windows, macOS et Linux, tapez <strong>AltGr + Maj + T</strong>, et <strong>AltGr + T</strong> pour le tiret –.",
      definition: "<strong>Le tiret cadratin —</strong>, c’est le tiret le plus long, à ne pas confondre avec le trait d’union -, qui sert notamment à indiquer un changement de personne dans un dialogue ou à mettre un passage en valeur (<a href=\"https://vitrinelinguistique.oqlf.gouv.qc.ca/fiche-gdt/fiche/8392388/tiret-cadratin\">Office québécois de la langue française, «&nbsp;tiret cadratin&nbsp;»</a>).",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>Alt</kbd> + <kbd>0150</kbd>",
          "<kbd>Alt</kbd> + <kbd>0151</kbd>",
        ],
        note: "avec pavé numérique",
      },
      {
        systeme: "macOS",
        raccourcis: [
          "<kbd>Option</kbd> + <kbd>Maj</kbd> + <kbd>-</kbd>",
          "<kbd>Option</kbd> + <kbd>-</kbd>",
        ],
        note: "prévu par Apple",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>5</kbd>",
          "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>4</kbd>",
        ],
        note: "disposition Français (variante)",
      },
    ],
    solution: {
      titre: "Comment taper les tirets – et — avec AZERTY Global ?",
      plateformes: "Windows et Linux : AltGr ; macOS : Option ⌥ (gauche ou droite)",
      noteSystemes: "Option ⌥ au lieu d’AltGr sur Mac",
      equations: [
        {
          touches: "<kbd>AltGr</kbd> + <kbd>T</kbd>",
          resultat: "–",
        },
        {
          touches: "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>T</kbd>",
          resultat: "—",
        },
      ],
      note: "Les mêmes tirets typographiques, sans mémoriser Alt + 0150 ou Alt + 0151.",
    },
    pourquoi: {
      titre: "Quel tiret utiliser ?",
      cartes: [
        {
          titre: "— Le tiret cadratin",
          texte: "C’est le « tiret long » : il sert aux incises et aux dialogues. On l’appelle aussi « tiret de dialogue » ou, plus récemment, « tiret ChatGPT ».",
        },
        {
          titre: "– Le demi-cadratin",
          texte: "Le tiret demi-cadratin sert dans les intervalles : <strong>2020–2026</strong>, <strong>Paris–Lyon</strong>, <strong>pages 12–18</strong>.",
        },
        {
          titre: "Les faux tirets",
          texte: "Remplacer tous les tirets par un simple <kbd>-</kbd>, c’est pratique, mais moins précis et moins propre dans un texte soigné.",
        },
      ],
    },
    questions: {
      titre: "Questions fréquentes sur les tirets – et —",
      liste: [
        {
          question: "Comment faire un tiret long au clavier&#8239;?",
          reponse: "Le tiret long s’appelle tiret cadratin&nbsp;: —. Sur l’AZERTY traditionnel de Windows, il n’a pas de touche&nbsp;: maintenez <kbd>Alt</kbd> et tapez <kbd>0151</kbd> sur le pavé numérique. Avec AZERTY Global, tapez <kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>T</kbd>.",
        },
        {
          question: "Quel est le code Alt du tiret cadratin&#8239;?",
          reponse: "<kbd>Alt</kbd> + <kbd>0151</kbd> donne le tiret cadratin —, <kbd>Alt</kbd> + <kbd>0150</kbd> le tiret demi-cadratin –. Les deux codes demandent un pavé numérique avec Verr. Num. activé&nbsp;: sur un portable sans pavé, ils ne marchent pas. AZERTY Global met les deux tirets sur la touche <kbd>T</kbd>&nbsp;: <kbd>AltGr</kbd> + <kbd>T</kbd> pour –, <kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>T</kbd> pour —.",
        },
        {
          question: "Comment faire un tiret cadratin sur Mac&#8239;?",
          reponse: "Sur la disposition Apple «&nbsp;Français&nbsp;», <kbd>Option</kbd> + <kbd>-</kbd> donne le tiret cadratin — et <kbd>Option</kbd> + <kbd>Maj</kbd> + <kbd>-</kbd> le tiret demi-cadratin –. Avec AZERTY Global sur Mac, tapez <kbd>Option</kbd> + <kbd>Maj</kbd> + <kbd>T</kbd> pour — et <kbd>Option</kbd> + <kbd>T</kbd> pour –.",
        },
        {
          question: "Quelle est la différence entre -, – et —&#8239;?",
          reponse: "Le trait d’union -, sur la touche <kbd>6</kbd>, est le plus court&nbsp;: il lie les mots composés (porte-monnaie). Le tiret demi-cadratin – sert surtout aux intervalles, par exemple 2020–2026. Le tiret cadratin —, le plus long, sert aux incises, aux ruptures de phrase et aux dialogues.",
        },
        {
          question: "Quel est le tiret de ChatGPT&#8239;?",
          reponse: "Le tiret long fréquent dans les textes de ChatGPT et d’autres IA est le tiret cadratin —. Sur l’AZERTY traditionnel de Windows, il demande <kbd>Alt</kbd> + <kbd>0151</kbd> et un pavé numérique&nbsp;; avec AZERTY Global, <kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>T</kbd>.",
        },
        {
          question: "Quel tiret utiliser pour un dialogue&#8239;?",
          reponse: "En français, une réplique de dialogue s’ouvre par un tiret cadratin suivi d’une espace insécable&nbsp;: «&nbsp;—&nbsp;Tu viens&#8239;? —&nbsp;Oui&#8239;!&nbsp;». Avec AZERTY Global, le tiret cadratin se tape avec <kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>T</kbd>.",
        },
      ],
    },
    suite: {
      titre: "Qu’apporte d’autre AZERTY Global ?",
      sousTitre: "Les tirets typographiques font partie des caractères utiles pour écrire un français correct.",
      cartes: [
        {
          titre: "Guillemets français",
          texte: "Les guillemets <kbd>«</kbd> <kbd>»</kbd> sont accessibles avec <kbd>AltGr</kbd> + <kbd>W</kbd> et <kbd>AltGr</kbd> + <kbd>X</kbd>.",
        },
        {
          titre: "Majuscules accentuées",
          texte: "É, È, Ç et À se tapent naturellement avec le Verrouillage Majuscule, sans codes à mémoriser.",
        },
        {
          titre: "Œ et Æ",
          texte: "Les caractères <kbd>œ</kbd>, <kbd>Œ</kbd>, <kbd>æ</kbd> et <kbd>Æ</kbd> sont disponibles sans passer par une table de caractères.",
        },
        {
          titre: "Espaces et ponctuation",
          texte: "L’objectif est le même : rendre les bons caractères faciles à taper, dans les e-mails, les documents et le web.",
        },
      ],
    },
    voirAussi: {
      liens: [
        {
          href: "/e-aigu-majuscule",
          libelle: "É majuscule",
        },
        {
          href: "/e-grave-majuscule",
          libelle: "È majuscule",
        },
        {
          href: "/c-cedille-majuscule",
          libelle: "Ç majuscule",
        },
        {
          href: "/a-grave-majuscule",
          libelle: "À majuscule",
        },
        {
          href: "/e-dans-l-o",
          libelle: "œ Œ (e dans l’o)",
        },
        {
          href: "/e-dans-l-a",
          libelle: "æ Æ (e dans l’a)",
        },
        {
          href: "/guillemets",
          libelle: "« » (guillemets français)",
        },
        {
          href: "/arobase",
          libelle: "Arobase @",
        },
        {
          href: "/crochets",
          libelle: "Crochets [ ]",
        },
        {
          href: "/accolades",
          libelle: "Accolades { }",
        },
      ],
      guideTypographique: true,
    },
    partage: "https://twitter.com/intent/tweet?text=J%27ai%20enfin%20trouv%C3%A9%20comment%20taper%20les%20tirets%20%E2%80%93%20et%20%E2%80%94%20facilement%20gr%C3%A2ce%20%C3%A0%20%40AZERTY_Global%20%21%20Testez%20en%20ligne%2C%20c%27est%20gratuit%20%F0%9F%91%89%20azerty.global%2Ftiret-cadratin",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Comment taper le tiret demi-cadratin – sur Windows ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Avec AZERTY Global, appuyez sur AltGr + T pour obtenir le tiret demi-cadratin –. Sur Windows sans AZERTY Global, on utilise souvent Alt + 0150 avec le pavé numérique."
            }
          },
          {
            "@type": "Question",
            "name": "Comment taper le tiret cadratin — sur Windows ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Avec AZERTY Global, appuyez sur AltGr + Maj + T pour obtenir le tiret cadratin —. Sur Windows sans AZERTY Global, on utilise souvent Alt + 0151 avec le pavé numérique."
            }
          },
          {
            "@type": "Question",
            "name": "Comment taper le tiret ChatGPT ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Le tiret long que l’on remarque souvent dans les textes générés par ChatGPT est généralement le tiret cadratin —. Avec AZERTY Global, appuyez sur AltGr + Maj + T pour le taper directement."
            }
          },
          {
            "@type": "Question",
            "name": "Quel tiret utiliser pour un dialogue en français ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Pour introduire une réplique de dialogue en français, on utilise généralement le tiret cadratin —. Avec AZERTY Global, il se tape avec AltGr + Maj + T."
            }
          },
          {
            "@type": "Question",
            "name": "Quelle est la différence entre – et — ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Le tiret demi-cadratin – sert souvent aux intervalles, par exemple 2020–2026. Le tiret cadratin — sert aux incises, aux ruptures de phrase et aux dialogues."
            }
          },
          {
            "@type": "Question",
            "name": "Faut-il acheter un nouveau clavier pour taper – et — ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Non. AZERTY Global est une disposition logicielle gratuite : vous gardez votre clavier AZERTY physique et vous ajoutez des raccourcis plus simples pour les tirets typographiques."
            }
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "Comment taper les tirets – et — facilement",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Télécharger AZERTY Global",
            "text": "Installez gratuitement la disposition AZERTY Global pour Windows, macOS ou Linux.",
            "url": "https://azerty.global/download"
          },
          {
            "@type": "HowToStep",
            "name": "Taper le tiret demi-cadratin –",
            "text": "Maintenez AltGr et appuyez sur T pour obtenir le tiret demi-cadratin –."
          },
          {
            "@type": "HowToStep",
            "name": "Taper le tiret cadratin —",
            "text": "Maintenez AltGr et Maj, puis appuyez sur T pour obtenir le tiret cadratin —."
          }
        ],
        "totalTime": "PT3M",
        "tool": {
          "@type": "HowToTool",
          "name": "Clavier AZERTY Global"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Accueil",
            "item": "https://azerty.global/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Tirets",
            "item": "https://azerty.global/tiret-cadratin"
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "AZERTY Global",
        "alternateName": "AZERTY Global 2026",
        "url": "https://azerty.global",
        "inLanguage": "fr",
        "publisher": {
          "@type": "Organization",
          "name": "Association pour la Modernisation du Clavier Français",
          "alternateName": "AMCF",
          "logo": {
            "@type": "ImageObject",
            "url": "https://azerty.global/assets/favicon-azerty-global.png"
          }
        }
      },
    ],
  },
];

/* ——— Mini-essai de chaque page ———
   Textes choisis par Antoine (QCM du 2026-09-30, session 51cbf167 ; relevé :
   operations/2026-09-29-contenu-lecons/decisions.md, « textes du mini-essai
   des landings »). Le caractère trois fois, puis une phrase de 10 à 25
   caractères. Pages de majuscules : phrase en capitales, Verr. Maj. allumé de
   bout en bout. Retour « A » : ce que les mêmes touches écrivent sur l'AZERTY
   traditionnel (calculé au build) ; retour « C » : la méthode classique.
   Dans les consignes, [[x]] désigne une touche (<kbd>). Espaces : NB insécable,
   FI fine insécable ; la frappe les tolère (l'espace vaut l'insécable). */
const NB = " ";
const FI = " ";
const MAJUSCULES = "ÉÈÀÇÊÂÎÔÛËÏÜŸ";
const TRAD = "Sur l’AZERTY traditionnel de Windows, ";
const CONSIGNE_PHRASE = "Maintenant, dans une phrase.";
const CONSIGNE_VERR = "Maintenant, toute une phrase : gardez Verr. Maj. activé.";
const CONSIGNE_CODE = "Maintenant, dans une ligne de code.";

function essaiMajuscule(lettre, touche, phrase) {
  return {
    texte1: `${lettre} ${lettre} ${lettre}`,
    consigne1: `Activez Verr. Maj., puis appuyez sur [[${touche}]].`,
    phrase,
    consigne2: CONSIGNE_VERR,
    verr: true,
    focus: MAJUSCULES,
    retour: "A",
  };
}

const ESSAIS = {
  "e-aigu-majuscule": essaiMajuscule("É", "é", "ÉCOLE ÉLÉMENTAIRE"),
  "e-grave-majuscule": essaiMajuscule("È", "è", "PREMIÈRE FOIS À LIÈGE"),
  "c-cedille-majuscule": essaiMajuscule("Ç", "ç", "LEÇON DE FRANÇAIS"),
  "a-grave-majuscule": essaiMajuscule("À", "à", `À BAS LES LUNDIS${FI}!`),
  "e-dans-l-o": {
    texte1: "œ œ œ",
    consigne1: "Maintenez AltGr, puis appuyez sur [[O]].",
    phrase: "Ma sœur a bon cœur.",
    consigne2: CONSIGNE_PHRASE,
    focus: "œŒ",
    retour: "C",
    classique: `${TRAD}œ n’a pas de touche : Alt + 0156 sur le pavé numérique, ou le copier-coller.`,
  },
  "e-dans-l-a": {
    texte1: "æ æ æ",
    consigne1: "Maintenez AltGr, puis appuyez sur [[A]].",
    phrase: "Lætitia et Luc, ex æquo",
    consigne2: CONSIGNE_PHRASE,
    focus: "æÆ",
    retour: "C",
    classique: `${TRAD}æ n’a pas de touche : Alt + 0230 sur le pavé numérique, ou le copier-coller.`,
  },
  guillemets: {
    texte1: `«${NB}» «${NB}» «${NB}»`,
    consigne1: "Maintenez AltGr : [[W]] pour «, [[X]] pour ».",
    phrase: `Maman a dit «${NB}non${NB}».`,
    consigne2: CONSIGNE_PHRASE,
    focus: "«»",
    retour: "C",
    classique: `${TRAD}les guillemets français n’ont pas de touche : Alt + 0171 pour «, Alt + 0187 pour », sur le pavé numérique.`,
  },
  arobase: {
    texte1: "@ @ @",
    consigne1: "Appuyez sur la touche [[²]], en haut à gauche.",
    phrase: "lea.martin@exemple.fr",
    consigne2: CONSIGNE_PHRASE,
    focus: "@.",
    retour: "A",
  },
  crochets: {
    texte1: "[ ] [ ] [ ]",
    consigne1: "Maintenez AltGr : [[J]] pour [, [[K]] pour ].",
    phrase: "[x, y] = [y, x]",
    consigne2: CONSIGNE_CODE,
    code: true,
    focus: "[]",
    retour: "C",
    classique: `${TRAD}[ et ] sont sur la rangée des chiffres : AltGr + [[5]] et AltGr + [[)]].`,
  },
  accolades: {
    texte1: "{ } { } { }",
    consigne1: "Maintenez AltGr : [[D]] pour {, [[F]] pour }.",
    phrase: '{"ville": "Dakar"}',
    consigne2: CONSIGNE_CODE,
    code: true,
    focus: "{}",
    retour: "C",
    classique: `${TRAD}{ et } sont sur la rangée des chiffres : AltGr + [[4]] et AltGr + [[=]].`,
  },
  "tiret-cadratin": {
    texte1: "— — —",
    consigne1: "Maintenez AltGr et Maj, puis appuyez sur [[T]].",
    phrase: `—${NB}Tu viens${FI}? —${NB}Oui${FI}!`,
    consigne2: CONSIGNE_PHRASE,
    focus: "—–",
    retour: "C",
    classique: `${TRAD}le tiret cadratin n’a pas de touche : Alt + 0151 sur le pavé numérique.`,
  },
};

/* Le layout attend des blocs JSON-LD déjà sérialisés (un <script> par bloc).
   ⛔ FAQPage n'est pas servi (D42 du 2026-09-14, audit v2) : les blocs restent
   dans les données, les questions restent affichées, seul le balisage sort. */
module.exports = pages.map((page) => ({
  ...page,
  essai: ESSAIS[page.slug],
  jsonLd: page.jsonLd
    .filter((bloc) => bloc["@type"] !== "FAQPage")
    .map((bloc) => JSON.stringify(bloc, null, 2)),
}));
