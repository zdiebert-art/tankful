/* ============================================
   TANKFUL — Service Worker
   Strategy:
   - Network-first for the app shell (HTML, CSS, JS) so updates roll
     out the moment the user has a connection. Cache is the offline
     fallback only.
   - Network-first for /data/* (cron-committed prices JSON) so the
     dashboard always reflects the freshest run.
   - Cache-first for binary assets (icons, station-logos, favicon)
     since they rarely change and benefit from instant loads.
   On every deploy, bump VERSION (or have CI bump it for you) — the
   activate step purges old caches and claims open tabs, then posts a
   message to clients so the page can reload itself.
   ============================================ */

// Auto-bumped by .github/workflows/bump-sw-version.yml on every push that
// touches the shell. The string between the markers is replaced with the
// short commit SHA; manual edits there will be overwritten by CI.
const VERSION = 'v2-e4628e6';
const CACHE_NAME = `tankful-${VERSION}`;

// Files we want to pre-warm on install so the dashboard's first frame is
// instant on offline reloads. Network-first means these get refreshed
// every visit when online — the pre-cache is just an offline backstop.
const SHELL_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/css/styles.css',
  '/js/app.js',
  '/assets/favicon.svg',
  '/assets/icons/icon-192.png'
];

// ---------- install: warm up the shell cache ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        SHELL_PRECACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[sw] skip caching', url, err && err.message);
          })
        )
      )
    )
  );
  // Activate immediately — paired with the page-side controllerchange
  // listener this means updates apply without users having to close the tab.
  self.skipWaiting();
});

// ---------- activate: prune old cache versions, claim open clients ----------
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith('tankful-') && k !== CACHE_NAME)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
    // Tell every open client that a fresh SW is now in charge so the page
    // can do a one-time reload to pick up the new shell.
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((c) => c.postMessage({ type: 'sw-updated', version: VERSION }));
  })());
});

// ---------- helpers ----------
const STATIC_BINARY_PREFIXES = ['/assets/icons/', '/assets/station-logos/'];
function isStaticBinary(pathname) {
  if (STATIC_BINARY_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return /\.(png|jpe?g|webp|ico|gif|woff2?|ttf|otf)$/i.test(pathname);
}

// Network-first: fetch, cache on success, fall back to cache on failure.
async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
    }
    return res;
  } catch (e) {
    const cached = await caches.match(req);
    if (cached) return cached;
    throw e;
  }
}

// Cache-first: serve cache, otherwise fetch + cache.
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
    const copy = res.clone();
    caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
}

// ---------- fetch: pick the strategy ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only handle same-origin and a small list of CDN allowlists.
  const isSameOrigin = url.origin === self.location.origin;
  const isCdn =
    url.host === 'fonts.googleapis.com' ||
    url.host === 'fonts.gstatic.com' ||
    url.host === 'cdn.jsdelivr.net';
  if (!isSameOrigin && !isCdn) return;

  // /data/* — always fresh
  if (isSameOrigin && url.pathname.startsWith('/data/')) {
    event.respondWith(networkFirst(req));
    return;
  }
  // Binary assets (icons, fonts) — cache-first
  if (isStaticBinary(url.pathname)) {
    event.respondWith(cacheFirst(req));
    return;
  }
  // Everything else (HTML, CSS, JS, CDN libs) — network-first
  event.respondWith(networkFirst(req));
});

// ---------- message: let the page force-activate the next SW ----------
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

// ---------- push: fetch fresh data + show notification ----------
// The Worker sends empty pushes (no encrypted payload) — we pull the
// current prices JSON here so the notification text reflects whatever
// the cron just committed.
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let title = 'Tankful';
    let body = 'Time to fill up — check the dashboard for details.';
    try {
      const res = await fetch('/data/lake-country-prices.json?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.stations) && data.stations.length) {
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
    } catch (e) { /* fall through to generic */ }
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
