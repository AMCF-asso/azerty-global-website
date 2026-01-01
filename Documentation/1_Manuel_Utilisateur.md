# Manuel d'Utilisation - AZERTY Global 2026

## Introduction : La Philosophie AZERTY Global
**AZERTY Global** n'est pas une révolution qui vous oblige à réapprendre à taper, mais une **évolution intelligente** de votre clavier habituel.

Il part d'un constat simple : nous n'écrivons plus comme en 1980. Nous tapons des URL, du code, des adresses e-mail, et nous utilisons des symboles internationaux. L'AZERTY standard, conçu pour les machines à écrire, est devenu obsolète.

L'AZERTY Global corrige ces défauts historiques tout en conservant vos repères musculaires.

### Les 4 Piliers
1.  **Le Point (.) Direct** : Inversion des touches `;` et `.` pour un accès immédiat au point.
2.  **Majuscules Intelligentes** : `Verr. Maj` active les chiffres, mais aussi les lettres majuscules accentuées (`É`, `È`, `Ç`, `À`).
3.  **Développeur Friendly** : Accès direct ou simplifié aux symboles tech (`@`, `#`, `{`, `}`, `[`, `]`, `|`, `\`) sans gymnastique des doigts.
4.  **Puissance Cachée** : Des milliers de caractères (Maths, Grec, Phonétique) accessibles via des touches mortes intuitives, sans encombrer la vue.

---

## Installation

### Windows 10 / 11
1.  Récupérez le dossier d'installation (via Setup.exe ou installeur manuel).
2.  Exécutez l'installeur et suivez les instructions.
3.  **Redémarrez votre PC**.
4.  Appuyez sur `Windows + Espace` pour sélectionner "Français (AZERTY Global)".
5.  *(Optionnel)* Supprimez l'ancien clavier "Français (AZERTY)" dans les paramètres pour éviter les confusions.

### Linux (Ubuntu, Fedora, Arch...)
1.  Copiez le fichier de définition des symboles :
    `sudo cp Linux/azerty-global /usr/share/X11/xkb/symbols/`
2.  Activez les touches mortes étendues (Compose) :
    `cp Linux/XCompose.azerty-global ~/.XCompose`
3.  Dans votre gestionnaire de paramètres (GNOME, KDE...), ajoutez la disposition "French (AZERTY Global)" si elle apparaît, ou modifiez votre configuration X11 pour utiliser la variante `azerty-global`.

### macOS
1.  Copiez `AZERTY Global.keylayout` dans `/Bibliothèque/Keyboard Layouts/`.
2.  Allez dans **Préférences Système > Clavier > Méthodes de saisie**.
3.  Cliquez sur `+`, cherchez "AZERTY Global" (souvent dans la catégorie "Autres") et ajoutez-le.

---

## Guide de Démarrage Rapide

### Ce qui change tout de suite
*   **Le Point (.)** : Il est là où vous aviez le `;`.
*   **Le Point-virgule (;)** : `Maj + .`
*   **L'Arobase (@)** : Touche `²` (en haut à gauche).
*   **Le Dièse (#)** : `Maj + ²`.
*   **L'Espace Insécable** : `AltGr + Espace`.

### Les Majuscules Accentuées
Activez `Verr. Maj` (Caps Lock), puis tapez simplement sur la lettre accentuée :
*   `Verr. Maj` + `é` = **É**
*   `Verr. Maj` + `à` = **À**
*   `Verr. Maj` + `ç` = **Ç**

### Symboles de Programmation (AltGr)
Les paires sont alignées logiquement sur la rangée de repos :
*   **{** et **}** : Main gauche (`AltGr` + `D` / `F`)
*   **[** et **]** : Main droite (`AltGr` + `J` / `K`)
*   **|** et **\** : Au centre (`AltGr` + `G` / `H`)

---

## Touches Mortes et Caractères Spéciaux
Consultez le fichier `3_Touches_Mortes.md` pour la liste exhaustive.

Voici les raccourcis les plus utiles :
*   **Monnaies** (`AltGr` + `$`) : Pour taper **€**, **$**, **£**, **¥**, **₿**...
*   **Grec** (`AltGr` + `µ`) : Pour les formules mathématiques (**α**, **β**, **π**, **∆**...).
*   **Maths** (`AltGr` + `=`) : Pour les ensembles et la logique (**∀**, **∃**, **∈**, **∞**, **≠**).
*   **Indices/Exposants** (`AltGr` + `^`) : Pour écrire H₂O ou x².

---

## FAQ

**Q: J'ai l'habitude de faire Maj+; pour le point, je fais tout le temps l'erreur.**
R: C'est normal ! Votre cerveau a été conditionné pendant des années. Il faut environ 3 jours à une semaine pour oublier l'ancien réflexe. Après ça, vous ne pourrez plus revenir en arrière tellement c'est plus confortable.

**Q: Comment faire le È majuscule sous Linux ?**
R: Le comportement du "Smart CapsLock" dépend de l'environnement de bureau. Sous Linux, assurez-vous que l'option "Caps Lock affects all keys" est active si possible, sinon utilisez `Shift` + `AltGr` + `è`.

**Q: Puis-je utiliser ce clavier pour coder ?**
R: Absolument. Il a été conçu par un développeur pour des développeurs. L'accès aux accolades, crochets et backticks est optimisé pour être plus rapide que sur un AZERTY standard.

---
*© 2026 Antoine OLIVIER - Licence CC BY-NC-SA 4.0*
