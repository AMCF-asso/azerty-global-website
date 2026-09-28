# Recette : AZERTY Global, site v2

Checklist à passer avant de déclarer une page v2 terminée, et à repasser sur
tout le site après un changement de règle. Les règles sont dans
[`DESIGN.md`](DESIGN.md), [`REDACTION.md`](REDACTION.md) et [`SEO.md`](SEO.md) ;
ce fichier dit seulement comment les vérifier.

Le script relève, il ne corrige pas. Chaque écart est tranché par Antoine,
page par page (décision du 2026-09-28). Une correction de masse, même
mécanique, attend son accord.

## 1. Lancer le script

```bash
npm run build
npm run recette:v2
```

Options : `--pages a-propos,faq` pour une partie du site, `--port 4190`,
`--sortie dossier`. Le rapport est écrit dans `test-results/recette-v2/`
(`rapport.md` à lire, `rapport.json` pour trier), qui n'est pas suivi par git.

- Une page est v2 si elle charge `/css/v2/base.css` ; les pages v1 ne sont pas
  auditées.
- Le script lance son propre serveur local et bloque toute requête externe
  (GTM, Umami), puis sert chaque page avec la CSP de `_headers`.
- Il prévient si `dist/` est plus ancien que `src/`.
- Code de sortie 1 tant qu'il reste un écart. Il ne tourne pas dans
  `npm run build` : il faut un navigateur, et plusieurs minutes pour tout le
  site.

**Niveaux.** Un *écart* enfreint une règle opposable. Un point *à vérifier* vient
d'une heuristique : un chiffre absent de `REDACTION.md` § 6, un nombre sans
séparateur, une marge sous un `h2`, un point toléré par une exception.

## 2. Ce que le script vérifie

| Domaine | Contrôle | Règle |
|---|---|---|
| Technique | `verify:11ty` (une fois pour tout le site) | build |
| | attributs `style=`, `<style>` et scripts en ligne, gestionnaires `on…=` | CSP, `DESIGN.md` |
| | violations de la CSP relevées dans le navigateur | `_headers` |
| | feuilles CSS ni suivies par git ni produites par un gabarit | lot 7 |
| | témoignages rendus par `js/temoignages.js`, composants de carrousel | `DESIGN.md`, Témoignages |
| | liens `target="_blank"` dans `main` (à vérifier) | `DESIGN.md`, Navigation |
| | débordement horizontal à 320, 390, 768, 1024 et 1440 px | `DESIGN.md`, Layout |
| Accessibilité | axe, WCAG 2.2 AA, à 1440 px ; les glyphes du clavier (`role="img"`) sont comptés à part | WCAG 2.2 AA |
| Visuel | marge sous chaque `h2` de section différente de 24 px (à vérifier) | `DESIGN.md`, Layout |
| Rédaction | tournures interdites et lexique, dans le texte, le title, les meta, le JSON-LD et les attributs | `REDACTION.md` § 3-4 |
| | chiffres absents du tableau des chiffres autorisés (à vérifier) | `REDACTION.md` § 6 |
| Typographie | apostrophes selon l'endroit, espaces avant ; ! ? : et %, guillemets, dates, nombres, « ex: », coches dans les tableaux | `REDACTION.md` § 5 |
| Métadonnées | format et longueur du title, longueur des descriptions | `SEO.md` § 1-2 |
| | JSON-LD : lisible, socle, type propre, pas de `FAQPage` | `SEO.md` § 3 |

Le texte de `<kbd>`, `<code>` et `<pre>` et le clavier affiché sont exclus des
contrôles de typographie. Les pages en anglais ne passent que les contrôles
techniques et les métadonnées.

**Tenir le script à jour.** Les listes `TOURNURES` et `LEXIQUE` de
`scripts/recette-v2.mjs` recopient `REDACTION.md` § 3 et § 4, et `JSONLD_PROPRE`
recopie `SEO.md` § 3. Une règle ajoutée dans un de ces fichiers s'ajoute au
script dans le même commit.

## 3. Ce qui reste à l'œil

À faire pour chaque page, parce qu'aucun motif ne le détecte sans faux
positifs :

- [ ] Les phrases d'identité de `REDACTION.md` § 1 sont présentes telles
  quelles, près du haut de la page qui en traite.
- [ ] Chaque chiffre garde sa base et son lien de méthode (`REDACTION.md` § 6).
- [ ] Combinaisons de touches et paires « touche → résultat » en `.insecable`,
  tableaux compris ; glyphes cités en `<kbd>`, noms de touches en texte.
- [ ] Noms des touches mortes (Crochet en chef, Symboles scientifiques…).
- [ ] Témoignages : ceux du tableau de `REDACTION.md` § 7, texte de
  `data/temoignages.json` inchangé.
- [ ] Liens `target="_blank"` relevés : une saisie serait-elle perdue, et le
  lien l'annonce-t-il en toutes lettres ?
- [ ] Rendu clair et sombre, à 320 px et à 1440 × 900 : l'en-tête tient sur une
  ligne, le pli montre l'action principale.
- [ ] Clavier : ordre de tabulation et focus visibles sur les composants
  interactifs (accordéons, sélecteur d'OS, clavier interactif).
- [ ] Description : ton décidé avec Antoine (`SEO.md` § 2).
- [ ] `docs/llms.txt` et `docs/llms-characters.txt` mis à jour si une phrase
  d'identité, un chiffre ou la liste des cinq améliorations a changé
  (`SEO.md` § 4).

## 4. Après le rapport

1. Lire le tableau de synthèse, puis les écarts, page par page.
2. Présenter à Antoine les écarts qui se répètent sur plusieurs pages (souvent
   une seule cause dans `src/_includes`) avant les écarts propres à une page.
3. Corriger seulement ce qu'il a tranché, puis relancer le script sur la page.
4. Une règle qui produit surtout des faux positifs se corrige dans le script ;
   une règle que le site contredit partout se tranche avec Antoine et se
   reporte dans le fichier de règles, puis dans le script.
