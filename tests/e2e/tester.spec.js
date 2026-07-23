const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const siteRoot = process.env.TEST_SITE_ROOT || '.';
const lessonsPath = path.resolve(process.cwd(), siteRoot, 'tester', 'lessons.json');
const tutorialPath = path.resolve(process.cwd(), siteRoot, 'tester', 'tutorial.json');
const characterIndexPath = path.resolve(process.cwd(), siteRoot, 'tester', 'character-index.json');
const lessonsData = JSON.parse(fs.readFileSync(lessonsPath, 'utf8'));
const tutorialData = JSON.parse(fs.readFileSync(tutorialPath, 'utf8'));
const characterIndexJson = fs.readFileSync(characterIndexPath, 'utf8');

const tutorialCoreIds = tutorialData.core.map((step) => step.id);
const landingLessonRoutes = [
  { path: '/e-aigu-majuscule.html', module: '1', lesson: 0 },
  { path: '/e-grave-majuscule.html', module: '1', lesson: 1 },
  { path: '/c-cedille-majuscule.html', module: '1', lesson: 2 },
  { path: '/a-grave-majuscule.html', module: '1', lesson: 3 },
  { path: '/e-dans-l-a.html', module: '3', lesson: 0 },
  { path: '/e-dans-l-o.html', module: '3', lesson: 0 },
  { path: '/guillemets.html', module: '3', lesson: 1 }
];

async function dispatchTransferEvent(locator, eventType, text, html = '') {
  await locator.evaluate((target, payload) => {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', payload.text);
    transfer.setData('text/html', payload.html);

    const event = new Event(payload.eventType, { bubbles: true, cancelable: true });
    Object.defineProperty(event, payload.eventType === 'paste' ? 'clipboardData' : 'dataTransfer', {
      value: transfer
    });

    target.dispatchEvent(event);
  }, { eventType, text, html });
}

async function dispatchCompositionText(locator, text) {
  await locator.evaluate((target, value) => {
    target.dispatchEvent(new CompositionEvent('compositionstart', {
      bubbles: true,
      data: ''
    }));
    target.dispatchEvent(new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertCompositionText',
      data: value
    }));
    target.dispatchEvent(new CompositionEvent('compositionupdate', {
      bubbles: true,
      data: value
    }));
    target.dispatchEvent(new CompositionEvent('compositionend', {
      bubbles: true,
      data: value
    }));
  }, text);
}

async function dispatchCompositionEndThenInsertText(locator, text) {
  await locator.evaluate((target, value) => {
    target.dispatchEvent(new CompositionEvent('compositionstart', {
      bubbles: true,
      data: ''
    }));
    target.dispatchEvent(new CompositionEvent('compositionend', {
      bubbles: true,
      data: ''
    }));
    target.dispatchEvent(new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: value
    }));
  }, text);
}

async function dispatchKeyboardEventWithModifierState(locator, type, init = {}) {
  await locator.evaluate((target, payload) => {
    const event = new KeyboardEvent(payload.type, {
      key: payload.key,
      code: payload.code,
      bubbles: true,
      cancelable: true,
      repeat: Boolean(payload.repeat),
      shiftKey: Boolean(payload.shiftKey),
      altKey: Boolean(payload.altKey),
      ctrlKey: Boolean(payload.ctrlKey),
      metaKey: Boolean(payload.metaKey),
      isComposing: Boolean(payload.isComposing)
    });
    Object.defineProperty(event, 'getModifierState', {
      configurable: true,
      value: (key) => Boolean(payload.modifiers?.[key])
    });
    target.dispatchEvent(event);
  }, { type, ...init });
}

