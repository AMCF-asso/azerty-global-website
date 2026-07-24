#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(__dirname, '..');
const characterIndexPath = path.join(siteRoot, 'tester', 'character-index.json');
const keyboardPath = path.join(siteRoot, 'tester', 'azerty-global.json');
const outputPath = path.join(siteRoot, 'docs', 'automation', 'v0.1', 'azerty-global.json');
const schemaUrl = 'https://azerty.global/docs/automation/v0.1/schema.json';
const lexicalCompare = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function layerDetails(layer) {
  const parts = layer.split('+');
  return {
    capsLock: parts.includes('Caps') ? 'on' : 'off',
    modifiers: parts.filter((part) => part !== 'Caps' && part !== 'Base'),
  };
}

function compareMethods(left, right) {
  return lexicalCompare(left.preconditions.capsLock, right.preconditions.capsLock)
    || left.steps.length - right.steps.length
    || left.steps.reduce((count, step) => count + step.modifiers.length, 0)
      - right.steps.reduce((count, step) => count + step.modifiers.length, 0)
    || Number(right.humanRecommended) - Number(left.humanRecommended)
    || lexicalCompare(left.lexical, right.lexical);
}

function directMethod(method) {
  const { capsLock, modifiers } = layerDetails(method.layer);
  return {
    kind: 'direct',
    preconditions: { capsLock },
    steps: [{ role: 'character', code: method.key, modifiers }],
    humanRecommended: Boolean(method.recommended),
    lexical: `${method.key}|${method.layer}`,
    recommendationKey: `direct:${method.key}:${method.layer}`,
  };
}

function deadKeyActivationMethod(method) {
  const { capsLock, modifiers } = layerDetails(method.layer);
  return {
    kind: 'deadKey',
    preconditions: { capsLock },
    steps: [{ role: 'deadKey', code: method.key, modifiers }],
    humanRecommended: Boolean(method.recommended),
    lexical: `${method.key}|${method.layer}`,
    recommendationKey: `deadKey:${method.deadkey}:${method.key}:${method.layer}`,
  };
}

function deadKeyMethod(method, activationMethods) {
  const { capsLock, modifiers } = layerDetails(method.layer);
  const activation = activationMethods.find((candidate) => candidate.preconditions.capsLock === capsLock);
  if (!activation) {
    throw new Error(`Activation introuvable pour ${method.deadkey} avec Caps Lock ${capsLock}`);
  }

  return {
    kind: 'deadKey',
    preconditions: { capsLock },
    steps: [activation.steps[0], { role: 'character', code: method.key, modifiers }],
    humanRecommended: Boolean(method.recommended),
    lexical: `${activation.lexical}|${method.key}|${method.layer}`,
    recommendationKey: `deadKey:${method.deadkey}:${method.key}:${method.layer}`,
  };
}

function publishMethods(methods) {
  const recommended = [...methods].sort(compareMethods)[0];
  return methods.map((candidate) => {
    const { humanRecommended, lexical, recommendationKey, ...method } = candidate;
    return {
      ...method,
      recommendedForAutomation: candidate === recommended,
    };
  });
}

function control(name, codePoint, character, code) {
  return {
    name,
    codePoint,
    character,
    methods: [{
      kind: 'direct',
      preconditions: { capsLock: 'off' },
      steps: [{ role: 'control', code, modifiers: [] }],
      recommendedForAutomation: true,
    }],
  };
}

function characterMetadata(character, entry, methods) {
  return {
    codePoint: entry.codePoint,
    glyph: character,
    unicodeNames: {
      en: entry.unicodeName || null,
      fr: entry.unicodeNameFr || null,
    },
    aliases: {
      fr: Array.isArray(entry.frenchAliases) ? entry.frenchAliases : [],
      en: Array.isArray(entry.englishAliases) ? entry.englishAliases : [],
    },
    methods,
  };
}

function generateSpecification() {
  const characterIndex = readJson(characterIndexPath);
  const keyboard = readJson(keyboardPath);

  if (!keyboard.keymap.NumpadEnter?.every((character) => character === '\n')) {
    throw new Error('NumpadEnter doit produire LF sur toutes les couches');
  }

  const deadKeyCandidates = Object.entries(characterIndex.characters)
    .filter(([character]) => character.startsWith('dk:'))
    .flatMap(([, entry]) => entry.methods
      .filter((method) => method.type === 'deadkey_activation')
      .map((method) => [method.deadkey, deadKeyActivationMethod(method)]));
  const activationsByDeadKey = deadKeyCandidates.reduce((result, [deadKey, method]) => {
    const methods = result.get(deadKey) || [];
    methods.push([deadKey, method]);
    result.set(deadKey, methods);
    return result;
  }, new Map());
  const deadKeys = Object.fromEntries([...activationsByDeadKey.entries()]
    .sort(([left], [right]) => lexicalCompare(left, right))
    .map(([deadKey, methods]) => [deadKey, {
      methods: publishMethods(methods.map(([, method]) => method)),
    }]));

  const characters = Object.entries(characterIndex.characters)
    .filter(([character]) => !character.startsWith('dk:'))
    .sort(([, left], [, right]) => lexicalCompare(left.codePoint, right.codePoint))
    .reduce((result, [character, entry]) => {
      const methods = publishMethods(entry.methods.flatMap((method) => {
        if (method.type === 'direct') {
          return [directMethod(method)];
        }
        if (method.type === 'deadkey') {
          const activations = activationsByDeadKey.get(method.deadkey);
          if (!activations) {
            throw new Error(`Touche morte absente du registre : ${method.deadkey}`);
          }
          return [deadKeyMethod(method, activations.map(([, activation]) => activation))];
        }
        return [];
      }));
      result[entry.codePoint] = characterMetadata(character, entry, methods);
      return result;
    }, {});

  return {
    $schema: schemaUrl,
    schemaVersion: '0.1.0',
    license: 'EUPL-1.2',
    layout: {
      id: keyboard.name,
      name: 'AZERTY Global',
      version: keyboard.version,
      geometry: keyboard.geometry.toUpperCase(),
      platforms: ['windows', 'macos', 'linux'],
      status: 'logical-common',
      capabilities: {
        capsLock: keyboard.capslock,
        altGr: keyboard.altgr,
      },
    },
    modifierModel: {
      kind: 'logical',
      modifiers: ['Shift', 'AltGr'],
      usbHidScancodes: false,
    },
    deadKeys,
    characters,
    controls: {
      'U+0009': control('TAB', 'U+0009', '\t', 'Tab'),
      'U+000A': control('LF', 'U+000A', '\n', 'Enter'),
      'U+000D': control('CR', 'U+000D', '\r', 'Enter'),
    },
  };
}

function serializeSpecification(specification = generateSpecification()) {
  return `${JSON.stringify(specification, null, 2)}\n`;
}

function writeSpecification(filePath = outputPath) {
  fs.writeFileSync(filePath, serializeSpecification(), 'utf8');
}

if (require.main === module) {
  writeSpecification();
}

module.exports = { generateSpecification, serializeSpecification, writeSpecification };
