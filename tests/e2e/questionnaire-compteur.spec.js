const { test, expect } = require('../helpers/local-site');

// QUEST-2 (lot P2, 19/10/2026) : le compteur ne compte que les réponses
// obligatoires données, sur le total des champs visibles et requis
// (js/v2/questionnaire.js, section 4).
const NBSP = ' ';

test('questionnaire : le compteur compte les réponses obligatoires, pas les facultatives', async ({ page, network }) => {
  await page.goto('/questionnaire');
  const compte = page.locator('#progression-compte');
  const barre = page.locator('#progression-barre');

  await expect(compte).toHaveText(/^0 réponse obligatoire donnée sur \d+$/);
  const total = Number((await compte.innerText()).match(/sur (\d+)$/)[1]);
  expect(total).toBeGreaterThan(0);
  await expect(barre).toHaveAttribute('aria-valuemax', String(total));

  // « macos » n'ouvre aucun champ : le total ne bouge pas.
  await page.locator('#os').selectOption('macos');
  await expect(compte).toHaveText(`1${NBSP}réponse obligatoire donnée sur ${total}`);
  await expect(barre).toHaveAttribute('aria-valuetext', `1${NBSP}réponse obligatoire donnée sur ${total}`);

  // Pluriel dès 2.
  await page.locator('#keyboard-type').selectOption({ index: 1 });
  await expect(compte).toHaveText(`2${NBSP}réponses obligatoires données sur ${total}`);

  // Un témoignage (facultatif) ne compte pas comme réponse obligatoire.
  await page.locator('#testimonial').fill('Un avis.');
  await expect(compte).toHaveText(new RegExp(`^2\\u00a0réponses obligatoires données sur \\d+$`));
  expect(network.pageErrors).toEqual([]);
});

test('questionnaire : le total suit les champs conditionnels visibles et requis', async ({ page, network }) => {
  await page.goto('/questionnaire');
  const compte = page.locator('#progression-compte');
  const totalDe = async () => Number((await compte.innerText()).match(/sur (\d+)$/)[1]);

  await page.locator('#os').selectOption('macos');
  const sansInstallation = await totalDe();

  // Windows 11 ouvre « Méthode d'installation » (obligatoire une fois ouvert).
  await page.locator('#os').selectOption('windows-11');
  expect(await totalDe()).toBe(sansInstallation + 1);

  await page.locator('#os').selectOption('macos');
  expect(await totalDe()).toBe(sansInstallation);
  expect(network.pageErrors).toEqual([]);
});
