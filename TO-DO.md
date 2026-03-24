# TO-DO List - Site AZERTY Global & Application Microsoft Store

Liste des améliorations prévues, issues de l'audit complet du 21 mars 2026.

---

## 📄 Modifications par page

### `index.html` (Accueil)
- [ ] **Vidéo** : Ajouter une vidéo de démonstration présentant le projet (très cher à réaliser sauf si un bénévole qualifié se motive).
- [ ] **Preuve sociale** : Activer la section "Ils en parlent / Ils nous soutiennent" (actuellement commentée) quand il y a du contenu.
- [ ] **Métriques** : Ajouter compteur de téléchargements et note moyenne une fois 1 000+ téléchargements atteints (SourceForge + Microsoft Store confondus).
- [ ] **Actualités** : Ajouter un widget "Dernières actualités" (une fois `actualites.html` créée).

### `download.html` (Téléchargement)
- [ ] **Conversion** : Ajouter des CTA visuels intercalés (boutons "Télécharger" répétés après chaque section OS) pour qu'un visiteur n'ait jamais à remonter.

### `guide.html` (Guide d'utilisation)
- [ ] **Contenu** : Ajouter une section "Pour débuter" avant le tableau de raccourcis.
- [ ] **Contenu** : Ajouter des illustrations animées (GIF/WebM) pour les raccourcis complexes.
- [ ] **SEO** : Ajouter schema HowTo pour rich snippets "Comment faire".

### `aide.html` (Aide)
- [ ] **Conversion** : Ajouter un CTA "Essayer en ligne" visible en haut de page.
- [ ] **SEO** : Ajouter schema HowTo.
- [ ] **SEO** : Résoudre le problème de cannibalization avec `faq.html` — à terme, fusionner vers une seule page FAQ.

### `faq.html` (FAQ)
- [ ] **SEO** : Résoudre la cannibalization avec `aide.html`. On gardera probablement `faq.html` comme page unique (le trafic viendra des landing pages, pas des snippets FAQ).

### `comparatif.html` (Comparatif)
- [ ] **Accessibilité** : Ajouter `<caption>` aux tables.
- [ ] **SEO** : Ajouter schema ComparisonTable/ItemList pour rich snippets.

### `nouveautes.html` (Nouveautés)
- [ ] **UX** : Ajouter une timeline visuelle ou un sommaire cliquable en haut de page.

### `dev.html` (Développeurs)
- [ ] **SEO** : Ajouter schema SoftwareApplication.
- [ ] **Contenu** : Ajouter section "snippets par langage" (Python, JS, Rust) montrant la fluidité de frappe.
- [ ] **Preuve sociale** : Ajouter témoignages de développeurs (Gelth, syhn...).

### `entreprises.html` (Entreprises)
- [ ] **Conversion** : Ajouter email de contact direct en haut de page (`pro@azerty.global`).
- [ ] **Contenu** : Ajouter section déploiement (GPO, Intune, SCCM).
- [ ] **Preuve sociale** : Ajouter preuves sociales entreprises (logos clients, témoignages).

### `ecoles.html` (Écoles)
- [ ] **Différenciation** : Différencier davantage de la page entreprises (éducation = apprentissage, multilingue, programmes scolaires).
- [ ] **Conversion** : Ajouter email de contact direct en haut de page (`ecoles@azerty.global`).
- [ ] **Contenu** : Ajouter contenu spécifique éducation (guide pédagogique, conformité typographie française).
- [ ] **Preuve sociale** : Ajouter témoignages d'enseignants et d'écoles.
- [ ] **Contenu** : Ajouter section "Comment déployer dans une salle informatique".

