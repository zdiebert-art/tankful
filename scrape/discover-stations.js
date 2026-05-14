#!/usr/bin/env node
// One-off helper to enumerate gas stations in a given region by sweeping
// several postal codes through GasBuddy's standard search endpoint and
// merging the results from the embedded Apollo cache (no Playwright needed
// — the cache is in the static HTML).
//
//   node scrape/discover-stations.js [postal codes...]
//
// Uses curl for the actual HTTP fetch — node's built-in fetch trips
// GasBuddy's bot detection (TLS-fingerprint or header signature), but a
// real curl request passes. Parsing is plain node + a regex against the
// __APOLLO_STATE__ JSON blob, no extra deps needed.
//
// Defaults to Kelowna's five postal-code zones. Output is a deduplicated
// list (sorted by address) as a markdown table — paste-friendly for review.

import { spawnSync } from "node:child_process";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const DEFAULT_POSTAL_CODES = ["V1Y", "V1W", "V1V", "V1P", "V1X"];

function fetchSearch(postalCode) {
  const url = `https://www.gasbuddy.com/home?search=${encodeURIComponent(postalCode)}&fuel=1&method=all&maxAge=0`;
  const result = spawnSync("curl", [
    "-s", "-L",
    "-A", USER_AGENT,
    "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "-H", "Accept-Language: en-CA,en;q=0.9",
    "-H", "Cache-Control: no-cache",
    "-w", "\n__HTTP_CODE__:%{http_code}",
    url,
  ], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });

  if (result.error) throw new Error(`curl spawn failed: ${result.error.message}`);
  const codeMatch = result.stdout.match(/\n__HTTP_CODE__:(\d+)$/);
  const code = codeMatch ? parseInt(codeMatch[1], 10) : 0;
  const body = codeMatch ? result.stdout.slice(0, codeMatch.index) : result.stdout;
  if (code !== 200) throw new Error(`HTTP ${code} for ${postalCode}`);
  return body;
}

// Find `__APOLLO_STATE__ = {...};` in the inline script and brace-balance
// to the matching closing brace. The JSON is followed by more JS (e.g.
// window.gbcsrf), so a simple `};</script>` anchor doesn't work.
function extractApolloState(html) {
  const marker = "__APOLLO_STATE__";
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const eq = html.indexOf("=", start);
  let i = html.indexOf("{", eq);
  if (i < 0) return null;
  const begin = i;
  let depth = 0, inStr = false, esc = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  if (depth !== 0) return null;
  const json = html.slice(begin, i);
  try { return JSON.parse(json); } catch { return null; }
}

function parseStations(apolloState) {
  const out = [];
  for (const [key, val] of Object.entries(apolloState)) {
    if (!key.startsWith("Station:")) continue;
    if (!val || val.__typename !== "Station") continue;

    const id   = key.replace("Station:", "");
    const name = val.name || null;
    const brands = Array.isArray(val.brands) ? val.brands : [];
    const fuelBrand  = (brands.find(b => b && b.brandingType === "fuel")  || {}).name || null;
    const cstoreBrand = (brands.find(b => b && b.brandingType === "cstore") || {}).name || null;
    const addr     = val.address || {};
    const line1    = addr.line1 || null;
    const locality = addr.locality || null;
    const postal   = addr.postalCode || null;

    out.push({ id, name, fuelBrand, cstoreBrand, line1, locality, postal });
  }
  return out;
}

async function main() {
  const postalCodes = (process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_POSTAL_CODES);

  console.log(`[discover] sweeping ${postalCodes.length} postal codes: ${postalCodes.join(", ")}`);

  const byId = new Map();

  for (const pc of postalCodes) {
    process.stdout.write(`[discover] ${pc}... `);
    try {
      const html = fetchSearch(pc);
      const state = extractApolloState(html);
      if (!state) { console.log("no Apollo state"); continue; }
      const stations = parseStations(state);
      let added = 0;
      for (const s of stations) {
        if (!byId.has(s.id)) { byId.set(s.id, s); added++; }
      }
      console.log(`found ${stations.length}, ${added} new`);
    } catch (err) {
      console.log(`failed: ${err.message}`);
    }
    // small pause to be polite
    await new Promise(r => setTimeout(r, 1200));
  }

  const all = [...byId.values()]
    .filter(s => s.locality)
    .sort((a, b) => (a.locality + (a.line1 || "")).localeCompare(b.locality + (b.line1 || "")));

  console.log(`\n[discover] total unique stations: ${all.length}\n`);

  console.log(`| Fuel brand | C-store | Address | City | Postal | GB ID |`);
  console.log(`|---|---|---|---|---|---|`);
  for (const s of all) {
    const fuel = s.fuelBrand || "—";
    const cstore = s.cstoreBrand || "";
    const addr = s.line1 || "";
    console.log(`| ${fuel} | ${cstore} | ${addr} | ${s.locality || "—"} | ${s.postal || "—"} | ${s.id} |`);
  }

  const byLocality = new Map();
  for (const s of all) {
    const loc = s.locality || "—";
    byLocality.set(loc, (byLocality.get(loc) || 0) + 1);
  }
  console.log(`\n[discover] by locality:`);
  for (const [loc, n] of [...byLocality.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${loc}: ${n}`);
  }

  const fuelBrands = new Map();
  for (const s of all) {
    const b = s.fuelBrand || "(no fuel brand)";
    fuelBrands.set(b, (fuelBrands.get(b) || 0) + 1);
  }
  console.log(`\n[discover] by fuel brand:`);
  for (const [b, n] of [...fuelBrands.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${b}: ${n}`);
  }
}

main().catch(err => { console.error("[discover:fatal]", err); process.exit(1); });
