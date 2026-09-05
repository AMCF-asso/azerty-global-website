/** A self-contained, opt-in tour using the production tester's keyboard engine. */
import { AZERTYKeyboard } from '../tester/keyboard.js?v=final-20260801-1';
import {
  remapMacKeyCode, syncKeyboardModifierStateFromEvent, isControlShortcut,
  applyKeyboardCapsLockKeydown, applyKeyboardCapsLockKeyup,
  reconcileKeyboardCapsLockFromEvent, suppressNativeCompositionAfterInternalKey,
  clearNativeCompositionAfterInternalKeyup, shouldDeferToNativeComposition
} from './tester-keyboard-input.js?v=final-20260801-1';
import {
  insertPlainTextAtSelection, deletePlainTextAtSelection, setPlainTextContent,
  setupPlainTextContentEditable
} from './tester-contenteditable.js?v=final-20260801-1';
import {
  loadCharacterIndex, getPreferredCharacterMethod, getLayerKeys,
  DEAD_KEY_NAMES
} from './tester-search.js?v=final-20260801-1';
import {
  getDetectedTesterPlatform, getTesterPlatform, setTesterPlatform, getLayerDisplayName
} from './tester-platform.js?v=final-20260801-1';

const root = document.getElementById('welcome-trial');
const start = document.getElementById('welcome-start');

if (root && start) initWelcomeTrial();

