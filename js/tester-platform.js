const DETECTED_TESTER_PLATFORM = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  ? 'mac'
  : (/Linux/.test(navigator.platform) ? 'linux' : 'windows');

let currentTesterPlatform = DETECTED_TESTER_PLATFORM;

const PLATFORM_LAYER_NAMES = {
  windows: {
    'Shift': 'Maj',
    'Caps': 'Verr. Maj.',
    'AltGr': 'AltGr',
    'Caps+Shift': 'Verr. Maj. + Maj',
    'Shift+AltGr': 'AltGr + Maj',
    'Caps+AltGr': 'Verr. Maj. + AltGr',
    'Caps+Shift+AltGr': 'Verr. Maj. + AltGr + Maj'
  },
  linux: {
    'Shift': 'Maj',
    'Caps': 'Verr. Maj.',
    'AltGr': 'AltGr',
    'Caps+Shift': 'Verr. Maj. + Maj',
    'Shift+AltGr': 'AltGr + Maj',
    'Caps+AltGr': 'Verr. Maj. + AltGr',
    'Caps+Shift+AltGr': 'Verr. Maj. + AltGr + Maj'
  },
  mac: {
    'Shift': 'Maj',
    'Caps': 'Verr. Maj.',
    'AltGr': 'Option',
    'Caps+Shift': 'Verr. Maj. + Maj',
    'Shift+AltGr': 'Option + Maj',
    'Caps+AltGr': 'Verr. Maj. + Option',
    'Caps+Shift+AltGr': 'Verr. Maj. + Option + Maj'
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
