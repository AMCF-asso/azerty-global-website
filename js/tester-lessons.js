/**
 * AZERTY Global Tester — Lesson mode
 * Load lessons, display exercises, handle typing input, navigation
 */

import { announceToScreenReaders, updateModeAccessibility } from './tester-accessibility.js';
import { remapMacKeyCode } from './tester-keyboard-input.js';
import { loadCharacterIndex, getCharacterIndex, highlightSearchMethod } from './tester-search.js';
import { insertPlainTextAtSelection, setupPlainTextContentEditable } from './tester-contenteditable.js';
import { getLayerDisplayName } from './tester-platform.js';

// ── Lesson state ──

let cachedTargetChars = null;
let lessonsPromise = null;

export const lessonState = {
  data: null,
  mode: 'libre',
  moduleIndex: -1,
  lessonIndex: -1,
  exerciseIndex: 0,
  lineIndex: 0
};

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

  lessonsPromise = fetch('tester/lessons.json')
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
  moduleSelect.innerHTML = '<option value="">Choisir un module...</option>';
  lessonState.data.modules.forEach((module, idx) => {
    const option = document.createElement('option');
    option.value = idx;
    option.textContent = `${module.icon} ${module.title}`;
    moduleSelect.appendChild(option);
  });
}

// ── Display lesson list ──

function displayLessonList(refs) {
  if (!lessonState.data || !refs.lessonList) return;
  const module = lessonState.data.modules[lessonState.moduleIndex];
  refs.lessonList.innerHTML = '';

  module.lessons.forEach((lesson, idx) => {
    const btn = document.createElement('button');
    btn.textContent = lesson.title;
    btn.className = 'lesson-btn';
    btn.addEventListener('click', () => startLesson(idx, refs));
    refs.lessonList.appendChild(btn);
  });

  if (refs.lessonExercise) {
    refs.lessonExercise.style.display = 'none';
    refs.lessonExercise.hidden = true;
  }
  if (refs.lessonWelcome) {
    refs.lessonWelcome.style.display = 'block';
    refs.lessonWelcome.hidden = false;
  }
}

// ── Start a lesson ──

