# Analytics Proxy Worker — Click-by-Click Setup

The admin dashboard's **Traffic tab** needs a tiny Cloudflare Worker as
a middleman, because the browser is blocked from calling Cloudflare's
Analytics API directly (CORS). This worker holds the API token
server-side, runs the GraphQL queries, and returns the result.

**Time:** ~10 minutes. **Cost:** $0 (Cloudflare Workers free tier).
**Where you click:** https://dash.cloudflare.com (no command line needed).

---

## Step 1 — Open the Workers section

1. Go to https://dash.cloudflare.com and log in.
2. In the left sidebar, click **Compute → Workers & Pages**.
   (Or in the search bar at the top, type "Workers" and pick the result.)

---

## Step 2 — Create a Worker

1. Click **Create**.
2. Pick **Create Worker** (NOT "Create Application" — just the Worker option).
3. Worker name: type **`tankful-analytics-proxy`**. (You can use anything,
   but this name matches everywhere else and avoids confusion.)
4. Click **Deploy** to make the starter worker. You'll see a default
   "Hello, World!" page — that's fine, we'll replace it next.

---

## Step 3 — Paste in the real code

1. On the Worker overview page, click **Edit code** (top right).
2. The editor opens with the default Hello-World code. **Select all of it
   and delete it.**
3. Open the file [cloudflare/analytics-worker.js](analytics-worker.js)
   in your repo (path:
   `F:\Voyager RV\19. APPS\gas-watch\cloudflare\analytics-worker.js`).
4. Copy the entire contents of that file.
5. Paste into the Cloudflare editor.
6. Click **Deploy** in the top right.
7. Click **Save and deploy** in the confirmation dialog.

---

## Step 4 — Add the environment variables

The worker needs three values to do its job. Two are public (account ID,
site tag) and one is a secret (the API token).

1. From the Worker overview, go to **Settings → Variables and Secrets**.
2. Add the following:

| Name             | Type    | Value |
|------------------|---------|-------|
| `CF_ACCOUNT_ID`  | Plain   | `22eee49f964f5538a7280e890be467e5` |
| `CF_SITE_TAG`    | Plain   | `a1f0f3dc281b40798a05c72982c95ea9` |
| `CF_API_TOKEN`   | **Secret** | *(create one in Step 5 below, then paste it here)* |

   - For each row: click **Add variable** → enter name + value → pick
     **Plain text** or **Secret** as shown → **Save**.

3. After all three are added, click **Deploy** again so the worker
   restarts and picks up the values.

---

## Step 5 — Create the Cloudflare API Token

1. In a new tab, go to https://dash.cloudflare.com/profile/api-tokens.
2. Click **Create Token**.
3. Scroll to the bottom and click **Create Custom Token → Get started**.
4. Fill in:
   - **Token name:** `tankful-analytics-proxy-read`
   - **Permissions:**
     - Resource: **Account**
     - Permission: **Account Analytics**
     - Access: **Read**
   - **Account Resources:**
     - **Include** → **Your account** (select it from the dropdown)
   - Leave everything else at defaults.
5. Click **Continue to summary** → **Create Token**.
6. Cloudflare shows the token **once**. Copy it.
7. Back in the Worker's **Variables and Secrets** page, paste this token
   into the `CF_API_TOKEN` secret you added above → **Save**.

---

## Step 6 — Find the Worker URL

1. From the Worker overview, you'll see a section called **Triggers** or
   the workers.dev subdomain at the top of the page.
2. The URL looks like
   `https://tankful-analytics-proxy.<your-subdomain>.workers.dev` —
   copy it.
3. Open this URL in a browser tab. You should see JSON like:
   ```
   { "ok": true, "service": "tankful-analytics-proxy", "env": { "hasToken": true, "hasAccountId": true, "hasSiteTag": true } }
   ```
   All three `has*` values should be `true`. If any are `false`, recheck
   the variables in Step 4.

---

## Step 7 — Tell the admin dashboard about the worker

1. Open `js/admin-config.js` in your editor.
2. Find the line:
   ```
   analyticsWorkerUrl: "",
   ```
3. Paste your Worker URL between the quotes:
   ```
   analyticsWorkerUrl: "https://tankful-analytics-proxy.your-subdomain.workers.dev",
   ```
4. Commit + push to main (or paste the URL into the chat and I'll do it).
5. Wait ~5 minutes for GitHub Pages to redeploy.

---

## Step 8 — Verify

1. Open https://tankful.ca/admin.html
2. Go to the **Setup** tab → click **Test worker connection**. Should
   say "✓ Worker reachable and configured".
3. Switch to the **Traffic** tab. You should see your visitor data
   (zero or low at first, more as the beacon collects pings).

---

## Troubleshooting

- **Setup tab says "not configured"** — check Step 7. The URL must end
  with `.workers.dev` and have no trailing slash.
- **Test worker says "Worker reachable but missing env vars"** — go back
  to Step 4 and re-add whichever ones are missing.
- **Traffic tab shows "Worker /overview returned 502"** — the API token
  probably doesn't have the right permission. Recreate it (Step 5) with
  Account Analytics: Read.
- **No data showing** — the Cloudflare beacon needs ~30 min from first
  install to populate stats. Hit tankful.ca a few times and wait.

---

## Alternative: deploy via CLI (`wrangler`)

If you ever want to manage the worker from the command line instead:

```bash
npm install -g wrangler
cd cloudflare
wrangler login
wrangler deploy --config analytics-wrangler.toml
wrangler secret put CF_API_TOKEN --config analytics-wrangler.toml
```

The `analytics-wrangler.toml` config is already in the repo — it points
at `analytics-worker.js` with the account ID + site tag pre-filled.
