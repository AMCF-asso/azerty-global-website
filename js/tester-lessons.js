/**
 * AZERTY Global Tester — Lesson mode
 * Load lessons, display exercises, handle typing input, navigation
 */

import { announceToScreenReaders, updateModeAccessibility } from './tester-accessibility.js?v=final-20260717-3';
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
import { loadCharacterIndex, getCharacterIndex, getPreferredCharacterMethod, highlightSearchMethod, clearHighlightTimeouts, clearAllHighlights } from './tester-search.js?v=final-20260717-3';
import { insertPlainTextAtSelection, setupPlainTextContentEditable } from './tester-contenteditable.js?v=final-20260717-3';
import { getLayerDisplayName } from './tester-platform.js?v=final-20260717-3';
import { markExerciseDone, isLessonDone, getCompletedExercises, getModuleProgress, isModuleDone } from './tester-progress.js?v=final-20260717-3';
import { startSession as startStatsSession, recordKeystroke } from './tester-stats.js?v=final-20260717-3';
import { T, isEnglish } from './tester-i18n.js?v=final-20260717-3';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function localizedTitle(item) {
  return isEnglish() && item.titleEn ? item.titleEn : item.title;
}
function localizedInstruction(exercise) {
  return isEnglish() && exercise.instructionEn ? exercise.instructionEn : exercise.instruction;
}

// ── Lesson state ──

let cachedTargetChars = null;
let lessonsPromise = null;
const LESSONS_URL = '/tester/lessons.json?v=final-20260717-3';

const ERROR_HINT_DELAY_MS = 5000;
const ERROR_HINT_MIN_CONSECUTIVE = 2;
const LESSON_SCROLL_EDGE_EPSILON = 2;
const LESSON_SCROLL_MIN_STEP = 180;
const LESSON_SCROLL_STEP_RATIO = 0.72;

const errorState = {
  consecutive: 0,
  lastExpected: null,
  nextChar: null,
  forceCaps: false,
  needsBackspace: false,
  timeoutId: null,
};

let lessonInputPrevLength = 0;
let guidedHintRefreshId = null;

function resetErrorState() {
  if (errorState.timeoutId) {
    clearTimeout(errorState.timeoutId);
    errorState.timeoutId = null;
  }
  errorState.consecutive = 0;
  errorState.lastExpected = null;
  errorState.nextChar = null;
  errorState.forceCaps = false;
  errorState.needsBackspace = false;
  clearHighlightTimeouts();
  clearAllHighlights();
}

function scheduleErrorHint(getKeyboard) {
  if (errorState.timeoutId) return;
  errorState.timeoutId = setTimeout(() => {
    errorState.timeoutId = null;
    if (errorState.needsBackspace) {
      highlightSearchMethod({ type: 'direct', key: 'Backspace', layer: 'Base' }, getKeyboard());
      announceToScreenReaders(T('Astuce affichée sur le clavier', 'Tip shown on the keyboard'));
      return;
    }
    if (!errorState.lastExpected) return;
    const characterIndex = getCharacterIndex();
    if (!characterIndex) return;
    const charData = characterIndex.characters[errorState.lastExpected];
    if (!charData?.methods?.length) return;
    const method = getPreferredCharacterMethod(errorState.lastExpected, charData.methods, {
      nextChar: errorState.nextChar,
      forceCaps: errorState.forceCaps
    });
    highlightSearchMethod(method, getKeyboard());
    announceToScreenReaders(T('Astuce affichée sur le clavier', 'Tip shown on the keyboard'));
  }, ERROR_HINT_DELAY_MS);
}

export const lessonState = {
  data: null,
  mode: 'libre',
  moduleIndex: -1,
  lessonIndex: -1,
  exerciseIndex: 0,
  lineIndex: 0,
  guidedHints: false
};

function updateHintButtonState(refs) {
  if (!refs.btnHint) return;
  refs.btnHint.setAttribute('aria-pressed', lessonState.guidedHints ? 'true' : 'false');
  refs.btnHint.textContent = T('💡 Indice', '💡 Hint');
}

function isSingleLetter(value) {
  return typeof value === 'string' && [...value].length === 1 && /\p{L}/u.test(value);
}

function shouldPromptCapsOff(nextChar, method, keyboard) {
  if (!keyboard?.state?.caps || !method?.key || method.layer !== 'Base') return false;

  const chars = keyboard.layout?.[method.key];
  if (!chars) return false;

  return chars[0] === nextChar &&
    chars[2] !== nextChar &&
    isSingleLetter(chars[0]) &&
    isSingleLetter(chars[2]);
}

function getPendingTargetState(inputText, targetLine) {
  const inputChars = Array.from(inputText || '');
  const targetChars = Array.from(targetLine || '');
  const limit = Math.min(inputChars.length, targetChars.length);

  for (let index = 0; index < limit; index++) {
    if (inputChars[index] !== targetChars[index]) {
      return { index, needsBackspace: true };
    }
  }

  return {
    index: inputChars.length,
    needsBackspace: inputChars.length > targetChars.length
  };
}