async function resetContentEditable(locator) {
  await locator.evaluate((target) => {
    target.textContent = '';
    target.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function setContentEditableTextAndSelection(locator, text, start, end = start) {
  await locator.evaluate((target, payload) => {
    target.textContent = payload.text;
    target.focus();

    if (!target.firstChild) {
      target.appendChild(document.createTextNode(''));
    }

    const textNode = target.firstChild;
    const range = document.createRange();
    const startOffset = Math.max(0, Math.min(payload.start, textNode.textContent.length));
    const endOffset = Math.max(0, Math.min(payload.end, textNode.textContent.length));
    range.setStart(textNode, startOffset);
    range.setEnd(textNode, endOffset);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }, { text, start, end });
}

async function setTutorialStorage(page, { done = true, progress = null } = {}) {
  await page.evaluate(({ doneFlag, progressValue }) => {
    localStorage.removeItem('azertyTutorialDone');
    localStorage.removeItem('azertyTutorialProgress');
    if (doneFlag) {
      localStorage.setItem('azertyTutorialDone', '2026-05-28T00:00:00.000Z');
    }
    if (progressValue) {
      localStorage.setItem('azertyTutorialProgress', JSON.stringify(progressValue));
    }
  }, { doneFlag: done, progressValue: progress });
}

async function openTester(page, pagePath = '/index.html', tutorialState = { done: true }) {
  await page.goto(pagePath, { waitUntil: 'domcontentloaded' });
  await setTutorialStorage(page, tutorialState);
  await page.locator('#open-tester-btn').click();
  await expect(page.locator('#tester-modal')).toBeVisible();
}

async function openLesson(page, moduleIndex, lessonIndex) {
  await openTester(page);
  await page.locator('#tab-lessons').click();
  await page.locator('#lesson-module-select').selectOption(String(moduleIndex));
  await page.locator('#lesson-list .lesson-btn').nth(lessonIndex).click();
}

async function expectConfiguredLandingLesson(page, route) {
  await expect(page.locator('#tab-lessons')).toHaveClass(/modal-tab--active/);
  await expect(page.locator('#mode-lessons')).toBeVisible();
  await expect(page.locator('#tutorial-panel')).toBeHidden();
  await expect(page.locator('#lesson-module-select')).toHaveValue(route.module);
  await expect(page.locator('#lesson-list .lesson-btn').nth(route.lesson)).toHaveClass(/lesson-btn--active/);
  await expect(page.locator('#lesson-exercise')).toBeVisible();
}

async function completeDisplayedExercise(page, content) {
  const lessonInput = page.locator('#lesson-input');

  for (const line of content.split('\n')) {
    await lessonInput.evaluate((target, value) => {
      target.textContent = value;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }, line);
    await page.waitForTimeout(350);
  }
}

async function expectKeyHighlight(page, keyId, classPattern) {
  await expect(page.locator(`#modal-keyboard-container .key[data-key-id="${keyId}"]`)).toHaveClass(classPattern);
}

test('injects and opens the shared tester modal on key pages after tutorial completion', async ({ page }) => {
  for (const targetPath of ['/index.html', '/ecoles.html', '/afrique.html', '/e-aigu-majuscule.html']) {
    await openTester(page, targetPath);

    if (targetPath === '/e-aigu-majuscule.html') {
      await expect(page.locator('#tab-lessons')).toHaveClass(/modal-tab--active/);
      await expect(page.locator('#mode-lessons')).toBeVisible();
      await expect(page.locator('#tutorial-panel')).toBeHidden();
    }

    await page.getByRole('button', { name: /fermer le testeur/i }).click();
  }
});

test('opens the tutorial in Lessons on the first click', async ({ page }) => {
  await openTester(page, '/index.html', { done: false });

  await expect(page.locator('#tab-lessons')).toHaveClass(/modal-tab--active/);
  await expect(page.locator('#tutorial-panel')).toBeVisible();
  await expect(page.locator('#tutorial-title')).toContainText('Votre premier É');
  await expect(page.locator('#tutorial-target')).toContainText('É');
});

test('uses landing preludes before the core tutorial', async ({ page }) => {
  await openTester(page, '/e-grave-majuscule.html', { done: false });

  await expect(page.locator('#tutorial-title')).toContainText('Premier È');
  await expect(page.locator('#tutorial-target')).toContainText('È È È');
});

test('starts e-aigu landing directly on the core É exercise', async ({ page }) => {
  await openTester(page, '/e-aigu-majuscule.html', { done: false });

  await expect(page.locator('#tutorial-title')).toContainText('Votre premier É');
  await expect(page.locator('#tutorial-target')).toContainText('É');
});

test('opens the matching landing lesson after tutorial completion', async ({ page }) => {
  for (const route of landingLessonRoutes) {
    await openTester(page, route.path, { done: true });
    await expectConfiguredLandingLesson(page, route);
    await page.getByRole('button', { name: /fermer le testeur/i }).click();
  }
});

test('prefers circumflex hints for accented capitals before lowercase letters', async ({ page }) => {
  const route = landingLessonRoutes.find((item) => item.path === '/e-aigu-majuscule.html');
  const lesson = lessonsData.modules[1].lessons[0];

  await openTester(page, route.path, { done: true });
  await expectConfiguredLandingLesson(page, route);

  if (await page.locator('#lesson-hint').getAttribute('aria-pressed') !== 'true') {
    await page.locator('#lesson-hint').click();
  }
  await expectKeyHighlight(page, 'CapsLock', /search-highlight/);
  await expectKeyHighlight(page, 'Digit2', /search-highlight/);

  await completeDisplayedExercise(page, lesson.exercises[0].content);
  await completeDisplayedExercise(page, lesson.exercises[1].content);

  await expect(page.locator('#lesson-progress')).toContainText('Exercice 3/3');
  await expect(page.locator('#lesson-input')).toHaveText('');
  await expectKeyHighlight(page, 'BracketLeft', /search-highlight-step1/);
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="CapsLock"]')).not.toHaveClass(/search-highlight/);

  await page.locator('#lesson-input').evaluate((target) => {
    target.textContent = 'Éee';
    target.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expectKeyHighlight(page, 'Backspace', /search-highlight/);
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="KeyO"]')).not.toHaveClass(/search-highlight/);

  await page.locator('#lesson-input').evaluate((target) => {
    target.textContent = 'É';
    target.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expectKeyHighlight(page, 'KeyC', /search-highlight/);
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="KeyO"]')).not.toHaveClass(/search-highlight/);

  await completeDisplayedExercise(page, 'École');
  await expect(page.locator('#lesson-input')).toHaveText('');
  await expectKeyHighlight(page, 'CapsLock', /search-highlight/);
  await expectKeyHighlight(page, 'Digit2', /search-highlight/);

  await page.locator('#lesson-input').evaluate((target) => {
    target.textContent = 'É';
    target.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expectKeyHighlight(page, 'CapsLock', /search-highlight/);
  await expectKeyHighlight(page, 'KeyL', /search-highlight/);
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="ShiftLeft"]')).not.toHaveClass(/search-highlight/);
});

test('stops waiting for the configured landing lesson when lessons fail to load', async ({ page }) => {
  await page.addInitScript(() => {
    window.__AZERTY_CONFIGURED_LESSON_WAIT_TIMEOUT_MS = 100;
  });
  await page.route('**/tester/lessons.json*', (route) => route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: '{}'
  }));

  await openTester(page, '/e-aigu-majuscule.html', { done: true });

  await expect(page.locator('.tester-modal__notices')).toContainText('La leçon demandée n’a pas pu être ouverte automatiquement');
});

test('cleans completed landing tutorial state before reopening the configured lesson', async ({ page }) => {
  const route = landingLessonRoutes.find((item) => item.path === '/guillemets.html');
  const completedBeforeLastStep = [
    tutorialData.preludes.guillemets.id,
    ...tutorialCoreIds.slice(0, -1)
  ];

  await openTester(page, route.path, {
    done: false,
    progress: {
      introId: 'guillemets',
      currentId: tutorialCoreIds[tutorialCoreIds.length - 1],
      completedIds: completedBeforeLastStep
    }
  });

  await expect(page.locator('#tutorial-progress')).toContainText('7/7');
  await page.locator('#tutorial-skip-step').click();

  await expect(page.locator('#tutorial-final')).toBeVisible();
  await expect(page.locator('#tutorial-actions')).toBeHidden();

  await page.locator('#tutorial-prev').evaluate((button) => button.click());
  await expect(page.locator('#tutorial-title')).toContainText('Mots');
  await expect(page.locator('#lesson-exercise')).toBeHidden();

  await page.getByRole('button', { name: /fermer le testeur/i }).click();
  await page.locator('#open-tester-btn').click();

  await expectConfiguredLandingLesson(page, route);
});

test('resumes the tutorial at the first unfinished exercise after closing', async ({ page }) => {
  await openTester(page, '/index.html', { done: false });

  await page.locator('#modal-keyboard-container .key[data-key-id="CapsLock"]').click();
  await page.locator('#modal-keyboard-container .key[data-key-id="Digit2"]').click();
  await expect(page.locator('#tutorial-title')).toContainText('Majuscules et ponctuation');
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="CapsLock"]')).toHaveClass(/modifier-active/);

  await page.getByRole('button', { name: /fermer le testeur/i }).click();
  await page.locator('#open-tester-btn').click();

  await expect(page.locator('#tutorial-title')).toContainText('Majuscules et ponctuation');
});

test('skip global marks the tutorial done and returns index clicks to free mode', async ({ page }) => {
  await openTester(page, '/index.html', { done: false });

  await page.locator('#tutorial-skip').click();
  await expect(page.locator('#tab-libre')).toHaveClass(/modal-tab--active/);

  await page.getByRole('button', { name: /fermer le testeur/i }).click();
  await page.locator('#open-tester-btn').click();

  await expect(page.locator('#tab-libre')).toHaveClass(/modal-tab--active/);
  await expect(page.locator('#tutorial-panel')).toBeHidden();
});

test('does not capture free-mode typing after leaving an unfinished tutorial', async ({ page }) => {
  await openTester(page, '/index.html', { done: false });

  await page.locator('#tab-libre').click();
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="KeyQ"] .top-left')).toContainText(/./);
  await page.locator('#modal-keyboard-container .key[data-key-id="KeyQ"]').click();

  await expect(page.locator('#modal-output')).toHaveText('a');
  await expect(page.locator('#tutorial-input')).toHaveText('');
});

test('prioritizes AZERTY Global dead-key simulation before native composition fallback', async ({ page }) => {
  await openTester(page);

  const output = page.locator('#modal-output');
  await output.focus();

  await page.locator('#tester-modal').evaluate((modal) => {
    modal.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Dead',
      code: 'BracketLeft',
      bubbles: true,
      cancelable: true
    }));
  });
  await expect(page.locator('#modal-status-deadkey')).toContainText('Accent circonflexe');
  await page.waitForTimeout(350);
  await dispatchCompositionText(output, '^');
  await expect(output).toHaveText('');

  await page.locator('#tester-modal').evaluate((modal) => {
    modal.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'a',
      code: 'KeyQ',
      bubbles: true,
      cancelable: true
    }));
  });
  await dispatchCompositionText(output, '\u00e2');
  await expect(output).toHaveText('\u00e2');

  await resetContentEditable(output);
  await output.focus();
  await page.locator('#tester-modal').evaluate((modal) => {
    modal.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Dead',
      code: 'BracketLeft',
      shiftKey: true,
      bubbles: true,
      cancelable: true
    }));
  });
  await expect(page.locator('#modal-status-deadkey')).toContainText('Tr\u00e9ma');
  await dispatchCompositionText(output, '\u00a8');
  await expect(output).toHaveText('');

  await page.locator('#tester-modal').evaluate((modal) => {
    modal.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'Shift',
      code: 'ShiftLeft',
      bubbles: true,
      cancelable: true
    }));
  });
  await expect(page.locator('#modal-status-shift')).not.toHaveClass(/on/);

  await page.locator('#tester-modal').evaluate((modal) => {
    modal.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'a',
      code: 'KeyQ',
      bubbles: true,
      cancelable: true
    }));
  });
  await dispatchCompositionText(output, '\u00e4');
  await expect(output).toHaveText('\u00e4');

  await resetContentEditable(output);
  await output.focus();
  await page.locator('#tester-modal').evaluate((modal) => {
    modal.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Dead',
      code: 'Unidentified',
      bubbles: true,
      cancelable: true
    }));
  });
  await expect(page.locator('#modal-status-deadkey')).not.toHaveClass(/on/);

  await dispatchCompositionText(output, '\u00e4');
  await expect(output).toHaveText('\u00e4');
});

