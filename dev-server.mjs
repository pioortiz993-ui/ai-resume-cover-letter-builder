// Dependency-free local server for the same frontend and Worker route used by the Site.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from './dist/server/index.js';

const root = dirname(fileURLToPath(import.meta.url));
const assetRoot = join(root, 'dist', 'client');
const port = Number(process.env.PORT || 5173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

try {
  const contents = await readFile(join(root, '.env'), 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

async function serveAsset(request) {
  const url = new URL(request.url);
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return new Response('Invalid path', { status: 400 }); }
  const file = resolve(assetRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
  const rel = relative(assetRoot, file);
  if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const content = await readFile(file);
    return new Response(content, { headers: { 'content-type': types[extname(file)] || 'application/octet-stream' } });
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') return new Response('Not found', { status: 404 });
    throw error;
  }
}

createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size > 30000) { outgoing.writeHead(413); outgoing.end('Input too long'); return; }
      chunks.push(chunk);
    }
    const request = new Request(`http://localhost:${port}${incoming.url}`, {
      method: incoming.method,
      headers: incoming.headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined
    });
    const response = await worker.fetch(request, {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      ASSETS: { fetch: serveAsset }
    });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Local server error:', error);
    outgoing.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    outgoing.end('The local server encountered an error.');
  }
}).listen(port, () => console.log(`Open http://localhost:${port} in your browser.`));