function isConnectorInsideWord(char) {
  return char === '\'' || char === '’' || char === '-';
}

function isUppercaseLetter(char) {
  return isSingleLetter(char) &&
    char.toLocaleUpperCase('fr') === char &&
    char.toLocaleLowerCase('fr') !== char;
}

function isUppercaseWordAt(targetLine, charIndex) {
  const chars = Array.from(targetLine || '');
  if (!isSingleLetter(chars[charIndex])) return false;

  let start = charIndex;
  while (start > 0 && (isSingleLetter(chars[start - 1]) || isConnectorInsideWord(chars[start - 1]))) {
    start--;
  }

  let end = charIndex + 1;
  while (end < chars.length && (isSingleLetter(chars[end]) || isConnectorInsideWord(chars[end]))) {
    end++;
  }

  const letters = chars.slice(start, end).filter(isSingleLetter);
  return letters.length >= 2 && letters.every(isUppercaseLetter);
}

function getCurrentHintMethod(refs, keyboard = null) {
  const characterIndex = getCharacterIndex();
  if (!lessonState.data || !characterIndex || lessonState.moduleIndex < 0 || lessonState.lessonIndex < 0) {
    return null;
  }

  const lesson = lessonState.data.modules[lessonState.moduleIndex].lessons[lessonState.lessonIndex];
  const exercise = lesson.exercises[lessonState.exerciseIndex];

  const inputText = refs.lessonInput?.textContent || '';
  const targetLines = exercise.content.split('\n');
  const currentTargetLine = targetLines[lessonState.lineIndex] || targetLines[0] || '';
  const pendingTarget = getPendingTargetState(inputText, currentTargetLine);
  const nextCharInLineIdx = pendingTarget.index;

  if (pendingTarget.needsBackspace) {
    return { type: 'direct', key: 'Backspace', layer: 'Base' };
  }

  if (nextCharInLineIdx >= currentTargetLine.length) return null;

  const nextChar = currentTargetLine[nextCharInLineIdx];

  if (nextChar === ' ') {
    return { type: 'direct', key: 'Space', layer: 'Base' };
  }

  if (exercise.hintMethod) {
    const { deadKey, baseChar } = exercise.hintMethod;
    const baseCharData = characterIndex.characters[baseChar];
    if (baseCharData?.methods?.[0]) {
      return {
        type: 'deadkey',
        deadkey: deadKey,
        key: baseCharData.methods[0].key,
        layer: baseCharData.methods[0].layer || 'Base'
      };
    }
    return null;
  }

  const currentChars = lesson.characters || [];
  if (currentChars.length === 0) return null;

  const charData = characterIndex.characters[nextChar];
  if (!charData?.methods?.length) return null;
  const method = getPreferredCharacterMethod(nextChar, charData.methods, {
    nextChar: currentTargetLine[nextCharInLineIdx + 1] || null,
    forceCaps: isUppercaseWordAt(currentTargetLine, nextCharInLineIdx)
  });
  if (shouldPromptCapsOff(nextChar, method, keyboard)) {
    return { type: 'direct', key: 'CapsLock', layer: 'Base' };
  }
  return method;
}

function showCurrentHint(refs, getKeyboard, { announce = false } = {}) {
  const keyboard = getKeyboard();
  if (!keyboard) return false;

  const method = getCurrentHintMethod(refs, keyboard);
  if (!method) {
    clearHighlightTimeouts();
    clearAllHighlights();
    return false;
  }
  highlightSearchMethod(method, keyboard);
  if (announce) announceToScreenReaders(T('Indice affiché sur le clavier', 'Hint shown on the keyboard'));
  return true;
}

function scheduleGuidedHintWarmup(refs, getKeyboard, { announce = false } = {}) {
  const delays = [40, 120, 300, 700];

  delays.forEach((delay, index) => {
    window.setTimeout(() => {
      if (!lessonState.guidedHints) return;
      showCurrentHint(refs, getKeyboard, { announce: announce && index === 0 });
    }, delay);
  });

  if (!getCharacterIndex()) {
    loadCharacterIndex({
      onLoaded: () => {
        window.setTimeout(() => {
          if (!lessonState.guidedHints) return;
          showCurrentHint(refs, getKeyboard, { announce });
        }, 40);
      }
    });
  }
}

function clearGuidedHintRefresh() {
  if (!guidedHintRefreshId) return;
  clearInterval(guidedHintRefreshId);
  guidedHintRefreshId = null;
}

