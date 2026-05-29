/**
 * AZERTY Global Tester — guided tutorial inside the Lessons tab.
 */

import { announceToScreenReaders } from './tester-accessibility.js';
import { remapMacKeyCode } from './tester-keyboard-input.js';
import { setupPlainTextContentEditable } from './tester-contenteditable.js';
import { getLayerDisplayName } from './tester-platform.js';
import {
  DEAD_KEY_NAMES_FR,
  loadCharacterIndex,
  getCharacterIndex,
  highlightTutorialMethod,
  clearTutorialHighlights
} from './tester-search.js?v=final-20260529-3';
import { startSession as startStatsSession, recordKeystroke } from './tester-stats.js';

const TUTORIAL_URL = 'tester/tutorial.json?v=final-20260529-3';
const DONE_KEY = 'azertyTutorialDone';
const PROGRESS_KEY = 'azertyTutorialProgress';

const STORE_DOWNLOAD_URL = 'https://apps.microsoft.com/detail/9n4bts43sssz?hl=fr-FR&gl=FR';
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
  Space: 'Espace',
  IntlBackslash: '<'
};

let tutorialPromise = null;

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
        <h3 class="text-primary margin-0-0-8-0">Tutoriel de démarrage</h3>
        <p class="text-secondary text-13px margin-0">Reprenez les 6 exercices guidés avec le clavier simplifié.</p>
      </div>
      <button class="font-semibold cursor-pointer border-none rounded-6 text-primary-dark px-8-16 bg-accent" id="tutorial-start" type="button">Lancer</button>
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
      <div class="leading-relaxed text-18px p-3 font-mono pre-wrap mb-2 border rounded-6 bg-card" id="tutorial-target" role="region" aria-label="Texte du tutoriel à reproduire"></div>
      <div
        id="tutorial-input"
        class="output-text text-18px p-3 font-mono outline-none min-h-1-5em border-accent rounded-6 bg-card"
        contenteditable="true"
        role="textbox"
        aria-label="Zone de saisie du tutoriel"
        aria-describedby="tutorial-instruction"
        spellcheck="false"
        data-placeholder="Tapez ici..."
      ></div>
      <p class="tutorial-feedback text-13px margin-8-0-0-0" id="tutorial-feedback" aria-live="polite"></p>
    </div>

    <div id="tutorial-final" class="tutorial-final bg-secondary p-3 mb-3 border rounded-8 text-center" hidden>
      <div class="text-32px mb-1">Bravo !</div>
      <h3 class="text-primary margin-0-0-8-0">Vous maîtrisez les bases d’AZERTY Global.</h3>
      <p class="text-secondary margin-0-0-12-0">Installez la disposition pour l’utiliser partout.</p>
      <a class="font-semibold cursor-pointer border-none rounded-6 text-primary-dark px-8-16 bg-accent tutorial-download-link" id="tutorial-download" href="/download">Télécharger</a>
    </div>

    <div class="d-flex gap-8px" id="tutorial-actions">
      <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="tutorial-prev" type="button">← Précédent</button>
      <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="tutorial-skip-step" type="button" hidden>Passer ce bonus</button>
      <button class="bg-secondary text-primary cursor-pointer border rounded-6 px-8-16" id="tutorial-skip" type="button">Passer le tutoriel</button>
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

function showLessonsUi(refs) {
  if (refs.tutorialPanel) refs.tutorialPanel.hidden = true;
  if (refs.tutorialEntry) refs.tutorialEntry.hidden = false;
  if (refs.lessonNav) refs.lessonNav.hidden = false;

  const hasActiveLesson = refs.lessonExercise && refs.lessonExercise.style.display !== 'none';
  if (refs.lessonExercise && hasActiveLesson) {
    refs.lessonExercise.hidden = false;
  } else if (refs.lessonWelcome) {
    refs.lessonWelcome.hidden = false;
    refs.lessonWelcome.style.display = 'block';
  }
}

