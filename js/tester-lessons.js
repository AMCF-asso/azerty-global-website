/**
 * AZERTY Global Tester — Lesson mode
 * Load lessons, display exercises, handle typing input, navigation
 */

import { announceToScreenReaders, updateModeAccessibility } from './tester-accessibility.js';
import { remapMacKeyCode } from './tester-keyboard-input.js';
import { loadCharacterIndex, getCharacterIndex, highlightSearchMethod, clearHighlightTimeouts, clearAllHighlights } from './tester-search.js?v=final-20260624-9';
import { insertPlainTextAtSelection, setupPlainTextContentEditable } from './tester-contenteditable.js';
import { getLayerDisplayName } from './tester-platform.js';
import { markExerciseDone, isLessonDone, getCompletedExercises, getModuleProgress, isModuleDone } from './tester-progress.js';
import { startSession as startStatsSession, recordKeystroke } from './tester-stats.js';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ── Lesson state ──

let cachedTargetChars = null;
let lessonsPromise = null;
const LESSONS_URL = 'tester/lessons.json?v=final-20260529-3';

const ERROR_HINT_DELAY_MS = 5000;
const ERROR_HINT_MIN_CONSECUTIVE = 2;
const LESSON_SCROLL_EDGE_EPSILON = 2;
const LESSON_SCROLL_MIN_STEP = 180;
const LESSON_SCROLL_STEP_RATIO = 0.72;

const errorState = {
  consecutive: 0,
  lastExpected: null,
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
  clearHighlightTimeouts();
  clearAllHighlights();
}

function scheduleErrorHint(getKeyboard) {
  if (errorState.timeoutId) return;
  errorState.timeoutId = setTimeout(() => {
    errorState.timeoutId = null;
    if (!errorState.lastExpected) return;
    const characterIndex = getCharacterIndex();
    if (!characterIndex) return;
    const charData = characterIndex.characters[errorState.lastExpected];
    if (!charData?.methods?.length) return;
    const method = charData.methods.find(m => m.recommended) || charData.methods[0];
    highlightSearchMethod(method, getKeyboard());
    announceToScreenReaders('Astuce affichée sur le clavier');
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
  refs.btnHint.textContent = '💡 Indice';
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
  const nextCharInLineIdx = inputText.length;

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
  const method = charData.methods.find(m => m.recommended) || charData.methods[0];
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
  if (announce) announceToScreenReaders('Indice affiché sur le clavier');
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
    if (announce) announceToScreenReaders('Indices désactivés');
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
  moduleSelect.innerHTML = '<option value="">Choisir un module...</option>';
  lessonState.data.modules.forEach((module, idx) => {
    const option = document.createElement('option');
    option.value = idx;
    const prefix = isModuleDone(module) ? '✓ ' : '';
    option.textContent = `${prefix}${module.icon} ${module.title}`;
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
    btn.textContent = lesson.title;
    btn.className = 'lesson-btn';
    if (isLessonDone(module.id, lesson)) {
      btn.classList.add('lesson-btn--done');
      btn.setAttribute('aria-label', `${lesson.title} — leçon terminée`);
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
      btn.setAttribute('aria-label', `${lesson.title} — leçon terminée`);
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
    counter.textContent = `${done}/${total} leçons terminées`;
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
  announceToScreenReaders(`Leçon ${lessonIdx + 1} sélectionnée`);
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

  refs.lessonInput.textContent = '🎉 Module terminé !';
  refs.lessonInput.classList.add('lesson-input--done');
  refs.lessonInput.setAttribute('contenteditable', 'false');
  updateNavigationButtons(refs);
  announceToScreenReaders('Module terminé');
}

// ── Display current exercise ──

function displayExercise(refs) {
  if (!lessonState.data) return;
  const module = lessonState.data.modules[lessonState.moduleIndex];
  const lesson = module.lessons[lessonState.lessonIndex];
  const exercise = lesson.exercises[lessonState.exerciseIndex];

  lessonState.lineIndex = 0;

  if (refs.lessonTitle) refs.lessonTitle.textContent = `${module.icon} ${lesson.title}`;
  if (refs.lessonProgress) {
    const completed = getCompletedExercises(module.id, lesson);
    const dots = lesson.exercises.map((_, i) => {
      const done = completed.includes(i);
      return `<span class="exercise-dot${done ? ' exercise-dot--done' : ''}" aria-hidden="true">●</span>`;
    }).join('');
    refs.lessonProgress.innerHTML = `Exercice ${lessonState.exerciseIndex + 1}/${lesson.exercises.length} <span class="exercise-dots">${dots}</span>`;
  }
  if (refs.lessonInstruction) refs.lessonInstruction.textContent = formatInstructionText(exercise.instruction);

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
    refs.lessonInstruction.textContent = formatInstructionText(exercise.instruction);
  }
}

// ── Input handler (typing comparison) ──

function setupLessonInputHandler(refs, getKeyboard, modeOptions = {}) {
  const { lessonInput, lessonTarget } = refs;
  if (!lessonInput) return;

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
          errorState.consecutive++;
          errorState.lastExpected = expected;
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
    allowTransfer: false
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

    if (keyCode === 'ShiftLeft' || keyCode === 'ShiftRight') {
      keyboard?.setShift(true);
      e.preventDefault();
      return;
    }
    if (keyCode === 'CapsLock') {
      keyboard?.setCaps(e.getModifierState('CapsLock'));
      e.preventDefault();
      return;
    }
    if (keyCode === 'AltRight') {
      keyboard?.setAltGr(true);
      e.preventDefault();
      return;
    }
    if ((e.ctrlKey && !e.altKey) || e.metaKey) return;

    if (e.code === 'Backspace' || e.code === 'Delete') {
      if (keyboard?.state?.activeDeadKey) {
        keyboard.clearDeadKey();
        e.preventDefault();
      }
      return;
    }
    if (e.code.startsWith('Arrow')) return;

    if (keyboard) {
      keyboard.handleKeyClick(keyCode, true);
      e.preventDefault();
    }
  });

  lessonInput.addEventListener('keyup', (e) => {
    const keyboard = getKeyboard();
    if (!keyboard) return;
    const keyCode = remapMacKeyCode(e.code);
    keyboard.releaseKey(keyCode);
    if (keyCode === 'ShiftLeft' || keyCode === 'ShiftRight') keyboard.setShift(false);
    if (keyCode === 'AltRight') keyboard.setAltGr(false);
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
