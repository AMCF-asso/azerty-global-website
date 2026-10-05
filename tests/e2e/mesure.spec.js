/* Mesure d'audience v2 — js/v2/mesure.js (plan de marquage du 2026-10-05,
   operations/2026-10-05-mesure-audience/plan-de-marquage.md).

   Google et Umami sont coupés par route.abort : aucun de ces tests ne parle à
   un prestataire. `AGMesure.journal` garde les événements de la page, que la
   mesure soit active ou non ; c'est lui que l'on vérifie. */

const { test, expect } = require('../helpers/local-site');

const GTM_ID = 'GTM-PWWRV6JT';
const UMAMI_TEST = '2d778727-f371-4c10-8376-49c5a907385b';
const TRACEUR = /(^|\.)(google[a-z-]*\.com|google-analytics\.com|doubleclick\.net|umami\.is|umami\.dev)$/;

/* Toute requête vers Google ou Umami est coupée, et notée. */
async function couperTraceurs(page) {
  const tentatives = [];
  await page.route((url) => TRACEUR.test(url.hostname), (route) => {
    tentatives.push(route.request().url());
    return route.abort();
  });
  return tentatives;
}

/* Le clic est mesuré en capture ; la navigation qu'il déclencherait est
   retenue pour rester sur la page et lire son journal. */
async function retenirNavigation(page) {
  await page.evaluate(() => document.addEventListener('click', (e) => e.preventDefault()));
}

const journal = (page) => page.evaluate(() => window.AGMesure.journal.map((e) => ({ ...e })));

test('/download : un clic Store donne telechargement windows/store, envoyé en mode test', async ({ page }) => {
  const tentatives = await couperTraceurs(page);
  await page.goto('/download?mesure=test', { waitUntil: 'load' });
  expect(await page.evaluate(() => [window.AGMesure.actif, window.AGMesure.test])).toEqual([true, true]);

  await page.locator('#tab-windows').click();
  await retenirNavigation(page);
  await page.locator('#btn-download-store-carte').click();

  expect(await journal(page)).toEqual([
    { nom: 'telechargement', params: { os: 'windows', canal: 'store', emplacement: 'installation' }, envoye: true }
  ]);

  /* GA4 : Consent Mode « denied », debug_mode, puis l'événement. */
  const couche = await page.evaluate(() => window.dataLayer.map((e) => (e && e.length !== undefined ? Array.from(e) : e)));
  expect(couche).toContainEqual(['consent', 'default', expect.objectContaining({ analytics_storage: 'denied', ad_storage: 'denied' })]);
  expect(couche).toContainEqual(['set', 'debug_mode', true]);
  expect(couche).toContainEqual(['event', 'telechargement', { os: 'windows', canal: 'store', emplacement: 'installation', debug_mode: true }]);

  /* Umami : site de test, sans restriction de domaine. */
  const umami = page.locator('script[src="https://cloud.umami.is/script.js"]');
  await expect(umami).toHaveCount(1);
  await expect(umami).toHaveAttribute('data-website-id', UMAMI_TEST);
  expect(await umami.getAttribute('data-domains')).toBeNull();

  await expect.poll(() => tentatives.some((url) => url.startsWith(`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`))).toBe(true);
  await expect.poll(() => tentatives.includes('https://cloud.umami.is/script.js')).toBe(true);
});

test('accueil : un lien vers /download donne vers_telechargement avec son emplacement', async ({ page }) => {
  await couperTraceurs(page);
  await page.goto('/', { waitUntil: 'load' });
  await retenirNavigation(page);
  await page.locator('.heros-accueil a[href="/download"]').click();

  expect(await journal(page)).toEqual([
    { nom: 'vers_telechargement', params: { emplacement: 'heros' }, envoye: false }
  ]);
});

