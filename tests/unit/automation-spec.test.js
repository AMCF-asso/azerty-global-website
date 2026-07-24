'use strict';

const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const Ajv2020 = require('ajv/dist/2020');

const siteRoot = path.resolve(__dirname, '..', '..');
const specPath = path.join(siteRoot, 'docs', 'automation', 'v0.1', 'azerty-global.json');
const schemaPath = path.join(siteRoot, 'docs', 'automation', 'v0.1', 'schema.json');
const generatorPath = path.join(siteRoot, 'scripts', 'generate-automation-spec.js');
const verifierPath = path.join(siteRoot, 'scripts', 'verify-automation-spec.js');

function generate() {
  return require(generatorPath).generateSpecification();
}

test('publie un contrat versionne, schema et sous licence EUPL-1.2', () => {
  assert.equal(existsSync(specPath), true, 'la specification generee doit exister');
  const spec = generate();

  assert.equal(spec.$schema, 'https://azerty.global/docs/automation/v0.1/schema.json');
  assert.equal(spec.schemaVersion, '0.1.0');
  assert.equal(spec.license, 'EUPL-1.2');
});

test('est importable sans effet de bord et expose un generateur pur', () => {
  const originalWriteFileSync = fs.writeFileSync;
  let writes = 0;
  let generator;
  fs.writeFileSync = (...args) => {
    writes += 1;
    return originalWriteFileSync(...args);
  };
  try {
    delete require.cache[require.resolve(generatorPath)];
    generator = require(generatorPath);
  } finally {
    fs.writeFileSync = originalWriteFileSync;
  }

  assert.equal(writes, 0, 'l import du generateur ne doit ecrire aucun fichier');
  assert.equal(typeof generator.generateSpecification, 'function');
  assert.equal(generator.generateSpecification().schemaVersion, '0.1.0');
});

test('genere de facon deterministe les 1 005 caracteres actuels', () => {
  const generator = require(generatorPath);
  const firstSpecification = generator.generateSpecification();
  const firstSerialization = generator.serializeSpecification(firstSpecification);
  const secondSerialization = generator.serializeSpecification(generator.generateSpecification());

  assert.equal(Object.keys(firstSpecification.characters).length, 1005);
  assert.equal(secondSerialization, firstSerialization);
  assert.equal(readFileSync(specPath, 'utf8'), firstSerialization);
});

test('aplatit les saisies directes avec leurs preconditions et modificateurs', () => {
  const spec = generate();

  assert.deepEqual(spec.characters['U+0153'].methods, [{
    kind: 'direct',
    preconditions: { capsLock: 'off' },
    steps: [{ role: 'character', code: 'KeyO', modifiers: ['AltGr'] }],
    recommendedForAutomation: true,
  }, {
    kind: 'direct',
    preconditions: { capsLock: 'on' },
    steps: [{ role: 'character', code: 'KeyO', modifiers: ['Shift', 'AltGr'] }],
    recommendedForAutomation: false,
  }]);

  assert.deepEqual(spec.characters['U+2014'].methods[0], {
    kind: 'direct',
    preconditions: { capsLock: 'off' },
    steps: [{ role: 'character', code: 'KeyT', modifiers: ['Shift', 'AltGr'] }],
    recommendedForAutomation: true,
  });
});

test('aplatit les touches mortes en deux frappes, dont le beta grec', () => {
  const spec = generate();

  assert.ok(spec.deadKeys, 'le registre des touches mortes doit exister');
  assert.deepEqual(spec.deadKeys.dk_greek.methods[0], {
    kind: 'deadKey',
    preconditions: { capsLock: 'off' },
    steps: [{ role: 'deadKey', code: 'Backslash', modifiers: ['Shift'] }],
    recommendedForAutomation: true,
  });
  assert.deepEqual(spec.characters['U+03B2'].methods[0], {
    kind: 'deadKey',
    preconditions: { capsLock: 'off' },
    steps: [
      { role: 'deadKey', code: 'Backslash', modifiers: ['Shift'] },
      { role: 'character', code: 'KeyB', modifiers: [] },
    ],
    recommendedForAutomation: true,
  });
});

test('recommande les majuscules accentuees francaises via circonflexe puis leur touche minuscule', () => {
  const spec = generate();
  const expectedCharacterKeys = {
    'U+00C9': 'Digit2',
    'U+00C8': 'Digit7',
    'U+00C7': 'Digit9',
    'U+00C0': 'Digit0',
  };

  for (const [codePoint, characterKey] of Object.entries(expectedCharacterKeys)) {
    const recommended = spec.characters[codePoint].methods
      .filter((method) => method.recommendedForAutomation);

    assert.deepEqual(recommended, [{
      kind: 'deadKey',
      preconditions: { capsLock: 'off' },
      steps: [
        { role: 'deadKey', code: 'BracketLeft', modifiers: [] },
        { role: 'character', code: characterKey, modifiers: [] },
      ],
      recommendedForAutomation: true,
    }], codePoint);
  }
});

