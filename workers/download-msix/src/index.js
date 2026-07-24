const FILES = {
  'AZERTY_Global_Entreprise.zip': {
    key: 'AZERTY_Global_Entreprise.zip',
    name: 'AZERTY_Global_Entreprise.zip',
    contentType: 'application/zip',
    sha256: '1B040DE6AE43A43E6AD0C8EABD962E18083FF084DDCB3ED19EAE8CC4F9C7BFFC',
    expectedSize: 14538829
  },
  'AZERTY_Global_1.1.0.msixbundle': {
    key: 'AZERTY_Global_1.1.0.msixbundle',
    name: 'AZERTY_Global_1.1.0.msixbundle',
    contentType: 'application/msixbundle',
    sha256: '79A9C9C80CE9441272961DA20CEC3206307D26CD9BBF23AB57F9D7BE8BF6530E',
    expectedSize: 12923344
  }
};

const CACHE_CONTROL = 'public, max-age=31536000, immutable';

export default {
  async fetch(request, env, ctx) {
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

    const requested = decodeURIComponent(url.pathname.slice(1));

    if (requested.endsWith('.sha256')) {
      const file = FILES[requested.slice(0, -'.sha256'.length)];
      if (file) {
        return textResponse(`${file.sha256}  ${file.name}\n`, request.method);
      }
    }

    const file = FILES[requested];
    if (!file) {
      return new Response('Not Found', { status: 404 });
    }

    const object = await env.DOWNLOADS.get(file.key);
    if (!object) {
      console.error(JSON.stringify({
        event: 'download_missing',
        key: file.key
      }));
      return new Response('File temporarily unavailable', {
        status: 503,
        headers: {
          'Retry-After': '300',
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }

    ctx.waitUntil(logDownload(request, url, object, file));

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Content-Type', file.contentType);
    headers.set('Content-Disposition', `attachment; filename="${file.name}"`);
    headers.set('Cache-Control', CACHE_CONTROL);
    headers.set('ETag', object.httpEtag);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-AZERTY-Global-SHA256', file.sha256);
    headers.set('Content-Length', String(object.size));

    if (object.size !== file.expectedSize) {
      headers.set('X-AZERTY-Global-Expected-Size', String(file.expectedSize));
    }

    return new Response(request.method === 'HEAD' ? null : object.body, {
      status: 200,
      headers
    });
  }
};

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

async function logDownload(request, url, object, file) {
  const utm = {};
  for (const [key, value] of url.searchParams) {
    if (key.startsWith('utm_')) utm[key] = value;
  }

  console.log(JSON.stringify({
    event: request.method === 'HEAD' ? 'download_head' : 'download',
    file: file.name,
    size: object.size,
    country: request.cf && request.cf.country ? request.cf.country : null,
    colo: request.cf && request.cf.colo ? request.cf.colo : null,
    referer: request.headers.get('Referer'),
    userAgent: request.headers.get('User-Agent'),
    utm
  }));
}
