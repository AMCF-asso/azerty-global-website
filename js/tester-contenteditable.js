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

function splitPlainTextGraphemes(text) {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (segment) => segment.segment);
  }

  return Array.from(text);
}

function graphemeIndexToCodeUnitOffset(text, graphemeIndex) {
  return splitPlainTextGraphemes(text).slice(0, Math.max(0, graphemeIndex)).join('').length;
}

function codeUnitOffsetToGraphemeIndex(text, codeUnitOffset) {
  const offset = Math.max(0, codeUnitOffset);
  const graphemes = splitPlainTextGraphemes(text);
  let consumedCodeUnits = 0;

  for (let index = 0; index < graphemes.length; index += 1) {
    const nextOffset = consumedCodeUnits + graphemes[index].length;
    if (offset < nextOffset) {
      return index;
    }
    consumedCodeUnits = nextOffset;
  }

  return graphemes.length;
}

function getNodeTextOffset(root, node, offset) {
  if (!root || !node) return 0;

  if (node === root) {
    let textOffset = 0;
    for (let index = 0; index < offset && index < root.childNodes.length; index += 1) {
      textOffset += root.childNodes[index].textContent.length;
    }
    return textOffset;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();
  let textOffset = 0;

  while (currentNode) {
    if (currentNode === node) {
      return textOffset + offset;
    }
    textOffset += currentNode.textContent.length;
    currentNode = walker.nextNode();
  }

  return root.textContent.length;
}

function getSelectionTextOffsets(targetEl) {
  const textLength = targetEl.textContent.length;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !targetEl.contains(selection.anchorNode)) {
    return { start: textLength, end: textLength };
  }

  const range = selection.getRangeAt(0);
  const start = getNodeTextOffset(targetEl, range.startContainer, range.startOffset);
  const end = getNodeTextOffset(targetEl, range.endContainer, range.endOffset);

  return {
    start: Math.max(0, Math.min(start, textLength)),
    end: Math.max(0, Math.min(end, textLength))
  };
}

