# Tankful — Build Notes (Handoff to Claude Code)

> **You're picking up from a Claude Chat session.** Read this entire doc before starting work. It contains everything that's been built so far, everything Zach has done outside the codebase, and an ordered task list for what's left.

---

## What this app is

A static HTML/JS dashboard predicting Lake Country / Kelowna pump prices. Tells the user when to fill up based on FX, WTI, RBOB futures, day-of-week patterns, price cycles, and Canadian stat holidays.

- **Name:** Tankful (recently renamed from "Gas Watch" — codebase still says Gas Watch in most places; rename is a pending task)
- **Domain:** `tankful.ca` (purchased on Namecheap)
- **Hosting plan:** GitHub Pages with custom domain `tankful.ca` (Namecheap hosting kept for future email use only)
- **User:** Zach Diebert (Lake Country, BC) — personal/family use
- **GitHub username:** `zdiebert-art`
- **Local path:** `F:\Voyager RV\19. APPS\gas-watch\`

---

## Stack

- Vanilla HTML / CSS / JS, no build step, no framework
- Global state objects (`GW_MOCK`, `GW_LIVE`, `GW_CONFIG`) hydrated into the DOM by `js/app.js`
- CSS custom properties for theming — `body[data-state]` switches palettes
- ApexCharts CDN for the price history chart
- Static file deployment via GitHub Pages

---

## What's been built (current state of the code)

### File tree

```
index.html              # Dashboard (currently says "GAS WATCH" — rename pending)
cheatsheet.html         # Printable cheatsheet (also says "GAS WATCH")
css/
  styles.css            # All app styles, theme system, glass-morphism, gooey blob bg
  print.css             # Cheatsheet print styles
js/
  config.js             # User-editable config (EIA API key goes here)
  mock-data.js          # Fallback data — May 12 2026 Lake Country scenario
  live-data.js          # Bank of Canada FX + EIA WTI/RBOB fetchers
  score.js              # Pure scoring functions
  chart-config.js       # ApexCharts setup with manual date formatter
  app.js                # DOM hydration, event wiring, live data orchestration
assets/
  favicon.svg           # Outline gas pump w/ clock dial inset (Icon "A")
BUILD-NOTES.md          # This file
README.md               # If present, may need updating
```

### Theme system (don't touch unless asked)

- `body[data-state="fill-up"]` → green mint/emerald palette → "go fill up"
- `body[data-state="neutral"]`  → amber palette → "maybe today"
- `body[data-state="wait"]`     → red/coral palette → "don't fill"
- HTML default `body[data-state="neutral"]` to avoid theme-flash on load
- Color semantics were specifically chosen: green = go, red = stop (traffic light intuition)

### Icon

The brand icon is an outline gas pump with a small clock dial inset in the upper body. Same SVG appears in:
- `index.html` header brand-icon
- `cheatsheet.html` header brand-icon
- `assets/favicon.svg` (white strokes on coral gradient)

**Don't redesign the icon.** It was chosen out of four concepts and approved.

### Live data layer (wired but not yet score-driving)

`js/live-data.js` exposes `GW_LIVE` with:
- `fetchFX()` → Bank of Canada Valet (USD/CAD), no key, CORS-friendly
- `fetchWTI()` → EIA WTI Cushing spot, requires free key
- `fetchRBOB()` → EIA NYH RBOB Regular Gasoline spot, requires free key
- `fetchAll()` → parallel fetch all three, returns `{ fx, wti, rbob, fetchedAt, anySuccess }`
- localStorage cache with TTL (default 60 min, configurable in `js/config.js`)

`js/app.js` `kickoffLiveData()` runs after the initial mock render. `applyLiveData()` patches `state.components` with live values for display. Footer `#liveStatus` shows current fetch state.

**Important: the score number itself is still hardcoded from mock.** Building the formula that turns live indicators into a moving 0–100 score is Phase C — don't tackle it as part of this work unless explicitly asked.