test('suppresses non-AltGraph compositions after normal keys and keeps Linux AltGraph', async ({ page }) => {
  await openTester(page);

  const output = page.locator('#modal-output');
  const modal = page.locator('#tester-modal');
  await output.focus();

  const linuxAltGraph = {
    ctrlKey: true,
    altKey: false,
    modifiers: { AltGraph: true }
  };

  await dispatchKeyboardEventWithModifierState(modal, 'keydown', {
    key: 'j',
    code: 'KeyJ'
  });
  await expect(output).toHaveText('j');

  await dispatchCompositionText(output, '\u0378');
  await expect(output).toHaveText('j');

  await dispatchKeyboardEventWithModifierState(modal, 'keydown', {
    key: 'a',
    code: 'KeyQ',
  });
  await expect(output).toHaveText('ja');

  await dispatchKeyboardEventWithModifierState(modal, 'keydown', {
    key: ']',
    code: 'KeyK',
    ...linuxAltGraph
  });
  await dispatchKeyboardEventWithModifierState(modal, 'keydown', {
    key: '~',
    code: 'KeyN',
    ...linuxAltGraph
  });

  await expect(output).toHaveText('ja]~');
});

test('handles standalone composition beforeinput in free mode', async ({ page }) => {
  await openTester(page);

  const output = page.locator('#modal-output');
  await output.focus();

  const allowed = await output.evaluate((target) => {
    const event = new InputEvent('beforeinput', {
      inputType: 'insertCompositionText',
      data: '\u00e2',
      bubbles: true,
      cancelable: true
    });
    return target.dispatchEvent(event);
  });

  expect(allowed).toBe(false);
  await expect(output).toHaveText('\u00e2');
});

test('commits final insertText after empty compositionend in free mode', async ({ page }) => {
  await openTester(page);

  const output = page.locator('#modal-output');
  await output.focus();
  await dispatchCompositionEndThenInsertText(output, '\u00e2');

  await expect(output).toHaveText('\u00e2');
});

