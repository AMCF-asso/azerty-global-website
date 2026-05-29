const http = require('http');
const fs = require('fs');
const path = require('path');

const rootArg = process.argv[2] || '.';
const port = Number(process.argv[3] || process.env.TEST_SERVER_PORT || 4173);
const host = process.env.TEST_SERVER_HOST || process.env.HOST || 'localhost';
const rootDir = path.resolve(process.cwd(), rootArg);

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function resolveRequestPath(urlPath) {
  const pathname = decodeURIComponent((urlPath || '/').split('?')[0]);
  const normalizedPath = pathname === '/' ? '/index.html' : pathname;
  const candidates = [
    path.join(rootDir, normalizedPath),
    path.join(rootDir, `${normalizedPath}.html`),
    path.join(rootDir, normalizedPath, 'index.html')
  ];

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(rootDir)) continue;
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      return resolved;
    }
  }

  return null;
}

const server = http.createServer((req, res) => {
  const filePath = resolveRequestPath(req.url);

  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store'
  });

  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Static server listening on http://${host}:${port} (root: ${rootDir})`);
});
