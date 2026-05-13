# Tankful

A friendly weather-app-style dashboard that predicts when Kelowna / Lake Country pump prices are about to rise or fall. Built for personal use — share with the family, stick the cheat sheet on the fridge.

Live at **https://tankful.ca**.

## What it does

- **One big Fill-Up Score (0–100)** with a clear three-state verdict: Fill Up Now / Maybe Today / Wait a Bit
- **Indicator breakdown** showing how RBOB futures, WTI crude, the loonie, day-of-week, cycle age, and 30-day range each contribute to the score
- **Modifier chips** for long weekends, refinery outages, hurricane spillover, etc.
- **Three-tab price chart** — 7 days, 30 days, 1 year — with seasonal context
- **Printable cheat sheet** — 15 rules of thumb for Kelowna gas buying on a single page

## Project structure

```
Tankful/
├── index.html                   Main dashboard
├── cheatsheet.html              Printable one-pager
├── README.md
├── BUILD-NOTES.md               Handoff notes for Claude Code
├── css/
│   ├── styles.css               Main styles + three state themes
│   └── print.css                Cheat sheet screen + print
├── js/
│   ├── config.js                API keys + tunables (user-editable)
│   ├── mock-data.js             Fallback state, shape mirrors live
│   ├── live-data.js             BoC FX, EIA oil, scraped stations
│   ├── holidays.js              BC stat holiday + long-weekend calendar
│   ├── score.js                 Pure scoring functions
│   ├── chart-config.js          ApexCharts setup
│   └── app.js                   UI hydration & event wiring
├── scrape/
│   ├── fetch-prices.js          Node scraper (cheerio + Playwright fallback)
│   ├── package.json
│   └── package-lock.json
├── data/
│   └── lake-country-prices.json Output of the cron scraper
├── .github/workflows/
│   └── refresh-prices.yml       Cron + workflow_dispatch
└── assets/
    └── favicon.svg
```

## Running it locally

It's pure static HTML/CSS/JS — but **must be served over HTTP**, not opened as a `file://` URL, because `js/live-data.js` fetches `./data/lake-country-prices.json` (and `fetch()` is blocked on `file://`).

```bash
# Option 1: VS Code Live Server extension — right-click index.html → "Open with Live Server"

# Option 2: Node
npx serve -l 8765 .

# Option 3: Python (if installed)
python -m http.server 8765
```

Then visit http://localhost:8765/.

## Demo modes (mock data only)

While we're still on mock data, you can preview each of the three states by adding a URL parameter:

- `index.html?demo=fill-up` — coral / sunset (default)
- `index.html?demo=neutral` — warm amber
- `index.html?demo=wait` — mint / emerald

Useful for showing the wife and family the different looks.

## Deployment

Tankful is live at **https://tankful.ca**, hosted on GitHub Pages from this repo's `main` branch. The repo root contains a `CNAME` file pointing at `tankful.ca`; DNS A-records at Namecheap point at GitHub Pages' four IPs.

To deploy a fork: enable Pages on `main` (Settings → Pages), drop your own domain in the CNAME file, and configure DNS the same way.

## Hosting on your own server

Drop the folder anywhere your web server can serve static files. No build step, no Node, no dependencies — everything loads from CDN (Google Fonts + ApexCharts).

If you want zero CDN reliance (fully offline-capable), you can later download `apexcharts.min.js` locally and self-host Poppins. Not needed for now.

## Live data layer

The dashboard hydrates from three sources, each independent and each safe to fail:

| Source | What it provides | Where it's wired |
|---|---|---|
| **Bank of Canada Valet** | USD/CAD daily fixing (no API key) | `js/live-data.js` → `fetchFX()` |
| **EIA Open Data v2** | WTI Cushing + NY Harbor RBOB spot (free key required) | `js/live-data.js` → `fetchWTI()` / `fetchRBOB()` |
| **GasBuddy via GitHub Actions** | Lake Country station prices, every 4h | `scrape/fetch-prices.js` → commits `data/lake-country-prices.json` |

`js/holidays.js` produces the upcoming BC statutory days and long weekends — computed from real today, no API.

