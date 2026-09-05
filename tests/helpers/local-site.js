const fs = require('fs');
const path = require('path');
const { test: base, expect } = require('@playwright/test');

const headersFile = path.resolve(__dirname, '../../_headers');
const csp = fs.readFileSync(headersFile, 'utf8').match(/^\s+Content-Security-Policy:\s*(.+)$/m)?.[1];
if (!csp) throw new Error('Local site fixture requires the real Content-Security-Policy from _headers.');

// These are transport stubs, never live integrations. No route may fetch an
// external URL, including redirects, forms, downloads, analytics or popups.
const test = base.extend({
  serviceWorkers: 'block',
  network: [async ({ context, baseURL }, use) => {
    const origin = new URL(baseURL).origin;
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname)) {
      throw new Error(`Local site tests require a loopback baseURL, received ${origin}`);
    }

    let web3FormsResponse = { status: 200, body: { success: true, message: 'Local test response' } };
    let closingContext = false;
    let contextClosed = false;
    const pendingRoutes = new Set();
    context.on('close', () => { contextClosed = true; });
    const network = {
      externalRequests: [],
      web3FormsRequests: [],
      consoleErrors: [],
      pageErrors: [],
      cspViolations: [],
      cancelledAtClose: [],
      setWeb3FormsResponse(response) { web3FormsResponse = response; },
      failWeb3FormsNetwork() { web3FormsResponse = { networkFailure: true }; }
    };

    context.on('page', page => {
      page.on('console', message => {
        if (message.type() === 'error') network.consoleErrors.push({ text: message.text(), ...message.location() });
      });
      page.on('pageerror', error => network.pageErrors.push(error.message));
    });
    await context.exposeBinding('__recordLocalCspViolation', (_source, violation) => {
      network.cspViolations.push(violation);
    });
    await context.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', event => {
        window.__recordLocalCspViolation({
          directive: event.effectiveDirective,
          blockedURI: event.blockedURI,
          sourceFile: event.sourceFile,
          lineNumber: event.lineNumber
        });
      });
    });
    await context.routeWebSocket('**/*', socket => socket.close());
    async function handleRoute(route) {
      const request = route.request();
      let url = new URL(request.url());
      const entry = { url: url.href, method: request.method(), resourceType: request.resourceType() };

      if (url.origin === origin && ['GET', 'HEAD'].includes(request.method())) {
        // The audited static server intentionally remains unchanged. Reproduce
        // Cloudflare's CSP on documents, with no remote redirect following.
        let response;
        for (let redirects = 0; redirects < 10; redirects++) {
          response = await route.fetch({ url: url.href, maxRedirects: 0 });
          const location = response.headers().location;
          if (response.status() < 300 || response.status() >= 400 || !location) break;
          url = new URL(location, url);
          if (url.origin !== origin) break;
          if (redirects === 9) throw new Error('Too many local redirects in test fixture');
        }
        // A subresource redirect can bypass a second Playwright route callback.
        // Inspect it here before fulfillment; every external target is stubbed.
        if (url.origin === origin) {
          if (request.resourceType() !== 'document') return route.fulfill({ response });
          const headers = { ...response.headers(), 'content-security-policy': csp, 'x-dns-prefetch-control': 'off' };
          if (!(headers['content-type'] || '').includes('text/html')) return route.fulfill({ response, headers });
          // Resource hints can establish connections without a routable HTTP
          // request. Strip only those hints; keep JSON-LD and all real scripts.
          const body = (await response.text()).replace(/<link\b(?=[^>]*\brel\s*=\s*["'](?:preconnect|dns-prefetch)["'])[^>]*>/gi, '');
          delete headers['content-length'];
          return route.fulfill({ response, headers, body });
        }
      }

      if (url.origin !== origin) network.externalRequests.push({ ...entry, url: url.href });
      const corsHeaders = { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': '*' };
      if (url.hostname === 'api.web3forms.com') {
        network.web3FormsRequests.push(entry);
        if (web3FormsResponse.networkFailure) return route.abort('failed');
        return route.fulfill({ status: web3FormsResponse.status || 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(web3FormsResponse.body ?? { success: true }) });
      }
      switch (request.resourceType()) {
        case 'script':
          return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/javascript', body: '/* External script intercepted by local test fixture. */' });
        case 'stylesheet':
          return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'text/css', body: '/* External stylesheet intercepted by local test fixture. */' });
        case 'image':
          return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') });
        case 'document':
          return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'text/html', body: '<!doctype html><title>External content intercepted locally</title>' });
        default:
          return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      }
    }

    await context.route('**/*', async route => {
      const request = route.request();
      let sourcePage;
      try { sourcePage = request.frame().page(); } catch (_) {
        // The frame of an initial navigation may not exist yet. Only context
        // closure can authorize ignoring an error for such a request.
      }
      const pending = handleRoute(route).catch(error => {
        const cancelled = /Target (?:page, context or browser|page|context|browser) has been closed|Request context disposed|Request was aborted|net::ERR_ABORTED/i.test(error.message || '');
        if (cancelled && (sourcePage?.isClosed() || closingContext || contextClosed)) {
          network.cancelledAtClose.push({ url: request.url(), method: request.method() });
          return;
        }
        throw error;
      });
      pendingRoutes.add(pending);
      try { await pending; } finally { pendingRoutes.delete(pending); }
    });

    try {
      await use(network);
    } finally {
      // Keep interception installed through closure; removing routes first could
      // let a late analytics request reach the network. Never ignore all errors.
      closingContext = true;
      await context.close();
      await Promise.all([...pendingRoutes]);
    }
  }, { auto: true }]
});

module.exports = { test, expect };
