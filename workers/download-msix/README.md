# Téléchargement MSIX / Kit entreprise via Cloudflare R2

Ce Worker sert deux fichiers depuis R2 :

- **Kit entreprise (canal principal)** : `https://download.azerty.global/AZERTY_Global_Entreprise.zip`
  — ZIP contenant le MSIX signé, la fiche DSI et les supports. Sert à contourner le blocage du `.msixbundle` par les navigateurs.
- **MSIX signé nu (secondaire)** : `https://download.azerty.global/AZERTY_Global_1.0.0.msixbundle`
  — utile pour Intune / SCCM qui veulent le paquet seul.

Il force le type MIME (`application/zip` ou `application/msixbundle`), ajoute l'empreinte SHA-256 dans l'en-tête `X-AZERTY-Global-SHA256`, journalise pays/colo/User-Agent/UTM dans les logs Workers, et expose la somme de contrôle de chaque fichier :

- `https://download.azerty.global/AZERTY_Global_Entreprise.zip.sha256`
- `https://download.azerty.global/AZERTY_Global_1.0.0.msixbundle.sha256`

Les hashes attendus sont définis dans `src/index.js` (objet `FILES`). ZIP : `87E11D05D316E5BC919DE0FCD42FB6190B92B4A1EC86AD736B819B19C12C2D7C`.

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

2. Uploader les deux fichiers :

```powershell
npm.cmd run cf:download:upload-zip
npm.cmd run cf:download:upload-msix
```

Fichiers source attendus :

- `../Fichiers d'installation/AZERTY_Global_Entreprise.zip`
- `../Fichiers d'installation/Application AZERTY Global (Windows Store-MSIX)/AZERTY_Global_1.0.0.msixbundle`

SHA-256 attendus :

- ZIP : `87E11D05D316E5BC919DE0FCD42FB6190B92B4A1EC86AD736B819B19C12C2D7C`
- MSIX : `3E6C88C7617F719915F876BC21745C0A2D85D3AA1C71BA0775A8C181E392B92C`

> Le ZIP est reconstruit à partir du dossier kit. Si vous le régénérez, recalculez son SHA-256 et mettez à jour l'objet `FILES` dans `src/index.js` avant de redéployer.

3. Déployer le Worker :

```powershell
npm.cmd run cf:download:deploy
```

4. Vérifier :

```powershell
curl.exe -I -L https://download.azerty.global/AZERTY_Global_Entreprise.zip
curl.exe -L https://download.azerty.global/AZERTY_Global_Entreprise.zip.sha256
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