### Adding the EIA key

Free signup (~30 seconds): https://www.eia.gov/opendata/register.php. Drop the key into `js/config.js`:

```js
const TANKFUL_CONFIG = { eiaApiKey: 'paste-here', ... };
```

Without a key, WTI/RBOB chips stay on mock; FX and stations still work.

## How the price scraper works

[`.github/workflows/refresh-prices.yml`](.github/workflows/refresh-prices.yml) runs `scrape/fetch-prices.js` on a `0 */4 * * *` cron (every 4 hours, UTC). It can also be triggered manually:

```bash
gh workflow run "Refresh Lake Country prices"
```

The scraper:

1. Tries a plain `fetch()` against `gasbuddy.com/home?search=V4V+1W2&fuel=1` — Cloudflare returns 403, expected.
2. Falls back to Playwright + Chromium (downloaded fresh per run in CI), waits for the station-card DOM to mount.
3. Parses station entries by CSS-module class prefix (e.g. `[class*="GenericStationListItem-module__stationListItem"]`).
4. Matches by street number + first significant street keyword against the seven known Lake Country stations.
5. Writes `data/lake-country-prices.json` and auto-commits with `tankful-bot` if it changed.

### Running the scraper locally

```bash
cd scrape
npm ci
npx playwright install chromium     # one-time
node fetch-prices.js                # writes ../data/lake-country-prices.json
```

### Adding / changing stations

Edit the `STATIONS` array near the top of [`scrape/fetch-prices.js`](scrape/fetch-prices.js) (id, address, street keyword), then mirror the new id into `STATION_OVERLAY` inside [`js/app.js`](js/app.js) so the UI knows the brand label and whether to apply a card discount. Mock fallback entries live in [`js/mock-data.js`](js/mock-data.js).

### When GasBuddy changes its markup

The CSS-module hash suffixes (`___3rARL`) can rotate on any GasBuddy build. We match on the prefix so hash rotation is safe, but a full class rename will break parsing. Symptom: `data/lake-country-prices.json` will have `stationCount: 0` and the workflow exits 1. Re-run the scraper with the `debug-dump` helper to capture fresh HTML and update the selectors.

GasBuddy's ToS technically prohibits automated agents. This is an informed personal-use call — 6 requests/day for a 4-station family-use app. The repo is private. If GasBuddy ever sends a complaint, fold and switch to a manual one-tap report form.

## Roadmap

### ✅ Visual prototype (shipped)
- Full UI with realistic mock data + three state themes
- Chart with 7/30/365 day tabs
- Printable cheat sheet
- Demo URL params for family show-and-tell

### ✅ Live data layer (shipped)
- Bank of Canada FX
- EIA WTI + NYH RBOB (with optional free key)
- GasBuddy scraper via GitHub Actions
- BC stat holidays + long weekends, computed live

### Next up
- Wire the score number to recompute from live indicators (currently reads from mock)
- Mobile/PWA polish (add to home screen, web app manifest)
- Email/text alert hook when a "Fill Up Now" trigger fires
- Refinery outage manual override toggle

## Key data context (baked into the formula)

- **BC carbon tax was eliminated April 1, 2025** — was 17.61¢/L
- **Federal excise tax is suspended April 20 – September 7, 2026** — saves 10¢/L during that window
- **BC motor fuel tax (Rest of B.C.):** 14.50¢/L — applies to Lake Country
- **GST:** 5% applied on top of everything
- **No TransLink (18.5¢) or Victoria (5.5¢) transit levy** — that's why Kelowna runs ~15¢/L below Vancouver

Translation: subtract roughly 25¢/L from the Kelowna pump price to see the "real" supply-side number. Below $1.10/L raw is a very good price by 2024–2026 standards.

## Sources

- **BCUC Gas Prices BC** — gaspricesbc.ca/MarketConditions
- **Natural Resources Canada** — daily by-city retail
- **EIA Open Data v2** — WTI, Brent, NYH RBOB
- **Bank of Canada Valet** — USD/CAD
- **Kalibrate** — refining margin context

---

Built for Lake Country. Powered by Poppins, ApexCharts, and a lot of free public data.
