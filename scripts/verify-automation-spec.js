#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');
const { generateSpecification, serializeSpecification } = require('./generate-automation-spec.js');

const siteRoot = path.resolve(__dirname, '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(siteRoot, relativePath), 'utf8'));
const readText = (relativePath) => fs.readFileSync(path.join(siteRoot, relativePath), 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function codePointFor(glyph) {
  return `U+${glyph.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
}

function assertMethod(method, location, expectedSteps) {
  assert(['direct', 'deadKey'].includes(method.kind), `${location}: kind invalide`);
  assert(['on', 'off'].includes(method.preconditions?.capsLock), `${location}: precondition Caps Lock invalide`);
  const expectedLength = expectedSteps || (method.kind === 'direct' ? 1 : 2);
  assert(Array.isArray(method.steps) && method.steps.length === expectedLength, `${location}: nombre d etapes invalide`);
  assert(typeof method.recommendedForAutomation === 'boolean', `${location}: recommandation absente`);

  for (const [index, step] of method.steps.entries()) {
    assert(['character', 'deadKey', 'control'].includes(step.role), `${location}: role invalide`);
    assert(typeof step.code === 'string' && step.code.length > 0, `${location}: code absent`);
    assert(Array.isArray(step.modifiers) && step.modifiers.every((modifier) => ['Shift', 'AltGr'].includes(modifier)), `${location}: modificateurs invalides`);
    assert(new Set(step.modifiers).size === step.modifiers.length, `${location}: modificateurs dupliques`);
    if (method.kind === 'deadKey') {
      const expectedRole = expectedLength === 1 ? 'deadKey' : (index === 0 ? 'deadKey' : 'character');
      assert(step.role === expectedRole, `${location}: roles de touche morte invalides`);
    }
  }
}

function assertMethods(methods, location, expectedSteps) {
  assert(Array.isArray(methods) && methods.length > 0, `${location}: methodes absentes`);
  assert(methods.filter((method) => method.recommendedForAutomation).length === 1, `${location}: il faut exactement une recommandation`);
  methods.forEach((method, index) => assertMethod(method, `${location}[${index}]`, expectedSteps));
}

function validateAgainstSchema(schema, specification) {
  let validate;
  try {
    validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  } catch (error) {
    throw new Error(`JSON Schema invalide : ${error.message}`);
  }

  if (!validate(specification)) {
    const details = validate.errors
      .map((error) => `${error.instancePath || '/'} ${error.message}`)
      .join('; ');
    throw new Error(`instance non conforme au JSON Schema : ${details}`);
  }
}

function main() {
try {
  const source = readJson('tester/azerty-global.json');
  const characterIndex = readJson('tester/character-index.json');
  const schema = readJson('docs/automation/v0.1/schema.json');
  const actualText = readText('docs/automation/v0.1/azerty-global.json');
  const specification = JSON.parse(actualText);
  const expectedText = serializeSpecification(generateSpecification());

  validateAgainstSchema(schema, specification);
  assert(actualText === expectedText, 'la specification publiee ne correspond pas octet pour octet a une regeneration');
  assert(specification.$schema === 'https://azerty.global/docs/automation/v0.1/schema.json', '$schema invalide');
  assert(specification.schemaVersion === '0.1.0', 'schemaVersion doit valoir 0.1.0');
  assert(specification.license === 'EUPL-1.2', 'licence invalide');
  assert(JSON.stringify(schema.required) === JSON.stringify([
    '$schema', 'schemaVersion', 'license', 'layout', 'modifierModel', 'characters', 'deadKeys', 'controls',
  ]), 'schema racine incomplet');
  assert(JSON.stringify(schema.properties.controls.required) === JSON.stringify(['U+0009', 'U+000A', 'U+000D']), 'schema controls invalide');
  assert(!Object.hasOwn(specification, 'generated'), 'la specification ne doit pas contenir d horodatage');
  assert(JSON.stringify(specification.layout) === JSON.stringify({
    id: source.name,
    name: 'AZERTY Global',
    version: source.version,
    geometry: source.geometry.toUpperCase(),
    platforms: ['windows', 'macos', 'linux'],
    status: 'logical-common',
    capabilities: { capsLock: source.capslock, altGr: source.altgr },
  }), 'modele logique de disposition invalide');
  assert(JSON.stringify(specification.modifierModel) === JSON.stringify({
    kind: 'logical',
    modifiers: ['Shift', 'AltGr'],
    usbHidScancodes: false,
  }), 'modele de modificateurs invalide');

  const indexedCharacters = Object.entries(characterIndex.characters)
    .filter(([glyph]) => !glyph.startsWith('dk:'));
  assert(indexedCharacters.length === 1005, 'la source doit contenir 1 005 caracteres actuels');
  assert(Object.keys(specification.characters).length === indexedCharacters.length, 'nombre de caracteres publie invalide');

  for (const [glyph, sourceEntry] of indexedCharacters) {
    const entry = specification.characters[sourceEntry.codePoint];
    assert(entry, `caractere absent : ${sourceEntry.codePoint}`);
    assert(entry.codePoint === sourceEntry.codePoint && entry.glyph === glyph && codePointFor(entry.glyph) === sourceEntry.codePoint, `indexation invalide : ${sourceEntry.codePoint}`);
    assert(JSON.stringify(entry.unicodeNames) === JSON.stringify({
      en: sourceEntry.unicodeName || null,
      fr: sourceEntry.unicodeNameFr || null,
    }), `noms Unicode invalides : ${sourceEntry.codePoint}`);
    assert(JSON.stringify(entry.aliases) === JSON.stringify({
      fr: Array.isArray(sourceEntry.frenchAliases) ? sourceEntry.frenchAliases : [],
      en: Array.isArray(sourceEntry.englishAliases) ? sourceEntry.englishAliases : [],
    }), `alias invalides : ${sourceEntry.codePoint}`);
    assertMethods(entry.methods, `characters.${sourceEntry.codePoint}`);
    assert(entry.methods.length === sourceEntry.methods.length, `methodes incompletes : ${sourceEntry.codePoint}`);
  }

  const sourceDeadKeys = Object.entries(characterIndex.characters)
    .filter(([glyph]) => glyph.startsWith('dk:'))
    .flatMap(([, entry]) => entry.methods.map((method) => method.deadkey));
  assert(Object.keys(specification.deadKeys).length === new Set(sourceDeadKeys).size, 'registre des touches mortes incomplet');
  for (const deadKey of sourceDeadKeys) {
    const entry = specification.deadKeys[deadKey];
    assert(entry, `touche morte absente : ${deadKey}`);
    assertMethods(entry.methods, `deadKeys.${deadKey}`, 1);
    assert(entry.methods.every((method) => method.kind === 'deadKey' && method.steps.length === 1), `activation invalide : ${deadKey}`);
  }

  for (const [codePoint, character] of Object.entries(specification.characters)) {
    for (const method of character.methods.filter((candidate) => candidate.kind === 'deadKey')) {
      const compatibleActivation = Object.values(specification.deadKeys).some((deadKey) => deadKey.methods.some((activation) => (
        activation.preconditions.capsLock === method.preconditions.capsLock
        && JSON.stringify(activation.steps[0]) === JSON.stringify(method.steps[0])
      )));
      assert(compatibleActivation, `activation incompatible : ${codePoint}`);
    }
  }

  const controls = {
    'U+0009': ['TAB', '\t', 'Tab'],
    'U+000A': ['LF', '\n', 'Enter'],
    'U+000D': ['CR', '\r', 'Enter'],
  };
  assert(JSON.stringify(Object.keys(specification.controls)) === JSON.stringify(Object.keys(controls)), 'controles publies invalides');
  for (const [codePoint, [name, character, code]] of Object.entries(controls)) {
    const control = specification.controls[codePoint];
    assert(control?.name === name && control.codePoint === codePoint && control.character === character, `controle invalide : ${name}`);
    assertMethods(control.methods, `controls.${name}`);
    assert(control.methods[0].steps[0].role === 'control' && control.methods[0].steps[0].code === code, `frappe invalide : ${name}`);
  }

  const accentedCapitals = {
    'U+00C9': 'Digit2',
    'U+00C8': 'Digit7',
    'U+00C7': 'Digit9',
    'U+00C0': 'Digit0',
  };
  for (const [codePoint, characterKey] of Object.entries(accentedCapitals)) {
    const character = specification.characters[codePoint];
    assert(character.methods.some((method) => method.recommendedForAutomation
      && method.kind === 'deadKey'
      && method.preconditions.capsLock === 'off'
      && method.steps[0].code === 'BracketLeft'
      && method.steps[0].modifiers.length === 0
      && method.steps[1].code === characterKey
      && method.steps[1].modifiers.length === 0), `${codePoint} doit recommander circonflexe puis la touche minuscule accentuee`);
  }

  process.stdout.write('automation specification: valid\n');
} catch (error) {
  process.stderr.write(`automation specification: invalid - ${error.message}\n`);
  process.exitCode = 1;
}
}

if (require.main === module) main();

module.exports = { main, validateAgainstSchema };
