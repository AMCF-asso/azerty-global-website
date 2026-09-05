# Téléchargements AZERTY Global sur Cloudflare R2

Le Worker sert les cinq fichiers du manifeste `FILES` dans `src/index.js` :
Windows, macOS, Linux, kit entreprise et MSIX signé. Chaque fichier dispose
aussi d'une URL suffixée par `.sha256`. Le bucket R2 est
`azerty-global-downloads`, avec le domaine personnalisé `download.azerty.global`.

## Intégrité des archives

Avant de publier une archive, comparer son SHA-256 complet à l'artefact approuvé,
puis relever sa taille et son ETag HTTP R2 exact. Reporter les trois valeurs dans
le manifeste. Ne pas déduire l'ETag du SHA-256 : il dépend du mode d'upload.

À chaque lecture R2, le Worker vérifie taille et ETag et refuse tout objet absent
ou différent avec une erreur 503 non mise en cache. Il ne recalcule pas le SHA-256
à chaque requête. Les sommes publiées sont celles du manifeste approuvé. Cela
ne remplace ni la signature du logiciel ni la protection du compte et du dépôt.

## Cache et forte affluence

La clé du cache comporte le nom et le SHA-256 attendu, sans les paramètres de
suivi du visiteur. Un nouveau SHA utilise une nouvelle entrée. Les noms publics
pouvant être réutilisés, le navigateur garde la réponse cinq minutes et le cache
de périphérie au maximum une journée.

À cache vide, le flux R2 est consommé par `cache.put`, puis le client reçoit un
flux lu dans le cache. Aucun `Response.clone()` ni chargement complet du fichier
en mémoire JavaScript. Ce choix retarde le premier octet du premier téléchargement,
le temps de remplir le cache. Si le cache échoue après avoir consommé le flux,
le Worker relit et revalide R2, puis sert directement le nouveau flux. Cette
exception peut coûter une lecture R2 supplémentaire.

Le cache est local à chaque centre de données. Il ne garantit pas une seule
lecture R2 mondiale et n'empêche pas les lectures concurrentes à cache vide.
HEAD consulte le cache ou les seules métadonnées R2. Les requêtes Range ne sont
pas traitées partiellement : le fichier entier est servi.

## Journaux et coûts

Les journaux applicatifs contiennent événement, fichier, taille, pays, centre
de données et résultat du cache. User-Agent, Referer et paramètres libres sont
exclus. Les journaux automatiques d'invocation sont désactivés dans
`wrangler.jsonc`. Ce code ne contrôle pas les autres traitements de la plateforme.

La limite CPU de 50 ms par requête ne plafonne pas la facture totale. Requêtes
Workers, CPU et opérations R2 restent soumis aux tarifs du compte. Les hits du
cache exécutent aussi le Worker. Les pages statiques passent séparément par Pages.

## Vérifications et publication

Node 22 minimum ; `.node-version` fixe la version de construction vérifiée.

```powershell
npm ci
node --test tests/unit/download-worker.test.cjs tests/unit/public-build.test.cjs
npx --no-install wrangler deploy --dry-run --config workers/download-msix/wrangler.jsonc
```

Le dernier contrôle compile localement, sans publier. Le déploiement réel utilise
`npm run cf:download:deploy`, après accord de publication et vérification du
compte cible. Pages et Worker sont deux déploiements distincts : publier les pages
ne met pas ce Worker à jour.

Relever la version active du Worker avant déploiement pour permettre le retour
arrière. Après publication, vérifier les cinq téléchargements complets, leurs
sommes, HEAD, les refus de chemins inconnus et le cache. Préparer la transition
avant toute modification conjointe des archives R2 et du manifeste.

Références : [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/),
[limites Workers](https://developers.cloudflare.com/workers/platform/limits/),
[tarifs Workers](https://developers.cloudflare.com/workers/platform/pricing/),
[tarifs R2](https://developers.cloudflare.com/r2/pricing/).