test('handles free-mode Backspace and Delete without execCommand', async ({ page }) => {
  await openTester(page);

  const output = page.locator('#modal-output');
  await output.focus();

  await dispatchKeyboardEventWithModifierState(output, 'keydown', {
    key: 'a',
    code: 'KeyQ'
  });
  await dispatchKeyboardEventWithModifierState(output, 'keydown', {
    key: 'z',
    code: 'KeyW'
  });
  await expect(output).toHaveText('az');

  await dispatchKeyboardEventWithModifierState(output, 'keydown', {
    key: 'Backspace',
    code: 'Backspace'
  });
  await expect(output).toHaveText('a');

  await setContentEditableTextAndSelection(output, 'a\ud83d\ude00b', 'a\ud83d\ude00'.length);
  await dispatchKeyboardEventWithModifierState(output, 'keydown', {
    key: 'Backspace',
    code: 'Backspace'
  });
  await expect(output).toHaveText('ab');

  await setContentEditableTextAndSelection(output, 'e\u0301x', 'e\u0301'.length);
  await dispatchKeyboardEventWithModifierState(output, 'keydown', {
    key: 'Backspace',
    code: 'Backspace'
  });
  await expect(output).toHaveText('x');

  await setContentEditableTextAndSelection(output, 'abc', 1, 2);
  await dispatchKeyboardEventWithModifierState(output, 'keydown', {
    key: 'Backspace',
    code: 'Backspace'
  });
  await expect(output).toHaveText('ac');

  await setContentEditableTextAndSelection(output, 'a\nb', 2);
  await dispatchKeyboardEventWithModifierState(output, 'keydown', {
    key: 'Delete',
    code: 'Delete'
  });
  await expect(output).toHaveText('a\n');

  await setContentEditableTextAndSelection(output, 'xy', 2);
  await dispatchKeyboardEventWithModifierState(output, 'keydown', {
    key: 'Delete',
    code: 'Delete'
  });
  await expect(output).toHaveText('xy');
});

test('accepts native composition in lessons only for AZERTY Global characters', async ({ page }) => {
  await openLesson(page, 1, 0);

  const lessonInput = page.locator('#lesson-input');
  await lessonInput.focus();
  await dispatchCompositionText(lessonInput, '\u00c9');

  await expect(lessonInput).toHaveText('\u00c9');
});

test('waits for character index before accepting native composition in lessons', async ({ page }) => {
  let releaseCharacterIndex;
  await page.route('**/tester/character-index.json*', async (route) => {
    await new Promise((resolve) => {
      releaseCharacterIndex = resolve;
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: characterIndexJson
    });
  });

  await openLesson(page, 1, 0);
  await expect.poll(() => Boolean(releaseCharacterIndex)).toBe(true);

  const lessonInput = page.locator('#lesson-input');
  await lessonInput.focus();
  await dispatchCompositionText(lessonInput, '\u00c9');
  await expect(lessonInput).toHaveText('');

  releaseCharacterIndex();
  await expect(lessonInput).toHaveText('\u00c9');
});

test('routes native composition through tutorial validation', async ({ page }) => {
  await openTester(page, '/index.html', {
    done: false,
    progress: {
      introId: null,
      currentId: 'adresse-email',
      completedIds: tutorialCoreIds.slice(0, 2)
    }
  });

  const tutorialInput = page.locator('#tutorial-input');
  await tutorialInput.focus();
  await dispatchCompositionText(tutorialInput, 'j');
  await expect(tutorialInput).toHaveText('j');

  await dispatchCompositionText(tutorialInput, '\u0378');
  await expect(tutorialInput).toHaveText('j');
  await expect(page.locator('#tutorial-feedback')).toContainText('Caract');
});

test('allows controlled physical Backspace and Delete in the tutorial', async ({ page }) => {
  await openTester(page, '/index.html', {
    done: false,
    progress: {
      introId: null,
      currentId: 'adresse-email',
      completedIds: tutorialCoreIds.slice(0, 2)
    }
  });

  await page.locator('#modal-keyboard-container .key[data-key-id="KeyJ"]').click();
  await page.locator('#modal-keyboard-container .key[data-key-id="KeyE"]').click();
  await page.locator('#modal-keyboard-container .key[data-key-id="KeyQ"]').click();
  await expect(page.locator('#tutorial-input')).toHaveText('jea');

  // Le refocus de #tutorial-input après un clic virtuel passe par un rAF ; on le
  // force pour que le Backspace/Delete physique atteigne bien le handler (cf. test
  // « Backspace cancels a pending tutorial dead key »).
  await page.locator('#tutorial-input').focus();
  await page.keyboard.press('Backspace');
  await expect(page.locator('#tutorial-input')).toHaveText('je');
  await expect(page.locator('#tutorial-feedback')).toContainText('Dernier caractère supprimé');

  await page.keyboard.press('Delete');
  await expect(page.locator('#tutorial-input')).toHaveText('j');
});

test('allows controlled virtual Backspace in the tutorial', async ({ page }) => {
  await openTester(page, '/index.html', {
    done: false,
    progress: {
      introId: null,
      currentId: 'adresse-email',
      completedIds: tutorialCoreIds.slice(0, 2)
    }
  });

  await page.locator('#modal-keyboard-container .key[data-key-id="KeyJ"]').click();
  await page.locator('#modal-keyboard-container .key[data-key-id="KeyE"]').click();
  await page.locator('#modal-keyboard-container .key[data-key-id="KeyQ"]').click();
  await page.locator('#modal-keyboard-container .key[data-key-id="Backspace"]').click();

  await expect(page.locator('#tutorial-input')).toHaveText('je');
  await expect(page.locator('#tutorial-feedback')).toContainText('Dernier caractère supprimé');
});

test('Backspace cancels a pending tutorial dead key without typing a character', async ({ page }) => {
  await openTester(page, '/index.html', {
    done: false,
    progress: {
      introId: null,
      currentId: 'mots-etrangers',
      completedIds: tutorialCoreIds.slice(0, 5)
    }
  });

  await page.locator('#modal-keyboard-container .key[data-key-id="AltRight"]').click();
  await page.locator('#modal-keyboard-container .key[data-key-id="Quote"]').click();
  await expect(page.locator('#modal-status-deadkey')).toHaveClass(/on/);

  // Le Backspace physique n'est capté que si #tutorial-input a le focus ;
  // après un clic sur une touche virtuelle le refocus passe par un rAF, dont
  // la course peut être perdue sur macOS/chromium. On force le focus.
  await page.locator('#tutorial-input').focus();
  await page.keyboard.press('Backspace');

  await expect(page.locator('#tutorial-input')).toHaveText('');
  await expect(page.locator('#modal-status-deadkey')).not.toHaveClass(/on/);
  await expect(page.locator('#tutorial-feedback')).toContainText('Touche morte annulée');
});

test('shows the Windows Store warning in the tutorial notice area', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', {
      get() {
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
      }
    });
  });

  await openTester(page, '/index.html', { done: false });

  await page.locator('#tester-modal').evaluate((modal) => {
    modal.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'a',
      code: '',
      bubbles: true,
      cancelable: true
    }));
  });

  const note = page.locator('.tester-modal__notices .tester-portable-note');
  await expect(page.locator('#tutorial-panel')).toBeVisible();
  await expect(note).toBeVisible();
  await expect(note).toContainText("L'application du Microsoft Store semble active");
});

