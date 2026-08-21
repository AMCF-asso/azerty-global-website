# Contribuer à AZERTY Global

> 🇬🇧 **Quick start.** `npm ci` then `npm run dev` (builds and serves on port 3000). **The site
> sources live in `src/`, not in the `.html` files at the repository root** — those are legacy
> copies from before the 11ty migration and are never deployed. Never modify
> `data/AZERTY Global.json` or `data/AZERTY Global Beta.json`: they are the single source of
> truth for the layout itself. Contributions are accepted under the EUPL 1.2. French version
> below.

Merci de vouloir aider. AZERTY Global est porté par l'**Association pour la Modernisation du
Clavier Français** (AMCF), association loi 1901 entièrement bénévole, et **cherche activement un
co-mainteneur technique** — voir [azerty.global/soutien](https://azerty.global/soutien).

## Ce que contient ce dépôt

| Dans le périmètre | Ailleurs |
|---|---|
| le site `azerty.global` | l'application Windows du Microsoft Store, dans un dépôt distinct |
| le testeur clavier en ligne | les installeurs macOS et Linux |
| le Worker de téléchargement Cloudflare | la disposition elle-même, voir plus bas |

## Les deux pièges à connaître avant d'éditer

### 1. Les sources sont dans `src/`, pas à la racine

La racine du dépôt contient encore une trentaine de fichiers `.html`. **Ce sont des copies
héritées d'avant la migration 11ty. Elles ne sont jamais publiées** et éditer l'une d'elles ne
change rien au site en ligne.

- les pages : `src/pages/*.njk` (français) et `src/pages/en/*.njk` (anglais) ;
- l'ossature commune : `src/_includes/base.njk` et `src/_includes/base-en.njk` — une seule
  édition s'y propage sur les 53 pages construites ;
- le livrable : `dist/`, **généré**. Ne l'éditez jamais à la main, il est reconstruit à chaque
  build ;
- exceptions qui s'éditent bien à la racine : `sitemap.xml`, `robots.txt`, `_headers` et
  `_redirects`, servis tels quels.

### 2. Deux fichiers de données ne se modifient jamais

`data/AZERTY Global.json` et `data/AZERTY Global Beta.json` sont la **source de vérité unique de
la disposition**. Le site, le testeur et l'application Windows en dérivent tous. Une modification
même minime les désynchronise sans que rien ne le signale.

Les lire est libre — c'est même ainsi que l'on prouve qu'une copie n'a pas dérivé. Si vous
pensez qu'un caractère est mal placé, **ouvrez une issue plutôt qu'une pull request** : un
changement de disposition est une décision de conception, pas un correctif.

## Installer et lancer

Node 18 ou plus récent.

```bash
npm ci
npm run dev
```

`npm run dev` construit le site puis le sert sur `http://localhost:3000`. Pour construire sans
servir : `npm run build`.

## Tester

```bash
npm run test:e2e:dist
npm run test:tester
```

**Utilisez bien `test:e2e:dist` et non `test:e2e`** : ce dernier sert la racine du dépôt, donc les
fichiers hérités décrits plus haut. Un vert sur `test:e2e` ne prouve rien sur ce qui est déployé.

Deux vérifications utiles avant d'ouvrir une pull request :

```bash
python scripts/check-links.py --root dist
npm run audit:visual:strict
```

La première ne doit rapporter **aucun lien interne mort**. Les liens externes en `403` sont des
protections anti-robot connues (HelloAsso, INPI, ISO, SSRN) et non des liens cassés.

## Conventions

- **Le contenu du site est en français**, avec une version anglaise pour les pages listées dans
  `src/pages/en/`. Toute page française destinée au public international a son pendant anglais.
- **Encodage UTF-8, fins de ligne LF.** Mesurez un fichier avant d'y écrire : la ponctuation
  française — espaces insécables, apostrophes courbes, guillemets — n'est pas appliquée
  uniformément, et l'aligner d'office rend un diff illisible.
- **Jamais de recherche-remplacement globale** sur les fichiers de contenu.
- Un commit par sujet, message en français ou en anglais, à l'impératif.

## Ouvrir une issue

Décrivez ce que vous attendiez, ce qui se produit, et sur quel navigateur ou quel système. Pour
un problème de sécurité, **n'ouvrez pas d'issue** : voir [SECURITY.md](SECURITY.md).

## Licence des contributions

En proposant une contribution, vous acceptez qu'elle soit distribuée sous
**[EUPL 1.2](LICENSE)**, la licence du projet. Aucune cession de droits n'est demandée.

---

*Dernière mise à jour : 2026-08-21*
