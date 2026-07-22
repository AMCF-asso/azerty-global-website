/**
 * AZERTY Global Tester — guided tutorial inside the Lessons tab.
 */

import { announceToScreenReaders } from './tester-accessibility.js?v=final-20260717-3';
import {
  applyKeyboardCapsLockKeydown,
  applyKeyboardCapsLockKeyup,
  clearNativeCompositionAfterInternalKeyup,
  deferToNativeComposition,
  isControlShortcut,
  remapMacKeyCode,
  suppressNativeCompositionAfterInternalKey,
  syncKeyboardModifierStateFromEvent
} from './tester-keyboard-input.js?v=final-20260717-3';
import { setupPlainTextContentEditable } from './tester-contenteditable.js?v=final-20260717-3';
import { getLayerDisplayName } from './tester-platform.js?v=final-20260717-3';
import {
  DEAD_KEY_NAMES,
  loadCharacterIndex,
  getCharacterIndex,
  getPreferredCharacterMethod,
  highlightTutorialMethod,
  clearTutorialHighlights
} from './tester-search.js?v=final-20260717-3';
import { startSession as startStatsSession, recordKeystroke } from './tester-stats.js?v=final-20260717-3';
import { T, isEnglish } from './tester-i18n.js?v=final-20260717-3';

const TUTORIAL_URL = '/tester/tutorial.json?v=final-20260717-3';
const DONE_KEY = 'azertyTutorialDone';
const PROGRESS_KEY = 'azertyTutorialProgress';

// hl aligné sur la langue du testeur (la fiche Store est bilingue FR/EN depuis l'app v1.1.0).
const STORE_DOWNLOAD_URL = `https://apps.microsoft.com/detail/9n4bts43sssz?hl=${isEnglish() ? 'en-US' : 'fr-FR'}&gl=FR&cid=website_tester_tutorial`;
const MACOS_DOWNLOAD_URL = 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_macOS.zip/download';
const LINUX_DOWNLOAD_URL = 'https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Linux.zip/download';

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
  'dk_cyrillic'
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
  sequence: [],
  currentIndex: 0,
  completedIds: [],
  introId: null,
  typed: '',
  targetChars: [],
  guidanceSuspended: false,
  advanceTimeoutId: null,
  onGlobalSkip: null,
  onContinueLessons: null
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

