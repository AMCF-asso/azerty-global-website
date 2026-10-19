const { test, expect } = require('../helpers/local-site');

// QUEST-1 (lot P2, 19/10/2026) : le témoignage est facultatif, la durée n'est
// plus annoncée, et la question de citation n'existe (et n'est requise) que si
// le témoignage est rempli (js/v2/questionnaire.js, `data-si="temoignage=*"`).
const form = '#formulaire-questionnaire';

test('questionnaire : aucune durée annoncée, témoignage marqué facultatif et non requis', async ({ page, network }) => {
  await page.goto('/questionnaire');
  await expect(page.locator('.hero-questionnaire__definition')).not.toContainText('minutes');
  await expect(page.locator('label[for="testimonial"] .champ__facultatif')).toHaveText('(facultatif)');
  await expect(page.locator('#testimonial')).not.toHaveAttribute('required', /.*/);
  expect(network.pageErrors).toEqual([]);
});

test('questionnaire : la citation du témoignage ne s’ouvre et n’est requise que si le témoignage est rempli', async ({ page, network }) => {
  await page.goto('/questionnaire');
  const citation = page.locator(`${form} fieldset.champ[data-si="temoignage=*"]`);
  const premierRond = page.locator('#perm-named');

  await expect(citation).toBeHidden();
  await expect(premierRond).not.toHaveAttribute('required', /.*/);

  await page.locator('#testimonial').pressSequentially('Très utile au quotidien.');
  await expect(citation).toBeVisible();
  await expect(premierRond).toHaveAttribute('required', '');

  await page.locator('#perm-named').check();
  await expect(page.locator('#pseudo')).toBeVisible();

  // Témoignage vidé : la question se ferme, sa réponse part avec elle.
  await page.locator('#testimonial').fill('');
  await expect(citation).toBeHidden();
  await expect(premierRond).not.toBeChecked();
  await expect(page.locator('#pseudo')).toBeHidden();
  expect(network.pageErrors).toEqual([]);
});
