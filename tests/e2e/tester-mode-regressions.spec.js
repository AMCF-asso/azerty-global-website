const { test, expect } = require('../helpers/local-site');

const pointLine = '. . . . .';

async function openTutorial(page) {
  await page.goto('/index.html?mode=lessons&tutorial=start');
  await page.locator('#tutorial-intro-start').click();
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="KeyG"]')).toBeVisible();
  await expect(page.locator('#tutorial-input')).toBeVisible();
}

async function openPointWithPausedClock(page) {
  await page.goto('/index.html?mode=lessons&module=0&lesson=0&tutorial=skip');
  await expect(page.locator('#lesson-title')).toContainText('Point .');
  await expect(page.locator('#lesson-target')).toHaveText(pointLine);
  await expect(page.locator('#modal-keyboard-container .key[data-key-id="Comma"]')).toBeVisible();
  await page.clock.install({ time: new Date('2026-09-05T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-05T12:00:01Z'));
  await page.locator('#lesson-input').focus();
}

async function typePointLine(page) {
  for (let index = 0; index < 5; index++) {
    if (index) await page.keyboard.press('Space');
    await page.keyboard.press('Comma');
  }
  await expect(page.locator('#lesson-input')).toHaveText(pointLine);
}

async function progress(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('azerty-lesson-progress') || '{}'));
}

for (const method of ['arrow', 'click']) {
  test(`tutorial to free routes real typing to the visible output (${method})`, async ({ page, network }) => {
    await openTutorial(page);
    const feedback = await page.locator('#tutorial-feedback').textContent();
    if (method === 'arrow') {
      await page.locator('#tab-lessons').focus();
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('#tab-libre')).toBeFocused();
    } else {
      await page.locator('#tab-libre').click();
    }
    await expect(page.locator('#tab-libre')).toHaveAttribute('aria-selected', 'true');
    await page.locator('#modal-output').focus();
    await page.keyboard.press('KeyG');
    await expect(page.locator('#modal-output')).toHaveText('g');
    await expect(page.locator('#tutorial-input')).toHaveText('');
    expect(await page.locator('#tutorial-feedback').textContent()).toBe(feedback);
    await expect(page.locator('#modal-keyboard-container')).not.toHaveClass(/tutorial-minimal/);
    expect(network.pageErrors).toEqual([]);
  });

  test(`free to tutorial resumes real typing without changing hidden output (${method})`, async ({ page, network }) => {
    await openTutorial(page);
    await page.locator('#tab-libre').click();
    await page.locator('#modal-output').focus();
    await page.keyboard.press('KeyG');
    await expect(page.locator('#modal-output')).toHaveText('g');
    if (method === 'arrow') {
      await page.locator('#tab-libre').focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('#tab-lessons')).toBeFocused();
    } else {
      await page.locator('#tab-lessons').click();
    }
    await expect(page.locator('#tab-lessons')).toHaveAttribute('aria-selected', 'true');
    await page.locator('#tutorial-input').focus();
    await page.keyboard.press('KeyG');
    await expect(page.locator('#tutorial-feedback')).toContainText('Caractère attendu : É');
    await expect(page.locator('#modal-output')).toHaveText('g');
    await expect(page.locator('#modal-keyboard-container')).toHaveClass(/tutorial-minimal/);
    expect(network.pageErrors).toEqual([]);
  });
}

test('completed Point is saved only after the validation delay', async ({ page }) => {
  await openPointWithPausedClock(page);
  await typePointLine(page);
  await page.clock.runFor(299);
  expect(await progress(page)).toEqual({});
  await expect(page.locator('#lesson-progress')).toContainText('Exercice 1/2');
  await page.clock.runFor(1);
  expect(await progress(page)).toEqual({ 'email-web': { point: [0] } });
  await expect(page.locator('#lesson-progress')).toContainText('Exercice 2/2');
});

