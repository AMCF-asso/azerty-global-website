/**
 * AZERTY Global Tester Modal
 * Orchestration module — modal open/close, keyboard init, platform selector
 * Sub-modules: tester-accessibility, tester-keyboard-input, tester-search, tester-lessons
 */

import { AZERTYKeyboard } from '../tester/keyboard.js';
import {
  ensureScreenReaderElement, setLiveRegion,
  applyModalAccessibilityAttributes,
  closeSearchResults
} from './tester-accessibility.js';
import { setupModalKeyboardHandlers } from './tester-keyboard-input.js';
import {
  DEAD_KEY_NAMES_FR, loadCharacterIndex, getCharacterIndex,
  createModalCharacterTooltips, setupSearchHandlers, clearHighlightTimeouts
} from './tester-search.js?v=final-20260529-3';
import { lessonState, switchToMode, initLessonMode, rerenderCurrentExercise } from './tester-lessons.js?v=final-20260529-3';
import {
  shouldAutoStartTutorial,
  getTutorialPreludeIdFromCurrentPage,
  initTutorialMode,
  startTutorial,
  isTutorialActive,
  isTutorialFinalVisible,
  handleTutorialCharacter,
  updateTutorialGuidance,
  suspendTutorialGuidance,
  resumeTutorialGuidance,
  clearTutorialVisuals,
  resetCompletedTutorialView
} from './tester-tutorial.js?v=final-20260603-1';
import { insertPlainTextAtSelection } from './tester-contenteditable.js';
import { ensureTesterModal } from './tester-modal-template.js?v=final-20260603-2';
import { getDetectedTesterPlatform, setTesterPlatform } from './tester-platform.js';
import { initTesterDiagnostic, openTesterDiagnostic } from './tester-diagnostic.js?v=final-20260603-2';

// ── Main tester modal ──
const TESTER_LAYOUT_URL = 'tester/azerty-global.json?v=final-20260529-3';
const CONFIGURED_LESSON_WAIT_TIMEOUT_MS =
  Number(globalThis.__AZERTY_CONFIGURED_LESSON_WAIT_TIMEOUT_MS) || 10000;

