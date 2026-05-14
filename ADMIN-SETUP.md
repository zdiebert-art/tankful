# Tankful Admin — One-time Setup

The admin dashboard at `/admin.html` needs **three external credentials**
to be fully functional. Without them, the page renders but most tabs show
"setup required" placeholders.

Estimated total time: **~15 minutes.**

| Credential | Used for | Where it lives |
|---|---|---|
| Google OAuth Client ID | Login gate | `js/admin-config.js` (committed) |
| GitHub fine-grained PAT | All read+write operations | Browser localStorage (per-device) |
| Cloudflare API token | Traffic tab (Web Analytics) | Browser localStorage (per-device) |
| (Cloudflare site tag) | Tracking beacon on main app | `js/config.js` (committed) |

You can ship the admin page with only the Google Client ID set and add
the rest later — every tab degrades gracefully.

---

## 1. Google OAuth Client ID

The login gate uses Google Identity Services (the modern replacement for
"Sign in with Google"). You need a Web Application client registered in
Google Cloud.

**Steps:**

1. Visit https://console.cloud.google.com and create (or pick) a project.
   "Tankful Admin" is a fine name.
2. Open the menu → **APIs & Services → OAuth consent screen**.
   - Type: **External**.
   - App name: Tankful Admin.
   - User support email: your Gmail.
   - Developer contact: same.
   - Scopes: you can leave at defaults — we only need `openid`, `email`,
     and `profile` which are included by default.
   - Test users: add `zdiebert@gmail.com`. (As long as the app stays in
     "Testing" status, only test users can log in — that's exactly what
     we want for an admin tool.)
3. Open **APIs & Services → Credentials → Create Credentials → OAuth Client ID**.
   - Application type: **Web application**.
   - Name: anything.
   - **Authorized JavaScript origins:** add
     - `https://tankful.ca`
     - `http://localhost:8765` (for local testing)
   - Click Create.
4. Copy the **Client ID** (looks like `123456789012-abc….apps.googleusercontent.com`).
5. Paste it into [js/admin-config.js](js/admin-config.js) — replace
   `REPLACE_WITH_GOOGLE_OAUTH_CLIENT_ID`.
6. Commit + push (the dashboard reads this value at runtime).

If you ever want a friend to use the admin, add their email to
`allowedEmails` in the same config file and add them as a test user in
Google Cloud.

---

## 2. GitHub fine-grained Personal Access Token

The dashboard talks to the GitHub REST API for:

- Reading the workflow run history (Crawls tab)
- Reading repo files (Settings, Stations tabs)
- Writing commits when you save a station edit or change the cron
- Triggering manual scrape runs (`workflow_dispatch`)

**Steps:**

1. Visit https://github.com/settings/personal-access-tokens/new.
2. **Resource owner:** your user account.
3. **Token name:** "Tankful Admin Dashboard" (or whatever).
4. **Expiration:** 90 days is sensible; you can renew. Or "No expiration"
   for set-and-forget at the cost of a slightly worse security posture.
5. **Repository access:** Only select repositories → pick `tankful`.
6. **Permissions** → Repository permissions:
   - **Contents:** Read and write (for committing edits)
   - **Actions:** Read and write (for triggering workflows + reading runs)
   - **Metadata:** Read-only (auto-included)
7. Click **Generate token**, copy the value (starts with `github_pat_`).
8. Open `https://tankful.ca/admin.html`, sign in with Google, go to the
   **Setup** tab, paste the token, click Save.
9. Click **Test connection** — should say "Authed as your-github-username".

The token lives in localStorage on whatever device you pasted it into.
Each device you log in from needs its own paste. Sign-out keeps the
token (so you don't have to re-paste); use **Clear** in the Setup tab if
you ever need to wipe it.

---

## 3. Cloudflare Web Analytics

The Traffic tab pulls visitor stats from Cloudflare's free Web Analytics
service. Two pieces:

**(a) Enable Web Analytics on the Cloudflare side**

1. Visit https://dash.cloudflare.com → **Analytics & Logs → Web Analytics**.
2. Click **Add a site**, enter `tankful.ca`.
3. Cloudflare gives you a **site tag** (a hex string). Two places to use
   it:
   - Paste it into [js/config.js](js/config.js) → `cloudflareAnalyticsTag`.
     Commit + push. From the next deploy onwards, every page load on
     tankful.ca pings Cloudflare.
   - Paste it into [js/admin-config.js](js/admin-config.js) →
     `cloudflareSiteTag`. The admin Traffic tab uses this to filter the
     stats query.
4. Also grab your **Account ID** (top of the right sidebar in any
   Cloudflare dashboard view) and paste it into `js/admin-config.js` →
   `cloudflareAccountId`.

**(b) Create an API token for reading stats**

1. Visit https://dash.cloudflare.com/profile/api-tokens → **Create Token → Custom token**.
2. Token name: "Tankful Admin Analytics Read".
3. **Permissions:** Account → **Account Analytics → Read**.
4. **Account Resources:** Include your account.
5. Click **Continue to summary → Create Token**, copy the value.
6. In the admin Setup tab, paste it under "Cloudflare API Token".

Data shows up in the Traffic tab within ~30 minutes of the beacon being
deployed. The free tier has plenty for a personal site.

---

## What happens after setup

- **Login gate:** Sign in with Google → if your email is in
  `allowedEmails` you see the dashboard, otherwise an error message.
- **All tabs work:** Overview, Crawls, Regions, Stations, History,
  Settings, Traffic.
- **Edits go straight to main:** Saving a station or changing the cron
  creates a commit on `main` with message like
  `chore(regions): admin edit to <station-id>`. GitHub Pages redeploys
  within ~5 min.

---

## Security posture (read this once)

- **The admin URL is discoverable** — anyone can type `/admin.html`.
  Without a valid Google session matching the allowlist, they see the
  login gate and nothing else.
- **Google's JWT signature isn't verified server-side** (there is no
  server). The allowlist check happens client-side. A determined
  attacker with deep Chrome DevTools skills could bypass the gate
  visually, but they'd still need your GitHub PAT to make any writes.
- **Tokens are in localStorage**, not cookies. That means:
  - They don't auto-send with cross-origin requests (XSS-resistant
    against unrelated sites)
  - But they're readable by any script running on your domain — so don't
    install random tampermonkey scripts on tankful.ca while logged in
  - On a shared device, sign out + clear tokens before walking away
- **Rotate tokens** if you ever suspect they leaked. GitHub PAT settings
  page has a "Regenerate" button; Cloudflare's token page has a "Roll"
  button.
