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

export function setupPlainTextContentEditable(targetEl, {
  allowTransfer = false,
  onAfterInsert = null
} = {}) {
  if (!targetEl) return () => {};

  function onBeforeInput(event) {
    if (
      event.inputType === 'insertText' ||
      event.inputType === 'insertCompositionText' ||
      event.inputType === 'insertFromPaste' ||
      event.inputType === 'insertFromDrop'
    ) {
      event.preventDefault();
    }
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
  targetEl.addEventListener('paste', onPaste);
  targetEl.addEventListener('dragover', onDragOver);
  targetEl.addEventListener('drop', onDrop);

  return function cleanup() {
    targetEl.removeEventListener('beforeinput', onBeforeInput);
    targetEl.removeEventListener('paste', onPaste);
    targetEl.removeEventListener('dragover', onDragOver);
    targetEl.removeEventListener('drop', onDrop);
  };
}
