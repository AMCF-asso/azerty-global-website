---
name: AZERTY Global
description: Le clavier français modernisé — site public, refonte v2
colors:
  papier: "#FAF8F1"
  surface: "#FFFFFF"
  encre: "#1B1813"
  texte-2: "#5B554A"
  bordure: "#D9D2C3"
  action: "#1A3EF2"
  focus: "#1A3EF2"
  succes: "#186339"
  avertissement: "#8A5200"
  erreur: "#B02A1E"
  succes-fond: "#E9F2EA"
  avertissement-fond: "#F7EDDC"
  erreur-fond: "#F9E9E6"
typography:
  heros:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "52px"
    fontWeight: 600
    lineHeight: 1.08
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "42px"
    fontWeight: 600
    lineHeight: 1.12
  headline:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "33px"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "27px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "Source Code Pro, Consolas, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  bloc: "0"
  controle: "3px"
spacing:
  e-1: "4px"
  e-2: "8px"
  e-3: "12px"
  e-4: "16px"
  e-5: "24px"
  e-6: "32px"
  e-7: "48px"
  e-8: "64px"
  e-9: "96px"
components:
  bouton-primaire:
    backgroundColor: "{colors.action}"
    textColor: "#FFFFFF"
    rounded: "{rounded.controle}"
    padding: "8px 24px"
    height: "44px"
  bouton-secondaire:
    backgroundColor: "transparent"
    textColor: "{colors.encre}"
    rounded: "{rounded.controle}"
    padding: "8px 24px"
    height: "44px"
  bouton-accent:
    backgroundColor: "transparent"
    textColor: "{colors.action}"
    rounded: "{rounded.controle}"
    padding: "8px 24px"
    height: "44px"
  bouton-desactive:
    backgroundColor: "{colors.bordure}"
    textColor: "{colors.texte-2}"
    rounded: "{rounded.controle}"
    padding: "8px 24px"
    height: "44px"
  carte:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.encre}"
    rounded: "{rounded.bloc}"
    padding: "24px"
---

# Design System: AZERTY Global

