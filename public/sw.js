const CACHE_NAME = 'edgemind-shell-v2';

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
              (key) => key.startsWith('edgemind-shell-') && key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // WebLLM has its own Cache API. Do not duplicate 295MB of model shards in
  // the application shell cache, especially on Safari where quota is tighter.
  if (url.pathname.includes('/models/')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);

      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        if (cached) return cached;

        if (request.mode === 'navigate') {
          const shellUrl = new URL('./', self.registration.scope).toString();
          const shell = await cache.match(shellUrl);
          if (shell) return shell;
        }

        return new Response('离线内容尚未缓存', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })
  );
});