test('opens the native OS diagnostic in free mode', async ({ page }) => {
  await openTester(page);

  const details = page.locator('#tester-os-diagnostic');
  await expect(details).toBeHidden();

  await page.getByRole('button', { name: 'Diagnostic OS' }).click();
  await expect(details).toHaveJSProperty('open', true);
  await expect(details).toBeVisible();
  await expect(page.locator('#tester-diagnostic-input')).toBeFocused();

  const input = page.locator('#tester-diagnostic-input');
  await page.keyboard.press('KeyA');

  await expect(page.locator('#tester-diagnostic-key')).toContainText('a');
  await expect(page.locator('#tester-diagnostic-code')).toContainText('KeyA');
  await expect(page.locator('#tester-diagnostic-value')).toContainText('a');

  await dispatchCompositionText(input, '\u00e2');
  await expect(page.locator('#tester-diagnostic-input-type')).toContainText('compositionend');
  await expect(page.locator('#tester-diagnostic-data')).toContainText('\u00e2');
});

test('opens the native OS diagnostic from the tutorial', async ({ page }) => {
  await openTester(page, '/index.html', { done: false });

  await page.getByRole('button', { name: 'Diagnostic OS' }).click();

  await expect(page.locator('#tab-libre')).toHaveClass(/modal-tab--active/);
  await expect(page.locator('#tester-os-diagnostic')).toHaveJSProperty('open', true);
  await expect(page.locator('#tester-diagnostic-input')).toBeFocused();
});

test('keeps the tutorial caret at the end of controlled input', async ({ page }) => {
  await openTester(page, '/index.html', {
    done: false,
    progress: {
      introId: null,
      currentId: 'adresse-email',
      completedIds: tutorialCoreIds.slice(0, 2)
    }
  });

  await page.locator('#modal-keyboard-container .key[data-key-id="KeyJ"]').click();
  await page.locator('#modal-keyboard-container .key[data-key-id="KeyE"]').click();
  await page.locator('#modal-keyboard-container .key[data-key-id="KeyQ"]').click();

  await expect(page.locator('#tutorial-input')).toHaveText('jea');
  await expect(page.locator('#tutorial-input')).toBeFocused();
  await expect(page.locator('#tutorial-input')).toHaveJSProperty('textContent', 'jea');
  const selectionState = await page.locator('#tutorial-input').evaluate((el) => {
    const selection = window.getSelection();
    return {
      anchorInside: selection?.anchorNode ? el.contains(selection.anchorNode) : false,
      anchorOffset: selection?.anchorOffset ?? -1
    };
  });

  expect(selectionState).toEqual({ anchorInside: true, anchorOffset: 3 });
});

test('emphasizes the next-key combo and hints moved symbols', async ({ page }) => {
  await openTester(page, '/index.html', {
    done: false,
    progress: {
      introId: null,
      currentId: 'adresse-email',
      completedIds: tutorialCoreIds.slice(0, 2)
    }
  });

  for (const keyId of ['KeyJ', 'KeyE', 'KeyQ', 'KeyN', 'Comma', 'KeyD', 'KeyU', 'KeyP', 'KeyO', 'KeyN', 'KeyT']) {
    await page.locator(`#modal-keyboard-container .key[data-key-id="${keyId}"]`).click();
  }

  await expect(page.locator('#tutorial-input')).toHaveText('jean.dupont');
  await expect(page.locator('#tutorial-method .tutorial-method-combo')).toContainText('²');
  await expect(page.locator('#tutorial-method .tutorial-method-hint')).toContainText('en haut à gauche');
});

test('keeps permanent CapsLock and key guidance on the first tutorial exercise', async ({ page }) => {
  await openTester(page, '/index.html', { done: false });

  await expect(page.locator('#modal-keyboard-container')).toHaveClass(/tutorial-minimal/);
  await expectKeyHighlight(page, 'CapsLock', /tutorial-key-highlight/);
  await expectKeyHighlight(page, 'Digit2', /tutorial-key-highlight/);
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="Period"] .bottom-right')).toHaveClass(/tutorial-legend-hidden/);
});

test('prompts CapsLock deactivation before lowercase tutorial input', async ({ page }) => {
  await openTester(page, '/index.html', {
    done: false,
    progress: {
      introId: null,
      currentId: 'adresse-email',
      completedIds: tutorialCoreIds.slice(0, 2)
    }
  });

  await page.locator('#modal-keyboard-container .key[data-key-id="CapsLock"]').click();
  await expect(page.locator('#tutorial-method .tutorial-method-combo')).toContainText('Désactivez Verr. Maj.');
  await expectKeyHighlight(page, 'CapsLock', /tutorial-key-highlight/);

  await page.locator('#modal-keyboard-container .key[data-key-id="CapsLock"]').click();
  await expect(page.locator('#tutorial-method .tutorial-method-combo')).toContainText('J');
});

test('updates physical CapsLock immediately in the tutorial despite stale Linux modifier state', async ({ page }) => {
  await openTester(page, '/index.html', { done: false });

  const tutorialInput = page.locator('#tutorial-input');
  const capsKey = page.locator('#modal-keyboard-container .key[data-key-id="CapsLock"]');
  await tutorialInput.focus();

  await dispatchKeyboardEventWithModifierState(tutorialInput, 'keydown', {
    key: 'CapsLock',
    code: 'CapsLock',
    modifiers: { CapsLock: false }
  });
  await expect(page.locator('#modal-status-caps')).toHaveClass(/on/);
  await expect(capsKey).toHaveClass(/modifier-active/);

  await dispatchKeyboardEventWithModifierState(tutorialInput, 'keydown', {
    key: 'q',
    code: 'KeyQ',
    modifiers: { CapsLock: false }
  });
  await expect(page.locator('#modal-status-caps')).toHaveClass(/on/);
  await expect(capsKey).toHaveClass(/modifier-active/);

  await dispatchKeyboardEventWithModifierState(tutorialInput, 'keyup', {
    key: 'CapsLock',
    code: 'CapsLock',
    modifiers: { CapsLock: false }
  });
  await expect(page.locator('#modal-status-caps')).toHaveClass(/on/);

  await dispatchKeyboardEventWithModifierState(tutorialInput, 'keydown', {
    key: 'CapsLock',
    code: 'CapsLock',
    modifiers: { CapsLock: true }
  });
  await expect(page.locator('#modal-status-caps')).not.toHaveClass(/on/);
  await expect(capsKey).not.toHaveClass(/modifier-active/);

  await dispatchKeyboardEventWithModifierState(tutorialInput, 'keydown', {
    key: 'q',
    code: 'KeyQ',
    modifiers: { CapsLock: true }
  });
  await expect(page.locator('#modal-status-caps')).not.toHaveClass(/on/);
  await expect(capsKey).not.toHaveClass(/modifier-active/);

  await dispatchKeyboardEventWithModifierState(tutorialInput, 'keyup', {
    key: 'CapsLock',
    code: 'CapsLock',
    modifiers: { CapsLock: true }
  });
  await expect(page.locator('#modal-status-caps')).not.toHaveClass(/on/);
});

