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
   - testeur { module, lecon } : leçon du testeur que la v1 ouvrait depuis la page
     (data-module / data-lesson de lazy-tester.js). Sans effet en v2 tant que
     /testeur n'existe pas (P14) ; conservé pour ne pas perdre l'appariement.
   - caractere { glyphe, ariaLabel } : la carte à glyphe vedette du héros (copie).
   - heros { titre, intro } : HTML inline (strong, kbd) — jamais de bloc.
   - methodes[3] { systeme, raccourcis[], note, noteCourte } : Windows, Mac,
     Linux, une ou
     deux combinaisons chacune.
   - solution { titre, plateformes, equations[] { touches, resultat }, note }.
   - pourquoi { titre, cartes[] { titre, texte } } : 2 à 4 cartes d'argument.
   - questions { titre, liste[] { question, reponse } } : facultatif (œ, guillemets).
   - suite { titre, sousTitre, cartes[] { titre, texte } } : « Et ce n'est pas tout ».
   - voirAussi { liens[] { href, libelle }, guideTypographique } : maillage entre
     les 11 pages (13 à 21 liens entrants par page : à conserver).
   - partage : URL de partage sur X.
   - jsonLd[] : objets (FAQPage, HowTo, BreadcrumbList, WebSite), sérialisés en
     sortie de ce module. ⚠️ D26 en attente : FAQPage reste tel quel, ni ajouté
     ni retiré.

   Les chaînes HTML gardent leurs entités (&nbsp;) et leurs espaces insécables
   littéraux : ce sont du texte rendu. ⛔ Aucune icône, aucun emoji : la v2 n'en
   porte pas (DA §1). */

