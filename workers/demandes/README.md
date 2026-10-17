# Demandes « Préviens-moi » (autocollants et claviers) sur Cloudflare Workers + D1

Le Worker `azerty-global-demandes` reçoit les demandes du formulaire de
`/autocollants-claviers`, les enregistre dans la base D1 `azerty-global-demandes`
(une ligne par adresse e-mail) et expose un compteur public. Route :
`azerty.global/api/demandes*` (zone `azerty.global`). Le code est du JavaScript
ESM sans bundle (`src/index.js`), comme `workers/download-msix/`.

## Contrat

**`POST /api/demandes`** : `application/x-www-form-urlencoded` ou
`multipart/form-data`, 8 Ko au maximum (sinon 413).

| Champ | Règle |
| --- | --- |
| `email` | requis, 254 caractères au plus, mis en minuscules, forme `a@b.c` |
| `pays` | requis, `^[A-Z]{2}$` |
| `produits` (répétable) | au moins un parmi `autocollants`, `clavier` |
| `couleur_touches` | `noires`, `blanches`, `autre`, `ne-sais-pas` |
| `disposition_physique` | `azerty-fr`, `azerty-be`, `qwerty`, `qwertz`, `autre`, `ne-sais-pas` |
| `type_clavier` (répétable) | `portable`, `bureau`, `sans-fil`, `mecanique` |
| `prix_autocollants` | `jusqu-5`, `jusqu-10`, `jusqu-15`, `plus-15` |
| `prix_clavier` | `jusqu-40`, `jusqu-70`, `jusqu-100`, `plus-100` |
| `profil` | `particulier`, `ecole`, `entreprise`, `administration`, `association` |
| `organisation` | texte libre, 120 caractères au plus, caractères de contrôle retirés |
| `postes` | entier de 1 à 100000 |
| `page` | chemin d'origine : `/…`, 100 caractères au plus, requête retirée, sinon ignoré |
| `consentement` | requis, égal à `oui` |
| `site_web` | pot de miel : rempli, la réponse est un succès et rien n'est stocké |

Les facultatifs vides sont stockés `NULL`. Un `Origin` présent et différent de
`https://azerty.global` donne 403. Cinq envois par minute et par clé
(SHA-256 de `CF-Connecting-IP` + secret `SEL_IP`) ; au-delà, 429. L'adresse IP
n'est jamais stockée ni journalisée.

Réponses (même résultat pour une adresse nouvelle ou déjà connue) :

| Cas | `Accept: application/json` | Sinon (envoi sans JS) |
| --- | --- | --- |
| Succès | 200 `{"ok":true}` | 303 `/autocollants-claviers#envoi-ok` |
| Erreur de champ | 400 `{"ok":false,"erreurs":{"champ":"requis\|format\|valeur"}}` | 303 `#envoi-erreur` |
| Trop d'envois | 429 `{"ok":false,"erreur":"trop-de-demandes"}` | 303 `#envoi-attente` |

Autres statuts (toujours en JSON) : 403 origine, 413 corps trop gros, 415 type de
contenu non pris en charge, 500 stockage indisponible. Toutes les réponses de
l'API d'envoi portent `Cache-Control: no-store` et `X-Content-Type-Options: nosniff`.

Un doublon met à jour la ligne : les produits s'additionnent, les autres champs
prennent la dernière réponse non vide, `cree_le` et `jeton` sont conservés.

**`GET /api/demandes/compte`** : `{"total": n, "seuil": 200}` si `n ≥ SEUIL`,
sinon `{"total": null, "seuil": 200}`. `Cache-Control: public, max-age=300`,
réponse gardée dans `caches.default` pour épargner D1. Autres méthodes : 405 ;
autres chemins : 404.

## Vérifications locales

Node 22 minimum. Les tests lancent le vrai Worker sous Miniflare avec une D1
locale (vraie SQL) et vérifient aussi le rapport sur une D1 `wrangler --local`.
Rien n'est envoyé au compte Cloudflare.

```powershell
cd workers/demandes
npm test
```

## Déploiement (vendredi)

Depuis `workers/demandes`, après vérification du compte Cloudflare cible.

1. Créer la base en juridiction UE (les adresses restent dans l'Union européenne) : `npx wrangler d1 create azerty-global-demandes --jurisdiction eu`
2. Reporter `database_id` dans `wrangler.jsonc` à la place de `A_REMPLIR_AU_DEPLOIEMENT`.
3. Créer le schéma : `npx wrangler d1 migrations apply azerty-global-demandes --remote`
4. Publier : `npx wrangler deploy`
5. Poser le sel du limiteur (saisie masquée) : `npx wrangler secret put SEL_IP`
6. Contrôler avec curl (une commande par ligne) :

```bash
curl -si https://azerty.global/api/demandes/compte
```

```bash
curl -si -X POST https://azerty.global/api/demandes -H "Accept: application/json" -H "Origin: https://azerty.global" -d "email=controle%40example.org&pays=FR&produits=autocollants&consentement=oui"
```

```bash
curl -si -X POST https://azerty.global/api/demandes -H "Accept: application/json" -H "Origin: https://evil.example" -d "email=x%40example.org"
```

Attendus : compteur `{"total":null,"seuil":200}` avec `max-age=300` ; envoi
`200 {"ok":true}` ; origine étrangère `403`. Six envois rapprochés depuis la même
IP donnent `429`. Supprimer ensuite la ligne de contrôle :
`npx wrangler d1 execute azerty-global-demandes --remote --command "DELETE FROM demandes WHERE email = 'controle@example.org'"`.

**Retour arrière** : `npx wrangler rollback` revient à la version précédente du
Worker ; `npx wrangler delete` retire le Worker et sa route (l'API
disparaît, la page reste servie). Les données D1
restent en place ; `npx wrangler d1 time-travel restore azerty-global-demandes --timestamp <date>`
restaure l'état d'un instant. Relever la version active avant de publier.

## Rapport agrégé pour les fabricants

`scripts/rapport.js` interroge D1 (`--remote` par défaut, `--local` en option) et
écrit un rapport Markdown : total, produits, pays, couleur, disposition, type,
prix, profils (organisations distinctes et postes), pages d'origine, semaines.
Jamais d'adresse e-mail ni de nom d'organisation.

```powershell
node scripts/rapport.js --sortie rapport-demandes.md
node scripts/rapport.js --local --persist-to <dossier> --sortie rapport-demandes.md
```

Sans `--sortie`, le rapport s'affiche. `--base <nom>` change la base (défaut
`azerty-global-demandes`). Le fichier produit n'est pas versionné : le placer
hors du dépôt ou le supprimer après envoi.