export function setGuidedHintsEnabled(enabled, refs, getKeyboard, { announce = true } = {}) {
  lessonState.guidedHints = Boolean(enabled);
  clearGuidedHintRefresh();
  updateHintButtonState(refs);

  if (!lessonState.guidedHints) {
    clearHighlightTimeouts();
    clearAllHighlights();
    if (announce) announceToScreenReaders(T('Indices désactivés', 'Hints turned off'));
    return;
  }

  if (!showCurrentHint(refs, getKeyboard, { announce })) {
    scheduleGuidedHintWarmup(refs, getKeyboard, { announce });
  }
  guidedHintRefreshId = setInterval(() => {
    if (lessonState.mode !== 'lessons' || lessonState.lessonIndex < 0) return;
    showCurrentHint(refs, getKeyboard);
  }, 2500);
}

export function refreshGuidedHint(refs, getKeyboard) {
  if (!lessonState.guidedHints) return;
  window.setTimeout(() => showCurrentHint(refs, getKeyboard), 40);
}

// ── Load lessons JSON ──

export async function loadLessons({ onLoaded = null, onError = null, force = false } = {}) {
  if (lessonState.data && !force) {
    if (onLoaded) onLoaded(lessonState.data);
    return lessonState.data;
  }
  if (lessonsPromise && !force) {
    return lessonsPromise.then((data) => {
      if (data && onLoaded) onLoaded(data);
      if (!data && onError) onError(new Error('Failed to load lessons'));
      return data;
    });
  }

  lessonsPromise = fetch(LESSONS_URL, { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) throw new Error('Failed to load lessons');
      return response.json();
    })
    .then((data) => {
      lessonState.data = data;
      if (onLoaded) onLoaded(lessonState.data);
      return lessonState.data;
    })
    .catch((error) => {
      console.error('Error loading lessons:', error);
      lessonsPromise = null;
      if (onError) onError(error);
      return null;
    });

  return lessonsPromise;
}

// ── Populate module select ──

function populateModuleSelect(moduleSelect) {
  if (!moduleSelect || !lessonState.data) return;
  const savedValue = moduleSelect.value;
  moduleSelect.innerHTML = `<option value="">${T('Choisir un module...', 'Choose a module...')}</option>`;
  lessonState.data.modules.forEach((module, idx) => {
    const option = document.createElement('option');
    option.value = idx;
    const prefix = isModuleDone(module) ? '✓ ' : '';
    option.textContent = `${prefix}${module.icon} ${localizedTitle(module)}`;
    moduleSelect.appendChild(option);
  });
  if (savedValue !== '') moduleSelect.value = savedValue;
  updateModuleSelectDoneClass(moduleSelect);
}

function updateModuleSelectDoneClass(moduleSelect) {
  if (!moduleSelect || !lessonState.data) return;
  const idx = parseInt(moduleSelect.value, 10);
  const module = isNaN(idx) ? null : lessonState.data.modules[idx];
  moduleSelect.classList.toggle('module-select--done', !!module && isModuleDone(module));
}

function updateLessonScrollControls(refs) {
  const list = refs.lessonList;
  const scrollWrap = refs.lessonScroll;
  const prev = refs.lessonScrollPrev;
  const next = refs.lessonScrollNext;
  if (!list || !scrollWrap || !prev || !next) return;

  const maxScroll = Math.max(0, list.scrollWidth - list.clientWidth);
  const hasOverflow = maxScroll > LESSON_SCROLL_EDGE_EPSILON;
  const atStart = list.scrollLeft <= LESSON_SCROLL_EDGE_EPSILON;
  const atEnd = list.scrollLeft >= maxScroll - LESSON_SCROLL_EDGE_EPSILON;

  scrollWrap.classList.toggle('lesson-scroll--overflow', hasOverflow);
  prev.hidden = !hasOverflow;
  next.hidden = !hasOverflow;
  prev.disabled = !hasOverflow || atStart;
  next.disabled = !hasOverflow || atEnd;
}

function scheduleLessonScrollControlsUpdate(refs) {
  if (refs.lessonScrollUpdateFrame) return;
  refs.lessonScrollUpdateFrame = requestAnimationFrame(() => {
    refs.lessonScrollUpdateFrame = null;
    updateLessonScrollControls(refs);
  });
}

function scrollLessonList(refs, direction) {
  const list = refs.lessonList;
  if (!list) return;

  const step = Math.max(LESSON_SCROLL_MIN_STEP, list.clientWidth * LESSON_SCROLL_STEP_RATIO);
  list.scrollBy({ left: direction * step, behavior: 'smooth' });
  scheduleLessonScrollControlsUpdate(refs);
}

function setupLessonScrollControls(refs) {
  const list = refs.lessonList;
  if (!list || refs.lessonScrollControlsReady) return;

  refs.lessonScrollControlsReady = true;
  refs.lessonScrollPrev?.addEventListener('click', () => scrollLessonList(refs, -1));
  refs.lessonScrollNext?.addEventListener('click', () => scrollLessonList(refs, 1));
  list.addEventListener('scroll', () => scheduleLessonScrollControlsUpdate(refs), { passive: true });
  window.addEventListener('resize', () => scheduleLessonScrollControlsUpdate(refs));
  scheduleLessonScrollControlsUpdate(refs);
}

