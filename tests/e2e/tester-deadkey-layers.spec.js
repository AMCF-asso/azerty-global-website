const fs = require('fs');
const path = require('path');
const { test, expect } = require('../helpers/local-site');

// Expected output comes from the protected source, never from the resolver or
// the visual keycaps (their Caps+Shift display is a separate audited issue).
const canonical = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/AZERTY Global.json'), 'utf8'));
const layerNames = ['Base', 'Shift', 'Caps', 'Caps+Shift', 'AltGr', 'Shift+AltGr', 'Caps+AltGr', 'Caps+Shift+AltGr'];
const codesByPosition = Object.fromEntries([
  ['E', 0, ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal']],
  ['D', 1, ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight']],
  ['C', 1, ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Backslash']],
  ['B', 0, ['IntlBackslash', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash']],
  ['A', 3, ['Space']]
].flatMap(([row, start, codes]) => codes.map((code, index) => [row + String(start + index).padStart(2, '0'), code])));

function canonicalLayers(key) {
  const base = key.base ?? null;
  const shift = key.shift ?? null;
  const altgr = key.alt_gr ?? null;
  const shiftAltgr = key.shift_alt_gr ?? null;
  return [base, shift, Object.hasOwn(key, 'caps') ? key.caps : base,
    Object.hasOwn(key, 'caps_shift') ? key.caps_shift : shift, altgr, shiftAltgr,
    Object.hasOwn(key, 'caps_alt_gr') ? key.caps_alt_gr : altgr,
    Object.hasOwn(key, 'caps_shift_alt_gr') ? key.caps_shift_alt_gr : shiftAltgr];
}

const canonicalKeymap = Object.fromEntries(canonical.rows.flatMap(row => row.keys)
  .map(key => [codesByPosition[key.position], canonicalLayers(key)]));
const canonicalDeadkeys = Object.fromEntries(Object.entries(canonical.dead_keys).map(([name, data]) => [name, data.table]));

test('resolves canonical dead-key combinations and direct controls on all eight layers', async ({ page }, testInfo) => {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(async ({ keymap, deadkeys, layerNames }) => {
    const { AZERTYKeyboard } = await import('/tester/keyboard.js?v=final-20260801-1');
    const shipped = await fetch('/tester/azerty-global.json').then(response => response.json());
    const output = [];
    const keyboard = new AZERTYKeyboard(document.createElement('div'), { onKeyClick: char => output.push(char) });
    keyboard.setLayout(shipped.keymap, shipped.deadkeys);
    const layers = layerNames.map(layer => ({ layer, directChecks: 0, deadKeyChecks: 0, failures: [] }));
    for (const [key, values] of Object.entries(keymap)) {
      for (let layer = 0; layer < values.length; layer++) {
        const input = values[layer];
        // Dead-key-to-dead-key chaining follows another branch; a UI witness
        // below protects it without widening this layer-resolution regression.
        if (!input || input.startsWith('dk_')) continue;
        for (const deadKeyName of [null, ...Object.keys(deadkeys)]) {
          const expected = deadKeyName ? deadkeys[deadKeyName][input] : input;
          if (!expected) continue;
          keyboard.reset();
          keyboard.setShift(Boolean(layer & 1));
          keyboard.setCaps(Boolean(layer & 2));
          keyboard.setAltGr(Boolean(layer & 4));
          if (deadKeyName) keyboard.activateDeadKey(deadKeyName);
          output.length = 0;
          keyboard.handleKeyClick(key, true);
          const actual = output.join('');
          layers[layer][deadKeyName ? 'deadKeyChecks' : 'directChecks']++;
          if (actual !== expected || keyboard.state.activeDeadKey !== null) {
            layers[layer].failures.push({ key, deadKeyName, input, expected, actual, activeDeadKey: keyboard.state.activeDeadKey });
          }
        }
      }
    }
    return { shipped, layers };
  }, { keymap: canonicalKeymap, deadkeys: canonicalDeadkeys, layerNames });

  const evidencePath = testInfo.outputPath('canonical-layer-results.json');
  fs.writeFileSync(evidencePath, JSON.stringify(result.layers, null, 2));
  await testInfo.attach('canonical-layer-results', { path: evidencePath, contentType: 'application/json' });
  // The site also adds numeric-keypad entries outside the 49 canonical keys.
  expect(Object.fromEntries(Object.keys(canonicalKeymap).map(key => [key, result.shipped.keymap[key]]))).toEqual(canonicalKeymap);
  expect(result.shipped.deadkeys).toEqual(canonicalDeadkeys);
  for (const layer of result.layers) {
    expect(layer.directChecks, `${layer.layer}: direct controls exercised`).toBeGreaterThan(0);
    expect(layer.deadKeyChecks, `${layer.layer}: dead-key combinations exercised`).toBeGreaterThan(0);
    expect.soft(layer.failures, layer.layer).toEqual([]);
  }
});

async function openFreeTester(page) {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('azertyTutorialDone', '2026-05-28T00:00:00.000Z'));
  await page.locator('#open-tester-btn').click();
  await expect(page.locator('#tester-modal')).toBeVisible();
  await page.locator('#tab-libre').click();
  await expect(page.locator('#modal-keyboard-container [data-key-id="KeyQ"]')).toBeVisible();
}

async function clickKeys(page, keys) {
  for (const key of keys) {
    await page.locator(`#modal-keyboard-container [data-key-id="${key}"]`).click();
  }
}

for (let layer = 0; layer < layerNames.length; layer++) {
  test(`types acute A from the ${layerNames[layer]} canonical layer through virtual keys`, async ({ page }) => {
    await openFreeTester(page);
    const modifiers = [layer & 2 ? 'CapsLock' : null, layer & 1 ? 'ShiftLeft' : null, layer & 4 ? 'AltRight' : null].filter(Boolean);
    await clickKeys(page, ['Quote', ...modifiers, 'KeyQ']);
    const expected = canonicalDeadkeys.dk_acute[canonicalKeymap.KeyQ[layer]];
    await expect(page.locator('#modal-output')).toHaveText(expected);
    await expect(page.locator('#modal-keyboard-container')).not.toHaveClass(/dead-key-active/);
  });
}

test('types scientific euro and Smart Caps accented letters through virtual keys', async ({ page }) => {
  for (const scenario of [
    { keys: ['AltRight', 'Equal', 'KeyE'], expected: '∈' },
    { keys: ['AltRight', 'Equal', 'AltRight', 'KeyE'], expected: '∉' },
    { keys: ['AltRight', 'Digit6', 'Digit2'], expected: 'ǝ' },
    { keys: ['AltRight', 'Digit6', 'CapsLock', 'Digit2'], expected: 'Ǝ' },
    { keys: ['BracketLeft', 'CapsLock', 'ShiftLeft', 'KeyQ'], expected: 'â' }
  ]) {
    await openFreeTester(page);
    await clickKeys(page, scenario.keys);
    await expect.soft(page.locator('#modal-output'), scenario.keys.join(' → ')).toHaveText(scenario.expected);
  }
});

test('keeps an unmatched AltGr dead key pending until a valid combination is typed', async ({ page }) => {
  await openFreeTester(page);
  await clickKeys(page, ['Quote', 'AltRight', 'KeyR']);
  await expect(page.locator('#modal-output')).toHaveText('');
  await expect(page.locator('#modal-keyboard-container')).toHaveClass(/dead-key-active/);
  await clickKeys(page, ['AltRight', 'KeyQ']);
  await expect(page.locator('#modal-output')).toHaveText('á');
});

test('preserves fallback, double-dead-key and ordinary Shift controls', async ({ page }) => {
  expect(canonicalKeymap.KeyH[0]).toBe('h');
  expect(Object.hasOwn(canonicalDeadkeys.dk_acute, 'h')).toBe(false);
  await openFreeTester(page);
  await clickKeys(page, ['Quote', 'KeyH']);
  await expect(page.locator('#modal-output')).toHaveText('´h');

  await openFreeTester(page);
  await clickKeys(page, ['BracketLeft', 'BracketLeft']);
  await expect(page.locator('#modal-output')).toHaveText('\u0302');

  await openFreeTester(page);
  await clickKeys(page, ['ShiftLeft', 'KeyQ', 'KeyQ']);
  await expect(page.locator('#modal-output')).toHaveText('Aa');
});
