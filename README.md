# Remotion Kinetic-Typography Caption Template

A production-grade **kinetic-typography** caption renderer built on top of Remotion. Renders word-by-word animated captions from an SRT file, synced to speech timings, with 4 switchable style presets, 12 entrance animation types, 11 emphasis effects, and a per-word role system.

---

## Quick Start

```bash
# Install dependencies
npm install

# Place your video or pass its path directly to transcribe:
# Automatically transcribes audio -> public/captions.srt & public/words.json
npm run transcribe -- path/to/your-video.mp4

# Review public/captions.srt if desired, then generate captions.json:
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

| `npm run offline:setup` | One-time preparation: bundle all fonts, models, binaries, and generate manifest |
| `npm run offline:check` | Verify 100% offline readiness and render offline test still frame |
| `npm run batch` | Batch-process all videos in `input/` → `out/` (transcribe + analyze + render each) |
| `npm run batch:force-render` | Re-render all videos using existing `work/` files (skip transcription) |
| `npm run batch:force-all` | Redo everything from scratch for all videos |
| `npm run transcribe` | Extract audio → transcribe with local whisper.cpp → write `public/captions.srt` & `words.json` |
| `npm run auto` | Full end-to-end pipeline: `transcribe` → `srt:fit` → `analyze` |
| `npm run dev` | Open Remotion Studio (hot-reload) |
| `npm run analyze` | Parse SRT → align exact word timings & assign roles/effects → write `public/captions.json` |
| `npm run chunk` | Split SRT into layout chunks (alternative to analyze) |
| `npm run preview` | Render `out/preview.mp4` at 0.5× scale (fast preview) |
| `npm run render` | Render `out/intro.mp4` at full resolution, H.264 CRF 17 |
| `npm run srt:fit` | Re-chunk a raw/messy SRT into display-ready cues |
| `npm run srt:check` | Validate SRT timings and warn about issues |
| `npm run analyze:srt` | Old marker-based annotator (emphasis from `*asterisks*`) |
| `npm test` | Run unit tests |
| `npm run typecheck` | TypeScript type-check only |

> **Which script to use?** Use `analyze` for the recommended automatic kinetic typography pipeline (heuristic roles, animations, and exact word timings), `chunk` when you only want layout chunking with optional manual chunk overrides, and `analyze:srt` when you want legacy asterisk-based emphasis markers (`*word*`).

---

## Auto-transcription (video → captions)

Generate captions locally, offline, and for free using Remotion's bundled ffmpeg and `whisper.cpp`.

### Prerequisites & First-Run Notes
- **Local & Offline**: Runs fully on your machine with zero API keys or external services. Remotion's bundled ffmpeg is used automatically.
- **First Run**: Automatically downloads `whisper.cpp` (v1.5.5 prebuilt binary for Windows) and the Whisper model (~470 MB for the default `small.en` model) into `whisper.cpp/`. Subsequent runs use the cached files immediately.
- **Windows note**: If whisper.cpp ever needs to be compiled on Windows, ensure Visual Studio Build Tools (Desktop development with C++) and CMake are installed.

### Commands & Usage
```bash
# Transcribe an external video (copies it to public/intro.mp4 and generates captions)
npm run transcribe -- "C:\Videos\my-intro.mp4"

# Transcribe an existing public/intro.mp4
npm run transcribe

# Select a different Whisper model (base.en ~140 MB, small.en ~470 MB, medium.en ~1.5 GB)
npm run transcribe -- --model base.en

# Overwrite existing public/captions.srt
npm run transcribe -- --force

# Complete automated pipeline (transcribe -> srt:fit -> analyze)
npm run auto
```

### Review Step
After transcription:
1. Open and review `public/captions.srt` to tweak any wording or cue breaks.
2. Run `npm run analyze` to compute exact word alignments and assign kinetic typography animations into `public/captions.json`.
3. Preview with `npm run dev` or render with `npm run preview`.

---

## Batch Processing (multiple videos)

Process every video in a folder in one command — transcribe, analyze, and render each to its own output file.

### Quick start

```bash
# 1. Create the input folder and drop your videos in
mkdir input
# copy my-clip.mp4, "another clip.mp4", etc. into input/

# 2. Run the batch
npm run batch

