import { access, mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const distDirectory = resolve('dist');
const clientDirectory = resolve(distDirectory, 'client');
const workerDirectory = resolve('dist/server');
const workerFile = resolve(workerDirectory, 'index.js');

await access(resolve(distDirectory, 'index.html'));
await rm(clientDirectory, { recursive: true, force: true });
await mkdir(clientDirectory, { recursive: true });

const entries = await readdir(distDirectory);
for (const entry of entries) {
  if (entry === 'client' || entry === 'server') continue;
  await rename(resolve(distDirectory, entry), resolve(clientDirectory, entry));
}

const workerSource = `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    if (response.status !== 404 || !acceptsHtml || !['GET', 'HEAD'].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = '/index.html';
    indexUrl.search = '';
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
`;

await mkdir(workerDirectory, { recursive: true });
await writeFile(workerFile, workerSource, 'utf8');
console.log('Prepared the static Sites worker.');
