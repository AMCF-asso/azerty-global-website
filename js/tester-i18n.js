/**
 * AZERTY Global Tester — i18n minimal (pattern T(fr, en) de l'app Microsoft Store).
 * La langue est fixée UNE SEULE FOIS par init-tester.js AVANT le chargement
 * des autres modules du testeur (certains évaluent des T() au niveau module).
 * Défaut : français. Pas de clé, pas de dictionnaire, pas de localStorage.
 */
let testerLang = 'fr';

export function setTesterLang(lang) {
  testerLang = /^en/i.test(String(lang || '')) ? 'en' : 'fr';
}

export function isEnglish() {
  return testerLang === 'en';
}

export function T(fr, en) {
  return testerLang === 'en' ? en : fr;
}
