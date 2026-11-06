# Offline Guide: Remotion Intro Captioner

This document explains how to run this Remotion captioning project **100% offline** after a one-time online preparation step. All external resources (fonts, speech recognition models, processing binaries, browser runtime, and packages) are stored locally in the project.

---

## 1. Quick Start

### One-Time Setup (While Online)
Run the automated setup script to download and localize missing dependencies, bundle all font weights, synchronize models and binaries, pre-cache the Remotion Chromium browser, and generate the asset manifest:
```bash
npm install
npm run offline:setup
```

### Verification (Offline)
To verify that everything works locally without touching the network:
```bash
npm run offline:check
```
This command runs in strict offline mode (`OFFLINE=1`, `NO_UPDATE_NOTIFIER=1`, `REMOTION_DISABLE_TELEMETRY=1`), validates every asset against `assets/manifests/manifest.json`, and renders a test still frame (`out/verify-offline-still.png`) using the local browser and local fonts.

---

## 2. Centralized Local Asset Directory (`assets/`)

```text
assets/
├── fonts/                 # All required .woff2 font files
├── images/                # Local brand logos, icons, and graphic overlays
├── icons/                 # Local SVG/vector icon assets
├── textures/              # Procedural and image noise patterns
├── backgrounds/           # Local footage plates and gradient backdrops
├── overlays/              # Vignettes, film grain, and letterboxes
├── audio/                 # SFX and background music
├── video/                 # Template sample clips
├── models/                # Local Whisper GGML speech recognition models (ggml-*.bin)
├── binaries/              # Standalone binaries
│   ├── ffmpeg/            # Local ffmpeg.exe & ffprobe.exe
│   ├── whisper/           # Local whisper.cpp executable & libraries
│   └── other/             # Auxiliary tools
└── manifests/
    └── manifest.json      # Complete asset inventory with SHA256 hashes and licenses
```

---

## 3. Local Font Assets

All fonts are self-hosted `.woff2` files loaded via `@remotion/fonts` and `staticFile("fonts/...")` at runtime. No CDN or Google Fonts requests occur at render time.

### Preset Coverage
- **`bold-energetic`**: Anton, Montserrat (300, 400, 800), Poppins (400, 600)
- **`clean-minimal`**: Inter (300, 400, 500, 600)
- **`neon-techy`**: Space Grotesk (500, 700), JetBrains Mono (400, 500)
- **`cinematic-elegant`**: Playfair Display (400, 700, Italic), Montserrat (300, 400, 800)
- **`pop`**: Lilita One (400), Fredoka (Variable 300–700)
- **`editorial`**: Fraunces (Variable Normal/Italic 100–900), DM Sans (Variable 100–900)
- **`poster`**: Anton (400), Space Mono (400, 700)

All bundled fonts are licensed under the SIL Open Font License (OFL-1.1).

---

## 4. Local Binaries & Speech Recognition

| Component | Local Location | Size | Notes |
| :--- | :--- | :--- | :--- |
| **Fonts** | `assets/fonts/*.woff2` (and `public/fonts/`) | ~440 KB total | 24 font files covering all presets. |
| **Whisper Executable** | `assets/binaries/whisper/main.exe` | ~144 KB | Standalone speech-to-text inference binary. |
| **Whisper Models** | `assets/models/ggml-*.bin` | 141 MB – 465 MB | Local GGML models (`base.en` and `small.en` pre-installed). |
| **FFmpeg / FFprobe** | `assets/binaries/ffmpeg/` (and PATH fallback) | ~217 MB each | Bundled local processing binaries. |
| **Remotion Chromium** | `node_modules/.remotion/chrome-headless-shell/` | ~150 MB | Pre-cached headless rendering engine. |

---

## 5. Offline Workflow Commands

Standard workflow commands operate entirely offline and never download missing resources at runtime:

```bash
# 1. Transcribe audio to public/captions.srt & words.json (offline)
npm run transcribe -- --offline

# 2. Fit and auto-assign typography & word roles (100% offline heuristics)
npm run auto

# 3. Preview in Studio (Local loopback server at http://localhost:3000)
npm run dev

# 4. Render final video
npm run render

# 5. Batch process multiple videos
npm run batch
```

---

## 6. Local Asset Manifest (`assets/manifests/manifest.json`)

The manifest records every local asset:
- `name`: File name
- `path`: Relative path in the project
- `category`: `font`, `model`, `binary`, `media`, `browser`
- `purpose`: Functional usage in compositions or scripts
- `source`: Upstream repository / package source
- `license`: Open source license (OFL-1.1, MIT, GPL-3.0, BSD-3-Clause)
- `sizeBytes`: Size on disk
- `sha256`: Cryptographic integrity checksum
- `required`: Whether mandatory for offline execution

`npm run offline:check` uses this manifest to verify asset integrity.

---

## 7. Adding Assets Offline

### Adding a New Font
1. Place `.woff2` file in `assets/fonts/` and `public/fonts/`.
2. Add font family in [`src/types.ts`](file:///src/types.ts) (`FontFamily`).
3. Add font family in [`src/styles/fonts.ts`](file:///src/styles/fonts.ts) (`FAMILIES` and `loadAllProjectFonts`).
4. Run `npm run offline:setup` to refresh manifest.

### Adding a New Whisper Model
1. Download GGML model while online (e.g. `ggml-medium.en.bin`).
2. Place in `assets/models/` and `whisper.cpp/`.
3. Run `npm run transcribe -- --model medium.en --offline`.

---

## 8. What Requires External Services (By Design)
- **Cloud LLM API Providers**: If passing `--provider llm` to `scripts/analyze-srt.ts` with cloud API keys (OpenAI, Anthropic, Gemini). *(Use default heuristic analyzer or local Ollama at `http://127.0.0.1:11434` for 100% offline operation)*.
- **Remote Video Downloads**: Tools fetching remote YouTube/web streams (`yt-dlp`).
- **NPM Package Installs**: Installing new third-party packages requires network access unless using an offline npm cache.
