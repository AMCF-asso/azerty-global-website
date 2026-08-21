# Politique de sécurité

> 🇬🇧 **Reporting a vulnerability.** Email **dev@azerty.global** with a description, the affected
> URL or file, and the steps to reproduce. Please do not open a public issue for a security
> problem. AZERTY Global is a volunteer project run by a non-profit: we aim to acknowledge
> reports within 7 days, and we run no bug bounty. French version below.

AZERTY Global est un projet bénévole porté par l'**Association pour la Modernisation du Clavier
Français** (AMCF), association loi 1901 sans but lucratif. Nous prenons les signalements de
sécurité au sérieux, dans la limite des moyens d'une équipe bénévole.

## Signaler une faille

**Écrivez à [dev@azerty.global](mailto:dev@azerty.global).** N'ouvrez pas d'issue publique pour
un problème de sécurité : une issue est visible de tous avant que le correctif n'existe.

Un bon signalement contient :

- une description du problème et de son impact ;
- l'URL, le fichier ou le composant concerné ;
- les étapes pour le reproduire ;
- si vous en avez une, une proposition de correction.

**Ce que vous pouvez attendre :** un accusé de réception sous 7 jours, puis des nouvelles à
mesure de l'analyse. Nous ne versons **aucune récompense financière** — ce projet est gratuit et
sans revenu publicitaire. Si vous le souhaitez, nous créditons votre signalement une fois la
faille corrigée.

## Périmètre

Ce dépôt contient **le site azerty.global, le testeur en ligne et le Worker de téléchargement**.
Entrent dans le périmètre :

- le site publié sur `azerty.global` et son rendu construit ;
- le testeur clavier en ligne ;
- le Worker qui sert les archives depuis `download.azerty.global` ;
- les dépendances de construction déclarées dans `package.json`.

Pour une faille dans **l'application Windows** distribuée sur le Microsoft Store, écrivez à la
même adresse en le précisant : elle est développée dans un dépôt distinct.

**Hors périmètre**, sauf démonstration d'un impact réel : les résultats bruts d'un scanner sans
exploitation, l'absence d'un en-tête qui ne mène à rien d'exploitable, le volume de recherche ou
le référencement, et les rapports portant sur des services tiers que nous ne contrôlons pas
(Microsoft Store, HelloAsso, Cloudflare, Web3Forms).

## Vérifier l'intégrité d'un téléchargement

Les archives sont servies depuis `download.azerty.global`. **L'empreinte SHA-256 du paquet
Windows est publiée sur [azerty.global/download](https://azerty.global/download)** : comparez-la
avant d'installer si vous déployez sur un parc.

```powershell
Get-FileHash .\AZERTY_Global_1.1.0.msixbundle -Algorithm SHA256
```

```bash
sha256sum AZERTY_Global_1.1.0.msixbundle
```

Si une empreinte ne correspond pas, **n'installez pas** et signalez-le à l'adresse ci-dessus.

## Ce que le site collecte

Aucun cookie publicitaire, aucun identifiant personnel, aucune bannière de consentement — parce
qu'il n'y a rien à consentir. Le détail complet, service par service, est dans les
[mentions légales](https://azerty.global/mentions-legales). Pour une question de protection des
données plutôt que de sécurité : [privacy@azerty.global](mailto:privacy@azerty.global).

---

*Dernière mise à jour : 2026-08-21*
