module.exports = [
  {
    slug: "e-aigu-majuscule",
    title: "É majuscule : comment le taper au clavier facilement",
    description: "Fini les Alt Codes, faites Verr. Maj. + é. Les méthodes Windows, macOS et Linux pour taper un É majuscule.",
    ogDescription: "Avec AZERTY Global, Verr. Maj. + é = É. Installez gratuitement sur Windows, macOS, Linux.",
    canonicalPath: "/e-aigu-majuscule",
    ogType: "article",
    bodyClass: "page-landing",
    extraStyles: [
      "css/landing.css?v=20260703-1",
    ],
    beforeHeader: '<div id="copy-toast" class="toast">Avec AZERTY Global, <span class="toast__shortcut"><kbd>Verr. Maj.</kbd> + <kbd>é</kbd></span> suffit&nbsp;!</div>',
    scripts: [
      { src: "js/gtm-loader.js", attrs: "" },
      { src: "js/conversion-tracking.js", attrs: "" },
      { src: "js/app.js", attrs: "" },
      { src: "js/header-zoom-fix.js", attrs: "" },
      { src: "js/copy-char.js?v=20260703-1", attrs: "" },
      { src: "js/os-card-fit.js?v=20260623-5", attrs: "" },
      { src: "js/lazy-tester.js?v=final-20260624-12", attrs: ' data-mode="lessons" data-module="1" data-lesson="0" data-guided-hints="true"' },
    ],
    jsonLd: [
      `{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Comment faire un É majuscule sur Windows ?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Maintenez la touche Alt enfoncée, tapez 144 sur le pavé numérique, puis relâchez Alt. Sans pavé numérique, utilisez le clavier tactile Windows (maintenir e → choisir É). Avec AZERTY Global (gratuit) : Verr. Maj. + é = É."
    }
  }, {
    "@type": "Question",
    "name": "Comment faire un É majuscule sur Mac ?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Maintenez la touche e enfoncée pendant une seconde, puis choisissez É dans le menu qui apparaît (ou appuyez sur 2)."
    }
  }, {
    "@type": "Question",
    "name": "Comment faire un É majuscule sur Linux ?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Sur la plupart des distributions Linux avec l'AZERTY français, appuyez sur AltGr + Maj + é pour obtenir É. Avec AZERTY Global, c'est plus simple : Verr. Maj. + é = É."
    }
  }, {
    "@type": "Question",
    "name": "Faut-il mettre les accents sur les majuscules en français ?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Oui. L'Académie française est catégorique : l'accent a pleine valeur orthographique et doit être conservé sur les majuscules. Écrire ECOLE au lieu de ÉCOLE est une faute."
    }
  }]
}`,
      `{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Comment taper É majuscule facilement",
  "step": [{
    "@type": "HowToStep",
    "name": "Télécharger AZERTY Global",
    "text": "Installez gratuitement la disposition AZERTY Global pour Windows, macOS ou Linux.",
    "url": "https://azerty.global/download"
  }, {
    "@type": "HowToStep",
    "name": "Activer le Verrouillage Majuscule",
    "text": "Appuyez sur la touche Verrouillage Majuscule (Cadenas) de votre clavier."
  }, {
    "@type": "HowToStep",
    "name": "Appuyer sur é",
    "text": "Appuyez simplement sur la touche 'é'. Vous obtenez instantanément un É majuscule."
  }],
  "totalTime": "PT3M",
  "tool": {
    "@type": "HowToTool",
    "name": "Clavier AZERTY Global"
  }
}`,
      `{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [{
    "@type": "ListItem",
    "position": 1,
    "name": "Accueil",
    "item": "https://azerty.global/"
  },{
    "@type": "ListItem",
    "position": 2,
    "name": "É majuscule",
    "item": "https://azerty.global/e-aigu-majuscule"
  }]
}`,
      `{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "AZERTY Global",
  "alternateName": "AZERTY Global 2026",
  "url": "https://azerty.global",
  "inLanguage": "fr",
  "publisher": {
    "@type": "Organization",
    "name": "AZERTY Global",
    "logo": {
      "@type": "ImageObject",
      "url": "https://azerty.global/assets/favicon-azerty-global.png"
    }
  }
}`,
    ],
    hero: {
      title: 'Comment taper É<br class="landing-title-mobile-break"> majuscule au clavier&nbsp;?',
      intro: 'Tapez <strong>É majuscule</strong> avec<br class="landing-mobile-break"> <strong>Verr. Maj. + é</strong> sur Windows, macOS et Linux. Une solution simple, sans code Alt, sans pavé numérique et sans <span class="landing-nowrap">copier-coller</span>.',
    },
    copy: {
      char: "É",
      ariaLabel: "Copier É dans le presse-papier",
    },
    desktopMethods: [
      {
        title: "🪟 Windows",
        shortcut: "<kbd>Alt</kbd> + <kbd>144</kbd>",
        note: '<span class="d-block">Fonctionne uniquement</span><span class="d-block note__line-nowrap">avec le pavé numérique.</span>',
      },
      {
        title: "🍎 Mac",
        shortcutClass: "nowrap",
        shortcut: "Maintenir <kbd>E</kbd> → É",
        noteClass: "note--mac-tablet",
        note: '<span class="note__tablet-line">Menu : appuyez sur <strong>2</strong></span> <span class="note__tablet-line">ou cliquez sur É.</span>',
      },
      {
        title: "🐧 Linux",
        shortcutClass: "nowrap",
        shortcut: "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>é</kbd>",
        noteClass: "note--linux-tablet",
        note: '<span class="note__tablet-line">AZERTY français par défaut.</span> <span class="note__tablet-line">Pas très intuitif.</span>',
      },
    ],
    mobileMethods: [
      {
        icon: "🪟",
        os: "Windows",
        shortcut: "<kbd>Alt</kbd> + <kbd>144</kbd>",
        note: "pavé numérique requis",
      },
      {
        icon: "🍎",
        os: "Mac",
        shortcut: "Maintenir <kbd>E</kbd> → É",
        note: "choisir É dans le menu",
      },
      {
        icon: "🐧",
        os: "Linux",
        shortcut: "<kbd>AltGr</kbd> + <kbd>Maj</kbd> + <kbd>é</kbd>",
        note: "peu intuitif",
      },
    ],
    solution: {
      title: "Solution définitive – AZERTY Global",
      platforms: "Windows, macOS, Linux",
      equation: '<kbd>Verr. Maj.</kbd> + <kbd>é</kbd> <span class="text-1-6rem">=</span> <strong class="leading-none text-2-8rem text-color-primary">É</strong>',
      note: 'Et aussi è → È, ç → Ç, à → À. <span class="solution-card__habit-preserved">99&nbsp;% de vos habitudes sont préservées.</span>',
    },
    methodsSection: {
      title: "Pourquoi vos méthodes actuelles sont obsolètes",
      cards: [
        {
          title: "❌ Alt Codes",
          text: "Devoir retenir Alt + 144 pour un É&nbsp;? C’est de l’informatique des années 80. De plus, sur les PC portables <strong>sans pavé numérique</strong>, c’est tout simplement <strong>impossible</strong>.",
        },
        {
          title: "❌ Copier-Coller",
          text: "Ouvrir Google, rechercher «&nbsp;é&nbsp;majuscule&nbsp;», copier, revenir, coller. Vous perdez 15 secondes à chaque fois.",
        },
        {
          title: "❌ Raccourcis Word",
          text: "<kbd>Ctrl</kbd> + <kbd>4</kbd> puis <kbd>Maj</kbd> + <kbd>E</kbd>... Sérieusement&nbsp;? Et dès que vous sortez de Word pour aller sur Facebook ou sur un navigateur web, ça ne marche plus.",
        },
        {
          title: "❌ Correcteur automatique",
          text: "Le correcteur est pratique mais aléatoire. Dans un formulaire web ou pour un mot de passe, vous êtes bloqué.",
        },
      ],
    },
    benefitsSection: {
      title: "Et ce n’est pas tout...",
      subtitle: "Le É majuscule n’est que la partie émergée de l’iceberg de ce que propose AZERTY Global.",
      cards: [
        {
          icon: "🎯",
          title: "Point direct",
          text: "Plus besoin de Majuscule pour faire un point. Il est accessible directement, comme sur tous les claviers du monde.",
        },
        {
          icon: "📧",
          title: "@robase direct",
          text: "Fini le <kbd>AltGr</kbd> + <kbd>0</kbd>. L’arobase est sur une touche dédiée à gauche de la touche <kbd>1</kbd>. Idéal pour les emails.",
        },
        {
          icon: "💻",
          title: "Symboles Dev",
          text: "<kbd>{</kbd> <kbd>}</kbd> <kbd>[</kbd> <kbd>]</kbd> <kbd>|</kbd> <kbd>\\</kbd> sont tous sur la rangée de repos avec <kbd>AltGr</kbd>. Un bonheur pour coder.",
        },
        {
          icon: "🌍",
          title: "International",
          text: "Espagnol (ñ ¡ ¿), Allemand (ß), Polonais (ł&nbsp;ę&nbsp;ż)... tout est inclus sans changer de clavier.",
        },
      ],
    },
    relatedRows: [
      {
        className: "landing-related-row--three",
        items: [
          { href: "/e-grave-majuscule", label: "È majuscule" },
          { href: "/c-cedille-majuscule", label: "Ç majuscule" },
          { href: "/a-grave-majuscule", label: "À majuscule" },
        ],
      },
      {
        className: "landing-related-row--three",
        items: [
          { href: "/e-dans-l-o", label: "œ Œ (e dans l’o)" },
          { href: "/e-dans-l-a", label: "æ Æ (e dans l’a)" },
          { href: "/guillemets", label: "« » (guillemets français)" },
        ],
      },
      {
        className: "landing-related-row--four",
        items: [
          { href: "/arobase", label: "Arobase @" },
          { href: "/crochets", label: "Crochets [ ]" },
          { href: "/accolades", label: "Accolades { }" },
          { href: "/tiret-cadratin", label: "Tirets – —" },
        ],
      },
    ],
    shareUrl: "https://twitter.com/intent/tweet?text=J%27ai%20enfin%20trouv%C3%A9%20comment%20taper%20un%20%C3%89%20majuscule%20facilement%20gr%C3%A2ce%20%C3%A0%20%40AZERTY_Global%20%21%20Testez%20en%20ligne%2C%20c%27est%20gratuit%20%F0%9F%91%89%20azerty.global%2Fe-aigu-majuscule",
  },
];
