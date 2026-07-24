const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const siteRoot = path.resolve(__dirname, '..', '..');
const corePath = path.join(siteRoot, 'js', 'automation-converter-core.js');
const converterCore = require('../../js/automation-converter-core.js');

test('publie le noyau de conversion utilisable par le navigateur', () => {
  assert.equal(existsSync(corePath), true);
});

test('convertit un caractere supporte avec sa methode recommandee', () => {
  const recommendedMethod = { sequence: ['KeyA'], recommendedForAutomation: true };
  const spec = {
    schemaVersion: '0.1.0',
    layoutVersion: '2026.0.0',
    characters: { 'U+0061': { methods: [recommendedMethod] } },
    controls: {}
  };

  assert.deepEqual(converterCore.convert('a', spec), {
    schemaVersion: '0.1.0',
    layoutVersion: '2026.0.0',
    input: 'a',
    tokens: [{
      index: 0,
      codePoint: 'U+0061',
      character: 'a',
      kind: 'character',
      supported: true,
      method: recommendedMethod
    }]
  });
});

test('conserve un caractere non supporte et compte ses points de code', () => {
  const result = converterCore.convert('\u{1F600}a', {
    schemaVersion: '0.1.0',
    layoutVersion: '2026.0.0',
    characters: { 'U+0061': { methods: [{ sequence: ['KeyA'], recommendedForAutomation: true }] } },
    controls: {}
  });

  assert.deepEqual(result.tokens[0], {
    index: 0,
    codePoint: 'U+1F600',
    character: '\u{1F600}',
    kind: 'character',
    supported: false
  });
  assert.equal(result.tokens[1].index, 1, 'la position suivante est en points de code');
});

test('convertit une tabulation en controle Tab', () => {
  const method = { steps: [{ code: 'Tab' }], recommendedForAutomation: true };
  const result = converterCore.convert('\t', {
    schemaVersion: '0.1.0', layoutVersion: '2026.0.0', characters: {},
    controls: { 'U+0009': { methods: [method] } }
  });

  assert.deepEqual(result.tokens, [{
    index: 0, codePoint: 'U+0009', character: '\t', kind: 'control',
    supported: true, action: 'Tab', method
  }]);
});

test('convertit CRLF en un seul Enter et conserve les positions', () => {
  const enter = { steps: [{ code: 'Enter' }], recommendedForAutomation: true };
  const result = converterCore.convert('\r\na', {
    schemaVersion: '0.1.0', layoutVersion: '2026.0.0',
    characters: { 'U+0061': { methods: [{ sequence: ['KeyA'], recommendedForAutomation: true }] } },
    controls: {
      'U+000A': { methods: [enter] },
      'U+000D': { methods: [enter] }
    }
  });

  assert.equal(result.tokens.length, 2);
  assert.deepEqual(result.tokens[0], {
    index: 0, codePoint: 'U+000D', character: '\r\n', kind: 'control',
    supported: true, action: 'Enter', method: enter
  });
  assert.equal(result.tokens[1].index, 2);
});

test('convertit LF et CR isoles en Enter', () => {
  const enter = { steps: [{ code: 'Enter' }], recommendedForAutomation: true };
  const spec = {
    schemaVersion: '0.1.0', layoutVersion: '2026.0.0', characters: {},
    controls: {
      'U+000A': { methods: [enter] },
      'U+000D': { methods: [enter] }
    }
  };

  assert.deepEqual(
    converterCore.convert('\n\r', spec).tokens.map((token) => ({ codePoint: token.codePoint, action: token.action })),
    [
      { codePoint: 'U+000A', action: 'Enter' },
      { codePoint: 'U+000D', action: 'Enter' }
    ]
  );
});

test('preserve le texte Unicode decompose sans normalisation implicite', () => {
  const direct = { steps: [{ code: 'KeyE' }], recommendedForAutomation: true };
  const combining = { steps: [{ code: 'Quote' }, { code: 'Space' }], recommendedForAutomation: true };
  const input = 'e\u0301';
  const output = converterCore.convert(input, {
    schemaVersion: '0.1.0', layoutVersion: '2026.0.0', controls: {},
    characters: {
      'U+0065': { methods: [direct] },
      'U+0301': { methods: [combining] }
    }
  });

  assert.equal(output.input, input);
  assert.deepEqual(output.tokens.map((token) => token.codePoint), ['U+0065', 'U+0301']);
  assert.equal(output.tokens.length, 2);
});

test('compte les points de code et signale une saisie superieure a 200', () => {
  assert.deepEqual(converterCore.validateInput('a'.repeat(200)), {
    codePointCount: 200, isEmpty: false, isTooLong: false
  });
  assert.deepEqual(converterCore.validateInput('a'.repeat(199) + '\u{1F600}' + '\u{1F600}'), {
    codePointCount: 201, isEmpty: false, isTooLong: true
  });
});

test('exporte la version de disposition du contrat', () => {
  const output = converterCore.convert('', {
    schemaVersion: '0.1.0', layout: { version: '2026' }, characters: {}, controls: {}
  });

  assert.equal(output.layoutVersion, '2026');
});
