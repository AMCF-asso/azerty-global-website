/* Testeur v1 (modale `#tester-modal`, chaîne `init-tester.js`) — pages EN.

   Depuis la v2, aucune page FR n'ouvre plus la modale : /testeur a son propre
   composant (`testeur.spec.js`). La modale reste servie, en anglais, sur les
   pages EN encore en v1 (/en/, about, press ; download et guide sont passées
   en v2 le 2026-10-10, roadmap E1). Ce test de fumée la garde ouverte et
   fonctionnelle jusqu'à la migration EN, qui le retirera avec elle. Les 77
   specs v1 détaillées sont dans l'historique git (retirées le 2026-10-02,
   décision d'Antoine). */

const { test, expect } = require('../helpers/local-site');

const pagesEn = ['/en/index.html', '/en/about.html', '/en/press.html'];

async function frapper(cible, code, key) {
  await cible.evaluate((element, init) => {
    const evenement = new KeyboardEvent('keydown', { key: init.key, code: init.code, bubbles: true, cancelable: true });
    Object.defineProperty(evenement, 'getModifierState', { configurable: true, value: () => false });
    element.dispatchEvent(evenement);
  }, { code, key });
}

test.afterEach(async ({ network }) => {
  expect(network.pageErrors).toEqual([]);
  expect(network.consoleErrors).toEqual([]);
  expect(network.cspViolations).toEqual([]);
});

test('every EN page that offers the v1 tester still has its button', async ({ page }) => {
  for (const chemin of pagesEn) {
    await page.goto(chemin, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#open-tester-btn'), chemin).toHaveCount(1);
  }
});

test('the v1 tester opens in English on /en/ and types AZERTY Global', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('azertyTutorialDone', '2026-05-28T00:00:00.000Z'));
  await page.goto('/en/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#open-tester-btn').click();

  const modal = page.locator('#tester-modal');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('AZERTY Global');
  await expect(modal).not.toContainText('Essayer');

  const sortie = page.locator('#modal-output');
  await sortie.focus();
  /* Touche physique Q (code KeyQ) : a sur AZERTY ; touche W (KeyW) : z. */
  await frapper(sortie, 'KeyQ', 'a');
  await frapper(sortie, 'KeyW', 'z');
  await expect(sortie).toHaveText('az');

  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
});
