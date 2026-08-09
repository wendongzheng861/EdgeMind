import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mobilePath = path.join(projectRoot, 'public', 'mobile', 'index.html');
const manifestPath = path.join(
  projectRoot,
  'cdn',
  'model-parts',
  'qwen2.5-0.5b',
  'manifest.json'
);
const partDirectory = path.dirname(manifestPath);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const html = fs.readFileSync(mobilePath, 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert(scripts.length === 1, `Expected one inline script, found ${scripts.length}`);
assert(Buffer.byteLength(html) < 75_000, 'Mobile bootstrap exceeded the 75 KB budget');
new Function(scripts[0][1]);

const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
const referencedIds = [
  ...scripts[0][1].matchAll(/getElementById\('([^']+)'\)/g),
].map((match) => match[1]);
const missingIds = referencedIds.filter((id) => !ids.has(id));
assert(missingIds.length === 0, `Missing DOM IDs: ${missingIds.join(', ')}`);

assert(
  html.includes('edgemind-model-v1') && html.includes('@mlc-ai/web-llm@0.2.84'),
  'The mobile page must pin both model and runtime versions'
);
assert(
  html.includes('6065527') &&
    html.includes('d1ecb2579991ee53fa4f00e2f1b76841419d7b2d48f64c7cdf23968a72f2eba5'),
  'The decoded WebLLM runtime size and SHA-256 must stay pinned'
);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(manifest.version === 1, 'Unexpected model manifest version');
assert(manifest.shards.length === 8, 'Expected eight model shards');

let totalBytes = 0;
let partCount = 0;
for (const shard of manifest.shards) {
  let shardBytes = 0;
  const shardHash = createHash('sha256');
  shard.parts.forEach((expectedSize, index) => {
    const partName = `${shard.name}.part${String(index).padStart(3, '0')}`;
    const partPath = path.join(partDirectory, partName);
    assert(fs.existsSync(partPath), `Missing model part: ${partName}`);
    const actualSize = fs.statSync(partPath).size;
    assert(
      actualSize === expectedSize,
      `${partName} is ${actualSize} bytes; expected ${expectedSize}`
    );
    assert(actualSize <= 8 * 1024 * 1024, `${partName} exceeds 8 MiB`);
    shardHash.update(fs.readFileSync(partPath));
    shardBytes += actualSize;
    partCount += 1;
  });
  assert(shardBytes === shard.size, `${shard.name} byte total does not match`);
  assert(
    shardHash.digest('hex') === shard.sha256,
    `${shard.name} SHA-256 does not match`
  );
  totalBytes += shardBytes;
}
assert(totalBytes === manifest.totalBytes, 'Manifest total byte count does not match');

const serviceWorker = fs.readFileSync(path.join(projectRoot, 'public', 'sw.js'), 'utf8');
new Function(serviceWorker);
assert(serviceWorker.includes('edgemind-shell-v5'), 'Service worker cache version is stale');
assert(html.includes('edgemind-shell-v5'), 'Mobile page and Service Worker cache versions differ');
assert(
  serviceWorker.includes("canonicalUrl.search = ''") &&
    serviceWorker.includes('if (isModelData(url)) return;') &&
    html.includes('x-edgemind-shell') &&
    html.includes('waitForServiceWorkerControl') &&
    serviceWorker.includes("event.data?.type === 'EDGEMIND_VERSION'"),
  'Service worker must control runtime imports, cache a root redirect, canonicalize navigations, and bypass model data'
);

const rootHtml = fs.readFileSync(path.join(projectRoot, 'app', '+html.tsx'), 'utf8');
const webManifest = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'public', 'manifest.json'), 'utf8')
);
assert(rootHtml.includes("'/mobile/'"), 'Root HTML is missing the early mobile redirect');
assert(
  webManifest.start_url === '/EdgeMind/mobile/' && webManifest.scope === '/EdgeMind/',
  'PWA manifest must start inside the GitHub Pages mobile scope'
);

console.log(`Mobile HTML: ${Buffer.byteLength(html)} bytes; inline JavaScript parses`);
console.log(`DOM references: ${referencedIds.length}; all IDs exist`);
console.log(`Model parts: ${partCount}; ${totalBytes} bytes; manifest matches disk`);
console.log('Service worker: JavaScript parses; shell cache v5');
console.log('Mobile wiring: early redirect, root offline redirect, and PWA scope verified');
