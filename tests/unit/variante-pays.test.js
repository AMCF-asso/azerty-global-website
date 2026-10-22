const test = require('node:test');
const assert = require('node:assert/strict');

const { groupeDuVisiteur, appliquerVariante } = require('../../edge/variante-pays.js');

const PAGE = '<html lang="fr" data-variante="standard">\n<head>\n'
  + '  <meta name="ag-variante" content="standard">\n</head><body></body></html>';

test('le continent africain donne la variante afrique, le reste standard', () => {
  assert.equal(groupeDuVisiteur({ continent: 'AF', hote: 'azerty.global' }), 'afrique');
  assert.equal(groupeDuVisiteur({ continent: 'EU', hote: 'azerty.global' }), 'standard');
  assert.equal(groupeDuVisiteur({ continent: undefined, hote: 'azerty.global' }), 'standard');
  assert.equal(groupeDuVisiteur(), 'standard');
});

test('?variante= ne force un groupe que hors production', () => {
  assert.equal(groupeDuVisiteur({ continent: 'EU', hote: 'refonte.website-89f.pages.dev', demande: 'afrique' }), 'afrique');
  assert.equal(groupeDuVisiteur({ continent: 'AF', hote: '127.0.0.1', demande: 'standard' }), 'standard');
  assert.equal(groupeDuVisiteur({ continent: 'EU', hote: 'azerty.global', demande: 'afrique' }), 'standard');
  assert.equal(groupeDuVisiteur({ continent: 'EU', hote: 'AZERTY.global.', demande: 'afrique' }), 'standard');
  assert.equal(groupeDuVisiteur({ continent: 'EU', hote: 'localhost', demande: '<script>' }), 'standard');
});

test('la variante change les deux marqueurs ensemble', () => {
  const html = appliquerVariante(PAGE, 'afrique');
  assert.match(html, /<html lang="fr" data-variante="afrique">/);
  assert.match(html, /<meta name="ag-variante" content="afrique">/);
  assert.doesNotMatch(html, /standard/);
});

test('sans ses deux marqueurs, la page reste standard', () => {
  const sansMeta = PAGE.replace('  <meta name="ag-variante" content="standard">\n', '');
  assert.equal(appliquerVariante(sansMeta, 'afrique'), sansMeta);
  assert.equal(appliquerVariante(PAGE, 'standard'), PAGE);
  assert.equal(appliquerVariante(PAGE, 'inconnu'), PAGE);
});
