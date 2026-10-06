# Remotion Kinetic-Typography Caption Template

A production-grade **kinetic-typography** caption renderer built on top of Remotion. Renders word-by-word animated captions from an SRT file, synced to speech timings, with 4 switchable style presets, 12 entrance animation types, 11 emphasis effects, and a per-word role system.

---

## Quick Start

```bash
# Install dependencies
npm install

# Place your video and SRT
cp your-video.mp4   public/intro.mp4
cp your-captions.srt public/captions.srt

# Auto-assign roles, entrances & effects → writes public/captions.json
npm run analyze

# Preview in Remotion Studio
npm run dev

# Render preview (half-res, fast)
npm run preview

# Render final (max res, H.264 CRF 17)
npm run render
```

---

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Open Remotion Studio (hot-reload) |
| `npm run analyze` | Parse SRT → assign roles/effects → write `public/captions.json` |
| `npm run chunk` | Split SRT into layout chunks (alternative to analyze) |
| `npm run preview` | Render `out/preview.mp4` at 0.5× scale (fast preview) |
| `npm run render` | Render `out/intro.mp4` at full resolution, H.264 CRF 17 |
| `npm run srt:fit` | Re-chunk a raw/messy SRT into display-ready cues |
| `npm run srt:check` | Validate SRT timings and warn about issues |
| `npm run analyze:srt` | Old marker-based annotator (emphasis from `*asterisks*`) |
| `npm test` | Run unit tests |
| `npm run typecheck` | TypeScript type-check only |

---

## Configuration

Edit [`src/intro.config.ts`](src/intro.config.ts):

```ts
export const config: IntroConfig = {
  video: "intro.mp4",          // public/ video
  srt: "captions.srt",         // public/ SRT
  style: "bold-energetic",     // one of 4 presets (see below)
  cueSource: "srt",            // "srt" or "json" (captions.json)
  maxDurationSec: 30,

  layout: {
    anchor: { vertical: "center", horizontal: "center" },
    align: "center",
    safeArea: { x: 0.08, y: 0.08 },  // 8% safe margin
    offsetY: 0,                         // vertical nudge (px from center)
    maxWordsPerLine: 5,
    maxLinesPerChunk: 3,
  },
};
```

Props can also be overridden per-render via `props/final.json` / `props/preview.json` (passed to `--props`).

---

## Style Presets

Switch with `style` in `intro.config.ts` or via `props/final.json`.

| Preset | Look | Fonts | Accent |
|--------|------|-------|--------|
| `bold-energetic` | Heavy impact, punchy | Anton + Montserrat + Poppins | `#FFE600` yellow |
| `clean-minimal` | Refined, spacious | Inter (multiple weights) | `#38BDF8` sky-blue |
| `neon-techy` | Cyberpunk HUD | Space Grotesk + JetBrains Mono | `#00E5FF` cyan |
| `cinematic-elegant` | Film-grade, italic serif | Playfair Display + Montserrat | `#E5C07B` gold |

Legacy aliases `bold`, `minimal`, `neon`, `cinematic` are preserved for backward compatibility.

---

## Word Role System

`scripts/analyze.ts` auto-assigns a **role** to every word using heuristics:

| Role | Size | Weight | Use case |
|------|------|--------|----------|
| `hero` | 1.8–2.2× | Heavy | Numbers, long/key words, ALL-CAPS |
| `accent` | 1.3–1.4× | Medium-heavy | 5–6 letter words, clause emphasis |
| `normal` | 1.0× | Regular | Most spoken words |
| `connector` | 0.65× | Light, wide-tracked | Stopwords ("the", "of", "and") |

You can hand-edit any word in `public/captions.json`. AI tools can also fill this schema.

### captions.json Schema

```json
{
  "chunks": [
    {
      "start": 0.0,
      "end": 3.36,
      "lines": [
        {
          "words": [
            {
              "text": "24",
              "start": 1.33,
              "end": 1.56,
              "role": "hero",
              "effect": "count-up",
              "entrance": "scale-pop",
              "color": "#FFE600",
              "scale": 1.2
            }
          ]
        }
      ]
    }
  ]
}
```

All fields except `text`, `start`, `end`, `role` are optional — the renderer fills in defaults.

---

## Entrance Animation Types

> 12 distinct types, auto-varied so no two neighbouring words share the same one.

`mask-reveal` · `slide-up` · `slide-down` · `slide-left` · `slide-right` · `scale-pop` · `blur-in` · `letter-stagger` · `rotate-in` · `tracking-collapse` · `typewriter` · `slice-reveal`

---

## Emphasis Effects (on spoken word)

> 11 effects triggered at exact SRT word timings.

`highlight-wipe` · `underline-draw` · `squiggle-draw` · `color-flash` · `outline-fill` · `strike-through` · `impact-punch` · `glitch-rgb` · `glow-pulse` · `count-up` · `float-breathe`

---

## Motion Graphics

Per-chunk overlays (behind text, with parallax push-in):

- **Corner brackets** that draw on as the chunk enters
- **Expanding hero rings** on each hero-word beat
- **Gradient glow blob** that tracks the active hero word
- **Light sweep** across the text box at chunk entrance
- **Impact sparkles / particles** (deterministic, max 40, capped to 10 in preview)
- **Soft vignette** overlay

All randomness uses `random(seed)` — renders are fully deterministic.

---

## Preview Quality Mode

In `quality: "preview"` mode the renderer:

- Skips grain, motion blur, glitch overlays
- Caps particles at 10
- Skips CSS blur filters on exit animations

Set `quality: "preview"` in `props/preview.json` for fast iteration.

---

## Low-Quality Preview Render

```bash
npm run preview
# Renders out/preview.mp4 at 50% scale, uses preview.json props
```

---

## Full Render

```bash
npm run render
# Renders out/intro.mp4 at full resolution, H.264 CRF 17, uses final.json props
```

---

## Manual Chunk Overrides

To hand-edit the chunk breakdown, create `chunks.override.json`:

```json
{ "chunks": [ ... ] }
```

Then run `npm run chunk` — if the override file exists, it is used verbatim.

---

## File Structure

```
src/
  intro.config.ts        ← main configuration
  types.ts               ← all TypeScript types / schema
  template/
    LayeredCaption.tsx   ← top-level composition
    CaptionBlock.tsx     ← per-chunk orchestrator (push-in, exit)
    WordLayer.tsx        ← per-word entrance + emphasis rendering
    MotionGraphics.tsx   ← brackets, rings, glow blob, sweep, particles
    word-layout.ts       ← pre-computed word positions (centered, safe margin)
  styles/
    index.ts             ← getStyle() lookup
    presets.ts           ← enriched preset themes (roles + graphics)
    bold.ts / neon.ts / minimal.ts / cinematic.ts
    fonts.ts             ← @remotion/google-fonts loader
  effects/
    Grain.tsx            ← film grain + vignette
    Glitch.tsx           ← RGB split glitch
    ...
scripts/
  analyze.ts             ← SRT → captions.json (roles + effects)
  chunk.ts               ← SRT → chunks.json (layout chunks only)
  srt-fit.ts             ← re-chunk messy SRTs
public/
  intro.mp4              ← your source video (≤ 30 s)
  captions.srt           ← your SRT
  captions.json          ← auto-generated, hand-editable
props/
  preview.json           ← props for preview render
  final.json             ← props for final render
```
"# remotion-intro-captioner" 
"# remotion-intro-captioner" 
