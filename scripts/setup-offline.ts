import { copyFileSync, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { installWhisperCpp, downloadWhisperModel, type WhisperModel } from "@remotion/install-whisper-cpp";

type AssetManifestItem = {
  name: string;
  path: string;
  category: "font" | "model" | "binary" | "media" | "browser";
  purpose: string;
  source: string;
  license: string;
  sizeBytes: number;
  sha256?: string;
  required: boolean;
  status: "reused" | "downloaded" | "copied";
};

type CheckResult = {
  category: string;
  item: string;
  status: "PASS" | "FAIL";
  details: string;
};

const WHISPER_VERSION = "1.5.5";

const ASSET_DIRECTORIES = [
  path.join("assets", "fonts"),
  path.join("assets", "images"),
  path.join("assets", "icons"),
  path.join("assets", "textures"),
  path.join("assets", "backgrounds"),
  path.join("assets", "overlays"),
  path.join("assets", "audio"),
  path.join("assets", "video"),
  path.join("assets", "models"),
  path.join("assets", "binaries", "ffmpeg"),
  path.join("assets", "binaries", "whisper"),
  path.join("assets", "binaries", "other"),
  path.join("assets", "manifests"),
  path.join("public", "fonts"),
];

const DIRECTORY_PURPOSES: Record<string, string> = {
  "assets/fonts": "Offline typography files (WOFF2) for all style presets",
  "assets/images": "Local image assets, brand logos, and illustrations",
  "assets/icons": "Local SVG and bitmap icon assets",
  "assets/textures": "Local texture overlays and procedural noise patterns",
  "assets/backgrounds": "Local background footage, plates, and color gradients",
  "assets/overlays": "Local cinematic letterboxing, frames, and vignette overlays",
  "assets/audio": "Local sound effects, stingers, and background music tracks",
  "assets/video": "Local template reference media and sample test footage",
  "assets/models": "Local Whisper speech recognition models (ggml-*.bin)",
  "assets/binaries/ffmpeg": "Local FFmpeg and FFprobe multimedia processing binaries",
  "assets/binaries/whisper": "Local whisper.cpp speech transcription executable and libraries",
  "assets/binaries/other": "Other local auxiliary processing utilities and tools",
  "assets/manifests": "Asset manifests recording sources, licenses, and checksums",
};

interface FontDownloadSpec {
  file: string;
  url?: string;
  source: string;
  license: string;
  purpose: string;
}

const ALL_REQUIRED_FONTS: FontDownloadSpec[] = [
  // Existing preset fonts
  {
    file: "Anton-Regular.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/anton@latest/latin-400-normal.woff2",
    source: "Google Fonts / Fontsource (Anton)",
    license: "OFL-1.1",
    purpose: "Poster look & bold-energetic preset hero word typography",
  },
  {
    file: "LilitaOne-Regular.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/lilita-one@latest/latin-400-normal.woff2",
    source: "Google Fonts / Fontsource (Lilita One)",
    license: "OFL-1.1",
    purpose: "Pop look hero typography and playful punchy titles",
  },
  {
    file: "Fredoka-Variable.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/fredoka@latest/latin-wght-normal.woff2",
    source: "Google Fonts / Fontsource (Fredoka)",
    license: "OFL-1.1",
    purpose: "Pop look accent, normal, and connector typography",
  },
  {
    file: "Fraunces-Normal-Variable.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/fraunces@latest/latin-wght-normal.woff2",
    source: "Google Fonts / Fontsource (Fraunces Normal)",
    license: "OFL-1.1",
    purpose: "Editorial look upright normal and accent typography",
  },
  {
    file: "Fraunces-Italic-Variable.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/fraunces@latest/latin-wght-italic.woff2",
    source: "Google Fonts / Fontsource (Fraunces Italic)",
    license: "OFL-1.1",
    purpose: "Editorial look italicized hero typography",
  },
  {
    file: "DMSans-Variable.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-wght-normal.woff2",
    source: "Google Fonts / Fontsource (DM Sans)",
    license: "OFL-1.1",
    purpose: "Editorial look connector and secondary metadata typography",
  },
  {
    file: "SpaceMono-Regular.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/space-mono@latest/latin-400-normal.woff2",
    source: "Google Fonts / Fontsource (Space Mono Regular)",
    license: "OFL-1.1",
    purpose: "Poster look technical connector typography",
  },
  {
    file: "SpaceMono-Bold.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/space-mono@latest/latin-700-normal.woff2",
    source: "Google Fonts / Fontsource (Space Mono Bold)",
    license: "OFL-1.1",
    purpose: "Poster look emphasized connector typography",
  },

  // Presets requested by specification
  // bold-energetic: Anton, Montserrat, Poppins
  {
    file: "Montserrat-Light.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-300-normal.woff2",
    source: "Google Fonts / Fontsource (Montserrat 300)",
    license: "OFL-1.1",
    purpose: "Cinematic elegant slot B tracking typography",
  },
  {
    file: "Montserrat-Regular.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-400-normal.woff2",
    source: "Google Fonts / Fontsource (Montserrat 400)",
    license: "OFL-1.1",
    purpose: "Bold-energetic slot B body typography",
  },
  {
    file: "Montserrat-ExtraBold.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-800-normal.woff2",
    source: "Google Fonts / Fontsource (Montserrat 800)",
    license: "OFL-1.1",
    purpose: "Bold-energetic slot B heavy uppercase accent",
  },
  {
    file: "Poppins-Regular.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-400-normal.woff2",
    source: "Google Fonts / Fontsource (Poppins 400)",
    license: "OFL-1.1",
    purpose: "Bold-energetic slot C supporting typography",
  },
  {
    file: "Poppins-SemiBold.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-600-normal.woff2",
    source: "Google Fonts / Fontsource (Poppins 600)",
    license: "OFL-1.1",
    purpose: "Bold-energetic slot C high-legibility captions",
  },

  // clean-minimal: Inter
  {
    file: "Inter-Light.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-300-normal.woff2",
    source: "Google Fonts / Fontsource (Inter 300)",
    license: "OFL-1.1",
    purpose: "Clean-minimal slot B light clean typography",
  },
  {
    file: "Inter-Regular.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.woff2",
    source: "Google Fonts / Fontsource (Inter 400)",
    license: "OFL-1.1",
    purpose: "Clean-minimal neutral body typography",
  },
  {
    file: "Inter-Medium.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-500-normal.woff2",
    source: "Google Fonts / Fontsource (Inter 500)",
    license: "OFL-1.1",
    purpose: "Clean-minimal slot C uppercase tracking typography",
  },
  {
    file: "Inter-SemiBold.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.woff2",
    source: "Google Fonts / Fontsource (Inter 600)",
    license: "OFL-1.1",
    purpose: "Clean-minimal slot A hero typography",
  },

  // neon-techy: Space Grotesk, JetBrains Mono
  {
    file: "SpaceGrotesk-Medium.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@latest/latin-500-normal.woff2",
    source: "Google Fonts / Fontsource (Space Grotesk 500)",
    license: "OFL-1.1",
    purpose: "Neon-techy slot B clean geometric typography",
  },
  {
    file: "SpaceGrotesk-Bold.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@latest/latin-700-normal.woff2",
    source: "Google Fonts / Fontsource (Space Grotesk 700)",
    license: "OFL-1.1",
    purpose: "Neon-techy slot A cyberpunk hero typography",
  },
  {
    file: "JetBrainsMono-Regular.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-400-normal.woff2",
    source: "Google Fonts / Fontsource (JetBrains Mono 400)",
    license: "OFL-1.1",
    purpose: "Neon-techy secondary technical monospace tags",
  },
  {
    file: "JetBrainsMono-Medium.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-500-normal.woff2",
    source: "Google Fonts / Fontsource (JetBrains Mono 500)",
    license: "OFL-1.1",
    purpose: "Neon-techy slot C uppercase tracking monospace",
  },

  // cinematic-elegant: Playfair Display, Montserrat
  {
    file: "PlayfairDisplay-Regular.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-400-normal.woff2",
    source: "Google Fonts / Fontsource (Playfair Display 400)",
    license: "OFL-1.1",
    purpose: "Cinematic-elegant editorial serif body typography",
  },
  {
    file: "PlayfairDisplay-Bold.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-700-normal.woff2",
    source: "Google Fonts / Fontsource (Playfair Display 700)",
    license: "OFL-1.1",
    purpose: "Cinematic-elegant slot A serif hero typography",
  },
  {
    file: "PlayfairDisplay-Italic.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-400-italic.woff2",
    source: "Google Fonts / Fontsource (Playfair Display Italic)",
    license: "OFL-1.1",
    purpose: "Cinematic-elegant emphasized italic serif captions",
  },
];

function computeSha256(filePath: string): string {
  const hash = createHash("sha256");
  const data = readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  writeFileSync(destPath, Buffer.from(arrayBuffer));
}

function findSystemBinary(tool: string): string | null {
  const exe = process.platform === "win32" ? `${tool}.exe` : tool;
  const cmd = process.platform === "win32" ? "where.exe" : "which";
  try {
    const res = spawnSync(cmd, [tool], { encoding: "utf8" });
    if (res.status === 0 && res.stdout) {
      const firstLine = res.stdout.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0 && existsSync(l));
      if (firstLine) return firstLine;
    }
  } catch {
    // fallback
  }

  // Windows standard winget locations check
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA ?? "";
    if (localAppData) {
      const wingetDir = path.join(localAppData, "Microsoft", "WinGet", "Packages");
      if (existsSync(wingetDir)) {
        try {
          const pkgs = readdirSync(wingetDir);
          for (const p of pkgs) {
            if (p.toLowerCase().includes("ffmpeg")) {
              const candidate = path.join(wingetDir, p);
              // recursively look for bin/tool.exe
              const subItems = readdirSync(candidate);
              for (const sub of subItems) {
                const testBin = path.join(candidate, sub, "bin", exe);
                if (existsSync(testBin)) return testBin;
              }
            }
          }
        } catch { /* ignore */ }
      }
    }
  }
  return null;
}

