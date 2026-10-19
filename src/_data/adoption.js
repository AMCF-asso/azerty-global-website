/* Registre du chiffre d'adoption affiché par la home v2 (décision d'Antoine du
   2026-09-16 : le chiffre de preuve est gardé, mais adossé à un décompte réel
   et daté).

   Même contrat que `telechargements.js` et pour la même raison (décision D32) :
   ⛔ rien ici n'est calculé au build. Un build ne fait pas de réseau, la page
   ne dépend d'aucun service tiers, et le déploiement ne peut pas échouer parce
   que SourceForge répond mal. Les valeurs sont écrites par
   `node scripts/mesurer-adoption.js --ecrire`, qui interroge l'API de
   statistiques et remplace le bloc ci-dessous.

   ⚠️ Périmètre à ne jamais élargir en le recopiant : ce nombre est le total des
   téléchargements du projet **sur SourceForge**, depuis le premier mois qu'il y
   compte — mars 2021, pas la création d'AZERTY Global en 2017 — et pas tous
   canaux confondus. Le MSIX signé AMCF, le kit entreprise et le Microsoft Store
   ne sont pas dedans. Toute phrase publique qui s'appuie dessus nomme le canal.

   ⛔ Ne jamais additionner ce 1 290 à un décompte Store pour justifier le
   « 2 500+ » des pages association et presse. Ce libellé-là compte depuis
   **avril 2026**, période sur laquelle SourceForge pèse ~260, pas 1 290 :
   la somme 2 220 + 1 290 donne ~3 500, faux de mille. Les deux nombres n'ont
   pas la même date de départ (relevé de la session
   2026-09-20-verif-pipeline-store-stats).

   ⛔ Le Microsoft Store n'expose aucun décompte d'installations publiquement
   (vérifié le 2026-09-16 : la fiche ne sert que `ratingCount`). Le chiffre vient
   du collecteur `store-analytics` (repo AMCF-asso/azerty-global-app), relu par
   `components/microsoft-store/store-analytics/tools/fetch_totals.py` — qui
   refuse un run incomplet. `store.total` est le cumul des **installations
   réussies** depuis le 2026-03-23, pas des acquisitions (1 581 au même relevé) :
   lecture retenue parce qu'elle prolonge le relevé Partner Center du 2026-10-11.
   `jusquau` est le dernier jour couvert par la donnée, `releve` le jour de
   collecte. Si `store.total` redevient `null`, la page n'annonce rien. */

const ADOPTION = {
  sourceforge: {
    total: 1385,
    depuis: "2021-03-01",
    depuisLisible: "mars 2021",
    releve: "2026-10-17",
    source: "https://sourceforge.net/projects/azertyglobal/files/stats/timeline",
  },
  store: {
    total: 2664,
    depuis: "2026-03-23",
    jusquau: "2026-10-13",
    releve: "2026-10-16",
    source: "Installations réussies cumulées (Partner Center via le collecteur store-analytics), relevé par tools/fetch_totals.py : run 83 du workflow store-analytics, https://github.com/AMCF-asso/azerty-global-app/actions/runs/38882388566",
  },
};

/* 1290 → « 1 290 » : espaces insécables étroites, comme le reste du site. */
function nombreLisible(valeur) {
  if (valeur === null || valeur === undefined) return "";
  return String(valeur).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/* « 2026-09-16 » → « 16 septembre 2026 ». */
const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function dateLisible(iso) {
  if (!iso) return "";
  const [annee, mois, jour] = iso.split("-").map(Number);
  return `${jour} ${MOIS[mois - 1]} ${annee}`;
}

/* Date affichée avec la somme : le plus ancien des deux relevés, jamais une date
   plus récente que l'une des deux valeurs. */
const releve = [ADOPTION.sourceforge.releve, ADOPTION.store.releve].sort()[0];

module.exports = { ...ADOPTION, releve, nombreLisible, dateLisible };
