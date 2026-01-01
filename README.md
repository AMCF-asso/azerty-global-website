# AZERTY Global 2026 - Le Clavier Français Moderne

**AZERTY Global** est une modernisation pragmatique du clavier AZERTY traditionnel.  
Son objectif : corriger les défauts historiques (point, majuscules accentuées, @) sans bouleverser vos habitudes musculaires, tout en offrant une puissance cachée pour les développeurs, scientifiques et linguistes.

---

## 🚀 Pourquoi passer à l'AZERTY Global ?

1.  **Le Point (.) en accès direct** : Fini le `Maj + ;`. Le point reprend sa place légitime.
2.  **Majuscules Accentuées Faciles** : Le verrouillage majuscule (`Verr. Maj`) est "intelligent".
    *   `É`, `È`, `Ç`, `À` s'écrivent simplement en activant `Verr. Maj` et en appuyant sur `é`, `è`, `ç`, `à`.
3.  **@ et # accessibles** : Placés sur la touche `²` (en haut à gauche), accessibles d'une simple pression (ou avec Maj).
4.  **Symboles Développeur** : `{ } [ ] | \` sont tous alignés sur la rangée de repos via `AltGr`.
5.  **Puissance Cachée** : Accès à plus de 1000 caractères (Maths, Phonétique, Grec, Cyrillique) via des touches mortes intuitives.

---

## 📥 Installation

### Windows
1.  Téléchargez l'archive et extrayez-la.
2.  Lancez `setup.exe` (ou installez via le fichier `.klc` si vous êtes utilisateur avancé).
3.  Redémarrez votre session ou votre PC.
4.  Sélectionnez "Français (AZERTY Global)" dans la barre des langues (`Win + Espace`).

### Linux (X11 / Wayland)
1.  Copiez le fichier `Linux/azerty-global` dans `/usr/share/X11/xkb/symbols/azerty-global`.
    ```bash
    sudo cp Linux/azerty-global /usr/share/X11/xkb/symbols/
    ```
2.  Copiez le fichier `Linux/XCompose.azerty-global` vers votre dossier personnel sous le nom `.XCompose` (ou ajoutez son contenu à votre `.XCompose` existant).
    ```bash
    cp Linux/XCompose.azerty-global ~/.XCompose
    ```
3.  Configurez votre environnement de bureau pour utiliser la variante `azerty-global`.

### macOS
1.  Copiez le fichier `MacOS/AZERTY Global.keylayout` dans `/Library/Keyboard Layouts/` (pour tous les utilisateurs) ou `~/Library/Keyboard Layouts/` (pour vous seul).
2.  Ouvrez "Préférences Système" -> "Clavier" -> "Méthodes de saisie".
3.  Ajoutez (+) le clavier "AZERTY Global" (section "Autres" ou "Français").

---

## ⌨️ Guide Rapide

### Changements de base
| Touche | Action Simple | Avec Maj | Avec AltGr |
| :--- | :--- | :--- | :--- |
| **; .** | **.** (Point) | **;** (Point-virgule) | … |
| **²** | **@** (Arobase) | **#** (Dièse) | Touche Morte "Divers" |
| **, ?** | **,** (Virgule) | **?** (Point d'interro) | Touche Morte "Grec" |
| **! §** | **!** (Exclamation) | **§** (Paragraphe) | Touche Morte "Ponctuation" |

### Développeurs (AltGr)
*   **{ }** : `AltGr` + `D` / `F` (Ligne de repos gauche)
*   **[ ]** : `AltGr` + `J` / `K` (Ligne de repos droite)
*   **| \** : `AltGr` + `G` / `H` (Centre)
*   **` ~** : `AltGr` + `R` / `N`

### Touches Mortes (Couches Avancées)
Les touches mortes permettent d'accéder à des alphabets entiers.
Appuyez sur la touche morte, relâchez, puis tapez votre lettre.

| Touche Morte | Déclencheur (Base) | Exemple |
| :--- | :--- | :--- |
| **Maths / Sciences** | `AltGr` + `=` | `Maths` + `8` → **∞** (Infini) |
| **Phonétique (IPA)** | `Shift` + `AltGr` + `à` | `IPA` + `R` → **ʁ** |
| **Monnaies** | `AltGr` + `$` (touche £) | `Monnaie` + `b` → **₿** (Bitcoin) |
| **Ponctuation** | `Shift` + `!` | `Ponct` + `t` → **†** (Obèle) |
| **Grec** | `AltGr` + `*` (touche µ) | `Grec` + `p` → **π** (Pi) |
| **Cyrillique** | `Shift` + `AltGr` + `*` | `Cyril` + `d` → **д** |

---

## 📜 Licence
Ce projet est sous licence **Creative Commons BY-NC-SA 4.0**.
Vous êtes libre de partager et adapter le travail, à condition de créditer l'auteur (Antoine OLIVIER), de ne pas en faire un usage commercial, et de partager sous les mêmes conditions.

*Conçu avec ❤️ pour la francophonie.*