---

## What Zach has done outside the codebase

### Domain purchased
`tankful.ca` on Namecheap. Auto-renew on. Hosting plan (Stellar Plus) also active but kept only for future email use.

### DNS records configured (confirmed via screenshot)
At Namecheap → Domain List → tankful.ca → Advanced DNS:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | @ | 185.199.108.153 | Automatic |
| A Record | @ | 185.199.109.153 | Automatic |
| A Record | @ | 185.199.110.153 | Automatic |
| A Record | @ | 185.199.111.153 | Automatic |
| CNAME Record | www | `zdiebert-art.github.io.` | Automatic |

These point at GitHub Pages. DNS was changed recently; propagation may take 5 min to a few hours. Don't expect GitHub Pages to verify the custom domain immediately.

### GitHub
- Account exists: `zdiebert-art`
- Repo: **not yet created** — Task 1 below
- Pages: **not yet enabled** — Task 4 below

---

## Pending tasks (in order)

### Task 1 — Initialize git repo and push to GitHub

```bash
cd "F:/Voyager RV/19. APPS/gas-watch"
git init
git branch -M main
```

Create `.gitignore`:
```
node_modules/
.DS_Store
Thumbs.db
*.log
.env
.vscode/
```

Then:
```bash
gh repo create tankful --public --source=. --remote=origin
git add .
git commit -m "Initial commit — Tankful dashboard with mock + live FX data"
git push -u origin main
```

**Use a public repo.** GitHub Pages on a private repo costs $4/mo (Pro). The code isn't sensitive; the EIA key (once added to `js/config.js`) is already exposed in the deployed site anyway. Private just hides it from GitHub search, not from anyone visiting tankful.ca.

### Task 2 — Rename "Gas Watch" → "Tankful" throughout

**Ask Zach first about brand styling before making decisions.** The existing CSS has `text-transform: uppercase` on `.brand`, which would render "Tankful" as "TANKFUL". The name was specifically picked for the "thankful" homophone, which arguably reads better lowercase. Confirm with Zach: **TANKFUL (uppercase, matches current) or tankful (lowercase, preserves wordplay)?**

Touch points to update:

- `index.html` → `<title>`, `.brand-text` content, footer copy, meta description
- `cheatsheet.html` → same
- `BUILD-NOTES.md` → already updated, but verify
- `README.md` → if present
- Comment headers in:
  - `js/config.js`
  - `js/mock-data.js`
  - `js/live-data.js`
  - `js/app.js`
  - `js/score.js`
- `assets/favicon.svg` → no change needed (no text in the SVG)

**Also rename the global state objects** for consistency:
- `GW_MOCK` → `TANKFUL_MOCK` (or just `STATE`)
- `GW_LIVE` → `TANKFUL_LIVE` (or `LIVE`)
- `GW_CONFIG` → `TANKFUL_CONFIG` (or `CONFIG`)
- localStorage cache key `gw_live_cache_v1` → leave as-is OR bump to `tankful_cache_v1` and accept one-time cache miss

If Zach picks lowercase styling, in `css/styles.css` `.brand`:
```css
.brand {
  /* remove or comment out */
  /* text-transform: uppercase; */
  /* tighten letter-spacing for lowercase */
  letter-spacing: -0.01em;
}
```

### Task 3 — Add CNAME file for GitHub Pages

Create `CNAME` at the repo root (no extension, single line):
```
tankful.ca
```

Commit and push.

### Task 4 — Enable GitHub Pages

Via CLI:
```bash
gh api repos/zdiebert-art/tankful/pages \
  --method POST \
  -f source[branch]=main \
  -f source[path]=/
```

Then set the custom domain:
```bash
gh api repos/zdiebert-art/tankful/pages \
  --method PUT \
  -f cname=tankful.ca \
  -f https_enforced=false
```

(Or do this via UI: repo Settings → Pages → Source "Deploy from branch" → main / root → Custom domain `tankful.ca`.)

