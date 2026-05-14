#!/usr/bin/env node
// Sweep GasBuddy for every configured region (scrape/regions/*.js) and
// write a prices JSON + a rolling-history JSON for each. Also writes
// data/regions.json — the public manifest the frontend reads to populate
// the region picker + zone filter.

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

import { REGIONS } from "./regions/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const DATA_DIR  = resolve(REPO_ROOT, "data");

// Rolling-history retention: tiered to keep the file small forever.
//   - Last HOURLY_DAYS days: every scrape sample (hourly detail).
//   - Older than that, up to MAX_DAYS days: one average sample per day.
//   - Older than MAX_DAYS days: dropped.
const HOURLY_DAYS = 30;
const MAX_DAYS    = 365 * 5;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function log(...args)  { console.log("[scrape]", ...args); }
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

// Playwright fallback for the case where GasBuddy returns a static page
// with no prices in the markup (the JS-rendered path embeds them after
// hydration). Most of the time the cheerio pass already has prices.
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
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page
      .waitForSelector('[class*="GenericStationListItem-module__stationListItem"]', { timeout: 25_000 })
      .catch(() => {});
    await page.waitForTimeout(2_000);
    let html = "";
    try { html = await page.content(); } catch {}
    return html;
  } finally {
    await browser.close().catch(() => {});
  }
}

