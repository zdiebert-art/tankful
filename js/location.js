/* ============================================
   TANKFUL — Geolocation + distance helpers
   - Asks the browser once for the user's coords (requires a user gesture
     to satisfy modern permission rules).
   - Caches the result in localStorage with a 1h TTL so return visits
     don't re-prompt.
   - Builds directions URLs that route to Apple Maps on iOS devices and
     Google Maps everywhere else.
   ============================================ */

const TANKFUL_Location = (() => {

  const STORAGE_KEY = 'tankful_location_v1';
  const CACHE_TTL_MS = 60 * 60 * 1000;   // 1 hour
  const GEO_TIMEOUT_MS = 10 * 1000;
  const GEO_MAX_AGE_MS = 5 * 60 * 1000;  // accept positions up to 5 min old

  // ---------- iOS detection (iPad on iPadOS 13+ reports as MacIntel) ----------
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
    ((navigator.platform === 'MacIntel' || /Mac/.test(navigator.platform || '')) &&
      (navigator.maxTouchPoints || 0) > 1);

  // ---------- localStorage cache ----------
  function readCache() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj.lat !== 'number' || typeof obj.lng !== 'number') return null;
      if (Date.now() - (obj.at || 0) > CACHE_TTL_MS) return null;
      return obj;
    } catch (e) { return null; }
  }
  function writeCache(lat, lng) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat, lng, at: Date.now() }));
    } catch (e) { /* ignore quota / private-mode */ }
  }
  function clearCache() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  // ---------- Permissions API helper (where supported) ----------
  async function permissionState() {
    if (!navigator.permissions || !navigator.permissions.query) return 'prompt';
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      return status.state; // 'granted' | 'prompt' | 'denied'
    } catch (e) {
      return 'prompt';
    }
  }

  // ---------- Get position (cache-first, no prompt) ----------
  // Resolves null without ever asking. Use this to silently restore state.
  async function getCachedOrSilent() {
    const cached = readCache();
    if (cached) return cached;
    if ((await permissionState()) !== 'granted') return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const out = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          writeCache(out.lat, out.lng);
          resolve(out);
        },
        () => resolve(null),
        { timeout: GEO_TIMEOUT_MS, maximumAge: GEO_MAX_AGE_MS }
      );
    });
  }

  // ---------- Get position (with prompt if needed) ----------
  // Resolves null if denied or unsupported. Triggers the OS prompt the
  // first time it's called by a user gesture.
  async function request() {
    if (!('geolocation' in navigator)) return null;
    const cached = readCache();
    if (cached) return cached;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const out = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          writeCache(out.lat, out.lng);
          resolve(out);
        },
        () => resolve(null),
        { timeout: GEO_TIMEOUT_MS, maximumAge: GEO_MAX_AGE_MS, enableHighAccuracy: false }
      );
    });
  }

  // ---------- Haversine great-circle distance, km ----------
  function distanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371; // earth radius km
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  // ---------- Friendly distance label ----------
  function formatDistance(km) {
    if (!Number.isFinite(km)) return null;
    if (km < 0.1) return '< 100m';
    if (km < 1) {
      const m = Math.round(km * 1000 / 50) * 50; // round to nearest 50m
      return `${m}m`;
    }
    if (km < 10) return `${km.toFixed(1)} km`;
    if (km < 100) return `${Math.round(km)} km`;
    return `${Math.round(km)} km`;
  }

  // ---------- Directions URL ----------
  // iOS → Apple Maps web URL (opens native Maps when installed).
  // Everywhere else → Google Maps Universal "directions" URL.
  function directionsUrl(station) {
    if (!station) return '#';
    const addr = station.address ? `${station.address}, Lake Country, BC` : null;
    if (isIOS) {
      // daddr can be either an address or "lat,lng". dirflg=d → driving.
      const dest = addr || (station.lat && station.lng ? `${station.lat},${station.lng}` : '');
      return `https://maps.apple.com/?daddr=${encodeURIComponent(dest)}&dirflg=d`;
    }
    const q = addr || (station.lat && station.lng ? `${station.lat},${station.lng}` : '');
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}&travelmode=driving`;
  }

  return {
    isIOS,
    request,
    getCachedOrSilent,
    clearCache,
    permissionState,
    distanceKm,
    formatDistance,
    directionsUrl
  };
})();
