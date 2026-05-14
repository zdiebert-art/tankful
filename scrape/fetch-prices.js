#!/usr/bin/env node
// Scrape Lake Country pump prices from GasBuddy and write data/lake-country-prices.json.
// Tries a plain fetch+cheerio pass first; if no prices parse out, falls back to Playwright.

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const OUTPUT_PATH  = resolve(REPO_ROOT, "data", "lake-country-prices.json");
const HISTORY_PATH = resolve(REPO_ROOT, "data", "lake-country-history.json");

// Rolling-history retention: tiered to keep the file small forever.
//   - Last HOURLY_DAYS days: every scrape sample (hourly detail).
//   - Older than that, up to MAX_DAYS days: one average sample per day.
//   - Older than MAX_DAYS days: dropped.
// At 15 scrapes/day + 5 years of daily backfill, the steady-state file holds
// ~2,300 samples (~200 KB) — tiny, but enough resolution for any chart view.
const HOURLY_DAYS = 30;
const MAX_DAYS    = 365 * 5;

const TARGET_URL =
  "https://www.gasbuddy.com/home?search=V4V+1W2&fuel=1&method=all&maxAge=0";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Known Lake Country stations — match by street number + first significant word of street.
// lat/lng are approximate (≤ 500m). Refine here if any "X.X km away" reading looks off
// on the live site; they are mirrored into the rendered station JSON.
//
// Deliberately excluded: card-lock / fleet-only stations (e.g. AFD Petroleum at 350
// Carion Rd, Kelowna). Those require a commercial access card so they're not useful
// to public drivers; they'll keep appearing as "unmatched" in scraper logs and that's
// the correct outcome — don't add them when expanding to Kelowna / Vernon.
const STATIONS = [
  { id: "canco",     name: "Canco Woodsdale",        number: "11470", streetKey: "BOTTOM",  address: "11470 Bottom Wood Lake Rd", lat: 50.0760, lng: -119.3995 },
  { id: "petrocan",  name: "Petro-Canada · 7-Eleven", number: "9724",  streetKey: "97",      address: "9724 BC-97",                 lat: 50.0432, lng: -119.4093 },
  { id: "petrocan-n", name: "Petro-Canada North",     number: "9855",  streetKey: "97",      address: "9855 BC-97 N",               lat: 50.0479, lng: -119.4078 },
  { id: "husky",     name: "Husky Hwy 97",           number: "10550", streetKey: "97",      address: "10550 BC-97",                lat: 50.0599, lng: -119.4007 },
  { id: "supersave", name: "Super Save Lake Country", number: "11751", streetKey: "97",      address: "11751 BC-97",                lat: 50.0918, lng: -119.3850 },
  { id: "parkway",   name: "Parkway (Shell)",        number: "11891", streetKey: "97",      address: "11891 BC-97",                lat: 50.0930, lng: -119.3835 },
  { id: "shell-lc",  name: "Shell Lake Country",     number: "9531",  streetKey: "97",      address: "9531 BC-97",                 lat: 50.0407, lng: -119.4108 },
  { id: "chevron",   name: "Chevron Lake Country",   number: "9450",  streetKey: "97",      address: "9450 BC-97",                 lat: 50.0395, lng: -119.4115 },
];

