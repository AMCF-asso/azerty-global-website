# Installation d'AZERTY Global 2026 sous Linux

## Prérequis

- Un système Linux utilisant X11 (la plupart des distributions).
- Accès root (`sudo`).

## 1. Installation du fichier de layout

Copiez le fichier `azerty-global` dans le dossier des symboles X11 :

```bash
sudo cp azerty-global /usr/share/X11/xkb/symbols/
```

## 2. Déclaration du layout (Optionnel mais recommandé)

Pour que le layout apparaisse dans les paramètres de votre environnement de bureau (GNOME, KDE, etc.), vous devez l'ajouter au fichier `evdev.xml`.

Editez le fichier `/usr/share/X11/xkb/rules/evdev.xml` :

```bash
sudo nano /usr/share/X11/xkb/rules/evdev.xml
```

Cherchez la section `<layoutList>` et ajoutez ceci à l'intérieur :

```xml
<layout>
  <configItem>
    <name>azerty-global</name>
    <shortDescription>AG</shortDescription>
    <description>French (AZERTY Global 2026)</description>
    <languageList>
      <iso639Id>fra</iso639Id>
    </languageList>
  </configItem>
</layout>
```

## 3. Activation temporaire (pour tester)

Vous pouvez activer le layout immédiatement avec cette commande :

```bash
setxkbmap azerty-global
```

## 4. Installation des touches mortes avancées (XCompose)

Pour avoir accès à tous les caractères spéciaux (grec, cyrillique, symboles via AltGr + @), vous devez installer le fichier Compose.

1. Copiez le fichier `XCompose.azerty-global` dans votre dossier personnel (par exemple dans `~/.XCompose.azerty-global`).

2. Créez ou éditez votre fichier `~/.XCompose` :

```bash
nano ~/.XCompose
```

3. Ajoutez ces lignes au début du fichier :

```
include "%L"
include "/home/votre_utilisateur/.XCompose.azerty-global"
```

4. Déconnectez-vous et reconnectez-vous pour que les changements prennent effet.