test('handles Linux AltGraph keyboard events for the tutorial dead tilde', async ({ page }) => {
  await openTester(page, '/index.html', {
    done: false,
    progress: {
      introId: null,
      currentId: 'mots-etrangers',
      completedIds: tutorialCoreIds.slice(0, 5)
    }
  });

  const tutorialInput = page.locator('#tutorial-input');
  await tutorialInput.focus();

  await page.locator('#modal-keyboard-container .key[data-key-id="ShiftLeft"]').click();
  await page.locator('#modal-keyboard-container .key[data-key-id="KeyS"]').click();
  await expect(tutorialInput).toHaveText('S');
  await expect(page.locator('#tutorial-method')).toContainText('Tilde');

  await dispatchKeyboardEventWithModifierState(tutorialInput, 'keydown', {
    key: '~',
    code: 'Quote',
    ctrlKey: true,
    altKey: false,
    modifiers: { AltGraph: true }
  });
  await expect(page.locator('#modal-status-deadkey')).toContainText('Tilde');

  await dispatchKeyboardEventWithModifierState(tutorialInput, 'keydown', {
    key: 'a',
    code: 'KeyQ'
  });

  await expect(tutorialInput).toHaveText('S\u00e3');
});

test('forces Store methods for foreign-language tutorial characters', async ({ page }) => {
  await openTester(page, '/index.html', {
    done: false,
    progress: {
      introId: null,
      currentId: 'mots-etrangers',
      completedIds: tutorialCoreIds.slice(0, 5)
    }
  });

  await expect(page.locator('#tutorial-title')).toContainText('Mots étrangers');
  await page.locator('#modal-keyboard-container .key[data-key-id="ShiftLeft"]').click();
  await page.locator('#modal-keyboard-container .key[data-key-id="KeyS"]').click();

  await expect(page.locator('#tutorial-method')).toContainText('Tilde');
  await expectKeyHighlight(page, 'AltRight', /tutorial-key-highlight-step1/);
  await expectKeyHighlight(page, 'Quote', /tutorial-key-highlight-step1/);
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="KeyQ"]')).not.toHaveClass(/tutorial-key-highlight-step2/);

  await page.locator('#modal-keyboard-container .key[data-key-id="AltRight"]').click();
  await page.locator('#modal-keyboard-container .key[data-key-id="Quote"]').click();

  await expect(page.locator('#modal-keyboard-container .key[data-key-id="AltRight"]')).not.toHaveClass(/tutorial-key-highlight-step1/);
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="Quote"]')).not.toHaveClass(/tutorial-key-highlight-step1/);
  await expectKeyHighlight(page, 'KeyQ', /tutorial-key-highlight-step2/);
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="Digit7"] .bottom-right')).not.toHaveClass(/tutorial-legend-hidden/);
});

test('shows smart download CTAs for detected desktop operating systems', async ({ page }) => {
  await page.addInitScript(() => {
    const originalUserAgent = navigator.userAgent;
    const originalPlatform = navigator.platform;
    Object.defineProperty(navigator, 'userAgent', {
      get() { return window.__azertyTutorialUserAgent || originalUserAgent; }
    });
    Object.defineProperty(navigator, 'platform', {
      get() { return window.__azertyTutorialPlatform || originalPlatform; }
    });
  });

  const cases = [
    {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      platform: 'Win32',
      href: /apps\.microsoft\.com\/detail\/9n4bts43sssz/
    },
    {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
      platform: 'MacIntel',
      href: /AZERTY_Global_macOS\.zip/
    },
    {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      platform: 'Linux x86_64',
      href: /AZERTY_Global_Linux\.zip/
    }
  ];

  for (const osCase of cases) {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ userAgent, platform }) => {
      window.__azertyTutorialUserAgent = userAgent;
      window.__azertyTutorialPlatform = platform;
    }, osCase);
    await setTutorialStorage(page, {
      done: false,
      progress: {
        introId: null,
        currentId: 'mots-etrangers',
        completedIds: tutorialCoreIds.slice(0, 5)
      }
    });

    await page.locator('#open-tester-btn').click();
    await expect(page.locator('#tester-modal')).toBeVisible();
    await page.locator('#tutorial-skip-step').click();
    await expect(page.locator('#tutorial-final')).toBeVisible();
    await expect(page.locator('#tutorial-download')).toHaveAttribute('href', osCase.href);
  }
});

test('supports keyboard search navigation and platform-specific method labels', async ({ page }) => {
  await openTester(page);
  await page.locator('.platform-btn[data-platform="windows"]').click();

  const searchInput = page.locator('#modal-search-input');
  await searchInput.fill('|');

  const firstResult = page.locator('.search-result-item').first();
  await expect(firstResult).toBeVisible();
  await expect(firstResult.locator('.search-result-method')).toContainText('AltGr');

  await searchInput.press('ArrowDown');
  await expect(searchInput).toHaveAttribute('aria-activedescendant', /modal-search-result-/);

  await page.locator('.platform-btn[data-platform="mac"]').click();
  await expect(firstResult.locator('.search-result-method')).toContainText('Option');

  await searchInput.focus();
  await searchInput.press('ArrowDown');
  await expect(searchInput).toHaveAttribute('aria-activedescendant', /modal-search-result-/);
  await searchInput.press('Enter');
  await expect(page.locator('#modal-search-results')).toBeHidden();
  await expect(page.locator('#modal-output')).toBeFocused();
});