test('selecting Arobase cancels pending Point validation without crediting an untyped exercise', async ({ page }) => {
  await openPointWithPausedClock(page);
  await typePointLine(page);
  await page.clock.runFor(100);
  await page.locator('#lesson-list .lesson-btn').filter({ hasText: 'Arobase @' }).click();
  await expect(page.locator('#lesson-title')).toContainText('Arobase @');
  await page.clock.runFor(1000);
  expect(await progress(page)).toEqual({});
  await expect(page.locator('#lesson-progress')).toContainText('Exercice 1/3');
  await expect(page.locator('#lesson-input')).toHaveText('');
});

test('Backspace invalidates pending validation and a corrected line gets its own delay', async ({ page }) => {
  await openPointWithPausedClock(page);
  await typePointLine(page);
  await page.clock.runFor(100);
  await page.keyboard.press('Backspace');
  await page.clock.runFor(1000);
  expect(await progress(page)).toEqual({});
  expect(await page.locator('#lesson-input').textContent()).toBe('. . . . ');
  await expect(page.locator('#lesson-input')).not.toHaveClass(/lesson-input--valid/);
  await expect(page.locator('#lesson-progress')).toContainText('Exercice 1/2');
  await page.keyboard.press('Comma');
  await page.clock.runFor(299);
  expect(await progress(page)).toEqual({});
  await page.clock.runFor(1);
  expect(await progress(page)).toEqual({ 'email-web': { point: [0] } });
});

test('restarting the same exercise cancels its earlier validation deadline', async ({ page }) => {
  await openPointWithPausedClock(page);
  await typePointLine(page);
  await page.clock.runFor(100);
  await page.locator('#lesson-restart').click();
  await page.locator('#lesson-input').focus();
  await typePointLine(page);
  await page.clock.runFor(200);
  expect(await progress(page)).toEqual({});
  await expect(page.locator('#lesson-input')).toHaveText(pointLine);
  await page.clock.runFor(100);
  expect(await progress(page)).toEqual({ 'email-web': { point: [0] } });
  await expect(page.locator('#lesson-progress')).toContainText('Exercice 2/2');
});

test('leaving Lessons cancels validation even when returning before its deadline', async ({ page }) => {
  await openPointWithPausedClock(page);
  await typePointLine(page);
  await page.clock.runFor(100);
  await page.locator('#tab-libre').click();
  await page.locator('#tab-lessons').click();
  await page.clock.runFor(1000);
  expect(await progress(page)).toEqual({});
  await expect(page.locator('#lesson-input')).toHaveText(pointLine);
  await expect(page.locator('#lesson-progress')).toContainText('Exercice 1/2');
});

for (const changeLesson of [false, true]) {
  test(`the later lesson advance ${changeLesson ? 'does not reset a newly selected lesson' : 'opens the next lesson normally'}`, async ({ page }) => {
    await openPointWithPausedClock(page);
    await page.locator('#lesson-next').click();
    await page.locator('#lesson-input').focus();
    const physicalKeys = { '.': 'Comma', ' ': 'Space', m: 'Semicolon' };
    for (const char of '.fr .com .org .net .eu') {
      await page.keyboard.press(physicalKeys[char] || `Key${char.toUpperCase()}`);
    }
    await expect(page.locator('#lesson-input')).toHaveText('.fr .com .org .net .eu');
    await page.clock.runFor(300);
    expect(await progress(page)).toEqual({ 'email-web': { point: [1] } });
    if (changeLesson) {
      await page.locator('#lesson-list .lesson-btn').filter({ hasText: 'Arobase @' }).click();
      await page.locator('#lesson-input').focus();
      await page.keyboard.press('KeyG');
      await expect(page.locator('#lesson-input')).toHaveText('g');
    }
    await page.clock.runFor(500);
    await expect(page.locator('#lesson-title')).toContainText(changeLesson ? 'Arobase @' : 'Point-virgule ;');
    await expect(page.locator('#lesson-input')).toHaveText(changeLesson ? 'g' : '');
    expect(await progress(page)).toEqual({ 'email-web': { point: [1] } });
  });
}

test('closing the modal cancels pending lesson validation', async ({ page }) => {
  await openPointWithPausedClock(page);
  await typePointLine(page);
  await page.locator('.tester-modal__close').click();
  await expect(page.locator('#tester-modal')).toBeHidden();
  await page.clock.runFor(1000);
  expect(await progress(page)).toEqual({});
});
