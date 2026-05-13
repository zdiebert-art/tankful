/* ============================================
   TANKFUL — User Configuration
   Edit these values to wire up live data sources.
   ============================================ */

const TANKFUL_CONFIG = {
  // ---------- EIA Open Data API key ----------
  // Free signup (takes 30 seconds): https://www.eia.gov/opendata/register.php
  // Paste your key below — without it, WTI and RBOB stay on mock values.
  // Note: this key is exposed in the browser. That's fine for a personal-use app;
  // for a public site we'd wrap it in a serverless proxy.
  eiaApiKey: 'G3mmrnNw4ioCIVWXV4Xyy6MGX8SnuinaTTuWdNYb',

  // ---------- Refresh policy ----------
  // How long to keep a successful fetch in localStorage before re-fetching.
  // 60 min is plenty — these indicators don't move minute-to-minute.
  cacheTtlMin: 60,

  // ---------- Station prices ----------
  // Where to read scraped Lake Country prices. Defaults to a sibling JSON file
  // produced by the GitHub Actions scraper; override with a raw.githubusercontent
  // URL if the app is hosted separately from the data.
  // stationsUrl: 'https://raw.githubusercontent.com/zdiebert-art/tankful/main/data/lake-country-prices.json',

  // ---------- Debug ----------
  // Set true to log every fetch attempt + result to the browser console.
  debug: false
};
