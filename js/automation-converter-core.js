(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.AzertyAutomationConverterCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function codePointKey(character) {
    return `U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
  }

  function validateInput(input) {
    const codePointCount = Array.from(input).length;

    return {
      codePointCount,
      isEmpty: codePointCount === 0,
      isTooLong: codePointCount > 200
    };
  }

  function convert(input, spec) {
    const tokens = [];
    let index = 0;
    const characters = Array.from(input);

    for (let cursor = 0; cursor < characters.length; cursor += 1) {
      const character = characters[cursor];
      const isCrLf = character === '\r' && characters[cursor + 1] === '\n';
      const source = isCrLf ? '\r\n' : character;
      const codePoint = codePointKey(character);
      const control = spec.controls && spec.controls[codePoint];
      const controlMethod = control && Array.isArray(control.methods)
        ? control.methods.find((candidate) => candidate.recommendedForAutomation)
        : null;
      const entry = spec.characters && spec.characters[codePoint];
      const method = entry && Array.isArray(entry.methods)
        ? entry.methods.find((candidate) => candidate.recommendedForAutomation)
        : null;

      if (controlMethod) {
        tokens.push({
          index,
          codePoint,
          character: source,
          kind: 'control',
          supported: true,
          action: codePoint === 'U+0009' ? 'Tab' : 'Enter',
          method: controlMethod
        });
      } else {
        tokens.push({
          index,
          codePoint,
          character: source,
          kind: 'character',
          supported: Boolean(method),
          ...(method ? { method } : {})
        });
      }
      index += Array.from(source).length;
      if (isCrLf) cursor += 1;
    }

    return {
      schemaVersion: spec.schemaVersion,
      layoutVersion: spec.layoutVersion || (spec.layout && spec.layout.version),
      input,
      tokens
    };
  }

  return { convert, validateInput };
}));
