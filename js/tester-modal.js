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
  DEAD_KEY_NAMES_FR, loadCharacterIndex,
  createModalCharacterTooltips, setupSearchHandlers, clearHighlightTimeouts
} from './tester-search.js';
import { lessonState, switchToMode, initLessonMode, rerenderCurrentExercise } from './tester-lessons.js';
import { insertPlainTextAtSelection } from './tester-contenteditable.js';
import { ensureTesterModal } from './tester-modal-template.js';
import { getDetectedTesterPlatform, setTesterPlatform } from './tester-platform.js';

// ── Keyboard preview (hero section, touch tap-to-expand) ──

export function initKeyboardPreview() {
  const keyboard = document.querySelector('.hero__keyboard');
  if (!keyboard) return;

  keyboard.addEventListener('click', function (e) {
    if (window.matchMedia('(hover: none)').matches) {
      e.stopPropagation();
      this.classList.add('is-full');
    }
  });

  document.addEventListener('click', function (e) {
    if (window.matchMedia('(hover: none)').matches) {
      if (!keyboard.contains(e.target)) {
        keyboard.classList.remove('is-full');
      }
    }
  });
}

// ── Main tester modal ──

export function initTesterModal(config = {}) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const openBtn = document.getElementById('open-tester-btn');

  if (isMobile) {
    if (openBtn) openBtn.style.display = 'none';

    const heroActions = document.querySelector('.hero__actions');
    if (heroActions && !document.getElementById('mobile-tester-notice')) {
      const notice = document.createElement('div');
      notice.id = 'mobile-tester-notice';
      notice.style.cssText = 'background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; text-align: center; margin-bottom: var(--space-4);';
      notice.innerHTML = `
        <div style="font-size: 1.2rem; margin-bottom: 8px;">💻</div>
        <div style="font-size: 14px; color: var(--text-secondary);">
          Le testeur interactif est disponible uniquement sur ordinateur (Windows, macOS, Linux).
        </div>
      `;
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
    const noteHTML = '<div class="tester-portable-note">' +
      '<span>⚠️ L\'application du Microsoft Store semble active. Désactivez-la temporairement ' +
      '(Ctrl + Maj + Verr. Maj.) pour utiliser le testeur.</span>' +
      '<button class="tester-portable-note__close" aria-label="Fermer">&times;</button>' +
      '</div>';

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
      const parent = modal.querySelector('.tester-modal__output');
      if (!parent || parent.querySelector('.tester-portable-note')) return;
      parent.insertAdjacentHTML('beforeend', noteHTML);
      const note = parent.querySelector('.tester-portable-note');
      const closeBtn = note.querySelector('.tester-portable-note__close');
      closeBtn.addEventListener('click', () => {
        note.style.opacity = '0';
        setTimeout(() => note.remove(), 300);
      });
    }

    modal.addEventListener('keydown', onKeyForDetection, true);
  }

  // ── Capture DOM references ──

  const refs = {
    modal,
    modalContent: modal.querySelector('.tester-modal__content'),
    closeBtn: modal.querySelector('.tester-modal__close'),
    overlay: modal.querySelector('.tester-modal__overlay'),
    tabsContainer: modal.querySelector('.modal-tabs'),
    openBtn,
    outputEl: document.getElementById('modal-output'),
    searchInput: document.getElementById('modal-search-input'),
    searchResults: document.getElementById('modal-search-results'),
    tabLibre: document.getElementById('tab-libre'),
    tabLessons: document.getElementById('tab-lessons'),
    modeLibre: document.getElementById('mode-libre'),
    modeLessons: document.getElementById('mode-lessons'),
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

  function scheduleCharacterTooltips(attemptsLeft = 8) {
    if (attemptsLeft <= 0) return;

    const keyChars = document.querySelectorAll('#modal-keyboard-container .key .key-char');
    const hasRenderedCharacters = [...keyChars].some((charSpan) => charSpan.textContent.trim().length > 0);

    if (!hasRenderedCharacters) {
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

    if (refs.searchInput?.value.trim()) {
      refs.searchInput.dispatchEvent(new Event('input'));
    }
  }

  function ensureModalNoticeHost() {
    if (refs.noticeHost?.isConnected) return refs.noticeHost;

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

  function openModal() {
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : openBtn;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    openBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';

    // Handle initial configuration
    if (config.initialMode === 'lessons') {
      switchToMode('lessons', refs, getKeyboard, { ...loadingCallbacks, focus: false, announce: false });

      if (config.initialLesson) {
        waitForDataInterval = setInterval(() => {
          const modSelect = document.getElementById('lesson-module-select');
          if (modSelect && modSelect.options.length > 1) {
            clearInterval(waitForDataInterval);
            waitForDataInterval = null;

            modSelect.value = config.initialLesson.moduleIndex;
            modSelect.dispatchEvent(new Event('change'));

            setTimeout(() => {
              const list = document.getElementById('lesson-list');
              if (list && list.children[config.initialLesson.lessonIndex]) {
                list.children[config.initialLesson.lessonIndex].click();
              }
            }, 50);
          }
        }, 50);
      }
    }

    if (!keyboard) {
      keyboard = new AZERTYKeyboard('#modal-keyboard-container', {
        layoutUrl: 'tester/azerty-global.json',
        onLayoutLoaded: () => {
          clearModalNotice('layout-load');
          scheduleWidthSync();
          scheduleCharacterTooltips();
        },
        onLayoutError: () => {
          showModalNotice(
            'layout-load',
            'Le clavier visuel n’a pas pu être chargé. Réessayez.',
            () => keyboard?.loadLayout('tester/azerty-global.json')
          );
        },
        onKeyClick: (char) => {
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
    if (widthSyncTimeout) {
      clearTimeout(widthSyncTimeout);
      widthSyncTimeout = null;
    }
    if (waitForDataInterval) {
      clearInterval(waitForDataInterval);
      waitForDataInterval = null;
    }
    keyboard?.reset();
    if (restoreFocus && lastFocusedElement?.isConnected) {
      lastFocusedElement.focus();
    }
  }

  function focusPreferredElement() {
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

  openBtn.addEventListener('click', openModal);
  refs.closeBtn.addEventListener('click', closeModal);
  refs.overlay.addEventListener('click', closeModal);

  // Load character index on open and retry cleanly after transient failures.
  openBtn.addEventListener('click', async () => {
    const index = await loadCharacterIndex({
      onLoaded: loadingCallbacks.onCharacterIndexLoaded,
      onError: loadingCallbacks.onCharacterIndexError
    });
    if (index) {
      scheduleCharacterTooltips();
    }
  });

  // Physical keyboard handlers
  setupModalKeyboardHandlers(refs, getKeyboard, closeModal);

  // Search handlers
  setupSearchHandlers(refs, getKeyboard);

  // Lesson mode handlers
  initLessonMode(refs, getKeyboard, loadingCallbacks);

  // Auto-open if requested
  if (config.autoOpen) {
    openModal();
  }
}
