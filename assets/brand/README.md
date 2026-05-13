# TankFul — Brand Assets

All vector files were generated from the master Illustrator export at
`tankFul-full-logo.svg`. The mark geometry, the wordmark (Europa
Grotesk SH Bold), and the tagline (Myriad Pro Regular, 200 tracking)
are all preserved as outlined paths — no external font files needed at
render time.

## Files

### Vectors (`assets/brand/*.svg`)

| File | What it is | Use when |
|---|---|---|
| `mark.svg` | Just the smiling-fuel-gauge mark. Uses `currentColor` for the stroke, so it inherits whatever text color it's nested in. Eye fill is `#ffffff`. | Anywhere the brand needs a small, monochrome icon on a light surface. |
| `mark-white.svg` | The mark in pure white, eye `fill="none"` so backgrounds show through. | On dark backgrounds — app icons, dark headers, hero overlays. |
| `mark-gradient.svg` | The mark with the brand gradient applied to the stroke. | When the mark stands alone on a white surface and needs to feel branded (hero illustrations, marketing surfaces). |
| `wordmark.svg` | Just "TankFul" set in Europa Grotesk SH Bold, outlined. Uses `currentColor`. | When the mark would crowd or duplicate an adjacent logo. Marketing copy, footer, watermarks. |
| `lockup-vertical.svg` | Mark above wordmark above tagline. Matches the supplied Illustrator design exactly. Uses `currentColor`. | Splash screens, decks, posters — any time the brand needs to read at full strength. |
| `lockup-vertical-white.svg` | Same lockup, white. | Same use cases on dark surfaces. |
| `lockup-horizontal.svg` | Mark on left, wordmark + tagline stacked on right. | Wide headers, email signatures, social-banner headers. |
| `lockup-horizontal-white.svg` | Horizontal lockup, white. | Dark headers. |

### Rasters (`assets/brand/png/*.png`)

Same files rendered to PNG by `tools/generate-brand-pngs.mjs` (Playwright + a real
Chromium so Poppins-fallback text would render correctly — though all text in
this package is outlined so that's belt-and-suspenders). Sizes:

- Marks: 1024×1024
- Wordmark: 2400×480
- Vertical lockups: 1600×1570
- Horizontal lockups: 2400×829

To re-export after editing any SVG:

```bash
cd tools
npm run brand
```

### App icons (`assets/icons/*.png`)

App-icon variants generated from `assets/icon-source.svg` (deep indigo →
violet gradient + white mark) via `tools/generate-icons.mjs`. Sizes match
manifest + Apple touch + favicon requirements:

- `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (PWA manifest)
- `apple-touch-icon.png` (180×180)
- `favicon-32.png`, `favicon-16.png`

To re-export: `cd tools && npm run icons`.

### Browser favicon (`assets/favicon.svg`)

Same gradient + white mark, sized for tab use (64×64 viewBox).

## Color tokens

| Token | Value | Where it shows up |
|---|---|---|
| brand-blue-deep   | `#1E3A8A` | First gradient stop (top-left of app icon) |
| brand-indigo      | `#4F46E5` | Mid gradient stop |
| brand-violet      | `#7E22CE` | Last gradient stop (bottom-right of app icon) |
| brand-white       | `#FFFFFF` | Mark stroke on dark surfaces |
| brand-near-black  | `#010101` | Mark stroke on light surfaces (from source SVG) |

Gradient angle: `135deg` (top-left → bottom-right).

## Fonts

- **Wordmark — Europa Grotesk SH Bold.** Commercial font; not on Google
  Fonts. All shipped assets carry the wordmark as outlined paths so this
  isn't a runtime dependency. For live HTML text on the site (e.g.
  `.brand-text` in the header), the CSS currently falls back to Poppins
  ExtraBold so the site reads cleanly without a license. To swap in the
  real font, drop the woff2 files in `assets/fonts/` and wire an
  `@font-face` rule in `css/styles.css`.
- **Tagline — Myriad Pro Regular, 200 tracking.** Also commercial, also
  shipped as outlined paths.

## Clear space + minimum sizing

- **Clear space around the lockup:** roughly the height of the wordmark's
  capital "T" on all four sides. Don't crowd it with other logos or copy.
- **Minimum mark size:** 24×24 px (favicon use). Below that the wink
  detail loses its read.
- **Minimum wordmark size:** "TankFul" wordmark at less than ~48 px height
  starts to lose the camel-case readability — pair with the mark or use
  the mark alone.

## Don't

- Don't recolor the mark in arbitrary colors. Stick to the gradient,
  brand-near-black, or brand-white.
- Don't rotate the lockup. The wink eye is directional.
- Don't combine the wink eye with a different mouth shape. The smile arc
  is paired with the wink line — together they form the face.
- Don't outline the wordmark with a stroke or apply a drop shadow.
