/* ============================================
   TANKFUL — Service Worker
   - Caches the app shell (HTML, CSS, JS, icons) so the dashboard
     loads instantly and works offline once installed.
   - Network-first for the scraped data files (lake-country-prices /
     lake-country-history) so users always see the freshest cron run
     when they have a connection, but fall back to the cached copy
     when offline.
   - Cache-first for everything else (the shell, fonts, ApexCharts).
   ============================================ */

const VERSION = 'v1';
const CACHE_NAME = `tankful-${VERSION}`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/cheatsheet.html',
  '/manifest.webmanifest',
  '/css/styles.css',
  '/css/print.css',
  '/js/config.js',
  '/js/holidays.js',
  '/js/location.js',
  '/js/mock-data.js',
  '/js/live-data.js',
  '/js/score.js',
  '/js/chart-config.js',
  '/js/app.js',
  '/assets/favicon.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/apple-touch-icon.png'
];

// ---------- install: warm up the shell cache ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll fails atomically if any single asset 404s, which would block
      // updates indefinitely. Add each asset individually and swallow errors
      // — anything that misses will be fetched fresh on first request.
      Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[sw] skip caching', url, err && err.message);
          })
        )
      )
    )
  );
  // Activate the new worker immediately rather than waiting for tabs to close.
  self.skipWaiting();
});

// ---------- activate: prune old cache versions ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('tankful-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ---------- fetch: routing strategy ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Same-origin /data/* — always try the network so the dashboard reflects
  // the latest cron commit; fall back to cache if offline.
  if (url.origin === self.location.origin && url.pathname.startsWith('/data/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Everything else (shell, fonts, ApexCharts CDN): cache-first with a
  // network fallback that warms the cache for next time.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            // Only cache successful, same-origin or CORS-OK responses.
            if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached)
    )
  );
});

// ---------- message: allow the page to trigger an immediate update ----------
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

// ---------- push: fetch fresh data + show notification ----------
// The Worker sends empty pushes (no encrypted payload) — we pull the
// current prices JSON here so the notification text reflects whatever
// the cron just committed, not whatever was scored when the push fired.
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let title = 'Tankful';
    let body = 'Time to fill up — check the dashboard for details.';
    try {
      const res = await fetch('/data/lake-country-prices.json?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.stations) && data.stations.length) {
          // Find the absolute cheapest pump-posted price (we don't have card
          // overlays in the JSON, just posted prices).
          const sorted = data.stations.slice().sort((a, b) => a.price - b.price);
          const top = sorted[0];
          const market = data.marketAverage;
          if (top && typeof market === 'number') {
            const spread = (market - top.price).toFixed(1);
            title = 'Tankful — Fill Up Now';
            body = `${top.name}: ${top.price.toFixed(1)}¢/L (${spread}¢ below market). Tap to open.`;
          } else if (top) {
            title = 'Tankful — Fill Up Now';
            body = `${top.name}: ${top.price.toFixed(1)}¢/L. Tap to open.`;
          }
        }
      }
    } catch (e) {
      // Fall through to generic message.
    }
    await self.registration.showNotification(title, {
      body,
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      tag: 'tankful-fill-alert',
      renotify: true,
      data: { url: '/' }
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) { await c.focus(); return; }
    }
    await self.clients.openWindow(target);
  })());
});
