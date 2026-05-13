# Gas Watch — Build Notes

Handoff doc for Claude Code. Read this first.

---

## What this app is

Static HTML/JS dashboard predicting Lake Country / Kelowna pump prices. Single-page, no build step, no framework. Vanilla JS hydrated from a global state object. Designed mobile-first, deployable as static files anywhere.

Hosted locally at `F:\Voyager RV\19. APPS\gas-watch\`.

---

## Current state (already built)

- **UI complete** — score ring, verdict, price pill, where-to-fill cards, price-history chart, why-this-score components, holiday modifiers, tips, footer cheatsheet link
- **Mock data driving everything** — `js/mock-data.js` has a May 12 2026 Lake Country scenario (Tuesday, post-Iran/Hormuz spike, 6 days before Victoria Day, market at 203¢/L)
- **Live data layer partially wired:**
  - `js/live-data.js` — fetchers for Bank of Canada FX (working, no key needed) + EIA WTI/RBOB (needs free key in `js/config.js`)
  - `js/app.js` `kickoffLiveData()` fires after initial mock render, patches `GW_MOCK.components` with live values, re-renders
  - Footer `#liveStatus` displays fetch state
- **Theme system** — three states via `body[data-state]`: `fill-up` (green = go), `neutral` (amber = maybe), `wait` (red = don't). Live score number not yet computed from indicators, currently reads from mock.

---

## What we're building now: GitHub Actions price scraper

**Goal:** Scrape Lake Country station prices from GasBuddy every 4 hours, commit results to the repo as JSON, have the app fetch that JSON and display real station prices.

### Target URL
`https://www.gasbuddy.com/home?search=V4V+1W2&fuel=1&method=all&maxAge=0`

V4V 1W2 is the Lake Country postal code.

### Stations to extract (match by address — names vary)

| App ID       | Address                       | Display name              |
|--------------|-------------------------------|---------------------------|
| `canco`      | 11470 Bottom Wood Lake Rd     | Canco Woodsdale           |
| `petrocan`   | 9724 BC-97                    | Petro-Canada · 7-Eleven   |
| `husky`      | 10550 BC-97                   | Husky Hwy 97              |
| `supersave`  | 11751 BC-97                   | Super Save Lake Country   |

Also capture if present (bonus stations, not on app yet but interesting):
- `parkway` at 11891 BC-97 (Shell-branded)
- `shell-lc` at 9531 BC-97
- `chevron` at 9450 BC-97

### Output: `data/lake-country-prices.json`

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

**`trust` values:**
- `owner` — GasBuddy "Owner" badge (dealer-reported, most reliable)
- `user` — community-reported (username shown)
- `stale` — older than 12 hours

### Schedule
Every 4 hours: cron `0 */4 * * *`

### Approach
1. `fetch()` the GasBuddy URL with a real-looking User-Agent
2. Parse HTML with `cheerio`
3. **Likely server-rendered.** If `cheerio` returns no prices, fall back to Playwright (slower but still free in Actions runners — install with `npx playwright install --with-deps chromium`)
4. Match results to known station IDs by address prefix
5. Write JSON to `data/lake-country-prices.json`, commit, push back to repo

### Files to create

```
scrape/
  package.json              # cheerio, optional node-fetch
  fetch-prices.js           # the scraper
.github/workflows/
  refresh-prices.yml        # cron workflow
data/
  lake-country-prices.json  # output (initial empty stub)
```

### Repo setup (Claude Code does this)
1. `git init` in the gas-watch folder (`F:\Voyager RV\19. APPS\gas-watch\`)
2. `.gitignore` for `node_modules`, `.DS_Store`, `package-lock.json` optional
3. `gh repo create` (private, prompts if needed)
4. Initial commit + push
5. **Test manually first:** run `node scrape/fetch-prices.js` locally before relying on the cron
6. Push and verify Actions tab shows the workflow on next scheduled run (or trigger manually via `workflow_dispatch`)

### App-side wiring (do AFTER scraper produces valid JSON)

In `js/live-data.js`:
- Add `fetchStations()` calling `https://raw.githubusercontent.com/{user}/gas-watch/main/data/lake-country-prices.json`
- Cache with same localStorage pattern as FX/WTI
- Add to `fetchAll()` return object as `stations`

In `js/app.js` `applyLiveData()`:
- When `live.stations.success`, overwrite `state.stations` array (mapping by ID), update `state.marketPrice` to `live.stations.marketAverage`
- Re-render via `renderStations(state)` after patching
- Update `#liveStatus` to include station refresh timestamp

---

## File structure conventions

```
index.html              # main dashboard
cheatsheet.html         # printable rules page
css/styles.css          # main styles, CSS custom props for theming
css/print.css           # cheatsheet print styles
js/config.js            # user-editable (API keys, refresh interval)
js/mock-data.js         # fallback data, mirrors live shape exactly
js/live-data.js         # fetchers (BoC, EIA, soon GasBuddy JSON)
js/score.js             # pure scoring functions
js/chart-config.js      # ApexCharts setup
js/app.js               # DOM hydration + event wiring
assets/favicon.svg      # outline gas pump w/ clock dial
```

---

## User context (Zach)

- Marketing Manager at Voyager RV, Lake Country BC
- This app is personal / family use, not commercial
- Direct, outputs-focused. Skip explanations of basic stuff
- Doesn't write code himself — needs complete working files
- Multi-file projects preferred over single-file
- Mobile-first PWA mindset (this app should eventually be installable)
- Typography enthusiast (Poppins on this app, round-O preferred)
- Hard-refresh (Ctrl+Shift+R) is the in-browser iteration loop

---

## Known risks / things to handle

**GasBuddy may client-render.** If `cheerio` finds no `$\d+\.\d+¢` in the HTML, switch to Playwright. Worth checking with a single curl/fetch first to avoid the heavier dep.

**GasBuddy ToS prohibits automated agents.** This is an informed personal-use call — 6 requests/day for a 4-station family-use app. Mitigations: send a real User-Agent, keep volume reasonable, don't republish data publicly. If GasBuddy ever sends a cease-and-desist, fold and switch to a one-tap user-report form.

**Address matching may break.** GasBuddy might normalize addresses differently than expected ("11470 Bottom Wood Lake Rd" vs "11470 Bottom Wood Lake Road"). Build the matcher to use prefix-match on the street number + first significant word, and log any unmatched stations so we can catch new variants quickly.

**Cron timing.** GitHub Actions cron isn't precise — can be delayed 5-15 min. That's fine for gas prices. Don't promise minute-level freshness in the UI.

**Time zone.** GasBuddy displays "Minutes Ago" / "Hours Ago" in local time. Store the `fetchedAt` as ISO UTC; parse the "Ago" string heuristically into approximate age.

---

## What to NOT touch

- The theme system (CSS custom props on `body[data-state]`)
- The icon (gas pump with clock dial) — already chosen
- The brand text "GAS WATCH" caps style — already chosen
- The mock data scenario — keep as fallback, don't delete

---

## Definition of done for this build

- [ ] `data/lake-country-prices.json` populated with at least 4 stations on every cron run
- [ ] Workflow runs cleanly in Actions tab (green checkmark)
- [ ] App displays live station prices on hard-refresh (footer shows "Live • stations + FX" or similar)
- [ ] If GasBuddy fetch fails, app falls back to mock without breaking
- [ ] README updated with setup notes for future-Zach