const pages = [
  {
    slug: "e-aigu-majuscule",
    title: "É majuscule : comment le taper au clavier facilement",
    description: "Fini les Alt Codes, faites Verr. Maj. + é. Les méthodes Windows, macOS et Linux pour taper un É majuscule.",
    canonicalPath: "/e-aigu-majuscule",
    ogType: "article",
    ogDescription: "Avec AZERTY Global, Verr. Maj. + é = É. Installez gratuitement sur Windows, macOS, Linux.",
    testeur: {
      module: 1,
      lecon: 0,
    },
    caractere: {
      glyphe: "É",
      ariaLabel: "Copier É dans le presse-papier",
    },
    heros: {
      titre: "Comment taper É majuscule au clavier&nbsp;?",
      intro: "Tapez <strong>É majuscule</strong> avec <strong>Verr. Maj. + é</strong> sur Windows, macOS et Linux. Une solution simple, sans code Alt, sans pavé numérique et sans copier-coller.",
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
          "Maintenir <kbd>E</kbd> → É",
        ],
        note: "Menu : appuyez sur <strong>2</strong> ou cliquez sur É.",
        noteCourte: "choisir É dans le menu",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>é</kbd>",
        ],
        note: "AZERTY français par défaut. Pas très intuitif.",
        noteCourte: "peu intuitif",
      },
    ],
    solution: {
      titre: "Solution définitive – AZERTY Global",
      plateformes: "Windows, macOS, Linux",
      equations: [
        {
          touches: "<kbd>Verr. Maj.</kbd> + <kbd>é</kbd>",
          resultat: "É",
        },
      ],
      note: "Et aussi è → È, ç → Ç, à → À. 99&nbsp;% de vos frappes sont préservées.",
    },
    pourquoi: {
      titre: "Pourquoi vos méthodes actuelles sont obsolètes",
      cartes: [
        {
          titre: "Alt Codes",
          texte: "Devoir retenir Alt + 144 pour un É&nbsp;? C’est de l’informatique des années 80. De plus, sur les PC portables <strong>sans pavé numérique</strong>, c’est tout simplement <strong>impossible</strong>.",
        },
        {
          titre: "Copier-Coller",
          texte: "Ouvrir Google, rechercher «&nbsp;é&nbsp;majuscule&nbsp;», copier, revenir, coller. Vous perdez 15 secondes à chaque fois.",
        },
        {
          titre: "Raccourcis Word",
          texte: "<kbd>Ctrl</kbd> + <kbd>4</kbd> puis <kbd>Maj</kbd> + <kbd>E</kbd>... Sérieusement&nbsp;? Et dès que vous sortez de Word pour aller sur Facebook ou sur un navigateur web, ça ne marche plus.",
        },
        {
          titre: "Correcteur automatique",
          texte: "Le correcteur est pratique mais aléatoire. Dans un formulaire web ou pour un mot de passe, vous êtes bloqué.",
        },
      ],
    },
    suite: {
      titre: "Et ce n’est pas tout...",
      sousTitre: "Le É majuscule n’est que la partie émergée de l’iceberg de ce que propose AZERTY Global.",
      cartes: [
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point. Il est accessible directement, comme sur tous les claviers du monde.",
        },
        {
          titre: "@robase direct",
          texte: "Fini le <kbd>AltGr</kbd> + <kbd>0</kbd>. L’arobase est sur une touche dédiée à gauche de la touche <kbd>1</kbd>. Idéal pour les emails.",
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
              "text": "Sur la plupart des distributions Linux avec l'AZERTY français, appuyez sur AltGr + Maj + é pour obtenir É. Avec AZERTY Global, c'est plus simple : Verr. Maj. + é = É."
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
    title: "È majuscule : comment le taper au clavier facilement",
    description: "Fini les Alt Codes, faites Verr. Maj. + è. Les méthodes Windows, macOS et Linux pour taper un È majuscule.",
    canonicalPath: "/e-grave-majuscule",
    ogType: "article",
    ogDescription: "Avec AZERTY Global, Verr. Maj. + è = È. Installez gratuitement sur Windows, macOS, Linux.",
    testeur: {
      module: 1,
      lecon: 1,
    },
    caractere: {
      glyphe: "È",
      ariaLabel: "Copier È dans le presse-papier",
    },
    heros: {
      titre: "Comment taper È majuscule au clavier ?",
      intro: "Tapez <strong>È majuscule</strong> avec <strong>Verr. Maj. + è</strong> sur Windows, macOS et Linux. Une solution simple, sans code Alt, sans pavé numérique et sans copier-coller.",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>Alt</kbd> + <kbd>0200</kbd>",
        ],
        note: "Fonctionne uniquement avec le pavé numérique.",
        noteCourte: "pavé numérique requis",
      },
      {
        systeme: "Mac",
        raccourcis: [
          "Maintenir <kbd>E</kbd> → È",
        ],
        note: "Choisir È dans le menu ou cliquer dessus.",
        noteCourte: "choisir È dans le menu",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>è</kbd>",
        ],
        note: "AZERTY français par défaut. Pas très intuitif.",
        noteCourte: "peu intuitif",
      },
    ],
    solution: {
      titre: "Solution définitive – AZERTY Global",
      plateformes: "Windows, macOS, Linux",
      equations: [
        {
          touches: "<kbd>Verr. Maj.</kbd> + <kbd>è</kbd>",
          resultat: "È",
        },
      ],
      note: "Et aussi é → É, ç → Ç, à → À. 99 % de vos frappes sont préservées.",
    },
    pourquoi: {
      titre: "Pourquoi vos méthodes actuelles sont obsolètes",
      cartes: [
        {
          titre: "Alt Codes",
          texte: "Devoir retenir Alt + 0200 pour un È ? C’est de l’informatique des années 80. De plus, sur les PC portables <strong>sans pavé numérique</strong>, c’est tout simplement <strong>impossible</strong>.",
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
    suite: {
      titre: "Et ce n’est pas tout...",
      sousTitre: "Le È majuscule n’est que la partie émergée de l’iceberg de ce que propose AZERTY Global.",
      cartes: [
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point. Il est accessible directement, comme sur tous les claviers du monde.",
        },
        {
          titre: "@robase direct",
          texte: "Fini le <kbd>AltGr</kbd> + <kbd>0</kbd>. L’arobase est sur une touche dédiée à gauche de la touche <kbd>1</kbd>. Idéal pour les emails.",
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
              "text": "Sur la plupart des distributions Linux avec l’AZERTY français, appuyez sur AltGr + Maj + è pour obtenir È. Avec AZERTY Global, c’est plus simple : Verr. Maj. + è = È."
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
    title: "Ç majuscule : comment le taper au clavier facilement",
    description: "Fini les Alt Codes, faites Verr. Maj. + ç. Les méthodes Windows, macOS et Linux pour taper un Ç majuscule.",
    canonicalPath: "/c-cedille-majuscule",
    ogType: "article",
    ogDescription: "Avec AZERTY Global, Verr. Maj. + ç = Ç. Installez gratuitement sur Windows, macOS, Linux.",
    testeur: {
      module: 1,
      lecon: 2,
    },
    caractere: {
      glyphe: "Ç",
      ariaLabel: "Copier Ç dans le presse-papier",
    },
    heros: {
      titre: "Comment taper Ç majuscule au clavier ?",
      intro: "Tapez <strong>Ç majuscule</strong> avec <strong>Verr. Maj. + ç</strong> sur Windows, macOS et Linux. Une solution simple, sans code Alt, sans pavé numérique et sans copier-coller.",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>Alt</kbd> + <kbd>128</kbd>",
        ],
        note: "Fonctionne uniquement avec le pavé numérique.",
        noteCourte: "pavé numérique requis",
      },
      {
        systeme: "Mac",
        raccourcis: [
          "Maintenir <kbd>C</kbd> → Ç",
        ],
        note: "Choisir Ç dans le menu ou cliquer dessus.",
        noteCourte: "choisir Ç dans le menu",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>ç</kbd>",
        ],
        note: "AZERTY français par défaut. Pas très intuitif.",
        noteCourte: "peu intuitif",
      },
    ],
    solution: {
      titre: "Solution définitive – AZERTY Global",
      plateformes: "Windows, macOS, Linux",
      equations: [
        {
          touches: "<kbd>Verr. Maj.</kbd> + <kbd>ç</kbd>",
          resultat: "Ç",
        },
      ],
      note: "Et aussi é → É, è → È, à → À. 99 % de vos frappes sont préservées.",
    },
    pourquoi: {
      titre: "Pourquoi vos méthodes actuelles sont obsolètes",
      cartes: [
        {
          titre: "Alt Codes",
          texte: "Devoir retenir Alt + 128 pour un Ç ? C’est de l’informatique des années 80. De plus, sur les PC portables <strong>sans pavé numérique</strong>, c’est tout simplement <strong>impossible</strong>.",
        },
        {
          titre: "Copier-Coller",
          texte: "Ouvrir Google, rechercher « ç majuscule », copier, revenir, coller. Vous perdez 15 secondes à chaque fois.",
        },
        {
          titre: "Raccourcis Word",
          texte: "<kbd>Ctrl</kbd> + <kbd>,</kbd> puis <kbd>Maj</kbd> + <kbd>C</kbd>... Sérieusement ?",
        },
        {
          titre: "Correcteur automatique",
          texte: "Le correcteur est pratique mais aléatoire. Dans un formulaire web ou pour un mot de passe, vous êtes bloqué.",
        },
      ],
    },
    suite: {
      titre: "Et ce n’est pas tout...",
      sousTitre: "Le Ç majuscule n’est que la partie émergée de l’iceberg de ce que propose AZERTY Global.",
      cartes: [
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point. Il est accessible directement, comme sur tous les claviers du monde.",
        },
        {
          titre: "@robase direct",
          texte: "Fini le <kbd>AltGr</kbd> + <kbd>0</kbd>. L’arobase est sur une touche dédiée à gauche de la touche <kbd>1</kbd>. Idéal pour les emails.",
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
              "text": "Sur la plupart des distributions Linux avec l’AZERTY français, appuyez sur AltGr + Maj + ç pour obtenir Ç. Avec AZERTY Global, c’est plus simple : Verr. Maj. + ç = Ç."
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
    title: "À majuscule : comment le taper au clavier facilement",
    description: "Fini les Alt Codes, faites Verr. Maj. + à. Les méthodes Windows, macOS et Linux pour taper un À majuscule.",
    canonicalPath: "/a-grave-majuscule",
    ogType: "article",
    ogDescription: "Avec AZERTY Global, Verr. Maj. + à = À. Installez gratuitement sur Windows, macOS, Linux.",
    testeur: {
      module: 1,
      lecon: 3,
    },
    caractere: {
      glyphe: "À",
      ariaLabel: "Copier À dans le presse-papier",
    },
    heros: {
      titre: "Comment taper À majuscule au clavier ?",
      intro: "Tapez <strong>À majuscule</strong> avec <strong>Verr. Maj. + à</strong> sur Windows, macOS et Linux. Une solution simple, sans code Alt, sans pavé numérique et sans copier-coller.",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>Alt</kbd> + <kbd>0192</kbd>",
        ],
        note: "Fonctionne uniquement avec le pavé numérique.",
        noteCourte: "pavé numérique requis",
      },
      {
        systeme: "Mac",
        raccourcis: [
          "Maintenir <kbd>A</kbd> → À",
        ],
        note: "Choisir À dans le menu ou cliquer dessus.",
        noteCourte: "choisir À dans le menu",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>à</kbd>",
        ],
        note: "AZERTY français par défaut. Pas très intuitif.",
        noteCourte: "peu intuitif",
      },
    ],
    solution: {
      titre: "Solution définitive – AZERTY Global",
      plateformes: "Windows, macOS, Linux",
      equations: [
        {
          touches: "<kbd>Verr. Maj.</kbd> + <kbd>à</kbd>",
          resultat: "À",
        },
      ],
      note: "Et aussi é → É, è → È, ç → Ç. 99 % de vos frappes sont préservées.",
    },
    pourquoi: {
      titre: "Pourquoi vos méthodes actuelles sont obsolètes",
      cartes: [
        {
          titre: "Alt Codes",
          texte: "Devoir retenir Alt + 0192 pour un À ? C’est de l’informatique des années 80. De plus, sur les PC portables <strong>sans pavé numérique</strong>, c’est tout simplement <strong>impossible</strong>.",
        },
        {
          titre: "Copier-Coller",
          texte: "Ouvrir Google, rechercher « a majuscule », copier, revenir, coller. Vous perdez 15 secondes à chaque fois.",
        },
        {
          titre: "Touche morte système",
          texte: "<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>7</kbd> puis <kbd>Maj</kbd> + <kbd>A</kbd>... Sérieusement ?",
        },
        {
          titre: "Correcteur automatique",
          texte: "Le correcteur est pratique mais aléatoire. Dans un formulaire web ou pour un mot de passe, vous êtes bloqué.",
        },
      ],
    },
    suite: {
      titre: "Et ce n’est pas tout...",
      sousTitre: "Le À majuscule n’est que la partie émergée de l’iceberg de ce que propose AZERTY Global.",
      cartes: [
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point. Il est accessible directement, comme sur tous les claviers du monde.",
        },
        {
          titre: "@robase direct",
          texte: "Fini le <kbd>AltGr</kbd> + <kbd>0</kbd>. L’arobase est sur une touche dédiée à gauche de la touche <kbd>1</kbd>. Idéal pour les emails.",
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
              "text": "Sur la plupart des distributions Linux avec l’AZERTY français, appuyez sur AltGr + Maj + à pour obtenir À. Avec AZERTY Global, c’est plus simple : Verr. Maj. + à = À."
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
    title: "œ Œ à copier ou taper au clavier (e dans l’o) | AZERTY Global",
    description: "Copiez œ Œ en un clic ou tapez-les enfin au clavier : AltGr + O avec AZERTY Global, Alt 0156 sinon. Pour écrire cœur, sœur ou œuvre sans faute.",
    canonicalPath: "/e-dans-l-o",
    ogType: "article",
    ogDescription: "Avec AZERTY Global, AltGr + O = œ. Installez gratuitement sur Windows, macOS, Linux.",
    testeur: {
      module: 3,
      lecon: 0,
    },
    caractere: {
      glyphe: "œ Œ",
      ariaLabel: "Copier œ Œ dans le presse-papier",
    },
    heros: {
      titre: "Comment taper œ Œ (e dans l’o) au clavier ?",
      intro: "Tapez <strong>œ</strong> avec <strong>AltGr + O</strong> sur Windows, macOS et Linux. Une solution simple, sans code Alt, sans pavé numérique et sans copier-coller.",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>Alt</kbd> + <kbd>0156</kbd>",
          "<kbd>Alt</kbd> + <kbd>0140</kbd>",
        ],
        note: "Minuscule et majuscule via pavé numérique.",
        noteCourte: "pavé numérique requis",
      },
      {
        systeme: "Mac",
        raccourcis: [
          "<kbd>Option</kbd> + <kbd>O</kbd>",
        ],
        note: "Raccourci direct pour la minuscule.",
        noteCourte: "minuscule directe",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>O</kbd>",
        ],
        note: "Même raccourci que sur AZERTY Global.",
        noteCourte: "raccourci minuscule",
      },
    ],
    solution: {
      titre: "Solution définitive – AZERTY Global",
      plateformes: "Windows, macOS, Linux",
      equations: [
        {
          touches: "<kbd>AltGr</kbd> + <kbd>O</kbd>",
          resultat: "œ Œ",
        },
      ],
      note: "Et aussi æ Æ, « », €. 99 % de vos frappes sont préservées.",
    },
    pourquoi: {
      titre: "Pourquoi vos méthodes actuelles sont obsolètes",
      cartes: [
        {
          titre: "Alt Codes",
          texte: "Devoir retenir Alt + 0156 pour œ et Alt + 0140 pour Œ ? C’est inhumain. De plus, sur les PC portables <strong>sans pavé numérique</strong>, c’est tout simplement <strong>impossible</strong>.",
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
          texte: "Word corrige parfois « coeur » en « cœur ». Mais sur Facebook, WhatsApp Web ou dans vos emails ? Rien.",
        },
      ],
    },
    questions: {
      titre: "Questions fréquentes sur œ et Œ",
      liste: [
        {
          question: "Quel est le raccourci clavier pour œ (oe collé)&nbsp;?",
          reponse: "Sur l’AZERTY Windows standard, il n’existe aucun raccourci&nbsp;: seul le code <kbd>Alt</kbd> + <kbd>0156</kbd> fonctionne, avec pavé numérique. Sur Mac, tapez <kbd>Option</kbd> + <kbd>O</kbd>. Avec AZERTY Global (Windows, macOS, Linux), œ est en accès direct&nbsp;: <kbd>AltGr</kbd> + <kbd>O</kbd>.",
        },
        {
          question: "Comment écrire CŒUR en majuscules&nbsp;?",
          reponse: "Le Œ majuscule s’obtient avec <kbd>Alt</kbd> + <kbd>0140</kbd> sur Windows (pavé numérique requis) ou en accès direct avec AZERTY Global&nbsp;: <kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>O</kbd>. De quoi écrire CŒUR, SŒUR ou ŒUVRE sans copier-coller.",
        },
        {
          question: "Quels sont les codes Alt de œ et Œ&nbsp;?",
          reponse: "œ minuscule = <kbd>Alt</kbd> + <kbd>0156</kbd>, Œ majuscule = <kbd>Alt</kbd> + <kbd>0140</kbd>. Ces codes ne fonctionnent qu’avec un pavé numérique physique&nbsp;: sur la plupart des PC portables, ils sont inutilisables — c’est précisément le problème qu’AZERTY Global corrige.",
        },
        {
          question: "Écrire «&nbsp;oeuf&nbsp;» ou «&nbsp;coeur&nbsp;» sans ligature, est-ce une faute&nbsp;?",
          reponse: "Oui. La ligature œ est obligatoire en français&nbsp;: cœur, sœur, bœuf, œuf, œuvre, œil. Écrire «&nbsp;oe&nbsp;» n’est toléré que lorsque le caractère œ est techniquement indisponible — ce qui n’arrive plus avec un clavier qui sait le taper.",
        },
      ],
    },
    suite: {
      titre: "Et ce n’est pas tout...",
      sousTitre: "Le œ n’est que la partie émergée de l’iceberg de ce que propose AZERTY Global.",
      cartes: [
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point. Il est accessible directement, comme sur tous les claviers du monde.",
        },
        {
          titre: "@robase direct",
          texte: "Fini le <kbd>AltGr</kbd> + <kbd>0</kbd>. L’arobase est sur une touche dédiée à gauche de la touche <kbd>1</kbd>. Idéal pour les emails.",
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
              "text": "Sur Linux avec la disposition AZERTY française par défaut, appuyez sur AltGr + O pour obtenir œ. Avec AZERTY Global, c’est le même raccourci."
            }
          },
          {
            "@type": "Question",
            "name": "Pourquoi œ est-il important en français ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "La ligature œ est obligatoire dans des mots comme cœur, œuvre, bœuf, sœur ou œil. Écrire oe à la place est une faute d’orthographe."
            }
          },
          {
            "@type": "Question",
            "name": "Quel est le raccourci clavier pour œ (oe collé) ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sur l’AZERTY Windows standard, il n’existe aucun raccourci : seul le code Alt + 0156 fonctionne, avec pavé numérique. Sur Mac, tapez Option + O. Avec AZERTY Global (Windows, macOS, Linux), œ est en accès direct : AltGr + O."
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
            "name": "œ Œ (e dans l'o)",
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
    title: "æ Æ : comment taper l’« e dans l’a » au clavier facilement",
    description: "Fini les Alt Codes, faites AltGr + A. Les méthodes Windows, macOS et Linux pour taper æ Æ (e dans l’a).",
    canonicalPath: "/e-dans-l-a",
    ogType: "article",
    ogDescription: "Avec AZERTY Global, AltGr + A = æ. Installez gratuitement sur Windows, macOS, Linux.",
    testeur: {
      module: 3,
      lecon: 0,
    },
    caractere: {
      glyphe: "æ Æ",
      ariaLabel: "Copier æ Æ dans le presse-papier",
    },
    heros: {
      titre: "Comment taper æ Æ (e dans l’a) au clavier ?",
      intro: "Tapez <strong>æ</strong> avec <strong>AltGr + A</strong> sur Windows, macOS et Linux. Une solution simple, sans code Alt, sans pavé numérique et sans copier-coller.",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>Alt</kbd> + <kbd>0230</kbd>",
          "<kbd>Alt</kbd> + <kbd>0198</kbd>",
        ],
        note: "Minuscule et majuscule via pavé numérique.",
        noteCourte: "pavé numérique requis",
      },
      {
        systeme: "Mac",
        raccourcis: [
          "<kbd>Option</kbd> + <kbd>A</kbd>",
        ],
        note: "Raccourci direct pour la minuscule.",
        noteCourte: "minuscule directe",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>A</kbd>",
        ],
        note: "Même raccourci que sur AZERTY Global.",
        noteCourte: "raccourci minuscule",
      },
    ],
    solution: {
      titre: "Solution définitive – AZERTY Global",
      plateformes: "Windows, macOS, Linux",
      equations: [
        {
          touches: "<kbd>AltGr</kbd> + <kbd>A</kbd>",
          resultat: "æ Æ",
        },
      ],
      note: "Et aussi œ Œ, « », €. 99 % de vos frappes sont préservées.",
    },
    pourquoi: {
      titre: "Pourquoi vos méthodes actuelles sont obsolètes",
      cartes: [
        {
          titre: "Alt Codes",
          texte: "Devoir retenir Alt + 0230 pour æ et Alt + 0198 pour Æ ? C’est inhumain. De plus, sur les PC portables <strong>sans pavé numérique</strong>, c’est tout simplement <strong>impossible</strong>.",
        },
        {
          titre: "Copier-Coller",
          texte: "Ouvrir Google, rechercher « e dans l’a », copier, revenir, coller. Vous perdez 15 secondes à chaque fois que vous écrivez « ex æquo » ou « curriculum vitæ ».",
        },
        {
          titre: "Écrire ae",
          texte: "Écrire « ae » au lieu de « æ » n’est pas la même chose. La ligature æ est la graphie correcte en français pour les mots d’origine latine.",
        },
        {
          titre: "Correcteur automatique",
          texte: "Word corrige parfois certains mots. Mais sur Facebook, WhatsApp Web ou dans vos emails ? Rien.",
        },
      ],
    },
    suite: {
      titre: "Et ce n’est pas tout...",
      sousTitre: "Le æ n’est que la partie émergée de l’iceberg de ce que propose AZERTY Global.",
      cartes: [
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point. Il est accessible directement, comme sur tous les claviers du monde.",
        },
        {
          titre: "@robase direct",
          texte: "Fini le <kbd>AltGr</kbd> + <kbd>0</kbd>. L’arobase est sur une touche dédiée à gauche de la touche <kbd>1</kbd>. Idéal pour les emails.",
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
              "text": "La ligature æ est la graphie correcte en français pour des mots d’origine latine comme ex æquo, curriculum vitæ ou et cætera."
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
            "name": "æ Æ (e dans l'a)",
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
    title: "Guillemets français « » à copier ou taper | AZERTY Global",
    description: "Copiez « » en un clic ou tapez-les enfin au clavier : AltGr + W et AltGr + X avec AZERTY Global, Alt 0171/0187 sinon. Windows, macOS et Linux.",
    canonicalPath: "/guillemets",
    ogType: "article",
    ogDescription: "Avec AZERTY Global, AltGr + W = « et AltGr + X = ». Installez gratuitement sur Windows, macOS, Linux.",
    testeur: {
      module: 3,
      lecon: 1,
    },
    caractere: {
      glyphe: "« »",
      ariaLabel: "Copier « » dans le presse-papier",
    },
    heros: {
      titre: "Comment taper les guillemets « » au clavier ?",
      intro: "Tapez <strong>les guillemets « »</strong> avec <strong>AltGr + W</strong> et <strong>AltGr + X</strong> sur Windows, macOS et Linux. Une solution simple, sans code Alt, sans pavé numérique et sans copier-coller.",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>Alt</kbd> + <kbd>0171</kbd>",
          "<kbd>Alt</kbd> + <kbd>0187</kbd>",
        ],
        note: "Uniquement via le pavé numérique.",
        noteCourte: "pavé numérique requis",
      },
      {
        systeme: "Mac",
        raccourcis: [
          "<kbd>Option</kbd> + <kbd>è</kbd>",
          "<kbd>Option</kbd> + <kbd>Maj</kbd> + <kbd>è</kbd>",
        ],
        note: "Un raccourci pour ouvrir, un autre pour fermer.",
        noteCourte: "deux raccourcis",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>W</kbd>",
          "<kbd>AltGr</kbd> + <kbd>X</kbd>",
        ],
        note: "La solution la plus simple.",
        noteCourte: "ouvrir et fermer",
      },
    ],
    solution: {
      titre: "Solution définitive – AZERTY Global",
      plateformes: "Windows, macOS, Linux",
      equations: [
        {
          touches: "<kbd>AltGr</kbd> + <kbd>W</kbd> / <kbd>X</kbd>",
          resultat: "« »",
        },
      ],
      note: "Et aussi œ Œ, æ Æ, É, È, À, Ç. 99 % de vos frappes sont préservées.",
    },
    pourquoi: {
      titre: "Pourquoi vos méthodes actuelles sont obsolètes",
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
          texte: "Word remplace parfois &quot; par « ». Mais dès que vous êtes sur Facebook, WhatsApp Web ou dans un email, vous revenez aux guillemets anglais.",
        },
      ],
    },
    questions: {
      titre: "Questions fréquentes sur les guillemets français",
      liste: [
        {
          question: "Comment ouvrir et fermer les guillemets sur un clavier AZERTY&nbsp;?",
          reponse: "Sur l’AZERTY Windows classique, aucune touche ne les propose&nbsp;: tapez <kbd>Alt</kbd> + <kbd>0171</kbd> pour ouvrir «&nbsp;et <kbd>Alt</kbd> + <kbd>0187</kbd> pour fermer&nbsp;» (pavé numérique requis). Avec AZERTY Global, <kbd>AltGr</kbd> + <kbd>W</kbd> ouvre et <kbd>AltGr</kbd> + <kbd>X</kbd> ferme, sur n’importe quel PC.",
        },
        {
          question: "Où sont les guillemets français sur le clavier&nbsp;?",
          reponse: "Ils n’y sont pas&nbsp;: le clavier AZERTY standard ne propose que les guillemets droits <kbd>\"</kbd> (touche 3). Les guillemets français « » s’obtiennent par code Alt, par la correction automatique de Word, ou en accès direct avec une disposition enrichie comme AZERTY Global.",
        },
        {
          question: "Pourquoi Word met les guillemets français mais pas mon navigateur&nbsp;?",
          reponse: "C’est la correction automatique de Word qui remplace <kbd>\"</kbd> par « » au moment de la frappe. Dans un navigateur, un email ou WhatsApp Web, cette correction n’existe pas&nbsp;: vous retombez sur les guillemets droits, sauf si votre clavier sait taper « » directement.",
        },
        {
          question: "Faut-il une espace à l’intérieur des guillemets français&nbsp;?",
          reponse: "Oui&nbsp;: une espace insécable après le guillemet ouvrant et avant le fermant («&nbsp;exemple&nbsp;»). Avec AZERTY Global, l’espace insécable se tape avec <kbd>Maj</kbd> + <kbd>AltGr</kbd> + <kbd>Espace</kbd> et l’espace fine insécable avec <kbd>AltGr</kbd> + <kbd>Espace</kbd>.",
        },
      ],
    },
    suite: {
      titre: "Et ce n’est pas tout...",
      sousTitre: "Les guillemets « » ne sont que la partie émergée de l’iceberg de ce que propose AZERTY Global.",
      cartes: [
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point. Il est accessible directement, comme sur tous les claviers du monde.",
        },
        {
          titre: "@robase direct",
          texte: "Fini le <kbd>AltGr</kbd> + <kbd>0</kbd>. L’arobase est sur une touche dédiée à gauche de la touche <kbd>1</kbd>. Idéal pour les emails.",
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
              "text": "Sur Linux avec la disposition AZERTY française par défaut, appuyez sur AltGr + W pour « et AltGr + X pour »."
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
              "text": "Sur l'AZERTY Windows classique, aucune touche ne les propose : tapez Alt + 0171 pour ouvrir « et Alt + 0187 pour fermer » (pavé numérique requis). Avec AZERTY Global, AltGr + W ouvre et AltGr + X ferme, sur n'importe quel PC."
            }
          },
          {
            "@type": "Question",
            "name": "Où sont les guillemets français sur le clavier ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Ils n'y sont pas : le clavier AZERTY standard ne propose que les guillemets droits \" (touche 3). Les guillemets français « » s'obtiennent par code Alt, par la correction automatique de Word, ou en accès direct avec une disposition enrichie comme AZERTY Global."
            }
          },
          {
            "@type": "Question",
            "name": "Pourquoi Word met les guillemets français mais pas mon navigateur ?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "C'est la correction automatique de Word qui remplace \" par « » au moment de la frappe. Dans un navigateur, un email ou WhatsApp Web, cette correction n'existe pas : vous retombez sur les guillemets droits, sauf si votre clavier sait taper « » directement."
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
    title: "Arobase @ : comment le taper au clavier AZERTY facilement",
    description: "Sur AZERTY Global, @ est en accès direct sur la touche ², en haut à gauche du clavier AZERTY.",
    canonicalPath: "/arobase",
    ogType: "article",
    ogDescription: "Avec AZERTY Global, @ est en accès direct sur la touche ², en haut à gauche du clavier.",
    testeur: {
      module: 0,
      lecon: 2,
    },
    caractere: {
      glyphe: "@",
      ariaLabel: "Copier @ dans le presse-papier",
    },
    heros: {
      titre: "Comment taper arobase @ au clavier ?",
      intro: "Tapez <strong>@</strong> en accès direct sur la touche <strong>²</strong>, en haut à gauche du clavier. Une solution rapide et naturelle, comme sur Mac.",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>0</kbd>",
        ],
        note: "Méthode classique, main droite étirée.",
        noteCourte: "méthode classique",
      },
      {
        systeme: "Mac",
        raccourcis: [
          "<kbd>@</kbd>",
        ],
        note: "Touche dédiée en haut à gauche.",
        noteCourte: "touche dédiée",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>0</kbd>",
        ],
        note: "Même logique que Windows. Peu confortable.",
        noteCourte: "comme sur Windows",
      },
    ],
    solution: {
      titre: "Solution AZERTY Global",
      plateformes: "Windows, macOS, Linux",
      equations: [
        {
          touches: "<kbd>touche ²</kbd>",
          resultat: "@",
        },
      ],
      note: "Vous retrouvez le geste pratique du Mac sur Windows et Linux, sans changer de clavier.",
    },
    pourquoi: {
      titre: "Pourquoi mettre @ en accès direct ?",
      cartes: [
        {
          titre: "Les emails sont partout",
          texte: "Adresse email, identifiant, formulaire, contact professionnel : l’arobase est un caractère quotidien, pas un symbole rare.",
        },
        {
          titre: "AltGr + 0 étire la main",
          texte: "Le raccourci classique fonctionne, mais il demande une combinaison peu naturelle, souvent répétée au moment où l’on saisit vite.",
        },
      ],
    },
    suite: {
      titre: "Et ce n’est pas tout...",
      sousTitre: "L’arobase directe fait partie des 5 améliorations de base d’AZERTY Global.",
      cartes: [
        {
          titre: "Majuscules accentuées",
          texte: "<kbd>Verr. Maj.</kbd> + <kbd>é</kbd> donne <strong>É</strong>. Même logique pour <strong>È</strong>, <strong>Ç</strong> et <strong>À</strong>.",
        },
        {
          titre: "Point direct",
          texte: "Plus besoin de Majuscule pour faire un point. Il devient accessible directement, comme sur la plupart des claviers.",
        },
        {
          titre: "# juste à côté",
          texte: "Le croisillon est sur <kbd>Maj</kbd> + <kbd>@</kbd>, avec une alternative ergonomique <kbd>AltGr</kbd> + <kbd>:</kbd> pour le code.",
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
    title: "Crochets [ ] : comment les taper au clavier AZERTY",
    description: "Avec AZERTY Global, tapez [ ] avec AltGr + J et AltGr + K sur la rangée de repos. Idéal pour Markdown, tableaux et code.",
    canonicalPath: "/crochets",
    ogType: "article",
    ogDescription: "Avec AZERTY Global, AltGr + J = [ et AltGr + K = ]. Installez gratuitement sur Windows, macOS, Linux.",
    testeur: {
      module: 4,
      lecon: 2,
    },
    caractere: {
      glyphe: "[ ]",
      ariaLabel: "Copier [ ] dans le presse-papier",
    },
    heros: {
      titre: "Comment taper les crochets [ ] au clavier ?",
      intro: "Tapez <strong>les crochets [ ]</strong> avec <strong>AltGr + J / K</strong> sur Windows, macOS et Linux. Une solution simple pour Markdown, tableaux et code.",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>5</kbd> / <kbd>°</kbd>",
        ],
        note: "Raccourcis dispersés sur la rangée des chiffres.",
        noteCourte: "rangée des chiffres",
      },
      {
        systeme: "Mac",
        raccourcis: [
          "<kbd>Option</kbd> + <kbd>Maj</kbd> + <kbd>(</kbd> / <kbd>)</kbd>",
        ],
        note: "Deux modificateurs à maintenir.",
        noteCourte: "deux modificateurs",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>5</kbd> / <kbd>°</kbd>",
        ],
        note: "Même contrainte que sur Windows.",
        noteCourte: "rangée des chiffres",
      },
    ],
    solution: {
      titre: "Solution définitive – AZERTY Global",
      plateformes: "Windows, macOS, Linux",
      equations: [
        {
          touches: "<kbd>AltGr</kbd> + <kbd>J</kbd> / <kbd>K</kbd>",
          resultat: "[ ]",
        },
      ],
      note: "Les deux gestes sont côte à côte sur la rangée de repos. Pratique pour Markdown, tableaux et code.",
    },
    pourquoi: {
      titre: "Pourquoi mettre [ ] sur la rangée de repos ?",
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
    suite: {
      titre: "Et ce n’est pas tout...",
      sousTitre: "Les crochets font partie d’un ensemble complet de symboles développeurs mieux placés.",
      cartes: [
        {
          titre: "Accolades sur D / F",
          texte: "Les accolades suivent la même logique : <kbd>AltGr</kbd> + <kbd>D</kbd> et <kbd>AltGr</kbd> + <kbd>F</kbd>, elles aussi sur la rangée de repos.",
        },
        {
          titre: "Barres sur G / H",
          texte: "Backslash et barre verticale sont accessibles avec <kbd>AltGr</kbd> + <kbd>G</kbd> et <kbd>AltGr</kbd> + <kbd>H</kbd>, pratiques pour terminal, chemins et pipes.",
        },
        {
          titre: "Symboles techniques",
          texte: "Dièse, accent grave vif, tilde et circonflexe sont prévus pour les usages dev, Markdown, shell et configuration.",
        },
        {
          titre: "Arobase directe",
          texte: "L’arobase est en accès direct sur la touche <kbd>²</kbd>, en haut à gauche du clavier. Utile pour emails, identifiants et code.",
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
    title: "Accolades { } : comment les taper au clavier AZERTY",
    description: "Avec AZERTY Global, tapez { } avec AltGr + D et AltGr + F sur la rangée de repos. Idéal pour CSS, JavaScript et JSON.",
    canonicalPath: "/accolades",
    ogType: "article",
    ogDescription: "Avec AZERTY Global, AltGr + D = { et AltGr + F = }. Installez gratuitement sur Windows, macOS, Linux.",
    testeur: {
      module: 4,
      lecon: 0,
    },
    caractere: {
      glyphe: "{ }",
      ariaLabel: "Copier { } dans le presse-papier",
    },
    heros: {
      titre: "Comment taper les accolades { } au clavier ?",
      intro: "Tapez <strong>les accolades { }</strong> avec <strong>AltGr + D / F</strong> sur Windows, macOS et Linux. Une solution simple pour coder en CSS, JavaScript et JSON.",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>4</kbd> / <kbd>=</kbd>",
        ],
        note: "Raccourcis dispersés sur la rangée des chiffres.",
        noteCourte: "rangée des chiffres",
      },
      {
        systeme: "Mac",
        raccourcis: [
          "<kbd>Option</kbd> + <kbd>(</kbd> / <kbd>)</kbd>",
        ],
        note: "Logique, mais différente de Windows.",
        noteCourte: "parenthèses",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>4</kbd> / <kbd>=</kbd>",
        ],
        note: "Même contrainte que sur Windows.",
        noteCourte: "rangée des chiffres",
      },
    ],
    solution: {
      titre: "Solution définitive – AZERTY Global",
      plateformes: "Windows, macOS, Linux",
      equations: [
        {
          touches: "<kbd>AltGr</kbd> + <kbd>D</kbd> / <kbd>F</kbd>",
          resultat: "{ }",
        },
      ],
      note: "Les deux gestes sont côte à côte sur la rangée de repos. Pratique pour CSS, JavaScript et JSON.",
    },
    pourquoi: {
      titre: "Pourquoi mettre { } sur la rangée de repos ?",
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
    suite: {
      titre: "Et ce n’est pas tout...",
      sousTitre: "Les accolades font partie d’un ensemble complet de symboles développeurs mieux placés.",
      cartes: [
        {
          titre: "Crochets sur J / K",
          texte: "Les crochets suivent la même logique : <kbd>AltGr</kbd> + <kbd>J</kbd> et <kbd>AltGr</kbd> + <kbd>K</kbd>, eux aussi sur la rangée de repos.",
        },
        {
          titre: "Barres sur G / H",
          texte: "Backslash et barre verticale sont accessibles avec <kbd>AltGr</kbd> + <kbd>G</kbd> et <kbd>AltGr</kbd> + <kbd>H</kbd>, pratiques pour terminal, chemins et pipes.",
        },
        {
          titre: "Symboles techniques",
          texte: "Dièse, accent grave vif, tilde et circonflexe sont prévus pour les usages dev, Markdown, shell et configuration.",
        },
        {
          titre: "Arobase directe",
          texte: "L’arobase est en accès direct sur la touche <kbd>²</kbd>, en haut à gauche du clavier. Utile pour emails, identifiants et code.",
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
    title: "Tiret long — et tiret – : comment les taper au clavier AZERTY",
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
    },
    heros: {
      titre: "Comment taper le tiret long — et le tiret – au clavier ?",
      intro: "Sur Windows, les vrais tirets typographiques demandent souvent <strong>Alt + 0150</strong> et <strong>Alt + 0151</strong>. Avec AZERTY Global, tapez-les directement avec <strong>AltGr + T</strong> et <strong>AltGr + Maj + T</strong>, sans pavé numérique.",
    },
    methodes: [
      {
        systeme: "Windows",
        raccourcis: [
          "<kbd>Alt</kbd> + <kbd>0150</kbd>",
          "<kbd>Alt</kbd> + <kbd>0151</kbd>",
        ],
        note: "Méthode classique : pavé numérique requis.",
        noteCourte: "pavé numérique requis",
      },
      {
        systeme: "Mac",
        raccourcis: [
          "<kbd>Option</kbd> + <kbd>Maj</kbd> + <kbd>-</kbd>",
          "<kbd>Option</kbd> + <kbd>-</kbd>",
        ],
        note: "Raccourcis dédiés, ordre différent.",
        noteCourte: "deux raccourcis dédiés",
      },
      {
        systeme: "Linux",
        raccourcis: [
          "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>5</kbd>",
          "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>4</kbd>",
        ],
        note: "AZERTY Linux. Peu mémorisable.",
        noteCourte: "AZERTY Linux",
      },
    ],
    solution: {
      titre: "Solution définitive – AZERTY Global",
      plateformes: "Windows, macOS, Linux",
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
      titre: "Quel tiret utiliser ?",
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
    suite: {
      titre: "Et ce n’est pas tout...",
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
          titre: "Ligatures françaises",
          texte: "Les caractères <kbd>œ</kbd>, <kbd>Œ</kbd>, <kbd>æ</kbd> et <kbd>Æ</kbd> sont disponibles sans passer par une table de caractères.",
        },
        {
          titre: "Espaces et ponctuation",
          texte: "L’objectif est le même : rendre les bons caractères faciles à taper, dans les emails, les documents et le web.",
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

/* Le layout attend des blocs JSON-LD déjà sérialisés (un <script> par bloc). */
module.exports = pages.map((page) => ({
  ...page,
  jsonLd: page.jsonLd.map((bloc) => JSON.stringify(bloc, null, 2)),
}));
