/* Pages Function de /download : sert la variante `afrique` aux visites
   d'Afrique, la page construite telle quelle aux autres. Logique et
   garanties dans edge/variante-pays.js.

   ⛔ Ne jamais casser la page : toute erreur rend la page statique. Rien n'est
   journalisé (pas de console.log de la requête). */

import variantePays from "../edge/variante-pays.js";

const { groupeDuVisiteur, appliquerVariante } = variantePays;

/* Sans ces en-têtes, une page déjà en cache répondrait 304 sur l'ETag de la
   page standard, et la variante ne serait jamais servie. */
const ENTETES_CONDITIONNELS = ["if-none-match", "if-modified-since"];

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const groupe = groupeDuVisiteur({
      continent: context.request.cf && context.request.cf.continent,
      hote: url.hostname,
      demande: url.searchParams.get("variante")
    });
    if (groupe === "standard") return context.next();

    const entetes = new Headers(context.request.headers);
    ENTETES_CONDITIONNELS.forEach((nom) => entetes.delete(nom));
    const statique = await context.next(new Request(context.request.url, { method: "GET", headers: entetes }));
    const type = statique.headers.get("content-type") || "";
    if (statique.status !== 200 || !type.includes("text/html")) return statique;

    const html = appliquerVariante(await statique.text(), groupe);
    const reponse = new Headers(statique.headers);
    reponse.delete("etag");
    reponse.delete("content-length");
    reponse.set("cache-control", "private, max-age=0, must-revalidate");
    return new Response(html, { status: 200, headers: reponse });
  } catch (erreur) {
    /* `next()` ne sert qu'une fois : le repli passe par le service des fichiers. */
    return context.env.ASSETS.fetch(context.request);
  }
}
