const fs = require('fs');
const path = require('path');
const { test, expect } = require('../helpers/local-site');

// Suivi ZEVENT, réécrit pour la v2 le 2026-10-10. La version précédente
// décrivait les pages v1 et donnait 14 échecs sur 16 tests. L'historique est
// dans git.
//
// Retiré, car le comportement n'existe plus en v2 (vérifié dans dist) :
//   - vérification post-installation de /download (#post-install-check,
//     #post-install-caps, aide d'activation par système) ;
//   - formulaire /feedback (#feedback-form, #category, #os…) : /feedback et
//     /en/feedback redirigent en 301 vers /contact et /en/contact
//     (_redirects), sans page compilée dans dist ; le formulaire de contact
//     est couvert par captcha.spec.js et parcours-v2.spec.js ;
//   - liens d'exercice [data-gesture-link] de /guide et /faq vers la modale
//     du testeur : absents des pages v2 ; le testeur v2 est couvert par
//     testeur.spec.js.
//
// Conservé : le formulaire de contact (ex-/feedback) et la section
// d'installation de /download restent utilisables à 375 et 1280 px.

for (const width of [375, 1280]) {
  for (const [route, selector] of [['/contact', '#formulaire-contact'], ['/download', '#installation']]) {
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
