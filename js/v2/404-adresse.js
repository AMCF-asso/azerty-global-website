/**
 * /404 : rappelle l'adresse demandée sous le chapô (QCM d'Antoine du
 * 2026-09-29, critique de la page, P2).
 *
 * Chargé en `defer` par src/pages/404.njk (front matter `scripts`) : la CSP de
 * `_headers` n'autorise aucun script en ligne. Le chemin vient de l'URL, donc
 * du visiteur ou d'un lien tiers : il est écrit par `textContent`, jamais par
 * `innerHTML`, pour qu'un chemin piégé (`/<b>x</b>`) s'affiche en texte au
 * lieu d'être interprété. Sans JavaScript, le paragraphe garde `hidden` et
 * rien ne s'affiche.
 */
(function () {
  'use strict';

  var bloc = document.querySelector('[data-adresse-404]');
  var cible = bloc && bloc.querySelector('[data-adresse-404-chemin]');
  if (!bloc || !cible) return;

  var chemin = window.location.pathname || '';

  // Visite directe de la page d'erreur : pas d'autre adresse à rappeler.
  if (/^\/404(\.html)?$/.test(chemin) || chemin === '/') return;

  // Rendu lisible (« é » plutôt que « %C3%A9 ») ; un encodage invalide
  // garde la forme brute.
  try {
    chemin = decodeURIComponent(chemin);
  } catch (e) { /* chemin brut */ }

  cible.textContent = chemin;
  bloc.hidden = false;
})();
