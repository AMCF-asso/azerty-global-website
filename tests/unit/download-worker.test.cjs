const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../../workers/download-msix/src/index.js'), 'utf8');
const workerPromise = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const name = 'AZERTY_Global_Windows.zip';
const etag = '"9976b8a090c50390566173d293f6615e"';

function harness(overrides = {}) {
  const calls = { get: 0, head: 0, cancelled: 0 };
  const pending = [];
  const store = new Map();
  const object = () => ({ size: 2777269, httpEtag: etag,
    body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('zip fixture')); }, cancel() { calls.cancelled++; } }),
    writeHttpMetadata(h) { h.set('Content-Type', 'application/zip'); }, ...overrides });
  const env = { DOWNLOADS: {
    async get() { calls.get++; const result = object(); if (!overrides.body) result.body = new Response('zip fixture').body; return result; },
    async head() { calls.head++; return object(); }
  }};
  global.caches = { default: {
    async match(key) { const entry = store.get(key.url); return entry && new Response(entry.bytes, entry.init); },
    async put(key, response) { const bytes = await response.arrayBuffer(); store.set(key.url, { bytes, init: { status: response.status, headers: response.headers } }); }
  }};
  const ctx = { waitUntil(p) { pending.push(p); } };
  async function request(route = name, method = 'GET', headers = {}) {
    const { default: worker } = await workerPromise;
    const response = await worker.fetch(new Request('https://download.azerty.global/' + route, { method, headers }), env, ctx);
    await Promise.all(pending.splice(0));
    return response;
  }
  return { calls, env, request, store };
}

