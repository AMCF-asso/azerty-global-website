const { test, expect } = require('../helpers/local-site');
const key = 'azerty-questionnaire-feedback';

test('only predefined choices survive a questionnaire reload, never contact details or free text', async ({ page, network }) => {
  await page.goto('/questionnaire');
  const choice = page.locator('#beta-feedback-form input[type="radio"]').first();
  const choiceId = await choice.getAttribute('id');
  await page.locator(`label[for="${choiceId}"]`).click();
  const stored = await page.evaluate(key => {
    const form = document.getElementById('beta-feedback-form');
    for (const field of form.querySelectorAll('input[type="text"], input[type="email"], textarea')) field.value = 'PRIVATE_DRAFT_MARKER';
    saveFormData();
    return localStorage.getItem(key);
  }, key);
  expect(stored).not.toContain('PRIVATE_DRAFT_MARKER');
  expect(JSON.parse(stored).savedAt).toBeGreaterThan(0);
  await page.reload();
  await expect(choice).toBeChecked();
  const text = await page.locator('#beta-feedback-form input[type="text"], #beta-feedback-form input[type="email"], #beta-feedback-form textarea').evaluateAll(fields => fields.map(field => field.value));
  expect(text.every(value => value === '')).toBe(true);
  expect(network.pageErrors).toEqual([]);
});

for (const [label, value] of [
  ['legacy personal draft', { email: 'private@example.invalid' }],
  ['expired draft', { savedAt: Date.now() - 25 * 60 * 60 * 1000, answers: {} }],
  ['invalid draft', null]
]) {
  test(`${label} is discarded on opening`, async ({ page }) => {
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key, value });
    await page.goto('/questionnaire');
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  });
}

test('disabled browser storage does not break the questionnaire', async ({ page, network }) => {
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem']) Storage.prototype[method] = () => { throw new DOMException('Disabled', 'SecurityError'); };
  });
  await page.goto('/questionnaire');
  await page.evaluate(() => saveFormData());
  await expect(page.locator('#beta-feedback-form button[type="submit"]')).toBeEnabled();
  expect(network.pageErrors).toEqual([]);
});
