const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'js/umami-tracking.js'), 'utf8');

function fixture(options = {}) {
  const site = options.site || 'azerty';
  const host = options.host || (site === 'azerty' ? 'azerty.global' : 'vingtmillions.fr');
  const website = site === 'azerty' ? '54fa0bee-e290-4779-b00a-2683e625bf36' : '55e6f219-b38a-4311-b103-99226e2144e8';
  const attrs = { 'data-umami-enabled': options.enabled ?? 'true', 'data-website-id': website, 'data-umami-site': site };
  const appended = [], listeners = {}, sent = [];
  const location = new URL(options.url || `https://${host}/download`);
  const document = {
    currentScript: { getAttribute: key => attrs[key] },
    referrer: 'https://example.com/private?secret=never#identity',
    head: { appendChild: el => appended.push(el) },
    createElement: () => ({ attrs: {}, setAttribute(key, value) { this.attrs[key] = value; } }),
    addEventListener(name, callback) { listeners[name] = callback; }
  };
  const window = { location, screen: { width: 1280, height: 720 } };
  const context = vm.createContext({ window, document, navigator: { language: 'fr-FR' }, URL, URLSearchParams });
  const run = () => vm.runInContext(source, context);
  run();
  return { window, document, appended, listeners, sent, run,
    load() {
      window.umami = { track(name) {
        const payload = window.umamiBeforeSend('event', { website, name, title: 'private-user', url: '/private?token=secret', data: { email: 'private' }, id: 'private' });
        if (payload) sent.push(JSON.parse(JSON.stringify(payload)));
        return Promise.resolve();
      } };
      appended[0]?.onload();
    },
    click({ href = '', id = '', dataset = {}, button = 0 } = {}) {
      const element = { id, dataset, getAttribute: key => key === 'href' ? href : null };
      listeners[button === 1 ? 'auxclick' : 'click']?.({ button, target: {
        closest(selector) {
          if (selector === '[data-track-conversion="download_final"]') return dataset.trackConversion === 'download_final' ? element : null;
          return element;
        }
      } });
    }
  };
}