function currentStep() {
  return tutorialState.sequence[tutorialState.currentIndex] || null;
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

function getPreferredMethod(char, step) {
  const index = getCharacterIndex();
  if (!index || !char) return null;

  if (step?.forceStoreMethods) {
    const forced = getForcedStoreMethod(char);
    if (forced) return forced;
  }

  const methods = index.characters?.[char]?.methods || [];
  if (step?.keepCapsHighlight) {
    const capsMethod = methods.find((method) => typeof method.layer === 'string' && method.layer.startsWith('Caps'));
    if (capsMethod) return capsMethod;
  }
  return methods.find((method) => method.recommended) || methods[0] || null;
}

function formatKeyName(key) {
  return KEY_LABELS[key] || key || '';
}

function formatMethod(method) {
  if (!method) return '';
  const keyLabel = formatKeyName(method.key);
  const layerLabel = getLayerDisplayName(method.layer);
  if (method.type === 'deadkey') {
    const deadKeyName = DEAD_KEY_NAMES_FR[method.deadkey || method.deadKey] || 'Touche morte';
    return `${deadKeyName}, puis ${layerLabel ? `${layerLabel} + ` : ''}${keyLabel}`;
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
  return {
    '@': 'en haut à gauche',
    '.': 'accès direct, sans Maj',
    ';': 'Maj + point',
    'ù': 'déplacé sur la touche U',
    '%': 'à côté des chiffres',
    '{': 'sous le majeur gauche',
    '}': 'sous l’index gauche',
    '[': 'sous l’index droit',
    ']': 'sous le majeur droit',
    '\\': 'à droite de l’index gauche',
    '|': 'à gauche de l’index droit',
    '~': 'rangée du bas, main droite'
  }[char] || '';
}

function renderMethodText(refs, methodText, hintText = '') {
  if (!refs?.tutorialMethod) return;
  if (!methodText) {
    refs.tutorialMethod.textContent = '';
    return;
  }

  refs.tutorialMethod.innerHTML = [
    '<span class="tutorial-method-label">Prochaine touche : </span>',
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
  const expected = tutorialState.targetChars[tutorialState.typed.length];
  const keyboard = tutorialState.getKeyboard?.();
  const promptCapsOff = shouldPromptCapsOff(step, expected, keyboard);
  const method = promptCapsOff
    ? { type: 'direct', key: 'CapsLock', layer: 'Base' }
    : getPreferredMethod(expected, step);

  setTutorialKeyboardMode(true);
  applyStoreLegendFilter(step, keyboard);
  highlightTutorialMethod(method, keyboard, {
    keepCaps: !promptCapsOff && !!step?.keepCapsHighlight,
    activeDeadKey: keyboard?.state?.activeDeadKey || null
  });

  if (tutorialState.refs?.tutorialMethod) {
    const methodText = promptCapsOff ? 'Désactivez Verr. Maj.' : formatMethod(method);
    renderMethodText(tutorialState.refs, methodText, promptCapsOff ? '' : getMovedSymbolHint(expected));
  }
}

function resetFeedback(refs) {
  refs.tutorialInput?.classList.remove('tutorial-input--error', 'lesson-input--valid');
  if (refs.tutorialFeedback) refs.tutorialFeedback.textContent = '';
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
    refs.tutorialFeedback.textContent = `Caractère attendu : ${expected === ' ' ? 'espace' : expected}`;
  }
  recordKeystroke(char, expected);
  window.setTimeout(() => {
    refs?.tutorialInput?.classList.remove('tutorial-input--error');
  }, 250);
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

  if (refs.tutorialExercise) refs.tutorialExercise.hidden = true;
  if (refs.tutorialActions) refs.tutorialActions.hidden = true;
  if (refs.tutorialFinal) refs.tutorialFinal.hidden = false;
  if (refs.tutorialDownload) {
    refs.tutorialDownload.href = getSmartDownloadUrl();
    refs.tutorialDownload.focus();
  }
  track('tutorial_completed', { steps: tutorialState.sequence.length });
  announceToScreenReaders('Tutoriel terminé');
}

function advanceAfterSuccess({ skipped = false } = {}) {
  const step = currentStep();
  if (!step) return;
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

  tutorialState.finalVisible = false;
  tutorialState.typed = '';
  tutorialState.targetChars = targetChars(step);
  resetKeyboardStateForStep();

  if (refs.tutorialExercise) refs.tutorialExercise.hidden = false;
  if (refs.tutorialFinal) refs.tutorialFinal.hidden = true;
  if (refs.tutorialActions) refs.tutorialActions.hidden = false;

  refs.tutorialTitle.textContent = `${step.title}${step.bonus ? ' (Bonus)' : ''}`;
  refs.tutorialInstruction.textContent = step.instruction || '';
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
  announceToScreenReaders(`Exercice ${tutorialState.currentIndex + 1} du tutoriel`);
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
    window.setTimeout(() => advanceAfterSuccess(), 300);
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

function handleTutorialKeydown(event) {
  if (!tutorialState.active || tutorialState.finalVisible) return;
  if (event.code === 'Escape' || event.code === 'Tab') return;

  event.stopPropagation();

  const keyboard = tutorialState.getKeyboard?.();
  const keyCode = remapMacKeyCode(event.code);

  if (keyCode === 'ShiftLeft' || keyCode === 'ShiftRight') {
    keyboard?.setShift(true);
    event.preventDefault();
    return;
  }
  if (keyCode === 'CapsLock') {
    keyboard?.setCaps(event.getModifierState('CapsLock'));
    event.preventDefault();
    return;
  }
  if (keyCode === 'AltRight') {
    keyboard?.setAltGr(true);
    event.preventDefault();
    return;
  }
  if ((event.ctrlKey && !event.altKey) || event.metaKey) return;

  if (event.code === 'Backspace' || event.code === 'Delete') {
    event.preventDefault();
    const refs = tutorialState.refs;
    if (refs?.tutorialFeedback) refs.tutorialFeedback.textContent = 'Retour arrière est désactivé pendant le tutoriel.';
    return;
  }
  if (event.code.startsWith('Arrow')) return;
  if (event.code === 'Enter') {
    event.preventDefault();
    showWrongKeyFeedback('\n', tutorialState.targetChars[tutorialState.typed.length]);
    return;
  }

  if (keyboard) {
    keyboard.handleKeyClick(keyCode, true);
    event.preventDefault();
  }
}

function handleTutorialKeyup(event) {
  const keyboard = tutorialState.getKeyboard?.();
  if (!keyboard) return;
  const keyCode = remapMacKeyCode(event.code);
  keyboard.releaseKey(keyCode);
  if (keyCode === 'ShiftLeft' || keyCode === 'ShiftRight') keyboard.setShift(false);
  if (keyCode === 'AltRight') keyboard.setAltGr(false);
}

function handleTutorialVirtualKeyCapture(event) {
  if (!tutorialState.active || tutorialState.guidanceSuspended || tutorialState.finalVisible) return;
  const key = event.target.closest?.('.key');
  if (!key) return;
  if (key.dataset.keyId !== 'Backspace') return;

  event.preventDefault();
  event.stopPropagation();
  if (tutorialState.refs?.tutorialFeedback) {
    tutorialState.refs.tutorialFeedback.textContent = 'Retour arrière est désactivé pendant le tutoriel.';
  }
}

function skipGlobal() {
  const step = currentStep();
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

function skipCurrentBonus() {
  const step = currentStep();
  if (!step?.skippable) return;
  advanceAfterSuccess({ skipped: true });
}

function goPrevious() {
  if (tutorialState.currentIndex <= 0) return;
  tutorialState.currentIndex--;
  saveProgress();
  renderCurrentStep();
}

function getSmartDownloadUrl() {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  if (/Windows/i.test(ua) || /Win/i.test(platform)) return STORE_DOWNLOAD_URL;
  if (/Macintosh|Mac OS X|Mac/i.test(ua) || /Mac/i.test(platform)) return MACOS_DOWNLOAD_URL;
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return LINUX_DOWNLOAD_URL;
  return '/download';
}

export function initTutorialMode(refs, getKeyboard, { onGlobalSkip = null } = {}) {
  ensureTutorialDom(refs);
  tutorialState.refs = refs;
  tutorialState.getKeyboard = getKeyboard;
  tutorialState.onGlobalSkip = onGlobalSkip;

  refs.tutorialStart?.addEventListener('click', () => {
    startTutorial(refs, getKeyboard, {
      introId: getTutorialPreludeIdFromCurrentPage(),
      manual: true
    });
  });

  refs.tutorialPrev?.addEventListener('click', goPrevious);
  refs.tutorialSkip?.addEventListener('click', skipGlobal);
  refs.tutorialSkipStep?.addEventListener('click', skipCurrentBonus);
  refs.tutorialDownload?.addEventListener('click', () => {
    track('tutorial_download_click', {
      href: refs.tutorialDownload.href
    });
  });

  refs.tutorialInput?.addEventListener('keydown', handleTutorialKeydown);
  refs.tutorialInput?.addEventListener('keyup', handleTutorialKeyup);
  document.getElementById('modal-keyboard-container')?.addEventListener('click', handleTutorialVirtualKeyCapture, true);
  refs.tutorialInput?.addEventListener('input', () => {
    if (refs.tutorialInput.textContent !== tutorialState.typed) {
      refs.tutorialInput.textContent = tutorialState.typed;
      placeCaretAtEnd(refs.tutorialInput);
    }
  });
  setupPlainTextContentEditable(refs.tutorialInput, { allowTransfer: false });
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
  if (!tutorialState.finalVisible) return;
  tutorialState.active = false;
  tutorialState.finalVisible = false;
  setTutorialKeyboardMode(false);
  showLessonsUi(refs || tutorialState.refs);
}