test('download boundary and cache regressions', async t => {
  await t.test('malformed escapes return 400 without reading R2', async () => {
    const h = harness(); assert.equal((await h.request('%')).status, 400); assert.equal(h.calls.get, 0);
  });
  for (const route of ['toString', '__proto__', 'constructor', 'toString.sha256', '../secret']) {
    await t.test('only known own filenames: ' + route, async () => {
      const h = harness(); assert.equal((await h.request(route)).status, 404); assert.equal(h.calls.get, 0);
    });
  }
  await t.test('wrong size fails closed without advertising a trusted hash', async () => {
    const h = harness({ size: 42 }); const r = await h.request();
    assert.equal(r.status, 503); assert.equal(r.headers.get('X-AZERTY-Global-SHA256'), null); assert.match(r.headers.get('Cache-Control'), /no-store/); assert.equal(h.store.size, 0);
  });
  await t.test('same size with another object identity fails closed', async () => {
    const h = harness({ httpEtag: '"changed-object"' }); assert.equal((await h.request()).status, 503);
  });
  await t.test('HEAD reads metadata, never the object body', async () => {
    const h = harness(); const r = await h.request(name, 'HEAD');
    assert.equal(r.status, 200); assert.equal(await r.text(), ''); assert.equal(h.calls.get, 0); assert.equal(h.calls.head, 1);
  });
  await t.test('GET cache is shared across tracking query strings and HEAD', async () => {
    const h = harness(); const a = await h.request(name + '?utm_campaign=one');
    assert.equal(await a.text(), 'zip fixture');
    const b = await h.request(name + '?utm_campaign=two&random=123');
    assert.equal(await b.text(), 'zip fixture');
    assert.equal((await h.request(name, 'HEAD')).status, 200);
    assert.equal(h.calls.get, 1); assert.equal(h.calls.head, 0); assert.equal(h.store.size, 1);
  });
  await t.test('cache failure still serves a validated download', async () => {
    const h = harness(); global.caches.default.match = async () => { throw new Error('cache down'); };
    global.caches.default.put = async () => { throw new Error('cache down'); };
    assert.equal((await h.request()).status, 200);
  });
  await t.test('cache write can consume the stream and fail without breaking the fallback', async () => {
    const h = harness();
    global.caches.default.put = async (_key, response) => { await response.arrayBuffer(); throw new Error('cache unavailable'); };
    const r = await h.request(); assert.equal(r.status, 200); assert.equal(await r.text(), 'zip fixture'); assert.equal(h.calls.get, 2);
  });
  await t.test('cache eviction between put and match still serves a new validated stream', async () => {
    const h = harness(); global.caches.default.match = async () => undefined;
    const r = await h.request(); assert.equal(r.status, 200); assert.equal(await r.text(), 'zip fixture'); assert.equal(h.calls.get, 2);
  });
  await t.test('an object changed during cache failure is refused by the fallback', async () => {
    const h = harness();
    global.caches.default.put = async (_key, response) => { await response.arrayBuffer(); h.env.DOWNLOADS.get = async () => null; throw new Error('cache unavailable'); };
    assert.equal((await h.request()).status, 503);
  });
  await t.test('a storage outage returns a retryable, uncached response', async () => {
    const h = harness(); h.env.DOWNLOADS.get = async () => { throw new Error('internal storage detail'); };
    const r = await h.request(); assert.equal(r.status, 503); assert.doesNotMatch(await r.text(), /internal storage/);
  });
  await t.test('stable URLs do not promise immutable files for a year', async () => {
    const h = harness(); const r = await h.request(); assert.doesNotMatch(r.headers.get('Cache-Control'), /immutable|31536000/);
  });
  await t.test('analytics: one data point per OS with platform, file, country and no visitor data', async () => {
    const platforms = [
      ['AZERTY_Global_Windows.zip', 'windows', 2777269, etag],
      ['AZERTY_Global_macOS_2026.1.zip', 'macos', 1564558, '"ad1fe95e4c1e4b2c3dfe58d15d39cfec"'],
      ['AZERTY_Global_Linux.zip', 'linux', 2332632, '"5859df4e02d59be6e5e5c8dc56409f59"']
    ];
    const counter = { macos: 0, linux: 0, windows: 0 };
    for (const [file, os, size, httpEtag] of platforms) {
      const h = harness({ size, httpEtag }); const points = [];
      h.env.DOWNLOAD_STATS = { writeDataPoint: p => points.push(p) };
      const r = await h.request(file + '?utm_secret=PRIVATE_MARKER', 'GET', { 'User-Agent': 'PRIVATE_MARKER', 'CF-Connecting-IP': '203.0.113.9' });
      assert.equal(r.status, 200); await r.text();
      assert.equal(points.length, 1); counter[os] += points.length;
      assert.deepEqual(points[0].indexes, [os]);
      assert.deepEqual(points[0].blobs, [os, file, 'XX', 'download', 'miss']);
      assert.deepEqual(points[0].doubles, [1, size]);
      assert.doesNotMatch(JSON.stringify(points[0]), /PRIVATE_MARKER|203\.0\.113/);
    }
    assert.deepEqual(counter, { macos: 1, linux: 1, windows: 1 });
  });
  await t.test('analytics: HEAD is tagged download_head, cache hit recorded, errors write nothing', async () => {
    const h = harness(); const points = []; h.env.DOWNLOAD_STATS = { writeDataPoint: p => points.push(p) };
    await (await h.request(name)).text();
    await (await h.request(name)).text();
    await h.request(name, 'HEAD');
    assert.deepEqual(points.map(p => p.blobs[3] + ':' + p.blobs[4]), ['download:miss', 'download:hit', 'download_head:hit']);
    const bad = harness({ size: 42 }); const none = []; bad.env.DOWNLOAD_STATS = { writeDataPoint: p => none.push(p) };
    assert.equal((await bad.request()).status, 503); assert.equal(none.length, 0);
  });
  await t.test('analytics: missing or failing binding never breaks a download', async () => {
    assert.equal((await harness().request()).status, 200);
    const h = harness(); h.env.DOWNLOAD_STATS = { writeDataPoint() { throw new Error('AE down'); } };
    const r = await h.request(); assert.equal(r.status, 200); assert.equal(await r.text(), 'zip fixture');
  });
  await t.test('logs never retain visitor-controlled reference or tracking data', async () => {
    const h = harness(); const logs = []; const previous = console.log;
    console.log = value => logs.push(String(value));
    try { await h.request(name + '?utm_secret=PRIVATE_MARKER', 'GET', { Referer: 'https://example.org/PRIVATE_MARKER', 'User-Agent': 'PRIVATE_MARKER' }); }
    finally { console.log = previous; }
    assert.doesNotMatch(logs.join('\n'), /PRIVATE_MARKER/);
  });
});
