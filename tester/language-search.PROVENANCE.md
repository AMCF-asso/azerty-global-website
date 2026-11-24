# Provenance de `language-search.json`

Copie octet pour octet du fichier de l'application AZERTY Global 1.3.0. Rien n'est regénéré ici.

| | |
|---|---|
| Source | `src/language-search.json` du dépôt de l'application (`AMCF-asso/azerty-global-app`, copie de travail `components/lot130-integration/`) |
| Générateur | `scripts/build-language-search.py --site <checkout du site> --rev d65e51d` (même dépôt) |
| Dernier commit qui touche le fichier et son générateur | `397082a` « Recherche par langue : table language-search.json et son générateur » (2026-10-07) |
| Tête de l'application à la copie | `6412447` (2026-10-24) |
| Référentiel lu par le générateur | `AZERTYGlobal/website`, révision `d65e51d`, `data/afrique/*.json` (champ `meta.referentiel`) |
| Date de la copie | 2026-11-12 |
| Taille | 77 127 octets |
| SHA-256 | `31a10a3de0f4d17cc206cfaea0dc6714857a3afb46705d5602e36c866cab73ca` (identique à la source) |
| Contenu | 129 groupes : 119 langues d'Afrique (`type: "langue"`) et 10 signes (`type: "signe"`, accents combinants et leurs noms de ton) |

## Limite connue

La recherche par langue ne couvre que les **langues d'Afrique** : le référentiel du générateur est celui de la page Afrique du site. Une langue d'un autre continent (« polonais », « vietnamien ») ne donne rien par son nom.

## Qui lit ce fichier

`js/v2/testeur-recherche.js` (vue « Chercher un caractère » de `/testeur`), à la première ouverture de la vue seulement. Le fichier suit la même règle que l'application (`LanguageSearchTable.cs`) : un caractère trouvé par le nom de sa langue pèse 45, un nom de signe 80, une langue mêlée à une lettre 40 ; seuls les caractères déjà présents dans `tester/character-index.json` sont trouvables.

## Pour le mettre à jour

Recopier le fichier de l'application, puis y noter ici le commit, la tête de l'application, la date et le SHA-256. Ne pas le modifier à la main.
