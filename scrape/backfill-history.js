#!/usr/bin/env node
// One-off backfill script: rebuilds data/<region>-history.json by walking
// every git commit that touched data/<region>-prices.json, extracting the
// fetchedAt + marketAverage + stationCount from each snapshot.
//
// Used once on 2026-06-02 to recover ~3 weeks of history that the workflow
// had been silently dropping (it staged *-prices.json but not *-history.json).
// Safe to re-run: existing samples are merged + de-duped by timestamp before
// the same compactHistory pass the live scraper uses.
//
//   node scrape/backfill-history.js                # both regions
//   node scrape/backfill-history.js lake-country   # one region

import { writeFile, readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

// Same tiered retention as the live scraper.
const HOURLY_DAYS = 30;
const MAX_DAYS    = 365 * 5;

function compactHistory(samples) {
  const now = Date.now();
  const hourlyCutoff = now - (HOURLY_DAYS * 86400000);
  const maxCutoff    = now - (MAX_DAYS    * 86400000);
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

function gitListCommits(pricesPath) {
  // Reverse-chronological is the natural order; we want oldest first.
  const out = execSync(
    `git log --reverse --format=%H -- "${pricesPath}"`,
    { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 100 * 1024 * 1024 }
  );
  return out.split("\n").map(s => s.trim()).filter(Boolean);
}

function gitShowFile(sha, path) {
  try {
    return execSync(`git show ${sha}:${path}`, {
      cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 100 * 1024 * 1024
    });
  } catch {
    return null;
  }
}

async function backfillRegion(regionId) {
  const pricesPath  = `data/${regionId}-prices.json`;
  const historyPath = resolve(REPO_ROOT, `data/${regionId}-history.json`);

  console.log(`\n--- ${regionId} ---`);
  const commits = gitListCommits(pricesPath);
  console.log(`  found ${commits.length} commits touching ${pricesPath}`);

  // Load existing history so we keep anything that's already there.
  let existing = [];
  try {
    const raw = await readFile(historyPath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.samples)) existing = parsed.samples;
  } catch { /* no existing file */ }
  console.log(`  existing history samples: ${existing.length}`);

  const seen = new Set(existing.map(s => s.at));
  const fresh = [];

  for (const sha of commits) {
    const content = gitShowFile(sha, pricesPath);
    if (!content) continue;
    let p;
    try { p = JSON.parse(content); } catch { continue; }
    if (typeof p.marketAverage !== "number" || !p.stationCount || !p.fetchedAt) continue;
    if (seen.has(p.fetchedAt)) continue;
    fresh.push({
      at: p.fetchedAt,
      marketAverage: p.marketAverage,
      stationCount: p.stationCount,
    });
    seen.add(p.fetchedAt);
  }
  console.log(`  reconstructed ${fresh.length} new samples from commits`);

  const merged = [...existing, ...fresh].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at)
  );
  const compacted = compactHistory(merged);
  console.log(`  after compact: ${compacted.length} samples`);

  const out = {
    region:    regionId,
    updatedAt: compacted.length ? compacted[compacted.length - 1].at : new Date().toISOString(),
    samples:   compacted,
  };
  await writeFile(historyPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`  wrote ${historyPath}`);
}

async function main() {
  const regionArg = process.argv[2];
  const regions = regionArg ? [regionArg] : ["lake-country", "kelowna"];
  for (const r of regions) {
    try { await backfillRegion(r); }
    catch (err) { console.error(`  ${r} failed:`, err.message); }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