async function main(): Promise<void> {
  console.log("================================================================================");
  console.log("   COMPLETE LOCAL ASSET SETUP (OFFLINE PREPARATION)   ");
  console.log("================================================================================\n");

  const manifestItems: AssetManifestItem[] = [];
  const results: CheckResult[] = [];

  // 1. Create centralized asset directories
  console.log("1. Initializing centralized local asset directory structure...");
  for (const dir of ASSET_DIRECTORIES) {
    mkdirSync(dir, { recursive: true });
    const normalizedKey = dir.replace(/\\/g, "/");
    const purpose = DIRECTORY_PURPOSES[normalizedKey];
    if (purpose) {
      const readmePath = path.join(dir, ".gitkeep");
      if (!existsSync(readmePath)) {
        writeFileSync(readmePath, `# ${normalizedKey}\n${purpose}\n`);
      }
    }
  }
  console.log("   ✓ Asset directories ready.\n");

  // 2. Download and bundle all required font files
  console.log("2. Synchronizing and bundling local font assets...");
  for (const fontSpec of ALL_REQUIRED_FONTS) {
    const assetFontPath = path.join("assets", "fonts", fontSpec.file);
    const pubFontPath = path.join("public", "fonts", fontSpec.file);

    let status: AssetManifestItem["status"] = "reused";

    // Reuse existing font in public/fonts if present and valid
    if (existsSync(pubFontPath) && statSync(pubFontPath).size > 1000) {
      if (!existsSync(assetFontPath) || statSync(assetFontPath).size < 1000) {
        copyFileSync(pubFontPath, assetFontPath);
        status = "copied";
      }
    } else if (existsSync(assetFontPath) && statSync(assetFontPath).size > 1000) {
      copyFileSync(assetFontPath, pubFontPath);
      status = "copied";
    } else if (fontSpec.url) {
      console.log(`   Downloading ${fontSpec.file} from fontsource...`);
      await downloadFile(fontSpec.url, assetFontPath);
      copyFileSync(assetFontPath, pubFontPath);
      status = "downloaded";
    }

    const hasAsset = existsSync(assetFontPath) && statSync(assetFontPath).size > 1000;
    const hasPub = existsSync(pubFontPath) && statSync(pubFontPath).size > 1000;
    const size = hasAsset ? statSync(assetFontPath).size : 0;
    const sha = hasAsset ? computeSha256(assetFontPath) : undefined;

    manifestItems.push({
      name: fontSpec.file,
      path: assetFontPath.replace(/\\/g, "/"),
      category: "font",
      purpose: fontSpec.purpose,
      source: fontSpec.source,
      license: fontSpec.license,
      sizeBytes: size,
      sha256: sha,
      required: true,
      status,
    });

    results.push({
      category: "Fonts",
      item: fontSpec.file,
      status: hasAsset && hasPub ? "PASS" : "FAIL",
      details: `${(size / 1024).toFixed(1)} KB [${status}]`,
    });
  }
  console.log("   ✓ All font files verified in assets/fonts/ and public/fonts/.\n");

  // 3. Setup Whisper.cpp binaries and models
  console.log("3. Synchronizing Whisper.cpp speech transcription assets...");
  const whisperBinDir = path.join("assets", "binaries", "whisper");
  const whisperModelsDir = path.join("assets", "models");
  const legacyWhisperDir = path.resolve("whisper.cpp");

  mkdirSync(whisperBinDir, { recursive: true });
  mkdirSync(whisperModelsDir, { recursive: true });

  const exeName = process.platform === "win32" ? "main.exe" : "main";
  const legacyExe = path.join(legacyWhisperDir, exeName);
  const assetExe = path.join(whisperBinDir, exeName);

  let whisperExeStatus: AssetManifestItem["status"] = "reused";

  if (existsSync(legacyExe) && statSync(legacyExe).size > 1000) {
    if (!existsSync(assetExe) || statSync(assetExe).size < 1000) {
      copyFileSync(legacyExe, assetExe);
      whisperExeStatus = "copied";
    }
  } else if (existsSync(assetExe) && statSync(assetExe).size > 1000) {
    copyFileSync(assetExe, legacyExe);
    whisperExeStatus = "copied";
  } else {
    console.log(`   Installing whisper.cpp (v${WHISPER_VERSION}) binary...`);
    await installWhisperCpp({
      to: legacyWhisperDir,
      version: WHISPER_VERSION,
      printOutput: false,
    });
    if (existsSync(legacyExe)) {
      copyFileSync(legacyExe, assetExe);
      whisperExeStatus = "downloaded";
    }
  }

  // Copy supporting DLLs on Windows (whisper.dll, SDL2.dll)
  if (process.platform === "win32") {
    for (const dll of ["whisper.dll", "SDL2.dll"]) {
      const src = path.join(legacyWhisperDir, dll);
      const dst = path.join(whisperBinDir, dll);
      if (existsSync(src) && !existsSync(dst)) {
        copyFileSync(src, dst);
      } else if (existsSync(dst) && !existsSync(src)) {
        copyFileSync(dst, src);
      }
    }
  }

  const whisperExeOk = existsSync(assetExe) && statSync(assetExe).size > 1000;
  manifestItems.push({
    name: exeName,
    path: assetExe.replace(/\\/g, "/"),
    category: "binary",
    purpose: "whisper.cpp local audio speech-to-text inference executable",
    source: `https://github.com/ggerganov/whisper.cpp/releases/tag/v${WHISPER_VERSION}`,
    license: "MIT",
    sizeBytes: whisperExeOk ? statSync(assetExe).size : 0,
    sha256: whisperExeOk ? computeSha256(assetExe) : undefined,
    required: true,
    status: whisperExeStatus,
  });

  results.push({
    category: "Whisper Binary",
    item: exeName,
    status: whisperExeOk ? "PASS" : "FAIL",
    details: `${((whisperExeOk ? statSync(assetExe).size : 0) / 1024).toFixed(1)} KB [${whisperExeStatus}]`,
  });

  // Check and synchronize models: base.en, small.en
  const models = ["base.en", "small.en"] as const;
  for (const m of models) {
    const modelFile = `ggml-${m}.bin`;
    const legacyModel = path.join(legacyWhisperDir, modelFile);
    const assetModel = path.join(whisperModelsDir, modelFile);
    let modelStatus: AssetManifestItem["status"] = "reused";

    if (existsSync(legacyModel) && statSync(legacyModel).size > 1000) {
      if (!existsSync(assetModel) || statSync(assetModel).size < 1000) {
        copyFileSync(legacyModel, assetModel);
        modelStatus = "copied";
      }
    } else if (existsSync(assetModel) && statSync(assetModel).size > 1000) {
      copyFileSync(assetModel, legacyModel);
      modelStatus = "copied";
    } else {
      console.log(`   Downloading whisper model (${m})...`);
      await downloadWhisperModel({
        model: m as WhisperModel,
        folder: legacyWhisperDir,
        printOutput: false,
      });
      if (existsSync(legacyModel)) {
        copyFileSync(legacyModel, assetModel);
        modelStatus = "downloaded";
      }
    }

    const modelOk = existsSync(assetModel) && statSync(assetModel).size > 1000;
    const modelSize = modelOk ? statSync(assetModel).size : 0;
    manifestItems.push({
      name: modelFile,
      path: assetModel.replace(/\\/g, "/"),
      category: "model",
      purpose: `Whisper GGML acoustic model (${m}) for offline transcription`,
      source: `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${modelFile}`,
      license: "MIT",
      sizeBytes: modelSize,
      sha256: modelOk ? computeSha256(assetModel) : undefined,
      required: true,
      status: modelStatus,
    });

    results.push({
      category: "Whisper Model",
      item: modelFile,
      status: modelOk ? "PASS" : "FAIL",
      details: `${(modelSize / (1024 * 1024)).toFixed(1)} MB [${modelStatus}]`,
    });
  }
  console.log("   ✓ Whisper.cpp binaries and models synchronized.\n");

  // 4. Setup FFmpeg and FFprobe binaries
  console.log("4. Synchronizing FFmpeg & FFprobe multimedia tools...");
  const ffmpegBinDir = path.join("assets", "binaries", "ffmpeg");
  mkdirSync(ffmpegBinDir, { recursive: true });

  const ffmpegTools = ["ffmpeg", "ffprobe"] as const;
  for (const tool of ffmpegTools) {
    const exe = process.platform === "win32" ? `${tool}.exe` : tool;
    const assetToolPath = path.join(ffmpegBinDir, exe);
    let toolStatus: AssetManifestItem["status"] = "reused";

    if (!existsSync(assetToolPath) || statSync(assetToolPath).size < 1000) {
      const sysPath = findSystemBinary(tool);
      if (sysPath && existsSync(sysPath)) {
        console.log(`   Found system ${tool} at "${sysPath}", copying to assets/binaries/ffmpeg/...`);
        try {
          copyFileSync(sysPath, assetToolPath);
          toolStatus = "copied";
        } catch (e) {
          console.warn(`   Could not copy system ${tool}: ${e}`);
        }
      }
    }

    const toolOk = existsSync(assetToolPath) && statSync(assetToolPath).size > 1000;
    const sysAvailable = findSystemBinary(tool) !== null;
    const passed = toolOk || sysAvailable;
    const size = toolOk ? statSync(assetToolPath).size : 0;

    manifestItems.push({
      name: exe,
      path: assetToolPath.replace(/\\/g, "/"),
      category: "binary",
      purpose: `${tool} multimedia decoding, probe, filtering and audio extraction`,
      source: "Gyan FFmpeg / System PATH",
      license: "GPL-3.0",
      sizeBytes: size,
      sha256: toolOk ? computeSha256(assetToolPath) : undefined,
      required: true,
      status: toolOk ? toolStatus : "reused",
    });

    results.push({
      category: "Video Tools",
      item: tool,
      status: passed ? "PASS" : "FAIL",
      details: toolOk
        ? `Local binary (${(size / (1024 * 1024)).toFixed(1)} MB)`
        : sysAvailable
          ? "Available via system PATH"
          : "Missing",
    });
  }
  console.log("   ✓ FFmpeg and FFprobe configured.\n");

  // 5. Ensure Remotion headless Chromium browser
  console.log("5. Checking Remotion headless Chromium browser...");
  let browserOk = false;
  let browserDetails = "";

  const customExe = process.env.REMOTION_BROWSER_EXECUTABLE;
  if (customExe && existsSync(customExe)) {
    browserOk = true;
    browserDetails = `Custom browser: ${customExe}`;
  } else {
    const cacheDir = path.join(process.cwd(), "node_modules", ".remotion", "chrome-headless-shell");
    const exe =
      process.platform === "win32"
        ? path.join(cacheDir, "win64", "chrome-headless-shell-win64", "chrome-headless-shell.exe")
        : path.join(cacheDir, process.arch === "arm64" ? "mac-arm64" : "mac-x64", "chrome-headless-shell");

    if (existsSync(exe) && statSync(exe).size > 1000) {
      browserOk = true;
      browserDetails = "chrome-headless-shell pre-cached locally";
    } else {
      console.log("   Browser not found in local cache. Running 'npx remotion browser ensure'...");
      const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
      const ensureRes = spawnSync(npxCmd, ["remotion", "browser", "ensure"], { stdio: "inherit" });
      browserOk = ensureRes.status === 0 && existsSync(exe);
      browserDetails = browserOk ? "Installed via browser ensure" : "Failed to install browser";
    }
  }

  manifestItems.push({
    name: "chrome-headless-shell",
    path: "node_modules/.remotion/chrome-headless-shell",
    category: "browser",
    purpose: "Remotion Chromium headless rendering runtime for video composition frames",
    source: "Remotion Chrome Headless Shell Distribution",
    license: "BSD-3-Clause",
    sizeBytes: 0,
    required: true,
    status: "reused",
  });

  results.push({
    category: "Browser Runtime",
    item: "Chromium Headless",
    status: browserOk ? "PASS" : "FAIL",
    details: browserDetails,
  });
  console.log("   ✓ Headless browser verified.\n");

  // 6. Write asset manifest
  console.log("6. Writing local asset manifest...");
  const manifestPath = path.join("assets", "manifests", "manifest.json");
  const manifestData = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    },
    assets: manifestItems,
  };
  writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), "utf8");
  console.log(`   ✓ Manifest written to ${manifestPath}\n`);

  // 7. Print summary report table
  console.log("==========================================================================================");
  console.log("| Category             | Item                           | Status | Details               |");
  console.log("==========================================================================================");
  for (const r of results) {
    const cat = r.category.padEnd(20);
    const item = r.item.slice(0, 30).padEnd(30);
    const status = r.status === "PASS" ? "\x1b[32mPASS\x1b[0m  " : "\x1b[31mFAIL\x1b[0m  ";
    const det = r.details.slice(0, 21).padEnd(21);
    console.log(`| ${cat} | ${item} | ${status} | ${det} |`);
  }
  console.log("==========================================================================================\n");

  const allPassed = results.every((r) => r.status === "PASS");
  if (allPassed) {
    console.log("✓ SUCCESS: All local assets, models, binaries, and fonts are completely prepared!");
    console.log("You can now disconnect from the network and run fully offline.");
    console.log("Run 'npm run offline:check' to verify local frame rendering.\n");
  } else {
    console.error("✗ Some assets could not be localized. Please review the items marked FAIL above.");
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("Offline setup failed with error:", err);
  process.exit(1);
});
