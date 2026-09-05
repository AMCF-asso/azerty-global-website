const fs = require('fs');
const path = require('path');
const { test, expect } = require('../helpers/local-site');
const lessons = require('../../tester/lessons.json');

test('post-install check preserves native input and only compares the resulting characters', async ({ page, network }) => {
  await page.goto('/download');
  const check = page.locator('#post-install-check');
  const result = check.locator('[data-check-result]');
  const caps = page.locator('#post-install-caps');
  await caps.focus();
  await page.keyboard.insertText('é');
  await page.locator('#post-install-point').fill(';');
  await page.locator('#post-install-at').fill('²');
  await check.getByRole('button', { name: 'Vérifier ma saisie' }).click();
  await expect(caps).toHaveValue('é');
  await expect(caps).toBeFocused();
  await expect(result).toContainText('absents ou différents');
  await expect(check.locator('[data-check-help]')).toHaveAttribute('open', '');
  await expect(caps).toHaveAttribute('aria-invalid', 'true');

  await caps.fill('É');
  await expect(result).toBeEmpty();
  await expect(caps).not.toHaveAttribute('aria-invalid');
  await page.locator('#post-install-point').fill('.');
  await page.locator('#post-install-at').fill('@');
  await check.getByRole('button', { name: 'Vérifier ma saisie' }).click();
  await expect(result).toContainText('Les trois caractères attendus sont bien saisis');
  await expect(check).toContainText('Le site ne détecte pas la disposition activée');
  await check.getByRole('button', { name: 'Recommencer' }).click();
  await expect(caps).toBeEmpty();
  await expect(result).toBeEmpty();
  expect(network.web3FormsRequests).toEqual([]);
  expect(network.pageErrors).toEqual([]);
  expect(network.cspViolations).toEqual([]);
});

test('activation help follows OS selection and keyboard-operated download tabs', async ({ page }) => {
  await page.goto('/download');
  const check = page.locator('#post-install-check');
  for (const [os, text] of [['windows', 'Pilote EXE classique'], ['macos', 'sources de saisie'], ['linux', 'GNOME']]) {
    await check.locator('[data-check-os]').selectOption(os);
    await check.locator('[data-check-submit]').click();
    await expect(check.locator(`[data-check-help] [data-check-for="${os}"]`)).toBeVisible();
    await expect(check.locator(`[data-check-help] [data-check-for="${os}"]`)).toContainText(text);
    expect(await check.locator('[data-check-help] [data-check-for]:visible').count()).toBe(1);
  }
  await page.locator('#post-install-caps').fill('É');
  await page.locator('#tab-windows').click();
  await page.keyboard.press('ArrowRight');
  await expect(check.locator('[data-check-os]')).toHaveValue('macos');
  await expect(page.locator('#post-install-caps')).toBeEmpty();
  expect(await page.locator('[data-traffic-version]').evaluate(node =>
    Boolean(document.getElementById('os-linux').compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)
  )).toBe(true);
});

test('a first impression needs only a comment and excludes technical fields and publication consent', async ({ page, network }) => {
  await page.goto('/feedback');
  const form = page.locator('#feedback-form');
  await expect(page.locator('#category')).toHaveValue('premiere-impression');
  await expect(page.locator('#os')).toBeHidden();
  await expect(page.locator('#app-name')).toBeDisabled();
  await page.locator('#description').fill('Première impression de test, sans envoi réel.');
  expect(await form.evaluate(node => node.checkValidity())).toBe(true);
  const submitted = page.waitForRequest(request => request.url().includes('api.web3forms.com') && request.method() === 'POST');
  await form.getByRole('button', { name: 'Envoyer mon feedback' }).click();
  const body = (await submitted).postData();
  expect(body).toContain('premiere-impression');
  expect(body).not.toMatch(/name="(?:systeme-exploitation|methode-installation|nom-application|promotion|note)"/);
  await expect(form.locator('[role="status"]')).toContainText('Votre retour a bien été envoyé');
  expect(network.web3FormsRequests).toHaveLength(1);
});

