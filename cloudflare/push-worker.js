/* ============================================
   TANKFUL — Push Notification Worker
   Cloudflare Worker that:
     - Stores Web Push subscriptions in KV (POST /subscribe, /unsubscribe)
     - Exposes the VAPID public key for the frontend (GET /vapid-public)
     - Runs on a cron schedule (configured in wrangler), checks the latest
       prices JSON, and if the heuristic score has crossed into "Fill Up
       Now" territory AND we haven't notified in the last 12h, sends a
       VAPID-signed Web Push to every subscriber. Payload is empty — the
       service worker on the client fetches fresh data and builds the
       notification text from it.

   Required environment / bindings:
     SUBS                 KV namespace binding — stores subscriptions + alert log
     VAPID_PUBLIC_KEY     base64url, also embedded in frontend
     VAPID_PRIVATE_KEY    base64url, KEEP SECRET — Worker-only
     VAPID_SUBJECT        mailto:you@example.com
     ALLOWED_ORIGIN       https://tankful.ca  (CORS allow-origin)
     ADMIN_SECRET         optional; required header for the debug /trigger route

   Generate keys via: `node tools/generate-vapid.mjs` (in the main repo).
   ============================================ */

// ---------- CORS ----------
function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://tankful.ca',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
    'Access-Control-Max-Age': '86400',
  };
}
function jsonResponse(env, status, body) {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

// ---------- base64url ----------
function b64urlEncode(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function strToBytes(s) {
  return new TextEncoder().encode(s);
}

// ---------- VAPID JWT signing (ES256) ----------
async function importVapidPrivateKey(b64urlPrivate) {
  // VAPID private keys are 32-byte raw ECDSA P-256 'd' values. The WebCrypto
  // API needs them in PKCS#8 or JWK form; JWK is simpler.
  const d = b64urlPrivate;
  // We also need x and y from the public key (uncompressed point).
  return null; // filled in below using both keys
}

async function makeVapidJWT(env, audience) {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,   // 12h
    sub: env.VAPID_SUBJECT || 'mailto:admin@tankful.ca',
  };
  const headerB64  = b64urlEncode(strToBytes(JSON.stringify(header)));
  const payloadB64 = b64urlEncode(strToBytes(JSON.stringify(payload)));
  const signingInput = headerB64 + '.' + payloadB64;

  // The VAPID public key is an uncompressed P-256 point: 0x04 || X(32) || Y(32) = 65 bytes
  const pubBytes = b64urlDecode(env.VAPID_PUBLIC_KEY);
  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
    throw new Error('VAPID_PUBLIC_KEY is not a 65-byte uncompressed P-256 point');
  }
  const x = pubBytes.slice(1, 33);
  const y = pubBytes.slice(33, 65);
  const dBytes = b64urlDecode(env.VAPID_PRIVATE_KEY);

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: b64urlEncode(dBytes),
    x: b64urlEncode(x),
    y: b64urlEncode(y),
    ext: true,
  };
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    strToBytes(signingInput)
  );
  const sigB64 = b64urlEncode(sig);
  return signingInput + '.' + sigB64;
}

// ---------- Push send ----------
async function sendPushTo(env, subscription) {
  const endpoint = subscription.endpoint;
  const audience = new URL(endpoint).origin;
  const jwt = await makeVapidJWT(env, audience);
  const auth = `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`;
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: auth,
      TTL: '86400',
      'Content-Length': '0',
    },
  });
}

// ---------- Subscription storage (KV) ----------
const SUB_KEY = (endpoint) => 'sub:' + b64urlEncode(strToBytes(endpoint));

async function storeSubscription(env, subscription) {
  await env.SUBS.put(SUB_KEY(subscription.endpoint), JSON.stringify(subscription));
}
async function removeSubscription(env, endpoint) {
  await env.SUBS.delete(SUB_KEY(endpoint));
}
async function listSubscriptions(env) {
  const out = [];
  let cursor = undefined;
  do {
    const res = await env.SUBS.list({ prefix: 'sub:', cursor });
    for (const k of res.keys) {
      const raw = await env.SUBS.get(k.name);
      if (raw) {
        try { out.push(JSON.parse(raw)); } catch {}
      }
    }
    cursor = res.cursor;
    if (res.list_complete) break;
  } while (cursor);
  return out;
}

// ---------- Verdict (mirrors the frontend heuristic enough to decide "alert?") ----------
async function fetchPrices(env) {
  const url = (env.PRICES_URL || 'https://tankful.ca/data/lake-country-prices.json') + '?t=' + Date.now();
  const res = await fetch(url, { cf: { cacheTtl: 0 } });
  if (!res.ok) throw new Error(`prices HTTP ${res.status}`);
  return res.json();
}