function initWelcomeTrial() {
  const byId = (name) => document.getElementById(`welcome-${name}`);
  const refs = Object.fromEntries([
    'exercise', 'stage', 'instruction', 'target', 'input', 'status', 'help', 'hint',
    'continue', 'quit', 'platform', 'caps', 'keyboard-container', 'themes', 'count',
    'lesson-link', 'error'
  ].map((name) => [name, byId(name)]));
  if (Object.entries(refs).some(([name, value]) => !value && !['lesson-link', 'error'].includes(name))) return;

  let data, lessons, index, keyboard, loading;
  let active = false;
  let exercises = [];
  let exerciseIndex = 0;
  let theme = null;
  let complete = false;
  let introComplete = false;
  let capsSeen = false;
  let capsSource = 'physical';
  let hintVisible = false;
  let hintTimer;
  let startRequest = 0;
  let engineText = '';
  let inputSelection = null;
  let editingWithEngine = false;
  const discoveries = new Set();
  const doneThemes = new Set();

  const text = (key, fallback) => data?.ui?.[key] || fallback;
  const current = () => exercises[exerciseIndex];
  const showStatus = (value) => { refs.status.textContent = value; };
  const showError = (error) => {
    if (refs.error) {
      refs.error.textContent = error;
      refs.error.hidden = false;
    } else showStatus(error);
  };

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response.json();
  }

  function prepareKeys() {
    // The shared engine renders pointer targets. Add a single roving keyboard stop.
    let first = true;
    keyboard.keyElements.forEach((key, id) => {
      key.setAttribute('role', 'button');
      key.setAttribute('aria-label', keyName(id));
      key.tabIndex = first ? 0 : -1;
      first = false;
    });
  }

  function keyName(id) {
    const labels = {
      Space: 'Espace', CapsLock: 'Verr. Maj.', ShiftLeft: 'Maj', ShiftRight: 'Maj',
      AltLeft: getTesterPlatform() === 'mac' ? 'Option' : 'Alt',
      AltRight: getTesterPlatform() === 'mac' ? 'Option' : 'AltGr',
      Backspace: 'Retour arrière', Enter: 'Entrée', Tab: 'Tabulation',
      ControlLeft: 'Ctrl', ControlRight: 'Ctrl', MetaLeft: 'Commande', MetaRight: 'Commande'
    };
    if (labels[id]) return labels[id];
    const base = keyboard?.layout?.[id]?.[0];
    if (typeof base === 'string' && !base.startsWith('dk_')) return base;
    if (typeof base === 'string' && base.startsWith('dk_')) {
      return keyboard.deadkeys?.[base]?.[' '] || DEAD_KEY_NAMES[base] || id;
    }
    return keyboard?.keyElements.get(id)?.querySelector('.key-label')?.textContent || id;
  }

  async function load() {
    if (loading) return loading;
    loading = Promise.all([
      fetchJson('/tester/welcome.json'), fetchJson('/tester/lessons.json'),
      fetchJson('/tester/azerty-global.json?v=final-20260801-1'), loadCharacterIndex()
    ]).then(([welcomeData, lessonsData, layout, characterIndex]) => {
      if (!welcomeData.intro?.length || !characterIndex?.characters || !layout.keymap || !layout.deadkeys) {
        throw new Error('Invalid welcome data');
      }
      data = welcomeData;
      lessons = lessonsData;
      index = characterIndex.characters;
      keyboard = new AZERTYKeyboard(refs['keyboard-container'], {
        onKeyClick: handleCharacter,
        onStateChange: () => {
          if (!active) return;
          updateCaps();
          if (!complete) refreshHint();
        }
      });
      keyboard.setLayout(layout.keymap, layout.deadkeys);
      keyboard.setPlatform(setTesterPlatform(refs.platform.value));
      prepareKeys();
      updateCount();
    }).catch((error) => {
      loading = null;
      throw error;
    });
    return loading;
  }

  refs.platform.value = getDetectedTesterPlatform();
  refs.input.setAttribute('inputmode', 'none');
  setupPlainTextContentEditable(refs.input, { allowComposition: false, allowTransfer: false });

  function readInputSelection() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !refs.input.contains(selection.anchorNode) || !refs.input.contains(selection.focusNode)) return null;
    const offset = (node, position) => {
      const prefix = document.createRange();
      prefix.selectNodeContents(refs.input);
      prefix.setEnd(node, position);
      return prefix.toString().length;
    };
    return {
      anchor: offset(selection.anchorNode, selection.anchorOffset),
      focus: offset(selection.focusNode, selection.focusOffset)
    };
  }

  function editWithEngine(mutate) {
    editingWithEngine = true;
    try { mutate(); } finally { editingWithEngine = false; }
  }

  // Every accepted character is produced by the layout engine, including visual clicks.
  refs.input.addEventListener('beforeinput', (event) => {
    inputSelection = readInputSelection();
    event.preventDefault();
  });
  refs.input.addEventListener('input', () => {
    // Firefox composition can mutate the field after a non-cancelable
    // beforeinput. Only our helpers' synchronous inputs may update progress.
    if (!editingWithEngine) {
      setPlainTextContent(refs.input, engineText);
      if (inputSelection) {
        const node = refs.input.firstChild || refs.input;
        window.getSelection()?.setBaseAndExtent(
          node, Math.min(inputSelection.anchor, engineText.length),
          node, Math.min(inputSelection.focus, engineText.length)
        );
      }
      return;
    }
    engineText = refs.input.textContent;
    inputSelection = readInputSelection();
    checkInput();
  });

  start.addEventListener('click', async (event) => {
    event.preventDefault();
    const initialCaps = typeof event.getModifierState === 'function' && event.getModifierState('CapsLock');
    const request = ++startRequest;
    root.hidden = false;
    root.setAttribute('aria-busy', 'true');
    root.tabIndex = -1;
    root.scrollIntoView({ block: 'start' });
    root.focus({ preventScroll: true });
    if (refs.error) refs.error.hidden = true;
    try {
      await load();
      if (request !== startRequest) return;
      active = true;
      keyboard.reset();
      capsSource = 'physical';
      keyboard.setCaps(initialCaps);
      if (introComplete) showThemes();
      else {
        theme = null;
        exercises = data.intro;
        exerciseIndex = 0;
        renderExercise();
      }
    } catch {
      showError(text('error', 'Le clavier n’a pas pu être chargé. Réessayez avec le bouton de départ.'));
    } finally {
      if (request === startRequest) root.removeAttribute('aria-busy');
    }
  });

  function quit() {
    ++startRequest;
    active = false;
    clearTimeout(hintTimer);
    keyboard?.reset();
    root.hidden = true;
    root.removeAttribute('aria-busy');
    start.focus();
  }

  refs.quit.addEventListener('click', quit);
  root.addEventListener('keydown', (event) => {
    if (event.code === 'Escape' || event.key === 'Escape') {
      event.preventDefault();
      quit();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.code === 'CapsLock' && active && event.target !== refs.input) {
      // Continue, Help and platform controls may own focus between two gestures.
      capsSource = 'physical';
      applyKeyboardCapsLockKeydown(keyboard, event);
      event.preventDefault();
    }
  });

  refs.platform.addEventListener('change', () => {
    setTesterPlatform(refs.platform.value);
    if (!keyboard) return;
    keyboard.setShift(false);
    keyboard.setAltGr(false);
    keyboard.clearDeadKey();
    keyboard.setPlatform(getTesterPlatform());
    prepareKeys();
    updateInstruction();
    refreshHint();
  });

  function updateInstruction() {
    if (!current()) return;
    refs.instruction.textContent = getTesterPlatform() === 'mac'
      ? current().instructionMac || current().instruction
      : current().instruction;
  }

  function renderExercise() {
    complete = false;
    capsSeen = false;
    hintVisible = false;
    keyboard.clearDeadKey();
    keyboard.setShift(false);
    keyboard.setAltGr(false);
    refs.themes.hidden = true;
    refs.exercise.hidden = false;
    refs['keyboard-container'].hidden = false;
    refs.continue.hidden = true;
    refs.input.setAttribute('contenteditable', 'true');
    refs.input.removeAttribute('aria-invalid');
    refs.input.setAttribute('aria-readonly', 'false');
    refs.target.textContent = current().content;
    refs.stage.textContent = `${theme?.title || text('introTitle', 'Premiers gestes')} · ${exerciseIndex + 1}/${exercises.length}`;
    root.dataset.phase = theme ? 'theme' : 'intro';
    root.dataset.exercise = current().id || String(exerciseIndex);
    updateInstruction();
    engineText = '';
    inputSelection = null;
    setPlainTextContent(refs.input, engineText);
    showStatus('');
    refs.hint.textContent = '';
    refs.help.setAttribute('aria-pressed', 'false');
    updateCaps();
    clearHighlights();
    refs.input.focus({ preventScroll: true });
    armHint();
  }

  function capsBlocked() {
    if (current()?.capsRequired === true) return !keyboard.state.caps;
    if (current()?.capsRequired === false) return keyboard.state.caps;
    return false;
  }

  function updateCaps() {
    refs.caps.dataset.active = String(keyboard.state.caps);
    refs.caps.textContent = keyboard.state.caps
      ? text('capsOn', 'Verr. Maj. activé') : text('capsOff', 'Verr. Maj. désactivé');
    if (current()?.capsRequired === true && keyboard.state.caps) capsSeen = true;
  }

  function handleCharacter(character) {
    if (!active || complete || refs.exercise.hidden || !character || character === '\n') return;
    if (capsBlocked()) {
      hintVisible = true;
      refreshHint();
      return;
    }
    // Keep the literal engine output. Caps Lock is never faked by transforming text.
    editWithEngine(() => insertPlainTextAtSelection(refs.input, character, { dispatchInput: true }));
    for (const char of character) if (!/\s/u.test(char)) discoveries.add(char);
    updateCount();
    armHint();
  }

  function prefixLength() {
    const entered = Array.from(refs.input.textContent);
    const target = Array.from(current().content);
    let position = 0;
    while (position < entered.length && entered[position] === target[position]) position++;
    return { position, entered, target };
  }

  function checkInput() {
    if (!active || complete || !current()) return;
    const { position, entered, target } = prefixLength();
    const mismatch = position < entered.length;
    refs.input.setAttribute('aria-invalid', String(mismatch));
    if (mismatch) {
      showStatus(text('retry', 'Vous pouvez corriger avec Retour arrière.'));
      hintVisible = true;
    } else showStatus('');
    if (!mismatch && entered.length === target.length && !capsBlocked() &&
      (current().capsRequired !== true || capsSeen)) {
      complete = true;
      clearTimeout(hintTimer);
      clearHighlights();
      refs.hint.textContent = '';
      refs.continue.hidden = false;
      refs.input.setAttribute('contenteditable', 'false');
      refs.input.setAttribute('aria-readonly', 'true');
      showStatus((getTesterPlatform() === 'mac' && current().successMac) || current().success || theme?.success || text('success', 'Geste réussi.'));
      updateCount();
      // Progress waits for an explicit action; no timer changes the exercise.
      refs.continue.focus({ preventScroll: true });
    } else refreshHint();
  }

  refs.continue.addEventListener('click', () => {
    if (!complete) return;
    if (exerciseIndex + 1 < exercises.length) {
      exerciseIndex++;
      renderExercise();
    } else {
      if (theme) doneThemes.add(theme.id);
      else introComplete = true;
      showThemes();
    }
  });

  function updateCount() {
    const label = text('discovered', 'caractères découverts');
    refs.count.textContent = label.includes('{count}') ? label.replace('{count}', discoveries.size) : `${discoveries.size} ${label}`;
    refs.count.dataset.count = String(discoveries.size);
  }

  function showThemes() {
    clearTimeout(hintTimer);
    clearHighlights();
    refs.exercise.hidden = true;
    refs['keyboard-container'].hidden = true;
    refs.themes.hidden = false;
    root.dataset.phase = 'choices';
    refs.themes.querySelectorAll('[data-welcome-theme]').forEach((button) => {
      button.dataset.complete = String(doneThemes.has(button.dataset.welcomeTheme));
    });
    showStatus(theme ? text('themeComplete', 'Thème terminé. Vous pouvez en choisir un autre ou télécharger AZERTY Global.')
      : text('introComplete', 'Les trois gestes sont terminés. Vous pouvez télécharger AZERTY Global ou explorer un thème.'));
    const heading = refs.themes.querySelector('h2, h3');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    } else refs.themes.querySelector('button, a')?.focus({ preventScroll: true });
  }

  refs.themes.addEventListener('click', (event) => {
    const button = event.target.closest('[data-welcome-theme]');
    if (!button || !introComplete) return;
    const selectedTheme = data.challenge.themes.find((entry) => entry.id === button.dataset.welcomeTheme);
    const moduleIndex = lessons.modules.findIndex((entry) => entry.id === data.challenge.moduleId);
    const module = lessons.modules[moduleIndex];
    const lessonIndex = module?.lessons.findIndex((entry) => entry.id === selectedTheme?.lessonId);
    const lesson = module?.lessons[lessonIndex];
    if (!selectedTheme || !lesson?.exercises?.length) {
      showError(text('error', 'Ce thème n’a pas pu être chargé. Réessayez.'));
      return;
    }
    theme = selectedTheme;
    exercises = lesson.exercises;
    exerciseIndex = 0;
    if (refs['lesson-link']) {
      refs['lesson-link'].href = `/?mode=lessons&module=${moduleIndex}&lesson=${lessonIndex}&tutorial=skip&guidedHints=true`;
      refs['lesson-link'].hidden = false;
    }
    renderExercise();
  });

  function clearHighlights() {
    keyboard?.keyElements.forEach((key) => key.classList.remove('welcome-key-next', 'welcome-key-dead'));
  }

  function armHint() {
    clearTimeout(hintTimer);
    if (!active || complete) return;
    hintTimer = setTimeout(() => {
      hintVisible = true;
      refreshHint();
    }, 5500);
  }

  refs.help.addEventListener('click', () => {
    hintVisible = true;
    refreshHint();
    refs.input.focus({ preventScroll: true });
  });

  function methodFor(char, nextChar) {
    const methods = index[char]?.methods || [];
    const active = methods.filter((method) => keyboard.state.activeDeadKey &&
      (method.deadkey || method.deadKey) === keyboard.state.activeDeadKey);
    // Prefer a method compatible with Caps Lock when it is already on.
    const candidates = active.length ? active : methods;
    const compatible = candidates.filter((method) => Boolean(method.layer?.includes('Caps')) === keyboard.state.caps);
    return getPreferredCharacterMethod(char, compatible.length ? compatible : candidates, {
      nextChar, forceCaps: current().capsRequired === true
    });
  }

  function combo(method) {
    // Caps Lock is a toggle, not a key to press again when it is already active.
    const layer = (method.layer || '').split('+').filter((part) => !(part === 'Caps' && keyboard.state.caps)).join('+');
    return [getLayerDisplayName(layer), keyName(method.key)].filter(Boolean).join(' + ');
  }

  function highlight(method, dead = false) {
    const keys = [method.key, ...getLayerKeys(method.layer, { keyboard, onlyMissingModifiers: true, targetKey: method.key })];
    keys.forEach((id) => keyboard.keyElements.get(id)?.classList.add(dead ? 'welcome-key-dead' : 'welcome-key-next'));
  }

  function refreshHint() {
    if (!active || complete || refs.exercise.hidden) return;
    clearHighlights();
    if (!hintVisible && !capsBlocked()) return;
    refs.help.setAttribute('aria-pressed', 'true');
    if (capsBlocked()) {
      hintVisible = true;
      refs.hint.textContent = current().capsRequired
        ? text('capsEnable', 'Appuyez sur Verr. Maj. pour activer les majuscules.')
        : text('capsDisable', 'Appuyez de nouveau sur Verr. Maj. pour revenir aux minuscules.');
      keyboard.keyElements.get('CapsLock')?.classList.add('welcome-key-next');
      return;
    }
    const { position, entered, target } = prefixLength();
    if (position < entered.length) {
      refs.hint.textContent = text('retry', 'Vous pouvez corriger avec Retour arrière.');
      keyboard.keyElements.get('Backspace')?.classList.add('welcome-key-next');
      return;
    }
    const char = target[position];
    const method = methodFor(char, target[position + 1]);
    if (!method) {
      refs.hint.textContent = text('emptyHelp', 'La touche suivante est indiquée sur le clavier.');
      return;
    }
    const deadKey = method.deadkey || method.deadKey;
    const activeDeadKey = keyboard.state.activeDeadKey;
    if (activeDeadKey && activeDeadKey !== deadKey) {
      refs.hint.textContent = text('cancelDeadKey', 'Appuyez sur Retour arrière pour annuler la touche morte, puis reprenez.');
      keyboard.keyElements.get('Backspace')?.classList.add('welcome-key-next');
      return;
    }
    let instructions;
    if (method.type === 'deadkey') {
      const activationMethods = index[deadKey.replace('dk_', 'dk:')]?.methods || [];
      const activation = getPreferredCharacterMethod(deadKey, activationMethods);
      if (activeDeadKey === deadKey) {
        const release = [];
        if (keyboard.state.altgr && !method.layer?.includes('AltGr')) release.push(getTesterPlatform() === 'mac' ? 'Option' : 'AltGr');
        if (keyboard.state.shift && !method.layer?.includes('Shift')) release.push('Maj');
        instructions = `${release.length ? `Relâchez ${release.join(' et ')}, puis ` : ''}${combo(method)}`;
        highlight(method);
      } else if (activation) {
        instructions = `${combo(activation)} (${DEAD_KEY_NAMES[deadKey] || 'touche morte'}), puis ${combo(method)}`;
        highlight(activation, true);
      }
    } else {
      instructions = combo(method);
      highlight(method);
    }
    refs.hint.textContent = `${text('helpPrefix', 'Pour')} ${char === ' ' ? 'Espace' : `« ${char} »`} : ${instructions || combo(method)}.`;
  }

  refs.input.addEventListener('keydown', (event) => {
    if (!active || complete || !keyboard?.layout || ['Tab', 'Escape'].includes(event.code)) return;
    const code = remapMacKeyCode(event.code);
    if (!code || code === 'Unidentified' || shouldDeferToNativeComposition(event, keyboard, code, refs.input)) {
      event.preventDefault();
      return;
    }
    // Caps keydown/keyup can report the old state on Linux. Character events
    // provide the authoritative physical state before any text can be accepted.
    // An explicit visual Caps click remains a simulation until physical Caps is used.
    if (capsSource === 'physical' && keyboard.layout[code]) {
      reconcileKeyboardCapsLockFromEvent(keyboard, event);
    }
    if (isControlShortcut(event, code, keyboard)) return;
    syncKeyboardModifierStateFromEvent(keyboard, event, code);
    keyboard.pressKey(code);
    if (code === 'CapsLock') {
      capsSource = 'physical';
      applyKeyboardCapsLockKeydown(keyboard, event);
    }
    else if (['ShiftLeft', 'ShiftRight', 'AltRight', 'AltLeft'].includes(code)) {
      // Modifier state already synchronized by the shared physical-input helper.
    } else if (code === 'Backspace' || code === 'Delete') {
      if (keyboard.state.activeDeadKey) keyboard.clearDeadKey();
      else editWithEngine(() => deletePlainTextAtSelection(refs.input, { direction: code === 'Delete' ? 'forward' : 'backward', dispatchInput: true }));
    } else if (code.startsWith('Arrow') || code === 'Home' || code === 'End') return;
    else {
      suppressNativeCompositionAfterInternalKey(refs.input, event, keyboard, code);
      keyboard.handleKeyClick(code, true);
    }
    event.preventDefault();
    refreshHint();
    armHint();
  });

  // Keyup still runs when success moves focus to Continue, avoiding stuck modifiers.
  root.addEventListener('keyup', (event) => {
    if (!active || !keyboard) return;
    const code = remapMacKeyCode(event.code);
    keyboard.releaseKey(code);
    clearNativeCompositionAfterInternalKeyup(refs.input);
    if (code === 'ShiftLeft' || code === 'ShiftRight') keyboard.setShift(false);
    if (code === 'AltRight') keyboard.setAltGr(false);
    if (code === 'CapsLock') applyKeyboardCapsLockKeyup(keyboard, event);
  });
  refs.input.addEventListener('blur', () => {
    if (!keyboard) return;
    keyboard.setShift(false);
    keyboard.setAltGr(false);
  });

  const visual = refs['keyboard-container'];
  visual.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.key')) event.preventDefault();
  });
  visual.addEventListener('click', (event) => {
    const key = event.target.closest('.key');
    if (!active || !key) return;
    if (key.dataset.keyId === 'CapsLock') capsSource = 'visual';
    if (complete) return;
    // The shared engine owns clicks. Its Backspace only cancels a dead key;
    // editing text belongs to this page and runs in capture before that handler.
    if (key.dataset.keyId === 'Backspace' && !keyboard.state.activeDeadKey) {
      editWithEngine(() => deletePlainTextAtSelection(refs.input, { dispatchInput: true }));
    }
    armHint();
  }, true);
  visual.addEventListener('keydown', (event) => {
    const key = event.target.closest('.key');
    if (!key || !active) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!complete) (key._clickTarget || key).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    } else if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      const keys = [...keyboard.keyElements.values()];
      const offset = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' ? -12 : 12;
      const next = keys[Math.max(0, Math.min(keys.length - 1, keys.indexOf(key) + offset))];
      key.tabIndex = -1;
      next.tabIndex = 0;
      next.focus();
    }
  });
}
