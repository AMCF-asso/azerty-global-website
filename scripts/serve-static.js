const http = require('http');
const fs = require('fs');
const path = require('path');

const rootArg = process.argv[2] || '.';
const port = Number(process.argv[3] || process.env.TEST_SERVER_PORT || 4173);
const host = process.env.TEST_SERVER_HOST || '127.0.0.1';
const rootDir = fs.realpathSync(path.resolve(process.cwd(), rootArg));

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
    const relative = path.relative(rootDir, resolved);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) continue;
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      const actual = fs.realpathSync(resolved);
      const actualRelative = path.relative(rootDir, actual);
      if (actualRelative === '..' || actualRelative.startsWith(`..${path.sep}`) || path.isAbsolute(actualRelative)) continue;
      return actual;
    }
  }

  return null;
}

const server = http.createServer((req, res) => {
  let filePath;
  try {
    filePath = resolveRequestPath(req.url);
  } catch (error) {
    res.writeHead(error instanceof URIError ? 400 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(error instanceof URIError ? 'Bad request' : 'Internal server error');
    return;
  }

  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

  const stream = fs.createReadStream(filePath);
  stream.once('open', () => {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    });
    stream.pipe(res);
  });
  stream.on('error', (error) => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(error.code === 'ENOENT' ? 'Not found' : 'Internal server error');
  });
  res.on('close', () => stream.destroy());
});

server.listen(port, host, () => {
  console.log(`Static server listening on http://${host}:${port} (root: ${rootDir})`);
});
