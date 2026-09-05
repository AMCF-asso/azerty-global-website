const fs = require('fs');
const path = require('path');
const { test, expect } = require('../helpers/local-site');

const evidenceRoot = path.resolve(__dirname, '../../.internal/night-v15/native-input');

async function startWithEnginePrefix(page) {
  await page.goto('/bienvenue');
  await page.locator('#welcome-start').click();
  const input = page.locator('#welcome-input');
  await expect(input).toBeVisible();
  await page.locator('#welcome-keyboard-container [data-key-id="CapsLock"]').click();
  await page.locator('#welcome-keyboard-container [data-key-id="Digit9"]').click();
  await expect(input).toHaveText('Ç');
  await input.focus();
  return input;
}

async function selectionState(input) {
  return input.evaluate(node => {
    const selection = window.getSelection();
    const offset = (container, position) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      range.setEnd(container, position);
      return range.toString().length;
    };
    return { anchor: offset(selection.anchorNode, selection.anchorOffset), focus: offset(selection.focusNode, selection.focusOffset), text: selection.toString() };
  });
}

test('identical native replacement preserves both selection directions', async ({ page }) => {
  const input = await startWithEnginePrefix(page);
  for (const direction of ['forward', 'backward']) {
    await page.keyboard.press(direction === 'forward' ? 'Home' : 'End');
    await page.keyboard.press(direction === 'forward' ? 'Shift+End' : 'Shift+Home');
    const selection = await selectionState(input);
    expect(selection).toEqual(direction === 'forward'
      ? { anchor: 0, focus: 1, text: 'Ç' }
      : { anchor: 1, focus: 0, text: 'Ç' });
    await page.keyboard.insertText('Ç');
    await expect(input).toHaveText('Ç');
    expect(await selectionState(input)).toEqual(selection);
    await expect(page.locator('#welcome-continue')).toBeHidden();
  }
});

test('unrelated synthetic input cannot validate a gesture and engine deletion still works', async ({ page }) => {
  const input = await startWithEnginePrefix(page);
  // Deliberately simulate an unrelated script's edit; this must never act as
  // evidence that the user produced the target with the layout engine.
  await input.evaluate(node => {
    node.textContent = 'ÇA GÈLE DÉJÀ ?';
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(input).toHaveText('Ç');
  await expect(page.locator('#welcome-continue')).toBeHidden();
  await page.keyboard.press('Backspace');
  await expect(input).toHaveText('');
  await page.locator('#welcome-keyboard-container [data-key-id="KeyQ"]').click();
  await expect(input).toHaveText('A');
  await page.locator('#welcome-keyboard-container [data-key-id="Backspace"]').click();
  await expect(input).toHaveText('');
  await page.locator('#welcome-keyboard-container [data-key-id="KeyQ"]').click();
  await expect(input).toHaveText('A');
  await input.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('Delete');
  await expect(input).toHaveText('');
});

test('native insertion cannot replace text accepted by the welcome keyboard engine', async ({ page, network }, testInfo) => {
  await page.addInitScript(() => {
    window.__welcomeNativeEvents = [];
    const entries = new WeakMap();
    for (const type of ['beforeinput', 'input', 'compositionstart', 'compositionupdate', 'compositionend', 'paste']) {
      document.addEventListener(type, event => {
        if (event.target.id !== 'welcome-input') return;
        const entry = { type, inputType: event.inputType || '', data: event.data || '', cancelable: event.cancelable, isTrusted: event.isTrusted, isComposing: event.isComposing || false, before: event.target.textContent };
        window.__welcomeNativeEvents.push(entry);
        entries.set(event, entry);
      }, true);
      document.addEventListener(type, event => {
        const entry = entries.get(event);
        if (entry) {
          entry.defaultPrevented = event.defaultPrevented;
          entry.after = event.target.textContent;
        }
      });
    }
  });
  try {
    await page.goto('/bienvenue');
    await page.locator('#welcome-start').click();
    const input = page.locator('#welcome-input');
    await expect(input).toBeVisible();
    await input.focus();
    await page.keyboard.insertText('ÇA GÈLE DÉJÀ ?');
    await expect(input).toHaveText('');
    await expect(page.locator('#welcome-continue')).toBeHidden();

    // A real visual Caps click and engine key clicks provide an accepted prefix.
    await page.locator('#welcome-keyboard-container [data-key-id="CapsLock"]').click();
    await page.locator('#welcome-keyboard-container [data-key-id="Digit9"]').click();
    await expect(input).toHaveText('Ç');
    await input.focus();
    await page.keyboard.press('Shift+Home');
    await page.keyboard.insertText('texte natif');
    await expect(input).toHaveText('Ç');
    expect(await input.evaluate(() => window.getSelection().toString())).toBe('Ç');
    // Selection survives the rejected native replacement: the next engine key
    // replaces the selected prefix instead of appending or losing prior text.
    await page.locator('#welcome-keyboard-container [data-key-id="KeyQ"]').click();
    await expect(input).toHaveText('A');
    await expect(page.locator('#welcome-continue')).toBeHidden();
    expect(network.web3FormsRequests).toEqual([]);
    expect(network.pageErrors).toEqual([]);
    expect(network.cspViolations).toEqual([]);
  } finally {
    fs.mkdirSync(evidenceRoot, { recursive: true });
    const file = path.join(evidenceRoot, `${process.env.NATIVE_INPUT_PHASE || 'current'}-${testInfo.project.name}.json`);
    fs.writeFileSync(file, JSON.stringify(await page.evaluate(() => window.__welcomeNativeEvents), null, 2) + '\n');
    await testInfo.attach('native-input-events', { path: file, contentType: 'application/json' });
  }
});
