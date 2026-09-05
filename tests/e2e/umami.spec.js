const { test, expect } = require('@playwright/test');

async function isolate(context, request, baseURL, enabled) {
  const sent = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'cloud.umami.is' && url.pathname === '/script.js') {
      return route.fulfill({ contentType: 'application/javascript', body: `
        const website = document.currentScript.getAttribute('data-website-id');
        window.umami = { track(name) {
          const payload = window.umamiBeforeSend('event', { website, name });
          if (!payload) return Promise.resolve();
          return fetch('https://gateway.umami.is/api/send', { method:'POST', keepalive:true,
            headers:{'content-type':'application/json'}, body:JSON.stringify({type:'event',payload}) });
        }};
      ` });
    }
    if (url.hostname === 'gateway.umami.is') {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: {
        'access-control-allow-origin': 'https://azerty.global', 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type'
      } });
      sent.push(route.request().postDataJSON());
      return route.fulfill({ json: {}, headers: { 'access-control-allow-origin': 'https://azerty.global' } });
    }
    if (url.hostname === 'azerty.global') {
      const response = await request.get(baseURL + url.pathname + url.search);
      if (enabled && response.headers()['content-type']?.includes('text/html')) {
        const body = (await response.text()).replace('data-umami-enabled="false"', 'data-umami-enabled="true"');
        return route.fulfill({ response, body });
      }
      return route.fulfill({ response });
    }
    // Existing analytics and external destinations are isolated, including popups.
    return route.fulfill({ contentType: url.pathname.endsWith('.js') || url.hostname === 'www.googletagmanager.com' ? 'application/javascript' : 'text/html', body: '' });
  });
  return sent;
}

test('committed AZERTY gate loads no paid tracker', async ({ page, context, request, baseURL }) => {
  const sent = await isolate(context, request, baseURL, false);
  await page.goto('https://azerty.global/download');
  await page.locator('#tab-windows').click();
  await expect(page.locator('script[src="/js/umami-tracking.js"]')).toHaveCount(1);
  await page.locator('#btn-download-store').click();
  expect(sent).toEqual([]);
  await expect(page.locator('script[src="https://cloud.umami.is/script.js"]')).toHaveCount(0);
});

for (const path of ['/download', '/en/download']) {
  test(`${path}: one visit and one download with the enabled intercepted fixture`, async ({ page, context, request, baseURL }) => {
    const sent = await isolate(context, request, baseURL, true);
    await page.goto(`https://azerty.global${path}`);
    await page.locator('#tab-windows').click();
    await expect.poll(() => sent.length).toBe(1);
    await page.locator('#btn-download-store').click();
    await expect.poll(() => sent.length).toBe(2);
    expect(sent[1].payload.name).toBe('download_windows_microsoft_store');
    expect(sent[1].payload.data).toBeUndefined();
    await page.locator('#btn-download-store').click();
    expect(sent).toHaveLength(2);
  });
}
