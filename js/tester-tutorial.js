/**
 * AZERTY Global Tester — guided course inside the Lessons tab.
 *
 * P14b (2026-09-19) : parcours court de la spec
 * `operations/decisions/2026-09-19-testeur-v2-parcours-court.md` — intro à
 * deux questions (§3), trois étapes obligatoires (§4.1), bonus par profil
 * après la synthèse (§4.2), synthèse « N des 5 changements » (§5.2),
 * « Passer le parcours » → synthèse vide + drapeau `skipped` (§5.2),
 * mauvaise touche affichée en rouge et le curseur avance (§6).
 */

import { announceToScreenReaders } from './tester-accessibility.js?v=final-20260801-1';
import {
  applyKeyboardCapsLockKeydown,
  applyKeyboardCapsLockKeyup,
  clearNativeCompositionAfterInternalKeyup,
  deferToNativeComposition,
  isControlShortcut,
  remapMacKeyCode,
  suppressNativeCompositionAfterInternalKey,
  syncKeyboardModifierStateFromEvent
} from './tester-keyboard-input.js?v=final-20260801-1';
import { setupPlainTextContentEditable } from './tester-contenteditable.js?v=final-20260801-1';
import { getLayerDisplayName } from './tester-platform.js?v=final-20260801-1';
import {
  DEAD_KEY_NAMES,
  loadCharacterIndex,
  getCharacterIndex,
  getPreferredCharacterMethod,
  highlightTutorialMethod,
  clearTutorialHighlights,
  isAzertyGlobalSpecificChar
} from './tester-search.js?v=final-20260801-1';
import { startSession as startStatsSession, recordKeystroke } from './tester-stats.js?v=final-20260801-1';
import { T, isEnglish } from './tester-i18n.js?v=final-20260801-1';

const TUTORIAL_URL = '/tester/tutorial.json?v=final-20260801-1';
const DONE_KEY = 'azertyTutorialDone';
const PROGRESS_KEY = 'azertyTutorialProgress';
// Posé par « Passer le parcours » (§5.2) : le parcours est reproposé une fois à
// la visite suivante, puis DONE_KEY est posé et il ne revient plus.
const SKIPPED_KEY = 'azertyTutorialSkipped';
// Les cases cochées de la question 2 (§3.2) : des ids, jamais du texte tapé.
const PROFILE_KEY = 'azertyTesterProfile';

// À partir du 2e exercice, l'indice n'est plus permanent : il apparaît sur
// blocage (inactivité ou erreurs répétées) ou à la demande via le bouton Indice.
const HINT_INACTIVITY_DELAY_MS = 5000;
// Deux erreurs consécutives font apparaître « Passer cet exercice » (§6).
const SKIP_STEP_MIN_CONSECUTIVE_ERRORS = 2;
// Un indice affiché s'efface de lui-même, sauf sur un caractère qu'AZERTY
// Global ajoute ou déplace (cf. isAzertyGlobalSpecificChar) : là, le masquer
// ne ferait que replonger la personne dans le même blocage.
const HINT_AUTO_HIDE_MS = 4000;

// Les deux CTA d'installation se distinguent par leur cid (§1, §5.1).
const CID_STEP = 'website_tester_step';
const CID_FINAL = 'website_tester_final';

// Partage court (§5.3). Phrase fixe, écrite par Antoine le 2026-09-19 et reprise
// mot pour mot : c'est celui qui partage qui parle, pas le site. ⛔ Ne pas y
// ajouter de paramètre de suivi — l'URL doit rester lisible dans un message ;
// le comptage passe par l'événement `tester_share`.
const SHARE_URL = 'https://azerty.global/testeur';
const SHARE_TEXT_FR = 'J’ai essayé le clavier français amélioré : É Ç À œ — « » . Teste-le ici : ' + SHARE_URL;
const SHARE_TEXT_EN = 'I tried the improved French keyboard: É Ç À œ — « » . Try it here: ' + SHARE_URL;

// hl aligné sur la langue du testeur (la fiche Store est bilingue FR/EN depuis l'app v1.1.0).
const STORE_DOWNLOAD_BASE = `https://apps.microsoft.com/detail/9n4bts43sssz?hl=${isEnglish() ? 'en-US' : 'fr-FR'}&gl=FR`;
const MACOS_DOWNLOAD_URL = 'https://download.azerty.global/AZERTY_Global_macOS.zip';
const LINUX_DOWNLOAD_URL = 'https://download.azerty.global/AZERTY_Global_Linux.zip';

const PRELUDE_BY_SLUG = new Set([
  'e-grave-majuscule',
  'a-grave-majuscule',
  'c-cedille-majuscule',
  'e-dans-l-a',
  'e-dans-l-o',
  'guillemets'
]);

const KEY_CHAR_POSITIONS = [
  { selector: '.bottom-left', layerIndex: 0 },
  { selector: '.top-left', layerIndex: 1 },
  { selector: '.bottom-right', layerIndex: 4 },
  { selector: '.top-right', layerIndex: 5 }
];

const STORE_HIDDEN_DEAD_KEYS = new Set([
  'dk_misc_symbols',
  'dk_dot_above',
  'dk_dot_below',
  'dk_double_acute',
  'dk_double_grave',
  'dk_horn',
  'dk_hook',
  'dk_breve',
  'dk_inverted_breve',
  'dk_stroke',
  'dk_horizontal_stroke',
  'dk_macron',
  'dk_extended_latin',
  'dk_cedilla',
  'dk_comma',
  'dk_phonetic',
  'dk_ring_above',
  'dk_scientific',
  'dk_caron',
  'dk_ogonek',
  'dk_cyrillic',
  'dk_cyrillic_ext'
]);

const STORE_LANGUAGE_VISIBLE_DEAD_KEYS = new Set(['dk_stroke']);

const STORE_HIDDEN_SLOTS = new Set([
  'IntlBackslash:4', // B00 AltGr -> <=
  'IntlBackslash:5', // B00 Shift+AltGr -> >=
  'KeyI:4', // D08 AltGr -> ^
  'KeyL:4', // C09 AltGr -> `
  'KeyM:4', // B07 AltGr -> <
  'KeyM:5', // B07 Shift+AltGr -> inverted question mark
  'Comma:4', // B08 AltGr -> >
  'Period:4', // B09 AltGr -> #
  'Slash:4', // B10 AltGr -> inverted exclamation mark
  'Digit4:4', // E04 AltGr -> typographic apostrophe
  'Digit4:5', // E04 Shift+AltGr -> opening single quote
  'Digit6:5', // E06 Shift+AltGr -> soft hyphen
  'Digit0:4', // E10 AltGr -> alternate @
  'KeyZ:5', // B01 Shift+AltGr -> opening double quote
  'KeyX:5' // B02 Shift+AltGr -> closing double quote
]);

const STORE_LANGUAGE_VISIBLE_SLOTS = new Set([
  'KeyM:5',
  'Slash:4'
]);

const KEY_LABELS = {
  Backquote: '²',
  Digit1: '&',
  Digit2: 'é',
  Digit3: '"',
  Digit4: "'",
  Digit5: '(',
  Digit6: '-',
  Digit7: 'è',
  Digit8: '_',
  Digit9: 'ç',
  Digit0: 'à',
  Minus: ')',
  Equal: '=',
  KeyQ: 'A',
  KeyW: 'Z',
  KeyE: 'E',
  KeyR: 'R',
  KeyT: 'T',
  KeyY: 'Y',
  KeyU: 'U',
  KeyI: 'I',
  KeyO: 'O',
  KeyP: 'P',
  KeyA: 'Q',
  KeyS: 'S',
  KeyD: 'D',
  KeyF: 'F',
  KeyG: 'G',
  KeyH: 'H',
  KeyJ: 'J',
  KeyK: 'K',
  KeyL: 'L',
  Semicolon: 'M',
  KeyZ: 'W',
  KeyX: 'X',
  KeyC: 'C',
  KeyV: 'V',
  KeyB: 'B',
  KeyN: 'N',
  KeyM: ',',
  Comma: ';',
  Period: ':',
  Slash: '!',
  Quote: "'",
  Space: T('Espace', 'Space'),
  IntlBackslash: '<'
};

let tutorialPromise = null;
let pendingTutorialCompositionValidation = null;

const tutorialState = {
  data: null,
  refs: null,
  getKeyboard: null,
  active: false,
  finalVisible: false,
  finalKind: 'done', // 'done' | 'skipped'
  sequence: [],
  currentIndex: 0,
  completedIds: [],
  bonusDoneIds: [],
  introId: null,
  // Frappe de l'exercice : `typed` porte tout ce qui a été tapé, faux compris
  // (§6 : la mauvaise touche s'écrit marquée et le curseur avance) ; `typedOk`
  // dit, index par index, si le caractère est le bon.
  typed: '',
  typedOk: [],
  targetChars: [],
  stepErrors: 0,
  guidanceSuspended: false,
  advanceTimeoutId: null,
  introVisible: false,
  introStage: 'methods', // 'methods' | 'profile'
  startAt: 1,
  profile: [],
  mode: 'core', // 'core' | 'bonus'
  bonusStep: null,
  firstSuccess: false,
  userEngaged: false,
  hintShownForStep: false,
  hintTracked: false,
  inactivityTimerId: null,
  hintHideTimerId: null,
  consecutiveErrors: 0,
  physicalKeys: 0,
  virtualClicks: 0,
  nudgeShown: false,
  onGlobalSkip: null
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function placeCaretAtEnd(targetEl) {
  if (!targetEl) return;
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  const lastChild = targetEl.lastChild;
  if (lastChild?.nodeType === Node.TEXT_NODE) {
    range.setStart(lastChild, lastChild.textContent?.length || 0);
  } else {
    range.selectNodeContents(targetEl);
    range.collapse(false);
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

// Événement de conversion (compat GTM v1) : les anciens `tutorial_*` restent.
function track(eventName, details = {}) {
  try {
    window.AzertyTrack?.conversion?.(eventName, details);
  } catch {
    // Tracking must never block the tutorial.
  }
}

// Événement de parcours (§10.1) : le strict nécessaire en paramètre, jamais
// le texte tapé.
function trackEvent(eventName, details = {}) {
  try {
    window.AzertyTrack?.event?.(eventName, details);
  } catch {
    // no-op
  }
}

function readJsonStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: tutorial still works for the current session.
  }
}

function hasFlag(key) {
  try {
    return !!localStorage.getItem(key);
  } catch {
    return false;
  }
}

function hasDoneFlag() {
  return hasFlag(DONE_KEY);
}

function setDoneFlag() {
  try {
    localStorage.setItem(DONE_KEY, new Date().toISOString());
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    // no-op
  }
}

function setSkippedFlag() {
  try {
    localStorage.setItem(SKIPPED_KEY, new Date().toISOString());
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    // no-op
  }
}

function clearSkippedFlag() {
  try {
    localStorage.removeItem(SKIPPED_KEY);
  } catch {
    // no-op
  }
}

function clearProgress() {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    // no-op
  }
}

