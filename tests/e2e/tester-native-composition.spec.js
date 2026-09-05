const fs = require('fs');
const path = require('path');
const { test, expect } = require('../helpers/local-site');

const evidenceRoot = path.resolve(__dirname, '../../.internal/night-v15/p1-composition');

async function openFreeMode(page) {
  await page.addInitScript(() => localStorage.setItem('azertyTutorialDone', '2026-05-28'));
  await page.goto('/');
  await page.locator('#open-tester-btn').click();
  await expect(page.locator('#tester-modal')).toBeVisible();
  await page.locator('#tab-libre').click();
  await page.locator('.platform-btn[data-platform="windows"]').click();
  return page.locator('#modal-output');
}

async function setTextAndSelection(target, text, start, end = start) {
  await target.evaluate((node, value) => {
    if (node.tagName === 'TEXTAREA') {
      node.value = value.text;
      node.focus();
      node.setSelectionRange(value.start, value.end);
    } else {
      node.textContent = value.text;
      node.focus();
      const textNode = node.firstChild || node;
      window.getSelection().setBaseAndExtent(textNode, value.start, textNode, value.end);
    }
  }, { text, start, end });
}

async function recordEvents(target) {
  await target.evaluate(node => {
    window.__nativeCompositionEvents = [];
    for (const type of ['compositionstart', 'compositionupdate', 'compositionend', 'beforeinput', 'input']) {
      node.addEventListener(type, event => {
        window.__nativeCompositionEvents.push({
          type, data: event.data ?? null, inputType: event.inputType || '',
          cancelable: event.cancelable, defaultPrevented: event.defaultPrevented,
          isComposing: event.isComposing || false, isTrusted: event.isTrusted,
          text: node.tagName === 'TEXTAREA' ? node.value : node.textContent
        });
      });
    }
  });
}

async function cdpComposition(page, target, action) {
  const cdp = await page.context().newCDPSession(page);
  await target.focus();
  await cdp.send('Input.imeSetComposition', { text: 'é', selectionStart: 1, selectionEnd: 1 });
  if (action === 'cancel') await cdp.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 });
  else if (action === 'blur') await page.locator('#tab-libre').focus();
  else await cdp.send('Input.insertText', { text: 'é' });
  await cdp.detach();
}

// Explicit event-sequence fixture for engines without CDP composition control.
// It models the browser's provisional non-cancelable edit, not a hardware IME.
async function domCompositionFixture(target, action, compositionText = 'é') {
  return target.evaluate((node, { mode, text }) => {
    const range = window.getSelection().getRangeAt(0).cloneRange();
    node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
    const update = text => {
      node.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: text }));
      node.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: false, inputType: 'insertCompositionText', data: text, isComposing: true }));
      range.deleteContents();
      const inserted = document.createTextNode(text);
      range.insertNode(inserted);
      range.selectNodeContents(inserted);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range.cloneRange());
      node.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: text || null, isComposing: true }));
    };
    update(text);
    if (mode === 'cancel') update('');
    const provisionalValidationCount = document.querySelectorAll('#lesson-target .target-char--correct, #lesson-target .target-char--wrong').length;
    node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: mode === 'cancel' ? '' : text }));
    return { provisionalValidationCount };
  }, { mode: action, text: compositionText });
}

