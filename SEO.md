# SEO, GEO et métadonnées : AZERTY Global, site v2

<!--
  Créé le 2026-09-28. Décisions d'Antoine en QCM le 2026-09-28, et décisions
  antérieures de la direction artistique (`operations/refonte-site/direction-artistique.md`,
  entrées du 2026-08-29) et du lot 7 de l'audit v2.
  Registre : `operations/refonte-site/registre-decisions.md`.

  Statut : OPPOSABLE pour les § 1 à 4. Le § 5 (cibles) est une base de travail
  mesurée, révisable.

  Voisins : `REDACTION.md` (lexique, typographie, chiffres autorisés), qui
  s'applique aussi aux métadonnées ; `DESIGN.md` pour le visuel.
  Implémentation : `src/_includes/v2/base.njk` (title, meta, OG, Twitter,
  hreflang, JSON-LD à partir du front-matter).
-->

## 1. Title

- **Format :** « Sujet – AZERTY Global », avec un tiret demi-cadratin (–).
  Sans suffixe si le sujet contient déjà la marque (« Soutenir AZERTY
  Global »). Ni année, ni esperluette, ni « | » ou « — » (2026-09-28).
- **Longueur :** 60 caractères au plus, suffixe compris.
- **Contenu :** le sujet de la page dans les mots du visiteur ; il peut reprendre
  une requête telle qu'elle se tape, même si la tournure est interdite dans le
  texte visible. Cas actés : « C’est quoi AZERTY Global ? Le clavier français
  corrigé » sur /a-propos (A295, exemption C-03).
- **Typographie :** apostrophe ’ dans le title (C-02). Le lexique de
  `REDACTION.md` s'applique.
- `og:title` et `twitter:title` reprennent le title (automatique dans
  `base.njk`).

## 2. Description et Open Graph

- **Longueur :** de 120 à 155 caractères.
- **Contenu :** ce que la page apporte au visiteur. Le ton (fait d'abord ou
  exhortation) se décide page par page avec Antoine (2026-09-28). Les chiffres
  viennent du tableau de `REDACTION.md` § 6.
- **Typographie :** apostrophe droite ' dans `description`, `ogDescription`,
  `twitterDescription` et `ogImageAlt` (C-02).
- **Descriptions actées :** accueil (A569 : « Un AZERTY amélioré, gratuit et
  libre : majuscules accentuées É È Ç À, guillemets « », symboles de
  programmation à portée de main. Windows, macOS et Linux. »), /comparatif
  (A570), /a-propos (a-propos-decisions.md, série 4).
- **Image :** `ogImage` en tête de page si la page en a une, sinon
  `/assets/og-image.png` (1200 × 630). `ogImageAlt` décrit l'image, pas la
  page.

## 3. Données structurées (JSON-LD)

- **Socle de chaque page :** `WebPage` (ou son sous-type), `BreadcrumbList`,
  `Organization` par référence (2026-09-28).
- **Type propre selon la page :**

  | Page | Type |
  |---|---|
  | /download | `SoftwareApplication` (+ `Offer` à 0 €) |
  | /a-propos | `AboutPage` |
  | /contact | `ContactPage` |
  | /histoire-azerty | `Article` |
  | /guide, /dev | `TechArticle` |
  | /presse, /nouveautes | `WebPage` (un `NewsArticle` seulement pour une annonce datée) |

- **Interdit : `FAQPage`.** Google ne l'affiche plus que pour des sites
  gouvernementaux ou de santé ; le balisage est inerte et duplique les
  questions entre pages. Le texte visible des FAQ reste, puisque c'est lui que
  citent les moteurs génératifs (direction artistique, 2026-08-29 ; étendu à
  toutes les pages v2 le 2026-09-28).
- **Cohérence :** un `name`, une `description` ou une `featureList` reprend le
  texte visible et le lexique (« Antislash », « E dans l'O (œ) », A569, A550),
  avec l'apostrophe droite.
- Changer un type de schéma, une URL canonique ou l'indexation n'est jamais un
  effet de bord d'une correction de texte.

## 4. GEO : être cité correctement par les IA

- **Phrases citables :** les phrases d'identité de `REDACTION.md` § 1 figurent
  telles quelles dans le texte visible, près du haut de la page qui en traite.
- **Faits datés et sourcés :** un chiffre cité garde sa base et son lien de
  méthode dans la même phrase ou juste après (`REDACTION.md` § 6).
- **`llms.txt` :** source `docs/llms.txt`, copiée à la racine par `.eleventy.js`
  (convention llmstxt.org) ; complément `docs/llms-characters.txt`. Ces
  fichiers suivent le même lexique, les mêmes chiffres et les mêmes interdits
  que les pages. Chaque modification d'une phrase d'identité, d'un chiffre ou
  de la liste des cinq améliorations les met à jour dans le même commit.
- **Positionnement vis-à-vis des agents IA :** M&P § 7, « Cible 3 : Concepteurs
  d'agents IA ».

Écarts connus au 2026-09-28 dans `docs/llms.txt` : « 5 améliorations
bénéfiques », « installeurs », « tout en préservant vos habitudes de frappe »,
coches dans le tableau. À reprendre au passage du script de recette.

## 5. Requête cible et maillage par page

Une requête cible par page ; deux pages ne visent pas la même requête. Chaque
page renvoie vers les pages qui répondent à la suite logique de sa requête.

État des données au 2026-09-28 (Search Console, 2026-06-21 au 2026-09-18) :
la collecte exporte les requêtes et les pages séparément, jamais croisées
(`search-analytics/src/search_analytics/config.py`). On ne peut donc pas
encore mesurer quelle page capte quelle requête, ni une cannibalisation.

Mesuré au niveau du site :

| Requête | Clics | Impressions | Page probable |
|---|---|---|---|
| azerty global | 75 | 157 | / |
| télécharger clavier azerty | 74 | 249 | /download |
| clavier azerty français | 12 | 1 280 | /comparatif ? |
| guillemets français clavier | 5 | 1 007 | page caractère « guillemets » ? |
| e dans l'o clavier | 4 | 1 754 | page caractère « e dans l'o » |

Sans impression sur la période : /accessibilite, /clavier-americain, /pilote,
/confidentialite, /testeur, /azerty-ameliore, /contact.

Le tableau des cibles par page sera rempli quand les requêtes seront mesurées
page par page.
