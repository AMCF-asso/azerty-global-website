/**
 * Native OS input diagnostic for the tester modal.
 * This module intentionally uses a real textarea and does not remap keystrokes.
 */

import { T } from './tester-i18n.js?v=final-20260717-3';

const EMPTY_VALUE = '-';

const STATE_ACTIVE = T('actif', 'active');
const STATE_INACTIVE = T('inactif', 'inactive');
const STATE_UNAVAILABLE = T('indisponible', 'unavailable');

function displayValue(value) {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE;
  return String(value)
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function getModifierState(event, modifier) {
  try {
    return event.getModifierState?.(modifier) ? STATE_ACTIVE : STATE_INACTIVE;
  } catch {
    return STATE_UNAVAILABLE;
  }
}

function formatModifiers(event) {
  const modifiers = [];
  if (event.ctrlKey) modifiers.push('Ctrl');
  if (event.metaKey) modifiers.push('Meta');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push(T('Maj', 'Shift'));
  if (getModifierState(event, 'AltGraph') === STATE_ACTIVE) modifiers.push('AltGraph');
  return modifiers.length ? modifiers.join(' + ') : T('aucun', 'none');
}

function setText(element, value) {
  if (element) element.textContent = displayValue(value);
}

function readRefs(modal) {
  return {
    details: modal.querySelector('#tester-os-diagnostic'),
    input: modal.querySelector('#tester-diagnostic-input'),
    clearButton: modal.querySelector('#tester-diagnostic-clear'),
    key: modal.querySelector('#tester-diagnostic-key'),
    code: modal.querySelector('#tester-diagnostic-code'),
    inputType: modal.querySelector('#tester-diagnostic-input-type'),
    data: modal.querySelector('#tester-diagnostic-data'),
    modifiers: modal.querySelector('#tester-diagnostic-modifiers'),
    altGraph: modal.querySelector('#tester-diagnostic-altgraph'),
    capsLock: modal.querySelector('#tester-diagnostic-capslock'),
    value: modal.querySelector('#tester-diagnostic-value'),
    openButtons: modal.querySelectorAll('.tester-diagnostic-open')
  };
}

function resetReadout(diag) {
  setText(diag.key, null);
  setText(diag.code, null);
  setText(diag.inputType, null);
  setText(diag.data, null);
  setText(diag.modifiers, null);
  setText(diag.altGraph, null);
  setText(diag.capsLock, null);
  setText(diag.value, null);
}

function renderKeyboardEvent(diag, event) {
  setText(diag.key, event.key);
  setText(diag.code, event.code);
  setText(diag.modifiers, formatModifiers(event));
  setText(diag.altGraph, getModifierState(event, 'AltGraph'));
  setText(diag.capsLock, getModifierState(event, 'CapsLock'));
}

function renderInputEvent(diag, event) {
  setText(diag.inputType, event.inputType);
  setText(diag.data, event.data);
}

function renderCompositionEvent(diag, event) {
  setText(diag.inputType, event.type);
  setText(diag.data, event.data);
}

function renderNativeValue(diag) {
  setText(diag.value, diag.input?.value);
}

export function openTesterDiagnostic(refs, { focus = true } = {}) {
  const modal = refs?.modal || document.getElementById('tester-modal');
  if (!modal) return;
  const diag = readRefs(modal);
  if (!diag.details) return;

  diag.details.open = true;
  diag.details.scrollIntoView({ block: 'nearest' });
  if (focus) {
    requestAnimationFrame(() => diag.input?.focus());
  }
}

export function initTesterDiagnostic(refs, { onOpenRequest = null } = {}) {
  const modal = refs?.modal;
  if (!modal) return;

  const diag = readRefs(modal);
  if (!diag.details || !diag.input) return;

  resetReadout(diag);

  diag.input.addEventListener('keydown', (event) => {
    renderKeyboardEvent(diag, event);
  });

  diag.input.addEventListener('keyup', (event) => {
    renderKeyboardEvent(diag, event);
  });

  diag.input.addEventListener('beforeinput', (event) => {
    renderInputEvent(diag, event);
  });

  diag.input.addEventListener('compositionstart', (event) => {
    renderCompositionEvent(diag, event);
  });

  diag.input.addEventListener('compositionupdate', (event) => {
    renderCompositionEvent(diag, event);
  });

  diag.input.addEventListener('compositionend', (event) => {
    renderCompositionEvent(diag, event);
    renderNativeValue(diag);
  });

  diag.input.addEventListener('input', () => {
    renderNativeValue(diag);
  });

  diag.clearButton?.addEventListener('click', () => {
    diag.input.value = '';
    resetReadout(diag);
    diag.input.focus();
  });

  diag.openButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (onOpenRequest) onOpenRequest();
      requestAnimationFrame(() => openTesterDiagnostic(refs));
    });
  });
}
