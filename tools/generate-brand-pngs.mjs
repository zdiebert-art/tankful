#!/usr/bin/env node
// Render every SVG in assets/brand/ to PNG at a usable high-res size.
//
// We use Playwright (a real browser) rather than sharp+libvips so the
// Poppins webfont actually loads — the lockups' wordmark + tagline rely
// on Poppins 900 / 500 weights from Google Fonts, which libvips can't
// fetch.
//
//   node tools/generate-brand-pngs.mjs

import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BRAND_DIR = resolve(ROOT, "assets/brand");
const OUT_DIR = resolve(BRAND_DIR, "png");

// Target widths per asset family. The aspect ratio is preserved.
const TARGET_WIDTHS = {
  'mark':                    1024,
  'mark-white':              1024,
  'mark-gradient':           1024,
  'wordmark':                2400,
  'lockup-vertical':         1600,
  'lockup-vertical-white':   1600,
  'lockup-horizontal':       2400,
  'lockup-horizontal-white': 2400,
};

// Background color injected behind the SVG when it's rendered. SVGs are
// transparent — for the white-text variants we render on a dark backdrop
// so the result looks like the asset would on its intended surface.
const BG_FOR = {
  'mark-white':                 '#1E3A8A',
  'lockup-vertical-white':      '#1E3A8A',
  'lockup-horizontal-white':    '#1E3A8A',
};

function parseViewBox(svg) {
  const m = svg.match(/viewBox\s*=\s*"\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*"/i);
  if (!m) throw new Error('viewBox not found');
  return { x: +m[1], y: +m[2], w: +m[3], h: +m[4] };
}

function htmlShellFor(svg, name) {
  const bg = BG_FOR[name] || 'transparent';
  return `<!doctype html>
<html><head>
  <meta charset="utf-8"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;900&display=swap" rel="stylesheet">
  <style>
    html, body { margin: 0; padding: 0; background: ${bg}; }
    body { display: flex; }
    svg { width: 100vw; height: auto; display: block; }
  </style>
</head><body>
${svg}
</body></html>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const entries = await readdir(BRAND_DIR);
  const svgs = entries.filter((f) => extname(f).toLowerCase() === ".svg");

  const browser = await chromium.launch();
  try {
    for (const f of svgs) {
      const name = basename(f, ".svg");
      const svgPath = resolve(BRAND_DIR, f);
      const svg = await readFile(svgPath, "utf8");
      const { w, h } = parseViewBox(svg);
      const targetW = TARGET_WIDTHS[name] || 1024;
      const targetH = Math.round((h / w) * targetW);

      const ctx = await browser.newContext({
        viewport: { width: targetW, height: targetH },
        deviceScaleFactor: 1,
      });
      const page = await ctx.newPage();
      await page.setContent(htmlShellFor(svg, name), { waitUntil: "networkidle" });
      // Belt + suspenders: wait for the document's font loader to finish.
      await page.evaluate(() => document.fonts && document.fonts.ready);

      const out = resolve(OUT_DIR, name + ".png");
      const omitBg = !(BG_FOR[name]);
      await page.screenshot({ path: out, fullPage: false, omitBackground: omitBg, type: 'png' });
      await ctx.close();
      console.log(`wrote ${name}.png (${targetW}×${targetH})`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
