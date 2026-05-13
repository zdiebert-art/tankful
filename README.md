# Gas Watch

A friendly weather-app-style dashboard that predicts when Kelowna / Lake Country pump prices are about to rise or fall. Built for personal use — share with the family, stick the cheat sheet on the fridge.

## What it does

- **One big Fill-Up Score (0–100)** with a clear three-state verdict: Fill Up Now / Maybe Today / Wait a Bit
- **Indicator breakdown** showing how RBOB futures, WTI crude, the loonie, day-of-week, cycle age, and 30-day range each contribute to the score
- **Modifier chips** for long weekends, refinery outages, hurricane spillover, etc.
- **Three-tab price chart** — 7 days, 30 days, 1 year — with seasonal context
- **Printable cheat sheet** — 15 rules of thumb for Kelowna gas buying on a single page

## Project structure

```
Gas Watch/
├── index.html              Main dashboard
├── cheatsheet.html         Printable one-pager
├── README.md
├── css/
│   ├── styles.css          Main styles + three state themes
│   └── print.css           Cheat sheet screen + print
├── js/
│   ├── mock-data.js        Mock Kelowna state (replaced in Session 2)
│   ├── score.js            Pure scoring functions
│   ├── chart-config.js     ApexCharts setup
│   └── app.js              UI hydration & event wiring
├── assets/
│   └── favicon.svg
└── data/                   (reserved for Session 3 historical JSON)
```

## Running it locally

It's pure static HTML/CSS/JS. Just open `index.html` in any modern browser.

For the cleanest dev experience (live reload, proper URL handling), spin up any static server:

```bash
# Option 1: VS Code Live Server extension — right-click index.html → "Open with Live Server"

# Option 2: Python (if installed)
python -m http.server 8000

# Option 3: Node
npx serve .
```

Then visit `http://localhost:8000`.

## Demo modes (mock data only)

While we're still on mock data, you can preview each of the three states by adding a URL parameter:

- `index.html?demo=fill-up` — coral / sunset (default)
- `index.html?demo=neutral` — warm amber
- `index.html?demo=wait` — mint / emerald

Useful for showing the wife and family the different looks.

## Deploying to GitHub Pages

1. Create a new GitHub repo (e.g., `gas-watch`).
2. Push everything in this folder to the `main` branch.
3. Repo → Settings → Pages → set Source to "Deploy from a branch", branch `main`, folder `/ (root)`.
4. It'll publish at `https://<your-username>.github.io/gas-watch/` within ~1 minute.

For a custom domain (e.g., `gas.voyagerrv.ca`), add a `CNAME` file with that hostname and configure DNS.

## Hosting on your own server

Drop the folder anywhere your web server can serve static files. No build step, no Node, no dependencies — everything loads from CDN (Google Fonts + ApexCharts).

If you want zero CDN reliance (fully offline-capable), you can later download `apexcharts.min.js` locally and self-host Poppins. Not needed for now.

## Roadmap

### ✅ Session 1 — Visual prototype (you are here)
- Full UI with realistic mock data
- All three state themes working
- Chart with 7/30/365 day tabs
- Printable cheat sheet
- Demo URL params for family show-and-tell

### Session 2 — Live data
- Bank of Canada Valet API → USD/CAD
- EIA Open Data v2 → WTI, Brent, NY Harbor RBOB spot (weekly proxy for futures)
- Either accept weekly RBOB lag, or stand up a tiny Cloudflare Worker proxy for `RB=F`
- Long-weekend calendar built-in (Canadian stat holidays through 2027)

### Session 3 — Historical Kelowna baseline
- Scrape NRCan by-city tool (https://www2.nrcan-rncan.gc.ca/eneene/sources/pripri/prices_bycity_e.cfm) for 2016–2026 daily Kelowna history
- Save as `data/kelowna-history.json` in the repo
- Optional: GitHub Action to refresh nightly

### Session 4 — Polish & ship
- Refinery outage manual override toggle (no free API exists)
- Mobile/PWA polish (add to home screen, web app manifest)
- Email/text alert hook if a "Fill Up Now" trigger fires

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