for (const host of ['localhost', '127.0.0.1', 'azerty-refonte.pages.dev', 'preview.vingtmillions.fr', 'azerty.global.evil.test']) {
  test(`no tracking on preview or unrelated host: ${host}`, () => {
    const page = fixture({ host });
    assert.equal(page.appended.length, 0);
    assert.equal(page.window.UmamiControl, undefined);
  });
}
for (const enabled of ['false', '', 'TRUE', '1']) {
  test(`no tracking unless activation is explicit: ${JSON.stringify(enabled)}`, () => {
    const page = fixture({ enabled });
    assert.equal(page.appended.length, 0);
    assert.deepEqual(Object.keys(page.listeners), []);
  });
}
for (const pathname of ['/admin', '/auth/callback?code=secret', '/api/user', '/__health']) {
  test(`private/operational route excluded: ${pathname}`, () => {
    assert.equal(fixture({ url: `https://vingtmillions.fr${pathname}`, site: 'vingtmillions' }).appended.length, 0);
  });
}
test('one initial page view, no automatic listeners, no custom data or identity', () => {
  const page = fixture();
  assert.equal(page.appended[0].attrs['data-auto-track'], 'false');
  page.load();
  assert.equal(page.sent.length, 1);
  assert.equal(page.sent[0].url, '/download');
  assert.equal(page.sent[0].referrer, 'https://example.com');
  assert.equal(page.sent[0].data, undefined);
  assert.equal(page.sent[0].id, undefined);
  assert.equal(page.sent[0].title, 'AZERTY Global');
  assert.deepEqual(Object.keys(page.listeners).sort(), ['auxclick', 'click']);
  page.run();
  assert.equal(page.appended.length, 1, 'duplicate loader cannot double pageviews');
});
test('only the known VingtMillions campaign survives; fragments and arbitrary queries do not', () => {
  const page = fixture({ url: 'https://azerty.global/bienvenue?utm_source=vingtmillions&utm_medium=referral&utm_campaign=zevent2026&email=private#prive' });
  page.load();
  assert.equal(page.sent[0].url, '/bienvenue?utm_source=vingtmillions&utm_medium=referral&utm_campaign=zevent2026');
});
for (const prefix of ['p', 's']) {
  test(`public ${prefix} profile names are not transmitted`, () => {
    const page = fixture({ site: 'vingtmillions', url: `https://vingtmillions.fr/${prefix}/private-user?secret=abc#token` });
    page.load();
    assert.equal(page.sent[0].url, `/${prefix}/:profile`);
    assert.doesNotMatch(JSON.stringify(page.sent), /private-user|secret|token/);
  });
}
test('download click has exactly one Umami event, even with both legacy attributes', () => {
  const page = fixture();
  page.load();
  const button = { dataset: { trackConversion: 'download_final', trackDetailOs: 'windows', trackDetailChannel: 'microsoft_store', analyticsEvent: 'download_store' } };
  page.click(button); page.click(button); page.click({ ...button, button: 1 });
  assert.deepEqual(page.sent.map(x => x.name), [undefined, 'download_windows_microsoft_store']);
});
test('all actual FR/EN download destinations are covered, including secondary text links', () => {
  let checked = 0;
  for (const file of ['src/pages/download.njk', 'src/pages/en/download.njk']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    for (const [, href] of html.matchAll(/href="(https:\/\/(?:apps\.microsoft\.com|download\.azerty\.global|sourceforge\.net)[^"]+)"/g)) {
      const page = fixture(); page.load(); page.click({ href: href.replace(/&amp;/g, '&') });
      assert.equal(page.sent.length, 2, `${file}: ${href}`);
      assert.match(page.sent[1].name, /^download_/);
      checked++;
    }
  }
  assert.ok(checked >= 13);
});
test('early clicks queue once and flush after the initial page view', () => {
  const page = fixture({ site: 'vingtmillions' });
  page.click({ href: 'https://azerty.global/' });
  page.click({ href: 'https://azerty.global/' });
  assert.equal(page.window.UmamiControl.status().pending, 1);
  page.load();
  assert.deepEqual(page.sent.map(x => x.name), [undefined, 'azerty_click']);
});
test('all VingtMillions sharing controls have bounded, explicit click names', () => {
  const cases = [
    [{ dataset: { umamiAction: 'share-moment' } }, 'share_click_moment'],
    [{ id: 'screen-capture' }, 'share_click_capture'],
    [{ id: 'prono-native' }, 'share_click_prono'],
    [{ id: 'share-native' }, 'share_click_prono'],
    [{ id: 'prono-x' }, 'share_click_x'],
    [{ id: 'streamer-recap-share' }, 'share_click_streamer'],
    [{ id: 'prono-download' }, 'share_image_download'],
    [{ id: 'streamer-recap-download' }, 'share_image_download']
  ];
  for (const [button, name] of cases) {
    const page = fixture({ site: 'vingtmillions' }); page.load(); page.click(button);
    assert.deepEqual(page.sent.map(x => x.name), [undefined, name]);
  }
});
test('pausing stops an existing document, drops pending clicks and never retries', () => {
  const page = fixture({ site: 'vingtmillions' });
  page.click({ id: 'prono-native' }); page.window.UmamiControl.pause(); page.load();
  page.click({ href: 'https://azerty.global/' });
  assert.equal(page.sent.length, 0);
  assert.equal(page.window.UmamiControl.status().pending, 0);
});
test('script failures and tracking exceptions cannot break the click handler', () => {
  const page = fixture();
  page.appended[0].onerror();
  assert.equal(page.window.UmamiControl.status().paused, true);
  assert.doesNotThrow(() => page.click({ href: 'https://apps.microsoft.com/detail/9n4bts43sssz' }));
  const ready = fixture(); ready.load();
  ready.window.umami.track = () => { throw new Error('Provider unavailable'); };
  assert.doesNotThrow(() => ready.click({ href: 'https://apps.microsoft.com/detail/9n4bts43sssz' }));
});
