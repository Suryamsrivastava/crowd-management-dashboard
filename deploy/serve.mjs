// Minimal zero-dependency static server for the built app (dist/).
// - Serves files from dist/ with long-term caching for hashed assets
// - Falls back to index.html for client-side routes (/entries, /login, ...)
// Usage: node deploy/serve.mjs   (PORT env var, default 8090)

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const PORT = Number(process.env.PORT) || 8090;
const HOST = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

async function fileIfExists(path) {
  try {
    const s = await stat(path);
    return s.isFile() ? s : null;
  } catch {
    return null;
  }
}

function send(res, status, path, size, cache) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream',
    'Content-Length': size,
    'Cache-Control': cache,
  });
  createReadStream(path).pipe(res);
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }

  // Resolve inside dist/ only (blocks ../ traversal)
  const target = normalize(join(ROOT, pathname));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) {
    res.writeHead(403).end();
    return;
  }

  const file = await fileIfExists(target);
  if (file) {
    const immutable = pathname.startsWith('/assets/');
    const cache = immutable ? 'public, max-age=31536000, immutable' : 'no-cache';
    if (req.method === 'HEAD') {
      res
        .writeHead(200, {
          ...SECURITY_HEADERS,
          'Content-Type': TYPES[extname(target).toLowerCase()] || 'application/octet-stream',
          'Content-Length': file.size,
          'Cache-Control': cache,
        })
        .end();
      return;
    }
    send(res, 200, target, file.size, cache);
    return;
  }

  // Missing asset files are real 404s; anything else is an app route
  if (extname(pathname)) {
    res.writeHead(404, SECURITY_HEADERS).end('Not found');
    return;
  }

  const index = join(ROOT, 'index.html');
  const indexStat = await fileIfExists(index);
  if (!indexStat) {
    res.writeHead(500).end('dist/index.html missing - run "npm run build" first');
    return;
  }
  send(res, 200, index, indexStat.size, 'no-cache');
});

server.listen(PORT, HOST, () => {
  console.log(`[${new Date().toISOString()}] Crowd dashboard serving ${ROOT} on http://${HOST}:${PORT}`);
});