test('keeps lesson navigation within the selected module', async ({ page }) => {
  const currentModule = lessonsData.modules[1];
  const previousLesson = currentModule.lessons[0];
  const previousExerciseCount = previousLesson.exercises.length;

  await openLesson(page, 1, 1);

  const previousButton = page.locator('#lesson-prev');
  await expect(previousButton).toBeEnabled();
  await previousButton.click();

  await expect(page.locator('#lesson-module-select')).toHaveValue('1');
  await expect(page.locator('#lesson-title')).toContainText(previousLesson.title);
  await expect(page.locator('#lesson-progress')).toContainText(`Exercice ${previousExerciseCount}/${previousExerciseCount}`);
});

test('accepts plain text transfers in free mode and blocks them in lesson mode', async ({ page }) => {
  await openTester(page);

  const output = page.locator('#modal-output');
  await output.focus();
  await dispatchTransferEvent(output, 'paste', 'Bonjour\nMonde', '<strong>Bonjour</strong><div>Monde</div>');
  await expect(output).toHaveText('Bonjour\nMonde');

  await dispatchTransferEvent(output, 'drop', '\nDrop brut', '<em>Drop</em>');
  await expect(output).toHaveText('Bonjour\nMonde\nDrop brut');

  await page.locator('#tab-lessons').click();
  await page.locator('#lesson-module-select').selectOption('0');
  await page.locator('#lesson-list .lesson-btn').first().click();

  const lessonInput = page.locator('#lesson-input');
  await lessonInput.focus();
  await dispatchTransferEvent(lessonInput, 'paste', 'Interdit', '<strong>Interdit</strong>');
  await dispatchTransferEvent(lessonInput, 'drop', 'Toujours interdit', '<em>Toujours interdit</em>');
  await expect(lessonInput).toHaveText('');
});

test('updates lesson instructions when switching to macOS', async ({ page }) => {
  await openLesson(page, 2, 0);
  await page.locator('.platform-btn[data-platform="windows"]').click();

  const instruction = page.locator('#lesson-instruction');
  await expect(instruction).toContainText('AltGr + U');

  await page.locator('.platform-btn[data-platform="mac"]').click();
  await expect(instruction).toContainText('Option + U');
});

test('keeps active AltGr visual state after switching platform', async ({ page }) => {
  await openTester(page);

  await page.locator('.platform-btn[data-platform="windows"]').click();
  await page.locator('#modal-keyboard-container .key[data-key-id="AltRight"]').click();
  await expect(page.locator('#modal-status-altgr')).toHaveClass(/on/);
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="AltRight"]')).toHaveClass(/modifier-active/);

  await page.locator('.platform-btn[data-platform="mac"]').click();
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="AltLeft"]')).toHaveClass(/modifier-active/);
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="AltRight"]')).toHaveClass(/modifier-active/);

  await page.locator('.platform-btn[data-platform="linux"]').click();
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="AltRight"]')).toHaveClass(/modifier-active/);
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="AltLeft"]')).not.toHaveClass(/modifier-active/);
});

test('highlights both Option keys for direct AltGr methods on macOS', async ({ page }) => {
  await openTester(page);
  await page.locator('.platform-btn[data-platform="mac"]').click();

  const searchInput = page.locator('#modal-search-input');
  await searchInput.fill('€');
  await page.locator('.search-result-item').first().click();

  await expectKeyHighlight(page, 'AltLeft', /search-highlight/);
  await expectKeyHighlight(page, 'AltRight', /search-highlight/);
  await expectKeyHighlight(page, 'KeyE', /search-highlight/);
});

test('highlights both Option keys for Option + Maj methods on macOS', async ({ page }) => {
  await openTester(page);
  await page.locator('.platform-btn[data-platform="mac"]').click();

  const searchInput = page.locator('#modal-search-input');
  await searchInput.fill('Ù');
  await page.locator('.search-result-item').first().click();

  await expectKeyHighlight(page, 'AltLeft', /search-highlight/);
  await expectKeyHighlight(page, 'AltRight', /search-highlight/);
  await expectKeyHighlight(page, 'ShiftLeft', /search-highlight/);
  await expectKeyHighlight(page, 'KeyU', /search-highlight/);
});

test('finds characters via language nicknames, uppercase synonym and circumflex aliases', async ({ page }) => {
  await openTester(page);
  const searchInput = page.locator('#modal-search-input');

  // Surnoms par langue (passe du 2026-07-17)
  await searchInput.fill('o portugais');
  await expect(page.locator('.search-result-item').first()).toContainText('õ');

  await searchInput.fill('c espéranto');
  await expect(page.locator('.search-result-item').first()).toContainText('ĉ');

  // Surnoms de langues africaines (passe du 2026-07-17, inventaire afrique.html)
  await searchInput.fill('n bambara');
  await expect(page.locator('.search-result-item').first()).toContainText(/[ŋɲ]/u);

  await searchInput.fill('e ouvert');
  await expect(page.locator('.search-result-item').first()).toContainText('ɛ');

  // Synonyme uppercase → capital, actif dès le préfixe (recherche incrémentale)
  await searchInput.fill('é upper');
  await expect(page.locator('.search-result-item').first()).toContainText('É');

  // Alias « accent circonflexe » (les noms Unicode disent « avec circonflexe »)
  await searchInput.fill('e accent circonflexe');
  await expect(page.locator('.search-result-item').first()).toContainText('ê');
});

test('stops at the end of a module without switching modules', async ({ page }) => {
  const emailModule = lessonsData.modules[0];
  const lastLessonIndex = emailModule.lessons.length - 1;
  const lastLesson = emailModule.lessons[lastLessonIndex];
  const lastExercise = lastLesson.exercises[lastLesson.exercises.length - 1];

  await openLesson(page, 0, lastLessonIndex);

  for (let index = 1; index < lastLesson.exercises.length; index++) {
    await page.locator('#lesson-next').click();
  }

  await expect(page.locator('#lesson-progress')).toContainText(`Exercice ${lastLesson.exercises.length}/${lastLesson.exercises.length}`);
  await expect(page.locator('#lesson-next')).toBeDisabled();

  await completeDisplayedExercise(page, lastExercise.content);
  await expect(page.locator('#lesson-module-select')).toHaveValue('0');
  await expect(page.locator('#lesson-input')).toHaveText('🎉 Module terminé !');
});

