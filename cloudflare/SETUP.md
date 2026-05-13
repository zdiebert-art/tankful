# Tankful Push — Cloudflare Worker Setup

This is the one-time backend setup that makes the "🔔 Get alerts" button on tankful.ca actually work. Until you finish these steps, the button stays hidden (because `pushWorkerUrl` is empty in `js/config.js`).

Estimated time: **~10 minutes.**

You'll get:
- A Cloudflare account (free, no credit card needed)
- A KV namespace to store push subscriptions
- A deployed Worker that subscribers POST to + a cron that sends pushes when the score crosses 70
- VAPID keys for signing pushes

---

## 1. Generate VAPID keys

From the repo root:

```bash
cd tools
npm install         # one-time
npm run vapid
```

You'll get a public + private key. Save both somewhere temporary (notes app, sticky). The public key is safe to commit; the private key is **secret** and goes only in Cloudflare.

---

## 2. Sign up for Cloudflare + install Wrangler

1. Go to **https://dash.cloudflare.com/sign-up** — free account, email + password
2. Verify your email
3. Install Wrangler (Cloudflare's CLI) globally:
   ```bash
   npm install -g wrangler
   ```
4. Log in:
   ```bash
   wrangler login
   ```
   This opens a browser window. Click "Allow" to link Wrangler to your account.

---

## 3. Create the KV namespace

From the `cloudflare/` directory in this repo:

```bash
cd cloudflare
wrangler kv namespace create SUBS
```

Output will look like:

```
🌀 Creating namespace with title "tankful-push-SUBS"
✨ Success!
{ binding = "SUBS", id = "abc123def4567890..." }
```

Copy that `id` value.

Open `cloudflare/wrangler.toml`, find this line:

```toml
id = "REPLACE_WITH_KV_NAMESPACE_ID"
```

and replace the placeholder with your real ID.

---

## 4. Set the secrets (one command per secret)

Still in `cloudflare/`:

```bash
wrangler secret put VAPID_PUBLIC_KEY
# paste the public key from step 1, hit Enter

wrangler secret put VAPID_PRIVATE_KEY
# paste the private key from step 1, hit Enter

wrangler secret put VAPID_SUBJECT
# enter: mailto:your-email@example.com

# Optional — only set this if you want to use the /trigger debug route:
wrangler secret put ADMIN_SECRET
# enter any random string (used as the X-Admin-Secret header)
```

---

## 5. Deploy

```bash
wrangler deploy
```

Output ends with something like:

```
Published tankful-push (1.23 sec)
  https://tankful-push.zdiebert-art.workers.dev
  Current Deployment ID: ...
```

Copy that URL — that's your worker endpoint.

---

## 6. Wire the frontend to the Worker

Open `js/config.js` and set:

```js
pushWorkerUrl: 'https://tankful-push.zdiebert-art.workers.dev',
```

Commit + push:

```bash
git add js/config.js
git commit -m "chore: wire push worker URL"
git push
```

Within a minute, GitHub Pages rebuilds and the bell button appears on tankful.ca.

---

## 7. Test it end-to-end

1. Open **https://tankful.ca** on your phone (Chrome on Android, or Safari with Tankful installed to the home screen on iOS 16.4+)
2. Tap **🔔 Get alerts**
3. Accept the notification permission prompt
4. Button changes to **"Alerts on"** (filled coral)
5. To fire a test push without waiting for the cron, run:
   ```bash
   curl -X POST https://tankful-push.zdiebert-art.workers.dev/trigger \
     -H "X-Admin-Secret: <the ADMIN_SECRET you set>"
   ```
   You should get a notification on your phone within seconds.

---

## Optional: skip the cron, trigger from GitHub Actions

The Worker's built-in cron runs every 4h at minute 15 (offset from the scraper's minute 0 so it reads fresh data). That's usually enough.

If you'd rather have the scraper workflow fire the broadcast immediately after each run, add this step to `.github/workflows/refresh-prices.yml`, **after** the JSON commit step:

```yaml
- name: Notify subscribers (if score crossed threshold)
  if: success()
  run: |
    curl -fsS -X POST https://tankful-push.zdiebert-art.workers.dev/trigger \
      -H "X-Admin-Secret: ${{ secrets.PUSH_TRIGGER_SECRET }}"
  continue-on-error: true
```

Then in the repo's GitHub Settings → Secrets and variables → Actions, add `PUSH_TRIGGER_SECRET` with the same value you used for `ADMIN_SECRET` on the Worker.

---

## Troubleshooting

**"vapid-public HTTP 500" in browser console** — the Worker's `VAPID_PUBLIC_KEY` isn't set or is malformed. Re-run `wrangler secret put VAPID_PUBLIC_KEY`.

**Button shows but tap does nothing** — open browser DevTools → Console. Should see the specific error (most common: `permission denied` because user blocked notifications previously, fix in browser site settings).

**Notifications arrive but say "Time to fill up" with no details** — the Service Worker's fetch of `/data/lake-country-prices.json` failed. Check the SW console in DevTools → Application → Service Workers.

**iOS not receiving** — Web Push on iOS requires the app to be **installed to the home screen** first (via Share → "Add to Home Screen"). Notifications work only from the standalone PWA, not from Safari tabs.

**410 / 404 from push endpoints** — the Worker auto-removes those (subscription expired or revoked). No action needed.

---

## Costs

| Resource | Free tier | Tankful's usage |
|----------|-----------|-----------------|
| Workers requests | 100k/day | ~6/day (cron) + ~1/subscribe |
| Workers KV reads | 100k/day | dozens |
| Workers KV writes | 1k/day | 1 per subscription change |
| Workers cron triggers | unlimited | 6/day |

Stays well within free tier for personal + small-group use.
