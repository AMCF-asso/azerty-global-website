function normalizePlainText(text) {
  return String(text || '').replace(/\r\n?/g, '\n');
}

function placeCaretAtEnd(targetEl) {
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(targetEl);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function insertPlainTextAtSelection(targetEl, text, { dispatchInput = false } = {}) {
  if (!targetEl) return '';

  const normalizedText = normalizePlainText(text);
  const selection = window.getSelection();
  const hasSelection = selection && selection.rangeCount > 0 && targetEl.contains(selection.anchorNode);

  if (hasSelection) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(normalizedText));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    targetEl.appendChild(document.createTextNode(normalizedText));
    placeCaretAtEnd(targetEl);
  }

  if (dispatchInput) {
    targetEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  return normalizedText;
}

function getTransferText(source) {
  if (!source) return '';
  return normalizePlainText(source.getData('text/plain'));
}

const nativeTextInputState = new WeakMap();

export function armNativeTextInput(targetEl, timeoutMs = 250) {
  if (!targetEl) return;
  nativeTextInputState.set(targetEl, performance.now() + timeoutMs);
}

export function isNativeTextInputArmed(targetEl) {
  const armedUntil = nativeTextInputState.get(targetEl);
  return typeof armedUntil === 'number' && performance.now() <= armedUntil;
}

function clearNativeTextInput(targetEl) {
  nativeTextInputState.delete(targetEl);
}

export function setupPlainTextContentEditable(targetEl, {
  allowTransfer = false,
  allowComposition = false,
  onCompositionText = null,
  onAfterInsert = null
} = {}) {
  if (!targetEl) return () => {};

  let isComposing = false;
  let pendingCompositionText = '';
  let lastCompositionCommit = { text: '', time: 0 };
  let awaitingCompositionInsertText = false;

  function wasRecentlyCommitted(text) {
    return text &&
      lastCompositionCommit.text === text &&
      performance.now() - lastCompositionCommit.time < 80;
  }

  function commitCompositionText(text) {
    const normalizedText = normalizePlainText(text);
    if (!normalizedText || wasRecentlyCommitted(normalizedText)) return '';

    const committedText = onCompositionText
      ? normalizePlainText(onCompositionText(normalizedText) || '')
      : insertPlainTextAtSelection(targetEl, normalizedText, { dispatchInput: true });

    if (committedText) {
      lastCompositionCommit = { text: committedText, time: performance.now() };
      if (onAfterInsert) {
        onAfterInsert({ source: 'composition', text: committedText });
      }
    }

    return committedText;
  }

  function armCompositionInsertText() {
    awaitingCompositionInsertText = true;
    armNativeTextInput(targetEl);
  }

  function clearCompositionInsertText() {
    awaitingCompositionInsertText = false;
    clearNativeTextInput(targetEl);
  }

  function onBeforeInput(event) {
    if (allowComposition && event.inputType === 'insertCompositionText') {
      event.preventDefault();
      pendingCompositionText = normalizePlainText(event.data || pendingCompositionText);
      if (!isComposing) {
        commitCompositionText(pendingCompositionText);
        pendingCompositionText = '';
      }
      return;
    }

    if (allowComposition && event.inputType === 'insertText' && isComposing) {
      event.preventDefault();
      pendingCompositionText = normalizePlainText(event.data || pendingCompositionText);
      return;
    }

    if (
      allowComposition &&
      event.inputType === 'insertText' &&
      (awaitingCompositionInsertText || isNativeTextInputArmed(targetEl))
    ) {
      event.preventDefault();
      pendingCompositionText = normalizePlainText(event.data || pendingCompositionText);
      commitCompositionText(pendingCompositionText);
      pendingCompositionText = '';
      clearCompositionInsertText();
      return;
    }

    if (
      event.inputType === 'insertText' ||
      event.inputType === 'insertCompositionText' ||
      event.inputType === 'insertFromPaste' ||
      event.inputType === 'insertFromDrop'
    ) {
      event.preventDefault();
    }
  }

  function onCompositionStart() {
    if (!allowComposition) return;
    isComposing = true;
    awaitingCompositionInsertText = false;
    pendingCompositionText = '';
  }

  function onCompositionUpdate(event) {
    if (!allowComposition) return;
    pendingCompositionText = normalizePlainText(event.data || pendingCompositionText);
  }

  function onCompositionEnd(event) {
    if (!allowComposition) return;
    isComposing = false;
    const committedText = commitCompositionText(event.data || pendingCompositionText);
    armCompositionInsertText();
    if (committedText) {
      pendingCompositionText = '';
    }
  }

  function onInput() {
    if (!allowComposition) return;
    if (!isComposing) {
      clearCompositionInsertText();
    }
    pendingCompositionText = '';
  }

  function onPaste(event) {
    event.preventDefault();
    if (!allowTransfer) return;

    const text = getTransferText(event.clipboardData);
    insertPlainTextAtSelection(targetEl, text, { dispatchInput: true });
    if (onAfterInsert) {
      onAfterInsert({ source: 'paste', text });
    }
  }

  function onDragOver(event) {
    event.preventDefault();
  }

  function onDrop(event) {
    event.preventDefault();
    if (!allowTransfer) return;

    targetEl.focus();
    const text = getTransferText(event.dataTransfer);
    insertPlainTextAtSelection(targetEl, text, { dispatchInput: true });
    if (onAfterInsert) {
      onAfterInsert({ source: 'drop', text });
    }
  }

  targetEl.addEventListener('beforeinput', onBeforeInput);
  targetEl.addEventListener('compositionstart', onCompositionStart);
  targetEl.addEventListener('compositionupdate', onCompositionUpdate);
  targetEl.addEventListener('compositionend', onCompositionEnd);
  targetEl.addEventListener('input', onInput);
  targetEl.addEventListener('paste', onPaste);
  targetEl.addEventListener('dragover', onDragOver);
  targetEl.addEventListener('drop', onDrop);

  return function cleanup() {
    targetEl.removeEventListener('beforeinput', onBeforeInput);
    targetEl.removeEventListener('compositionstart', onCompositionStart);
    targetEl.removeEventListener('compositionupdate', onCompositionUpdate);
    targetEl.removeEventListener('compositionend', onCompositionEnd);
    targetEl.removeEventListener('input', onInput);
    targetEl.removeEventListener('paste', onPaste);
    targetEl.removeEventListener('dragover', onDragOver);
    targetEl.removeEventListener('drop', onDrop);
  };
}