test('un nom hors liste est ignoré, une valeur hors liste tombe', async ({ page }) => {
  await couperTraceurs(page);
  await page.goto('/', { waitUntil: 'load' });

  const retours = await page.evaluate(() => [
    window.AGMesure.evenement('page_view', {}),
    window.AGMesure.evenement('download_click', { os: 'windows' }),
    window.AGMesure.evenement('telechargement', { os: 'amiga', canal: 'store', email: 'a@b.fr' }),
    window.AGMesure.evenement('copie_caractere', { caractere: 'x'.repeat(30) })
  ]);
  expect(retours).toEqual([false, false, true, true]);
  expect(await journal(page)).toEqual([
    { nom: 'telechargement', params: { canal: 'store' }, envoye: false },
    { nom: 'copie_caractere', params: {}, envoye: false }
  ]);
});

test('hôte local sans ?mesure=test : rien n’est chargé ni envoyé', async ({ page, network }) => {
  const tentatives = await couperTraceurs(page);
  await page.goto('/download', { waitUntil: 'load' });
  expect(await page.evaluate(() => [window.AGMesure.actif, window.AGMesure.test])).toEqual([false, false]);

  await page.locator('#tab-windows').click();
  await retenirNavigation(page);
  await page.locator('#btn-download-store-carte').click();

  expect(await journal(page)).toEqual([
    { nom: 'telechargement', params: { os: 'windows', canal: 'store', emplacement: 'installation' }, envoye: false }
  ]);
  expect(await page.evaluate(() => window.dataLayer)).toBeUndefined();
  await expect(page.locator('script[src*="googletagmanager.com"], script[src*="umami.is"]')).toHaveCount(0);
  expect(tentatives).toEqual([]);
  expect(network.externalRequests.filter((r) => TRACEUR.test(new URL(r.url).hostname))).toEqual([]);
});

test('mode test : il tient pour l’onglet, ?mesure=off l’éteint', async ({ page }) => {
  await couperTraceurs(page);
  await page.goto('/guide?mesure=test', { waitUntil: 'load' });
  expect(await page.evaluate(() => window.AGMesure.test)).toBe(true);
  await page.goto('/guide', { waitUntil: 'load' });
  expect(await page.evaluate(() => window.AGMesure.test)).toBe(true);
  await page.goto('/guide?mesure=off', { waitUntil: 'load' });
  expect(await page.evaluate(() => [window.AGMesure.actif, window.AGMesure.test])).toEqual([false, false]);
  await page.goto('/guide', { waitUntil: 'load' });
  expect(await page.evaluate(() => window.AGMesure.test)).toBe(false);
});

test('opposition : rien n’est chargé, même en mode test', async ({ page }) => {
  const tentatives = await couperTraceurs(page);
  await page.addInitScript(() => window.localStorage.setItem('ag-mesure-refusee', '1'));
  await page.goto('/download?mesure=test', { waitUntil: 'load' });
  expect(await page.evaluate(() => [window.AGMesure.actif, window.AGMesure.test])).toEqual([false, true]);

  await page.locator('#tab-windows').click();
  await retenirNavigation(page);
  await page.locator('#btn-download-store-carte').click();

  expect((await journal(page)).map((e) => e.envoye)).toEqual([false]);
  expect(await page.evaluate(() => window.dataLayer)).toBeUndefined();
  await expect(page.locator('script[src*="googletagmanager.com"], script[src*="umami.is"]')).toHaveCount(0);
  expect(tentatives).toEqual([]);
});

test('formulaire : formulaire_envoye à la réponse OK du prestataire, jamais sur un échec', async ({ page, network }) => {
  await couperTraceurs(page);

  network.setWeb3FormsResponse({ status: 200, body: { success: false, message: 'Refus local' } });
  await page.goto('/contact', { waitUntil: 'load' });
  await page.locator('#motif').selectOption('positif');
  await page.locator('#description').fill('Message de test local.');
  await page.locator('label[for="note-8"]').click();
  await page.locator('#formulaire-contact button[type="submit"]').click();
  await expect(page.locator('#contact-echec')).toBeVisible();
  expect(await journal(page)).toEqual([]);

  network.setWeb3FormsResponse({ status: 200, body: { success: true } });
  await page.locator('#formulaire-contact button[type="submit"]').click();
  await expect(page.locator('#contact-confirmation')).toBeVisible();
  expect(await journal(page)).toEqual([
    { nom: 'formulaire_envoye', params: { formulaire: 'contact' }, envoye: false }
  ]);
  expect(network.web3FormsRequests).toHaveLength(2);
});
