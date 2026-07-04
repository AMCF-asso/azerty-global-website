/**
 * AZERTY Global Tester — Physical keyboard input handling
 * Keydown/keyup event processing, Mac key remapping
 */

import { isModalOpen, handleFocusTrap } from './tester-accessibility.js';
import {
  armNativeTextInput,
  clearNativeTextInputSuppression,
  deletePlainTextAtSelection,
  insertPlainTextAtSelection,
  isNativeTextInputArmed,
  isNativeTextInputSuppressed,
  suppressNativeTextInput,
  setupPlainTextContentEditable
} from './tester-contenteditable.js?v=final-20260703-2';
import { getTesterPlatform } from './tester-platform.js';
import { recordKeystroke } from './tester-stats.js';

/**
 * Remap Mac key codes to match Windows/Linux layout.
 * On Mac, Backquote (E00) and IntlBackslash (B00) are physically swapped.
 * Also remap AltLeft to AltRight so Option key works as AltGr.
 */
const CONTROL_KEY_CODES = new Set([
  'ShiftLeft',
  'ShiftRight',
  'CapsLock',
  'AltRight',
  'AltLeft',
  'ControlLeft',
  'ControlRight',
  'MetaLeft',
  'MetaRight',
  'ContextMenu',
  'Backspace',
  'Delete',
  'Enter',
  'Tab',
  'Escape'
]);
const pendingNativeDeadKeySuppression = new WeakMap();
const LAYER_ALTGR = 4;
const LAYER_SHIFT_ALTGR = 5;

function isMacTesterPlatform() {
  return getTesterPlatform() === 'mac';
}

export function remapMacKeyCode(code) {
  if (!isMacTesterPlatform()) return code;

  if (code === 'Backquote') return 'IntlBackslash';
  if (code === 'IntlBackslash') return 'Backquote';
  if (code === 'AltLeft') return 'AltRight';

  return code;
}

function isKnownKeyboardCode(keyboard, keyCode) {
  if (!keyCode || keyCode === 'Unidentified') return false;
  return Boolean(keyboard?.layout?.[keyCode]) ||
    CONTROL_KEY_CODES.has(keyCode) ||
    keyCode.startsWith('Arrow');
}

function isPrintableNativeKey(event) {
  return typeof event.key === 'string' && Array.from(event.key).length === 1;
}

function hasAltGraphLayer(keyboard, keyCode) {
  const chars = keyboard?.layout?.[keyCode];
  if (!Array.isArray(chars)) return false;
  return Boolean(chars[LAYER_ALTGR] || chars[LAYER_SHIFT_ALTGR]);
}

function isNativeAltGraphDeadKeyCollision(event, keyboard, keyCode) {
  return Boolean(
    event?.key === 'Dead' &&
    isKnownKeyboardCode(keyboard, keyCode) &&
    hasAltGraphLayer(keyboard, keyCode) &&
    (
      event.ctrlKey ||
      event.altKey ||
      eventModifierState(event, 'AltGraph') ||
      keyboard?.state?.altgr
    )
  );
}

export function shouldDeferToNativeComposition(event, keyboard, keyCode = remapMacKeyCode(event.code), targetEl = null) {
  if (event.key === 'Dead' && isKnownKeyboardCode(keyboard, keyCode)) return false;
  if (keyboard?.state?.activeDeadKey && isKnownKeyboardCode(keyboard, keyCode)) return false;
  if (
    isKnownKeyboardCode(keyboard, keyCode) &&
    (isNativeTextInputSuppressed(targetEl) || pendingNativeDeadKeySuppression.get(targetEl))
  ) {
    return false;
  }
  if (event.isComposing || event.key === 'Process') return true;
  if (isControlShortcut(event, keyCode, keyboard)) return false;
  if (isNativeTextInputArmed(targetEl) && (event.key === 'Dead' || isPrintableNativeKey(event))) return true;
  if (isKnownKeyboardCode(keyboard, keyCode)) return false;
  if (event.key === 'Dead') return true;
  return isPrintableNativeKey(event);
}

