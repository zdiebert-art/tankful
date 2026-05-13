#!/usr/bin/env node
// Rasterizes assets/icon-source.svg into the PWA icon set + apple-touch-icon.
// Run once after editing the source SVG: `node tools/generate-icons.mjs`.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const SOURCE = resolve(ROOT, "assets/icon-source.svg");
const OUT_DIR = resolve(ROOT, "assets/icons");

// PWA manifest icons + iOS apple-touch + Android maskable + Chrome favicon
const TARGETS = [
  { name: "icon-192.png",          size: 192 },
  { name: "icon-512.png",          size: 512 },
  { name: "icon-512-maskable.png", size: 512 }, // identical content; the "maskable" purpose is set in the manifest, not the file
  { name: "apple-touch-icon.png",  size: 180 },
  { name: "favicon-32.png",        size: 32  },
  { name: "favicon-16.png",        size: 16  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const svg = await readFile(SOURCE);

  for (const t of TARGETS) {
    const out = resolve(OUT_DIR, t.name);
    await sharp(svg, { density: 384 })
      .resize(t.size, t.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`wrote ${t.name} (${t.size}×${t.size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