// ── Display lesson list ──

function displayLessonList(refs, getKeyboard = null, modeOptions = {}) {
  if (!lessonState.data || !refs.lessonList) return;
  const module = lessonState.data.modules[lessonState.moduleIndex];
  refs.lessonList.innerHTML = '';
  refs.lessonList.scrollLeft = 0;

  module.lessons.forEach((lesson, idx) => {
    const btn = document.createElement('button');
    btn.textContent = localizedTitle(lesson);
    btn.className = 'lesson-btn';
    if (isLessonDone(module.id, lesson)) {
      btn.classList.add('lesson-btn--done');
      btn.setAttribute('aria-label', T(`${localizedTitle(lesson)} — leçon terminée`, `${localizedTitle(lesson)} — lesson completed`));
    }
    btn.addEventListener('click', () => {
      startLesson(idx, refs);
      if (getKeyboard) refreshGuidedHint(refs, getKeyboard);
      modeOptions.onLessonStart?.({
        moduleIndex: lessonState.moduleIndex,
        lessonIndex: idx
      });
    });
    refs.lessonList.appendChild(btn);
  });

  renderModuleProgress(refs, module);
  scheduleLessonScrollControlsUpdate(refs);

  if (refs.lessonExercise) {
    refs.lessonExercise.style.display = 'none';
    refs.lessonExercise.hidden = true;
  }
  if (refs.lessonWelcome) {
    refs.lessonWelcome.style.display = 'none';
    refs.lessonWelcome.hidden = true;
  }
}

function refreshLessonListDoneStates(refs) {
  if (!lessonState.data || !refs.lessonList) return;
  const module = lessonState.data.modules[lessonState.moduleIndex];
  if (!module) return;
  const buttons = refs.lessonList.children;
  module.lessons.forEach((lesson, idx) => {
    const btn = buttons[idx];
    if (!btn) return;
    if (isLessonDone(module.id, lesson)) {
      btn.classList.add('lesson-btn--done');
      btn.setAttribute('aria-label', T(`${localizedTitle(lesson)} — leçon terminée`, `${localizedTitle(lesson)} — lesson completed`));
    } else {
      btn.classList.remove('lesson-btn--done');
      btn.removeAttribute('aria-label');
    }
  });
  renderModuleProgress(refs, module);
  scheduleLessonScrollControlsUpdate(refs);
}

function renderModuleProgress(refs, module) {
  if (!refs.lessonList || !module) return;
  let counter = document.getElementById('lesson-module-progress');
  if (!counter) {
    counter = document.createElement('div');
    counter.id = 'lesson-module-progress';
    counter.className = 'lesson-module-progress text-secondary text-12px mb-2';
    const insertionTarget = refs.lessonScroll || refs.lessonList;
    insertionTarget.parentElement?.insertBefore(counter, insertionTarget);
  }
  const { done, total } = getModuleProgress(module);
  if (total > 0) {
    counter.textContent = T(`${done}/${total} leçons terminées`, `${done}/${total} lessons completed`);
    counter.hidden = false;
  } else {
    counter.hidden = true;
  }
}

// ── Start a lesson ──