function readStoredProfile() {
  const stored = readJsonStorage(PROFILE_KEY);
  return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : [];
}

function writeStoredProfile(profile) {
  writeJsonStorage(PROFILE_KEY, profile);
}

function saveProgress() {
  if (!tutorialState.active || tutorialState.mode !== 'core') return;
  writeJsonStorage(PROGRESS_KEY, {
    introId: tutorialState.introId,
    currentId: tutorialState.sequence[tutorialState.currentIndex]?.id || null,
    completedIds: tutorialState.completedIds,
    startAt: tutorialState.startAt,
    profile: tutorialState.profile
  });
}

function getCurrentSlug() {
  // P14d : depuis la v2, le testeur ne vit plus dans la page caractère mais sur
  // /testeur, dont le chemin ne dit plus de quel caractère on vient. Le CTA des
  // pages caractère porte `?de=<slug>` : c'est lui qui désigne le prélude.
  const origine = new URLSearchParams(location.search).get('de');
  if (origine) return origine;

  const filename = location.pathname.split('/').filter(Boolean).pop() || '';
  return filename.replace(/\.html$/i, '') || 'index';
}

export function getTutorialPreludeIdFromCurrentPage() {
  const slug = getCurrentSlug();
  return PRELUDE_BY_SLUG.has(slug) ? slug : null;
}

export function shouldAutoStartTutorial() {
  return !hasDoneFlag();
}

export function isTutorialActive() {
  return tutorialState.active && !tutorialState.guidanceSuspended;
}

export function isTutorialFinalVisible() {
  return tutorialState.finalVisible;
}

async function loadTutorial() {
  if (tutorialState.data) return tutorialState.data;
  if (tutorialPromise) return tutorialPromise;

  tutorialPromise = fetch(TUTORIAL_URL, { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) throw new Error('Failed to load tutorial');
      return response.json();
    })
    .then((data) => {
      tutorialState.data = data;
      return data;
    })
    .catch((error) => {
      tutorialPromise = null;
      throw error;
    });

  return tutorialPromise;
}

function localized(obj, key) {
  if (!obj) return '';
  const en = obj[`${key}En`];
  return isEnglish() && en ? en : (obj[key] || '');
}