function placeCaretAtCodeUnitOffset(targetEl, offset) {
  const selection = window.getSelection();
  if (!selection) return;

  const textLength = targetEl.textContent.length;
  const requestedOffset = Math.max(0, Math.min(offset, textLength));
  const range = document.createRange();
  const walker = document.createTreeWalker(targetEl, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();
  let remainingOffset = requestedOffset;

  while (currentNode) {
    const nodeLength = currentNode.textContent.length;
    if (remainingOffset <= nodeLength) {
      range.setStart(currentNode, remainingOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }

    remainingOffset -= nodeLength;
    currentNode = walker.nextNode();
  }

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

export function setPlainTextContent(targetEl, text, { dispatchInput = false } = {}) {
  if (!targetEl) return '';

  const normalizedText = normalizePlainText(text);
  targetEl.textContent = normalizedText;
  placeCaretAtEnd(targetEl);

  if (dispatchInput) {
    targetEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  return normalizedText;
}

export function deletePlainTextAtSelection(targetEl, { direction = 'backward', dispatchInput = false } = {}) {
  if (!targetEl) return '';

  const text = normalizePlainText(targetEl.textContent || '');
  const selectionOffsets = getSelectionTextOffsets(targetEl);
  const graphemes = splitPlainTextGraphemes(text);
  let startGrapheme = codeUnitOffsetToGraphemeIndex(text, selectionOffsets.start);
  let endGrapheme = codeUnitOffsetToGraphemeIndex(text, selectionOffsets.end);

  if (startGrapheme === endGrapheme) {
    if (direction === 'forward') {
      if (endGrapheme >= graphemes.length) return text;
      endGrapheme += 1;
    } else {
      if (startGrapheme <= 0) return text;
      startGrapheme -= 1;
    }
  }

  const nextGraphemes = [
    ...graphemes.slice(0, startGrapheme),
    ...graphemes.slice(endGrapheme)
  ];
  const nextText = nextGraphemes.join('');
  const nextCaretOffset = graphemeIndexToCodeUnitOffset(nextText, startGrapheme);

  targetEl.textContent = nextText;
  placeCaretAtCodeUnitOffset(targetEl, nextCaretOffset);

  if (dispatchInput) {
    targetEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  return nextText;
}

function getTransferText(source) {
  if (!source) return '';
  return normalizePlainText(source.getData('text/plain'));
}

const nativeTextInputState = new WeakMap();
const nativeTextInputSuppressionState = new WeakMap();
const nativeTextInputCorrectionState = new WeakMap();
const NATIVE_TEXT_INPUT_SUPPRESSION_TIMEOUT_MS = 1500;

export function armNativeTextInput(targetEl, timeoutMs = 250) {
  if (!targetEl) return;
  nativeTextInputSuppressionState.delete(targetEl);
  nativeTextInputState.set(targetEl, performance.now() + timeoutMs);
}

export function isNativeTextInputArmed(targetEl) {
  const armedUntil = nativeTextInputState.get(targetEl);
  return typeof armedUntil === 'number' && performance.now() <= armedUntil;
}

function clearNativeTextInput(targetEl) {
  nativeTextInputState.delete(targetEl);
}

export function suppressNativeTextInput(targetEl, timeoutMs = NATIVE_TEXT_INPUT_SUPPRESSION_TIMEOUT_MS) {
  if (!targetEl) return;
  nativeTextInputSuppressionState.set(targetEl, {
    expiresAt: performance.now() + timeoutMs,
    consumed: false,
    composition: false
  });
  clearNativeTextInput(targetEl);
}

export function clearNativeTextInputSuppression(targetEl) {
  nativeTextInputSuppressionState.delete(targetEl);
}

export function isNativeTextInputSuppressed(targetEl) {
  const suppression = nativeTextInputSuppressionState.get(targetEl);
  if (!suppression) return false;

  const expiresAt = typeof suppression === 'number' ? suppression : suppression.expiresAt;
  if (typeof expiresAt !== 'number' || performance.now() > expiresAt) {
    nativeTextInputSuppressionState.delete(targetEl);
    return false;
  }

  return true;
}

function consumeNativeTextInputSuppression(targetEl, { composition = false } = {}) {
  if (!isNativeTextInputSuppressed(targetEl)) return false;

  const suppression = nativeTextInputSuppressionState.get(targetEl);
  if (suppression && typeof suppression === 'object') {
    suppression.consumed = true;
    suppression.composition = suppression.composition || composition;
  }

  return true;
}

export function registerNativeTextInputCorrection(targetEl, correction, timeoutMs = 1500) {
  if (!targetEl || !correction) return;
  nativeTextInputCorrectionState.set(targetEl, {
    ...correction,
    expiresAt: performance.now() + timeoutMs
  });
}

function consumeNativeTextInputCorrection(targetEl, event) {
  const correction = nativeTextInputCorrectionState.get(targetEl);
  if (!correction) return false;

  if (performance.now() > correction.expiresAt) {
    nativeTextInputCorrectionState.delete(targetEl);
    return false;
  }

  if (typeof correction.matches === 'function' && !correction.matches(event)) {
    return false;
  }

  event.preventDefault();
  nativeTextInputCorrectionState.delete(targetEl);
  correction.apply?.(event);
  return true;
}

export function setupPlainTextContentEditable(targetEl, {
  allowTransfer = false,
  allowComposition = false,
  onCompositionText = null,
  onAfterInsert = null
} = {}) {
  if (!targetEl) return () => {};

  let isComposing = false;
  let suppressingComposition = false;
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

  function discardNativeComposition() {
    pendingCompositionText = '';
    awaitingCompositionInsertText = false;
    clearNativeTextInput(targetEl);
  }

  function onBeforeInput(event) {
    if (
      allowComposition &&
      (
        event.inputType === 'insertText' ||
        event.inputType === 'insertCompositionText'
      ) &&
      consumeNativeTextInputCorrection(targetEl, event)
    ) {
      discardNativeComposition();
      return;
    }

    if (
      allowComposition &&
      isNativeTextInputSuppressed(targetEl) &&
      (
        event.inputType === 'insertText' ||
        event.inputType === 'insertCompositionText'
      )
    ) {
      event.preventDefault();
      consumeNativeTextInputSuppression(targetEl, {
        composition: event.inputType === 'insertCompositionText'
      });
      discardNativeComposition();
      return;
    }

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
    if (consumeNativeTextInputSuppression(targetEl, { composition: true })) {
      suppressingComposition = true;
      isComposing = false;
      discardNativeComposition();
      return;
    }
    isComposing = true;
    awaitingCompositionInsertText = false;
    pendingCompositionText = '';
  }

  function onCompositionUpdate(event) {
    if (!allowComposition) return;
    if (suppressingComposition || consumeNativeTextInputSuppression(targetEl, { composition: true })) {
      discardNativeComposition();
      return;
    }
    pendingCompositionText = normalizePlainText(event.data || pendingCompositionText);
  }

  function onCompositionEnd(event) {
    if (!allowComposition) return;
    if (suppressingComposition || consumeNativeTextInputSuppression(targetEl, { composition: true })) {
      suppressingComposition = false;
      isComposing = false;
      discardNativeComposition();
      clearNativeTextInputSuppression(targetEl);
      return;
    }
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
