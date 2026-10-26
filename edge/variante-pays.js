/* Variante de /download selon le continent du visiteur (ligne B de l'étude
   IA/studies/2026-09-04-sites-web-adaptatifs-ia.md, § 7.3 et 7.6).

   Sans état : le continent vient de Cloudflare à chaque requête
   (`request.cf.continent`), rien n'est gardé, ni IP, ni cookie, ni journal.
   La page construite déclare `standard` ; pour une visite d'Afrique, la
   fonction functions/download.js remplace les deux marqueurs par `afrique`,
   et le CSS de css/v2/download.css fait le reste. La mesure (js/v2/mesure.js)
   lit la même balise : contenu servi et variante mesurée ne peuvent diverger.

   Partagé par la Pages Function et par scripts/serve-static.js (tests). */

"use strict";

const HOTE_PRODUCTION = "azerty.global";
const GROUPES = ["standard", "afrique"];

/* Groupe servi. Hors production (aperçus, tests), `?variante=<groupe>`
   force un groupe pour vérifier le rendu ; jamais sur azerty.global. */
function groupeDuVisiteur({ continent, hote, demande } = {}) {
  const hoteNet = String(hote || "").toLowerCase().replace(/\.$/, "");
  if (hoteNet !== HOTE_PRODUCTION && GROUPES.includes(demande)) return demande;
  return continent === "AF" ? "afrique" : "standard";
}

const MARQUEUR_HTML = 'data-variante="standard"';
const MARQUEUR_META = '<meta name="ag-variante" content="standard">';

/* Les deux marqueurs changent ensemble ou pas du tout : sans eux, la page
   reste standard et se déclare standard. */
function appliquerVariante(html, groupe) {
  if (groupe === "standard" || !GROUPES.includes(groupe)) return html;
  if (!html.includes(MARQUEUR_HTML) || !html.includes(MARQUEUR_META)) return html;
  return html
    .replace(MARQUEUR_HTML, `data-variante="${groupe}"`)
    .replace(MARQUEUR_META, `<meta name="ag-variante" content="${groupe}">`);
}

module.exports = { GROUPES, groupeDuVisiteur, appliquerVariante };