test('keeps lesson characters covered by their exercises', async () => {
  const missingCharacters = [];

  for (const module of lessonsData.modules) {
    for (const lesson of module.lessons) {
      const exercisedCharacters = new Set();

      for (const exercise of lesson.exercises) {
        for (const char of Array.from(exercise.content)) {
          // Ignore only ASCII whitespace; keep U+00A0 / U+202F etc. (sujet de leçons typo).
          if (char !== ' ' && char !== '\n' && char !== '\r' && char !== '\t') {
            exercisedCharacters.add(char);
          }
        }
      }

      for (const char of lesson.characters || []) {
        if (!exercisedCharacters.has(char)) {
          missingCharacters.push(`${module.id}/${lesson.id}:${char}`);
        }
      }
    }
  }

  expect(missingCharacters).toEqual([]);
});

// ── Testeur bilingue FR/EN (data-lang="en" sur les pages /en/) ──

test('shows the tester chrome in English on /en/ pages', async ({ page }) => {
  await openTester(page, '/en/index.html');

  await expect(page.locator('#tab-libre')).toContainText('Free');
  await expect(page.locator('#tab-lessons')).toContainText('Lessons');
  await expect(page.locator('#modal-status-caps')).toHaveText('● Caps Lock');

  // Keycaps du clavier virtuel traduites (audit 2026-07-15).
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="CapsLock"] .key-label')).toHaveText('⇪ Caps Lock');
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="ShiftLeft"] .key-label')).toHaveText('⇧ Shift');

  // Tooltip override traduit (^ en AltGr sur la touche I).
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="KeyI"] .key-char.bottom-right'))
    .toHaveAttribute('title', 'CIRCUMFLEX');

  await page.getByRole('button', { name: /close the tester/i }).click();
  await expect(page.locator('#tester-modal')).toBeHidden();
});

test('shows English dead key names in the status bar on /en/ pages', async ({ page }) => {
  await openTester(page, '/en/index.html');

  const output = page.locator('#modal-output');
  await output.focus();

  await page.locator('#tester-modal').evaluate((modal) => {
    modal.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Dead',
      code: 'BracketLeft',
      bubbles: true,
      cancelable: true
    }));
  });

  await expect(page.locator('#modal-status-deadkey')).toContainText('Dead key:');
  await expect(page.locator('#modal-status-deadkey')).toContainText('Circumflex accent');
});

test('shows English lesson titles and progress on /en/ pages', async ({ page }) => {
  const lesson = lessonsData.modules[1].lessons[0];

  await openTester(page, '/en/index.html');
  await page.locator('#tab-lessons').click();
  await page.locator('#lesson-module-select').selectOption('1');

  const firstLessonButton = page.locator('#lesson-list .lesson-btn').first();
  await expect(firstLessonButton).toHaveText(lesson.titleEn);

  await firstLessonButton.click();
  await expect(page.locator('#lesson-progress')).toContainText('Exercise 1/');
  await expect(page.locator('#lesson-title')).toContainText(lesson.titleEn);
});

test('shows English option labels in the module selector on /en/ pages', async ({ page }) => {
  await openTester(page, '/en/index.html');
  await page.locator('#tab-lessons').click();

  const options = page.locator('#lesson-module-select option');
  await expect(options.first()).toHaveText('Choose a module...');
  await expect(options.nth(2)).toContainText(lessonsData.modules[1].titleEn);
});

test('shows English character names in search results on /en/ pages', async ({ page }) => {
  await openTester(page, '/en/index.html');

  await page.locator('#modal-search-input').fill('euro');
  const firstResult = page.locator('.search-result-item').first();
  await expect(firstResult).toBeVisible();
  await expect(firstResult.locator('.search-result-name')).toHaveText('EURO SIGN');
});

test('shows the guided tutorial in English on /en/ pages', async ({ page }) => {
  await openTester(page, '/en/index.html', { done: false });

  await expect(page.locator('#tutorial-panel')).toBeVisible();
  await expect(page.locator('#tutorial-title')).toContainText(tutorialData.core[0].titleEn);
  await expect(page.locator('#tutorial-instruction')).toContainText(tutorialData.core[0].instructionEn);
  await expect(page.locator('#tutorial-skip')).toHaveText('Skip the tutorial');

  // CTA de fin de tutoriel : destination anglaise (audit 2026-07-15).
  await expect(page.locator('#tutorial-download')).toHaveAttribute('href', '/en/download');
});

test('shows English tutorial feedback for Backspace and wrong characters on /en/ pages', async ({ page }) => {
  await openTester(page, '/en/index.html', { done: false });

  const tutorialInput = page.locator('#tutorial-input');
  await tutorialInput.focus();

  await page.keyboard.press('Backspace');
  await expect(page.locator('#tutorial-feedback')).toContainText('Nothing to delete.');

  await dispatchCompositionText(tutorialInput, '͸');
  await expect(page.locator('#tutorial-feedback')).toContainText('Expected character:');
});

// ── Pages EN — contenu bilingue (drapeaux, témoignages, hotspots) ──

test.describe('Pages EN — contenu bilingue', () => {
  test('shows the EN flag on the FR home and the FR flag on the EN home', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('a.lang-switch img[src*="flag-en"]')).toBeVisible();

    await page.goto('/en/index.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('a.lang-switch img[src*="flag-fr"]')).toBeVisible();
  });

  test('shows the bilingual testimonials carousel in English on the EN home', async ({ page }) => {
    await page.goto('/en/index.html', { waitUntil: 'domcontentloaded' });

    const carousel = page.locator('[aria-label="User testimonials"]');
    await expect(carousel).toBeVisible();

    // Le DOM commence par des clones (aria-hidden="true") pour l'effet boucle infinie — cibler une vraie carte.
    const firstRealCard = carousel.locator('.temoignages-card:not([aria-hidden="true"])').first();
    await expect(firstRealCard).toContainText('Smart Caps Lock');
    await expect(firstRealCard).toContainText('IT professional');
    await expect(firstRealCard.locator('.card__text')).toContainText('“');
  });

  test('shows the bilingual keyboard hotspots in English on the EN home', async ({ page }) => {
    await page.goto('/en/index.html', { waitUntil: 'domcontentloaded' });
    await page.locator('.hero__keyboard').scrollIntoViewIfNeeded();

    const atHotspot = page.locator('.keyboard-hotspot--at');
    await expect(atHotspot).toHaveAttribute('aria-label', 'At sign');
    await expect(atHotspot.locator('.keyboard-tooltip')).toContainText('Direct access');

    const smartCapsHotspot = page.locator('.keyboard-hotspot--smart-caps-lock');
    await expect(smartCapsHotspot.locator('.keyboard-tooltip')).toContainText('Smart Caps Lock');
  });
});
