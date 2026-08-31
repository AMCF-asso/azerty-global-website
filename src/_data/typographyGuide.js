const sharedSources = {
  academy: '<a href="https://www.academie-francaise.fr/questions-de-langue">Académie française, <cite>Questions de langue</cite></a>, notamment « Accentuation des majuscules »',
  eu: '<a href="https://style-guide.europa.eu/fr/content/-/isg/topic?identifier=10.1-punctuation">Office des publications de l’Union européenne, <cite>Code de rédaction interinstitutionnel</cite></a>',
  oqlf: '<a href="https://vitrinelinguistique.oqlf.gouv.qc.ca/">Office québécois de la langue française, <cite>Vitrine linguistique</cite></a>',
  unicode: '<a href="https://www.unicode.org/versions/latest/">Unicode Consortium, <cite>The Unicode Standard</cite></a> et <a href="https://unicode.org/reports/tr15/"><cite>Unicode Normalization Forms</cite> (UAX #15)</a>',
  unicodeEn: '<a href="https://www.unicode.org/versions/latest/">Unicode Consortium, <cite>The Unicode Standard</cite></a> and <a href="https://unicode.org/reports/tr15/"><cite>Unicode Normalization Forms</cite> (UAX #15)</a>',
  bipm: '<a href="https://www.bipm.org/fr/publications/si-brochure">Bureau international des poids et mesures, <cite>Le Système international d’unités</cite></a>, 9<sup>e</sup> édition',
  lexique: 'Imprimerie nationale, <cite>Lexique des règles typographiques en usage à l’Imprimerie nationale</cite>, ouvrage imprimé',
  lexiqueEn: 'Imprimerie nationale, <cite>Lexique des règles typographiques en usage à l’Imprimerie nationale</cite>, print reference (in French)'
};

