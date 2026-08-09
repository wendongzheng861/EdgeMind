const CACHE_NAME = 'edgemind-shell-v5';
const SHELL_CACHE_PREFIX = 'edgemind-shell-';

const MODEL_PATH_MARKERS = [
  '/models/',
  '/model-parts/',
  '/public/models/',
  '/cdn/model-parts/',
];

const WEBLLM_RUNTIME_PACKAGES = [
  '@mlc-ai/web-llm',
  '@mlc-ai/web-runtime',
  '@mlc-ai/web-tokenizers',
  '@mlc-ai/web-xgrammar',
  'loglevel',
];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(SHELL_CACHE_PREFIX) && key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );
});

self.addEventListener('message', (event) => {
  if (
    event.data?.type === 'EDGEMIND_VERSION' &&
    event.ports &&
    event.ports[0]
  ) {
    event.ports[0].postMessage({ cacheName: CACHE_NAME });
  }
});

function isModelData(url) {
  return MODEL_PATH_MARKERS.some((marker) => url.pathname.includes(marker));
}

function isWebLlmRuntimeCdn(url) {
  if (url.protocol !== 'https:' || url.hostname !== 'cdn.jsdelivr.net') {
    return false;
  }

  if (isModelData(url) || url.pathname.startsWith('/gh/')) {
    return false;
  }

  return WEBLLM_RUNTIME_PACKAGES.some((packageName) => {
    const packagePath = `/npm/${packageName}`;
    return (
      url.pathname === packagePath ||
      url.pathname.startsWith(`${packagePath}@`) ||
      url.pathname.startsWith(`${packagePath}/`)
    );
  });
}

function canCacheResponse(response, sameOrigin) {
  if (!response.ok) return false;
  return sameOrigin
    ? response.type === 'basic'
    : response.type === 'cors' || response.type === 'default';
}

async function matchNavigationFallback(cache, requestUrl) {
  const scopeUrl = new URL(self.registration.scope);
  const scopePath = scopeUrl.pathname.endsWith('/')
    ? scopeUrl.pathname
    : `${scopeUrl.pathname}/`;
  const mobilePath = `${scopePath}mobile`;
  const isMobileNavigation =
    requestUrl.pathname === mobilePath ||
    requestUrl.pathname.startsWith(`${mobilePath}/`);

  const candidates = [];

  if (isMobileNavigation) {
    candidates.push(
      new URL('mobile/index.html', scopeUrl).toString(),
      new URL('mobile/', scopeUrl).toString(),
      new URL('mobile', scopeUrl).toString()
    );
  }

  if (requestUrl.pathname.endsWith('/')) {
    candidates.push(
      new URL(`${requestUrl.pathname}index.html`, requestUrl.origin).toString()
    );
  }

  if (!isMobileNavigation) {
    candidates.push(
      scopeUrl.toString(),
      new URL('index.html', scopeUrl).toString()
    );
  }

  for (const candidate of candidates) {
    const cached = await cache.match(candidate, { ignoreSearch: true });
    if (cached) return cached;
  }

  return undefined;
}

async function networkFirst(request, requestUrl, sameOrigin) {
  const cache = await caches.open(CACHE_NAME);
  const cacheRequest =
    sameOrigin && request.mode === 'navigate'
      ? new Request(
          (() => {
            const canonicalUrl = new URL(request.url);
            canonicalUrl.search = '';
            canonicalUrl.hash = '';
            return canonicalUrl.toString();
          })()
        )
      : request;
  const cached = await cache.match(cacheRequest);

  try {
    const response = await fetch(request);

    if (canCacheResponse(response, sameOrigin)) {
      try {
        await cache.put(cacheRequest, response.clone());
      } catch {
        // A quota or transient Cache API failure must not hide a successful
        // network response from the user.
      }
    }

    return response;
  } catch {
    if (cached) return cached;

    if (sameOrigin && request.mode === 'navigate') {
      const fallback = await matchNavigationFallback(cache, requestUrl);
      if (fallback) return fallback;
    }

    return new Response('离线内容尚未缓存，请联网打开一次后重试。', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function cacheFirst(request) {
  // The mobile bootstrap uses no-store while it streams real byte progress and
  // writes the runtime itself. Avoid a second concurrent Cache API write.
  if (request.cache === 'no-store') return fetch(request);

  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (canCacheResponse(response, false)) {
    try {
      await cache.put(request, response.clone());
    } catch {
      // The runtime can still execute from the network when storage is full.
    }
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // WebLLM writes model artifacts to its own Cache API namespaces. Leaving all
  // model URLs untouched avoids a second ~295 MB copy in Safari's shell cache.
  if (isModelData(url)) return;

  if (!sameOrigin && !isWebLlmRuntimeCdn(url)) return;

  if (!sameOrigin) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request, url, sameOrigin));
});
