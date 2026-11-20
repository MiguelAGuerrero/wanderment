// Serves the web build the way GitHub Pages does: under /wanderment/, with 404.html as the
// fallback for unknown paths (that's how deep links work there).
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'dist');
const base = '/wanderment';
const port = Number(process.env.PORT ?? 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
};

function send(res, status, file) {
  res.writeHead(status, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
  createReadStream(file).pipe(res);
}

// Tests can simulate a new deploy: after POST /__e2e/bump-sw, sw.js changes by a comment.
let swBuild = 0;

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/__e2e/bump-sw') {
    swBuild += 1;
    return res.end(String(swBuild));
  }
  if (path === `${base}/sw.js` && swBuild > 0) {
    res.writeHead(200, { 'Content-Type': types['.js'], 'Cache-Control': 'no-cache' });
    return res.end(`${readFileSync(join(root, 'sw.js'), 'utf8')}\n// e2e build ${swBuild}\n`);
  }
  if (path === '/' || path === base) {
    res.writeHead(302, { Location: `${base}/` });
    return res.end();
  }
  if (!path.startsWith(`${base}/`)) {
    res.writeHead(404);
    return res.end('Not found');
  }
  let file = normalize(join(root, path.slice(base.length)));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    return res.end();
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (existsSync(file)) return send(res, 200, file);
  return send(res, 404, join(root, '404.html'));
}).listen(port, () => console.log(`Serving dist at http://localhost:${port}${base}/`));
