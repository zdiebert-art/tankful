# TankFul — Handoff Notes

> Read this before doing anything. It's the canonical "what's built / how it
> hangs together / what to be careful about" doc. Refresh it after large
> chunks of work.
>
> **Local path:** `F:\Voyager RV\19. APPS\gas-watch\`
> **GitHub:** https://github.com/zdiebert-art/tankful (public)
> **Live:** https://tankful.ca (GitHub Pages, HTTPS enforced)
> **Owner:** Zach Diebert · zdiebert@gmail.com · Lake Country, BC

---

## What this app is

A static HTML/JS dashboard that predicts when Lake Country / Kelowna pump
prices are about to rise or fall. Personal/family use, but engineered to
scale to acquaintances. Wordmark is **TankFul** (camel case — "T" + "F"
capitalized to lean on the "thankful" wordplay). Tagline: *more miles —
less money.*

---

## Live state at a glance

| | |
|---|---|
| Hosting | GitHub Pages, deploys from `main` |
| Custom domain | tankful.ca via Namecheap A-records (185.199.108-111.153) + CNAME file |
| HTTPS | Enforced (GitHub-issued cert, auto-renew) |
| PWA | Installable on iOS 16.4+ / Android Chrome / Edge desktop |
| Data scraper | GitHub Actions cron `0 */4 * * *`, commits `data/lake-country-prices.json` |
| History | `data/lake-country-history.json` appended each scrape (4 samples/day, capped at 400) |
| Service worker | Network-first for shell, cache-first for binary assets; CI auto-bumps cache version on every shell-touching push |
| EIA API key | Live in `js/config.js` (free tier, public exposure acceptable) |
| Cloudflare Push Worker | **Code shipped, not yet deployed** — see `cloudflare/SETUP.md` |

---

## Architecture (data flow)

```
                              ┌──────────────────────────────┐
                              │   GitHub Actions cron (4h)   │
                              │   scrape/fetch-prices.js     │
                              │   (cheerio + Playwright)     │
                              └────────────┬─────────────────┘
                                           │ commits
                                           ▼
        ┌──────────────────────────────────────────────────────────┐
        │   data/lake-country-prices.json + history.json (in repo) │
        └──────────────────────────────────────────────────────────┘
                                           │
                                           │ HTTPS fetch
                                           ▼
        ┌──────────────────────────────────────────────────────────┐
        │   tankful.ca (GitHub Pages, static)                      │
        │   index.html + css/styles.css + js/*.js                  │
        │   ┌──────────────────────────────────────────────────┐   │
        │   │ js/app.js orchestrates:                          │   │
        │   │  - applyLiveData()     (FX, WTI, RBOB, stations) │   │
        │   │  - computeLiveVerdict()  → score + breakdown     │   │
        │   │  - renderStations() / renderTips() / etc.        │   │
        │   └──────────────────────────────────────────────────┘   │
        │   sw.js: shell + offline cache + push handler            │
        └──────────────────────────────────────────────────────────┘
                                           ▲
                                           │ Web Push (planned)
        ┌──────────────────────────────────┴────────────────────┐
        │  Cloudflare Worker (cloudflare/push-worker.js)        │
        │  KV: subscriptions; cron checks score; sends pushes   │
        │  NOT YET DEPLOYED — see cloudflare/SETUP.md           │
        └───────────────────────────────────────────────────────┘
```

---

## Repo layout

```
index.html, cheatsheet.html        # the two pages
manifest.webmanifest, sw.js        # PWA shell
CNAME                              # tankful.ca for GitHub Pages
tankFul-icon.svg                   # AUTHORITATIVE source for the brand mark
tankFul-full-logo.svg              # AUTHORITATIVE source (mark + wordmark + tagline)
tankFul-logo.ai / .pdf             # Illustrator working files

assets/
  favicon.svg                      # gradient + white mark
  icon-source.svg                  # source for the PNG app icon set
  icons/                           # generated app icon PNGs (don't edit by hand)
  brand/                           # full brand package — see brand/README.md
  station-logos/                   # user-supplied brand SVGs for stations
  fonts/                           # (placeholder if Europa Grotesk gets licensed)

css/
  styles.css                       # main styles, theme system on body[data-state]
  print.css                        # cheatsheet print + screen

js/
  config.js                        # EIA key, pushWorkerUrl, debug flag
  mock-data.js                     # fallback data (Lake Country, May 12 2026 scenario)
  live-data.js                     # FX (BoC), WTI/RBOB (EIA), stations + history JSON
  score.js                         # legacy scoring helpers (stationSavings etc.)
  holidays.js                      # BC stat-holiday + long-weekend calendar
  location.js                      # geolocation + haversine + iOS/Google Maps URL
  refinery-alert.js                # manual supply-outage toggle (14-day auto-expiry)
  chart-config.js                  # ApexCharts setup
  push.js                          # subscribe/unsubscribe + service-worker plumbing
  pwa.js                           # SW registration + install prompts + auto-reload
  app.js                           # the orchestrator — DOM hydration + render
  card-reorder.js                  # PARKED — script tag commented out in index.html

scrape/
  fetch-prices.js                  # the scraper (run locally with `node scrape/fetch-prices.js`)
  package.json                     # cheerio + playwright

tools/
  generate-icons.mjs               # PWA icon set from icon-source.svg (sharp)
  generate-brand-pngs.mjs          # brand PNG exports from assets/brand/*.svg (Playwright)
  generate-vapid.mjs               # one-shot VAPID keypair for push
  package.json                     # tooling deps (sharp, playwright, web-push)

cloudflare/
  push-worker.js                   # Cloudflare Worker (VAPID JWT, KV subs, cron broadcast)
  wrangler.toml                    # deploy config
  SETUP.md                         # paste-by-paste deployment walkthrough

.github/workflows/
  refresh-prices.yml               # 4h cron scraper
  bump-sw-version.yml              # auto-stamps sw.js with commit SHA on shell-touching pushes
```

---

## Theme system

Three states drive everything via `body[data-state]`:

| state | Meaning | Page bg (`--bg-base`) | Hero text (`--hero-text`) | Verdict text (`--text`) |
|---|---|---|---|---|
| `fill-up` | Score ≥ 70 — "Fill Up Now" | very dark green `#08221A` | light green `#DDFBEC` | dark green (same as bg) |
| `neutral` | Score 30–69 — "Maybe Today" | very dark brown `#2A1D08` | light cream `#FFF3D6` | dark brown |
| `wait` | Score < 30 — "Wait a Bit" | very dark wine `#2D1B1B` | light coral `#FFE0B2` | dark wine |

Page background = verdict text color (`var(--text)`). Brand-icon chip + SVG
wordmark in the header also use `var(--text)` so they shift together when
the score state changes. Cards keep light-glass backgrounds → internal card
text reads dark.

App icon stays on its own deep-indigo → violet gradient (`#1E3A8A → #4F46E5
→ #7E22CE`) regardless of state — that's the brand identity, not the in-app
mood.

---

## Brand decisions (locked in)

- **Wordmark:** Europa Grotesk SH Bold (commercial; shipped as outlined
  paths so no font license is needed in-product). Tagline: Myriad Pro
  Regular w/ 200 tracking — also outlined.
- **Mark = TankFul winking-gauge** (latest geometry: `tankFul-icon.svg`,
  viewBox `0 0 388.37 420.73`). Eye fill is white on light surfaces,
  transparent on dark/gradient surfaces so the bg shows through the iris.
- **App icon BG** = brand gradient (deep indigo → violet). Mark = white.
- **Logos on station rows** = real brand SVGs (in `assets/station-logos/`).
  Treatment is deliberately distinct from the source listing: 26px,
  no white circle container, inline left of brand name. Parkway uses
  Shell's logo via `logoBrand: 'Shell'` override (it pumps Shell fuel).

---

## What's wired up (Definition-of-done checklist)

- [x] Scraper running every 4h, JSON populated with 8 stations
- [x] Live FX (BoC), WTI/RBOB (EIA) feeding indicator chips
- [x] BC holidays / long-weekend calendar driving modifiers + tips
- [x] Geolocation → "X.X km away" + tap-to-Maps directions (iOS → Apple Maps, else Google)
- [x] Live verdict + score + breakdown (heuristic — see `computeLiveVerdict` in `app.js`)
- [x] Mobile sticky-footer score legend (Fill Up · Maybe · Wait, top to bottom)
- [x] Refinery / supply-alert manual toggle in modifiers card
- [x] "Updated Xm ago" chip in where-card with last+next refresh tooltip
- [x] PWA installable; persistent footer "Install Tankful" button for re-install
- [x] Service worker network-first for shell with auto-reload on update
- [x] CI auto-bumps SW cache version on shell-touching pushes
- [x] Web Push code shipped on both sides (worker + frontend) — **not deployed**

---

## Open Ideas / hanging items

### Visual & assets
- **PWA app icon doesn't show new logo on installed devices** — icon PNGs
  in `assets/icons/` were regenerated with the new geometry, but iOS/Android
  cache install-time icons aggressively. Need a strategy to force-refresh:
  bump the `manifest.webmanifest` `start_url` query (`?v=2`), rename the
  icon filenames, or just accept that users have to uninstall + reinstall
  once. Worth testing on a real device which approach actually works.
- **Lockup SVGs are stale** — `assets/brand/lockup-vertical.svg`,
  `lockup-horizontal.svg` and their `-white.svg` + PNG variants still use
  the *previous* mark geometry. Should be regenerated with the new
  `tankFul-icon.svg` paths.
- **"below the market average" wording** — the verdict-sub and the
  Best-Deal hero card still use the "below market average" phrasing.
  User previously said they don't care about averages; should rephrase
  to lead with absolute price + "X¢ cheaper than the rest."

### Data accuracy
- **Chart still showing mock data** — the history pipeline (`bucketDaily` /
  `bucketWeekly` in `app.js`) only kicks in once we have ≥3 distinct days
  of cron-committed samples. Until then the chart shows the mock arrays
  with a "Sample data — real history accumulating" badge. After ~3 days
  it auto-switches to real data with no code change needed.
- **`cycleAge` + `30-Day Position` indicators are "pending"** — they need
  the history pipeline to mature (~7 days for cycle, ~30 days for range).
  Currently rendered dim with "Needs history" label. Once data exists,
  wire them into `applyLiveData()`.
- **Score formula is heuristic** — tuned with general BC market intuition,
  not real Lake Country historical data. Worth revisiting after a few
  months of real history to validate the weights (currently: holiday +8
  for May Long, ±15 from RBOB, ±8 from day-of-week, ±5 from FX).

### Region expansion
- **Kelowna + Vernon** marked "Soon" in the region picker but not
  implemented. Adding requires: (a) Kelowna/Vernon stations in
  `scrape/fetch-prices.js` STATIONS array, (b) `STATION_OVERLAY` entries
  in `app.js`, (c) the region-picker click handler to actually filter,
  (d) probably a per-region history file in `data/`.

### Push notifications (deployment)
- **Cloudflare Worker not yet deployed.** Frontend code ready (`js/push.js`,
  `sw.js` push handler, the "Get alerts" pill in the where-card header).
  Worker code lives in `cloudflare/push-worker.js` with the deployment
  walkthrough in `cloudflare/SETUP.md`. Until `pushWorkerUrl` in
  `js/config.js` is set, the bell button stays hidden so users don't see
  a half-wired prompt.
- **Decide notification frequency cap** — currently the worker's cron
  enforces "max one push per 12h" and "only when score ≥ 70". Tune once
  there's real-user feedback.

### Brand / typography
- **Europa Grotesk SH Bold for live HTML text** — currently the header
  wordmark uses outlined SVG paths (no font license needed). If we
  eventually want HTML text rendered in Europa Grotesk (e.g., for the
  cheatsheet headings), the font would need to be licensed and dropped
  into `assets/fonts/` with an `@font-face` rule.

### Refinery alert
- **Auto-detect refinery outages** — currently the supply-alert toggle is
  manual ("I heard about it on the radio, flip the switch"). Could
  potentially scrape BCUC announcements or a refining-news RSS feed.
  Low-priority but tempting.

---

## Reproducing common tasks

```bash
# Run the scraper locally (uses Playwright; one-time `npx playwright install chromium`)
node scrape/fetch-prices.js

# Regenerate the PWA app-icon PNG set from assets/icon-source.svg
cd tools && npm run icons

# Regenerate the brand-package PNGs from assets/brand/*.svg
cd tools && npm run brand

# Generate VAPID keys (one-time, for push worker setup)
cd tools && npm run vapid

# Serve the site locally (a real HTTP server is required — Geolocation
# and SW won't work on file://)
npx serve -l 8765 .
```

---

## Risks & gotchas

- **GasBuddy CSS-module hash rotation** — selectors in
  `scrape/fetch-prices.js parseStations()` use class-name *prefixes*
  (`[class*="GenericStationListItem-module__stationListItem"]`) so hash
  rotations don't break us, but a full class rename will. Symptom:
  `data/lake-country-prices.json` ends up with `stationCount: 0` and the
  workflow exits 1. The scraper logs unmatched parsed entries so it's
  easy to spot what changed.
- **GasBuddy ToS** — technically prohibits automated agents. We send a
  real User-Agent, keep volume to 6 req/day, don't republish the source
  identity, and would fold if served a complaint. Repo + tooltips
  intentionally avoid naming GasBuddy as the source.
- **Card-lock stations** (AFD Petroleum etc.) are deliberately excluded
  from STATIONS — they require fleet cards and aren't useful to public
  drivers. They'll keep showing up as "unmatched" in scraper logs;
  that's correct.
- **Service worker stale cache** was the cause of multiple "I uninstalled
  the PWA to see the update" episodes. Now fixed via network-first +
  auto-reload + CI auto-bump. If updates appear stuck again, check the
  Actions tab for failed `Bump SW cache version` runs.
- **GitHub Pages varnish** caches at the edge for ~10 minutes. New
  deploys reach all users within ~10 min of build completion. Hard
  refresh forces an edge revalidate immediately.

---

## How to bootstrap a fresh Claude session

```
Read BUILD-NOTES.md and the last 5 git commits, then ask me what I want to
work on.
```

That's enough to get oriented. If a question requires more context, ask —
don't guess.