// GasBuddy uses CSS-modules with hashed suffixes — we match by class-name
// prefix so hash rotations don't break us.
function parseStations(html) {
  const $ = cheerio.load(html);
  const cards = $('[class*="GenericStationListItem-module__stationListItem"]');
  const out = [];

  cards.each((_, el) => {
    const $el = $(el);

    const addrHtml = $el.find('[class*="StationDisplay-module__address"]').first().html() || "";
    const addrLine = addrHtml.split(/<br\s*\/?>/i)[0].replace(/<[^>]+>/g, "").trim();
    if (!addrLine) return;

    const numMatch = addrLine.match(/^(\d{2,5})\s+(.*)$/);
    if (!numMatch) return;
    const number = numMatch[1];
    const street = numMatch[2].trim();

    const priceText = $el.find('[class*="StationDisplayPrice-module__price___"]').first().text().trim();
    const priceMatch = priceText.match(/(\d{2,3}\.\d)/);
    if (!priceMatch) return;
    const price = parseFloat(priceMatch[1]);
    if (!Number.isFinite(price) || price < 50 || price > 400) return;

    const reporterText = $el.find('[class*="ReportedBy-module__user"]').first().text().trim()
      .replace(/^[\s ]+|[\s ]+$/g, "");
    const reportedBy = reporterText || null;
    const reportedAgo = $el.find('[class*="ReportedBy-module__postedTime"]').first().text().trim() || null;
    const name = $el.find('[class*="StationDisplay-module__stationNameHeader"] a').first().text().trim() || null;

    out.push({ number, street, price, reportedBy, reportedAgo, name });
  });

  return out;
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

function matchStationsAgainstRegion(parsed, region) {
  const matched = [];
  const unmatched = [];
  const used = new Set();

  for (const known of region.stations) {
    const idx = parsed.findIndex((p, i) => {
      if (used.has(i)) return false;
      if (p.number !== known.number) return false;
      return p.street.toUpperCase().includes(known.streetKey);
    });
    if (idx >= 0) {
      used.add(idx);
      const p = parsed[idx];
      const trust = p.reportedBy === "Owner"
        ? "owner"
        : isStale(p.reportedAgo) ? "stale" : "user";

      matched.push({
        id: known.id,
        name: known.name || `${known.fuelBrand}${known.cstoreBrand ? " · " + known.cstoreBrand : ""}`,
        address: known.address,
        lat: known.lat,
        lng: known.lng,
        zone: known.zone || null,
        fuelBrand: known.fuelBrand || null,
        cstoreBrand: known.cstoreBrand || null,
        logoBrand: known.logoBrand || null,
        discount: known.discount || null,
        price: p.price,
        reportedBy: p.reportedBy,
        reportedAgo: p.reportedAgo,
        trust,
      });
    }
  }

  parsed.forEach((p, i) => {
    if (used.has(i)) return;
    unmatched.push({ number: p.number, street: p.street, price: p.price });
  });

  return { matched, unmatched };
}

function marketAverage(stations) {
  if (!stations.length) return null;
  const sum = stations.reduce((a, s) => a + s.price, 0);
  return Math.round((sum / stations.length) * 10) / 10;
}

// Tiered retention. Within last HOURLY_DAYS, keep every sample. Older
// samples get collapsed to one averaged entry per UTC day. Older than
// MAX_DAYS, dropped. Idempotent: a one-sample day group averages to itself.
function compactHistory(samples) {
  const now = Date.now();
  const hourlyCutoff = now - (HOURLY_DAYS * 86400000);
  const maxCutoff    = now - (MAX_DAYS * 86400000);

  const recent = [];
  const olderByDay = new Map();

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

async function appendHistory(historyPath, payload) {
  if (typeof payload.marketAverage !== "number" || !payload.stationCount) {
    log(`  history: skipping append (no usable market average)`);
    return;
  }

  let history = { region: payload.region, updatedAt: null, samples: [] };
  try {
    const raw = await readFile(historyPath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.samples)) history = parsed;
  } catch { /* file doesn't exist yet */ }

  const sample = {
    at: payload.fetchedAt,
    marketAverage: payload.marketAverage,
    stationCount: payload.stationCount,
  };

  const last = history.samples[history.samples.length - 1];
  if (last && last.at === sample.at) {
    history.samples[history.samples.length - 1] = sample;
  } else {
    history.samples.push(sample);
  }

  history.samples = compactHistory(history.samples);
  history.region = payload.region;
  history.updatedAt = payload.fetchedAt;

  await writeFile(historyPath, JSON.stringify(history, null, 2) + "\n", "utf8");
  log(`  history: ${sample.marketAverage}¢ appended (${history.samples.length} samples total)`);
}

// Sweep all postal codes for a region. De-dupe parsed entries by
// (number, street) so the same station found in multiple sweeps only
// counts once when matching.
async function sweepRegion(region) {
  const seen = new Map();
  for (const pc of region.postalCodes) {
    const url = `https://www.gasbuddy.com/home?search=${encodeURIComponent(pc)}&fuel=1&method=all&maxAge=0`;
    let html;
    try {
      html = await fetchHtml(url);
      log(`  ${pc}: fetched ${html.length} bytes`);
    } catch (err) {
      warn(`  ${pc}: plain fetch failed (${err.message}) — trying Playwright`);
      try {
        html = await fetchHtmlPlaywright(url);
      } catch (err2) {
        warn(`  ${pc}: Playwright failed too (${err2.message})`);
        continue;
      }
    }

    let parsed = parseStations(html);
    if (parsed.length === 0) {
      log(`  ${pc}: no prices in static HTML — trying Playwright`);
      try {
        const rendered = await fetchHtmlPlaywright(url);
        parsed = parseStations(rendered);
      } catch (err) {
        warn(`  ${pc}: Playwright fallback failed (${err.message})`);
      }
    }

    let added = 0;
    for (const p of parsed) {
      const key = `${p.number}|${p.street.toUpperCase()}`;
      if (!seen.has(key)) { seen.set(key, p); added++; }
    }
    log(`  ${pc}: parsed ${parsed.length}, ${added} new`);
    if (region.postalCodes.length > 1) {
      await new Promise(r => setTimeout(r, 1200));
    }
  }
  return [...seen.values()];
}

async function processRegion(region) {
  log(`\n--- region: ${region.id} (${region.postalCodes.length} postal code${region.postalCodes.length === 1 ? "" : "s"}) ---`);
  const parsed = await sweepRegion(region);
  log(`  total deduped: ${parsed.length}`);

  const { matched, unmatched } = matchStationsAgainstRegion(parsed, region);
  log(`  matched: ${matched.length}/${region.stations.length}`);
  if (unmatched.length) {
    log(`  unmatched (likely outside this region or card-locks): ${unmatched.length}`);
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    region: region.id,
    source: "gasbuddy.com",
    marketAverage: marketAverage(matched),
    stationCount: matched.length,
    stations: matched,
    diagnostics: {
      parsedCount: parsed.length,
      unmatched: unmatched.slice(0, 10),
    },
  };

  const pricesPath  = resolve(DATA_DIR, `${region.id}-prices.json`);
  const historyPath = resolve(DATA_DIR, `${region.id}-history.json`);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(pricesPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  log(`  wrote ${pricesPath}`);
  await appendHistory(historyPath, payload);

  return { region: region.id, matched: matched.length, total: region.stations.length };
}

// Public manifest the frontend reads. Just enough for the picker + zone
// filter — actual station data lives in the per-region prices JSON.
async function writeManifest() {
  const manifest = {
    updatedAt: new Date().toISOString(),
    regions: REGIONS.map(r => ({
      id: r.id,
      name: r.name,
      zones: r.zones || null,
      pricesUrl: `data/${r.id}-prices.json`,
      historyUrl: `data/${r.id}-history.json`,
    })),
  };
  const path = resolve(DATA_DIR, "regions.json");
  await writeFile(path, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  log(`wrote ${path}`);
}

async function main() {
  log(`sweeping ${REGIONS.length} region${REGIONS.length === 1 ? "" : "s"}`);

  const summaries = [];
  let anyMatched = false;
  for (const region of REGIONS) {
    try {
      const s = await processRegion(region);
      summaries.push(s);
      if (s.matched > 0) anyMatched = true;
    } catch (err) {
      warn(`region ${region.id} failed:`, err.message);
      summaries.push({ region: region.id, matched: 0, total: region.stations.length, error: err.message });
    }
  }

  await writeManifest();

  log(`\n--- summary ---`);
  for (const s of summaries) {
    const msg = s.error
      ? `${s.region}: FAILED (${s.error})`
      : `${s.region}: matched ${s.matched}/${s.total}`;
    log(`  ${msg}`);
  }

  if (!anyMatched) {
    warn("no regions matched any stations — leaving stub JSON for the app to fall back from");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[scrape:fatal]", err);
  process.exit(1);
});