### `a-propos.html` (À propos)
- [ ] **UX** : Réduire le nombre de liens utiles (trop d'options = surcharge).
- [ ] **Contenu** : Ajouter photo et bio d'Antoine OLIVIER.

### `presse.html` (Presse)
- [ ] **Kit presse** : Remplir le kit de presse complet (logos HD, communiqué, visuels téléchargeables, chiffres clés).
- [ ] **SEO** : Ajouter schema NewsArticle.
- [ ] **Contenu** : Ajouter bio détaillée d'Antoine OLIVIER.
- [ ] **Contenu** : Ajouter timeline visuelle de l'histoire du clavier AZERTY.
- [ ] **Lien** : Ajouter lien vers `temoignages.html` et `actualites.html` (une fois créées).

### Landing pages SEO (7 pages)
- [ ] **Social** : Créer 7 og:image personnalisées (une par landing page) pour le partage sur les réseaux sociaux.
- [ ] **SEO** : Ajouter schema `speakable` pour les assistants vocaux (Google Assistant).

### Tester (modal)
- [ ] **Gamification** : Ajouter une barre de progression pour les leçons.
- [ ] **Gamification** : Ajouter des badges de réussite (ex: "Maître des accents").
- [ ] **Stats** : Afficher les WPM (mots par minute) et la précision.

---

## 🌍 Global (Toutes les pages)

- [ ] **Navigation mobile** : Découper le dropdown "Plus" en sous-sections avec séparateurs.
- [ ] **Performance** : Minifier components.css (56→35 KB) et tester-modal.js (56→25 KB).
- [ ] **Performance** : Optimiser les SVG avec SVGO.
- [ ] **Accessibilité** : Ajouter `aria-expanded` et `aria-haspopup` sur `.nav__dropdown-toggle`.
- [ ] **Formulaires** : Configurer un webhook Web3Forms → Google Sheets pour centraliser les réponses beta et feedback dans un tableau lisible. Remplace la lecture des emails.
- [ ] **Emails bêta** : Configurer un système d'email automatique pour les inscrits bêta (confirmation d'inscription, envoi du questionnaire de feedback après 1 semaine d'utilisation).

---

## 🆕 Pages à créer

### Haute priorité (avant 30 avril)
- [ ] `temoignages.html` : Page dédiée avec 4-5 profils (dev, étudiant, prof, traducteur). On a déjà Gelth, Ilyes, syhn, Marco.

### Haute priorité (avant version finale mi-mai)
- [ ] `aide-memoire.html` : Guide complet adaptatif — questionnaire rapide (code ? langues ? sciences ?) puis affichage personnalisé des touches mortes et symboles pertinents. Téléchargement d'une carte mémo personnalisée (PDF/SVG). Complément de `guide.html` (prise en main rapide). Chantier prévu avril.
- [ ] `carte.html` : Carte interactive du clavier avec hotspots au survol (comme index.html). Bouton "Imprimer / Télécharger PDF" via `@media print`. Remplace les liens directs vers les SVG statiques.

### Moyenne priorité (mai-juin)
- [ ] `actualites.html` : Blog / actualités pour le SEO long terme. Articles : fondation AMCF, étude IRIT, Microsoft Store.
- [ ] `store.html` : Landing page pour visiteurs venant du Microsoft Store (onboarding, différence Store vs Installeur).
- [ ] `bugs.html` : Page de signalement de bugs pour l'application Microsoft Store. Formulaire dédié (type d'appareil, version Windows, description du problème, étapes de reproduction).

### Plus tard
- [ ] `caracteres/point-median.html` : Landing page point médian.
- [ ] **Traduction anglais** des pages clés (index, download, faq, dev) : +10-15% trafic (expatriés).

---

## 📱 Application Microsoft Store

### Avant publication
- [ ] **CRITIQUE** : Détection double remapping — si l'utilisateur a AZERTY Global en disposition système ET lance l'app, avertir.
- [ ] **BUG** : Sauvegarde auto-start depuis onboarding — la case "Lancer au démarrage" ne semble pas sauvegarder.
- [ ] Captures d'écran Store (min 1366×768).

### Avant v1.0
- [ ] Auto-suspension pour les jeux (raccourci dédié ou détection fullscreen).
- [ ] Gestion AltGr comme Ctrl+Alt (compatibilité VPN, accès distant).
- [ ] Messages d'erreur user-friendly (remplacer les exceptions brutes).
- [ ] Tests unitaires.

### v2+
- [ ] Profils multiples (charger QWERTY Français, QWERTY Globale depuis des JSON).
- [ ] LED physique Caps Lock synchronisée.

---

## 📊 Métriques à suivre

| Métrique | Cible fin mai 2026 | Outil |
|----------|-------------------|-------|
| Visiteurs/mois | 5 000+ | Cloudflare Analytics |
| Taux téléchargement | 10%+ visiteurs | Download tracking |
| Téléchargements Store | 500+ | Microsoft Partner Center |
| Témoignages collectés | 4-5 | Dossier Feedback/ |

---

*Dernière mise à jour : 2026-03-24*