for (const scenario of [
  { name: 'commit', action: 'commit', text: '', start: 0, expected: 'é' },
  { name: 'blur commit (CDP) or modeled compositionend (DOM)', action: 'blur', text: '', start: 0, expected: 'é' },
  { name: 'cancel', action: 'cancel', text: '', start: 0, expected: '' },
  { name: 'cancel after prefix', action: 'cancel', text: 'avant après', start: 6, expected: 'avant après' },
  { name: 'selected replacement', action: 'commit', text: 'avant X après', start: 6, end: 7, expected: 'avant é après' }
]) {
  test(`free-mode composition ${scenario.name} inserts no duplicate`, async ({ page, browserName, network }, testInfo) => {
    const results = [];
    const method = browserName === 'chromium' ? 'Chromium CDP composition; no hardware IME claim' : 'Explicit DOM sequence fixture; no native IME claim';
    testInfo.annotations.push({ type: 'composition-method', description: method });
    try {
      const output = await openFreeMode(page);
      if (browserName === 'chromium') {
        await page.locator('#tester-modal').evaluate(modal => {
          const control = document.createElement('textarea');
          control.id = 'native-composition-control';
          control.setAttribute('aria-label', 'Native textarea control');
          modal.appendChild(control);
        });
        const control = page.locator('#native-composition-control');
        await setTextAndSelection(control, scenario.text, scenario.start, scenario.end ?? scenario.start);
        await recordEvents(control);
        await cdpComposition(page, control, scenario.action);
        const observed = await control.inputValue();
        results.push({ target: 'textarea control', observed, events: await page.evaluate(() => window.__nativeCompositionEvents) });
        expect(observed).toBe(scenario.expected);
      }
      await setTextAndSelection(output, scenario.text, scenario.start, scenario.end ?? scenario.start);
      await recordEvents(output);
      if (browserName === 'chromium') await cdpComposition(page, output, scenario.action);
      else await domCompositionFixture(output, scenario.action);
      const observed = await output.textContent();
      results.push({ target: 'actual free-mode field', observed, events: await page.evaluate(() => window.__nativeCompositionEvents) });
      expect(observed).toBe(scenario.expected);
      expect(network.web3FormsRequests).toEqual([]);
      expect(network.pageErrors).toEqual([]);
      expect(network.cspViolations).toEqual([]);
    } finally {
      fs.mkdirSync(evidenceRoot, { recursive: true });
      const file = path.join(evidenceRoot, `${process.env.COMPOSITION_PHASE || 'current'}-${testInfo.project.name}-${scenario.name.replace(/ /g, '-')}.json`);
      fs.writeFileSync(file, JSON.stringify({ method, scenario, results }, null, 2) + '\n');
      await testInfo.attach('composition-evidence', { path: file, contentType: 'application/json' });
    }
  });
}

for (const accept of [true, false]) {
  test(`actual lesson ${accept ? 'accepts' : 'rejects'} composition only after final validation`, async ({ page, browserName, network }, testInfo) => {
    await openFreeMode(page);
    await page.locator('#tab-lessons').click();
    await page.locator('#lesson-module-select').selectOption('1');
    await page.locator('#lesson-list .lesson-btn').first().click();
    const input = page.locator('#lesson-input');
    await expect(input).toBeVisible();
    const firstTarget = page.locator('#lesson-target .target-char').first();
    const text = accept ? await firstTarget.textContent() : '😀';
    await input.focus();
    const validation = page.locator('#lesson-target .target-char--correct, #lesson-target .target-char--wrong');
    await expect(validation).toHaveCount(0);
    if (browserName === 'chromium') {
      testInfo.annotations.push({ type: 'composition-method', description: 'Chromium CDP in real lesson, including provisional state' });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
      await expect(validation).toHaveCount(0);
      await cdp.send('Input.insertText', { text });
      await cdp.detach();
    } else {
      testInfo.annotations.push({ type: 'composition-method', description: 'Explicit non-cancelable DOM sequence in real lesson' });
      const result = await domCompositionFixture(input, 'commit', text);
      expect(result.provisionalValidationCount).toBe(0);
    }
    await expect(input).toHaveText(accept ? text : '');
    await expect(validation).toHaveCount(accept ? 1 : 0);
    expect(network.pageErrors).toEqual([]);
    expect(network.cspViolations).toEqual([]);
  });
}

