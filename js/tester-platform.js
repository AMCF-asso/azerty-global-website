import { T } from './tester-i18n.js?v=final-20260717-3';

const DETECTED_TESTER_PLATFORM = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  ? 'mac'
  : (/Linux/.test(navigator.platform) ? 'linux' : 'windows');

let currentTesterPlatform = DETECTED_TESTER_PLATFORM;

const PLATFORM_LAYER_NAMES = {
  windows: {
    'Shift': T('Maj', 'Shift'),
    'Caps': T('Verr. Maj.', 'Caps Lock'),
    'AltGr': 'AltGr',
    'Caps+Shift': T('Verr. Maj. + Maj', 'Caps Lock + Shift'),
    'Shift+AltGr': T('AltGr + Maj', 'AltGr + Shift'),
    'Caps+AltGr': T('Verr. Maj. + AltGr', 'Caps Lock + AltGr'),
    'Caps+Shift+AltGr': T('Verr. Maj. + AltGr + Maj', 'Caps Lock + AltGr + Shift')
  },
  linux: {
    'Shift': T('Maj', 'Shift'),
    'Caps': T('Verr. Maj.', 'Caps Lock'),
    'AltGr': 'AltGr',
    'Caps+Shift': T('Verr. Maj. + Maj', 'Caps Lock + Shift'),
    'Shift+AltGr': T('AltGr + Maj', 'AltGr + Shift'),
    'Caps+AltGr': T('Verr. Maj. + AltGr', 'Caps Lock + AltGr'),
    'Caps+Shift+AltGr': T('Verr. Maj. + AltGr + Maj', 'Caps Lock + AltGr + Shift')
  },
  mac: {
    'Shift': T('Maj', 'Shift'),
    'Caps': T('Verr. Maj.', 'Caps Lock'),
    'AltGr': 'Option',
    'Caps+Shift': T('Verr. Maj. + Maj', 'Caps Lock + Shift'),
    'Shift+AltGr': T('Option + Maj', 'Option + Shift'),
    'Caps+AltGr': T('Verr. Maj. + Option', 'Caps Lock + Option'),
    'Caps+Shift+AltGr': T('Verr. Maj. + Option + Maj', 'Caps Lock + Option + Shift')
  }
};

export function getDetectedTesterPlatform() {
  return DETECTED_TESTER_PLATFORM;
}

export function getTesterPlatform() {
  return currentTesterPlatform;
}

export function setTesterPlatform(platform) {
  if (!['windows', 'mac', 'linux'].includes(platform)) {
    return currentTesterPlatform;
  }

  currentTesterPlatform = platform;
  return currentTesterPlatform;
}

export function getLayerDisplayName(layer) {
  if (!layer || layer === 'Base') return '';

  const labels = PLATFORM_LAYER_NAMES[currentTesterPlatform] || PLATFORM_LAYER_NAMES.windows;
  return labels[layer] || layer;
}