function computeScore(prices) {
  let score = 50;
  // Best-deal spread
  if (Array.isArray(prices.stations) && prices.stations.length && prices.marketAverage) {
    const cheapest = Math.min(...prices.stations.map((s) => s.price));
    const spread = prices.marketAverage - cheapest;
    if (spread >= 8) score += 8;
    else if (spread >= 4) score += 4;
    else if (spread >= 1) score += 2;
  }
  // Day-of-week (Mon/Tue lean fill)
  const dow = new Date().getDay();
  const dowScore = { 0: 35, 1: 70, 2: 75, 3: 55, 4: 25, 5: 30, 6: 30 }[dow];
  score += Math.round((dowScore - 50) * 0.16);
  return Math.max(0, Math.min(100, score));
}

// ---------- HTTP request router ----------
async function handleRequest(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(env) });
  }

  // GET /vapid-public — frontend uses this to subscribe
  if (request.method === 'GET' && url.pathname === '/vapid-public') {
    return jsonResponse(env, 200, { publicKey: env.VAPID_PUBLIC_KEY });
  }

  // POST /subscribe { subscription: PushSubscription }
  if (request.method === 'POST' && url.pathname === '/subscribe') {
    let body;
    try { body = await request.json(); } catch {
      return jsonResponse(env, 400, { error: 'invalid JSON' });
    }
    const sub = body && body.subscription;
    if (!sub || !sub.endpoint) return jsonResponse(env, 400, { error: 'missing subscription' });
    await storeSubscription(env, sub);
    return jsonResponse(env, 200, { ok: true });
  }

  // POST /unsubscribe { endpoint }
  if (request.method === 'POST' && url.pathname === '/unsubscribe') {
    let body;
    try { body = await request.json(); } catch {
      return jsonResponse(env, 400, { error: 'invalid JSON' });
    }
    if (!body || !body.endpoint) return jsonResponse(env, 400, { error: 'missing endpoint' });
    await removeSubscription(env, body.endpoint);
    return jsonResponse(env, 200, { ok: true });
  }

  // POST /trigger — manual broadcast (auth: X-Admin-Secret). Useful for testing
  // and for the GitHub Action to fire a fresh alert without waiting for cron.
  if (request.method === 'POST' && url.pathname === '/trigger') {
    if (!env.ADMIN_SECRET || request.headers.get('X-Admin-Secret') !== env.ADMIN_SECRET) {
      return jsonResponse(env, 401, { error: 'unauthorized' });
    }
    const result = await broadcastIfNeeded(env, { force: true });
    return jsonResponse(env, 200, result);
  }

  return jsonResponse(env, 404, { error: 'not found' });
}

// ---------- Broadcast (cron + /trigger entry point) ----------
async function broadcastIfNeeded(env, opts) {
  const force = !!(opts && opts.force);
  let prices;
  try { prices = await fetchPrices(env); }
  catch (e) { return { ok: false, error: 'fetch prices: ' + e.message }; }

  const score = computeScore(prices);
  const threshold = parseInt(env.SCORE_THRESHOLD || '70', 10);
  const lastAlertRaw = await env.SUBS.get('meta:last_alert');
  const lastAlert = lastAlertRaw ? parseInt(lastAlertRaw, 10) : 0;
  const hoursSince = (Date.now() - lastAlert) / 36e5;

  if (!force) {
    if (score < threshold) return { ok: true, action: 'skip', reason: `score ${score} < ${threshold}` };
    if (hoursSince < 12)   return { ok: true, action: 'skip', reason: `last alert ${hoursSince.toFixed(1)}h ago` };
  }

  const subs = await listSubscriptions(env);
  if (subs.length === 0) return { ok: true, action: 'skip', reason: 'no subscribers' };

  let sent = 0, gone = 0, failed = 0;
  await Promise.all(subs.map(async (sub) => {
    try {
      const res = await sendPushTo(env, sub);
      if (res.status === 201 || res.status === 200 || res.status === 204) sent++;
      else if (res.status === 404 || res.status === 410) {
        gone++;
        await removeSubscription(env, sub.endpoint);
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }
  }));

  if (sent > 0) {
    await env.SUBS.put('meta:last_alert', String(Date.now()));
  }
  return { ok: true, action: 'broadcast', score, sent, gone, failed };
}

// ---------- Worker entry points ----------
export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env);
    } catch (e) {
      return jsonResponse(env, 500, { error: e.message });
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(broadcastIfNeeded(env, { force: false }));
  },
};