export function deferToNativeComposition(event, keyboard, targetEl, keyCode = remapMacKeyCode(event.code)) {
  const shouldDefer = shouldDeferToNativeComposition(event, keyboard, keyCode, targetEl);
  if (shouldDefer) {
    pendingNativeDeadKeySuppression.delete(targetEl);
    armNativeTextInput(targetEl);
  }
  return shouldDefer;
}

function eventModifierState(event, key) {
  return typeof event.getModifierState === 'function' && event.getModifierState(key);
}

export function isAltGraphEvent(event, keyCode = remapMacKeyCode(event.code), keyboard = null) {
  const isMac = isMacTesterPlatform();
  return Boolean(
    keyCode === 'AltRight' ||
    (isMac && event.altKey) ||
    eventModifierState(event, 'AltGraph') ||
    (!isMac && event.ctrlKey && event.altKey) ||
    isNativeAltGraphDeadKeyCollision(event, keyboard, keyCode)
  );
}

export function isControlShortcut(event, keyCode = remapMacKeyCode(event.code), keyboard = null) {
  return Boolean(
    event.metaKey ||
    (event.ctrlKey && !event.altKey && !isAltGraphEvent(event, keyCode, keyboard))
  );
}

export function syncKeyboardModifierStateFromEvent(keyboard, event, keyCode = remapMacKeyCode(event.code)) {
  if (!keyboard) return;

  const shiftActive = Boolean(
    event.shiftKey ||
    eventModifierState(event, 'Shift') ||
    keyCode === 'ShiftLeft' ||
    keyCode === 'ShiftRight'
  );
  const altGrActive = isAltGraphEvent(event, keyCode, keyboard);

  keyboard.setShift(shiftActive);
  keyboard.setAltGr(altGrActive);
}

export function toggleKeyboardCapsLock(keyboard) {
  if (!keyboard) return;
  keyboard.setCaps(!keyboard.state?.caps);
}

export function reconcileKeyboardCapsLockFromEvent(keyboard, event) {
  if (!keyboard || typeof event.getModifierState !== 'function') return;
  keyboard.setCaps(event.getModifierState('CapsLock'));
}

export function applyKeyboardCapsLockKeydown(keyboard, event) {
  if (event?.repeat) return;
  toggleKeyboardCapsLock(keyboard);
}

export function applyKeyboardCapsLockKeyup() {
  // Linux can expose the old CapsLock state on the keyup event too. Keep the
  // internal toggle from keydown; the next character must not flip it back.
}

export function suppressNativeCompositionAfterInternalKey(targetEl, event = null, keyboard = null, keyCode = event ? remapMacKeyCode(event.code) : '') {
  const hasPendingNativeDeadKey = pendingNativeDeadKeySuppression.get(targetEl);
  const isKnownKey = isKnownKeyboardCode(keyboard, keyCode);
  const isNativeDeadKeyCollision = event?.key === 'Dead' && isKnownKey;

  suppressNativeTextInput(targetEl);

  if (isNativeDeadKeyCollision) {
    pendingNativeDeadKeySuppression.set(targetEl, true);
  } else if (hasPendingNativeDeadKey && isKnownKey) {
    pendingNativeDeadKeySuppression.delete(targetEl);
  }
}

export function clearNativeCompositionAfterInternalKeyup(targetEl) {
  if (!pendingNativeDeadKeySuppression.get(targetEl)) {
    clearNativeTextInputSuppression(targetEl);
  }
}

/**
 * Set up physical keyboard event handlers on the modal.
 * Returns a cleanup function to remove listeners.
 */