function startLesson(lessonIdx, refs, exerciseIdx = 0) {
  lessonState.lessonIndex = lessonIdx;
  lessonState.exerciseIndex = exerciseIdx;

  startStatsSession('lesson');

  if (refs.lessonList) {
    [...refs.lessonList.children].forEach((btn, idx) => {
      btn.classList.toggle('lesson-btn--active', idx === lessonIdx);
    });
    refs.lessonList.children[lessonIdx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    scheduleLessonScrollControlsUpdate(refs);
  }

  if (refs.lessonWelcome) {
    refs.lessonWelcome.style.display = 'none';
    refs.lessonWelcome.hidden = true;
  }
  if (refs.lessonExercise) {
    refs.lessonExercise.style.display = 'block';
    refs.lessonExercise.hidden = false;
  }
  displayExercise(refs);
  announceToScreenReaders(T(`Leçon ${lessonIdx + 1} sélectionnée`, `Lesson ${lessonIdx + 1} selected`));
}

function formatInstructionText(instruction = '') {
  return instruction.replaceAll('{ALTGR}', getLayerDisplayName('AltGr'));
}

function updateNavigationButtons(refs) {
  if (!lessonState.data || lessonState.moduleIndex < 0 || lessonState.lessonIndex < 0) return;

  const module = lessonState.data.modules[lessonState.moduleIndex];
  const lesson = module.lessons[lessonState.lessonIndex];
  const isFirstExerciseInModule = lessonState.lessonIndex === 0 && lessonState.exerciseIndex === 0;
  const isLastExerciseInModule = (
    lessonState.lessonIndex === module.lessons.length - 1 &&
    lessonState.exerciseIndex === lesson.exercises.length - 1
  );

  if (refs.btnPrev) {
    refs.btnPrev.disabled = isFirstExerciseInModule;
    refs.btnPrev.style.opacity = refs.btnPrev.disabled ? '0.5' : '1';
  }

  if (refs.btnNext) {
    refs.btnNext.disabled = isLastExerciseInModule;
    refs.btnNext.style.opacity = refs.btnNext.disabled ? '0.5' : '1';
  }
}

function showModuleCompletion(refs) {
  if (!refs.lessonInput) return;

  refs.lessonInput.textContent = T('🎉 Module terminé !', '🎉 Module completed!');
  refs.lessonInput.classList.add('lesson-input--done');
  refs.lessonInput.setAttribute('contenteditable', 'false');
  updateNavigationButtons(refs);
  announceToScreenReaders(T('Module terminé', 'Module completed'));
}

// ── Display current exercise ──

function displayExercise(refs) {
  if (!lessonState.data) return;
  const module = lessonState.data.modules[lessonState.moduleIndex];
  const lesson = module.lessons[lessonState.lessonIndex];
  const exercise = lesson.exercises[lessonState.exerciseIndex];

  lessonState.lineIndex = 0;

  if (refs.lessonTitle) refs.lessonTitle.textContent = `${module.icon} ${localizedTitle(lesson)}`;
  if (refs.lessonProgress) {
    const completed = getCompletedExercises(module.id, lesson);
    const dots = lesson.exercises.map((_, i) => {
      const done = completed.includes(i);
      return `<span class="exercise-dot${done ? ' exercise-dot--done' : ''}" aria-hidden="true">●</span>`;
    }).join('');
    refs.lessonProgress.innerHTML = T(
      `Exercice ${lessonState.exerciseIndex + 1}/${lesson.exercises.length} <span class="exercise-dots">${dots}</span>`,
      `Exercise ${lessonState.exerciseIndex + 1}/${lesson.exercises.length} <span class="exercise-dots">${dots}</span>`
    );
  }
  if (refs.lessonInstruction) refs.lessonInstruction.textContent = formatInstructionText(localizedInstruction(exercise));

  if (refs.lessonTarget) {
    refs.lessonTarget.innerHTML = exercise.content.split('').map(char => {
      if (char === '\n') return '<span class="target-char target-newline">↵</span><br>';
      return `<span class="target-char">${char === ' ' ? '&nbsp;' : escapeHtml(char)}</span>`;
    }).join('');
    cachedTargetChars = [...refs.lessonTarget.querySelectorAll('.target-char')];
  }

  if (refs.lessonInput) {
    refs.lessonInput.innerHTML = '';
    refs.lessonInput.classList.remove('lesson-input--done', 'lesson-input--valid');
    refs.lessonInput.setAttribute('contenteditable', 'true');
    refs.lessonInput.focus();
  }
  lessonInputPrevLength = 0;

  resetErrorState();
  updateNavigationButtons(refs);
}

export function rerenderCurrentExercise(refs) {
  if (!lessonState.data || lessonState.moduleIndex < 0 || lessonState.lessonIndex < 0) return;

  const exercise = lessonState.data.modules[lessonState.moduleIndex]
    .lessons[lessonState.lessonIndex]
    .exercises[lessonState.exerciseIndex];

  if (refs.lessonInstruction) {
    refs.lessonInstruction.textContent = formatInstructionText(localizedInstruction(exercise));
  }
}

// ── Input handler (typing comparison) ──

function hasAzertyGlobalInputMethod(char) {
  const charData = getCharacterIndex()?.characters?.[char];
  return Array.isArray(charData?.methods) && charData.methods.length > 0;
}

function setupLessonInputHandler(refs, getKeyboard, modeOptions = {}) {
  const { lessonInput, lessonTarget } = refs;
  if (!lessonInput) return;
  let pendingCompositionValidation = null;

  function getCurrentExpectedChar() {
    if (!lessonState.data) return null;
    const fullContent = lessonState.data.modules[lessonState.moduleIndex]
      .lessons[lessonState.lessonIndex].exercises[lessonState.exerciseIndex].content;
    const lines = fullContent.split('\n');
    const currentTargetLine = lines[lessonState.lineIndex] || '';
    return currentTargetLine[lessonInput.textContent.length] ?? null;
  }

  function canAcceptLessonComposition() {
    return lessonState.mode === 'lessons' &&
      lessonInput.getAttribute('contenteditable') !== 'false' &&
      Boolean(lessonState.data);
  }

  function commitLessonCompositionText(text) {
    if (!canAcceptLessonComposition()) {
      return '';
    }

    const acceptedChars = [];

    for (const char of Array.from(text || '')) {
      if (hasAzertyGlobalInputMethod(char)) {
        acceptedChars.push(char);
      } else {
        recordKeystroke(char, getCurrentExpectedChar());
      }
    }

    const acceptedText = acceptedChars.join('');
    if (!acceptedText) {
      refreshGuidedHint(refs, getKeyboard);
      return '';
    }

    insertPlainTextAtSelection(lessonInput, acceptedText, { dispatchInput: true });
    return acceptedText;
  }

  function handleLessonCompositionText(text) {
    if (!getCharacterIndex()) {
      const token = Symbol('lesson-composition');
      pendingCompositionValidation = {
        token,
        text,
        inputText: lessonInput.textContent,
        expected: getCurrentExpectedChar()
      };
      loadCharacterIndex().then((index) => {
        if (!index || pendingCompositionValidation?.token !== token) {
          return;
        }
        const pending = pendingCompositionValidation;
        pendingCompositionValidation = null;
        if (lessonInput.textContent === pending.inputText &&
          getCurrentExpectedChar() === pending.expected) {
          commitLessonCompositionText(pending.text);
        }
      });
      return '';
    }

    pendingCompositionValidation = null;
    return commitLessonCompositionText(text);
  }

  lessonInput.addEventListener('input', (e) => {
    if (lessonInput.getAttribute('contenteditable') === 'false') return;
    if (!lessonState.data) return;
    const fullContent = lessonState.data.modules[lessonState.moduleIndex]
      .lessons[lessonState.lessonIndex].exercises[lessonState.exerciseIndex].content;
    const lines = fullContent.split('\n');
    const currentTargetLine = lines[lessonState.lineIndex] || '';
    const inputText = lessonInput.textContent;

    const currentLength = inputText.length;
    const delta = currentLength - lessonInputPrevLength;
    lessonInputPrevLength = currentLength;

    if (delta === 1) {
      const pos = currentLength - 1;
      const char = inputText[pos];
      const expected = currentTargetLine[pos];
      recordKeystroke(char, expected !== undefined ? expected : null);

      if (expected !== undefined) {
        if (char === expected) {
          resetErrorState();
        } else {
          const pendingTarget = getPendingTargetState(inputText, currentTargetLine);
          const pendingIndex = pendingTarget.index;
          const targetChars = Array.from(currentTargetLine);
          errorState.consecutive++;
          errorState.lastExpected = targetChars[pendingIndex] || expected;
          errorState.nextChar = targetChars[pendingIndex + 1] || null;
          errorState.forceCaps = isUppercaseWordAt(currentTargetLine, pendingIndex);
          errorState.needsBackspace = pendingTarget.needsBackspace;
          if (errorState.consecutive >= ERROR_HINT_MIN_CONSECUTIVE) {
            scheduleErrorHint(getKeyboard);
          }
        }
      }
    } else if (delta < 0) {
      resetErrorState();
    }

    const allTargetChars = cachedTargetChars || [...lessonTarget.querySelectorAll('.target-char')];

    let charOffset = 0;
    for (let i = 0; i < lessonState.lineIndex; i++) {
      charOffset += lines[i].length + 1;
    }

    const currentLineChars = allTargetChars.slice(charOffset, charOffset + currentTargetLine.length);

    [...inputText].forEach((char, idx) => {
      if (idx < currentLineChars.length) {
        const ok = char === currentTargetLine[idx];
        currentLineChars[idx].classList.toggle('target-char--correct', ok);
        currentLineChars[idx].classList.toggle('target-char--wrong', !ok);
      }
    });

    for (let i = inputText.length; i < currentLineChars.length; i++) {
      currentLineChars[i].classList.remove('target-char--correct', 'target-char--wrong');
    }

    if (inputText === currentTargetLine) {
      lessonInput.classList.add('lesson-input--valid');

      setTimeout(() => {
        lessonInput.classList.remove('lesson-input--valid');
        lessonInput.textContent = '';
        lessonInputPrevLength = 0;

        if (lessonState.lineIndex < lines.length - 1) {
          lessonState.lineIndex++;
          const newlineIdx = charOffset + currentTargetLine.length;
          if (allTargetChars[newlineIdx]) {
            allTargetChars[newlineIdx].classList.add('target-char--correct');
          }
          refreshGuidedHint(refs, getKeyboard);
        } else {
          lessonState.lineIndex = 0;
          const moduleData = lessonState.data.modules[lessonState.moduleIndex];
          const lessonData = moduleData.lessons[lessonState.lessonIndex];

          markExerciseDone(moduleData.id, lessonData.id, lessonState.exerciseIndex);
          refreshLessonListDoneStates(refs);
          populateModuleSelect(refs.moduleSelect);

          if (lessonState.exerciseIndex < lessonData.exercises.length - 1) {
            lessonState.exerciseIndex++;
            displayExercise(refs);
            refreshGuidedHint(refs, getKeyboard);
          } else {
            const handled = modeOptions.onLessonComplete?.({
              moduleIndex: lessonState.moduleIndex,
              lessonIndex: lessonState.lessonIndex,
              module: moduleData,
              lesson: lessonData
            });
            if (handled === true) return;

            const currentModule = lessonState.data.modules[lessonState.moduleIndex];
            if (lessonState.lessonIndex < currentModule.lessons.length - 1) {
              lessonState.lessonIndex++;
              lessonState.exerciseIndex = 0;
              setTimeout(() => {
                startLesson(lessonState.lessonIndex, refs);
                refreshGuidedHint(refs, getKeyboard);
              }, 500);
            } else {
              showModuleCompletion(refs);
            }
          }
        }
      }, 300);
    } else {
      refreshGuidedHint(refs, getKeyboard);
    }
  });

  setupPlainTextContentEditable(lessonInput, {
    allowTransfer: false,
    allowComposition: true,
    onCompositionText: handleLessonCompositionText
  });

  // Physical keyboard in lesson mode
  lessonInput.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'Tab') return;

    e.stopPropagation();

    if (e.code === 'Enter') {
      e.preventDefault();
      insertPlainTextAtSelection(lessonInput, '\n', { dispatchInput: true });
      return;
    }

    const keyCode = remapMacKeyCode(e.code);
    const keyboard = getKeyboard();

    if (deferToNativeComposition(e, keyboard, lessonInput, keyCode)) {
      keyboard?.clearDeadKey?.();
      return;
    }

    syncKeyboardModifierStateFromEvent(keyboard, e, keyCode);

    if (keyCode === 'ShiftLeft' || keyCode === 'ShiftRight') {
      keyboard?.setShift(true);
      e.preventDefault();
      return;
    }
    if (keyCode === 'CapsLock') {
      applyKeyboardCapsLockKeydown(keyboard, e);
      e.preventDefault();
      return;
    }
    if (keyCode === 'AltRight') {
      keyboard?.setAltGr(true);
      e.preventDefault();
      return;
    }
    if (isControlShortcut(e, keyCode, keyboard)) return;

    if (e.code === 'Backspace' || e.code === 'Delete') {
      if (keyboard?.state?.activeDeadKey) {
        keyboard.clearDeadKey();
        e.preventDefault();
      }
      return;
    }
    if (e.code.startsWith('Arrow')) return;

    if (keyboard) {
      suppressNativeCompositionAfterInternalKey(lessonInput, e, keyboard, keyCode);
      keyboard.handleKeyClick(keyCode, true);
      e.preventDefault();
    }
  });

  lessonInput.addEventListener('keyup', (e) => {
    const keyboard = getKeyboard();
    if (!keyboard) return;
    const keyCode = remapMacKeyCode(e.code);
    keyboard.releaseKey(keyCode);
    clearNativeCompositionAfterInternalKeyup(lessonInput);
    if (keyCode === 'ShiftLeft' || keyCode === 'ShiftRight') keyboard.setShift(false);
    if (keyCode === 'AltRight') keyboard.setAltGr(false);
    if (keyCode === 'CapsLock') applyKeyboardCapsLockKeyup(keyboard, e);
  });
}