function ensureTutorialDom(refs) {
  if (!refs.modeLessons || refs.tutorialPanel) return;

  const entry = document.createElement('div');
  entry.id = 'lesson-tutorial-entry';
  entry.className = 'tutorial-entry bg-secondary p-3 mb-3 border rounded-8';
  entry.innerHTML = `
    <div class="items-center d-flex justify-between gap-8px">
      <div>
        <h3 class="text-primary margin-0-0-8-0">${T('Le parcours en 90 secondes', 'The 90-second course')}</h3>
        <p class="text-secondary text-13px margin-0">${T('Refaites les trois étapes guidées : majuscules accentuées, typographie, arobase.', 'Replay the three guided steps: accented capitals, typography, at sign.')}</p>
      </div>
      <button class="font-semibold cursor-pointer border-none rounded-6 text-primary-dark px-8-16 bg-accent" id="tutorial-start" type="button">${T('Lancer', 'Start')}</button>
    </div>
  `;

  const panel = document.createElement('div');
  panel.id = 'tutorial-panel';
  panel.className = 'tutorial-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div id="tutorial-intro" class="tutorial-intro bg-secondary p-3 mb-3 border rounded-8" hidden>
      <h3 class="text-primary margin-0-0-8-0" id="tutorial-intro-question"></h3>
      <div class="tutorial-intro__choices" id="tutorial-intro-methods" role="group"></div>
      <p class="tutorial-intro__reply text-primary" id="tutorial-intro-reply" hidden></p>
      <div class="tutorial-intro__profile" id="tutorial-intro-profile" hidden>
        <h3 class="text-primary margin-0-0-8-0" id="tutorial-intro-profile-question"></h3>
        <div class="tutorial-intro__choices tutorial-intro__choices--checks" id="tutorial-intro-profiles" role="group"></div>
        <button class="font-semibold cursor-pointer border-none rounded-6 text-primary-dark px-8-16 bg-accent" id="tutorial-intro-start" type="button">${T('Commencer', 'Start')}</button>
      </div>
      <button class="tutorial-link-button" id="tutorial-intro-skip" type="button">${T('Passer l’intro', 'Skip the intro')}</button>
    </div>

    <div id="tutorial-exercise" class="bg-secondary p-3 mb-3 border rounded-8">
      <div class="items-center d-flex mb-2 justify-between gap-8px">
        <span class="text-primary font-semibold" id="tutorial-title"></span>
        <span class="text-secondary text-12px" id="tutorial-progress" role="status" aria-live="polite"></span>
      </div>
      <p class="text-secondary text-13px margin-0 margin-b-12 tutorial-explanation" id="tutorial-instruction"></p>
      <div class="tutorial-method text-secondary text-12px mb-2" id="tutorial-method"></div>
      <div class="leading-relaxed text-18px p-3 font-mono pre-wrap mb-2 border rounded-6 bg-card" id="tutorial-target" role="region" aria-label="${T('Texte à reproduire', 'Text to reproduce')}"></div>
      <div
        id="tutorial-input"
        class="output-text text-18px p-3 font-mono outline-none min-h-1-5em border-accent rounded-6 bg-card"
        contenteditable="true"
        role="textbox"
        aria-label="${T('Zone de saisie de l’exercice', 'Exercise typing area')}"
        aria-describedby="tutorial-instruction"
        spellcheck="false"
        data-placeholder="${T('Tapez ici...', 'Type here...')}"
      ></div>
      <p class="tutorial-nudge text-13px margin-8-0-0-0" id="tutorial-nudge" aria-live="polite" hidden></p>
      <p class="tutorial-feedback text-13px margin-8-0-0-0" id="tutorial-feedback" aria-live="polite"></p>
    </div>

    <div id="tutorial-final" class="tutorial-final bg-secondary p-3 mb-3 border rounded-8" hidden>
      <h3 class="text-primary margin-0-0-8-0" id="tutorial-final-title"></h3>
      <ul class="tutorial-changes" id="tutorial-final-changes"></ul>
      <div class="tutorial-final-actions">
        <a class="font-semibold cursor-pointer border-none rounded-6 tutorial-download-link" id="tutorial-download" href="${T('/download', '/en/download')}" data-cid="${CID_FINAL}">${T('Installer gratuitement', 'Install for free')}</a>
        <button class="font-semibold cursor-pointer border-none rounded-6 text-primary-dark px-8-16 bg-accent tutorial-continue-link" id="tutorial-final-restart" type="button" hidden>${T('Le faire en 90 secondes', 'Do it in 90 seconds')}</button>
        <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="tutorial-final-libre" type="button" hidden>${T('Aller au clavier libre', 'Go to the free keyboard')}</button>
      </div>
      <div class="tutorial-final-bonus" id="tutorial-final-bonus" hidden>
        <span class="tutorial-final-bonus__label">${T('Pour votre usage :', 'For your use:')}</span>
        <span class="tutorial-final-bonus__buttons" id="tutorial-final-bonus-buttons"></span>
      </div>
      <p class="tutorial-final-links text-13px">
        <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16 tutorial-share-button" id="tutorial-final-share" type="button" hidden>${T('Partager le testeur', 'Share the tester')}</button>
        <a href="${T('/guide', '/en/guide')}" id="tutorial-final-guide">${T('Le guide des cinq changements', 'The guide to the five changes')}</a>
      </p>
      <p class="tutorial-share-feedback text-13px" id="tutorial-share-feedback" role="status" hidden></p>
    </div>

    <div class="d-flex gap-8px" id="tutorial-actions">
      <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="tutorial-prev" type="button">${T('← Précédent', '← Previous')}</button>
      <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="tutorial-hint" type="button" hidden>${T('💡 Indice', '💡 Hint')}</button>
      <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="tutorial-skip-step" type="button" hidden>${T('Passer cet exercice', 'Skip this exercise')}</button>
      <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="tutorial-skip" type="button">${T('Passer le parcours', 'Skip the course')}</button>
    </div>

    <p class="tutorial-step-cta" id="tutorial-step-cta" hidden>
      <a class="tutorial-step-cta__link" id="tutorial-step-download" href="${T('/download', '/en/download')}" data-cid="${CID_STEP}">${T('Installer gratuitement', 'Install for free')}</a>
      <span class="tutorial-step-cta__note">${T('Windows, macOS et Linux', 'Windows, macOS and Linux')}</span>
    </p>
  `;

  refs.modeLessons.insertBefore(panel, refs.modeLessons.firstChild);
  refs.modeLessons.insertBefore(entry, panel.nextSibling);

  refs.tutorialEntry = entry;
  refs.tutorialStart = entry.querySelector('#tutorial-start');
  refs.tutorialPanel = panel;
  refs.tutorialIntro = panel.querySelector('#tutorial-intro');
  refs.tutorialIntroQuestion = panel.querySelector('#tutorial-intro-question');
  refs.tutorialIntroMethods = panel.querySelector('#tutorial-intro-methods');
  refs.tutorialIntroReply = panel.querySelector('#tutorial-intro-reply');
  refs.tutorialIntroProfile = panel.querySelector('#tutorial-intro-profile');
  refs.tutorialIntroProfileQuestion = panel.querySelector('#tutorial-intro-profile-question');
  refs.tutorialIntroProfiles = panel.querySelector('#tutorial-intro-profiles');
  refs.tutorialIntroStart = panel.querySelector('#tutorial-intro-start');
  refs.tutorialIntroSkip = panel.querySelector('#tutorial-intro-skip');
  refs.tutorialNudge = panel.querySelector('#tutorial-nudge');
  refs.tutorialHint = panel.querySelector('#tutorial-hint');
  refs.tutorialExercise = panel.querySelector('#tutorial-exercise');
  refs.tutorialFinal = panel.querySelector('#tutorial-final');
  refs.tutorialFinalTitle = panel.querySelector('#tutorial-final-title');
  refs.tutorialFinalChanges = panel.querySelector('#tutorial-final-changes');
  refs.tutorialFinalRestart = panel.querySelector('#tutorial-final-restart');
  refs.tutorialFinalLibre = panel.querySelector('#tutorial-final-libre');
  refs.tutorialFinalBonus = panel.querySelector('#tutorial-final-bonus');
  refs.tutorialFinalBonusButtons = panel.querySelector('#tutorial-final-bonus-buttons');
  refs.tutorialFinalShare = panel.querySelector('#tutorial-final-share');
  refs.tutorialShareFeedback = panel.querySelector('#tutorial-share-feedback');
  refs.tutorialTitle = panel.querySelector('#tutorial-title');
  refs.tutorialProgress = panel.querySelector('#tutorial-progress');
  refs.tutorialInstruction = panel.querySelector('#tutorial-instruction');
  refs.tutorialMethod = panel.querySelector('#tutorial-method');
  refs.tutorialTarget = panel.querySelector('#tutorial-target');
  refs.tutorialInput = panel.querySelector('#tutorial-input');
  refs.tutorialFeedback = panel.querySelector('#tutorial-feedback');
  refs.tutorialPrev = panel.querySelector('#tutorial-prev');
  refs.tutorialSkipStep = panel.querySelector('#tutorial-skip-step');
  refs.tutorialSkip = panel.querySelector('#tutorial-skip');
  refs.tutorialActions = panel.querySelector('#tutorial-actions');
  refs.tutorialDownload = panel.querySelector('#tutorial-download');
  refs.tutorialStepCta = panel.querySelector('#tutorial-step-cta');
  refs.tutorialStepDownload = panel.querySelector('#tutorial-step-download');
}

function buildSequence(data, introId) {
  const sequence = [];
  if (introId && data.preludes?.[introId]) {
    sequence.push({
      ...data.preludes[introId],
      type: 'prelude',
      preludeId: introId
    });
  }
  data.core.forEach((step, coreIndex) => {
    sequence.push({
      ...step,
      type: 'core',
      coreIndex
    });
  });
  return sequence;
}

function stepCount() {
  return tutorialState.data?.stepCount || 3;
}

function getSavedProgress() {
  const progress = readJsonStorage(PROGRESS_KEY);
  if (!progress || !Array.isArray(progress.completedIds)) return null;
  return progress;
}

function findResumeIndex(sequence, progress) {
  const completed = new Set(progress?.completedIds || []);
  const firstOpen = sequence.findIndex((step) => !completed.has(step.id));
  if (firstOpen >= 0) return firstOpen;
  // Toutes les étapes sont déjà faites : -1 signale à startTutorial qu'il faut
  // reprendre sur la synthèse, pas réafficher l'étape 1 (§9.3).
  return sequence.length && completed.size ? -1 : 0;
}

function showTutorialUi(refs) {
  if (refs.tutorialPanel) refs.tutorialPanel.hidden = false;
  if (refs.tutorialEntry) refs.tutorialEntry.hidden = true;
  if (refs.lessonNav) refs.lessonNav.hidden = true;
  if (refs.lessonExercise) {
    refs.lessonExercise.hidden = true;
    refs.lessonExercise.style.display = 'none';
  }
  if (refs.lessonWelcome) {
    refs.lessonWelcome.hidden = true;
    refs.lessonWelcome.style.display = 'none';
  }
}

function showLessonsUi(refs, { showTutorialEntry = true, restoreActiveLesson = false } = {}) {
  if (refs.tutorialPanel) refs.tutorialPanel.hidden = true;
  if (refs.tutorialEntry) refs.tutorialEntry.hidden = !showTutorialEntry;
  if (refs.lessonNav) refs.lessonNav.hidden = false;

  const hasActiveLesson = refs.lessonExercise && (
    refs.lessonExercise.style.display !== 'none' ||
    (restoreActiveLesson && refs.lessonTitle?.textContent)
  );
  if (refs.lessonExercise && hasActiveLesson) {
    refs.lessonExercise.hidden = false;
    refs.lessonExercise.style.display = 'block';
  } else if (refs.lessonWelcome) {
    refs.lessonWelcome.hidden = false;
    refs.lessonWelcome.style.display = 'block';
  }
}

function currentStep() {
  if (tutorialState.mode === 'bonus') return tutorialState.bonusStep;
  return tutorialState.sequence[tutorialState.currentIndex] || null;
}

function stepTitle(step) {
  return localized(step, 'title');
}
function stepExplanation(step) {
  return localized(step, 'explanation') || localized(step, 'instruction');
}

function targetChars(step = currentStep()) {
  return Array.from(step?.target || '');
}

function renderTarget(refs) {
  const chars = tutorialState.targetChars;
  refs.tutorialTarget.innerHTML = chars.map((char, index) => {
    const classes = ['tutorial-target-char'];
    if (index < tutorialState.typed.length) {
      classes.push(tutorialState.typedOk[index] ? 'tutorial-target-char--correct' : 'tutorial-target-char--wrong');
    }
    if (index === tutorialState.typed.length) classes.push('tutorial-target-char--current');
    return `<span class="${classes.join(' ')}">${char === ' ' ? '&nbsp;' : escapeHtml(char)}</span>`;
  }).join('');
}

// La zone de saisie reflète `typed` caractère par caractère : un caractère
// faux reste écrit, en rouge (§6). textContent reste égal à `typed`.
function renderTypedInput(refs) {
  const input = refs?.tutorialInput;
  if (!input) return;
  const chars = Array.from(tutorialState.typed);
  input.innerHTML = chars.map((char, index) => (
    tutorialState.typedOk[index]
      ? escapeHtml(char)
      : `<span class="tutorial-typed-char--wrong">${escapeHtml(char)}</span>`
  )).join('');
  input.classList.toggle('lesson-input--valid',
    chars.length === tutorialState.targetChars.length && tutorialState.typedOk.every(Boolean));
}

function methodMatches(method, expected) {
  if (!method || !expected) return false;
  return Object.entries(expected).every(([key, value]) => method[key] === value);
}

function createForcedDeadKeyMethod(deadkey, key, layer) {
  return { type: 'deadkey', deadkey, key, layer };
}

function getForcedStoreMethod(char) {
  return {
    'ã': createForcedDeadKeyMethod('dk_tilde', 'KeyQ', 'Base'),
    'Ã': createForcedDeadKeyMethod('dk_tilde', 'KeyQ', 'Shift'),
    'ø': createForcedDeadKeyMethod('dk_stroke', 'KeyO', 'Base'),
    'Ø': createForcedDeadKeyMethod('dk_stroke', 'KeyO', 'Shift'),
    'ł': createForcedDeadKeyMethod('dk_stroke', 'KeyL', 'Base'),
    'Ł': createForcedDeadKeyMethod('dk_stroke', 'KeyL', 'Shift')
  }[char] || null;
}

function getPreferredMethod(char, step, nextChar = null) {
  const index = getCharacterIndex();
  if (!index || !char) return null;

  if (step?.forceStoreMethods) {
    const forced = getForcedStoreMethod(char);
    if (forced) return forced;
  }

  const methods = index.characters?.[char]?.methods || [];
  return getPreferredCharacterMethod(char, methods, {
    nextChar,
    forceCaps: !!step?.keepCapsHighlight
  });
}

function formatKeyName(key) {
  return KEY_LABELS[key] || key || '';
}

function formatMethod(method) {
  if (!method) return '';
  const keyLabel = formatKeyName(method.key);
  const layerLabel = getLayerDisplayName(method.layer);
  if (method.type === 'deadkey') {
    const deadKeyName = DEAD_KEY_NAMES[method.deadkey || method.deadKey] || T('Touche morte', 'Dead key');
    return `${deadKeyName}, ${T('puis', 'then')} ${layerLabel ? `${layerLabel} + ` : ''}${keyLabel}`;
  }
  return layerLabel ? `${layerLabel} + ${keyLabel}` : keyLabel;
}

function isLowercaseLetter(char) {
  if (!char) return false;
  return char.toLocaleLowerCase('fr') === char && char.toLocaleUpperCase('fr') !== char;
}

function shouldPromptCapsOff(step, expected, keyboard) {
  return !!keyboard?.state?.caps && !step?.keepCapsHighlight && isLowercaseLetter(expected);
}

function getMovedSymbolHint(char) {
  const hint = {
    '@': T('en haut à gauche', 'at the top left'),
    '#': T('en haut à gauche, avec Maj', 'at the top left, with Shift'),
    '.': T('accès direct, sans Maj', 'direct access, no Shift'),
    ';': T('Maj + point', 'Shift + period'),
    'ù': T('déplacé sur la touche U', 'moved to the U key'),
    '%': T('à côté des chiffres', 'next to the digits'),
    '{': T('sous le majeur gauche', 'under the left middle finger'),
    '}': T('sous l’index gauche', 'under the left index finger'),
    '[': T('sous l’index droit', 'under the right index finger'),
    ']': T('sous le majeur droit', 'under the right middle finger'),
    '\\': T('à droite de l’index gauche', 'to the right of the left index finger'),
    '|': T('à gauche de l’index droit', 'to the left of the right index finger'),
    '~': T('rangée du bas, main droite', 'bottom row, right hand')
  }[char];
  return hint || '';
}

function renderMethodText(refs, methodText, hintText = '') {
  if (!refs?.tutorialMethod) return;
  if (!methodText) {
    refs.tutorialMethod.textContent = '';
    return;
  }

  refs.tutorialMethod.innerHTML = [
    `<span class="tutorial-method-label">${T('À taper : ', 'To type: ')}</span>`,
    `<span class="tutorial-method-combo">${escapeHtml(methodText)}</span>`,
    hintText ? `<span class="tutorial-method-hint"> — ${escapeHtml(hintText)}</span>` : ''
  ].join('');
}

function setTutorialKeyboardMode(enabled) {
  const keyboard = tutorialState.getKeyboard?.();
  const container = keyboard?.container;
  if (!container) return;
  container.classList.toggle('tutorial-minimal', enabled);
  if (!enabled) {
    clearTutorialHighlights();
    clearTutorialLegendFilter();
  }
}

function clearTutorialLegendFilter() {
  document.querySelectorAll('#modal-keyboard-container .key-char.tutorial-legend-hidden').forEach((charEl) => {
    charEl.classList.remove('tutorial-legend-hidden');
  });
}

function applyStoreLegendFilter(step, keyboard) {
  clearTutorialLegendFilter();
  if (!keyboard?.layout || keyboard.state?.activeDeadKey) return;

  const languageExercise = !!step?.forceStoreMethods;

  keyboard.keyElements?.forEach((keyEl, keyId) => {
    const chars = keyboard.layout[keyId];
    if (!chars) return;

    KEY_CHAR_POSITIONS.forEach(({ selector, layerIndex }) => {
      const value = chars[layerIndex];
      const slotKey = `${keyId}:${layerIndex}`;
      const shouldHideDeadKey = STORE_HIDDEN_DEAD_KEYS.has(value) &&
        !(languageExercise && STORE_LANGUAGE_VISIBLE_DEAD_KEYS.has(value));
      const shouldHideSlot = STORE_HIDDEN_SLOTS.has(slotKey) &&
        !(languageExercise && STORE_LANGUAGE_VISIBLE_SLOTS.has(slotKey));

      if (shouldHideDeadKey || shouldHideSlot) {
        keyEl.querySelector(selector)?.classList.add('tutorial-legend-hidden');
      }
    });
  });
}

export function suspendTutorialGuidance() {
  tutorialState.guidanceSuspended = true;
  clearHintTimers();
  setTutorialKeyboardMode(false);
}

export function resumeTutorialGuidance() {
  tutorialState.guidanceSuspended = false;
  updateTutorialGuidance();
  scheduleInactivityHint();
}

export function clearTutorialVisuals() {
  setTutorialKeyboardMode(false);
}

export function isTutorialIntroVisible() {
  return tutorialState.active && tutorialState.introVisible;
}

// L'étape 1 reste guidée en permanence (le geste Verr. Maj. est inhabituel) ;
// ensuite l'indice n'apparaît que sur blocage ou à la demande.
function stepUsesPermanentGuidance() {
  const step = currentStep();
  return tutorialState.mode === 'core' && (step?.step === 1 || tutorialState.currentIndex === 0);
}

function renderReminderText(refs) {
  if (!refs?.tutorialMethod) return;
  refs.tutorialMethod.innerHTML =
    `<span class="tutorial-method-reminder">${escapeHtml(T(
      '⌨️ Tapez sur votre clavier, comme d’habitude — un indice s’affiche si vous bloquez.',
      '⌨️ Type on your keyboard as usual — a hint appears if you get stuck.'
    ))}</span>`;
}

function clearInactivityHintTimer() {
  if (!tutorialState.inactivityTimerId) return;
  clearTimeout(tutorialState.inactivityTimerId);
  tutorialState.inactivityTimerId = null;
}

function clearHintHideTimer() {
  if (!tutorialState.hintHideTimerId) return;
  clearTimeout(tutorialState.hintHideTimerId);
  tutorialState.hintHideTimerId = null;
}

function clearHintTimers() {
  clearInactivityHintTimer();
  clearHintHideTimer();
}

function expectedCharAt(offset = 0) {
  return tutorialState.targetChars[tutorialState.typed.length + offset];
}

// Le caractère attendu mérite-t-il un indice permanent ?
function currentCharNeedsPersistentHint() {
  const expected = expectedCharAt();
  if (!expected) return false;
  const method = getPreferredMethod(expected, currentStep(), expectedCharAt(1) || null);
  return isAzertyGlobalSpecificChar(expected, method);
}

function scheduleHintAutoHide() {
  clearHintHideTimer();
  if (!tutorialState.hintShownForStep) return;
  if (stepUsesPermanentGuidance() || tutorialState.introVisible) return;
  if (currentCharNeedsPersistentHint()) return;
  tutorialState.hintHideTimerId = window.setTimeout(() => {
    tutorialState.hintHideTimerId = null;
    hideStepHint();
  }, HINT_AUTO_HIDE_MS);
}

function hideStepHint() {
  if (!tutorialState.hintShownForStep) return;
  tutorialState.hintShownForStep = false;
  updateTutorialGuidance();
  // Pas de minuteur d'inactivité ici : il ferait clignoter l'indice en boucle
  // sur le même caractère. L'indice revient sur une erreur, sur le bouton, ou
  // au caractère suivant (refreshHintTimers).
}

function scheduleInactivityHint() {
  clearInactivityHintTimer();
  if (!tutorialState.active || tutorialState.finalVisible || tutorialState.guidanceSuspended) return;
  if (tutorialState.introVisible || stepUsesPermanentGuidance() || tutorialState.hintShownForStep) return;
  // Caractère déjà guidé d'office : rien à déclencher.
  if (currentCharNeedsPersistentHint()) return;
  tutorialState.inactivityTimerId = window.setTimeout(() => {
    tutorialState.inactivityTimerId = null;
    showStepHint('inactivity');
  }, HINT_INACTIVITY_DELAY_MS);
}

// Choisit le bon compte à rebours selon qu'un indice est visible ou non.
function refreshHintTimers() {
  if (tutorialState.hintShownForStep) scheduleHintAutoHide();
  else scheduleInactivityHint();
}

function showStepHint(trigger) {
  if (!tutorialState.active || tutorialState.finalVisible || tutorialState.introVisible) return;
  if (tutorialState.hintShownForStep) {
    // Toujours bloqué alors que l'indice est déjà là : on repousse l'effacement.
    scheduleHintAutoHide();
    return;
  }
  tutorialState.hintShownForStep = true;
  clearInactivityHintTimer();
  updateTutorialGuidance();
  scheduleHintAutoHide();
  if (!tutorialState.hintTracked) {
    tutorialState.hintTracked = true;
    track('tutorial_hint_shown', {
      trigger,
      step_id: currentStep()?.id || '',
      step_index: tutorialState.currentIndex + 1
    });
  }
  announceToScreenReaders(T('Indice affiché sur le clavier', 'Hint shown on the keyboard'));
}

function showVirtualClickNudge() {
  if (tutorialState.nudgeShown) return;
  tutorialState.nudgeShown = true;
  const nudge = tutorialState.refs?.tutorialNudge;
  if (nudge) {
    nudge.textContent = T(
      '💡 Essayez sur votre vrai clavier : vos touches habituelles produisent déjà AZERTY Global ici.',
      '💡 Try your real keyboard: your usual keys already produce AZERTY Global here.'
    );
    nudge.hidden = false;
  }
  track('tutorial_virtual_click', {
    step_id: currentStep()?.id || '',
    step_index: tutorialState.currentIndex + 1
  });
}

export function updateTutorialGuidance() {
  if (!tutorialState.active || tutorialState.finalVisible || tutorialState.guidanceSuspended) return;
  const step = currentStep();
  const keyboard = tutorialState.getKeyboard?.();

  if (tutorialState.introVisible) {
    setTutorialKeyboardMode(false);
    return;
  }

  const currentIndex = tutorialState.typed.length;
  const expected = tutorialState.targetChars[currentIndex];
  const nextChar = tutorialState.targetChars[currentIndex + 1] || null;
  const promptCapsOff = shouldPromptCapsOff(step, expected, keyboard);

  // Clavier simplifié pendant tout l'exercice : légendes absentes de
  // l'application Store masquées, reste estompé. État stable, sinon le clavier
  // clignoterait d'un caractère à l'autre.
  setTutorialKeyboardMode(true);
  applyStoreLegendFilter(step, keyboard);

  // Guidage affiché d'office sur la première étape, sur tout caractère
  // qu'AZERTY Global ajoute ou déplace (É È Ç À, œ, @, #, AltGr, touches
  // mortes…) et quand Verr. Maj. bloque la frappe. Sur les caractères
  // inchangés, il attend un blocage ou le bouton Indice.
  const guidanceActive = stepUsesPermanentGuidance() ||
    currentCharNeedsPersistentHint() ||
    tutorialState.hintShownForStep ||
    promptCapsOff;

  if (!guidanceActive) {
    clearTutorialHighlights();
    renderReminderText(tutorialState.refs);
    return;
  }

  const method = promptCapsOff
    ? { type: 'direct', key: 'CapsLock', layer: 'Base' }
    : getPreferredMethod(expected, step, nextChar);

  highlightTutorialMethod(method, keyboard, {
    keepCaps: !promptCapsOff && !!step?.keepCapsHighlight,
    activeDeadKey: keyboard?.state?.activeDeadKey || null
  });

  if (tutorialState.refs?.tutorialMethod) {
    const methodText = promptCapsOff ? T('Désactivez Verr. Maj.', 'Turn off Caps Lock') : formatMethod(method);
    renderMethodText(tutorialState.refs, methodText, promptCapsOff ? '' : getMovedSymbolHint(expected));
  }
}

function resetFeedback(refs) {
  refs.tutorialInput?.classList.remove('tutorial-input--error', 'lesson-input--valid');
  if (refs.tutorialFeedback) refs.tutorialFeedback.textContent = '';
}

function clearAdvanceTimeout() {
  if (!tutorialState.advanceTimeoutId) return;
  clearTimeout(tutorialState.advanceTimeoutId);
  tutorialState.advanceTimeoutId = null;
}

function resetKeyboardStateForStep() {
  const keyboard = tutorialState.getKeyboard?.();
  if (!keyboard) return;
  keyboard.setShift?.(false);
  keyboard.setAltGr?.(false);
  keyboard.clearDeadKey?.();
  keyboard.keyElements?.forEach((keyEl) => {
    keyEl.classList.remove('pressed', 'highlighted');
  });
  keyboard.updateAllKeys?.();
}

function showWrongKeyFeedback(char, expected) {
  const refs = tutorialState.refs;
  refs?.tutorialInput?.classList.add('tutorial-input--error');
  if (refs?.tutorialFeedback) {
    const expectedLabel = expected === ' ' ? T('espace', 'space') : expected;
    refs.tutorialFeedback.textContent = T(
      `Caractère attendu : ${expectedLabel} — Retour arrière corrige.`,
      `Expected character: ${expectedLabel} — Backspace corrects it.`
    );
  }
  recordKeystroke(char, expected);
  window.setTimeout(() => {
    refs?.tutorialInput?.classList.remove('tutorial-input--error');
  }, 250);
}

function updateSkipStepButton() {
  const refs = tutorialState.refs;
  if (!refs?.tutorialSkipStep) return;
  if (tutorialState.mode === 'bonus') {
    refs.tutorialSkipStep.textContent = T('Retour à la synthèse', 'Back to the summary');
    refs.tutorialSkipStep.hidden = false;
    return;
  }
  refs.tutorialSkipStep.textContent = T('Passer cet exercice', 'Skip this exercise');
  refs.tutorialSkipStep.hidden = tutorialState.consecutiveErrors < SKIP_STEP_MIN_CONSECUTIVE_ERRORS;
}

// CTA discret en pied du testeur dès la première réussite (§5.1) ; nu pendant
// l'intro, absent sur la synthèse où le grand CTA prend le relais.
function updateStepCta() {
  const refs = tutorialState.refs;
  if (!refs?.tutorialStepCta) return;
  const visible = tutorialState.active && tutorialState.firstSuccess &&
    !tutorialState.introVisible && !tutorialState.finalVisible;
  refs.tutorialStepCta.hidden = !visible;
  if (visible && refs.tutorialStepDownload) {
    refs.tutorialStepDownload.href = getSmartDownloadUrl(CID_STEP);
  }
}

function syncTutorialInputAfterCorrection(refs) {
  if (!refs?.tutorialInput) return;
  renderTypedInput(refs);
  refs.tutorialInput.classList.remove('tutorial-input--error');
  placeCaretAtEnd(refs.tutorialInput);
  renderTarget(refs);
  updateTutorialGuidance();
}

function handleTutorialCorrection() {
  if (!tutorialState.active || tutorialState.finalVisible || tutorialState.introVisible) return false;

  const refs = tutorialState.refs;
  const keyboard = tutorialState.getKeyboard?.();
  clearAdvanceTimeout();

  if (keyboard?.state?.activeDeadKey) {
    keyboard.clearDeadKey();
    if (refs?.tutorialFeedback) refs.tutorialFeedback.textContent = T('Touche morte annulée.', 'Dead key canceled.');
    refs?.tutorialInput?.focus();
    placeCaretAtEnd(refs?.tutorialInput);
    updateTutorialGuidance();
    return true;
  }

  const typedChars = Array.from(tutorialState.typed);
  if (!typedChars.length) {
    if (refs?.tutorialFeedback) refs.tutorialFeedback.textContent = T('Rien à effacer.', 'Nothing to delete.');
    updateTutorialGuidance();
    return true;
  }

  tutorialState.typed = typedChars.slice(0, -1).join('');
  tutorialState.typedOk = tutorialState.typedOk.slice(0, -1);
  if (refs?.tutorialFeedback) refs.tutorialFeedback.textContent = T('Dernier caractère supprimé.', 'Last character deleted.');
  syncTutorialInputAfterCorrection(refs);
  refreshHintTimers();
  return true;
}

function saveStepDone(step) {
  if (tutorialState.mode === 'bonus') {
    if (!tutorialState.bonusDoneIds.includes(step.id)) tutorialState.bonusDoneIds.push(step.id);
    return;
  }
  if (!tutorialState.completedIds.includes(step.id)) {
    tutorialState.completedIds.push(step.id);
  }
  saveProgress();
}

// ── Synthèse (§5.2) ──

function provenChangeIds() {
  const proven = new Set();
  const collect = (step) => (step?.proves || []).forEach((id) => proven.add(id));
  tutorialState.sequence.forEach((step) => {
    if (tutorialState.completedIds.includes(step.id)) collect(step);
  });
  (tutorialState.data?.bonus || []).forEach((step) => {
    if (tutorialState.bonusDoneIds.includes(step.id)) collect(step);
  });
  return proven;
}

function bonusStepsForProfile() {
  const all = tutorialState.data?.bonus || [];
  const remaining = all.filter((step) => !tutorialState.bonusDoneIds.includes(step.id));
  if (!tutorialState.profile.length) return remaining;
  const matching = remaining.filter((step) => (step.profiles || []).some((id) => tutorialState.profile.includes(id)));
  return matching;
}

function renderSynthesis(kind = tutorialState.finalKind) {
  const refs = tutorialState.refs;
  if (!refs) return;
  const data = tutorialState.data;
  tutorialState.finalKind = kind;
  tutorialState.finalVisible = true;
  tutorialState.active = true;
  tutorialState.mode = 'core';
  tutorialState.bonusStep = null;
  clearHintTimers();
  clearAdvanceTimeout();
  setTutorialKeyboardMode(false);
  resetKeyboardStateForStep();

  const changes = data?.changes || [];
  const proven = kind === 'done' ? provenChangeIds() : new Set();
  const provenCount = changes.filter((change) => !change.extra && proven.has(change.id)).length;

  if (refs.tutorialFinalTitle) {
    refs.tutorialFinalTitle.textContent = kind === 'done'
      ? T(
        `Vous venez d’utiliser ${provenCount} des 5 changements, et les caractères en plus.`,
        `You just used ${provenCount} of the 5 changes, plus the extra characters.`
      )
      : T('Voici ce que change AZERTY Global.', 'Here is what AZERTY Global changes.');
  }

  if (refs.tutorialFinalChanges) {
    refs.tutorialFinalChanges.innerHTML = changes.map((change) => {
      const state = change.extra ? 'extra' : (proven.has(change.id) ? 'done' : 'todo');
      const mark = { extra: '➕', done: '✅', todo: '⬜' }[state];
      return `<li class="tutorial-changes__item tutorial-changes__item--${state}" data-change="${escapeHtml(change.id)}">` +
        `<span class="tutorial-changes__mark" aria-hidden="true">${mark}</span>` +
        `<span class="tutorial-changes__label">${escapeHtml(localized(change, 'label'))}</span>` +
        `<span class="tutorial-changes__detail"> · ${escapeHtml(localized(change, 'detail'))}</span>` +
        '</li>';
    }).join('');
  }

  if (refs.tutorialDownload) {
    refs.tutorialDownload.href = getSmartDownloadUrl(CID_FINAL);
  }
  if (refs.tutorialFinalRestart) refs.tutorialFinalRestart.hidden = kind !== 'skipped';
  if (refs.tutorialFinalLibre) refs.tutorialFinalLibre.hidden = kind !== 'skipped';
  // « J'ai essayé » n'est vrai que si le parcours a été fait : sur une synthèse
  // vide (parcours passé), le bouton de partage ne s'affiche pas (§5.3).
  if (refs.tutorialFinalShare) refs.tutorialFinalShare.hidden = kind !== 'done';
  if (refs.tutorialShareFeedback) {
    refs.tutorialShareFeedback.hidden = true;
    refs.tutorialShareFeedback.textContent = '';
  }

  const bonuses = kind === 'done' ? bonusStepsForProfile() : [];
  if (refs.tutorialFinalBonus && refs.tutorialFinalBonusButtons) {
    refs.tutorialFinalBonus.hidden = bonuses.length === 0;
    refs.tutorialFinalBonusButtons.innerHTML = bonuses.map((step) => (
      `<button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16 tutorial-bonus-button" type="button" data-bonus="${escapeHtml(step.id)}">${escapeHtml(localized(step, 'cta') || stepTitle(step))}</button>`
    )).join('');
  }

  if (refs.tutorialExercise) {
    refs.tutorialExercise.hidden = true;
    refs.tutorialExercise.style.display = 'none';
  }
  if (refs.tutorialIntro) {
    refs.tutorialIntro.hidden = true;
    refs.tutorialIntro.style.display = 'none';
  }
  if (refs.tutorialActions) {
    refs.tutorialActions.hidden = true;
    refs.tutorialActions.style.display = 'none';
  }
  if (refs.tutorialFinal) {
    refs.tutorialFinal.hidden = false;
    refs.tutorialFinal.style.display = '';
  }
  updateStepCta();
  if (tutorialState.userEngaged) refs.tutorialDownload?.focus();
  announceToScreenReaders(kind === 'done' ? T('Parcours terminé', 'Course completed') : T('Synthèse', 'Summary'));
}

