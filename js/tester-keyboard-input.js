/**
 * AZERTY Global Tester — Physical keyboard input handling
 * Keydown/keyup event processing, Mac key remapping
 */

import { isModalOpen, handleFocusTrap } from './tester-accessibility.js';
import { insertPlainTextAtSelection, setupPlainTextContentEditable } from './tester-contenteditable.js';
import { recordKeystroke } from './tester-stats.js';

/**
 * Remap Mac key codes to match Windows/Linux layout.
 * On Mac, Backquote (E00) and IntlBackslash (B00) are physically swapped.
 * Also remap AltLeft to AltRight so Option key works as AltGr.
 */
const IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform);

export function remapMacKeyCode(code) {
  if (!IS_MAC) return code;

  if (code === 'Backquote') return 'IntlBackslash';
  if (code === 'IntlBackslash') return 'Backquote';
  if (code === 'AltLeft') return 'AltRight';

  return code;
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
    const pressedKeyCode = IS_MAC && e.code === 'AltLeft' ? 'AltLeft' : keyCode;
    keyboard.pressKey(pressedKeyCode);

    if (keyCode === 'ShiftLeft' || keyCode === 'ShiftRight') {
      keyboard.setShift(true);
      e.preventDefault();
      return;
    }
    if (keyCode === 'CapsLock') {
      keyboard.setCaps(e.getModifierState('CapsLock'));
      e.preventDefault();
      return;
    }
    if (keyCode === 'AltRight') {
      keyboard.setAltGr(true);
      e.preventDefault();
      return;
    }
    if ((e.ctrlKey && !e.altKey) || e.metaKey) {
      return;
    }
    if (!IS_MAC && e.code === 'AltLeft') {
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
        document.execCommand('delete', false);
      }
      e.preventDefault();
      return;
    }
    if (e.code === 'Delete') {
      if (keyboard.state?.activeDeadKey) {
        keyboard.clearDeadKey();
      } else {
        document.execCommand('forwardDelete', false);
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

    keyboard.handleKeyClick(keyCode, true);
    e.preventDefault();
  }

  function onKeyup(e) {
    if (!isModalOpen(modal)) return;
    const keyboard = getKeyboard();
    if (!keyboard || document.activeElement !== outputEl) return;

    const keyCode = remapMacKeyCode(e.code);
    const pressedKeyCode = IS_MAC && e.code === 'AltLeft' ? 'AltLeft' : keyCode;
    keyboard.releaseKey(pressedKeyCode);
    if (keyCode === 'ShiftLeft' || keyCode === 'ShiftRight') {
      keyboard.setShift(false);
    }
    if (keyCode === 'AltRight') {
      keyboard.setAltGr(false);
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
