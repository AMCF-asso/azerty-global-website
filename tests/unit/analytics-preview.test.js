const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const scripts = ['gtm-loader.js', 'analytics-loader.js', 'conversion-tracking.js'];
const gtmId = 'GTM-PWWRV6JT';
const cfBeacon = '{"token": "bc30c343130f4bfa88c667173f84e324"}';
const websiteId = '54fa0bee-e290-4779-b00a-2683e625bf36';
const timestamp = 1788566400000;

function element(attributes = {}) {
  return {
    attributes: { ...attributes },
    getAttribute(name) { return this.attributes[name] ?? null; },
    setAttribute(name, value) { this.attributes[name] = String(value); }
  };
}

// This VM has no network implementation. Appending a script records its
// attributes only; no provider code or URL is ever executed or requested.
function browser({ hostname = 'azerty.global', protocol = 'https:', existingTracking = false, entryMode = 'discover', id = gtmId } = {}) {
  const appended = [];
  const listeners = [];
  const calls = { gtag: [], push: [], debug: [] };
  const document = {
    title: 'Preview analytics fixture',
    documentElement: { dataset: { entryMode } },
    currentScript: element({ 'data-cf-beacon': cfBeacon, 'data-website-id': websiteId }),
    querySelector(selector) {
      assert.equal(selector, 'meta[name="gtm-id"]');
      return id === null ? null : element({ content: id });
    },
    createElement(tag) {
      assert.equal(tag, 'script');
      return element();
    },
    head: { appendChild(node) { appended.push(node); } },
    addEventListener(...args) { listeners.push(args); }
  };
  const window = {
    location: { hostname, protocol, pathname: '/bienvenue' },
    AZERTY_TRACK_DEBUG: true
  };
  if (existingTracking) {
    window.gtag = (...args) => calls.gtag.push(args);
    window.dataLayer = { push: (...args) => calls.push.push(args) };
  }
  const context = vm.createContext({
    window, document,
    console: { debug: (...args) => calls.debug.push(args) }
  });
  vm.runInContext(`Date.now = function () { return ${timestamp}; };`, context);
  return {
    window, document, appended, listeners, calls,
    run(name) { vm.runInContext(fs.readFileSync(path.join(root, 'js', name), 'utf8'), context, { filename: name }); }
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const localLocations = [
  { hostname: 'localhost', protocol: 'http:' },
  { hostname: 'localhost', protocol: 'https:' },
  { hostname: 'LOCALHOST.' },
  { hostname: 'preview.localhost' },
  { hostname: 'nested.preview.localhost.' },
  { hostname: '127.0.0.1', protocol: 'http:' },
  { hostname: '127.1.2.3' },
  { hostname: '127.255.255.255' },
  { hostname: '::1' },
  { hostname: '[::1]', protocol: 'http:' },
  { hostname: '', protocol: 'file:' },
  { hostname: 'azerty.global', protocol: 'file:' }
];

for (const location of localLocations) {
  const label = `${location.protocol || 'https:'}//${location.hostname || '(empty)'}`;
  test(`local preview ${label}: no provider, consent, queue or tracking listener`, () => {
    const page = browser(location);
    scripts.forEach(name => page.run(name));
    assert.equal(typeof page.window.AzertyTrack.event, 'function');
    assert.equal(typeof page.window.AzertyTrack.conversion, 'function');
    assert.doesNotThrow(() => {
      page.window.AzertyTrack.event('preview_open', { source: 'test' });
      page.window.AzertyTrack.conversion('tester_click', { placement: 'hero' });
      page.window.AzertyTrack.event();
      page.window.AzertyTrack.conversion();
    });
    assert.equal(page.window.dataLayer, undefined);
    assert.equal(page.window.gtag, undefined);
    assert.deepEqual(page.appended, []);
    assert.deepEqual(page.listeners, []);
    assert.deepEqual(page.calls.debug, []);
  });

  test(`local preview ${label}: pre-existing transports are never invoked`, () => {
    const page = browser({ ...location, existingTracking: true });
    const dataLayer = page.window.dataLayer;
    const gtag = page.window.gtag;
    // Each entry point must protect itself, including conversion tracking when
    // it loads before either provider loader or a page supplies an existing API.
    [...scripts].reverse().forEach(name => page.run(name));
    page.window.AzertyTrack.event('preview_open', { source: 'test' });
    page.window.AzertyTrack.conversion('tester_click', { placement: 'hero' });
    assert.equal(page.window.dataLayer, dataLayer);
    assert.equal(page.window.gtag, gtag);
    assert.deepEqual(page.calls, { gtag: [], push: [], debug: [] });
    assert.deepEqual(page.appended, []);
    assert.deepEqual(page.listeners, []);
  });
}

for (const hostname of ['azerty.global', 'www.azerty.global', 'azerty-refonte.pages.dev', 'localhost.example.com', '127.0.0.1.example.com']) {
  test(`${hostname}: production providers, consent and GTM configuration are preserved`, () => {
    const page = browser({ hostname });
    page.run('gtm-loader.js');
    page.run('analytics-loader.js');
    assert.equal(typeof page.window.gtag, 'function');
    assert.deepEqual(Array.from(page.window.dataLayer[0], plain), ['consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500
    }]);
    assert.deepEqual(Array.from(page.window.dataLayer[1], plain), ['set', 'ads_data_redaction', true]);
    assert.deepEqual(plain(page.window.dataLayer[2]), { 'gtm.start': timestamp, event: 'gtm.js' });
    assert.equal(page.window.dataLayer.length, 3);
    assert.deepEqual(page.appended.map(node => node.src), [
      `https://www.googletagmanager.com/gtm.js?id=${gtmId}`,
      'https://static.cloudflareinsights.com/beacon.min.js',
      '/js/umami-tracking.js'
    ]);
    assert.equal(page.appended[0].async, true);
    assert.equal(page.appended[1].defer, true);
    assert.equal(page.appended[1].getAttribute('data-cf-beacon'), cfBeacon);
    assert.equal(page.appended[2].defer, true);
    assert.equal(page.appended[2].getAttribute('data-website-id'), websiteId);
    assert.equal(page.appended[2].getAttribute('data-umami-enabled'), 'false', 'no unprotected paid tracking');
  });
}

test('production events retain page context, details and the existing gtag transport', () => {
  const page = browser({ existingTracking: true });
  page.run('conversion-tracking.js');
  page.window.AzertyTrack.event('preview_open', { source: 'test' });
  page.window.AzertyTrack.conversion('tester_click', { placement: 'hero' });
  const context = { page_path: '/bienvenue', page_title: 'Preview analytics fixture', entry_mode: 'discover' };
  assert.deepEqual(plain(page.calls.push), [
    [{ event: 'preview_open', ...context, source: 'test' }],
    [{ event: 'conversion', conversion_name: 'tester_click', ...context, placement: 'hero' }]
  ]);
  assert.deepEqual(plain(page.calls.gtag), [
    ['event', 'preview_open', { ...context, source: 'test' }],
    ['event', 'tester_click', { ...context, placement: 'hero' }]
  ]);
  const clickListener = page.listeners.find(([name]) => name === 'click');
  assert.equal(typeof clickListener?.[1], 'function');
  assert.equal(clickListener[2], true);
  const target = { dataset: { trackConversion: 'pilot_cta_click', trackDetailSource: 'home-zevent' } };
  clickListener[1]({ target: { closest(selector) { assert.equal(selector, '[data-track-conversion]'); return target; } } });
  assert.deepEqual(plain(page.calls.push[2]), [{ event: 'conversion', conversion_name: 'pilot_cta_click', ...context, source: 'home-zevent' }]);
});

test('production events still queue when gtag has not loaded, and ignore empty event names', () => {
  const page = browser({ entryMode: 'unsupported' });
  page.run('conversion-tracking.js');
  page.window.AzertyTrack.event('tester_open');
  page.window.AzertyTrack.conversion('tester_click');
  page.window.AzertyTrack.event();
  page.window.AzertyTrack.conversion('');
  assert.deepEqual(plain(page.window.dataLayer), [
    { event: 'tester_open', page_path: '/bienvenue', page_title: 'Preview analytics fixture' },
    { event: 'conversion', conversion_name: 'tester_click', page_path: '/bienvenue', page_title: 'Preview analytics fixture' }
  ]);
});

test('missing or invalid production GTM metadata never injects a GTM script', () => {
  for (const id of [null, '', 'invalid', 'GTM-X&other=1']) {
    const page = browser({ id });
    page.run('gtm-loader.js');
    assert.deepEqual(page.appended, []);
    assert.equal(page.window.dataLayer.length, 2, 'default consent and redaction stay unchanged');
  }
});

for (const template of ['base.njk', 'base-en.njk']) {
  test(`${template}: provider identifiers remain exact and all provider loading passes through the local loader`, () => {
    const source = fs.readFileSync(path.join(root, 'src/_includes', template), 'utf8');
    assert.match(source, new RegExp(`<meta name="gtm-id" content="${gtmId}">`));
    const tags = source.match(/<script\b[^>]*>/gi) || [];
    const loader = tags.filter(tag => /src=["'][^"']*js\/analytics-loader\.js["']/.test(tag));
    assert.equal(loader.length, 1);
    assert.match(loader[0], /\bdefer\b/);
    assert.match(loader[0], /data-umami-enabled="false"/);
    assert.equal(loader[0].match(/data-cf-beacon='([^']+)'/)?.[1], cfBeacon);
    assert.equal(loader[0].match(/data-website-id="([^"]+)"/)?.[1], websiteId);
    assert.equal(tags.some(tag => /src=["']https?:\/\/(?:www\.googletagmanager\.com|static\.cloudflareinsights\.com|cloud\.umami\.is)\//.test(tag)), false);
  });
}
