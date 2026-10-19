/* Captures du composant clavier, pour les arrêts visuels.
   capture-page.js photographie une page entière ; ici il faut l'inverse — un
   élément, dans un état que seul le JS produit (étape du parcours, onglet de
   couche, dialog ouvert). D'où un script à part, réutilisable à la session
   /guide.

   Usage :
     node scripts/capture-clavier.js sorties/
   Base : BASE_URL (défaut http://localhost:3200). Requiert Playwright et un
   Edge local (channel msedge), comme capture-page.js. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROUTE = '/refonte-specimen';
const LARGEURS = [1920, 1440, 1024, 768, 390, 320];

(async () => {
  const sortie = process.argv[2] || '.';
  const base = process.env.BASE_URL || 'http://localhost:3200';
  fs.mkdirSync(sortie, { recursive: true });

  const navigateur = await chromium.launch({ channel: 'msedge', headless: true });
  const faites = [];

  async function ouvrir(largeur, sombre) {
    const contexte = await navigateur.newContext({
      viewport: { width: largeur, height: 1080 },
      deviceScaleFactor: 1,
      colorScheme: sombre ? 'dark' : 'light'
    });
    const page = await contexte.newPage();
    await page.goto(base + ROUTE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    return { contexte, page };
  }

  async function photo(cible, nom) {
    const chemin = path.join(sortie, nom + '.png');
    await cible.screenshot({ path: chemin });
    faites.push(nom + '.png');
  }

  /* 1. La vue synthèse — celle que rend le composant sans JavaScript — à
        toutes les largeurs, ivoire ; sombre aux deux extrêmes. */
  for (const largeur of LARGEURS) {
    for (const sombre of largeur === 1920 || largeur === 390 ? [false, true] : [false]) {
      const { contexte, page } = await ouvrir(largeur, sombre);
      await photo(page.locator('#vue-synthese'), `synthese-${largeur}-${sombre ? 'sombre' : 'ivoire'}`);
      await contexte.close();
    }
  }

  /* 2. Les six couches en statique, à 1440 ivoire puis sombre. */
  for (const sombre of [false, true]) {
    const { contexte, page } = await ouvrir(1440, sombre);
    for (const couche of ['base', 'maj', 'verrmaj', 'altgr', 'majaltgr', 'synthese']) {
      await photo(page.locator('#vue-' + couche), `couche-${couche}-1440-${sombre ? 'sombre' : 'ivoire'}`);
    }
    await contexte.close();
  }

  /* 3. Le parcours, étape par étape : 1440 ivoire pour la lecture, 390 pour la
        règle d'or mobile (les pastilles doivent porter le lisible). */
  for (const [largeur, sombre] of [[1440, false], [1440, true], [390, false]]) {
    const { contexte, page } = await ouvrir(largeur, sombre);
    const jalons = page.locator('#parcours-specimen .clavier-parcours__jalon');
    const nombre = await jalons.count();
    for (let i = 0; i < nombre; i++) {
      await jalons.nth(i).click();
      await page.waitForTimeout(250);
      await photo(
        page.locator('#parcours-specimen'),
        `parcours-etape${i + 1}-${largeur}-${sombre ? 'sombre' : 'ivoire'}`
      );
    }
    await contexte.close();
  }

  /* 4. Le plein écran, un onglet à la fois. */
  for (const [largeur, sombre] of [[1440, false], [1440, true], [768, false]]) {
    const { contexte, page } = await ouvrir(largeur, sombre);
    await page.locator('[data-clavier-ouvrir]').first().click();
    await page.waitForTimeout(300);
    const onglets = page.locator('#aide-specimen [data-couche-cible]');
    const nombre = await onglets.count();
    for (let i = 0; i < nombre; i++) {
      const couche = await onglets.nth(i).getAttribute('data-couche-cible');
      await onglets.nth(i).click();
      await page.waitForTimeout(250);
      await photo(
        page.locator('#aide-specimen'),
        `plein-${couche}-${largeur}-${sombre ? 'sombre' : 'ivoire'}`
      );
    }
    await contexte.close();
  }

  /* 5. La feuille A4 : le seul contrôle possible est un PDF, l'écran ne la
        montre jamais. API PDF de Playwright, jamais un drapeau d'Edge
        (l'en-tête headless d'Edge est piégeux). */
  {
    const { contexte, page } = await ouvrir(1440, false);
    const chemin = path.join(sortie, 'feuille-a4.pdf');
    await page.pdf({
      path: chemin,
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' }
    });
    faites.push('feuille-a4.pdf');
    await contexte.close();
  }

  await navigateur.close();
  console.log(faites.length + ' fichiers écrits dans ' + sortie);
  for (const nom of faites) console.log('  ' + nom);
})().catch((erreur) => { console.error(erreur); process.exit(1); });