**Don't enable "Enforce HTTPS" yet.** Wait for DNS to verify (GitHub shows a green checkmark in the Pages settings when ready). Could take anywhere from 5 minutes to several hours since DNS was just changed. Once the checkmark appears, flip HTTPS on:

```bash
gh api repos/zdiebert-art/tankful/pages \
  --method PUT \
  -f https_enforced=true
```

Verify: `https://tankful.ca` should load the app.

### Task 5 — Build the price scraper

Now build the GitHub Actions cron scraper that was the original Phase B work.

#### Target URL
`https://www.gasbuddy.com/home?search=V4V+1W2&fuel=1&method=all&maxAge=0`

#### Stations to extract (match by street address — names vary)

| App ID | Address | Display name |
|--------|---------|--------------|
| `canco` | 11470 Bottom Wood Lake Rd | Canco Woodsdale |
| `petrocan` | 9724 BC-97 | Petro-Canada · 7-Eleven |
| `husky` | 10550 BC-97 | Husky Hwy 97 |
| `supersave` | 11751 BC-97 | Super Save Lake Country |

Also capture if present (bonus, not in current app station list):
- `parkway` at 11891 BC-97 (Shell-branded, often a deal)
- `shell-lc` at 9531 BC-97
- `chevron` at 9450 BC-97

#### Output: `data/lake-country-prices.json`

```json
{
  "fetchedAt": "2026-05-12T19:30:00Z",
  "region": "lake-country",
  "marketAverage": 201.5,
  "stations": [
    {
      "id": "canco",
      "name": "Canco Woodsdale",
      "address": "11470 Bottom Wood Lake Rd",
      "price": 203.9,
      "reportedBy": "Owner",
      "reportedAgo": "27 Minutes Ago",
      "trust": "owner"
    }
  ]
}
```

`trust` values:
- `owner` — GasBuddy "Owner" badge (dealer-reported, highest reliability)
- `user` — community-reported (username shown)
- `stale` — older than 12 hours

#### Approach

1. `fetch()` the URL with a real User-Agent header
2. Parse HTML with `cheerio`
3. **Test if server-rendered first.** If `cheerio` finds no `\d+\.\d+¢` in the HTML, fall back to Playwright (`npx playwright install --with-deps chromium` in the workflow, ~30 sec extra per run, still free in Actions)
4. Match results to known station IDs using street-number + first-significant-word prefix matching
5. Log any unmatched stations to a separate file so we can catch new GasBuddy address-format variants
6. Write JSON, `git add data/lake-country-prices.json`, `git commit`, `git push`

**Test locally first** with `node scrape/fetch-prices.js` before setting up the cron.

#### Files to create

```
scrape/
  package.json              # cheerio (native fetch on modern Node 18+)
  fetch-prices.js           # the scraper script
.github/workflows/
  refresh-prices.yml        # cron + workflow_dispatch
data/
  lake-country-prices.json  # commit a valid empty stub initially
```

#### Workflow file

`cron: '0 */4 * * *'` — every 4 hours at minute 0
Include `workflow_dispatch:` for manual triggers during testing.
Use `actions/checkout@v4`, `actions/setup-node@v4` with Node 20.
Configure `permissions: contents: write` so the workflow can commit back.
Use `git config user.email "github-actions[bot]@users.noreply.github.com"` etc. for the commit author.

### Task 6 — Wire scraper JSON into the app

In `js/live-data.js`, add `fetchStations()`:
- URL: `/data/lake-country-prices.json` (same-origin since app and data are both at `tankful.ca`)
- Same localStorage cache pattern as `fetchFX()`
- Add to `fetchAll()` return object as `stations`

In `js/app.js` `applyLiveData()`:
- When `live.stations.success`, overwrite `state.stations` (map by ID, preserve any UI-only fields)
- Update `state.marketPrice` ← `live.stations.marketAverage`
- Re-render via `renderStations(state)` after patching
- Update `#liveStatus` to include station refresh in success message