for (const accept of [true, false]) {
  test(`composition callback ${accept ? 'transforms' : 'rejects'} provisional text exactly once`, async ({ page, browserName, network }, testInfo) => {
    await openFreeMode(page);
    await page.locator('#tester-modal').evaluate(async (modal, accepts) => {
      const helper = await import('/js/tester-contenteditable.js?v=final-20260801-1');
      const input = document.createElement('div');
      input.id = 'composition-callback-fixture';
      input.contentEditable = 'true';
      modal.appendChild(input);
      window.__compositionCallbackCalls = [];
      window.__compositionAfterInsert = [];
      window.__compositionValidatorInputs = [];
      // Match the real lesson ordering: validation is registered first.
      input.addEventListener('input', () => window.__compositionValidatorInputs.push(input.textContent));
      helper.setupPlainTextContentEditable(input, {
        allowComposition: true,
        onCompositionText(text) {
          window.__compositionCallbackCalls.push(text);
          return accepts ? helper.insertPlainTextAtSelection(input, text.toUpperCase(), { dispatchInput: true }) : '';
        },
        onAfterInsert(entry) { window.__compositionAfterInsert.push(entry); }
      });
    }, accept);
    const input = page.locator('#composition-callback-fixture');
    await setTextAndSelection(input, 'avant X après', 6, 7);
    testInfo.annotations.push({ type: 'composition-method', description: browserName === 'chromium' ? 'Chromium CDP on isolated shared-helper fixture' : 'Explicit DOM sequence on isolated shared-helper fixture' });
    if (browserName === 'chromium') await cdpComposition(page, input, 'commit');
    else await domCompositionFixture(input, 'commit');
    await expect(input).toHaveText(accept ? 'avant É après' : 'avant X après');
    expect(await page.evaluate(() => window.__compositionCallbackCalls)).toEqual(['é']);
    expect(await page.evaluate(() => window.__compositionAfterInsert)).toEqual(accept ? [{ source: 'composition', text: 'É' }] : []);
    expect(await page.evaluate(() => window.__compositionValidatorInputs)).toEqual(accept ? ['avant É après'] : []);
    expect(network.pageErrors).toEqual([]);
    expect(network.cspViolations).toEqual([]);
  });
}

for (const accept of [true, false]) {
  test(`redundant final insertText calls a ${accept ? 'transforming' : 'rejecting'} composition callback once`, async ({ page, network }, testInfo) => {
    await openFreeMode(page);
    testInfo.annotations.push({ type: 'composition-method', description: 'Explicit synchronous DOM fixture with time frozen inside the deduplication window' });
    await page.clock.install({ time: new Date('2026-09-05T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-09-05T12:00:01Z'));
    const result = await page.locator('#tester-modal').evaluate(async (modal, accepts) => {
      const helper = await import('/js/tester-contenteditable.js?v=final-20260801-1');
      const input = document.createElement('div');
      input.contentEditable = 'true';
      modal.appendChild(input);
      input.focus();
      const calls = [];
      helper.setupPlainTextContentEditable(input, {
        allowComposition: true,
        onCompositionText(text) {
          calls.push(text);
          return accepts ? helper.insertPlainTextAtSelection(input, text.toUpperCase(), { dispatchInput: true }) : '';
        }
      });
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'é' }));
      input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: 'é' }));
      return { text: input.textContent, calls };
    }, accept);
    expect(result).toEqual({ text: accept ? 'É' : '', calls: ['é'] });
    expect(network.pageErrors).toEqual([]);
    expect(network.cspViolations).toEqual([]);
  });
}

test('distinct rapid compositions keep repeated characters and ignore each redundant final insertText', async ({ page, network }, testInfo) => {
  await openFreeMode(page);
  testInfo.annotations.push({ type: 'composition-method', description: 'Two synchronous explicit DOM sequences, with deterministic frozen time inside the deduplication window' });
  await page.clock.install({ time: new Date('2026-09-05T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-09-05T12:00:01Z'));
  const result = await page.locator('#tester-modal').evaluate(async modal => {
    const helper = await import('/js/tester-contenteditable.js?v=final-20260801-1');
    const input = document.createElement('div');
    input.contentEditable = 'true';
    modal.appendChild(input);
    input.focus();
    const calls = [];
    helper.setupPlainTextContentEditable(input, {
      allowComposition: true,
      onCompositionText(text) {
        calls.push(text);
        return helper.insertPlainTextAtSelection(input, text, { dispatchInput: true });
      }
    });
    const started = performance.now();
    for (let composition = 0; composition < 2; composition++) {
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
      input.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: 'é' }));
      input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: false, inputType: 'insertCompositionText', data: 'é', isComposing: true }));
      // Model only the provisional browser mutation; the callback owns commits.
      const range = window.getSelection().getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode('é'));
      range.collapse(false);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: 'é', isComposing: true }));
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'é' }));
      // Some engines then repeat the same final text for this composition.
      input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: 'é' }));
    }
    return { text: input.textContent, calls, elapsed: performance.now() - started };
  });
  expect(result.elapsed, 'The two compositions stay inside the old 80 ms window').toBeLessThan(80);
  expect(result).toMatchObject({ text: 'éé', calls: ['é', 'é'] });
  expect(network.pageErrors).toEqual([]);
  expect(network.cspViolations).toEqual([]);
});
