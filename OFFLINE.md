# Offline Guide: Remotion Intro Captioner

This document explains how to run this Remotion captioning project **100% offline**, what is cached locally, how to add fonts or models, and what features require internet.

---

## 1. Quick Start

### One-Time Setup (While Online)
Run the automated setup script to download dependencies, pre-cache the Remotion browser, and verify all offline assets:
```bash
npm install
npm run setup:offline
```

### Verification (Offline)
To verify that everything works locally without touching the network:
```bash
npm run verify:offline
```
This script checks that all offline assets exist and renders a test still frame (`out/verify-offline-still.png`) using the local browser and fonts.

---

## 2. What Is Cached Where

| Component | Local Cache Location | Size | Notes |
| :--- | :--- | :--- | :--- |
| **Fonts** | `public/fonts/*.woff2` | ~210 KB total | Self-hosted `.woff2` files loaded via `@remotion/fonts` and `staticFile()`. |
| **Chromium Browser** | `node_modules/.remotion/chrome-headless-shell/` | ~150 MB | Pre-cached by `npx remotion browser ensure`. |
| **Whisper Executable** | `whisper.cpp/main.exe` (or `main`) | ~147 KB | Standalone binary compiled for speech-to-text. |
| **Whisper Models** | `whisper.cpp/ggml-*.bin` | 147 MB – 487 MB | Local GGML models (`base.en` and `small.en` are pre-installed). |
| **FFmpeg / FFprobe** | System PATH | ~100 MB | Installed on system (e.g., via winget/brew). |

---

## 3. How to Run Completely Offline

Disconnect from Wi-Fi or set `OFFLINE=1` in your environment:

### Full Local Workflow
```bash
# 1. (Optional) Transcribe audio to public/captions.srt & words.json
npm run transcribe -- --offline

# 2. Fit and auto-assign kinetic typography styles & word roles (100% offline heuristics)
npm run auto

# 3. Preview in Studio (Local loopback server at http://localhost:3000)
npm run dev

# 4. Render final video
npm run render
```

---

## 4. How to Add a New Font

1. Obtain the `.woff2` file for your font (e.g., from Google Fonts or Fontsource).
2. Place the file inside `public/fonts/` (e.g., `public/fonts/MyFont-Regular.woff2`).
3. In [`src/types.ts`](file:///src/types.ts), add the font family name to `FontFamily`:
   ```ts
   export type FontFamily = ... | "MyFont";
   ```
4. In [`src/styles/fonts.ts`](file:///src/styles/fonts.ts):
   - Add the font to `FAMILIES`:
     ```ts
     "MyFont": {
       name: "MyFont",
       fallback: `"Impact", sans-serif`,
       load: () => {
         const promise = loadFont({
           family: "MyFont",
           url: staticFile("fonts/MyFont-Regular.woff2"),
           weight: "400",
         });
         return { fontFamily: "MyFont", waitUntilDone: () => promise };
       },
     },
     ```
   - Add the font to `loadAllProjectFonts()` so it is pre-loaded before layout measurement:
     ```ts
     loadFont({
       family: "MyFont",
       url: staticFile("fonts/MyFont-Regular.woff2"),
       weight: "400",
     }),
     ```
5. Update `REQUIRED_FONTS` in `scripts/setup-offline.ts` and `scripts/verify-offline.ts`.

---

## 5. How to Add a New Whisper Model

By default, `base.en` and `small.en` are bundled in `whisper.cpp/`. If you want to use `medium.en`:

1. While online, download the GGML model from Hugging Face:
   - **URL**: `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin`
2. Save it directly into `whisper.cpp/ggml-medium.en.bin`.
3. You can now run:
   ```bash
   npm run transcribe -- --model medium.en --offline
   ```

---

## 6. What Is NOT Offline (Features Requiring Internet)

The following external integrations cannot run without an internet connection:
- **Cloud LLM Providers**: If you pass `--provider llm` to `scripts/analyze-srt.ts` with cloud API keys (OpenAI, Anthropic, Gemini), it requires internet access. *(Note: You can run LLM analysis offline by starting a local Ollama server at `http://127.0.0.1:11434` and using `--provider ollama`)*.
- **YouTube Downloader (`yt-dlp`)**: Fetching remote YouTube video streams requires network access.
- **Package Managers**: Installing new npm packages with `npm install` requires network access unless using an offline npm cache.