// Partage §5.3 : `navigator.share()` d'abord, repli sur la copie du lien.
// ⛔ Le texte tapé ne sort pas d'ici : la phrase est fixe (§10.2).
function shareTesterFeedback(message) {
  const feedback = tutorialState.refs?.tutorialShareFeedback;
  if (!feedback) return;
  feedback.textContent = message;
  feedback.hidden = false;
}

async function shareTester() {
  const text = isEnglish() ? SHARE_TEXT_EN : SHARE_TEXT_FR;

  if (navigator.share) {
    try {
      await navigator.share({ text });
      trackEvent('tester_share', { method: 'native' });
      return;
    } catch (error) {
      // Annulation de la feuille de partage : rien à dire, rien à compter.
      if (error?.name === 'AbortError') return;
      // Tout autre échec (permission, contexte non sécurisé) retombe sur la copie.
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    trackEvent('tester_share', { method: 'copy' });
    shareTesterFeedback(T('Message copié, il n’y a plus qu’à le coller.', 'Message copied — just paste it.'));
  } catch {
    shareTesterFeedback(T(`À copier : ${SHARE_URL}`, `To copy: ${SHARE_URL}`));
  }
}

function completeTutorial() {
  setDoneFlag();
  clearSkippedFlag();
  track('tutorial_completed', { steps: tutorialState.sequence.length });
  renderSynthesis('done');
}

function advanceAfterSuccess({ skipped = false } = {}) {
  const step = currentStep();
  if (!step) return;
  clearAdvanceTimeout();
  saveStepDone(step);
  const errors = tutorialState.stepErrors;
  track('tutorial_step_completed', {
    step_id: step.id,
    step_index: tutorialState.currentIndex + 1,
    skipped: skipped ? '1' : '0',
    physical_keys: String(tutorialState.physicalKeys),
    virtual_clicks: String(tutorialState.virtualClicks),
    hint_shown: tutorialState.hintShownForStep ? '1' : '0'
  });
  trackEvent('tester_step_done', {
    step: step.id,
    errors,
    skipped: skipped ? 1 : 0
  });

  if (tutorialState.mode === 'bonus') {
    window.setTimeout(() => renderSynthesis('done'), 250);
    return;
  }

  if (tutorialState.currentIndex >= tutorialState.sequence.length - 1) {
    completeTutorial();
    return;
  }

  tutorialState.currentIndex++;
  saveProgress();
  window.setTimeout(() => renderCurrentStep(), 250);
}

// ── Intro à deux questions (§3) ──

function renderIntroMethods() {
  const refs = tutorialState.refs;
  const intro = tutorialState.data?.intro;
  if (!refs?.tutorialIntroMethods || !intro) return;
  refs.tutorialIntroQuestion.textContent = localized(intro, 'question');
  refs.tutorialIntroMethods.innerHTML = (intro.methods || []).map((choice) => (
    `<button class="tutorial-choice" type="button" data-method="${escapeHtml(choice.method)}">${escapeHtml(localized(choice, 'label'))}</button>`
  )).join('');
}

function renderIntroProfiles() {
  const refs = tutorialState.refs;
  const intro = tutorialState.data?.intro;
  if (!refs?.tutorialIntroProfiles || !intro) return;
  refs.tutorialIntroProfileQuestion.innerHTML =
    `${escapeHtml(localized(intro, 'profileQuestion'))} <small class="tutorial-intro__hint">(${escapeHtml(localized(intro, 'profileHint'))})</small>`;
  refs.tutorialIntroProfiles.innerHTML = (intro.profiles || []).map((profile) => (
    `<label class="tutorial-choice tutorial-choice--check">` +
    `<input type="checkbox" value="${escapeHtml(profile.id)}"${tutorialState.profile.includes(profile.id) ? ' checked' : ''}>` +
    `<span>${escapeHtml(localized(profile, 'label'))}</span></label>`
  )).join('');
}

function answerIntroMethod(methodId) {
  const intro = tutorialState.data?.intro;
  const choice = (intro?.methods || []).find((item) => item.method === methodId);
  if (!choice) return;
  const refs = tutorialState.refs;
  tutorialState.userEngaged = true;
  tutorialState.startAt = Number(choice.startAt) || 1;
  tutorialState.introStage = 'profile';
  trackEvent('tester_intro_answer', { method: methodId });
  track('tutorial_intro_answered', { method: methodId });

  if (refs.tutorialIntroMethods) refs.tutorialIntroMethods.hidden = true;
  if (refs.tutorialIntroReply) {
    refs.tutorialIntroReply.textContent = localized(choice, 'reply');
    refs.tutorialIntroReply.hidden = false;
  }
  renderIntroProfiles();
  if (refs.tutorialIntroProfile) refs.tutorialIntroProfile.hidden = false;
  refs.tutorialIntroStart?.focus();
}

function readCheckedProfiles() {
  const refs = tutorialState.refs;
  return Array.from(refs?.tutorialIntroProfiles?.querySelectorAll('input:checked') || [])
    .map((input) => input.value);
}

function applyStartAt() {
  if (tutorialState.startAt <= 1) return;
  // « Verr. Maj. + é » : l'étape 1 est cochée d'office sur la synthèse (§3.1).
  tutorialState.sequence.forEach((step) => {
    if (step.type === 'core' && step.step < tutorialState.startAt && !tutorialState.completedIds.includes(step.id)) {
      tutorialState.completedIds.push(step.id);
    }
  });
  const firstOpen = tutorialState.sequence.findIndex((step) => !tutorialState.completedIds.includes(step.id));
  tutorialState.currentIndex = firstOpen >= 0 ? firstOpen : tutorialState.sequence.length - 1;
}

function beginCourse({ fromSkip = false } = {}) {
  tutorialState.userEngaged = true;
  tutorialState.profile = fromSkip ? [] : readCheckedProfiles();
  if (!fromSkip) {
    writeStoredProfile(tutorialState.profile);
    trackEvent('tester_profile', { profiles: tutorialState.profile.join(',') });
  } else {
    tutorialState.startAt = 1;
    track('tutorial_intro_skipped');
  }
  tutorialState.introVisible = false;
  applyStartAt();
  saveProgress();
  track('tutorial_intro_started', { start_at: String(tutorialState.startAt) });
  renderCurrentStep();
}

function renderTutorialIntro() {
  const refs = tutorialState.refs;
  if (!refs) return;

  showTutorialUi(refs);
  clearAdvanceTimeout();
  clearHintTimers();
  resetKeyboardStateForStep();

  renderIntroMethods();
  const onProfile = tutorialState.introStage === 'profile';
  if (refs.tutorialIntroMethods) refs.tutorialIntroMethods.hidden = onProfile;
  if (refs.tutorialIntroReply) refs.tutorialIntroReply.hidden = !onProfile;
  if (refs.tutorialIntroProfile) refs.tutorialIntroProfile.hidden = !onProfile;
  if (onProfile) renderIntroProfiles();

  if (refs.tutorialIntro) {
    refs.tutorialIntro.hidden = false;
    refs.tutorialIntro.style.display = '';
  }
  if (refs.tutorialExercise) {
    refs.tutorialExercise.hidden = true;
    refs.tutorialExercise.style.display = 'none';
  }
  if (refs.tutorialFinal) {
    refs.tutorialFinal.hidden = true;
    refs.tutorialFinal.style.display = 'none';
  }
  // Pendant l'intro, seul « Passer l'intro » est proposé (§3) ; la rangée
  // d'actions de l'exercice n'a pas de sens ici.
  if (refs.tutorialActions) {
    refs.tutorialActions.hidden = true;
    refs.tutorialActions.style.display = 'none';
  }
  updateStepCta();
  updateTutorialGuidance();
  if (tutorialState.userEngaged) {
    (onProfile ? refs.tutorialIntroStart : refs.tutorialIntroMethods?.querySelector('button'))?.focus();
  }
  announceToScreenReaders(T('Introduction du parcours', 'Course introduction'));
}

function renderCurrentStep() {
  const refs = tutorialState.refs;
  const step = currentStep();
  if (!refs || !step) return;

  if (tutorialState.introVisible) {
    renderTutorialIntro();
    return;
  }

  showTutorialUi(refs);
  tutorialState.finalVisible = false;
  tutorialState.typed = '';
  tutorialState.typedOk = [];
  tutorialState.targetChars = targetChars(step);
  tutorialState.stepErrors = 0;
  tutorialState.hintShownForStep = false;
  tutorialState.hintTracked = false;
  tutorialState.consecutiveErrors = 0;
  tutorialState.physicalKeys = 0;
  tutorialState.virtualClicks = 0;
  clearAdvanceTimeout();
  clearHintTimers();
  resetKeyboardStateForStep();

  if (refs.tutorialIntro) {
    refs.tutorialIntro.hidden = true;
    refs.tutorialIntro.style.display = 'none';
  }
  if (refs.tutorialExercise) {
    refs.tutorialExercise.hidden = false;
    refs.tutorialExercise.style.display = '';
  }
  if (refs.tutorialFinal) {
    refs.tutorialFinal.hidden = true;
    refs.tutorialFinal.style.display = 'none';
  }
  if (refs.tutorialActions) {
    refs.tutorialActions.hidden = false;
    refs.tutorialActions.style.display = 'flex';
  }
  if (refs.tutorialNudge) {
    refs.tutorialNudge.hidden = true;
    refs.tutorialNudge.textContent = '';
  }

  const isBonus = tutorialState.mode === 'bonus';
  const numbered = !isBonus && Number.isInteger(step.step);
  refs.tutorialTitle.textContent = isBonus
    ? `${T('Bonus', 'Bonus')} · ${stepTitle(step)}`
    : (numbered ? `${step.step} · ${stepTitle(step)}` : stepTitle(step));
  refs.tutorialInstruction.textContent = stepExplanation(step) || '';
  refs.tutorialProgress.textContent = isBonus
    ? T('Bonus', 'Bonus')
    : (numbered ? T(`Étape ${step.step} sur ${stepCount()}`, `Step ${step.step} of ${stepCount()}`) : '');
  refs.tutorialInput.textContent = '';
  refs.tutorialInput.setAttribute('contenteditable', 'true');
  refs.tutorialInput.classList.remove('lesson-input--valid', 'tutorial-input--error');
  refs.tutorialPrev.hidden = isBonus;
  refs.tutorialPrev.disabled = tutorialState.currentIndex === 0 || isBonus;
  if (refs.tutorialHint) refs.tutorialHint.hidden = stepUsesPermanentGuidance();
  if (refs.tutorialSkip) refs.tutorialSkip.hidden = isBonus;
  updateSkipStepButton();
  updateStepCta();

  resetFeedback(refs);
  renderTarget(refs);
  startStatsSession('lesson');
  updateTutorialGuidance();
  scheduleInactivityHint();
  if (tutorialState.userEngaged) refs.tutorialInput.focus();
  announceToScreenReaders(isBonus
    ? T('Exercice bonus', 'Bonus exercise')
    : T(`Étape ${step.step || tutorialState.currentIndex + 1} du parcours`, `Course step ${step.step || tutorialState.currentIndex + 1}`));
}

function handleCharacterInput(char) {
  if (!tutorialState.active || tutorialState.finalVisible) return false;
  const refs = tutorialState.refs;
  const expected = tutorialState.targetChars[tutorialState.typed.length];
  if (expected === undefined) return true;

  const ok = char === expected;
  tutorialState.typed += char;
  tutorialState.typedOk.push(ok);

  if (!ok) {
    tutorialState.consecutiveErrors++;
    tutorialState.stepErrors++;
    showWrongKeyFeedback(char, expected);
    updateSkipStepButton();
  } else {
    resetFeedback(refs);
    tutorialState.consecutiveErrors = 0;
    recordKeystroke(char, expected);
    if (!tutorialState.firstSuccess) {
      tutorialState.firstSuccess = true;
      updateStepCta();
    }
  }

  renderTypedInput(refs);
  placeCaretAtEnd(refs.tutorialInput);
  renderTarget(refs);

  if (tutorialState.typed.length >= tutorialState.targetChars.length) {
    clearAdvanceTimeout();
    clearHintTimers();
    tutorialState.advanceTimeoutId = window.setTimeout(() => advanceAfterSuccess(), 300);
  } else if (!ok) {
    // La bonne touche s'allume tout de suite (§6), puis le curseur a avancé :
    // l'indice porte sur le caractère suivant.
    updateTutorialGuidance();
    showStepHint('errors');
  } else {
    updateTutorialGuidance();
    // Le caractère attendu a changé : l'indice peut devenir permanent, ou non.
    refreshHintTimers();
  }
  return true;
}

export function handleTutorialCharacter(char) {
  if (!tutorialState.active || tutorialState.guidanceSuspended || tutorialState.finalVisible) return false;
  if (tutorialState.introVisible) return true;
  for (const part of Array.from(char || '')) {
    handleCharacterInput(part);
  }
  return true;
}

function hasAzertyGlobalInputMethod(char) {
  const charData = getCharacterIndex()?.characters?.[char];
  return Array.isArray(charData?.methods) && charData.methods.length > 0;
}

function canAcceptTutorialComposition() {
  return tutorialState.active && !tutorialState.guidanceSuspended &&
    !tutorialState.finalVisible && !tutorialState.introVisible;
}

function commitTutorialCompositionText(text) {
  if (!tutorialState.active || tutorialState.guidanceSuspended || tutorialState.finalVisible) return '';

  let handledText = '';

  for (const char of Array.from(text || '')) {
    const expected = tutorialState.targetChars[tutorialState.typed.length];
    if (!hasAzertyGlobalInputMethod(char)) {
      // Un caractère qu'AZERTY Global ne produit pas n'est pas une mauvaise
      // touche : il ne s'écrit pas, seul le retour est affiché.
      showWrongKeyFeedback(char, expected);
      handledText += char;
      continue;
    }

    handleCharacterInput(char);
    handledText += char;
  }

  return handledText;
}

function handleTutorialCompositionText(text) {
  if (!canAcceptTutorialComposition()) return '';

  if (!getCharacterIndex()) {
    const token = Symbol('tutorial-composition');
    pendingTutorialCompositionValidation = {
      token,
      text,
      typed: tutorialState.typed,
      stepId: currentStep()?.id || null
    };
    loadCharacterIndex().then((index) => {
      if (!index || pendingTutorialCompositionValidation?.token !== token) {
        return;
      }
      const pending = pendingTutorialCompositionValidation;
      pendingTutorialCompositionValidation = null;
      if (tutorialState.typed === pending.typed &&
        (currentStep()?.id || null) === pending.stepId) {
        commitTutorialCompositionText(pending.text);
      }
    });
    return '';
  }

  pendingTutorialCompositionValidation = null;
  return commitTutorialCompositionText(text);
}

function handleTutorialKeydown(event) {
  if (!tutorialState.active || tutorialState.finalVisible || tutorialState.introVisible) return;
  if (event.code === 'Escape' || event.code === 'Tab') return;

  tutorialState.userEngaged = true;
  event.stopPropagation();

  const keyboard = tutorialState.getKeyboard?.();
  const keyCode = remapMacKeyCode(event.code);

  if (deferToNativeComposition(event, keyboard, tutorialState.refs?.tutorialInput, keyCode)) {
    keyboard?.clearDeadKey?.();
    return;
  }

  syncKeyboardModifierStateFromEvent(keyboard, event, keyCode);

  if (keyCode === 'ShiftLeft' || keyCode === 'ShiftRight') {
    keyboard?.setShift(true);
    event.preventDefault();
    return;
  }
  if (keyCode === 'CapsLock') {
    applyKeyboardCapsLockKeydown(keyboard, event);
    event.preventDefault();
    return;
  }
  if (keyCode === 'AltRight') {
    keyboard?.setAltGr(true);
    event.preventDefault();
    return;
  }
  if (isControlShortcut(event, keyCode, keyboard)) return;

  if (event.code === 'Backspace' || event.code === 'Delete') {
    event.preventDefault();
    handleTutorialCorrection();
    return;
  }
  if (event.code.startsWith('Arrow') || event.code === 'Home' || event.code === 'End') {
    event.preventDefault();
    placeCaretAtEnd(tutorialState.refs?.tutorialInput);
    return;
  }
  if (event.code === 'Enter') {
    event.preventDefault();
    showWrongKeyFeedback('\n', tutorialState.targetChars[tutorialState.typed.length]);
    return;
  }

  if (keyboard) {
    tutorialState.physicalKeys++;
    suppressNativeCompositionAfterInternalKey(tutorialState.refs?.tutorialInput, event, keyboard, keyCode);
    keyboard.handleKeyClick(keyCode, true);
    event.preventDefault();
  }
}

function handleTutorialKeyup(event) {
  const keyboard = tutorialState.getKeyboard?.();
  if (!keyboard) return;
  const keyCode = remapMacKeyCode(event.code);
  keyboard.releaseKey(keyCode);
  clearNativeCompositionAfterInternalKeyup(tutorialState.refs?.tutorialInput);
  if (keyCode === 'ShiftLeft' || keyCode === 'ShiftRight') keyboard.setShift(false);
  if (keyCode === 'AltRight') keyboard.setAltGr(false);
  if (keyCode === 'CapsLock') applyKeyboardCapsLockKeyup(keyboard, event);
}

function handleTutorialVirtualKeyCapture(event) {
  if (!tutorialState.active || tutorialState.guidanceSuspended || tutorialState.finalVisible) return;
  const key = event.target.closest?.('.key');
  if (!key) return;

  tutorialState.userEngaged = true;
  // Le clic virtuel reste fonctionnel, mais il est compté et déclenche une
  // incitation unique à passer sur le clavier physique.
  tutorialState.virtualClicks++;
  showVirtualClickNudge();

  if (key.dataset.keyId !== 'Backspace') return;

  event.preventDefault();
  event.stopPropagation();
  handleTutorialCorrection();
}

function keepTutorialInputFocusedAfterVirtualKey(event) {
  if (!tutorialState.active || tutorialState.guidanceSuspended || tutorialState.finalVisible) return;
  if (tutorialState.introVisible) return;
  if (!event.target.closest?.('.key')) return;

  requestAnimationFrame(() => {
    tutorialState.refs?.tutorialInput?.focus();
    placeCaretAtEnd(tutorialState.refs?.tutorialInput);
  });
}

// « Passer le parcours » (§5.2) : synthèse vide, drapeau `skipped`, le
// parcours est reproposé une fois à la visite suivante.
function skipCourse() {
  const step = currentStep();
  tutorialState.userEngaged = true;
  clearAdvanceTimeout();
  clearHintTimers();
  if (!hasDoneFlag()) setSkippedFlag();
  track('tutorial_skipped', {
    step_id: step?.id || '',
    step_index: tutorialState.currentIndex + 1
  });
  renderSynthesis('skipped');
}

// Quitter la synthèse pour le clavier libre : le parcours n'est plus actif.
function leaveToLibre() {
  const refs = tutorialState.refs;
  clearAdvanceTimeout();
  clearHintTimers();
  tutorialState.active = false;
  tutorialState.finalVisible = false;
  tutorialState.introVisible = false;
  setTutorialKeyboardMode(false);
  updateStepCta();
  showLessonsUi(refs);
  tutorialState.onGlobalSkip?.();
}

function skipCurrentStep() {
  const step = currentStep();
  if (!step) return;
  if (tutorialState.mode === 'bonus') {
    renderSynthesis('done');
    return;
  }
  if (tutorialState.consecutiveErrors < SKIP_STEP_MIN_CONSECUTIVE_ERRORS) return;
  advanceAfterSuccess({ skipped: true });
}

function startBonus(bonusId) {
  const step = (tutorialState.data?.bonus || []).find((item) => item.id === bonusId);
  if (!step) return;
  tutorialState.userEngaged = true;
  tutorialState.mode = 'bonus';
  tutorialState.bonusStep = { ...step, type: 'bonus' };
  tutorialState.finalVisible = false;
  track('tutorial_bonus_started', { step_id: bonusId });
  renderCurrentStep();
}

function goPrevious() {
  if (tutorialState.mode === 'bonus') return;
  if (tutorialState.currentIndex <= 0) return;
  if (!tutorialState.finalVisible) {
    tutorialState.currentIndex--;
  }
  saveProgress();
  renderCurrentStep();
}

function getSmartDownloadUrl(cid = CID_FINAL) {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  if (/Windows/i.test(ua) || /Win/i.test(platform)) return `${STORE_DOWNLOAD_BASE}&cid=${encodeURIComponent(cid)}`;
  if (/Macintosh|Mac OS X|Mac/i.test(ua) || /Mac/i.test(platform)) return MACOS_DOWNLOAD_URL;
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return LINUX_DOWNLOAD_URL;
  return T('/download', '/en/download');
}

function trackCtaClick(link, cid) {
  trackEvent('tester_cta_click', { cid });
  track('tutorial_download_click', { href: link.href, cid });
}

export function initTutorialMode(refs, getKeyboard, { onGlobalSkip = null } = {}) {
  ensureTutorialDom(refs);
  tutorialState.refs = refs;
  tutorialState.getKeyboard = getKeyboard;
  tutorialState.onGlobalSkip = onGlobalSkip;

  refs.tutorialStart?.addEventListener('click', () => {
    tutorialState.userEngaged = true;
    startTutorial(refs, getKeyboard, {
      introId: getTutorialPreludeIdFromCurrentPage(),
      manual: true
    });
  });

  refs.tutorialIntroMethods?.addEventListener('click', (event) => {
    const button = event.target.closest?.('button[data-method]');
    if (button) answerIntroMethod(button.dataset.method);
  });
  refs.tutorialIntroStart?.addEventListener('click', () => beginCourse());
  refs.tutorialIntroSkip?.addEventListener('click', () => beginCourse({ fromSkip: true }));
  refs.tutorialHint?.addEventListener('click', () => showStepHint('button'));
  refs.tutorialPrev?.addEventListener('click', goPrevious);
  refs.tutorialSkip?.addEventListener('click', skipCourse);
  refs.tutorialSkipStep?.addEventListener('click', skipCurrentStep);
  refs.tutorialFinalRestart?.addEventListener('click', () => {
    tutorialState.userEngaged = true;
    track('tutorial_restart_after_skip');
    startTutorial(refs, getKeyboard, {
      introId: getTutorialPreludeIdFromCurrentPage(),
      manual: true,
      skipIntro: true
    });
  });
  refs.tutorialFinalLibre?.addEventListener('click', leaveToLibre);
  refs.tutorialFinalShare?.addEventListener('click', shareTester);
  refs.tutorialFinalBonusButtons?.addEventListener('click', (event) => {
    const button = event.target.closest?.('button[data-bonus]');
    if (button) startBonus(button.dataset.bonus);
  });
  refs.tutorialDownload?.addEventListener('click', () => trackCtaClick(refs.tutorialDownload, CID_FINAL));
  refs.tutorialStepDownload?.addEventListener('click', () => trackCtaClick(refs.tutorialStepDownload, CID_STEP));

  refs.tutorialInput?.addEventListener('keydown', handleTutorialKeydown);
  refs.tutorialInput?.addEventListener('keyup', handleTutorialKeyup);
  document.getElementById('modal-keyboard-container')?.addEventListener('click', handleTutorialVirtualKeyCapture, true);
  document.getElementById('modal-keyboard-container')?.addEventListener('click', keepTutorialInputFocusedAfterVirtualKey);
  refs.tutorialInput?.addEventListener('input', () => {
    if (refs.tutorialInput.textContent !== tutorialState.typed) {
      renderTypedInput(refs);
      placeCaretAtEnd(refs.tutorialInput);
    }
  });
  refs.tutorialInput?.addEventListener('focus', () => placeCaretAtEnd(refs.tutorialInput));
  refs.tutorialInput?.addEventListener('pointerdown', () => { tutorialState.userEngaged = true; });
  refs.tutorialInput?.addEventListener('pointerup', () => placeCaretAtEnd(refs.tutorialInput));
  setupPlainTextContentEditable(refs.tutorialInput, {
    allowTransfer: false,
    allowComposition: true,
    onCompositionText: handleTutorialCompositionText
  });
}

export async function startTutorial(refs, getKeyboard, {
  introId = null,
  manual = false,
  skipIntro = false
} = {}) {
  ensureTutorialDom(refs);
  tutorialState.refs = refs;
  tutorialState.getKeyboard = getKeyboard;
  tutorialState.guidanceSuspended = false;

  const [data] = await Promise.all([
    loadTutorial(),
    loadCharacterIndex()
  ]);

  // Visite suivant un « Passer le parcours » : le parcours est reproposé une
  // fois, et DONE_KEY est posé pour qu'il ne revienne plus (§5.2, §12).
  let reproposed = false;
  if (!manual && hasFlag(SKIPPED_KEY) && !hasDoneFlag()) {
    setDoneFlag();
    clearSkippedFlag();
    reproposed = true;
  }

  const progress = (manual || reproposed) ? null : getSavedProgress();
  const effectiveIntroId = progress ? progress.introId : introId;
  tutorialState.introId = effectiveIntroId || null;
  tutorialState.sequence = buildSequence(data, tutorialState.introId);
  tutorialState.completedIds = manual ? [] : [...(progress?.completedIds || [])];
  tutorialState.bonusDoneIds = [];
  const resumeIndex = manual ? 0 : findResumeIndex(tutorialState.sequence, progress);
  const allDone = resumeIndex < 0;
  tutorialState.currentIndex = allDone
    ? Math.max(0, tutorialState.sequence.length - 1)
    : resumeIndex;
  tutorialState.startAt = Number(progress?.startAt) || 1;
  tutorialState.profile = Array.isArray(progress?.profile) ? progress.profile : readStoredProfile();
  tutorialState.mode = 'core';
  tutorialState.bonusStep = null;
  tutorialState.active = true;
  tutorialState.finalVisible = false;
  tutorialState.firstSuccess = false;
  // L'intro ne s'affiche que sur un vrai départ (pas de reprise en cours de route).
  tutorialState.introVisible = !skipIntro && !allDone && tutorialState.currentIndex === 0 && tutorialState.completedIds.length === 0;
  tutorialState.introStage = 'methods';
  tutorialState.nudgeShown = false;

  if (manual) clearProgress();
  saveProgress();
  showTutorialUi(refs);
  track('tutorial_started', {
    intro_id: tutorialState.introId || '',
    manual: manual ? '1' : '0',
    intro_shown: tutorialState.introVisible ? '1' : '0',
    reproposed: reproposed ? '1' : '0'
  });
  if (allDone) {
    renderSynthesis('done');
    return;
  }
  renderCurrentStep();
}

export function resetCompletedTutorialView(refs) {
  const nextRefs = refs || tutorialState.refs;
  if (!nextRefs) return;
  tutorialState.active = false;
  tutorialState.finalVisible = false;
  tutorialState.introVisible = false;
  tutorialState.guidanceSuspended = false;
  tutorialState.typed = '';
  tutorialState.typedOk = [];
  tutorialState.targetChars = [];
  clearAdvanceTimeout();
  clearHintTimers();
  setTutorialKeyboardMode(false);
  updateStepCta();

  if (nextRefs?.tutorialIntro) {
    nextRefs.tutorialIntro.hidden = true;
    nextRefs.tutorialIntro.style.display = 'none';
  }
  if (nextRefs?.tutorialExercise) {
    nextRefs.tutorialExercise.hidden = true;
    nextRefs.tutorialExercise.style.display = 'none';
  }
  if (nextRefs?.tutorialFinal) {
    nextRefs.tutorialFinal.hidden = true;
    nextRefs.tutorialFinal.style.display = 'none';
  }
  if (nextRefs?.tutorialActions) {
    nextRefs.tutorialActions.hidden = true;
    nextRefs.tutorialActions.style.display = 'none';
  }

  showLessonsUi(nextRefs);
}