In `js/app.js` `updateLiveStatus()`:
- Add station status to the message hierarchy (e.g. "Live • Bank of Canada + EIA + stations")

### Task 7 — Get EIA API key (Zach does this manually)

Tell Zach: go to https://www.eia.gov/opendata/register.php, register with email, key arrives instantly, paste into `js/config.js` `eiaApiKey` field, commit.

Once added, WTI + RBOB indicators go live and footer status upgrades.

---

## Definition of done

- [ ] Repo public at `github.com/zdiebert-art/tankful`
- [ ] App live at `https://tankful.ca` with HTTPS enforced
- [ ] All "Gas Watch" references renamed to "Tankful"
- [ ] Brand styling decision confirmed with Zach (TANKFUL vs tankful)
- [ ] Scraper running every 4 hours, JSON populated with ≥4 stations every run
- [ ] App displays live station prices on refresh
- [ ] EIA key added → WTI + RBOB also live
- [ ] Footer `#liveStatus` shows "Live • Bank of Canada + EIA + stations" on full success
- [ ] Fallback to mock works if any fetch fails (don't break the UI)

---

## User context (Zach)

- Direct, outputs-focused, skip preamble and platitudes
- Doesn't write code himself — needs complete, working, ready-to-use files
- Multi-file projects preferred over single-file
- Mobile-first PWA mindset (this app should eventually be installable)
- Typography enthusiast — Poppins on this app, round-O preferred
- Hard-refresh (Ctrl+Shift+R) is the in-browser iteration loop
- Personal/family use case — ToS gray areas (e.g. GasBuddy scraping at 6 req/day) are an informed personal call he's made; don't re-litigate

---

## Risks & gotchas

**GasBuddy may JS-render prices.** Plan A is cheerio; fall back to Playwright if `cheerio` returns no price text from the initial HTML.

**GasBuddy ToS prohibits automated agents.** Mitigations: send a real User-Agent, keep volume ≤ 6 requests/day, never republish data publicly, fold if served a cease-and-desist.

**Address-matching fragility.** GasBuddy may normalize addresses differently than expected ("11470 Bottom Wood Lake Rd" vs "11470 Bottom Wood Lake Road"). Use street-number + first-word prefix match; log unmatched stations to catch variants.

**GitHub Actions cron timing.** Can be delayed 5–15 minutes from the scheduled time. Acceptable for gas prices; don't promise minute-level freshness in the UI.

**DNS propagation.** Just changed at Namecheap. GitHub Pages custom-domain verification will fail until propagation completes. That's expected; check back periodically.

**EIA key exposure.** Once committed to a public repo, key is readable by anyone viewing the deployed site too. EIA's free tier has generous limits (5000 req/hour) and keys are easy to rotate. Acceptable for this use case.

**HTTPS enforcement timing.** Don't enable "Enforce HTTPS" in GitHub Pages settings until the custom-domain verification check is green, or you'll lock the site behind a broken cert briefly.

---

## Open questions for Zach (ask before assuming)

1. **Brand styling:** TANKFUL (uppercase, matches current CSS) or tankful (lowercase, preserves "thankful" wordplay)?
2. **Tagline preference** for hero/footer? Options floated in chat: "Be tankful you waited." / "Stay tankful." / "Know when to fill. Be tankful."
3. **Favicon refresh** now that the brand is Tankful? Current favicon is fine but the coral palette could shift if visual identity evolves with the rename. Probably defer.

None of these block the deploy or the scraper. Just ask before making decisions on Zach's behalf.

---

## What NOT to touch

- The theme color semantics (green = fill, red = wait) — explicitly chosen
- The icon (gas pump + clock dial) — explicitly chosen out of 4 concepts
- The mock data scenario — keep as-is for fallback
- The chart date formatter (manual months array) — bypasses a Windows en-CA locale quirk on purpose