export function initTesterModal(config = {}) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const openBtn = document.getElementById('open-tester-btn');

  if (isMobile) {
    if (openBtn) openBtn.style.display = 'none';

    const heroActions = document.querySelector('.hero__actions');
    if (heroActions && !document.getElementById('mobile-tester-notice')) {
      const notice = document.createElement('div');
      notice.id = 'mobile-tester-notice';
      notice.className = 'mobile-tester-notice';
      notice.innerHTML = '<span class="mobile-tester-notice__icon">💻</span>' +
        '<span class="mobile-tester-notice__text">Le testeur interactif est disponible uniquement sur ordinateur.</span>';
      heroActions.insertBefore(notice, heroActions.firstChild);
    }
    return;
  }

  const modal = ensureTesterModal();
  if (!modal) return;

  // Detect AZERTY Global Store app active on the system.
  // The app uses a low-level keyboard hook (WH_KEYBOARD_LL) that intercepts keystrokes
  // and re-injects remapped characters via SendInput with KEYEVENTF_UNICODE.
  // These injected events arrive in the browser with event.code = '' or 'Unidentified'
  // (because wVk=0 and wScan=charCode), while event.key contains the character.
  // Normal physical keystrokes always have a valid event.code (e.g. 'KeyA', 'Digit1').
  // Detecting a keydown with empty event.code + printable event.key = app is active.
  if (navigator.userAgent.includes('Windows')) {
    let warningShown = false;

    function onKeyForDetection(e) {
      if (warningShown) return;
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

      // KEYEVENTF_UNICODE injections have empty or 'Unidentified' event.code
      // but a valid printable character in event.key
      if ((!e.code || e.code === 'Unidentified') && e.key.length === 1) {
        warningShown = true;
        modal.removeEventListener('keydown', onKeyForDetection, true);
        showAppWarning();
      }
    }

    function showAppWarning() {
      const parent = modal.querySelector('.tester-modal__notices');
      if (!parent || parent.querySelector('[data-notice-id="store-app-active"]')) return;

      const note = document.createElement('div');
      note.className = 'tester-portable-note';
      note.dataset.noticeId = 'store-app-active';

      const text = document.createElement('span');
      text.textContent = "L'application du Microsoft Store semble active. Désactivez-la temporairement (Ctrl + Maj + Verr. Maj.) pour utiliser le testeur.";
      note.appendChild(text);

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'tester-portable-note__close';
      closeBtn.setAttribute('aria-label', 'Fermer');
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', () => {
        note.style.opacity = '0';
        setTimeout(() => note.remove(), 300);
      });
      note.appendChild(closeBtn);

      parent.appendChild(note);
    }

    modal.addEventListener('keydown', onKeyForDetection, true);
  }

  // ── Capture DOM references ──

  const refs = {
    modal,
    modalContent: modal.querySelector('.tester-modal__content'),
    closeBtn: modal.querySelector('.tester-modal__close'),
    overlay: modal.querySelector('.tester-modal__overlay'),
    noticeHost: modal.querySelector('.tester-modal__notices'),
    tabsContainer: modal.querySelector('.modal-tabs'),
    openBtn,
    outputEl: document.getElementById('modal-output'),
    searchInput: document.getElementById('modal-search-input'),
    searchResults: document.getElementById('modal-search-results'),
    tabLibre: document.getElementById('tab-libre'),
    tabLessons: document.getElementById('tab-lessons'),
    modeLibre: document.getElementById('mode-libre'),
    modeLessons: document.getElementById('mode-lessons'),
    lessonNav: document.getElementById('lesson-nav'),
    moduleSelect: document.getElementById('lesson-module-select'),
    lessonList: document.getElementById('lesson-list'),
    lessonExercise: document.getElementById('lesson-exercise'),
    lessonWelcome: document.getElementById('lesson-welcome'),
    lessonTitle: document.getElementById('lesson-title'),
    lessonProgress: document.getElementById('lesson-progress'),
    lessonInstruction: document.getElementById('lesson-instruction'),
    lessonTarget: document.getElementById('lesson-target'),
    lessonInput: document.getElementById('lesson-input'),
    btnPrev: document.getElementById('lesson-prev'),
    btnNext: document.getElementById('lesson-next'),
    btnRestart: document.getElementById('lesson-restart'),
    btnHint: document.getElementById('lesson-hint')
  };

  // ── Keyboard instance ──

  let keyboard = null;
  let lastFocusedElement = null;
  let waitForDataInterval = null;
  let resizeObserver = null;
  let widthSyncTimeout = null;
  let forceTutorialStartPending = !!config.forceTutorialStart;
  const detectedPlatform = getDetectedTesterPlatform();

  function getKeyboard() { return keyboard; }

  function syncModalWidths() {
    const keyboardEl = document.querySelector('#modal-keyboard-container .azerty-keyboard');
    const outputWrapper = document.querySelector('.tester-modal__output');
    const searchContainer = document.querySelector('.modal-search-container');

    if (!keyboardEl || !outputWrapper) return;

    const kbWidth = keyboardEl.offsetWidth;
    if (!kbWidth) return;

    const width = kbWidth + 'px';
    outputWrapper.style.width = width;
    outputWrapper.style.maxWidth = width;

    if (searchContainer) {
      searchContainer.style.width = width;
      searchContainer.style.maxWidth = width;
    }
  }

  function scheduleWidthSync(delay = 0) {
    if (widthSyncTimeout) {
      clearTimeout(widthSyncTimeout);
    }

    widthSyncTimeout = setTimeout(() => {
      requestAnimationFrame(syncModalWidths);
    }, delay);
  }

  function scheduleCharacterTooltips(attemptsLeft = 50) {
    if (attemptsLeft <= 0) return;

    const keyChars = document.querySelectorAll('#modal-keyboard-container .key .key-char');
    const hasRenderedCharacters = [...keyChars].some((charSpan) => charSpan.textContent.trim().length > 0);
    const indexReady = !!getCharacterIndex();

    if (!hasRenderedCharacters || !indexReady) {
      setTimeout(() => scheduleCharacterTooltips(attemptsLeft - 1), 100);
      return;
    }

    createModalCharacterTooltips();
  }

  function updatePlatformUi(platform) {
    const altgrLabel = document.getElementById('modal-status-altgr');
    if (altgrLabel) {
      altgrLabel.textContent = platform === 'mac' ? '● Option' : '● AltGr';
    }

    rerenderCurrentExercise(refs);
    updateTutorialGuidance();

    if (refs.searchInput?.value.trim()) {
      refs.searchInput.dispatchEvent(new Event('input'));
    }
  }

  function ensureModalNoticeHost() {
    if (refs.noticeHost?.isConnected) return refs.noticeHost;

    const existingHost = refs.modalContent?.querySelector('.tester-modal__notices');
    if (existingHost) {
      refs.noticeHost = existingHost;
      return existingHost;
    }

    const host = document.createElement('div');
    host.className = 'tester-modal__notices';

    const wrapper = refs.modalContent?.querySelector('.tester-modal__keyboard-wrapper');
    if (wrapper) {
      refs.modalContent.insertBefore(host, wrapper);
    } else {
      refs.modalContent?.appendChild(host);
    }

    refs.noticeHost = host;
    return host;
  }

  function clearModalNotice(id) {
    if (!refs.noticeHost) return;

    if (!id) {
      refs.noticeHost.innerHTML = '';
      return;
    }

    refs.noticeHost.querySelector(`[data-notice-id="${id}"]`)?.remove();
  }

  function showModalNotice(id, message, retryHandler = null) {
    const host = ensureModalNoticeHost();
    clearModalNotice(id);

    const notice = document.createElement('div');
    notice.className = 'tester-notice tester-notice--error';
    notice.dataset.noticeId = id;

    const text = document.createElement('span');
    text.className = 'tester-notice__text';
    text.textContent = message;
    notice.appendChild(text);

    if (retryHandler) {
      const retryButton = document.createElement('button');
      retryButton.type = 'button';
      retryButton.className = 'tester-notice__action';
      retryButton.textContent = 'Réessayer';
      retryButton.addEventListener('click', retryHandler);
      notice.appendChild(retryButton);
    }

    host.appendChild(notice);
  }

  // ── Accessibility setup ──

  const modalTitle = ensureScreenReaderElement(modal, refs.modalContent, 'tester-modal-title', 'h2', 'Testeur AZERTY Global');
  const modalDescription = ensureScreenReaderElement(modal, refs.modalContent,
    'tester-modal-description', 'p',
    'Testez la disposition AZERTY Global, recherchez des caractères et suivez des leçons au clavier.'
  );
  const modalLiveRegion = ensureScreenReaderElement(modal, refs.modalContent,
    'tester-modal-live-region', 'div', '',
    { 'aria-live': 'polite', 'aria-atomic': 'true', role: 'status' }
  );
  setLiveRegion(modalLiveRegion);

  applyModalAccessibilityAttributes(refs, modalTitle, modalDescription);

  const loadingCallbacks = {
    onLessonsLoaded: () => {
      clearModalNotice('lessons-load');
    },
    onLessonsError: () => {
      showModalNotice(
        'lessons-load',
        'Les leçons n’ont pas pu être chargées. Réessayez dans quelques instants.',
        () => switchToMode('lessons', refs, getKeyboard, { ...loadingCallbacks, focus: false, announce: false })
      );
    },
    onCharacterIndexLoaded: () => {
      clearModalNotice('search-index-load');
      scheduleCharacterTooltips();
      updateTutorialGuidance();
      if (refs.searchInput?.value.trim()) {
        refs.searchInput.dispatchEvent(new Event('input'));
      }
    },
    onCharacterIndexError: () => {
      showModalNotice(
        'search-index-load',
        'La recherche de caractères est temporairement indisponible. Réessayez.',
        () => loadCharacterIndex({
          onLoaded: loadingCallbacks.onCharacterIndexLoaded,
          onError: loadingCallbacks.onCharacterIndexError
        })
      );
    }
  };

  // ── Modal open/close ──

  function clearConfiguredLessonWait() {
    if (!waitForDataInterval) return;
    clearInterval(waitForDataInterval);
    waitForDataInterval = null;
  }

  function showConfiguredLessonFallbackNotice() {
    showModalNotice(
      'configured-lesson-load',
      'La leçon demandée n’a pas pu être ouverte automatiquement. Choisissez-la dans la liste ou réessayez.'
    );
  }

  function openConfiguredLesson() {
    if (!config.initialLesson) return true;

    const modSelect = refs.moduleSelect || document.getElementById('lesson-module-select');
    const list = refs.lessonList || document.getElementById('lesson-list');

    if (!modSelect || modSelect.options.length <= 1) return false;

    const moduleValue = String(config.initialLesson.moduleIndex);
    const moduleExists = [...modSelect.options].some(option => option.value === moduleValue);
    if (!moduleExists) {
      showConfiguredLessonFallbackNotice();
      return true;
    }

    clearModalNotice('configured-lesson-load');
    modSelect.value = moduleValue;
    modSelect.dispatchEvent(new Event('change'));

    const lessonButton = list?.children?.[config.initialLesson.lessonIndex];
    if (!lessonButton) {
      showConfiguredLessonFallbackNotice();
      return true;
    }

    lessonButton.click();
    return true;
  }

  function scheduleConfiguredLessonOpen() {
    if (!config.initialLesson) return;

    clearConfiguredLessonWait();
    const startedAt = Date.now();
    let finished = false;

    const tryOpen = () => {
      if (finished) return;

      if (openConfiguredLesson()) {
        finished = true;
        clearConfiguredLessonWait();
        return;
      }

      if (Date.now() - startedAt >= CONFIGURED_LESSON_WAIT_TIMEOUT_MS) {
        finished = true;
        clearConfiguredLessonWait();
        showConfiguredLessonFallbackNotice();
      }
    };

    tryOpen();
    if (!finished) {
      waitForDataInterval = setInterval(tryOpen, 50);
    }
  }

  function openModal() {
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : openBtn;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    openBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';

    const shouldForceTutorialStart = forceTutorialStartPending;
    const autoStartTutorial = shouldForceTutorialStart || (!config.suppressTutorial && shouldAutoStartTutorial());
    if (!autoStartTutorial) {
      resetCompletedTutorialView(refs);
    }

    if (autoStartTutorial) {
      forceTutorialStartPending = false;
      switchToMode('lessons', refs, getKeyboard, { ...loadingCallbacks, focus: false, announce: false });
      startTutorial(refs, getKeyboard, {
        introId: getTutorialPreludeIdFromCurrentPage(),
        manual: shouldForceTutorialStart
      }).catch((error) => {
        console.error('Error starting tutorial:', error);
        showModalNotice('tutorial-load', 'Le tutoriel n’a pas pu être chargé. Réessayez dans quelques instants.');
      });
    } else if (config.initialMode === 'lessons') {
      switchToMode('lessons', refs, getKeyboard, { ...loadingCallbacks, focus: false, announce: false });
      scheduleConfiguredLessonOpen();
    } else {
      switchToMode('libre', refs, getKeyboard, { ...loadingCallbacks, focus: false, announce: false });
    }

    if (!keyboard) {
      keyboard = new AZERTYKeyboard('#modal-keyboard-container', {
        layoutUrl: TESTER_LAYOUT_URL,
        onLayoutLoaded: () => {
          clearModalNotice('layout-load');
          scheduleWidthSync();
          scheduleCharacterTooltips();
          updateTutorialGuidance();
        },
        onLayoutError: () => {
          showModalNotice(
            'layout-load',
            'Le clavier visuel n’a pas pu être chargé. Réessayez.',
            () => keyboard?.loadLayout(TESTER_LAYOUT_URL)
          );
        },
        onKeyClick: (char) => {
          if (isTutorialActive() && handleTutorialCharacter(char)) {
            return;
          }

          const targetEl = (lessonState.mode === 'lessons' && lessonState.lessonIndex >= 0)
            ? document.getElementById('lesson-input')
            : refs.outputEl;

          insertPlainTextAtSelection(targetEl, char, {
            dispatchInput: targetEl.id === 'lesson-input'
          });
          requestAnimationFrame(() => { targetEl.scrollTop = targetEl.scrollHeight; });
        },
        onStateChange: (state) => {
          document.getElementById('modal-status-shift').classList.toggle('on', state.shift);
          document.getElementById('modal-status-caps').classList.toggle('on', state.caps);
          document.getElementById('modal-status-altgr').classList.toggle('on', state.altgr);
          document.getElementById('modal-status-deadkey').classList.toggle('on', !!state.activeDeadKey);

          const dkName = state.activeDeadKey
            ? (DEAD_KEY_NAMES_FR[state.activeDeadKey] || state.activeDeadKey)
            : '-';
          document.getElementById('modal-deadkey-name').textContent = dkName;

          updateTutorialGuidance();
        }
      });

      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => {
          syncModalWidths();
        });

        const keyboardContainer = document.getElementById('modal-keyboard-container');
        if (keyboardContainer) {
          resizeObserver.observe(keyboardContainer);
        }
      }

      // Platform selector
      setTimeout(() => {
        const statusBar = document.querySelector('.tester-modal .status-bar');
        if (statusBar && !document.querySelector('.platform-selector')) {
          const platformSelector = document.createElement('div');
          platformSelector.className = 'platform-selector';

          const diagnosticButton = document.createElement('button');
          diagnosticButton.type = 'button';
          diagnosticButton.className = 'platform-btn tester-diagnostic-open tester-diagnostic-open--platform';
          diagnosticButton.textContent = 'Diagnostic OS';
          diagnosticButton.addEventListener('click', () => {
            suspendTutorialGuidance();
            switchToMode('libre', refs, getKeyboard, { ...loadingCallbacks, focus: false, announce: true });
            requestAnimationFrame(() => openTesterDiagnostic(refs));
          });
          platformSelector.appendChild(diagnosticButton);

          const platforms = [
            { label: '🪟 Windows', value: 'windows' },
            { label: '🍎 macOS', value: 'mac' },
            { label: '🐧 Linux', value: 'linux' }
          ];

          platforms.forEach(platform => {
            const btn = document.createElement('button');
            btn.className = 'platform-btn';
            btn.dataset.platform = platform.value;
            btn.textContent = platform.label;

            if (platform.value === detectedPlatform) {
              btn.classList.add('platform-btn--active');
            }

            btn.addEventListener('click', () => {
              document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('platform-btn--active'));
              btn.classList.add('platform-btn--active');
              setTesterPlatform(platform.value);
              keyboard.setPlatform(platform.value);
              updatePlatformUi(platform.value);

              scheduleWidthSync();
            });

            platformSelector.appendChild(btn);
          });

          statusBar.appendChild(platformSelector);
          setTesterPlatform(detectedPlatform);
          keyboard.setPlatform(detectedPlatform);
          updatePlatformUi(detectedPlatform);
          scheduleWidthSync();
        }
      }, 100);
    }

    closeSearchResults(refs.searchResults, refs.searchInput);
    scheduleWidthSync(100);
    focusPreferredElement();
  }

  function closeModal({ restoreFocus = true } = {}) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    openBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    closeSearchResults(refs.searchResults, refs.searchInput);
    clearHighlightTimeouts();
    suspendTutorialGuidance();
    clearTutorialVisuals();
    if (widthSyncTimeout) {
      clearTimeout(widthSyncTimeout);
      widthSyncTimeout = null;
    }
    clearConfiguredLessonWait();
    keyboard?.reset();
    if (restoreFocus && lastFocusedElement?.isConnected) {
      lastFocusedElement.focus();
    }
  }

  function focusPreferredElement() {
    if (isTutorialActive() && !isTutorialFinalVisible()) {
      refs.tutorialInput?.focus();
      return;
    }

    if (lessonState.mode === 'lessons') {
      if (lessonState.lessonIndex >= 0 && refs.lessonExercise && !refs.lessonExercise.hidden) {
        refs.lessonInput?.focus();
        return;
      }
      refs.moduleSelect?.focus();
      return;
    }
    refs.outputEl?.focus();
  }

  // ── Wire up events ──

  openBtn.addEventListener('click', () => {
    openModal();
    loadCharacterIndex({
      onLoaded: loadingCallbacks.onCharacterIndexLoaded,
      onError: loadingCallbacks.onCharacterIndexError
    }).then((index) => {
      if (index) scheduleCharacterTooltips();
    });
  });
  refs.closeBtn.addEventListener('click', closeModal);
  refs.overlay.addEventListener('click', closeModal);

  // Physical keyboard handlers
  setupModalKeyboardHandlers(refs, getKeyboard, closeModal);

  // Search handlers
  setupSearchHandlers(refs, getKeyboard);

  // Lesson mode handlers
  initLessonMode(refs, getKeyboard, loadingCallbacks);

  // Guided tutorial inside lesson mode
  initTutorialMode(refs, getKeyboard, {
    onGlobalSkip: () => {
      if (config.initialMode === 'lessons') {
        switchToMode('lessons', refs, getKeyboard, { ...loadingCallbacks, focus: false, announce: false });
        scheduleConfiguredLessonOpen();
      } else {
        switchToMode('libre', refs, getKeyboard, { ...loadingCallbacks, focus: true, announce: false });
      }
    }
  });

  initTesterDiagnostic(refs, {
    onOpenRequest: () => {
      suspendTutorialGuidance();
      switchToMode('libre', refs, getKeyboard, { ...loadingCallbacks, focus: false, announce: true });
    }
  });

  refs.tabLibre?.addEventListener('click', suspendTutorialGuidance);
  refs.tabLessons?.addEventListener('click', resumeTutorialGuidance);

  // Auto-open if requested
  if (config.autoOpen) {
    openModal();
  }
}