# Results:
#   out/my-clip.mp4
#   out/another_clip.mp4   (spaces → underscores in stem)
#   work/<stem>/           intermediate files (SRT, words.json, captions.json, log.txt)
```

### How it works

```
input/<name>.mp4
  ↓  ffprobe probe
  ↓  whisper.cpp transcription  →  work/<stem>/captions.srt + words.json
  ↓  heuristic analyze          →  work/<stem>/captions.json
  ↓  stage per-video public dir →  work/<stem>/public/  (hard-linked video + captions.json)
  ↓  remotion render --public-dir=work/<stem>/public/
out/<stem>.mp4
```

Each video gets its own isolated working folder and its own Remotion `--public-dir`, so runs never overwrite each other. The existing `public/`, `npm run render`, and `npm run dev` workflow are completely unchanged.

### Folder layout

```
remotion-intro-captioner/
├── input/
│   ├── clip-a.mp4
│   ├── clip-b.mp4
│   └── clip-b.override.json     ← optional per-video config
├── work/
│   ├── clip-a/
│   │   ├── words.json
│   │   ├── captions.srt
│   │   ├── captions.json
│   │   ├── props.json           ← merged render props
│   │   ├── meta.json            ← source size+mtime for resume detection
│   │   ├── log.txt              ← full per-video log
│   │   └── public/              ← per-video public dir for Remotion
│   │       ├── intro.mp4        ← hard link to input video (fallback: copy)
│   │       └── captions.json
│   └── clip-b/
│       └── ...
├── out/
│   ├── clip-a.mp4
│   └── clip-b.mp4
└── public/                      ← untouched; used only by npm run dev / render
```

### CLI reference

```
npm run batch [-- [input-dir] [options]]

Arguments:
  input-dir              folder with video files  (default: input/)

Options:
  --force-render         re-render even if out/<stem>.mp4 already exists
                         (reuses existing work/<stem>/captions.json)
  --force-all            redo everything from scratch (re-transcribe + re-analyze + re-render)
  --model <name>         whisper model: base.en | small.en | medium.en  (default: small.en)
  --concurrency <n>      max parallel renders  (default: 1)
                         Transcription is always sequential regardless of this value.
  -h, --help             show help
```

### Resume support

The batch automatically skips videos that are already done:
- **Skipped** if `out/<stem>.mp4` exists AND `work/<stem>/meta.json` records the same file size and mtime as the current source. This means editing the source file triggers a full re-run.
- `--force-render` re-renders using cached `captions.json` (skips slow transcription).
- `--force-all` retranscribes and re-analyzes everything.

### Per-video config overlay

Place `<stem>.override.json` next to the video in the input folder:

```json
{
  "style": "editorial",
  "energy": 0.7,
  "maxWordsPerLine": 3,
  "maxLinesPerChunk": 2,
  "srtOffsetMs": -200
}
```

Valid keys: `looks`, `style`, `energy`, `maxWordsPerLine`, `maxLinesPerChunk`, `srtOffsetMs`, `debug`, `quality`.
Unknown keys produce a warning and are silently ignored — the batch never crashes on a bad override.

### Concurrency

| Stage | Behaviour |
|---|---|
| Transcription (whisper.cpp) | Always sequential — it's CPU-bound and uses all cores internally |
| Rendering (Remotion) | Controlled by `--concurrency` (default 1) |

Recommended settings:
- **16 GB RAM**: `--concurrency 1` (default) — one Chromium instance at a time
- **32 GB RAM**: `--concurrency 2` — safe, cuts wall-clock render time roughly in half

### Error handling

- One failure never stops the rest of the batch.
- Each video has its own `work/<stem>/log.txt` with a full trace.
- The summary at the end shows `[DONE]`, `[SKIP]`, or `[FAIL]` with the log path for failures.
- Leftover `.tmp.mp4` files from previous crashed runs are cleaned up at startup.

### Stem collision detection

If two files in the input folder would produce the same sanitized stem
(e.g. `my video.mp4` and `my_video.mp4` both become `my_video`), the second one
is immediately failed with a clear message. No silent overwrites.

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
  transcribe.ts          ← video → words.json & captions.srt (whisper.cpp)
  analyze.ts             ← SRT → captions.json (roles + effects)
  chunk.ts               ← SRT → chunks.json (layout chunks only)
  srt-fit.ts             ← re-chunk messy SRTs
public/
  intro.mp4              ← your source video (≤ 30 s)
  words.json             ← exact word timestamps from speech-to-text
  captions.srt           ← your SRT
  captions.json          ← auto-generated, hand-editable
props/
  preview.json           ← props for preview render
  final.json             ← props for final render
```