function log(...args) { console.log("[scrape]", ...args); }
function warn(...args) { console.warn("[scrape:warn]", ...args); }

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-CA,en;q=0.9",
      "Cache-Control": "no-cache",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from GasBuddy`);
  return res.text();
}

// Try to fetch with Playwright (only if installed) to handle client-rendered prices.
async function fetchHtmlPlaywright(url) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (err) {
    throw new Error(
      "Playwright not installed. In CI: `npx playwright install --with-deps chromium`. " +
      "Locally: `npm i -D playwright && npx playwright install chromium`."
    );
  }

  const browser = await chromium.launch({
    args: ["--disable-blink-features=AutomationControlled"],
  });

  try {
    const ctx = await browser.newContext({
      userAgent: USER_AGENT,
      locale: "en-CA",
      timezoneId: "America/Vancouver",
      viewport: { width: 1366, height: 900 },
      extraHTTPHeaders: {
        "Accept-Language": "en-CA,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const page = await ctx.newPage();

    // domcontentloaded is more reliable than networkidle on analytics-heavy pages.
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });

    // Wait for the actual station-card markup to mount (not just any price-shaped
    // text — the page embeds an Apollo cache with stray digits before the cards render).
    await page
      .waitForSelector('[class*="GenericStationListItem-module__stationListItem"]', { timeout: 25_000 })
      .catch(() => {});

    // Small settle so per-card prices populate after the cards mount.
    await page.waitForTimeout(2_000);

    let html = "";
    try { html = await page.content(); } catch {}
    return html;
  } finally {
    await browser.close().catch(() => {});
  }
}

// Extract station cards from GasBuddy's Next.js markup.
// GasBuddy uses CSS-modules with hashed suffixes — we match by class-name prefix
// (e.g. "StationDisplay-module__address") so a hash rotation doesn't break us.
function parseStations(html) {
  const $ = cheerio.load(html);
  const cards = $('[class*="GenericStationListItem-module__stationListItem"]');
  const out = [];

  cards.each((_, el) => {
    const $el = $(el);

    // Address: "<street>" then a <br> then "<locality>, <region>". cheerio's .text()
    // concatenates without separator, so we pull the raw HTML and split on <br>.
    const addrHtml = $el.find('[class*="StationDisplay-module__address"]').first().html() || "";
    const addrLine = addrHtml.split(/<br\s*\/?>/i)[0].replace(/<[^>]+>/g, "").trim();
    if (!addrLine) return;

    const numMatch = addrLine.match(/^(\d{2,5})\s+(.*)$/);
    if (!numMatch) return;
    const number = numMatch[1];
    const street = numMatch[2].trim();

    // Price: e.g. "203.9¢". Skip cards with no current price (will render blank/—).
    const priceText = $el.find('[class*="StationDisplayPrice-module__price___"]').first().text().trim();
    const priceMatch = priceText.match(/(\d{2,3}\.\d)/);
    if (!priceMatch) return;
    const price = parseFloat(priceMatch[1]);
    if (!Number.isFinite(price) || price < 50 || price > 400) return;

    // Reporter — "Owner" badge OR a member username. Same span class either way;
    // the inner text is "Owner" for dealer-reported.
    const reporterText = $el.find('[class*="ReportedBy-module__user"]').first().text().trim()
      .replace(/^[\s ]+|[\s ]+$/g, "");
    const reportedBy = reporterText || null;

    const reportedAgo = $el.find('[class*="ReportedBy-module__postedTime"]').first().text().trim() || null;

    const name = $el.find('[class*="StationDisplay-module__stationNameHeader"] a').first().text().trim() || null;

    out.push({ number, street, price, reportedBy, reportedAgo, name });
  });

  return out;
}

function matchStations(parsed) {
  const matched = [];
  const unmatched = [];

  // Match each known station to the first parsed entry sharing its street number,
  // optionally verifying the street keyword.
  const used = new Set();
  for (const known of STATIONS) {
    const candidate = parsed.find((p, i) => {
      if (used.has(i)) return false;
      if (p.number !== known.number) return false;
      const streetUpper = p.street.toUpperCase();
      return streetUpper.includes(known.streetKey);
    });
    if (candidate) {
      const idx = parsed.indexOf(candidate);
      used.add(idx);

      const trust = candidate.reportedBy === "Owner"
        ? "owner"
        : isStale(candidate.reportedAgo) ? "stale" : "user";

      matched.push({
        id: known.id,
        name: known.name,
        address: known.address,
        lat: known.lat,
        lng: known.lng,
        price: candidate.price,
        reportedBy: candidate.reportedBy,
        reportedAgo: candidate.reportedAgo,
        trust,
      });
    }
  }

  // Anything parsed but not matched to a known ID — surface for debugging.
  parsed.forEach((p, i) => {
    if (used.has(i)) return;
    unmatched.push({ number: p.number, street: p.street, price: p.price });
  });

  return { matched, unmatched };
}

function isStale(reportedAgo) {
  if (!reportedAgo) return true;
  const m = reportedAgo.match(/(\d+)\s+(minute|min|hour|hr|day)s?/i);
  if (!m) return true;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const hours = unit.startsWith("d") ? n * 24 : unit.startsWith("h") ? n : n / 60;
  return hours > 12;
}

function marketAverage(stations) {
  if (!stations.length) return null;
  const sum = stations.reduce((a, s) => a + s.price, 0);
  return Math.round((sum / stations.length) * 10) / 10;
}

async function writeOutput(payload) {
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
  log(`wrote ${OUTPUT_PATH}`);
}

// Append today's snapshot to the rolling history file, prune to the most
// recent HISTORY_MAX_SAMPLES, and write back. Skips entirely if the run
// produced no usable market average (so a broken scrape doesn't pollute
// the history with null gaps).
async function appendHistory(payload) {
  if (typeof payload.marketAverage !== "number" || !payload.stationCount) {
    log("skipping history append — no usable market average this run");
    return;
  }

  let history = { region: payload.region, updatedAt: null, samples: [] };
  try {
    const raw = await readFile(HISTORY_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.samples)) history = parsed;
  } catch {
    // File doesn't exist yet — start fresh.
  }

  const sample = {
    at: payload.fetchedAt,
    marketAverage: payload.marketAverage,
    stationCount: payload.stationCount
  };

  // Dedupe: if the most recent sample shares this exact timestamp (re-run of
  // the same scheduled tick), replace it; otherwise append.
  const last = history.samples[history.samples.length - 1];
  if (last && last.at === sample.at) {
    history.samples[history.samples.length - 1] = sample;
  } else {
    history.samples.push(sample);
  }

  history.samples = compactHistory(history.samples);
  history.region = payload.region;
  history.updatedAt = payload.fetchedAt;

  await writeFile(HISTORY_PATH, JSON.stringify(history, null, 2) + "\n", "utf8");
  log(`appended sample (${sample.marketAverage}¢) — history now has ${history.samples.length} entries`);
}

// Tiered retention. Samples within the last HOURLY_DAYS are kept verbatim.
// Older samples are grouped by UTC day and replaced with one averaged entry
// per day. Anything older than MAX_DAYS is dropped. Idempotent: running
// this on already-compacted data leaves it unchanged (one sample in a day
// averages to itself).
function compactHistory(samples) {
  const now = Date.now();
  const hourlyCutoff = now - (HOURLY_DAYS * 86400000);
  const maxCutoff    = now - (MAX_DAYS * 86400000);

  const recent = [];
  const olderByDay = new Map(); // "YYYY-MM-DD" → [samples]

  for (const s of samples) {
    const t = Date.parse(s.at);
    if (!Number.isFinite(t) || t < maxCutoff) continue;

    if (t >= hourlyCutoff) {
      recent.push(s);
    } else {
      const dayKey = new Date(t).toISOString().slice(0, 10);
      if (!olderByDay.has(dayKey)) olderByDay.set(dayKey, []);
      olderByDay.get(dayKey).push(s);
    }
  }

  const compactedOld = [];
  for (const [dayKey, group] of olderByDay) {
    const avgPrice = group.reduce((a, s) => a + s.marketAverage, 0) / group.length;
    const avgStations = Math.round(
      group.reduce((a, s) => a + (s.stationCount || 0), 0) / group.length
    );
    compactedOld.push({
      at: `${dayKey}T12:00:00.000Z`,
      marketAverage: Math.round(avgPrice * 10) / 10,
      stationCount: avgStations,
    });
  }

  return [...compactedOld, ...recent].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at)
  );
}

async function main() {
  log("fetching", TARGET_URL);

  let html;
  try {
    html = await fetchHtml(TARGET_URL);
    log(`fetched ${html.length} bytes via fetch()`);
  } catch (err) {
    warn("plain fetch failed:", err.message);
    html = "";
  }

  let parsed = html ? parseStations(html) : [];
  log(`cheerio parsed ${parsed.length} station-shaped entries from initial HTML`);

  if (parsed.length === 0) {
    log("no prices found in static HTML — trying Playwright fallback");
    try {
      const rendered = await fetchHtmlPlaywright(TARGET_URL);
      parsed = parseStations(rendered);
      log(`cheerio parsed ${parsed.length} entries after Playwright render`);
    } catch (err) {
      warn("Playwright fallback failed:", err.message);
    }
  }

  const { matched, unmatched } = matchStations(parsed);
  log(`matched ${matched.length}/${STATIONS.length} known stations`);
  if (unmatched.length) {
    warn(`${unmatched.length} parsed entries did not match a known station:`, unmatched);
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    region: "lake-country",
    source: "gasbuddy.com",
    marketAverage: marketAverage(matched),
    stationCount: matched.length,
    stations: matched,
    diagnostics: {
      parsedCount: parsed.length,
      unmatched: unmatched.slice(0, 10),
    },
  };

  await writeOutput(payload);
  await appendHistory(payload);

  if (matched.length === 0) {
    warn("no stations matched — leaving stub JSON for the app to fall back from");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[scrape:fatal]", err);
  process.exit(1);
});