function track(eventName, details = {}) {
  try {
    window.AzertyTrack?.conversion?.(eventName, details);
  } catch {
    // Tracking must never block the tutorial.
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

function hasDoneFlag() {
  try {
    return !!localStorage.getItem(DONE_KEY);
  } catch {
    return false;
  }
}

function setDoneFlag() {
  try {
    localStorage.setItem(DONE_KEY, new Date().toISOString());
    localStorage.removeItem(PROGRESS_KEY);
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

function saveProgress() {
  if (!tutorialState.active) return;
  writeJsonStorage(PROGRESS_KEY, {
    introId: tutorialState.introId,
    currentId: tutorialState.sequence[tutorialState.currentIndex]?.id || null,
    completedIds: tutorialState.completedIds
  });
}

function getCurrentSlug() {
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

function ensureTutorialDom(refs) {
  if (!refs.modeLessons || refs.tutorialPanel) return;

  const entry = document.createElement('div');
  entry.id = 'lesson-tutorial-entry';
  entry.className = 'tutorial-entry bg-secondary p-3 mb-3 border rounded-8';
  entry.innerHTML = `
    <div class="items-center d-flex justify-between gap-8px">
      <div>
        <h3 class="text-primary margin-0-0-8-0">${T('Tutoriel de démarrage', 'Getting started tutorial')}</h3>
        <p class="text-secondary text-13px margin-0">${T('Reprenez les 6 exercices guidés avec le clavier simplifié.', 'Replay the 6 guided exercises with the simplified keyboard.')}</p>
      </div>
      <button class="font-semibold cursor-pointer border-none rounded-6 text-primary-dark px-8-16 bg-accent" id="tutorial-start" type="button">${T('Lancer', 'Start')}</button>
    </div>
  `;

  const panel = document.createElement('div');
  panel.id = 'tutorial-panel';
  panel.className = 'tutorial-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div id="tutorial-exercise" class="bg-secondary p-3 mb-3 border rounded-8">
      <div class="items-center d-flex mb-2 justify-between gap-8px">
        <span class="text-primary font-semibold" id="tutorial-title"></span>
        <span class="text-secondary text-12px" id="tutorial-progress" role="status" aria-live="polite"></span>
      </div>
      <p class="text-secondary text-13px margin-0 margin-b-12" id="tutorial-instruction"></p>
      <div class="tutorial-method text-secondary text-12px mb-2" id="tutorial-method"></div>
      <div class="leading-relaxed text-18px p-3 font-mono pre-wrap mb-2 border rounded-6 bg-card" id="tutorial-target" role="region" aria-label="${T('Texte du tutoriel à reproduire', 'Tutorial text to reproduce')}"></div>
      <div
        id="tutorial-input"
        class="output-text text-18px p-3 font-mono outline-none min-h-1-5em border-accent rounded-6 bg-card"
        contenteditable="true"
        role="textbox"
        aria-label="${T('Zone de saisie du tutoriel', 'Tutorial typing area')}"
        aria-describedby="tutorial-instruction"
        spellcheck="false"
        data-placeholder="${T('Tapez ici...', 'Type here...')}"
      ></div>
      <p class="tutorial-feedback text-13px margin-8-0-0-0" id="tutorial-feedback" aria-live="polite"></p>
    </div>

    <div id="tutorial-final" class="tutorial-final bg-secondary p-3 mb-3 border rounded-8 text-center" hidden>
      <div class="text-32px mb-1">${T('Bravo !', 'Well done!')}</div>
      <h3 class="text-primary margin-0-0-8-0">${T('Vous maîtrisez les bases d’AZERTY Global.', "You've mastered the basics of AZERTY Global.")}</h3>
      <p class="text-secondary margin-0-0-12-0">${T('Installez la disposition pour l’utiliser partout.', 'Install the layout to use it everywhere.')}</p>
      <div class="tutorial-final-actions">
        <button class="font-semibold cursor-pointer border-none rounded-6 text-primary-dark px-8-16 bg-accent tutorial-continue-link" id="tutorial-continue-lessons" type="button">${T('Continuer les leçons', 'Continue the lessons')}</button>
        <a class="font-semibold cursor-pointer border-none rounded-6 text-primary-dark px-8-16 bg-accent tutorial-download-link" id="tutorial-download" href="${T('/download', '/en/download')}">${T('Télécharger gratuitement', 'Download for free')}</a>
      </div>
    </div>

    <div class="d-flex gap-8px" id="tutorial-actions">
      <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="tutorial-prev" type="button">${T('← Précédent', '← Previous')}</button>
      <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="tutorial-skip-step" type="button" hidden>${T('Passer ce bonus', 'Skip this bonus')}</button>
      <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="tutorial-skip" type="button">${T('Passer le tutoriel', 'Skip the tutorial')}</button>
    </div>
  `;

  refs.modeLessons.insertBefore(panel, refs.modeLessons.firstChild);
  refs.modeLessons.insertBefore(entry, panel.nextSibling);

  refs.tutorialEntry = entry;
  refs.tutorialStart = entry.querySelector('#tutorial-start');
  refs.tutorialPanel = panel;
  refs.tutorialExercise = panel.querySelector('#tutorial-exercise');
  refs.tutorialFinal = panel.querySelector('#tutorial-final');
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
  refs.tutorialContinueLessons = panel.querySelector('#tutorial-continue-lessons');
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

function getSavedProgress() {
  const progress = readJsonStorage(PROGRESS_KEY);
  if (!progress || !Array.isArray(progress.completedIds)) return null;
  return progress;
}

function findResumeIndex(sequence, progress) {
  const completed = new Set(progress?.completedIds || []);
  const firstOpen = sequence.findIndex((step) => !completed.has(step.id));
  return firstOpen >= 0 ? firstOpen : 0;
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
  return tutorialState.sequence[tutorialState.currentIndex] || null;
}

function stepTitle(step) {
  return isEnglish() && step.titleEn ? step.titleEn : step.title;
}
function stepInstruction(step) {
  return isEnglish() && step.instructionEn ? step.instructionEn : step.instruction;
}

function targetChars(step = currentStep()) {
  return Array.from(step?.target || '');
}

function renderTarget(refs) {
  const chars = tutorialState.targetChars;
  refs.tutorialTarget.innerHTML = chars.map((char, index) => {
    const classes = ['tutorial-target-char'];
    if (index < tutorialState.typed.length) classes.push('tutorial-target-char--correct');
    if (index === tutorialState.typed.length) classes.push('tutorial-target-char--current');
    return `<span class="${classes.join(' ')}">${char === ' ' ? '&nbsp;' : escapeHtml(char)}</span>`;
  }).join('');
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
  setTutorialKeyboardMode(false);
}

export function resumeTutorialGuidance() {
  tutorialState.guidanceSuspended = false;
  updateTutorialGuidance();
}

export function clearTutorialVisuals() {
  setTutorialKeyboardMode(false);
}

export function updateTutorialGuidance() {
  if (!tutorialState.active || tutorialState.finalVisible || tutorialState.guidanceSuspended) return;
  const step = currentStep();
  const currentIndex = tutorialState.typed.length;
  const expected = tutorialState.targetChars[currentIndex];
  const nextChar = tutorialState.targetChars[currentIndex + 1] || null;
  const keyboard = tutorialState.getKeyboard?.();
  const promptCapsOff = shouldPromptCapsOff(step, expected, keyboard);
  const method = promptCapsOff
    ? { type: 'direct', key: 'CapsLock', layer: 'Base' }
    : getPreferredMethod(expected, step, nextChar);

  setTutorialKeyboardMode(true);
  applyStoreLegendFilter(step, keyboard);
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
    refs.tutorialFeedback.textContent = T(`Caractère attendu : ${expectedLabel}`, `Expected character: ${expectedLabel}`);
  }
  recordKeystroke(char, expected);
  window.setTimeout(() => {
    refs?.tutorialInput?.classList.remove('tutorial-input--error');
  }, 250);
}

function syncTutorialInputAfterCorrection(refs) {
  if (!refs?.tutorialInput) return;
  refs.tutorialInput.textContent = tutorialState.typed;
  refs.tutorialInput.classList.remove('tutorial-input--error');
  refs.tutorialInput.classList.toggle('lesson-input--valid', tutorialState.typed.length === tutorialState.targetChars.length);
  placeCaretAtEnd(refs.tutorialInput);
  renderTarget(refs);
  updateTutorialGuidance();
}

function handleTutorialCorrection() {
  if (!tutorialState.active || tutorialState.finalVisible) return false;

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
  if (refs?.tutorialFeedback) refs.tutorialFeedback.textContent = T('Dernier caractère supprimé.', 'Last character deleted.');
  syncTutorialInputAfterCorrection(refs);
  return true;
}

function saveStepDone(step) {
  if (!tutorialState.completedIds.includes(step.id)) {
    tutorialState.completedIds.push(step.id);
  }
  saveProgress();
}

function completeTutorial() {
  const refs = tutorialState.refs;
  tutorialState.finalVisible = true;
  tutorialState.active = true;
  setDoneFlag();
  setTutorialKeyboardMode(false);

  if (refs.tutorialExercise) {
    refs.tutorialExercise.hidden = true;
    refs.tutorialExercise.style.display = 'none';
  }
  if (refs.tutorialActions) {
    refs.tutorialActions.hidden = true;
    refs.tutorialActions.style.display = 'none';
  }
  if (refs.tutorialFinal) {
    refs.tutorialFinal.hidden = false;
    refs.tutorialFinal.style.display = '';
  }
  if (refs.tutorialDownload) {
    refs.tutorialDownload.href = getSmartDownloadUrl();
    refs.tutorialDownload.focus();
  }
  track('tutorial_completed', { steps: tutorialState.sequence.length });
  announceToScreenReaders(T('Tutoriel terminé', 'Tutorial completed'));
}

function advanceAfterSuccess({ skipped = false } = {}) {
  const step = currentStep();
  if (!step) return;
  clearAdvanceTimeout();
  saveStepDone(step);
  track('tutorial_step_completed', {
    step_id: step.id,
    step_index: tutorialState.currentIndex + 1,
    skipped: skipped ? '1' : '0'
  });

  if (tutorialState.currentIndex >= tutorialState.sequence.length - 1) {
    completeTutorial();
    return;
  }

  tutorialState.currentIndex++;
  saveProgress();
  window.setTimeout(() => renderCurrentStep(), 250);
}

function renderCurrentStep() {
  const refs = tutorialState.refs;
  const step = currentStep();
  if (!refs || !step) return;

  showTutorialUi(refs);
  tutorialState.finalVisible = false;
  tutorialState.typed = '';
  tutorialState.targetChars = targetChars(step);
  clearAdvanceTimeout();
  resetKeyboardStateForStep();

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

  refs.tutorialTitle.textContent = `${stepTitle(step)}${step.bonus ? ' (Bonus)' : ''}`;
  refs.tutorialInstruction.textContent = stepInstruction(step) || '';
  refs.tutorialProgress.textContent = `${tutorialState.currentIndex + 1}/${tutorialState.sequence.length}`;
  refs.tutorialInput.textContent = '';
  refs.tutorialInput.setAttribute('contenteditable', 'true');
  refs.tutorialInput.classList.remove('lesson-input--valid', 'tutorial-input--error');
  refs.tutorialPrev.disabled = tutorialState.currentIndex === 0;
  refs.tutorialSkipStep.hidden = !step.skippable;

  resetFeedback(refs);
  renderTarget(refs);
  startStatsSession('lesson');
  updateTutorialGuidance();
  refs.tutorialInput.focus();
  announceToScreenReaders(T(
    `Exercice ${tutorialState.currentIndex + 1} du tutoriel`,
    `Tutorial exercise ${tutorialState.currentIndex + 1}`
  ));
}

function handleCharacterInput(char) {
  if (!tutorialState.active || tutorialState.finalVisible) return false;
  const refs = tutorialState.refs;
  const expected = tutorialState.targetChars[tutorialState.typed.length];
  if (expected === undefined) return true;

  if (char !== expected) {
    showWrongKeyFeedback(char, expected);
    return true;
  }

  resetFeedback(refs);
  tutorialState.typed += char;
  refs.tutorialInput.textContent = tutorialState.typed;
  placeCaretAtEnd(refs.tutorialInput);
  refs.tutorialInput.classList.toggle('lesson-input--valid', tutorialState.typed.length === tutorialState.targetChars.length);
  recordKeystroke(char, expected);
  renderTarget(refs);

  if (tutorialState.typed.length >= tutorialState.targetChars.length) {
    clearAdvanceTimeout();
    tutorialState.advanceTimeoutId = window.setTimeout(() => advanceAfterSuccess(), 300);
  } else {
    updateTutorialGuidance();
  }
  return true;
}

export function handleTutorialCharacter(char) {
  if (!tutorialState.active || tutorialState.guidanceSuspended || tutorialState.finalVisible) return false;
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
  return tutorialState.active && !tutorialState.guidanceSuspended && !tutorialState.finalVisible;
}

function commitTutorialCompositionText(text) {
  if (!tutorialState.active || tutorialState.guidanceSuspended || tutorialState.finalVisible) return '';

  let handledText = '';

  for (const char of Array.from(text || '')) {
    const expected = tutorialState.targetChars[tutorialState.typed.length];
    if (!hasAzertyGlobalInputMethod(char)) {
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
  if (!tutorialState.active || tutorialState.finalVisible) return;
  if (event.code === 'Escape' || event.code === 'Tab') return;

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
  if (key.dataset.keyId !== 'Backspace') return;

  event.preventDefault();
  event.stopPropagation();
  handleTutorialCorrection();
}

function keepTutorialInputFocusedAfterVirtualKey(event) {
  if (!tutorialState.active || tutorialState.guidanceSuspended || tutorialState.finalVisible) return;
  if (!event.target.closest?.('.key')) return;

  requestAnimationFrame(() => {
    tutorialState.refs?.tutorialInput?.focus();
    placeCaretAtEnd(tutorialState.refs?.tutorialInput);
  });
}

function skipGlobal() {
  const step = currentStep();
  clearAdvanceTimeout();
  setDoneFlag();
  tutorialState.active = false;
  tutorialState.finalVisible = false;
  setTutorialKeyboardMode(false);
  showLessonsUi(tutorialState.refs);
  track('tutorial_skipped', {
    step_id: step?.id || '',
    step_index: tutorialState.currentIndex + 1
  });
  tutorialState.onGlobalSkip?.();
}

function continueLessons() {
  const refs = tutorialState.refs;
  clearAdvanceTimeout();
  tutorialState.active = false;
  tutorialState.finalVisible = false;
  setTutorialKeyboardMode(false);
  showLessonsUi(refs, {
    showTutorialEntry: false,
    restoreActiveLesson: true
  });
  refs?.lessonInput?.focus();
  track('tutorial_continue_lessons_click');
  announceToScreenReaders(T('Leçons affichées', 'Lessons shown'));
  tutorialState.onContinueLessons?.();
}

function skipCurrentBonus() {
  const step = currentStep();
  if (!step?.skippable) return;
  advanceAfterSuccess({ skipped: true });
}

function goPrevious() {
  if (tutorialState.currentIndex <= 0) return;
  if (!tutorialState.finalVisible) {
    tutorialState.currentIndex--;
  }
  saveProgress();
  renderCurrentStep();
}

function getSmartDownloadUrl() {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  if (/Windows/i.test(ua) || /Win/i.test(platform)) return STORE_DOWNLOAD_URL;
  if (/Macintosh|Mac OS X|Mac/i.test(ua) || /Mac/i.test(platform)) return MACOS_DOWNLOAD_URL;
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return LINUX_DOWNLOAD_URL;
  return T('/download', '/en/download');
}

export function initTutorialMode(refs, getKeyboard, { onGlobalSkip = null, onContinueLessons = null } = {}) {
  ensureTutorialDom(refs);
  tutorialState.refs = refs;
  tutorialState.getKeyboard = getKeyboard;
  tutorialState.onGlobalSkip = onGlobalSkip;
  tutorialState.onContinueLessons = onContinueLessons;

  refs.tutorialStart?.addEventListener('click', () => {
    startTutorial(refs, getKeyboard, {
      introId: getTutorialPreludeIdFromCurrentPage(),
      manual: true
    });
  });

  refs.tutorialPrev?.addEventListener('click', goPrevious);
  refs.tutorialSkip?.addEventListener('click', skipGlobal);
  refs.tutorialSkipStep?.addEventListener('click', skipCurrentBonus);
  refs.tutorialContinueLessons?.addEventListener('click', continueLessons);
  refs.tutorialDownload?.addEventListener('click', () => {
    track('tutorial_download_click', {
      href: refs.tutorialDownload.href
    });
  });

  refs.tutorialInput?.addEventListener('keydown', handleTutorialKeydown);
  refs.tutorialInput?.addEventListener('keyup', handleTutorialKeyup);
  document.getElementById('modal-keyboard-container')?.addEventListener('click', handleTutorialVirtualKeyCapture, true);
  document.getElementById('modal-keyboard-container')?.addEventListener('click', keepTutorialInputFocusedAfterVirtualKey);
  refs.tutorialInput?.addEventListener('input', () => {
    if (refs.tutorialInput.textContent !== tutorialState.typed) {
      refs.tutorialInput.textContent = tutorialState.typed;
      placeCaretAtEnd(refs.tutorialInput);
    }
  });
  refs.tutorialInput?.addEventListener('focus', () => placeCaretAtEnd(refs.tutorialInput));
  refs.tutorialInput?.addEventListener('pointerup', () => placeCaretAtEnd(refs.tutorialInput));
  setupPlainTextContentEditable(refs.tutorialInput, {
    allowTransfer: false,
    allowComposition: true,
    onCompositionText: handleTutorialCompositionText
  });
}

export async function startTutorial(refs, getKeyboard, {
  introId = null,
  manual = false
} = {}) {
  ensureTutorialDom(refs);
  tutorialState.refs = refs;
  tutorialState.getKeyboard = getKeyboard;
  tutorialState.guidanceSuspended = false;

  const [data] = await Promise.all([
    loadTutorial(),
    loadCharacterIndex()
  ]);

  const progress = manual ? null : getSavedProgress();
  const effectiveIntroId = progress ? progress.introId : introId;
  tutorialState.introId = effectiveIntroId || null;
  tutorialState.sequence = buildSequence(data, tutorialState.introId);
  tutorialState.completedIds = manual ? [] : [...(progress?.completedIds || [])];
  tutorialState.currentIndex = manual ? 0 : findResumeIndex(tutorialState.sequence, progress);
  tutorialState.active = true;
  tutorialState.finalVisible = false;

  if (manual) clearProgress();
  saveProgress();
  showTutorialUi(refs);
  track('tutorial_started', {
    intro_id: tutorialState.introId || '',
    manual: manual ? '1' : '0'
  });
  renderCurrentStep();
}

export function resetCompletedTutorialView(refs) {
  const nextRefs = refs || tutorialState.refs;
  if (!nextRefs) return;
  tutorialState.active = false;
  tutorialState.finalVisible = false;
  tutorialState.guidanceSuspended = false;
  tutorialState.typed = '';
  tutorialState.targetChars = [];
  clearAdvanceTimeout();
  setTutorialKeyboardMode(false);

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