// ── Navigation buttons ──

function setupNavigationButtons(refs, getKeyboard) {
  const { btnNext, btnPrev, btnRestart, btnHint } = refs;

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (!lessonState.data) return;
      const lesson = lessonState.data.modules[lessonState.moduleIndex].lessons[lessonState.lessonIndex];
      if (lessonState.exerciseIndex < lesson.exercises.length - 1) {
        lessonState.exerciseIndex++;
        displayExercise(refs);
        refreshGuidedHint(refs, getKeyboard);
      } else if (lessonState.lessonIndex < lessonState.data.modules[lessonState.moduleIndex].lessons.length - 1) {
        startLesson(lessonState.lessonIndex + 1, refs);
        refreshGuidedHint(refs, getKeyboard);
      }
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (!lessonState.data) return;
      if (lessonState.exerciseIndex > 0) {
        lessonState.exerciseIndex--;
        displayExercise(refs);
        refreshGuidedHint(refs, getKeyboard);
      } else if (lessonState.lessonIndex > 0) {
        const prevLesson = lessonState.data.modules[lessonState.moduleIndex]
          .lessons[lessonState.lessonIndex - 1];
        startLesson(lessonState.lessonIndex - 1, refs, prevLesson.exercises.length - 1);
        refreshGuidedHint(refs, getKeyboard);
      }
    });
  }

  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      lessonState.exerciseIndex = 0;
      displayExercise(refs);
      refreshGuidedHint(refs, getKeyboard);
    });
  }

  if (btnHint) {
    let hintClickTimer = null;

    btnHint.addEventListener('click', () => {
      if (lessonState.guidedHints) {
        setGuidedHintsEnabled(false, refs, getKeyboard);
        return;
      }

      if (hintClickTimer) clearTimeout(hintClickTimer);
      hintClickTimer = setTimeout(() => {
        hintClickTimer = null;
        showCurrentHint(refs, getKeyboard, { announce: true });
      }, 240);
    });

    btnHint.addEventListener('dblclick', () => {
      if (hintClickTimer) {
        clearTimeout(hintClickTimer);
        hintClickTimer = null;
      }
      setGuidedHintsEnabled(true, refs, getKeyboard);
    });

    updateHintButtonState(refs);
  }
}

