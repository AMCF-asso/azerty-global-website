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

### Windows (Microsoft Store — recommandé)
Installez [AZERTY Global depuis le Microsoft Store](https://apps.microsoft.com/detail/9N4BTS43SSSZ). Aucun avertissement SmartScreen, aucun droit admin requis.

### Windows (installeur classique)
1.  Téléchargez l'archive sur [SourceForge](https://sourceforge.net/projects/azertyglobal/).
2.  Lancez `AZERTY_Global_Beta.exe`.
3.  Redémarrez votre session ou votre PC.
4.  Sélectionnez "AZERTY Global (Beta)" dans la barre des langues (`Win + Espace`).

### Linux
Téléchargez l'archive sur [SourceForge](https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Beta_Linux.zip/download).
Instructions incluses dans le fichier `LISEZ-MOI.txt`.

### macOS
Téléchargez l'archive sur [SourceForge](https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Beta_macOS.zip/download).
Copiez le fichier `.keylayout` dans `/Library/Keyboard Layouts/`.

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
Ce projet est sous licence **EUPL 1.2** (European Union Public Licence).
Vous êtes libre d'utiliser, modifier et redistribuer ce travail, y compris à des fins commerciales, à condition de créditer l'auteur (Antoine OLIVIER) et de partager vos modifications sous une licence compatible.

---

## 🛠️ Développement du site

- Les sources du site sont les fichiers HTML à la racine, plus `css/`, `js/`, `data/`, `tester/` et `docs/`.
- Le build de production se lance avec `npm run build` et génère `dist/`.
- `dist/` est un artefact généré : ne pas l'éditer à la main.
- Les formulaires du site utilisent **Web3Forms** côté front.

*Conçu avec ❤️ pour la francophonie.*
