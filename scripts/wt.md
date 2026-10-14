# wt — worktrees du site pour les agents

Un worktree par tâche, prêt à construire, avec son port, sans jamais pousser ni
pruner à l'aveugle. Node seul (pas de `.ps1`), lancé depuis n'importe quel
checkout du dépôt qui contient ce script. Fichier interne : Eleventy ne
construit que les `.njk`, ce `.md` ne part pas sur le site.

## Commandes

```
node scripts/wt.mjs new <nom>     crée ../website-wt/<nom> sur agent/<nom>, amorce, donne un port
node scripts/wt.mjs boot <nom>    npm ci + npm run build + vérification de dist/
node scripts/wt.mjs list          tous les worktrees, ceux de wt avec port et état d'amorce
node scripts/wt.mjs port <nom>    le port du worktree
node scripts/wt.mjs tidy          rangement à blanc : verdict par worktree, rien n'est retiré
node scripts/wt.mjs tidy --apply  retire les worktrees wt fusionnés dans la base
node scripts/wt.mjs rm <nom>      retire un worktree wt propre
```

Options de `new` : `--base <ref>` (défaut `origin/main`, sans fetch), `--fetch`
(fetch `origin main` d'abord), `--branch <nom>` (défaut `agent/<nom>`),
`--no-boot`. Options de `tidy` : `--base <ref>` (ex. `refonte` pour les
branches `refonte-*`).

## Règles

- **Base** : `origin/main`, pas `main` local, qui peut porter des commits non
  poussés d'une autre session. La branche est créée sans upstream : un
  `git push` nu ne vise jamais `main`.
- **Amorce** : un build qui sort en 0 sans `node_modules` ne construit rien.
  `wt` exige `dist/index.html` plus récent que le build et un nombre de
  fichiers d'au moins la moitié du `dist/` du checkout principal (20 au moins).
- **Port** : premier libre de 4200 à 4299, hors 3000 (`npm run dev`) et
  4173-4182 (e2e). Aperçu : `node scripts/serve-static.js dist <port>`.
  ⚠️ Les scripts e2e gardent leurs ports fixes : deux worktrees qui lancent
  le même e2e en même temps se gênent encore.
- **Plafond** : 8 worktrees gérés par wt (`WT_MAX`). Les worktrees créés à la
  main ne comptent pas et ne sont jamais retirés par wt.
- **Rangement** : candidat = worktree propre, non verrouillé, dont la tête est
  dans la base ; un worktree wt neuf sans commit est gardé. `--apply` ne
  retire que les worktrees wt, par `git worktree remove` sans `--force`, et
  supprime la branche seulement si sa tête est dans la base.
- **Prune** : jamais lancé. Un worktree « prunable » (dossier absent) est
  vérifié (index et reflog atteignables depuis les refs) et seulement signalé.

Métadonnées : `.git/worktrees/<nom>/wt.json` (nom, branche, base, port,
amorce). Elles disparaissent avec le worktree. Racine : `WT_ROOT`.