function startLesson(lessonIdx, refs) {
  lessonState.lessonIndex = lessonIdx;
  lessonState.exerciseIndex = 0;

  if (refs.lessonList) {
    [...refs.lessonList.children].forEach((btn, idx) => {
      btn.classList.toggle('lesson-btn--active', idx === lessonIdx);
    });
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
  refs.lessonInput.style.textAlign = 'center';
  refs.lessonInput.style.color = '#22c55e';
  refs.lessonInput.style.borderColor = '#22c55e';
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
  if (refs.lessonProgress) refs.lessonProgress.textContent = `Exercice ${lessonState.exerciseIndex + 1}/${lesson.exercises.length}`;
  if (refs.lessonInstruction) refs.lessonInstruction.textContent = formatInstructionText(exercise.instruction);

  if (refs.lessonTarget) {
    refs.lessonTarget.innerHTML = exercise.content.split('').map(char => {
      if (char === '\n') return '<span class="target-char target-newline">↵</span><br>';
      return `<span class="target-char">${char === ' ' ? '&nbsp;' : char}</span>`;
    }).join('');
    cachedTargetChars = [...refs.lessonTarget.querySelectorAll('.target-char')];
  }

  if (refs.lessonInput) {
    refs.lessonInput.innerHTML = '';
    refs.lessonInput.style.textAlign = '';
    refs.lessonInput.style.color = '';
    refs.lessonInput.style.borderColor = 'var(--color-accent)';
    refs.lessonInput.setAttribute('contenteditable', 'true');
    refs.lessonInput.focus();
  }

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

function setupLessonInputHandler(refs, getKeyboard) {
  const { lessonInput, lessonTarget } = refs;
  if (!lessonInput) return;

  lessonInput.addEventListener('input', () => {
    if (lessonInput.getAttribute('contenteditable') === 'false') return;
    if (!lessonState.data) return;
    const fullContent = lessonState.data.modules[lessonState.moduleIndex]
      .lessons[lessonState.lessonIndex].exercises[lessonState.exerciseIndex].content;
    const lines = fullContent.split('\n');
    const currentTargetLine = lines[lessonState.lineIndex] || '';
    const inputText = lessonInput.textContent;

    const allTargetChars = cachedTargetChars || [...lessonTarget.querySelectorAll('.target-char')];

    let charOffset = 0;
    for (let i = 0; i < lessonState.lineIndex; i++) {
      charOffset += lines[i].length + 1;
    }

    const currentLineChars = allTargetChars.slice(charOffset, charOffset + currentTargetLine.length);

    [...inputText].forEach((char, idx) => {
      if (idx < currentLineChars.length) {
        if (char === currentTargetLine[idx]) {
          currentLineChars[idx].style.color = '#22c55e';
          currentLineChars[idx].style.textDecoration = 'none';
        } else {
          currentLineChars[idx].style.color = '#ef4444';
          currentLineChars[idx].style.textDecoration = 'underline';
        }
      }
    });

    for (let i = inputText.length; i < currentLineChars.length; i++) {
      currentLineChars[i].style.color = 'var(--text-primary)';
      currentLineChars[i].style.textDecoration = 'none';
    }

    if (inputText === currentTargetLine) {
      lessonInput.style.borderColor = '#22c55e';

      setTimeout(() => {
        lessonInput.style.borderColor = 'var(--color-accent)';
        lessonInput.textContent = '';

        if (lessonState.lineIndex < lines.length - 1) {
          lessonState.lineIndex++;
          const newlineIdx = charOffset + currentTargetLine.length;
          if (allTargetChars[newlineIdx]) {
            allTargetChars[newlineIdx].style.color = '#22c55e';
          }
        } else {
          lessonState.lineIndex = 0;
          const lessonData = lessonState.data.modules[lessonState.moduleIndex].lessons[lessonState.lessonIndex];

          if (lessonState.exerciseIndex < lessonData.exercises.length - 1) {
            lessonState.exerciseIndex++;
            displayExercise(refs);
          } else {
            const currentModule = lessonState.data.modules[lessonState.moduleIndex];
            if (lessonState.lessonIndex < currentModule.lessons.length - 1) {
              lessonState.lessonIndex++;
              lessonState.exerciseIndex = 0;
              setTimeout(() => startLesson(lessonState.lessonIndex, refs), 500);
            } else {
              showModuleCompletion(refs);
            }
          }
        }
      }, 300);
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
  const { btnNext, btnPrev, btnRestart, btnHint, lessonInput, moduleSelect } = refs;

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (!lessonState.data) return;
      const lesson = lessonState.data.modules[lessonState.moduleIndex].lessons[lessonState.lessonIndex];
      if (lessonState.exerciseIndex < lesson.exercises.length - 1) {
        lessonState.exerciseIndex++;
        displayExercise(refs);
      } else if (lessonState.lessonIndex < lessonState.data.modules[lessonState.moduleIndex].lessons.length - 1) {
        startLesson(lessonState.lessonIndex + 1, refs);
      }
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (!lessonState.data) return;
      if (lessonState.exerciseIndex > 0) {
        lessonState.exerciseIndex--;
        displayExercise(refs);
      } else if (lessonState.lessonIndex > 0) {
        lessonState.lessonIndex--;
        const prevLesson = lessonState.data.modules[lessonState.moduleIndex].lessons[lessonState.lessonIndex];
        lessonState.exerciseIndex = prevLesson.exercises.length - 1;
        startLesson(lessonState.lessonIndex, refs);
        lessonState.exerciseIndex = prevLesson.exercises.length - 1;
        displayExercise(refs);
      }
    });
  }

  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      lessonState.exerciseIndex = 0;
      displayExercise(refs);
    });
  }

  if (btnHint) {
    btnHint.addEventListener('click', () => {
      const characterIndex = getCharacterIndex();
      if (!lessonState.data || !characterIndex) return;
      const keyboard = getKeyboard();
      const lesson = lessonState.data.modules[lessonState.moduleIndex].lessons[lessonState.lessonIndex];
      const exercise = lesson.exercises[lessonState.exerciseIndex];

      if (exercise.hintMethod) {
        const { deadKey, baseChar } = exercise.hintMethod;
        const baseCharData = characterIndex.characters[baseChar];
        if (baseCharData?.methods?.[0]) {
          highlightSearchMethod({
            type: 'deadkey',
            deadkey: deadKey,
            key: baseCharData.methods[0].key,
            layer: baseCharData.methods[0].layer || 'Base'
          }, keyboard);
        }
        return;
      }

      const currentChars = lesson.characters || [];
      if (currentChars.length === 0) return;

      const inputText = lessonInput.textContent;
      const targetLines = exercise.content.split('\n');
      const currentTargetLine = targetLines[lessonState.lineIndex] || targetLines[0] || '';
      const nextCharInLineIdx = inputText.length;

      if (nextCharInLineIdx < currentTargetLine.length) {
        const nextChar = currentTargetLine[nextCharInLineIdx];
        const charData = characterIndex.characters[nextChar];
        if (charData?.methods?.length > 0) {
          highlightSearchMethod(charData.methods.find(m => m.recommended) || charData.methods[0], keyboard);
        }
      }
    });
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
      const idx = parseInt(e.target.value);
      if (isNaN(idx)) {
        lessonState.moduleIndex = -1;
        if (refs.lessonList) refs.lessonList.innerHTML = '';
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
      displayLessonList(refs);
    });
  }

  // Lesson buttons are created dynamically in displayLessonList
  // But we need to append them to the DOM — fix displayLessonList to use refs.lessonList
  setupLessonInputHandler(refs, getKeyboard);
  setupNavigationButtons(refs, getKeyboard);
}
