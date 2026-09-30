const { test, expect } = require('../helpers/local-site');
const key = 'azerty-questionnaire-feedback';

// js/v2/questionnaire.js (vague 4 du lot 7) enregistre le brouillon à chaque
// changement d'un choix : le test coche un rond après avoir rempli le texte.
const form = '#formulaire-questionnaire';
const textFields = `${form} input[type="text"], ${form} input[type="email"], ${form} textarea`;

test('only predefined choices survive a questionnaire reload, never contact details or free text', async ({ page, network }) => {
  await page.goto('/questionnaire');
  await page.locator(textFields).evaluateAll(fields => { for (const field of fields) field.value = 'PRIVATE_DRAFT_MARKER'; });
  const choice = page.locator(`${form} input[type="radio"]`).first();
  await choice.check();
  const stored = await page.evaluate(key => localStorage.getItem(key), key);
  expect(stored).not.toContain('PRIVATE_DRAFT_MARKER');
  expect(JSON.parse(stored).savedAt).toBeGreaterThan(0);
  await page.reload();
  await expect(choice).toBeChecked();
  const text = await page.locator(textFields).evaluateAll(fields => fields.map(field => field.value));
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
  await page.locator(`${form} input[type="radio"]`).first().check();
  await expect(page.locator(`${form} button[type="submit"]`)).toBeEnabled();
  expect(network.pageErrors).toEqual([]);
});