test('bug reports reveal configuration and switching back removes hidden requirements and values from submission', async ({ page }) => {
  await page.goto('/feedback');
  const form = page.locator('#feedback-form');
  await page.locator('#category').selectOption('bug-caracteres');
  await expect(page.locator('#os')).toBeVisible();
  await page.locator('#description').fill('Test local de caractère incorrect.');
  expect(await form.evaluate(node => node.checkValidity())).toBe(false);
  await page.locator('#os').selectOption('win11');
  await expect(page.locator('#install-method')).toBeVisible();
  await expect(page.locator('#install-method')).toHaveAttribute('required', '');
  await page.locator('#install-method').selectOption('microsoft-store');
  await page.locator('#keyboard').selectOption('iso');
  await page.locator('#typing-method').selectOption('dactylographie');
  await page.locator('#app-name').fill('Application de test');
  expect(await form.evaluate(node => node.checkValidity())).toBe(true);
  await page.locator('#os').selectOption('mac');
  await expect(page.locator('#install-method')).toBeHidden();
  await expect(page.locator('#install-method')).not.toHaveAttribute('required');
  await page.locator('#category').selectOption('suggestion');
  await expect(page.locator('#os')).toBeHidden();
  expect(await form.evaluate(node => node.checkValidity())).toBe(true);
  expect(await form.evaluate(node => [...new FormData(node).keys()])).not.toContain('systeme-exploitation');
  expect(await form.evaluate(node => [...new FormData(node).keys()])).not.toContain('nom-application');
  await form.locator('summary').filter({ hasText: 'Ajouter une note' }).click();
  await page.locator('#discovery').selectOption('vingtmillions-zevent');
  expect(await form.evaluate(node => new FormData(node).get('decouverte'))).toBe('vingtmillions-zevent');
});

test('shared feedback script preserves the English form and its Windows requirements', async ({ page, network }) => {
  await page.goto('/en/feedback');
  await expect(page.locator('#os')).toBeVisible();
  await page.locator('#os').selectOption('win11');
  await expect(page.locator('#install-method')).toBeVisible();
  await expect(page.locator('#install-method')).toHaveAttribute('required', '');
  await page.locator('#os').selectOption('linux');
  await expect(page.locator('#install-method')).toBeHidden();
  expect(network.pageErrors).toEqual([]);
});

for (const [route, index, moduleIndex, lessonIndex] of [
  ['/guide', 0, 1, 0], ['/guide', 1, 0, 0], ['/guide', 2, 0, 2],
  ['/guide', 3, 4, 0], ['/guide', 4, 5, 0], ['/faq', 0, 1, 0], ['/faq', 1, 0, 2]
]) {
  test(`${route} exercise ${index + 1} opens the corresponding lesson`, async ({ page, network }) => {
    await page.goto(route);
    const link = page.locator('[data-gesture-link]').nth(index);
    const details = link.locator('xpath=ancestor::details');
    if (!(await details.evaluate(node => node.open))) await details.locator('summary').click();
    await link.click();
    const lesson = lessons.modules[moduleIndex].lessons[lessonIndex];
    await expect(page.locator('#tester-modal')).toBeVisible();
    await expect(page.locator('#lesson-title')).toContainText(lesson.title);
    await expect(page.locator('#lesson-target')).toHaveText(lesson.exercises[0].content);
    expect(network.pageErrors).toEqual([]);
    expect(network.cspViolations).toEqual([]);
  });
}

for (const width of [375, 1280]) {
  for (const [route, selector] of [['/feedback', '#feedback-form'], ['/download', '#post-install-check']]) {
    test(`${route} remains usable at ${width}px`, async ({ page, network }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const directory = path.resolve(__dirname, '../../.internal/zevent-follow-through/screenshots');
      fs.mkdirSync(directory, { recursive: true });
      await page.goto(route);
      const section = page.locator(selector);
      await section.scrollIntoViewIfNeeded();
      const dimensions = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.width + 1);
      expect(network.pageErrors).toEqual([]);
      expect(network.cspViolations).toEqual([]);
      // Assert CSP before capture: Playwright's WebKit screenshot helper injects
      // a temporary "body {}" stylesheet to synchronize animations.
      await section.screenshot({ path: path.join(directory, `${route.slice(1)}-${width}-${testInfo.project.name}.png`), caret: 'initial' });
    });
  }
}