test('publie toutes les methodes de caracteres a touche morte en deux etapes compatibles', () => {
  const spec = generate();
  const deadKeyMethods = Object.values(spec.characters)
    .flatMap((character) => character.methods)
    .filter((method) => method.kind === 'deadKey');

  assert.ok(deadKeyMethods.length > 0);
  assert.equal(deadKeyMethods.every((method) => method.steps.length === 2), true);
  for (const method of deadKeyMethods) {
    const compatibleActivation = Object.values(spec.deadKeys).some((deadKey) => deadKey.methods.some((activation) => (
      activation.preconditions.capsLock === method.preconditions.capsLock
      && JSON.stringify(activation.steps[0]) === JSON.stringify(method.steps[0])
    )));
    assert.equal(compatibleActivation, true);
  }
  for (const character of Object.values(spec.characters)) {
    assert.equal(character.methods.filter((method) => method.recommendedForAutomation).length, 1);
  }
});

test('publie les metadonnees de caracteres sans inventer de traductions', () => {
  const spec = generate();
  const oe = spec.characters['U+0153'];

  assert.deepEqual(oe, {
    codePoint: 'U+0153',
    glyph: 'œ',
    unicodeNames: {
      en: 'LATIN SMALL LIGATURE OE',
      fr: 'LIGATURE OE MINUSCULE',
    },
    aliases: {
      fr: ["e dans l'o", "e-dans-l'o", 'o e collés', 'oe collés'],
      en: ['oe ligature'],
    },
    methods: oe.methods,
  });
  assert.deepEqual(spec.characters['U+0061'].aliases, { fr: [], en: [] });
});

test('expose le modele logique, les plateformes et les controles TAB LF CR', () => {
  const spec = generate();
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

  assert.deepEqual(spec.layout, {
    id: 'azerty-global',
    name: 'AZERTY Global',
    version: '2026',
    geometry: 'ISO',
    platforms: ['windows', 'macos', 'linux'],
    status: 'logical-common',
    capabilities: { capsLock: true, altGr: true },
  });
  assert.deepEqual(spec.modifierModel, {
    kind: 'logical',
    modifiers: ['Shift', 'AltGr'],
    usbHidScancodes: false,
  });
  assert.deepEqual(Object.keys(spec.controls), ['U+0009', 'U+000A', 'U+000D']);
  assert.equal(spec.controls['U+0009'].methods[0].steps[0].code, 'Tab');
  assert.equal(spec.controls['U+000A'].methods[0].steps[0].code, 'Enter');
  assert.equal(spec.controls['U+000D'].methods[0].steps[0].code, 'Enter');
  assert.deepEqual(schema.required, [
    '$schema', 'schemaVersion', 'license', 'layout', 'modifierModel', 'characters', 'deadKeys', 'controls',
  ]);
  assert.deepEqual(schema.properties.controls.required, ['U+0009', 'U+000A', 'U+000D']);
  assert.equal(schema.$defs.methods.minContains, 1);
  assert.equal(schema.$defs.methods.maxContains, 1);
  assert.equal(schema.$defs.character.properties.methods.$ref, '#/$defs/characterMethods');
  assert.equal(schema.$defs.characterMethod.allOf[1].oneOf.length, 2);
});

test('le JSON Schema rejette les formes machine structurellement invalides', () => {
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  const base = generate();

  const malformedDeadKey = structuredClone(base);
  const deadKeyId = Object.keys(malformedDeadKey.deadKeys)[0];
  malformedDeadKey.deadKeys[deadKeyId].methods[0] = {
    kind: 'direct',
    preconditions: { capsLock: 'off' },
    steps: [{ role: 'character', code: '', modifiers: [] }],
    recommendedForAutomation: true,
  };

  const malformedControl = structuredClone(base);
  malformedControl.controls['U+0009'].methods[0] = {
    kind: 'deadKey',
    preconditions: { capsLock: 'off' },
    steps: [{ role: 'deadKey', code: 'Tab', modifiers: [] }],
    recommendedForAutomation: true,
  };

  const malformedGlyph = structuredClone(base);
  const characterId = Object.keys(malformedGlyph.characters)[0];
  malformedGlyph.characters[characterId].glyph = 'ab';

  const duplicateMethod = structuredClone(base);
  const duplicateCharacterId = Object.keys(duplicateMethod.characters)
    .find((codePoint) => duplicateMethod.characters[codePoint].methods.some((method) => !method.recommendedForAutomation));
  const nonRecommended = duplicateMethod.characters[duplicateCharacterId].methods
    .find((method) => !method.recommendedForAutomation);
  duplicateMethod.characters[duplicateCharacterId].methods.push(structuredClone(nonRecommended));

  for (const [label, specification] of [
    ['activation de touche morte', malformedDeadKey],
    ['controle', malformedControl],
    ['glyphe', malformedGlyph],
    ['methode dupliquee', duplicateMethod],
  ]) {
    assert.equal(validate(specification), false, `${label} invalide acceptee par le Schema`);
  }
});

test('le verificateur applique le JSON Schema complet a une instance', () => {
  delete require.cache[require.resolve(verifierPath)];
  const verifier = require(verifierPath);
  assert.equal(typeof verifier.validateAgainstSchema, 'function');

  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const malformed = generate();
  malformed.controls['U+0009'].methods[0].kind = 'deadKey';
  assert.throws(
    () => verifier.validateAgainstSchema(schema, malformed),
    /JSON Schema/,
  );
});

test('verifie le contrat publie, les invariants et la reproductibilite octet pour octet', () => {
  const result = spawnSync(process.execPath, [verifierPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /automation specification: valid/);
});