// ── Mode switching ──

export function switchToMode(mode, refs, getKeyboard, {
  focus = true,
  announce = true,
  onLessonsLoaded = null,
  onLessonsError = null,
  onCharacterIndexLoaded = null,
  onCharacterIndexError = null
} = {}) {
  lessonState.mode = mode;
  startStatsSession(mode === 'lessons' ? 'lesson' : 'libre');
  if (mode !== 'lessons' && lessonState.guidedHints) {
    setGuidedHintsEnabled(false, refs, getKeyboard, { announce: false });
  }
  resetErrorState();

  if (refs.tabLibre) refs.tabLibre.classList.toggle('modal-tab--active', mode === 'libre');
  if (refs.tabLessons) refs.tabLessons.classList.toggle('modal-tab--active', mode === 'lessons');

  updateModeAccessibility(refs, mode, { announce });

  if (mode === 'libre') {
    if (focus) refs.outputEl?.focus();
  } else {
    if (!lessonState.data) {
      loadLessons({
        onLoaded: (data) => {
          populateModuleSelect(refs.moduleSelect);
          if (onLessonsLoaded) onLessonsLoaded(data);
        },
        onError: onLessonsError
      });
    } else if (onLessonsLoaded) {
      onLessonsLoaded(lessonState.data);
    }
    if (!getCharacterIndex()) {
      loadCharacterIndex({
        onLoaded: onCharacterIndexLoaded,
        onError: onCharacterIndexError
      });
    } else if (onCharacterIndexLoaded) {
      onCharacterIndexLoaded(getCharacterIndex());
    }
    if (focus) {
      if (lessonState.lessonIndex >= 0 && refs.lessonExercise && !refs.lessonExercise.hidden) {
        refs.lessonInput?.focus();
      } else {
        refs.moduleSelect?.focus();
      }
    }
  }
}

