const FILES = {
  'AZERTY_Global_Windows.zip': {
    key: 'AZERTY_Global_Windows.zip',
    name: 'AZERTY_Global_Windows.zip',
    contentType: 'application/zip',
    sha256: 'B8334FEA205B0FDBDAEFD916413E493254C20D8CAE4E12D7C70C670E8EB6B87E',
    expectedSize: 2777269,
    expectedEtag: '"9976b8a090c50390566173d293f6615e"'
  },
  'AZERTY_Global_macOS.zip': {
    key: 'AZERTY_Global_macOS.zip',
    name: 'AZERTY_Global_macOS.zip',
    contentType: 'application/zip',
    sha256: 'E67058BB3016C0457D415EE75DF6880F36D74A301C27CABF4777D688D6C9A0F6',
    expectedSize: 1564877,
    expectedEtag: '"d54e764b563c5b914a16785b16e176d9"'
  },
  'AZERTY_Global_Linux.zip': {
    key: 'AZERTY_Global_Linux.zip',
    name: 'AZERTY_Global_Linux.zip',
    contentType: 'application/zip',
    sha256: 'AEAC603A9CFD8EB55103A0351EB0D9D7EB964F81A9576E7198B25421FA753426',
    expectedSize: 2332632,
    expectedEtag: '"5859df4e02d59be6e5e5c8dc56409f59"'
  },
  'AZERTY_Global_Entreprise.zip': {
    key: 'AZERTY_Global_Entreprise.zip',
    name: 'AZERTY_Global_Entreprise.zip',
    contentType: 'application/zip',
    sha256: '1B040DE6AE43A43E6AD0C8EABD962E18083FF084DDCB3ED19EAE8CC4F9C7BFFC',
    expectedSize: 14538829,
    expectedEtag: '"3a4724744d0abddd5e125ba93aa03c04"'
  },
  'AZERTY_Global_1.1.0.msixbundle': {
    key: 'AZERTY_Global_1.1.0.msixbundle',
    name: 'AZERTY_Global_1.1.0.msixbundle',
    contentType: 'application/msixbundle',
    sha256: '79A9C9C80CE9441272961DA20CEC3206307D26CD9BBF23AB57F9D7BE8BF6530E',
    expectedSize: 12923344,
    expectedEtag: '"1843b26c824dd69e7e7775964def330e"'
  }
};

// These public filenames are stable across releases, not immutable URLs.
const CACHE_CONTROL = 'public, max-age=300, s-maxage=86400';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: {
          Allow: 'GET, HEAD'
        }
      });
    }

    if (url.pathname === '/' || url.pathname === '') {
      return Response.redirect('https://azerty.global/download', 302);
    }

    let requested;
    try {
      requested = decodeURIComponent(url.pathname.slice(1));
    } catch {
      return errorResponse('Bad Request', 400, request.method);
    }

    if (requested.endsWith('.sha256')) {
      const name = requested.slice(0, -'.sha256'.length);
      if (Object.hasOwn(FILES, name)) {
        const file = FILES[name];
        return textResponse(`${file.sha256}  ${file.name}\n`, request.method);
      }
    }

    if (!Object.hasOwn(FILES, requested)) {
      return errorResponse('Not Found', 404, request.method);
    }
    const file = FILES[requested];

    // Tracking parameters must not create a separate cached binary per visitor.
    // A new approved SHA also isolates a new release from the previous cache.
    const cacheKey = new Request(`https://download.azerty.global/${file.name}?sha256=${file.sha256}`);
    const cache = globalThis.caches?.default;
    try {
      const cached = await cache?.match(cacheKey);
      if (cached) {
        logDownload(request, file, 'hit');
        if (request.method === 'HEAD') await cached.body?.cancel();
        return new Response(request.method === 'HEAD' ? null : cached.body, cached);
      }
    } catch {
      // Cache availability is an optimization, never a download dependency.
    }

    let response = await readDownload(env, file, request.method);
    if (cache && request.method === 'GET' && response.ok) {
      // Consume the R2 stream into the edge cache before opening the client
      // stream. Never tee/clone a binary: a slow client could otherwise queue
      // an entire file in this isolate while the cache consumes its copy.
      try {
        await cache.put(cacheKey, response);
        const cached = await cache.match(cacheKey);
        if (cached) {
          logDownload(request, file, 'miss');
          return cached;
        }
      } catch {
        // A consumed stream cannot be reused after a failed cache write/read.
      }
      if (!response.bodyUsed) await response.body?.cancel();
      response = await readDownload(env, file, request.method);
    }
    if (response.ok) logDownload(request, file, 'miss');
    return response;
  }
};

async function readDownload(env, file, method) {
    let object;
    try {
      object = method === 'HEAD'
        ? await env.DOWNLOADS.head(file.key)
        : await env.DOWNLOADS.get(file.key);
    } catch {
      console.error(JSON.stringify({ event: 'download_storage_error', file: file.name }));
      return errorResponse('File temporarily unavailable', 503, method);
    }
    // ETags pin the R2 objects whose complete SHA-256 was verified before release.
    // This checks object identity, not a fresh SHA-256 of every streamed response.
    if (!object || object.size !== file.expectedSize || object.httpEtag !== file.expectedEtag) {
      if (object?.body) await object.body.cancel();
      console.error(JSON.stringify({ event: 'download_integrity_error', file: file.name }));
      return errorResponse('File temporarily unavailable', 503, method);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Content-Type', file.contentType);
    headers.set('Content-Disposition', `attachment; filename="${file.name}"`);
    headers.set('Cache-Control', CACHE_CONTROL);
    headers.set('ETag', object.httpEtag);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Strict-Transport-Security', 'max-age=31536000');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('X-AZERTY-Global-SHA256', file.sha256);
    headers.set('Content-Length', String(object.size));

    return new Response(method === 'HEAD' ? null : object.body, {
      status: 200,
      headers
    });
}

function textResponse(body, method) {
  return new Response(method === 'HEAD' ? null : body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': CACHE_CONTROL,
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function logDownload(request, file, cache) {
  console.log(JSON.stringify({
    event: request.method === 'HEAD' ? 'download_head' : 'download',
    file: file.name,
    size: file.expectedSize,
    country: request.cf && request.cf.country ? request.cf.country : null,
    colo: request.cf && request.cf.colo ? request.cf.colo : null,
    cache
  }));
}

function errorResponse(message, status, method) {
  const headers = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
  if (status === 503) headers['Retry-After'] = '300';
  return new Response(method === 'HEAD' ? null : message, { status, headers });
}
