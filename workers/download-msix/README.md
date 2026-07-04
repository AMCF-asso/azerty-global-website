# Téléchargement MSIX via Cloudflare R2

Ce Worker sert le MSIX signé AMCF depuis R2 à l'adresse :

`https://download.azerty.global/AZERTY_Global_1.0.0.msixbundle`

Il force le type MIME officiel `application/msixbundle`, ajoute l'empreinte SHA-256 dans l'en-tête `X-AZERTY-Global-SHA256`, journalise pays/colo/User-Agent/UTM dans les logs Workers, et expose aussi :

`https://download.azerty.global/AZERTY_Global_1.0.0.msixbundle.sha256`

## Première mise en place

Avant les commandes Cloudflare, créer un token API Cloudflare et le charger uniquement dans le terminal courant :

```powershell
$env:CLOUDFLARE_API_TOKEN = "..."
```

Permissions minimales recommandées pour le token :

- Compte : R2 Storage, modification
- Compte : Workers Scripts, modification
- Zone `azerty.global` : Workers Routes, modification
- Zone `azerty.global` : Zone, lecture

1. Créer le bucket R2 :

```powershell
npm.cmd run cf:download:bucket:create
```

2. Uploader le MSIX :

```powershell
npm.cmd run cf:download:upload-msix
```

Fichier source attendu :

`../Fichiers d'installation/Application AZERTY Global (Windows Store-MSIX)/AZERTY_Global_1.0.0.msixbundle`

SHA-256 attendu :

`3E6C88C7617F719915F876BC21745C0A2D85D3AA1C71BA0775A8C181E392B92C`

3. Déployer le Worker :

```powershell
npm.cmd run cf:download:deploy
```

4. Vérifier :

```powershell
curl.exe -I -L https://download.azerty.global/AZERTY_Global_1.0.0.msixbundle
curl.exe -L https://download.azerty.global/AZERTY_Global_1.0.0.msixbundle.sha256
```

## DNS Cloudflare

Le domaine `download.azerty.global` doit être dans la zone Cloudflare `azerty.global`.
La route Worker est déclarée dans `wrangler.jsonc` :

`download.azerty.global/*`

Si Cloudflare demande un enregistrement DNS pour le sous-domaine, créer un CNAME proxifié vers `azerty.global` ou utiliser la configuration Custom Domain/Route recommandée par le tableau de bord Cloudflare.

## Logs

Suivre les téléchargements en temps réel :

```powershell
npm.cmd run cf:download:tail
```

Les logs contiennent `country`, `colo`, `User-Agent`, `Referer` et les paramètres `utm_*`.
