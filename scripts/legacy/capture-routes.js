#!/usr/bin/env node
/**
 * Capture des routes du site à plusieurs largeurs (contrôle visuel).
 *
 * Usage :
 *   node scripts/capture-routes.js <baseUrl> <outDir> <routes> [widths]
 *
 *   baseUrl : ex. http://localhost:3210
 *   outDir  : dossier de sortie des PNG (créé si absent)
 *   routes  : liste séparée par des virgules, ex. "/,/download,/en/download"
 *   widths  : largeurs en px séparées par des virgules (défaut : 390,1440)
 *
 * Chaque capture est pleine page, nommée <slug>-<largeur>.png ("/" → "home").
 * Sert de référence avant/après pour la refonte (plan §15.6 : mêmes pages,
 * mêmes largeurs, comparaison côte à côte).
 */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

function slugify(route) {
  if (route === '/' || route === '') return 'home';
  return route.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '--');
}

async function main() {
  const [baseUrl, outDir, routesArg, widthsArg] = process.argv.slice(2);
  if (!baseUrl || !outDir || !routesArg) {
    console.error('Usage: node scripts/capture-routes.js <baseUrl> <outDir> <routes> [widths]');
    process.exit(1);
  }
  const routes = routesArg.split(',').map((r) => r.trim()).filter(Boolean);
  const widths = (widthsArg || '390,1440').split(',').map(Number);

  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  let failures = 0;
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    for (const route of routes) {
      const url = baseUrl.replace(/\/$/, '') + route;
      const file = path.join(outDir, `${slugify(route)}-${width}.png`);
      try {
        const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
        if (!resp || resp.status() >= 400) {
          console.error(`ERREUR ${route} @${width} : HTTP ${resp ? resp.status() : 'aucune réponse'}`);
          failures += 1;
          continue;
        }
        await page.screenshot({ path: file, fullPage: true });
        console.log(`OK ${route} @${width} -> ${path.basename(file)}`);
      } catch (err) {
        console.error(`ERREUR ${route} @${width} : ${err.message}`);
        failures += 1;
      }
    }
    await context.close();
  }
  await browser.close();
  if (failures > 0) {
    console.error(`${failures} capture(s) en échec`);
    process.exit(2);
  }
}

main();