<!--
  Capturé par `impeccable document` le 2026-09-20, en mode scan.

  Sources, par ordre d'autorité :
  1. `operations/fondations-2026-08-16.md` — pré-validé par Antoine en QCM le
     2026-08-16 (paire typographique, bleu action), § 10 opposable.
  2. `css/v2/jetons.css` et `css/v2/base.css` — l'implémentation de ces fondations.
  3. La page `/download` v2 — validée par Antoine le 2026-09-19, seule entrée du
     corpus de référence (`IA/skills/design-visual/reference/validated-corpus.md`).

  ⛔ Les autres pages v2 ont été rejetées par Antoine le 2026-09-19 (« la majorité
  des pages V2 […] c'est de la bonne grosse merde », hiérarchie et lisibilité).
  Rien de leur composition n'entre ici : ce fichier documente ce qui passe, pas
  ce qui existe.

  Statut : OPPOSABLE (décision d'Antoine, 2026-09-20), au même titre que le § 10
  des fondations. Une composition absente de ce document n'est pas autorisée par
  défaut : elle se demande, elle ne s'invente pas.
-->

## Overview

**Creative North Star: "L'Imprimé français"**

La page d'un livre bien composé, pas l'écran d'une application. Le papier est
ivoire et non blanc (`#FAF8F1`), la serif éditoriale porte les grands messages,
l'angle est droit parce que l'imprimé n'arrondit pas ses blocs, et une seule
encre colorée existe sur tout le site. Le système tient sa qualité de la
retenue : il n'a pas de deuxième accent à dépenser, pas d'ombre à empiler, pas
de rayon à choisir. Quand une décision visuelle hésite, la question qui tranche
est « est-ce qu'un typographe imprimerait ça ? ».

Cette retenue n'est pas de l'austérité. Le contraste vient de la typographie —
Fraunces contre Source Sans 3, 52 px contre 17 px — et non de la couleur ou de
la profondeur. Un caractère peut occuper 160 px de hauteur ; c'est le seul
endroit où le système hausse la voix, et il le fait avec une lettre, pas avec un
effet.

Anti-référence confirmée, inscrite dans les fondations § 2 : **Inter**, écartée
nommément comme « moyenne documentée des sites générés », ainsi que Space
Grotesk et Playfair Display. Le système existe pour ne pas ressembler à ce que
produit un générateur.

**Key Characteristics:**

- Papier ivoire, jamais blanc pur, sur toute la surface de la page.
- Une seule couleur d'action (`#1A3EF2`), sur ≤ 10 % de l'écran.
- Angle droit sur tous les blocs ; 3 px uniquement sur les contrôles.
- Plat par défaut : une seule ombre existe, réservée aux surfaces flottantes.
- Alignement à gauche par défaut, sur toutes les pages, à tous les niveaux.
- Aucun emoji nulle part, aucune icône porteuse seule.

## Colors

Un papier chaud, une encre brune presque noire, et un bleu unique qui ne sert
qu'à l'action. Le thème sombre est le négatif chaud du même papier, pas un gris
neutre.

### Primary

- **Bleu d'action** (`--action`) : la seule couleur d'accent du système. Fond du
  bouton primaire, couleur de tous les liens, anneau de focus, et le filet de
  2 px qui sert de puce dans les listes de faits. Il s'éclaircit en `#8FA6FF` en
  thème sombre pour tenir le contraste sur l'encre.

### Neutral

- **Papier** (`--papier`) : le fond de toute page. Ivoire chaud, jamais `#FFF`.
- **Surface** (`--surface`) : le fond des cartes et blocs posés sur le papier.
  En clair il est plus clair que le papier ; la carte ne se distingue pourtant
  pas par ce contraste mais par sa bordure.
- **Encre** (`--encre`) : tout le texte courant et tous les titres.
- **Texte secondaire** (`--texte-2`) : contextes, notes, libellés en retrait.
  Jamais pour du texte qu'il faut lire en premier.
- **Bordure** (`--bordure`) : le filet de 1 px qui délimite toute surface.

### Tertiary

Trois couleurs d'état — succès, avertissement, erreur — chacune avec son fond
clair. Elles n'existent que dans le composant `message` et ne colorent jamais un
élément ordinaire.

### Named Rules

**La règle de l'encre unique.** Le système n'a qu'une couleur d'accent. Toute
demande d'une « seconde couleur de marque » est refusée par les fondations § 10.
Un élément qui a besoin de se distinguer le fait par sa typographie, sa position
ou sa bordure.

**La règle de la bordure porteuse.** Une surface se délimite par sa bordure de
1 px, jamais par un écart de luminosité avec le fond. C'est ce qui permet au
papier et à la surface d'être presque de la même valeur sans que les cartes
disparaissent.

## Typography

**Display Font:** Fraunces (repli Georgia, serif)
**Body Font:** Source Sans 3 (repli Segoe UI, system-ui)
**Label/Mono Font:** Source Code Pro (repli Consolas, monospace)

**Character:** Une serif éditoriale expressive à axes optiques contre une sans
humaniste sobre. La serif ne descend jamais en dessous du `h1` : elle est
réservée aux endroits où le site parle, la sans porte tout ce qu'il explique. Le
mono ne sert qu'à ce qui se copie — versions, commandes, empreintes.

Quatre fichiers WOFF2 au maximum, auto-hébergés : Fraunces 600, Source Sans 3
400 et 600, Source Code Pro 400. Toute police hors de ces quatre est interdite
(fondations § 10).

### Hierarchy

- **Héros** (Fraunces 600, 41 → 52 px, 1.08) : la phrase d'ouverture d'une page,
  une seule par page.
- **Display / h1** (Fraunces 600, 34 → 42 px, 1.12, max 22ch) : le titre de la
  page. C'est le seul niveau de titre en serif.
- **Headline / h2** (Source Sans 3 600, 28 → 33 px, 1.2) : les sections.
- **Title / h3** (Source Sans 3 600, 23 → 27 px, 1.25) : les sous-sections et
  les titres de cartes.
- **h4** (Source Sans 3 600, 19 → 21 px, 1.3) : le dernier niveau ; en dessous,
  le texte n'est plus un titre.
- **Body** (Source Sans 3 400, 16 → 17 px, 1.55, max 68ch en prose) : le texte
  courant.
- **Label** (Source Sans 3 400, 14 px, 1.5) : notes, contextes, mentions.
- **Caractère signature** (Fraunces 600, 96 → 160 px, 1) : un glyphe isolé,
  jamais du texte. C'est un objet graphique qui se trouve être une lettre.

### Named Rules

**La règle des deux serifs.** Fraunces n'apparaît qu'à deux endroits : le `h1`
et le héros. Un `h2` en serif, un chiffre-clé en serif, une citation en serif —
autant d'entorses qui diluent le seul signal éditorial du système.

**La règle du 68ch.** Aucune colonne de prose ne dépasse 68 caractères. Sur un
écran de 1440 px, cela laisse du papier à droite : c'est voulu, la mesure de
lecture prime sur le remplissage.

**⛔ Jamais de `font-size` en attribut `style`.** La CSP de production supprime
les attributs `style` : un `style="font-size:…"` disparaît silencieusement et la
page part de travers en production sans aucune erreur. Mesuré sur le `h3` de
`/download` le 2026-09-02 ; la classe `.texte-corps` existe pour ce cas.

## Layout

Conteneur de contenu à **1200 px maximum**, centré (`margin-inline: auto`),
avec des gouttières de 20 px sous 768 px, 32 px de 768 à 1023 px, et 48 px
au-delà. Au-dessus de 1440 px, le conteneur ne bouge plus : le papier s'étend,
rien ne se réagence.

Grille de 12 colonnes à partir de 768 px ; en dessous, flux vertical à une
colonne, aucune grille imposée. Le héros de page est asymétrique en 7/5
(contenu / signature) à partir de 1024 px, empilé sous 768 px.

Points de rupture : 480, 768, 1024, 1280 px. Matrice de contrôle pour la
recette : 320, 390, 768, 1024, 1440 px.

Échelle d'espacement de 4 à 96 px (`--e-1` à `--e-9`), sans aucune valeur
intermédiaire. Rythme vertical entre sections : 64 px en mobile, 96 px en
desktop. Blocs internes : 24 ou 32 px. Toute cible tactile fait 44 × 44 px au
minimum.

### Named Rules

**La règle du fer à gauche.** Tout s'aligne à gauche : titres, chapeaux, corps
de texte, listes, contenu de cartes, à tous les niveaux et sur toutes les pages.
`text-align: center` n'existe pas dans le système. La page `/download`, seule
page v2 validée, n'en contient pas une seule occurrence — c'est la mesure, pas
une préférence. Un texte centré au milieu d'une page ferrée à gauche ne se lit
pas comme une emphase, il se lit comme une page composée par quelqu'un d'autre.

Exceptions, limitativement : le contenu d'un bouton (`justify-content: center`
dans `.bouton`), une légende sous une image qu'elle légende, et le glyphe
`caractere-signature` qui est un objet graphique et non du texte. Aucune autre.

**La règle du centrage par le conteneur.** Un bloc se centre par
`margin-inline: auto` sur un conteneur de largeur bornée — jamais en centrant
son texte. Les deux produisent des résultats opposés : le premier pose un bloc
ferré à gauche au milieu de la page, le second déchire chaque ligne.

**La règle des 68ch, appliquée à la largeur.** Une colonne bornée à 68ch et
ferrée à gauche n'a pas besoin d'être centrée pour paraître tenue. Le réflexe de
centrer un paragraphe court est un symptôme de largeur non bornée : borner la
largeur, pas centrer le texte.

## Elevation & Depth

Le système est **plat**. Une seule ombre existe dans tout le site —
`0 2px 8px rgba(27, 24, 19, 0.12)` en clair, `rgba(0, 0, 0, 0.45)` en sombre —
et elle est réservée aux surfaces qui flottent réellement par-dessus le contenu :
menu mobile ouvert, aide dépliée. La profondeur ordinaire est portée par la
bordure de 1 px et par rien d'autre.

### Shadow Vocabulary

- **Ombre flottante** (`--ombre-flottante`) : le seul niveau. Une surface qui ne
  recouvre pas d'autre contenu ne la porte pas.

### Named Rules

**La règle du plat par défaut.** Une carte, une section, un champ, un bouton :
zéro ombre, au repos comme au survol. Une ombre ajoutée « pour détacher » est un
aveu que la bordure ne fait pas son travail.

## Shapes

Deux rayons, pas trois. **0 px** sur tous les blocs — cartes, sections,
messages, images — parce que le système assume l'angle droit de l'imprimé.
**3 px** sur les contrôles interactifs seulement : boutons, champs, touches
`kbd`. Aucune pilule, aucun `rounded-large`, aucun cercle décoratif.

Bordures à deux épaisseurs : 1 px en `--bordure` pour la structure, 2 px en
`--encre` pour les filets porteurs et le soulignement d'onglet actif.

### Named Rules

**La règle des deux rayons.** Si un élément n'est ni un bloc ni un contrôle, il
n'a pas de rayon à lui : il rejoint l'une des deux familles. Un troisième rayon
introduit dans le système le fait dériver immédiatement.

## Components

### Buttons

- **Shape:** angle très légèrement adouci (3 px), hauteur minimale 44 px,
  remplissage `8px 24px`, `inline-flex` centré avec une gouttière de 8 px entre
  l'icône et le libellé.
- **Primary:** fond bleu d'action, texte blanc. En thème sombre l'asymétrie est
  assumée : fond `#8FA6FF`, texte encre.
- **Secondary:** transparent, bordure 1 px encre, texte encre. L'action
  ordinaire.
- **Accent:** transparent, bordure et texte en bleu d'action. Une action réelle
  mais volontairement dépriorisée — l'EXE de `/download` en est le cas fondateur
  (6,6:1 en ivoire, 7,7:1 en sombre).
- **Hover / Focus:** le survol souligne le libellé, il ne change pas le fond.
  L'appui descend d'1 px. Focus : anneau 2 px `--focus` avec 2 px d'écart.
- **Disabled:** fond `--bordure`, texte `--texte-2`, opaque et uniforme quelle
  que soit la variante. ⛔ Jamais `opacity`, qui composite le texte avec le fond
  et faisait tomber le libellé « Envoi en cours… » à 1,86:1 — sous le 4,5:1 de
  AA, sur l'état exact où ce libellé doit se lire.

### Cards / Containers

- **Corner Style:** angle droit (0).
- **Background:** `--surface`, sur le papier.
- **Shadow Strategy:** aucune. Voir Elevation.
- **Border:** 1 px `--bordure`. C'est elle qui porte la carte.
- **Internal Padding:** 24 px (`--e-5`), uniformément.

### Named Rules

**La règle du pied aligné.** Des cartes côte à côte finissent à la même hauteur
et leur bouton est sur la même ligne, quelle que soit la longueur de leur texte.
Concrètement, sur toute grille de cartes :

```css
.grille-de-cartes { display: grid; align-items: stretch; }
.carte            { display: flex; flex-direction: column; }
.carte .bouton    { margin-top: auto; }
```

`align-items: stretch` égalise les hauteurs — c'est déjà ce que fait
`.canaux--deux` sur `/download`, avec le commentaire qui en donne la raison :
« c'est ce qui fait descendre le bas de la carte Store au niveau du bas de la
carte EXE ». Mais égaliser la carte ne suffit pas : sans `margin-top: auto` sur
le CTA, le bouton suit son texte et deux cartes aux textes de longueurs
différentes désalignent leurs boutons à l'intérieur de cartes pourtant égales.
Les trois déclarations vont ensemble ou aucune ne tient.

**La règle du bouton qui ne traverse pas.** Un bouton en pied de carte prend la
largeur de sa carte mais s'arrête à 26rem : sur une carte pleine largeur, un CTA
de 1200 px de long n'est plus un bouton, c'est une barre.

### Messages d'état

Fond coloré clair, bordure 1 px `--bordure`, titre en gras dans la couleur
d'état, corps en encre ordinaire. La couleur ne porte jamais l'information
seule : le titre la nomme en toutes lettres.

### Navigation

Liens en bleu d'action, soulignés par défaut — le soulignement n'est pas un
état de survol, c'est l'état normal d'un lien. Le survol épaissit le trait à
2 px. L'onglet actif est souligné d'un filet 2 px `--encre`.

### Signature : le caractère

Un glyphe unique en Fraunces 600, 96 px en mobile et 160 px en desktop. C'est le
seul endroit où le système occupe de la place sans rien expliquer. Il vit dans
la colonne courte du héros asymétrique 7/5.

## Do's and Don'ts

### Do:

- **Do** ferrer à gauche : titres, chapeaux, corps, listes, contenu de cartes, à
  tous les niveaux et sur toutes les pages.
- **Do** centrer un bloc par `margin-inline: auto` sur une largeur bornée, jamais
  par `text-align`.
- **Do** poser les trois déclarations du pied aligné ensemble dès qu'il y a deux
  cartes côte à côte : `align-items: stretch`, `flex-direction: column`,
  `margin-top: auto` sur le CTA.
- **Do** borner la prose à 68ch et le `h1` à 22ch.
- **Do** prendre toute valeur dans `css/v2/jetons.css` — couleur, espacement,
  rayon, durée, taille de police.
- **Do** accompagner toute icône d'un libellé en toutes lettres.
- **Do** nommer l'état en mots dans un message, en plus de le colorer.

### Don't:

- **Don't** écrire `text-align: center` : hors du contenu d'un bouton, d'une
  légende d'image et du glyphe signature, il n'existe pas dans ce système.
- **Don't** laisser un CTA de carte suivre son texte quand des cartes sont côte
  à côte — les boutons se désalignent dès que les textes diffèrent d'une ligne.
- **Don't** introduire une seconde couleur d'accent, un troisième rayon, une
  deuxième ombre, ou un espacement hors de l'échelle `--e-1` à `--e-9`.
- **Don't** utiliser Fraunces ailleurs que sur le `h1`, le héros et le caractère
  signature.
- **Don't** poser `opacity` pour désactiver un contrôle : le remplaçant opaque
  est `background: var(--bordure); color: var(--texte-2)`.
- **Don't** écrire une valeur de style dans un attribut `style=` : la CSP de
  production la supprime sans erreur.
- **Don't** utiliser d'emoji, nulle part, ni comme icône ni comme puce.
- **Don't** animer autre chose que les quatre transitions autorisées (sélection,
  aide, menu, confirmation de copie) : ni reveal au scroll, ni compteur animé.
- **Don't** utiliser Inter, Space Grotesk ou Playfair Display — écartées
  nommément comme signature des sites générés.