export function setupModalKeyboardHandlers(refs, getKeyboard, closeModal) {
  const { modal, modalContent, outputEl } = refs;

  function onKeydown(e) {
    if (!isModalOpen(modal)) return;

    if (e.key === 'Tab') {
      handleFocusTrap(e, modal, modalContent);
      return;
    }

    if (e.code === 'Escape') {
      closeModal();
      e.preventDefault();
      return;
    }

    const keyboard = getKeyboard();
    if (!keyboard || document.activeElement !== outputEl) {
      return;
    }

    const keyCode = remapMacKeyCode(e.code);
    if (deferToNativeComposition(e, keyboard, outputEl, keyCode)) {
      keyboard.clearDeadKey?.();
      return;
    }

    syncKeyboardModifierStateFromEvent(keyboard, e, keyCode);
    const pressedKeyCode = isMacTesterPlatform() && e.code === 'AltLeft' ? 'AltLeft' : keyCode;
    keyboard.pressKey(pressedKeyCode);

    if (keyCode === 'ShiftLeft' || keyCode === 'ShiftRight') {
      keyboard.setShift(true);
      e.preventDefault();
      return;
    }
    if (keyCode === 'CapsLock') {
      applyKeyboardCapsLockKeydown(keyboard, e);
      e.preventDefault();
      return;
    }
    if (keyCode === 'AltRight') {
      keyboard.setAltGr(true);
      e.preventDefault();
      return;
    }
    if (isControlShortcut(e, keyCode, keyboard)) {
      return;
    }
    if (!isMacTesterPlatform() && e.code === 'AltLeft') {
      e.preventDefault();
      return;
    }
    if (e.code.startsWith('Arrow')) {
      return;
    }
    if (e.code === 'Backspace') {
      if (keyboard.state?.activeDeadKey) {
        keyboard.clearDeadKey();
      } else {
        deletePlainTextAtSelection(outputEl, { direction: 'backward', dispatchInput: true });
      }
      e.preventDefault();
      return;
    }
    if (e.code === 'Delete') {
      if (keyboard.state?.activeDeadKey) {
        keyboard.clearDeadKey();
      } else {
        deletePlainTextAtSelection(outputEl, { direction: 'forward', dispatchInput: true });
      }
      e.preventDefault();
      return;
    }
    if (e.code === 'Enter') {
      insertPlainTextAtSelection(outputEl, '\n', { dispatchInput: true });
      outputEl.scrollTop = outputEl.scrollHeight;
      e.preventDefault();
      return;
    }

    suppressNativeCompositionAfterInternalKey(outputEl, e, keyboard, keyCode);
    keyboard.handleKeyClick(keyCode, true);
    e.preventDefault();
  }

  function onKeyup(e) {
    if (!isModalOpen(modal)) return;
    const keyboard = getKeyboard();
    if (!keyboard || document.activeElement !== outputEl) return;

    const keyCode = remapMacKeyCode(e.code);
    const pressedKeyCode = isMacTesterPlatform() && e.code === 'AltLeft' ? 'AltLeft' : keyCode;
    keyboard.releaseKey(pressedKeyCode);
    clearNativeCompositionAfterInternalKeyup(outputEl);
    if (keyCode === 'ShiftLeft' || keyCode === 'ShiftRight') {
      keyboard.setShift(false);
    }
    if (keyCode === 'AltRight') {
      keyboard.setAltGr(false);
    }
    if (keyCode === 'CapsLock') {
      applyKeyboardCapsLockKeyup(keyboard, e);
    }
  }

  let prevOutputLength = 0;

  function onInput() {
    if (outputEl.textContent.trim() === '') {
      outputEl.innerHTML = '';
    }
    const currentLength = outputEl.textContent.length;
    const delta = currentLength - prevOutputLength;
    if (delta === 1) {
      const char = outputEl.textContent.slice(-1);
      recordKeystroke(char, null);
    }
    prevOutputLength = currentLength;
  }

  const cleanupPlainTextContentEditable = setupPlainTextContentEditable(outputEl, {
    allowTransfer: true,
    allowComposition: true,
    onAfterInsert: () => {
      requestAnimationFrame(() => {
        outputEl.scrollTop = outputEl.scrollHeight;
      });
    }
  });

  modal.addEventListener('keydown', onKeydown);
  modal.addEventListener('keyup', onKeyup);
  outputEl.addEventListener('input', onInput);

  return function cleanup() {
    modal.removeEventListener('keydown', onKeydown);
    modal.removeEventListener('keyup', onKeyup);
    outputEl.removeEventListener('input', onInput);
    cleanupPlainTextContentEditable();
  };
}
