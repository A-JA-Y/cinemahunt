/* CinemaHunt service worker.
 *
 * Deliberately conservative about what it keeps:
 *
 *   - /api/* is NEVER cached. Those responses are built from the viewer's region,
 *     their Firebase session and live AI output; a stale one would be wrong, and
 *     caching them would leave personal results sitting in the cache store.
 *   - Navigations are network-first, falling back to the cache and then to the
 *     offline page, so a flaky connection degrades instead of failing.
 *   - Build assets and images are cache-first, since Next fingerprints them and
 *     poster URLs are immutable.
 *
 * Bumping VERSION retires every old cache on the next activate.
 */

const VERSION = 'v1';
const SHELL = `ch-shell-${VERSION}`;
const ASSETS = `ch-assets-${VERSION}`;
const IMAGES = `ch-images-${VERSION}`;

const OFFLINE_URL = '/offline';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png'];

const MAX_IMAGES = 80;

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // Individually, so one 404 can't fail the whole install.
      await Promise.all(
        PRECACHE.map(url => cache.add(url).catch(() => {}))
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, ASSETS, IMAGES]);
      const names = await caches.keys();
      await Promise.all(names.filter(name => !keep.has(name)).map(name => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only our own origin. Cross-origin posters are handled by the HTTP cache, and
  // Firebase/Groq traffic must never be intercepted.
  if (url.origin !== self.location.origin) return;

  // Never cache API responses — they are personal, keyed and time-sensitive.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, ASSETS));
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGES, MAX_IMAGES));
  }
});

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    // Keep the last good copy of each page for an offline revisit.
    if (response.ok) {
      const cache = await caches.open(SHELL);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;

    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Opaque responses report status 0 and would poison the cache with errors.
    if (response.ok) {
      await cache.put(request, response.clone());
      if (limit) trim(cache, limit);
    }
    return response;
  } catch {
    return cached ?? Response.error();
  }
}

/** Rough FIFO cap so the image cache cannot grow without bound. */
async function trim(cache, limit) {
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  for (const key of keys.slice(0, keys.length - limit)) await cache.delete(key);
}
