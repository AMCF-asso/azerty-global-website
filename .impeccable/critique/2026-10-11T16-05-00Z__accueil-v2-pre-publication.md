# Critique pré-publication, accueil v2 (2026-10-11, session fefd7371)

Method: dual-agent (A : design review, B : détecteur + navigateur), sous-agents executant sonnet.
Cible : http://localhost:3200/ = `dist/index.html` du 2026-10-11 12:04 (branche `refonte`, tête 07c245b).

## Verdict
- Aucun P0 ni P1 : R12 n'oblige à aucune correction avant publication.
- Heuristiques 22/32 (7 et 10 n/a), contre 21/32 à la critique précédente.
- a11y-check.sh : 0 problème (axe + htmlcs, WCAG2AA).
- Mesures B : aucun débordement horizontal à 1440, 390 et 320 px ; CLS 0 ; console vide ; 0 requête en échec.
- Contrastes : 0 sous le seuil sur 323 textes à 1440 et 246 à 390, en clair et en sombre.
- Détecteur CLI : 48 constats, dont 25 low-contrast faux (jetons du thème sombre mal résolus), 21 cramped-padding faux ou voulus (touches, `details.notice`) et 1 tight-leading mineur (h3 du parcours à 320 px).
- Détecteur injecté : `line-length` sur le paragraphe AMCF (~154 caractères par ligne, cible < 80) et `cream-palette` (choix de charte).
- Spécificité : forte dans le héros et le parcours, générique à partir de « Qui l'utilise déjà » (grilles de cartes, FAQ).

## P2 (à trier en QCM, rien n'est corrigé)
1. **Bulle de la touche é** : « Verr. Maj. + é = É » arrive en 3e ligne sur 5. Épinglée, la bulle fait 369×336 px et couvre les rangées 2 à 4.
   - Correctif : É en 1re ligne, 3 lignes au plus dans le héros, touches mortes dans la fiche, caractères composés au lieu de ◌̋ (`src/_data/clavier.js`, `js/v2/clavier.js`).
2. **Chips absentes du clavier** : sur 6 chips, 3 seulement ont une touche cerclée (É, « » et á ne sont pas marqués).
   - Correctif : une pastille d'exemple dans la ligne d'invite (`index.njk:218`), plus un style discret « ajoutée », ou un libellé « les 13 touches qui changent de place ».
3. **Fin de page** :
   - « Notre vision » (222 px, gris) redit « Pourquoi » ; seule la phrase AFNOR « 31 caractères » est nouvelle.
   - « Et maintenant ? » montre 4 cartes égales, et Télécharger n'y est pas un bouton.
   - Correctif : verser la phrase AFNOR dans `#pourquoi` et retirer `#vision` de la home (⚠️ touche la décision D27) ; un `bouton--primaire` Télécharger et 3 liens texte (`index.njk:528-549`).
4. **Mobile (40,3 % des visites)** : le héros fait 855 px à 390 et ne montre aucun clavier (masquage sous 640 px décidé en Série 14).
   - Correctif : une ligne de preuve `<kbd>Verr. Maj.</kbd> + <kbd>é</kbd> = É` sous les chips (`index.njk:177-184`, `home.css` ~162).

## Mineurs
- Paragraphe AMCF trop long par ligne.
- Bouton de thème « auto » cryptique (`bascule-theme.njk:7`).
- Titres du pied de page en H2.
- Lien « 99 % » à 277×20 px.
- Liens « Contribuer » de 22 px de haut (exception WCAG 2.5.8 des liens en ligne).
- « game-changer » dans une citation (`index.njk:400`).
- « 4 004 » additionne Store et SourceForge alors que seul SourceForge est lié.
- Entrée envoie le focus dans la bulle au lieu de le garder sur la touche.

## Non vérifié
- Captures segmentées, sombre mobile et focus non ouvertes (budget d'images) : leurs constats viennent du DOM.
- Contraste de la bulle et des touches survolées non mesuré.
- Chromium seul (ni Safari ni Firefox).
- Lecteur d'écran non testé.

Preuves : `%TEMP%\critique-accueil-v2\A\` et `\B\` (captures, scripts, `detect-dist.json`, `measure-result.json`).