// ── Tab keyboard navigation ──

function handleModeTabNavigation(e, refs, getKeyboard, modeOptions = {}) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'End') {
    switchToMode('lessons', refs, getKeyboard, { ...modeOptions, focus: false, announce: false });
    refs.tabLessons?.focus();
  } else {
    switchToMode('libre', refs, getKeyboard, { ...modeOptions, focus: false, announce: false });
    refs.tabLibre?.focus();
  }
}

// ── Initialize all lesson mode wiring ──

export function initLessonMode(refs, getKeyboard, modeOptions = {}) {
  // Tab click handlers
  if (refs.tabLibre) refs.tabLibre.addEventListener('click', () => switchToMode('libre', refs, getKeyboard, modeOptions));
  if (refs.tabLessons) refs.tabLessons.addEventListener('click', () => switchToMode('lessons', refs, getKeyboard, modeOptions));

  // Tab keyboard navigation
  if (refs.tabLibre) refs.tabLibre.addEventListener('keydown', (e) => handleModeTabNavigation(e, refs, getKeyboard, modeOptions));
  if (refs.tabLessons) refs.tabLessons.addEventListener('keydown', (e) => handleModeTabNavigation(e, refs, getKeyboard, modeOptions));

  // Module selection
  if (refs.moduleSelect) {
    refs.moduleSelect.addEventListener('change', (e) => {
      updateModuleSelectDoneClass(refs.moduleSelect);
      const idx = parseInt(e.target.value);
      if (isNaN(idx)) {
        lessonState.moduleIndex = -1;
        if (refs.lessonList) refs.lessonList.innerHTML = '';
        const counter = document.getElementById('lesson-module-progress');
        if (counter) counter.hidden = true;
        scheduleLessonScrollControlsUpdate(refs);
        if (refs.lessonExercise) {
          refs.lessonExercise.style.display = 'none';
          refs.lessonExercise.hidden = true;
        }
        if (refs.lessonWelcome) {
          refs.lessonWelcome.style.display = 'block';
          refs.lessonWelcome.hidden = false;
        }
        return;
      }
      lessonState.moduleIndex = idx;
      lessonState.lessonIndex = -1;
      displayLessonList(refs, getKeyboard, modeOptions);
    });
  }

  // Lesson buttons are created dynamically in displayLessonList
  // But we need to append them to the DOM — fix displayLessonList to use refs.lessonList
  setupLessonScrollControls(refs);
  setupLessonInputHandler(refs, getKeyboard, modeOptions);
  setupNavigationButtons(refs, getKeyboard);
}
