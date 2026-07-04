const FILE = {
  key: 'AZERTY_Global_1.0.0.msixbundle',
  name: 'AZERTY_Global_1.0.0.msixbundle',
  contentType: 'application/msixbundle',
  sha256: '3E6C88C7617F719915F876BC21745C0A2D85D3AA1C71BA0775A8C181E392B92C',
  expectedSize: 12790566
};

const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const DOWNLOAD_URL = `https://download.azerty.global/${FILE.name}`;

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

    if (url.pathname === `/${FILE.name}.sha256`) {
      return textResponse(`${FILE.sha256}  ${FILE.name}\n`, request.method);
    }

    if (url.pathname !== `/${FILE.name}`) {
      return new Response('Not Found', { status: 404 });
    }

    const object = await env.DOWNLOADS.get(FILE.key);
    if (!object) {
      console.error(JSON.stringify({
        event: 'download_msix_missing',
        key: FILE.key,
        url: DOWNLOAD_URL
      }));
      return new Response('File temporarily unavailable', {
        status: 503,
        headers: {
          'Retry-After': '300',
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }

    ctx.waitUntil(logDownload(request, url, object));

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Content-Type', FILE.contentType);
    headers.set('Content-Disposition', `attachment; filename="${FILE.name}"`);
    headers.set('Cache-Control', CACHE_CONTROL);
    headers.set('ETag', object.httpEtag);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-AZERTY-Global-SHA256', FILE.sha256);
    headers.set('Content-Length', String(object.size));

    if (object.size !== FILE.expectedSize) {
      headers.set('X-AZERTY-Global-Expected-Size', String(FILE.expectedSize));
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

async function logDownload(request, url, object) {
  const utm = {};
  for (const [key, value] of url.searchParams) {
    if (key.startsWith('utm_')) utm[key] = value;
  }

  console.log(JSON.stringify({
    event: request.method === 'HEAD' ? 'download_msix_head' : 'download_msix',
    file: FILE.name,
    size: object.size,
    country: request.cf && request.cf.country ? request.cf.country : null,
    colo: request.cf && request.cf.colo ? request.cf.colo : null,
    referer: request.headers.get('Referer'),
    userAgent: request.headers.get('User-Agent'),
    utm
  }));
}
