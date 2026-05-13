/* ============================================
   TANKFUL — Push subscribe / unsubscribe UI
   Wires the "🔔 Get alerts" button in the where-card header to the
   Web Push lifecycle:
     1. ensure service worker is registered (handled in js/pwa.js)
     2. fetch VAPID public key from the Worker
     3. pushManager.subscribe with that key
     4. POST the subscription JSON to Worker /subscribe
   Unsubscribe runs the reverse.

   The button stays hidden when no Worker is configured (pushWorkerUrl
   in js/config.js is empty) or when notifications aren't supported.
   ============================================ */

const TANKFUL_Push = (() => {

  const STATE_KEY = 'tankful_push_state_v1';

  function workerUrl() {
    return (TANKFUL_CONFIG && TANKFUL_CONFIG.pushWorkerUrl) || '';
  }
  function supported() {
    return 'serviceWorker' in navigator &&
           'PushManager' in window &&
           'Notification' in window &&
           !!workerUrl();
  }

  // base64url → Uint8Array (the format pushManager.subscribe wants)
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const b64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function getRegistration() {
    if (!('serviceWorker' in navigator)) return null;
    // Wait for the SW that pwa.js registered to be ready, with a short timeout
    // so we don't hang the UI if it never claims.
    return Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(() => resolve(null), 8000))
    ]);
  }

  async function currentSubscription() {
    const reg = await getRegistration();
    if (!reg) return null;
    return reg.pushManager.getSubscription();
  }

  async function fetchVapidPublicKey() {
    const res = await fetch(workerUrl().replace(/\/$/, '') + '/vapid-public', { cache: 'no-store' });
    if (!res.ok) throw new Error('vapid-public HTTP ' + res.status);
    const data = await res.json();
    if (!data || !data.publicKey) throw new Error('vapid-public missing key');
    return data.publicKey;
  }

  async function subscribe() {
    if (!supported()) throw new Error('push not supported / not configured');
    const reg = await getRegistration();
    if (!reg) throw new Error('service worker not ready');

    // Permission first — must be triggered by a user gesture.
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('permission ' + perm);

    const vapidKey = await fetchVapidPublicKey();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
    }

    const res = await fetch(workerUrl().replace(/\/$/, '') + '/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() })
    });
    if (!res.ok) throw new Error('/subscribe HTTP ' + res.status);

    try { localStorage.setItem(STATE_KEY, 'on'); } catch {}
    return sub;
  }

  async function unsubscribe() {
    const sub = await currentSubscription();
    if (!sub) {
      try { localStorage.removeItem(STATE_KEY); } catch {}
      return;
    }
    try {
      await fetch(workerUrl().replace(/\/$/, '') + '/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint })
      });
    } catch (e) { /* worker offline; still unsubscribe locally */ }
    await sub.unsubscribe();
    try { localStorage.removeItem(STATE_KEY); } catch {}
  }

  async function isActive() {
    const sub = await currentSubscription();
    return !!sub;
  }

  return { supported, isActive, subscribe, unsubscribe };
})();
