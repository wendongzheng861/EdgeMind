import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const workerDirectory = resolve('dist/server');
const workerFile = resolve(workerDirectory, 'index.js');

const workerSource = `export default {
  async fetch(request, env) {
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404 || request.method !== 'GET') {
      return assetResponse;
    }

    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    if (!acceptsHtml) {
      return assetResponse;
    }

    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
  },
};
`;

await mkdir(workerDirectory, { recursive: true });
await writeFile(workerFile, workerSource, 'utf8');
console.log('Prepared the static Sites worker.');