module.exports = {
  fr: {
    lang: 'fr',
    kicker: 'Guide typographique français',
    title: 'Écrire correctement en français',
    subtitle: 'Les règles, les caractères et les espaces qui rendent un texte immédiatement plus clair.',
    intro: 'Ce guide part des usages quotidiens et va jusqu’aux besoins de l’édition professionnelle. Il suit principalement les conventions de France et signale les variantes francophones lorsqu’elles changent réellement la pratique.',
    specimenTitle: 'Une phrase avant et après correction typographique',
    beforeLabel: 'Avant',
    afterLabel: 'Après',
    beforeText: 'A 20h30, Elise a dit : "Ca coute 25 euros - et c\'est deja pret..."',
    afterText: 'À 20 h 30, Élise a dit : « Ça coûte 25 € — et c’est déjà prêt… »',
    correctionsLabel: 'Corrections appliquées',
    corrections: ['capitales accentuées', 'heure espacée', 'guillemets français', 'espaces insécables', 'apostrophe courbe', 'cadratin', 'points de suspension'],
    printLabel: 'Imprimer le guide',
    printShortLabel: 'Version imprimable',
    updatedLabel: 'Vérifié le 25 juillet 2026',
    tocLabel: 'Dans ce guide',
    finderTitle: 'Que cherchez-vous à écrire ?',
    finderLead: 'Accédez directement aux règles les plus consultées.',
    finderLinks: [
      { href: '#accents-ligatures-r1', label: 'Une majuscule accentuée' },
      { href: '#accents-ligatures-r3', label: 'Œ, œ, Æ ou æ' },
      { href: '#espaces-ponctuation-r2', label: 'Une ponctuation bien espacée' },
      { href: '#citations-dialogues-r1', label: 'Des guillemets français' },
      { href: '#apostrophes-tirets-r1', label: 'Une apostrophe typographique' },
      { href: '#apostrophes-tirets-r3', label: 'Le bon tiret' },
      { href: '#nombres-dates-unites-r5', label: 'Une date ou une heure' },
      { href: '#nombres-dates-unites-r4', label: 'Un prix ou une unité' },
      { href: '#abreviations-r1', label: 'Une abréviation' },
      { href: '#ecriture-web-r1', label: 'Un courriel ou une URL' }
    ],
    chapterIndexLabel: 'Dans ce chapitre',
    mobileContentsLabel: 'Sommaire',
    mobileTopLabel: 'Haut',
    mobileIntroLabel: 'Introduction',
    avoidLabel: 'À éviter',
    preferLabel: 'À écrire',
    advancedLabel: 'Cas éditorial et variantes',
    copyPaletteLabel: 'Caractères à copier',
    copyPaletteHint: 'Sélectionnez un caractère pour le copier.',
    faqTitle: 'Questions fréquentes',
    faqLead: 'Les réponses courtes aux hésitations typographiques les plus courantes.',
    sourcesTitle: 'Sources et méthode',
    sourcesLead: 'Les codes typographiques ne coïncident pas toujours. Ce guide donne une convention française cohérente et rend visibles les variantes importantes.',
    reviewedLabel: 'Dernière vérification :',
    reviewedDate: '25 juillet 2026',
    feedbackLabel: 'Signaler une règle à vérifier',
    feedbackUrl: '/feedback?source=guide-typographique&subject=Règle%20typographique%20à%20vérifier',
    finalTitle: 'Essayez de taper cette phrase',
    finalText: 'Toutes ces règles deviennent plus simples lorsque les bons caractères sont disponibles directement sur le clavier.',
    finalSentence: 'À 20 h 30, Élise écrit : « Un cœur, 25 €, 3,5 kg — déjà prêt ! »',
    tryLabel: 'Essayer dans le testeur',
    downloadLabel: 'Télécharger AZERTY Global',
    downloadUrl: '/download',
    printUrlLabel: 'Version en ligne :',
    absoluteUrl: 'https://azerty.global/francais-correct',
    chapters: [
      {
        id: 'accents-ligatures', shortTitle: 'Accents et ligatures', title: 'Mettre les accents, cédilles et ligatures',
        lead: 'Les signes diacritiques font partie de l’orthographe. Ils ne disparaissent ni en capitale ni dans un titre.',
        rules: [
          {
            title: 'Accentuer aussi les majuscules',
            summary: '<p>Les accents ont pleine valeur orthographique sur les capitales. Ils facilitent la lecture et peuvent lever une ambiguïté.</p>',
            bad: 'A partir de lundi, l’Ecole sera fermée.',
            good: 'À partir de lundi, l’École sera fermée.',
            note: 'L’Académie française recommande explicitement l’accentuation systématique des capitales.'
          },
          {
            title: 'Conserver la cédille et le tréma',
            summary: '<p>La cédille et le tréma appartiennent à la lettre. Ils restent présents dans un mot écrit en capitales.</p>',
            bad: 'CA COMMENCE À NOEL · une coincidence',
            good: 'ÇA COMMENCE À NOËL · une coïncidence'
          },
          {
            title: 'Respecter les ligatures lexicales',
            summary: '<p>Dans les mots qui les comportent, <code>œ</code> et <code>æ</code> sont des lettres, pas des effets décoratifs. On écrit notamment <em>cœur</em>, <em>œuvre</em>, <em>sœur</em> et <em>cæcum</em>.</p>',
            bad: 'une oeuvre au coeur du projet',
            good: 'une œuvre au cœur du projet',
            advancedTitle: 'Recherche et anciens logiciels',
            advanced: '<p>Certains moteurs traitent encore <code>œ</code> et <code>oe</code> comme deux formes différentes. Le texte publié doit garder l’orthographe correcte ; c’est la recherche interne qui devrait accepter les deux saisies.</p>'
          },
          {
            title: 'Préférer les caractères précomposés',
            summary: '<p>Un <code>é</code> peut être un caractère unique ou un <code>e</code> suivi d’un accent combinatoire. Les deux formes se ressemblent, mais la seconde peut gêner recherche, tri et comptage. Employez le caractère précomposé lorsqu’il existe.</p>',
            bad: 'e + accent aigu combinatoire',
            good: 'é (U+00E9)',
            note: 'Unicode définit les deux représentations ; la normalisation NFC permet de les harmoniser.'
          }
        ],
        copies: [
          { id: 'capital-a-grave', value: 'À', display: 'À', label: 'A grave', ariaLabel: 'Copier À majuscule' },
          { id: 'capital-e-aigu', value: 'É', display: 'É', label: 'E aigu', ariaLabel: 'Copier É majuscule' },
          { id: 'capital-c-cedille', value: 'Ç', display: 'Ç', label: 'C cédille', ariaLabel: 'Copier Ç majuscule' },
          { id: 'ligature-oe', value: 'œ', display: 'œ', label: 'e dans l’o', ariaLabel: 'Copier œ minuscule' },
          { id: 'ligature-oe-capital', value: 'Œ', display: 'Œ', label: 'E dans l’O', ariaLabel: 'Copier Œ majuscule' },
          { id: 'ligature-ae', value: 'æ', display: 'æ', label: 'e dans l’a', ariaLabel: 'Copier æ minuscule' },
          { id: 'ligature-ae-capital', value: 'Æ', display: 'Æ', label: 'E dans l’A', ariaLabel: 'Copier Æ majuscule' }
        ]
      },
      {
        id: 'espaces-ponctuation', shortTitle: 'Espaces et ponctuation', title: 'Espacer et ponctuer',
        lead: 'La bonne espace ne se voit presque pas ; son rôle apparaît surtout quand elle empêche une ponctuation de commencer seule une ligne.',
        rules: [
          {
            title: 'Coller la ponctuation simple',
            summary: '<p>La virgule et le point suivent immédiatement le mot précédent. Une espace ordinaire vient après eux.</p>',
            bad: 'Un texte clair , précis et bref .',
            good: 'Un texte clair, précis et bref.'
          },
          {
            title: 'Protéger la ponctuation double',
            summary: '<p>Dans une composition française soignée, le deux-points est précédé d’une espace insécable. Une espace fine insécable précède le point-virgule, le point d’exclamation et le point d’interrogation.</p>',
            bad: 'Attention ! Voici le risque : une coupure.',
            good: 'Attention ! Voici le risque : une coupure.',
            advancedTitle: 'Variantes francophones',
            advanced: '<p>Au Québec, certains espacements diffèrent, notamment devant <code>;</code>, <code>!</code> et <code>?</code>. Pour un document institutionnel, la charte du destinataire fait foi. <a href="https://vitrinelinguistique.oqlf.gouv.qc.ca/22039/la-typographie/espacement/espacement-avant-et-apres-les-signes-de-ponctuation-et-les-symboles">Source : OQLF</a>.</p>'
          },
          {
            title: 'Coller parenthèses et crochets à leur contenu',
            summary: '<p>Il n’y a pas d’espace juste après une ouverture ni juste avant une fermeture. Une insécable peut toutefois unir un numéro à son libellé.</p>',
            bad: 'Le résultat ( provisoire ) est publié [ annexe 2 ].',
            good: 'Le résultat (provisoire) est publié [annexe 2].'
          },
          {
            title: 'Employer la barre oblique avec sobriété',
            summary: '<p>La barre oblique se compose sans espaces entre deux termes courts. Dans une phrase complexe, écrire la relation en toutes lettres reste plus clair.</p>',
            bad: 'le formulaire client / fournisseur',
            good: 'le formulaire client/fournisseur · destiné au client ou au fournisseur'
          },
          {
            title: 'Espacer les opérateurs mathématiques',
            summary: '<p>Les signes d’opération et de comparaison sont séparés des nombres lorsqu’ils expriment une relation. Utilisez le véritable signe moins.</p>',
            bad: '8+4=12 · x>=10',
            good: '8 + 4 = 12 · x ≥ 10'
          }
        ],
        copies: [
          { id: 'nbsp', value: ' ', display: '⍽', label: 'Insécable', ariaLabel: 'Copier une espace insécable', type: 'space' },
          { id: 'nnbsp', value: ' ', display: '▸', label: 'Fine insécable', ariaLabel: 'Copier une espace fine insécable', type: 'space' },
          { id: 'not-equal', value: '≠', display: '≠', label: 'Différent', ariaLabel: 'Copier le signe différent' },
          { id: 'less-equal', value: '≤', display: '≤', label: 'Inférieur ou égal', ariaLabel: 'Copier inférieur ou égal' }
        ]
      },
      {
        id: 'citations-dialogues', shortTitle: 'Citations et dialogues', title: 'Citer et faire dialoguer',
        lead: 'Les guillemets montrent où commencent et finissent les paroles rapportées. La ponctuation indique à quelle phrase chaque signe appartient.',
        rules: [
          {
            title: 'Utiliser les guillemets français',
            summary: '<p>Une citation principale en français se place entre <code>«</code> et <code>»</code>, séparés du texte par des espaces insécables, fines dans ce guide.</p>',
            bad: 'Il a répondu "je viendrai".',
            good: 'Il a répondu : « Je viendrai. »'
          },
          {
            title: 'Distinguer les citations imbriquées',
            summary: '<p>Dans une citation déjà placée entre guillemets français, les guillemets anglais courbes marquent un deuxième niveau.</p>',
            bad: '« Il m’a répondu « peut-être ». »',
            good: '« Il m’a répondu “peut-être”. »',
            advanced: '<p>Un troisième niveau peut employer <code>‘…’</code>, mais une reformulation ou une citation en retrait est souvent plus lisible.</p>'
          },
          {
            title: 'Placer la ponctuation selon le sens',
            summary: '<p>Un signe appartenant aux paroles citées reste dans les guillemets. La ponctuation de la phrase principale reste à l’extérieur.</p>',
            bad: 'Elle demanda : « Avez-vous terminé ? ».',
            good: 'Elle demanda : « Avez-vous terminé ? » · un « progrès décisif ».'
          },
          {
            title: 'Introduire les répliques avec un cadratin',
            summary: '<p>Dans un dialogue suivi, chaque nouvelle réplique peut commencer par un cadratin. Les guillemets ne sont alors pas nécessaires à chaque ligne.</p>',
            bad: '- Vous venez ?<br>- Dans une minute.',
            good: '— Vous venez ?<br>— Dans une minute.'
          },
          {
            title: 'Mettre les citations longues en retrait',
            summary: '<p>Une citation longue gagne à former un bloc distinct, sans guillemets si sa présentation l’identifie déjà. L’auteur et la source doivent rester visibles.</p>',
            bad: 'Une longue citation noyée dans le paragraphe, sans attribution.',
            good: 'Un bloc en retrait, suivi d’une attribution et d’une référence vérifiable.'
          }
        ],
        copies: [
          { id: 'quotes-fr', value: '«  »', display: '« »', label: 'Guillemets français', ariaLabel: 'Copier une paire de guillemets français avec espaces fines', type: 'pattern' },
          { id: 'quotes-en-curly', value: '“”', display: '“”', label: 'Guillemets imbriqués', ariaLabel: 'Copier une paire de guillemets anglais courbes', type: 'pattern' },
          { id: 'em-dash-dialogue', value: '—', display: '—', label: 'Cadratin', ariaLabel: 'Copier un tiret cadratin' }
        ]
      },
      {
        id: 'apostrophes-tirets', shortTitle: 'Apostrophes et tirets', title: 'Choisir apostrophes, traits d’union et tirets',
        lead: 'Ces signes se ressemblent, mais chacun remplit une fonction précise : élision, mot composé, plage, incise ou opération.',
        rules: [
          {
            title: 'Employer l’apostrophe typographique en prose',
            summary: '<p>L’apostrophe courbe <code>’</code> est le signe normal d’un texte publié. L’apostrophe droite reste adaptée au code et aux identifiants.</p>',
            bad: 'Aujourd\'hui, c\'est l\'heure d\'agir.',
            good: 'Aujourd’hui, c’est l’heure d’agir.'
          },
          {
            title: 'Réserver le trait d’union aux mots liés',
            summary: '<p>Le trait d’union relie les éléments d’un mot composé, certaines formes verbales et certains nombres écrits en lettres.</p>',
            bad: 'Est ce clair ? · dit il',
            good: 'Est-ce clair ? · dit-il'
          },
          {
            title: 'Protéger un trait d’union si nécessaire',
            summary: '<p>Le trait d’union insécable <code>‑</code> empêche un retour à la ligne. Il est utile dans un nom ou une référence qui doit rester solidaire, après vérification de sa compatibilité.</p>',
            bad: 'Jean-Paul coupé en fin de ligne',
            good: 'Jean‑Paul protégé'
          },
          {
            title: 'Distinguer le signe moins',
            summary: '<p>Le signe mathématique <code>−</code> est plus long que le trait d’union et s’aligne sur les autres opérateurs.</p>',
            bad: '-12 °C · 8 - 3 = 5',
            good: '−12 °C · 8 − 3 = 5'
          },
          {
            title: 'Employer demi-cadratin et cadratin',
            summary: '<p>Le demi-cadratin relie les bornes d’une plage. Le cadratin encadre une incise ou ouvre une réplique.</p>',
            bad: 'pages 12-18 · une solution - simple - et fiable',
            good: 'pages 12–18 · une solution — simple — et fiable',
            advanced: '<p>Certains codes utilisent le demi-cadratin pour les incises. Dans un document long, le choix importe moins que sa cohérence. <a href="https://style-guide.europa.eu/fr/content/-/isg/topic?identifier=10.1-punctuation">Source : Code de rédaction interinstitutionnel</a>.</p>'
          },
          {
            title: 'Employer le véritable signe des points de suspension',
            summary: '<p>Les points de suspension forment un seul caractère. Ils ne se cumulent ni avec un point final ni avec <em>etc.</em></p>',
            bad: 'Il reste trois options... etc...',
            good: 'Il reste trois options… · Il reste trois options, etc.'
          }
        ],
        copies: [
          { id: 'apostrophe', value: '’', display: '’', label: 'Apostrophe', ariaLabel: 'Copier l’apostrophe typographique' },
          { id: 'nonbreaking-hyphen', value: '‑', display: '‑', label: 'Trait d’union insécable', ariaLabel: 'Copier le trait d’union insécable' },
          { id: 'minus', value: '−', display: '−', label: 'Signe moins', ariaLabel: 'Copier le signe moins' },
          { id: 'en-dash', value: '–', display: '–', label: 'Demi-cadratin', ariaLabel: 'Copier le tiret demi-cadratin' },
          { id: 'em-dash', value: '—', display: '—', label: 'Cadratin', ariaLabel: 'Copier le tiret cadratin' },
          { id: 'ellipsis', value: '…', display: '…', label: 'Points de suspension', ariaLabel: 'Copier les points de suspension' }
        ]
      },
      {
        id: 'nombres-dates-unites', shortTitle: 'Nombres, dates et unités', title: 'Écrire nombres, dates, heures et unités',
        lead: 'Une valeur reste lisible lorsque ses séparateurs, son unité et son format répondent à une seule convention.',
        rules: [
          {
            title: 'Employer la virgule décimale',
            summary: '<p>La virgule est le séparateur décimal usuel en français. Le point reste réservé au code et aux formats techniques qui l’imposent.</p>',
            bad: 'Le taux atteint 3.5%.',
            good: 'Le taux atteint 3,5 %.'
          },
          {
            title: 'Grouper les grands nombres',
            summary: '<p>Une espace insécable sépare les groupes de trois chiffres. Les années, numéros de page, codes et identifiants ne sont pas regroupés.</p>',
            bad: '1250000 habitants · 2,500 exemplaires',
            good: '1 250 000 habitants · 2 500 exemplaires',
            note: 'Les nombres de quatre chiffres peuvent rester sans séparation selon la charte ; ne touchez jamais aux années comme 2026.'
          },
          {
            title: 'Séparer la valeur de son unité',
            summary: '<p>Une espace insécable unit la valeur au symbole. Les symboles d’unité ne prennent ni point ni marque du pluriel.</p>',
            bad: '25kg · 12 kms · 30°C',
            good: '25 kg · 12 km · 30 °C',
            advanced: '<p>Les symboles d’angle suivent une règle propre : <code>45°</code>, <code>12′</code>, <code>30″</code>.</p>'
          },
          {
            title: 'Composer pourcentages et monnaies',
            summary: '<p>Dans les usages français courants, une espace insécable sépare le nombre du symbole.</p>',
            bad: '25% · 19,90€',
            good: '25 % · 19,90 €',
            advancedTitle: 'Variantes monétaires',
            advanced: '<p>La position du symbole varie selon la langue et la monnaie. Au Québec, le dollar suit généralement le nombre en français : <code>25 $</code>. <a href="https://vitrinelinguistique.oqlf.gouv.qc.ca/22039/la-typographie/espacement/espacement-avant-et-apres-les-signes-de-ponctuation-et-les-symboles">Source : OQLF</a>.</p>'
          },
          {
            title: 'Écrire les heures avec un h minuscule',
            summary: '<p>Dans un texte courant, le <code>h</code> est entouré d’espaces insécables. Le format à deux-points convient aux interfaces et données techniques.</p>',
            bad: '20h30 · 09:05 dans une phrase',
            good: '20 h 30 · 9 h 05'
          },
          {
            title: 'Écrire dates et ordinaux sobrement',
            summary: '<p>Le jour et le mois prennent la minuscule dans une date rédigée. Les ordinaux s’abrègent <code>1er</code>, <code>1re</code>, <code>2e</code>.</p>',
            bad: 'Vendredi, 24 Juillet 2026 · 2ème chapitre',
            good: 'vendredi 24 juillet 2026 · 2e chapitre',
            advanced: '<p>Le format ISO <code>2026-07-24</code> convient aux données et noms de fichiers. Les siècles s’écrivent traditionnellement en chiffres romains : <code>XXI<sup>e</sup> siècle</code>. Pour un numéro de téléphone, conservez les groupes attendus par le pays et rendez-les insécables si la mise en page le permet : <code>01 23 45 67 89</code> ou <code>+33 1 23 45 67 89</code>.</p>'
          }
        ],
        copies: [
          { id: 'degree', value: '°', display: '°', label: 'Degré', ariaLabel: 'Copier le symbole degré' },
          { id: 'prime', value: '′', display: '′', label: 'Prime', ariaLabel: 'Copier le symbole prime' },
          { id: 'double-prime', value: '″', display: '″', label: 'Double prime', ariaLabel: 'Copier le symbole double prime' },
          { id: 'ordinal-first', value: '1er', display: '1er', label: 'Premier', ariaLabel: 'Copier l’abréviation premier', type: 'pattern' },
          { id: 'ordinal-first-feminine', value: '1re', display: '1re', label: 'Première', ariaLabel: 'Copier l’abréviation première', type: 'pattern' }
        ]
      },
      {
        id: 'capitales-italiques-titres', shortTitle: 'Capitales et titres', title: 'Employer capitales, italiques et titres',
        lead: 'Le français emploie les capitales avec retenue. L’italique distingue une fonction, pas une importance générale.',
        rules: [
          {
            title: 'Limiter les majuscules',
            summary: '<p>Les jours, mois et noms de langues restent en minuscule. Les noms d’habitants prennent une capitale comme noms, mais pas comme adjectifs.</p>',
            bad: 'Lundi 14 Mars · un texte en Français',
            good: 'lundi 14 mars · un texte en français · les Français'
          },
          {
            title: 'Composer sobrement les institutions',
            summary: '<p>La majuscule porte généralement sur le premier nom qui individualise l’organisme. Les mots suivants restent en minuscule sauf nom propre.</p>',
            bad: 'l’Assemblée Nationale · le Conseil Constitutionnel',
            good: 'l’Assemblée nationale · le Conseil constitutionnel',
            note: 'La dénomination officielle et la charte de l’institution restent prioritaires.'
          },
          {
            title: 'Utiliser la casse de phrase dans les titres',
            summary: '<p>Un titre français ne met pas une majuscule à chaque mot. Son premier mot et les noms propres suffisent généralement.</p>',
            bad: 'Écrire Correctement En Français',
            good: 'Écrire correctement en français'
          },
          {
            title: 'Mettre les œuvres en italique',
            summary: '<p>Les œuvres autonomes — livres, films, journaux — se composent généralement en italique. Les œuvres courtes intégrées à un ensemble peuvent prendre des guillemets.</p>',
            bad: 'J’ai relu « Les Misérables ».',
            good: 'J’ai relu <em>Les Misérables</em>.'
          },
          {
            title: 'Donner une fonction claire à l’italique',
            summary: '<p>L’italique peut signaler une œuvre, un terme défini, un mot étranger non intégré ou une emphase ponctuelle. Il perd son utilité lorsqu’il est omniprésent.</p>',
            bad: '<em>Ce résultat est vraiment très important.</em>',
            good: 'Ce résultat est <em>décisif</em>.',
            advanced: '<p>Les petites capitales relèvent de la mise en forme. Utilisez une fonction typographique dédiée et assurez un repli lisible lorsqu’elles ne sont pas disponibles.</p>'
          }
        ]
      },
      {
        id: 'abreviations', shortTitle: 'Abréviations', title: 'Abréger sans ambiguïté',
        lead: 'Une abréviation utile fait gagner de la place sans obliger le lecteur à deviner.',
        rules: [
          {
            title: 'Distinguer abréviation et contraction',
            summary: '<p>Une abréviation interrompue avant la fin du mot prend généralement un point. Une contraction qui conserve la dernière lettre n’en prend généralement pas.</p>',
            bad: 'M Dupont · Mme.',
            good: 'M. Dupont · Mme Dupont · Dr Martin',
            advanced: '<p>Les initiales de prénom prennent un point et restent liées au nom : <code>J. Dupont</code>. Plusieurs prénoms peuvent se composer <code>J.-P. Dupont</code>.</p>'
          },
          {
            title: 'Employer les formes conventionnelles',
            summary: '<p>Les abréviations usuelles ont une graphie stable. Évitez les finales longues inspirées de la prononciation.</p>',
            bad: 'N° 4 · 2ème éd. · etc...',
            good: 'nᵒ 4 · 2e éd. · etc.'
          },
          {
            title: 'Composer sigles et acronymes',
            summary: '<p>Les sigles modernes s’écrivent le plus souvent en capitales, sans points ni espaces. Un acronyme lexicalisé peut n’avoir qu’une capitale initiale.</p>',
            bad: 'O.N.U. · U. E.',
            good: 'ONU · UE · Unesco',
            note: 'Reprenez la graphie officielle de l’organisme ou celle du dictionnaire choisi.'
          },
          {
            title: 'Développer un sigle à sa première apparition',
            summary: '<p>Un lecteur ne connaît pas nécessairement les abréviations internes à un métier. Développez-les une fois, sauf si elles sont évidentes pour le public visé.</p>',
            bad: 'Le CRI encadre cette rédaction.',
            good: 'Le Code de rédaction interinstitutionnel (CRI) encadre cette rédaction.'
          },
          {
            title: 'Ne pas pluraliser les symboles',
            summary: '<p>Les symboles de mesure sont invariables et ne prennent pas de point.</p>',
            bad: '15 kgs · 20 min.',
            good: '15 kg · 20 min'
          }
        ],
        copies: [
          { id: 'numero', value: 'nᵒ', display: 'nᵒ', label: 'Numéro', ariaLabel: 'Copier l’abréviation numéro', type: 'pattern' },
          { id: 'madame', value: 'Mme', display: 'Mme', label: 'Madame', ariaLabel: 'Copier l’abréviation Madame', type: 'pattern' },
          { id: 'cest-a-dire', value: 'c.-à-d.', display: 'c.-à-d.', label: 'C’est-à-dire', ariaLabel: 'Copier l’abréviation c’est-à-dire', type: 'pattern' }
        ]
      },
      {
        id: 'document-professionnel', shortTitle: 'Documents professionnels', title: 'Composer un document professionnel',
        lead: 'Un document long paraît maîtrisé lorsque ses listes, légendes, notes et références suivent les mêmes décisions.',
        rules: [
          {
            title: 'Choisir une ponctuation de liste',
            summary: '<p>Une liste de fragments peut commencer par une minuscule sans point final. Une liste de phrases complètes prend majuscules et points. Ne mélangez pas les deux systèmes.</p>',
            bad: 'Vérifier le titre · les liens sont contrôlés. · Mise à jour de la date',
            good: 'vérifier le titre · contrôler les liens · mettre à jour la date'
          },
          {
            title: 'Introduire clairement une liste',
            summary: '<p>La phrase introductive doit conduire grammaticalement aux éléments suivants. Un deux-points annonce une liste qui la complète.</p>',
            bad: 'Le dossier comprend. — un résumé — deux annexes',
            good: 'Le dossier comprend : — un résumé — deux annexes'
          },
          {
            title: 'Rédiger des légendes autonomes',
            summary: '<p>Une légende identifie ce qui est montré sans obliger le lecteur à retrouver l’explication dans le corps. Elle prend un point lorsqu’elle forme une phrase.</p>',
            bad: 'Figure 2 — Résultats',
            good: 'Figure 2 — Évolution du taux de réponse entre 2024 et 2026.'
          },
          {
            title: 'Placer les appels de note de façon constante',
            summary: '<p>En composition française, l’appel de note est généralement collé au passage concerné et placé avant la ponctuation finale.</p>',
            bad: 'Cette méthode a été validée. 1',
            good: 'Cette méthode a été validée¹.',
            note: 'Une revue peut imposer une convention différente ; appliquez-la alors à tout le document.'
          },
          {
            title: 'Donner aux références une forme homogène',
            summary: '<p>Une référence doit permettre d’identifier l’auteur ou l’organisme, le titre, la date ou l’édition et l’adresse ou l’éditeur utile.</p>',
            bad: 'Source : site de l’Académie',
            good: 'Académie française, « Accentuation des majuscules », <em>Questions de langue</em>, consulté le 24 juillet 2026.'
          },
          {
            title: 'Créer une feuille de style',
            summary: '<p>Décidez avant publication comment écrire nombres, dates, sigles, titres, citations, légendes et références. Notez les exceptions propres à l’organisation.</p>',
            bad: '20h30, puis 20 h 30, puis 20:30 dans des contenus comparables',
            good: 'Une convention documentée par type de contenu',
            advanced: '<p>Dans un travail collectif, dix décisions réellement appliquées valent mieux qu’un manuel exhaustif que personne ne consulte.</p>'
          }
        ]
      },
      {
        id: 'ecriture-web', shortTitle: 'Écriture sur le web', title: 'Écrire sur le web',
        lead: 'Le support numérique impose parfois des compromis, mais il ne justifie ni la disparition des accents ni une ponctuation incohérente.',
        rules: [
          {
            title: 'Préserver la lisibilité des liens',
            summary: '<p>Utilisez un libellé explicite plutôt qu’une longue adresse dans une phrase. Si l’URL doit apparaître, vérifiez que la ponctuation finale n’entre pas dans le lien. Une adresse électronique reste intacte, sans espace : <code>prenom.nom@example.org</code>.</p>',
            bad: 'Toutes les règles sont ici : https://exemple.fr/guide?version=final. · prenom.nom @ example.org',
            good: 'Consultez le guide typographique complet. · prenom.nom@example.org'
          },
          {
            title: 'Ne pas couper une URL à la main',
            summary: '<p>Les navigateurs savent couper visuellement les adresses longues. Des espaces ou retours ajoutés manuellement peuvent rendre le lien inutilisable.</p>',
            bad: 'https://exemple.fr/guide- suivi d’un retour forcé',
            good: 'L’URL intacte, avec une mise en page qui autorise sa coupure visuelle.'
          },
          {
            title: 'Rendre les hashtags lisibles',
            summary: '<p>Les accents sont acceptés sur de nombreuses plateformes. Une capitale au début de chaque mot aide à lire un mot-dièse composé.</p>',
            bad: '#ecrirecorrectementenfrancais',
            good: '#ÉcrireCorrectementEnFrançais',
            note: 'Avant une campagne, vérifiez la graphie réellement recherchée sur la plateforme concernée.'
          },
          {
            title: 'Traiter les emojis comme des compléments',
            summary: '<p>Un emoji ne doit pas remplacer une information essentielle ni être le seul libellé d’un bouton. Ne séparez pas les caractères qui composent certaines séquences emoji.</p>',
            bad: 'Un bouton intitulé seulement « 💾 »',
            good: '💾 Enregistrer · Enregistrer'
          },
          {
            title: 'Vérifier les espaces après publication',
            summary: '<p>Certains éditeurs et réseaux remplacent les espaces insécables. Publiez un extrait de test et contrôlez les retours à la ligne dans le contenu final.</p>',
            bad: 'Supposer que le copier-coller a conservé les espaces invisibles.',
            good: 'Vérifier la source, le rendu publié et un retour à la ligne étroit.',
            advancedTitle: 'Repli pragmatique',
            advanced: '<p>Si une plateforme supprime la fine insécable, une insécable normale est un repli raisonnable. Si aucune n’est conservée, privilégiez un texte stable plutôt qu’un montage fragile.</p>'
          },
          {
            title: 'Ne pas simuler la mise en page avec des espaces',
            summary: '<p>Les suites d’espaces, tabulations et retours forcés ne remplacent pas une grille, un tableau ou une feuille de style.</p>',
            bad: 'Nom          Fonction          Date',
            good: 'Un vrai tableau avec des en-têtes, ou une structure HTML adaptée.'
          }
        ]
      }
    ],
    faq: [
      { question: 'Faut-il accentuer les majuscules en français ?', answer: 'Oui. Les accents, trémas et cédilles ont pleine valeur orthographique sur les capitales : <code>École</code>, <code>À bientôt</code>, <code>ÇA</code>.' },
      { question: 'Faut-il une espace avant ?, !, ; et : ?', answer: 'Dans les conventions françaises de ce guide, une fine insécable précède <code>?</code>, <code>!</code> et <code>;</code>, tandis qu’une insécable normale précède <code>:</code>. Les usages régionaux peuvent différer.' },
      { question: 'Quelles espaces faut-il mettre dans les guillemets français ?', answer: 'Une espace insécable sépare le texte de <code>«</code> et <code>»</code>. Une fine insécable donne un rendu discret : <code>« exemple »</code>. Une insécable normale reste un bon repli.' },
      { question: 'Où placer le point par rapport aux guillemets ?', answer: 'La ponctuation propre aux paroles citées reste dedans : <code>« Pourquoi ? »</code>. La ponctuation de la phrase principale vient après lorsque les mots cités y sont intégrés : <code>un « cas particulier ».</code>' },
      { question: 'Quelle différence entre -, –, — et − ?', answer: 'Le trait d’union <code>-</code> relie des mots ; le demi-cadratin <code>–</code> marque une plage ; le cadratin <code>—</code> introduit une incise ou une réplique ; le signe moins <code>−</code> sert aux nombres négatifs et opérations.' },
      { question: 'Peut-on écrire oe à la place de œ ?', answer: 'Pas dans un texte soigné lorsque le mot comporte la ligature. On écrit <code>cœur</code>, <code>œuvre</code>, <code>sœur</code> et <code>bœuf</code>. Les moteurs de recherche peuvent toutefois accepter les deux saisies.' },
      { question: 'Comment écrire correctement une heure ?', answer: 'Dans un texte courant : <code>9 h</code>, <code>14 h 05</code> ou <code>20 h 30</code>, avec un <code>h</code> minuscule et des espaces insécables.' },
      { question: 'Les mêmes règles s’appliquent-elles partout dans la francophonie ?', answer: 'Non. Les capitales accentuées sont largement partagées, mais certains espacements, guillemets, symboles monétaires et usages administratifs varient. La charte du destinataire reste prioritaire.' }
    ],
    sources: [sharedSources.lexique, sharedSources.academy, sharedSources.eu, sharedSources.oqlf, sharedSources.bipm, sharedSources.unicode]
  },

  en: {
    lang: 'en',
    kicker: 'French typography guide',
    title: 'French Typography: The Complete Guide',
    subtitle: 'The rules, characters, and spacing conventions that make written French clear and professional.',
    intro: 'This guide is for anyone who writes in French, from everyday email to edited publications. It explains French conventions in English and calls out regional differences when they matter.',
    specimenTitle: 'One sentence before and after French typographic correction',
    beforeLabel: 'Before',
    afterLabel: 'After',
    beforeText: 'A 20h30, Elise a dit : "Ca coute 25 euros - et c\'est deja pret..."',
    afterText: 'À 20 h 30, Élise a dit : « Ça coûte 25 € — et c’est déjà prêt… »',
    correctionsLabel: 'Corrections applied',
    corrections: ['accented capitals', 'French time spacing', 'French quotation marks', 'nonbreaking spaces', 'curly apostrophe', 'em dash', 'ellipsis'],
    printLabel: 'Print this guide',
    printShortLabel: 'Printable version',
    updatedLabel: 'Reviewed July 25, 2026',
    tocLabel: 'In this guide',
    finderTitle: 'What do you need to write?',
    finderLead: 'Jump straight to the rules people look up most often.',
    finderLinks: [
      { href: '#accents-ligatures-r1', label: 'An accented capital' },
      { href: '#accents-ligatures-r3', label: 'Œ, œ, Æ, or æ' },
      { href: '#espaces-ponctuation-r2', label: 'Correct French spacing' },
      { href: '#citations-dialogues-r1', label: 'French quotation marks' },
      { href: '#apostrophes-tirets-r1', label: 'A typographic apostrophe' },
      { href: '#apostrophes-tirets-r3', label: 'The right dash' },
      { href: '#nombres-dates-unites-r5', label: 'A date or time' },
      { href: '#nombres-dates-unites-r4', label: 'A price or unit' },
      { href: '#abreviations-r1', label: 'An abbreviation' },
      { href: '#ecriture-web-r1', label: 'An email or URL' }
    ],
    chapterIndexLabel: 'In this chapter',
    mobileContentsLabel: 'Contents',
    mobileTopLabel: 'Top',
    mobileIntroLabel: 'Introduction',
    avoidLabel: 'Avoid',
    preferLabel: 'Write',
    advancedLabel: 'Editorial cases and variants',
    copyPaletteLabel: 'Characters to copy',
    copyPaletteHint: 'Select a character to copy it.',
    faqTitle: 'Frequently asked questions',
    faqLead: 'Short answers to the French typography questions writers ask most often.',
    sourcesTitle: 'Sources and method',
    sourcesLead: 'Style guides do not always agree. This page follows a coherent France-based convention and identifies important regional variants.',
    reviewedLabel: 'Last reviewed:',
    reviewedDate: 'July 25, 2026',
    feedbackLabel: 'Report a rule that needs review',
    feedbackUrl: '/en/feedback?source=typography-guide&subject=French%20typography%20rule%20to%20review',
    finalTitle: 'Try typing this sentence',
    finalText: 'These rules become much easier to follow when the right characters are directly available from your keyboard.',
    finalSentence: 'À 20 h 30, Élise écrit : « Un cœur, 25 €, 3,5 kg — déjà prêt ! »',
    tryLabel: 'Try it in the tester',
    downloadLabel: 'Download AZERTY Global',
    downloadUrl: '/en/download',
    printUrlLabel: 'Online version:',
    absoluteUrl: 'https://azerty.global/en/french-typography',
    chapters: [
      {
        id: 'accents-ligatures', shortTitle: 'Accents and ligatures', title: 'Keep accents, cedillas, and ligatures',
        exampleLang: 'fr',
        lead: 'Diacritics are part of French spelling. Contrary to a common English-language assumption, French capitals keep them.',
        rules: [
          { title: 'Accent capital letters', summary: '<p>Accents carry full spelling value on capitals. They improve recognition and can prevent ambiguity.</p>', bad: 'A partir de lundi, l’Ecole sera fermée.', good: 'À partir de lundi, l’École sera fermée.', note: 'The Académie française explicitly recommends systematic accenting of capitals.' },
          { title: 'Keep the cedilla and diaeresis', summary: '<p>The cedilla and diaeresis belong to the letter and remain present in all-capital text.</p>', bad: 'CA COMMENCE À NOEL · une coincidence', good: 'ÇA COMMENCE À NOËL · une coïncidence' },
          { title: 'Use lexical ligatures', summary: '<p>In words that contain them, <code>œ</code> and <code>æ</code> are letters, not decorative substitutions. Common examples include <em>cœur</em>, <em>œuvre</em>, and <em>sœur</em>.</p>', bad: 'une oeuvre au coeur du projet', good: 'une œuvre au cœur du projet', advancedTitle: 'Search and legacy software', advanced: '<p>Some search engines still distinguish <code>œ</code> from <code>oe</code>. Published copy should keep the correct spelling; search should accept both inputs.</p>' },
          { title: 'Prefer precomposed characters', summary: '<p>An <code>é</code> can be one character or an <code>e</code> followed by a combining accent. They can look identical, but the latter may disrupt search, sorting, and counting. Use the precomposed character when it exists.</p>', bad: 'e + combining acute accent', good: 'é (U+00E9)', note: 'Unicode defines both representations; NFC normalization harmonizes them.', exampleLang: 'en' }
        ],
        copies: [
          { id: 'capital-a-grave', value: 'À', display: 'À', label: 'Capital A grave', ariaLabel: 'Copy capital A grave' },
          { id: 'capital-e-aigu', value: 'É', display: 'É', label: 'Capital E acute', ariaLabel: 'Copy capital E acute' },
          { id: 'capital-c-cedille', value: 'Ç', display: 'Ç', label: 'Capital C cedilla', ariaLabel: 'Copy capital C cedilla' },
          { id: 'ligature-oe', value: 'œ', display: 'œ', label: 'oe ligature', ariaLabel: 'Copy lowercase oe ligature' },
          { id: 'ligature-oe-capital', value: 'Œ', display: 'Œ', label: 'Capital OE ligature', ariaLabel: 'Copy capital OE ligature' },
          { id: 'ligature-ae', value: 'æ', display: 'æ', label: 'ae ligature', ariaLabel: 'Copy lowercase ae ligature' },
          { id: 'ligature-ae-capital', value: 'Æ', display: 'Æ', label: 'Capital AE ligature', ariaLabel: 'Copy capital AE ligature' }
        ]
      },
      {
        id: 'espaces-ponctuation', shortTitle: 'Spacing and punctuation', title: 'Space and punctuate French text',
        exampleLang: 'fr',
        lead: 'French uses visible and nonbreaking spaces differently from English, especially before two-part punctuation marks.',
        rules: [
          { title: 'Close up simple punctuation', summary: '<p>Commas and periods follow the preceding word with no space. A normal space follows them.</p>', bad: 'Un texte clair , précis et bref .', good: 'Un texte clair, précis et bref.' },
          { title: 'Protect two-part punctuation', summary: '<p>In polished French from France, a nonbreaking space precedes a colon. A narrow nonbreaking space precedes a semicolon, exclamation mark, and question mark.</p>', bad: 'Attention ! Voici le risque : une coupure.', good: 'Attention ! Voici le risque : une coupure.', advancedTitle: 'Regional variants', advanced: '<p>Canadian French spacing differs before some marks. Follow the recipient’s house style for institutional work. <a href="https://vitrinelinguistique.oqlf.gouv.qc.ca/22039/la-typographie/espacement/espacement-avant-et-apres-les-signes-de-ponctuation-et-les-symboles">Source: OQLF</a>.</p>' },
          { title: 'Close parentheses and brackets around their content', summary: '<p>Do not add a space after an opening mark or before a closing mark. A nonbreaking space can still join a label to its number.</p>', bad: 'Le résultat ( provisoire ) est publié [ annexe 2 ].', good: 'Le résultat (provisoire) est publié [annexe 2].' },
          { title: 'Use slashes sparingly', summary: '<p>A slash is usually closed up between short terms. In a complex sentence, writing the relationship out is clearer.</p>', bad: 'le formulaire client / fournisseur', good: 'le formulaire client/fournisseur · destiné au client ou au fournisseur' },
          { title: 'Space mathematical operators', summary: '<p>Separate operators and comparison signs from values when they express a relationship. Use the true minus sign.</p>', bad: '8+4=12 · x>=10', good: '8 + 4 = 12 · x ≥ 10' }
        ],
        copies: [
          { id: 'nbsp', value: ' ', display: '⍽', label: 'Nonbreaking space', ariaLabel: 'Copy a nonbreaking space', type: 'space' },
          { id: 'nnbsp', value: ' ', display: '▸', label: 'Narrow no-break space', ariaLabel: 'Copy a narrow nonbreaking space', type: 'space' },
          { id: 'not-equal', value: '≠', display: '≠', label: 'Not equal', ariaLabel: 'Copy the not equal sign' },
          { id: 'less-equal', value: '≤', display: '≤', label: 'Less than or equal', ariaLabel: 'Copy the less than or equal sign' }
        ]
      },
      {
        id: 'citations-dialogues', shortTitle: 'Quotations and dialogue', title: 'Quote speech and write dialogue',
        exampleLang: 'fr',
        lead: 'French quotation marks show the boundaries of reported speech, while punctuation shows which sentence each mark belongs to.',
        rules: [
          { title: 'Use French quotation marks', summary: '<p>A primary quotation in French uses <code>«</code> and <code>»</code>, with nonbreaking spaces inside. This guide uses narrow nonbreaking spaces.</p>', bad: 'Il a répondu "je viendrai".', good: 'Il a répondu : « Je viendrai. »' },
          { title: 'Distinguish nested quotations', summary: '<p>Use curly English double quotation marks for a quotation inside French guillemets.</p>', bad: '« Il m’a répondu « peut-être ». »', good: '« Il m’a répondu “peut-être”. »', advanced: '<p>A third level can use <code>‘…’</code>, but rewriting or setting a block quotation is often easier to read.</p>' },
          { title: 'Place punctuation by meaning', summary: '<p>Punctuation that belongs to the quoted words stays inside. Sentence punctuation stays outside when it does not belong to the quotation.</p>', bad: 'Elle demanda : « Avez-vous terminé ? ».', good: 'Elle demanda : « Avez-vous terminé ? » · un « progrès décisif ».' },
          { title: 'Start dialogue lines with an em dash', summary: '<p>In sustained literary dialogue, each new speaker can begin with an em dash. Repeating quotation marks on every line is unnecessary.</p>', bad: '- Vous venez ?<br>- Dans une minute.', good: '— Vous venez ?<br>— Dans une minute.' },
          { title: 'Set long quotations apart', summary: '<p>A long quotation works best as an indented block, without added quotation marks when the layout already identifies it. Keep the author and source visible.</p>', bad: 'A long quotation buried in a paragraph with no attribution.', good: 'A separate block followed by a clear attribution and source.', exampleLang: 'en' }
        ],
        copies: [
          { id: 'quotes-fr', value: '«  »', display: '« »', label: 'French quotation marks', ariaLabel: 'Copy French quotation marks with narrow nonbreaking spaces', type: 'pattern' },
          { id: 'quotes-en-curly', value: '“”', display: '“”', label: 'Nested quotation marks', ariaLabel: 'Copy curly double quotation marks', type: 'pattern' },
          { id: 'em-dash-dialogue', value: '—', display: '—', label: 'Em dash', ariaLabel: 'Copy an em dash' }
        ]
      },
      {
        id: 'apostrophes-tirets', shortTitle: 'Apostrophes and dashes', title: 'Choose the right apostrophe, hyphen, or dash',
        exampleLang: 'fr',
        lead: 'These marks may look similar, but French uses each for a different job: elision, compounds, ranges, asides, or mathematics.',
        rules: [
          { title: 'Use a curly apostrophe in prose', summary: '<p>The curly apostrophe <code>’</code> is standard in published French. Keep the straight apostrophe for code, identifiers, and systems that require it.</p>', bad: 'Aujourd\'hui, c\'est l\'heure d\'agir.', good: 'Aujourd’hui, c’est l’heure d’agir.' },
          { title: 'Reserve the hyphen for linked words', summary: '<p>The hyphen joins compounds, certain verb forms, and some spelled-out numbers.</p>', bad: 'Est ce clair ? · dit il', good: 'Est-ce clair ? · dit-il' },
          { title: 'Protect a hyphen when needed', summary: '<p>The nonbreaking hyphen <code>‑</code> prevents a line break. Use it for a name or short reference that must stay together, after checking compatibility.</p>', bad: 'Jean-Paul broken at the end of a line', good: 'Jean‑Paul kept together', exampleLang: 'en' },
          { title: 'Distinguish the minus sign', summary: '<p>The mathematical minus <code>−</code> is longer than a hyphen and aligns with other operators.</p>', bad: '-12 °C · 8 - 3 = 5', good: '−12 °C · 8 − 3 = 5' },
          { title: 'Use en and em dashes by function', summary: '<p>An en dash joins the ends of a range. An em dash marks a French aside or introduces dialogue.</p>', bad: 'pages 12-18 · une solution - simple - et fiable', good: 'pages 12–18 · une solution — simple — et fiable', advanced: '<p>Some French house styles use an en dash for asides. Consistency across the document matters more than switching styles midstream. <a href="https://style-guide.europa.eu/fr/content/-/isg/topic?identifier=10.1-punctuation">Source: Interinstitutional Style Guide</a>.</p>' },
          { title: 'Use the ellipsis character', summary: '<p>An ellipsis is one character. Do not combine it with a final period or with <em>etc.</em></p>', bad: 'Il reste trois options... etc...', good: 'Il reste trois options… · Il reste trois options, etc.' }
        ],
        copies: [
          { id: 'apostrophe', value: '’', display: '’', label: 'Curly apostrophe', ariaLabel: 'Copy a curly apostrophe' },
          { id: 'nonbreaking-hyphen', value: '‑', display: '‑', label: 'Nonbreaking hyphen', ariaLabel: 'Copy a nonbreaking hyphen' },
          { id: 'minus', value: '−', display: '−', label: 'Minus sign', ariaLabel: 'Copy a minus sign' },
          { id: 'en-dash', value: '–', display: '–', label: 'En dash', ariaLabel: 'Copy an en dash' },
          { id: 'em-dash', value: '—', display: '—', label: 'Em dash', ariaLabel: 'Copy an em dash' },
          { id: 'ellipsis', value: '…', display: '…', label: 'Ellipsis', ariaLabel: 'Copy an ellipsis' }
        ]
      },
      {
        id: 'nombres-dates-unites', shortTitle: 'Numbers, dates, and units', title: 'Write numbers, dates, times, and units',
        exampleLang: 'fr',
        lead: 'French reverses several English conventions: it uses a decimal comma, spaces for digit grouping, and a space before most unit and currency symbols.',
        rules: [
          { title: 'Use the decimal comma', summary: '<p>A comma is the normal French decimal separator. Keep the period for code and technical formats that require it.</p>', bad: 'Le taux atteint 3.5%.', good: 'Le taux atteint 3,5 %.' },
          { title: 'Group long numbers with spaces', summary: '<p>A nonbreaking space separates groups of three digits. Do not apply grouping to years, page numbers, codes, or identifiers.</p>', bad: '1250000 habitants · 2,500 exemplaires', good: '1 250 000 habitants · 2 500 exemplaires', note: 'Four-digit numbers may remain ungrouped under some house styles. Never change a year such as 2026.' },
          { title: 'Separate a value from its unit', summary: '<p>A nonbreaking space joins the value to the symbol. Unit symbols take neither a period nor a plural ending.</p>', bad: '25kg · 12 kms · 30°C', good: '25 kg · 12 km · 30 °C', advanced: '<p>Angle symbols are closed up: <code>45°</code>, <code>12′</code>, and <code>30″</code>.</p>' },
          { title: 'Space percentages and currency symbols', summary: '<p>In common French usage, a nonbreaking space separates the number from the symbol.</p>', bad: '25% · 19,90€', good: '25 % · 19,90 €', advancedTitle: 'Currency variants', advanced: '<p>Symbol position varies by language and currency. In Canadian French, the dollar sign usually follows the amount: <code>25 $</code>. <a href="https://vitrinelinguistique.oqlf.gouv.qc.ca/22039/la-typographie/espacement/espacement-avant-et-apres-les-signes-de-ponctuation-et-les-symboles">Source: OQLF</a>.</p>' },
          { title: 'Write times with a lowercase h', summary: '<p>In running French text, use a lowercase <code>h</code> surrounded by nonbreaking spaces. Colon formats suit interfaces and technical data.</p>', bad: '20h30 · 09:05 dans le texte courant', good: '20 h 30 · 9 h 05' },
          { title: 'Keep dates and ordinals restrained', summary: '<p>French weekdays and months are lowercase. Standard ordinal abbreviations are <code>1er</code>, <code>1re</code>, and <code>2e</code>.</p>', bad: 'Vendredi, 24 Juillet 2026 · 2ème chapitre', good: 'vendredi 24 juillet 2026 · 2e chapitre', advanced: '<p>ISO <code>2026-07-24</code> suits data and filenames. Centuries are traditionally written with Roman numerals: <code>XXI<sup>e</sup> siècle</code>. Keep telephone numbers in the grouping expected by the country and, where practical, prevent line breaks inside them: <code>01 23 45 67 89</code> or <code>+33 1 23 45 67 89</code>.</p>' }
        ],
        copies: [
          { id: 'degree', value: '°', display: '°', label: 'Degree', ariaLabel: 'Copy the degree symbol' },
          { id: 'prime', value: '′', display: '′', label: 'Prime', ariaLabel: 'Copy the prime symbol' },
          { id: 'double-prime', value: '″', display: '″', label: 'Double prime', ariaLabel: 'Copy the double prime symbol' },
          { id: 'ordinal-first', value: '1er', display: '1er', label: 'Premier', ariaLabel: 'Copy the French abbreviation for premier', type: 'pattern' },
          { id: 'ordinal-first-feminine', value: '1re', display: '1re', label: 'Première', ariaLabel: 'Copy the French abbreviation for première', type: 'pattern' }
        ]
      },
      {
        id: 'capitales-italiques-titres', shortTitle: 'Capitals and titles', title: 'Use capitals, italics, and titles',
        exampleLang: 'fr',
        lead: 'French capitalization is much lighter than English title case. Italics identify a function, not general importance.',
        rules: [
          { title: 'Limit capital letters', summary: '<p>Weekdays, months, and language names are lowercase. Demonyms are capitalized as nouns but not as adjectives.</p>', bad: 'Lundi 14 Mars · un texte en Français', good: 'lundi 14 mars · un texte en français · les Français' },
          { title: 'Capitalize institutions sparingly', summary: '<p>The capital normally falls on the first noun that individualizes an institution. Later words stay lowercase unless they are proper names.</p>', bad: 'l’Assemblée Nationale · le Conseil Constitutionnel', good: 'l’Assemblée nationale · le Conseil constitutionnel', note: 'An organization’s official name and house style take precedence.' },
          { title: 'Use sentence case for headings', summary: '<p>French headings do not capitalize every major word. Capitalize the first word and proper names.</p>', bad: 'Écrire Correctement En Français', good: 'Écrire correctement en français' },
          { title: 'Italicize standalone works', summary: '<p>Books, films, newspapers, and other standalone works are generally italicized. Short works within a larger whole may take quotation marks.</p>', bad: 'J’ai relu « Les Misérables ».', good: 'J’ai relu <em>Les Misérables</em>.' },
          { title: 'Give italics one clear function', summary: '<p>Italics can identify a work, defined term, unassimilated foreign word, or brief emphasis. They lose meaning when used everywhere.</p>', bad: '<em>Ce résultat est vraiment très important.</em>', good: 'Ce résultat est <em>décisif</em>.', advanced: '<p>Small capitals are formatting, not spelling. Use a real typographic feature and provide a readable fallback.</p>' }
        ]
      },
      {
        id: 'abreviations', shortTitle: 'Abbreviations', title: 'Abbreviate without ambiguity',
        exampleLang: 'fr',
        lead: 'A useful abbreviation saves space without making the reader decode internal jargon.',
        rules: [
          { title: 'Distinguish truncations from contractions', summary: '<p>An abbreviation cut before the end of a word normally takes a period. A contraction that keeps the final letter usually does not.</p>', bad: 'M Dupont · Mme.', good: 'M. Dupont · Mme Dupont · Dr Martin', advanced: '<p>A given-name initial takes a period and stays with the surname: <code>J. Dupont</code>. Multiple given names may be set as <code>J.-P. Dupont</code>.</p>' },
          { title: 'Use conventional forms', summary: '<p>Common French abbreviations have stable spellings. Avoid long endings based on pronunciation.</p>', bad: 'N° 4 · 2ème éd. · etc...', good: 'nᵒ 4 · 2e éd. · etc.' },
          { title: 'Set initialisms without periods', summary: '<p>Modern initialisms are usually set in capitals without periods or spaces. A lexicalized acronym may use an initial capital only.</p>', bad: 'O.N.U. · U. E.', good: 'ONU · UE · Unesco', note: 'Follow the organization’s official spelling or your chosen dictionary.' },
          { title: 'Expand an initialism on first use', summary: '<p>Readers may not know an organization’s internal abbreviations. Expand them once unless they are obvious to the target audience.</p>', bad: 'Le CRI encadre cette rédaction.', good: 'Le Code de rédaction interinstitutionnel (CRI) encadre cette rédaction.' },
          { title: 'Do not pluralize symbols', summary: '<p>Measurement symbols are invariant and take no period.</p>', bad: '15 kgs · 20 min.', good: '15 kg · 20 min' }
        ],
        copies: [
          { id: 'numero', value: 'nᵒ', display: 'nᵒ', label: 'Number', ariaLabel: 'Copy the French number abbreviation', type: 'pattern' },
          { id: 'madame', value: 'Mme', display: 'Mme', label: 'Madame', ariaLabel: 'Copy the French abbreviation for Madame', type: 'pattern' },
          { id: 'cest-a-dire', value: 'c.-à-d.', display: 'c.-à-d.', label: 'That is', ariaLabel: 'Copy the French abbreviation for c’est-à-dire', type: 'pattern' }
        ]
      },
      {
        id: 'document-professionnel', shortTitle: 'Professional documents', title: 'Compose a professional document',
        exampleLang: 'fr',
        lead: 'A long document feels controlled when its lists, captions, notes, and references follow the same decisions.',
        rules: [
          { title: 'Choose one list punctuation system', summary: '<p>A fragment list may begin lowercase and omit final periods. A list of full sentences takes capitals and periods. Do not mix the systems.</p>', bad: 'Vérifier le titre · les liens sont contrôlés. · Mise à jour de la date', good: 'vérifier le titre · contrôler les liens · mettre à jour la date' },
          { title: 'Introduce a list clearly', summary: '<p>The introductory sentence must lead grammatically into its items. A colon introduces a list that completes the sentence.</p>', bad: 'Le dossier comprend. — un résumé — deux annexes', good: 'Le dossier comprend : — un résumé — deux annexes' },
          { title: 'Write standalone captions', summary: '<p>A caption identifies what the reader sees without forcing a return to the body. Use a period when the caption is a full sentence.</p>', bad: 'Figure 2 — Résultats', good: 'Figure 2 — Évolution du taux de réponse entre 2024 et 2026.' },
          { title: 'Place note calls consistently', summary: '<p>In French composition, a note call is usually closed up to the relevant text and placed before final punctuation.</p>', bad: 'Cette méthode a été validée. 1', good: 'Cette méthode a été validée¹.', note: 'If a journal mandates another convention, apply it throughout.' },
          { title: 'Make references complete and consistent', summary: '<p>A reference should identify the author or organization, title, date or edition, and useful publisher or address.</p>', bad: 'Source : site de l’Académie', good: 'Académie française, « Accentuation des majuscules », <em>Questions de langue</em>, accessed July 24, 2026.' },
          { title: 'Create a short house style', summary: '<p>Decide how your publication handles numbers, dates, initialisms, headings, quotations, captions, and references before release.</p>', bad: '20h30, then 20 h 30, then 20:30 in equivalent prose', good: 'One documented convention for each content type', advanced: '<p>For collaborative documents, ten decisions people follow beat an exhaustive manual nobody opens.</p>', exampleLang: 'en' }
        ]
      },
      {
        id: 'ecriture-web', shortTitle: 'Writing for the web', title: 'Write French for the web',
        lead: 'Digital platforms sometimes force compromises, but they do not justify dropping accents or mixing punctuation systems.',
        rules: [
          { title: 'Keep links readable', summary: '<p>Use descriptive link text instead of a long address in a sentence. If the URL must be visible, keep final punctuation outside the link. An email address stays intact, with no spaces: <code>prenom.nom@example.org</code>.</p>', bad: 'Toutes les règles sont ici : https://exemple.fr/guide?version=final. · prenom.nom @ example.org', good: 'Consultez le guide typographique complet. · prenom.nom@example.org', exampleLang: 'fr' },
          { title: 'Do not break a URL manually', summary: '<p>Browsers can wrap long addresses visually. Added spaces or manual line breaks can make the URL unusable.</p>', bad: 'https://exemple.fr/guide- followed by a forced break', good: 'An intact URL with CSS that allows visual wrapping.' },
          { title: 'Make hashtags readable', summary: '<p>Many platforms accept accented hashtags. Capitalizing each word improves readability in a compound hashtag.</p>', bad: '#ecrirecorrectementenfrancais', good: '#ÉcrireCorrectementEnFrançais', note: 'Before a campaign, check which spelling people actually search on that platform.' },
          { title: 'Treat emoji as supporting meaning', summary: '<p>An emoji should not replace essential information or serve as the only button label. Do not separate the code points that form an emoji sequence.</p>', bad: 'A button labeled only “💾”', good: '💾 Enregistrer · Enregistrer', goodLang: 'fr' },
          { title: 'Verify spaces after publishing', summary: '<p>Some editors and social platforms replace nonbreaking spaces. Publish a test excerpt and inspect line wrapping in the final content.</p>', bad: 'Assume copy and paste preserved invisible spaces.', good: 'Check the source, published result, and a narrow line wrap.', advancedTitle: 'Pragmatic fallback', advanced: '<p>If a platform strips narrow nonbreaking spaces, a normal nonbreaking space is a reasonable fallback. If neither survives, choose stable, readable text over a fragile workaround.</p>' },
          { title: 'Do not simulate layout with spaces', summary: '<p>Runs of spaces, tabs, and forced line breaks do not replace a grid, table, or style sheet.</p>', bad: 'Nom          Fonction          Date', good: 'A real table with headers or an appropriate HTML structure.', badLang: 'fr' }
        ]
      }
    ],
    faq: [
      { question: 'Do French capital letters keep their accents?', answer: 'Yes. Accents, diaereses, and cedillas retain full spelling value on capitals: <code>École</code>, <code>À bientôt</code>, and <code>ÇA</code>.' },
      { question: 'Does French use a space before ?, !, ;, and :?', answer: 'Under the France-based convention used here, a narrow nonbreaking space precedes <code>?</code>, <code>!</code>, and <code>;</code>, while a normal nonbreaking space precedes <code>:</code>. Regional styles differ.' },
      { question: 'What spaces go inside French quotation marks?', answer: 'A nonbreaking space separates the text from <code>«</code> and <code>»</code>. A narrow nonbreaking space gives a refined result: <code>« exemple »</code>. A normal nonbreaking space is a sound fallback.' },
      { question: 'Where does the period go with French quotation marks?', answer: 'Punctuation belonging to the quoted speech stays inside: <code>« Pourquoi ? »</code>. Sentence punctuation follows the closing mark when the quoted words are integrated into the sentence.' },
      { question: 'What is the difference between -, –, —, and −?', answer: 'The hyphen <code>-</code> joins words; the en dash <code>–</code> marks a range; the em dash <code>—</code> marks an aside or dialogue; the minus sign <code>−</code> belongs in mathematics.' },
      { question: 'Can I write oe instead of œ?', answer: 'Not in polished copy when the word uses the ligature. Write <code>cœur</code>, <code>œuvre</code>, <code>sœur</code>, and <code>bœuf</code>. Search systems can still accept both inputs.' },
      { question: 'How do I write a time in French?', answer: 'In running text, write <code>9 h</code>, <code>14 h 05</code>, or <code>20 h 30</code>, with a lowercase <code>h</code> and nonbreaking spaces.' },
      { question: 'Are French typography rules the same across the Francophone world?', answer: 'No. Accented capitals are widely shared, but spacing, quotation marks, currency symbols, and administrative conventions vary. Follow the recipient’s house style when one exists.' }
    ],
    sources: [
      sharedSources.lexiqueEn,
      '<a href="https://www.academie-francaise.fr/questions-de-langue">Académie française, <cite>Questions de langue</cite></a>, especially “Accentuation des majuscules”',
      '<a href="https://style-guide.europa.eu/fr/content/-/isg/topic?identifier=10.1-punctuation">Publications Office of the European Union, <cite>Interinstitutional style guide</cite></a>',
      '<a href="https://vitrinelinguistique.oqlf.gouv.qc.ca/">Office québécois de la langue française, <cite>Vitrine linguistique</cite></a>',
      '<a href="https://www.bipm.org/en/publications/si-brochure">International Bureau of Weights and Measures, <cite>The International System of Units</cite></a>, ninth edition',
      sharedSources.unicodeEn
    ]
  }
};
