/**
 * scripts/batch.ts
 *
 * Batch-processes every video in an input folder through the full
 * transcribe → analyze → render pipeline.
 *
 * Requirements & Design overview
 * ──────────────────────────────
 * 1. Props: Merges props/final.json + per-video override into
 *    work/<stem>/props.json and passes --props=<path> (avoids Windows shell JSON quoting issues).
 * 2. Per-video public dir: Stages work/<stem>/public/ containing a link/copy
 *    of the video (as config.video), captions.json, and shared assets from public/,
 *    rendered with --public-dir=<path>. Zero changes to Remotion source files.
 * 3. Stage-level resume: Reuses existing work/<stem>/words.json and captions.json
 *    unless input size/mtime changed (tracked in work/<stem>/meta.json).
 *    --force-render: re-renders only (reuses transcription/analysis).
 *    --force-all: redoes everything from scratch.
 * 4. Atomic output: Renders to out/<stem>.tmp.mp4 and renames to final output on success only.
 * 5. Stem sanitization: Sanitizes stems for staging directories while keeping
 *    readable final output filenames in out/<baseName>.mp4.
 * 6. Per-video override: Reads input/<stem>.override.json or input/<baseName>.override.json.
 * 7. Summary table: Prints a clean table of:
 *    [Input File | Duration | Transcribe | Render | Total Time | Output / Error]
 * 8. Exit codes: 0 = all succeeded, 1 = some failed, 2 = all failed or fatal error.
 * 9. Single-video workflow: Fully intact when no input/ is passed or stem is "intro".
 * 10. Key validation: Validates override.json keys, warns on unknown keys, never crashes.
 */

import {
  copyFileSync,
  cpSync,
  existsSync,
  linkSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import {
  toCaptions,
  transcribe,
  type WhisperModel,
} from "@remotion/install-whisper-cpp";
import { buildCaptionsDocument } from "./analyze.js";
import { run } from "./lib/ffmpeg.js";
import { probeVideo, type VideoInfo } from "./lib/probe.js";
import {
  groupWordsIntoCues,
  mergeTokensToWords,
  type TokenInput,
} from "./lib/transcribe-helpers.js";
import { runRemotion } from "./lib/remotion.js";
import { parseSrt, serializeSrt } from "../src/srt/parse.js";
import { config as globalConfig } from "../src/intro.config.js";
import type { LooksConfig } from "../src/types.js";
import type { WordTiming } from "../src/srt/align.js";

process.env.OFFLINE = "1";
process.env.NO_UPDATE_NOTIFIER = "1";
process.env.REMOTION_DISABLE_TELEMETRY = "1";
process.env.REMOTION_TELEMETRY = "0";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WHISPER_VERSION = "1.5.5";
const VALID_MODELS = ["base.en", "small.en", "medium.en"] as const;
type SupportedModel = (typeof VALID_MODELS)[number];

/** Video file extensions recognised as input */
const VIDEO_EXTS = new Set([".mp4", ".mov", ".mkv", ".webm", ".avi"]);

/** Keys accepted in <stem>.override.json; anything else produces a warning */
const VALID_OVERRIDE_KEYS = new Set([
  "looks",
  "style",
  "energy",
  "maxWordsPerLine",
  "maxLinesPerChunk",
  "srtOffsetMs",
  "debug",
  "quality",
]);

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

const USAGE = `Usage: npm run batch [-- [input-dir] [options]]

Batch-processes all videos in <input-dir> through transcribe → analyze → render.

Arguments:
  input-dir              folder with video files  (default: input/)

Options:
  --force-render         re-render even if out/<file>.mp4 exists (reuse work/ files)
  --force-all            redo everything from scratch
  --model <name>         whisper model: base.en | small.en | medium.en  (default: small.en)
  --concurrency <n>      max parallel renders  (default: 1)
                         Transcription is always sequential.
  -h, --help             show this help

Per-video config overlay:
  Place <stem>.override.json next to the video in the input folder.
  Valid keys: looks, style, energy, maxWordsPerLine, maxLinesPerChunk,
              srtOffsetMs, debug, quality
  Unknown keys produce a warning and are ignored (no crash).

Resume behaviour:
  A video is skipped if out/<file>.mp4 exists AND work/<stem>/meta.json
  matches the source file's current size + mtime + model.
  --force-render  re-render only (reuse existing words.json & captions.json).
  --force-all     full redo from transcription.

Exit codes:
  0: all videos succeeded
  1: some videos failed (partial success)
  2: all videos failed or fatal error / no videos found
`;

type CliOptions = {
  inputDir: string;
  forceRender: boolean;
  forceAll: boolean;
  model: SupportedModel;
  concurrency: number;
};

function die(msg: string): never {
  console.error(`batch: ${msg}`);
  process.exit(2);
}

function parseArgs(argv: string[]): CliOptions {
  const args: string[] = [];
  for (const a of argv) {
    const eq = a.indexOf("=");
    if (a.startsWith("--") && eq > 0) {
      args.push(a.slice(0, eq), a.slice(eq + 1));
    } else {
      args.push(a);
    }
  }

  let inputDir = "input";
  let forceRender = false;
  let forceAll = false;
  let model: SupportedModel = "small.en";
  let concurrency = 1;

  for (let i = 0; i < args.length; i++) {
    const a = args[i] ?? "";
    if (a === "--force-render") {
      forceRender = true;
    } else if (a === "--force-all") {
      forceAll = true;
      forceRender = true;
    } else if (a === "--model") {
      const val = args[++i] ?? "";
      if (!(VALID_MODELS as readonly string[]).includes(val)) {
        die(`Invalid --model "${val}". Allowed: ${VALID_MODELS.join(", ")}`);
      }
      model = val as SupportedModel;
    } else if (a === "--concurrency") {
      const val = parseInt(args[++i] ?? "1", 10);
      if (!Number.isFinite(val) || val < 1) die(`--concurrency must be a positive integer`);
      concurrency = val;
    } else if (!a.startsWith("--")) {
      inputDir = a;
    } else {
      die(`Unknown option: ${a}. Run "npm run batch -- --help" for usage.`);
    }
  }

  return { inputDir, forceRender, forceAll, model, concurrency };
}

// ---------------------------------------------------------------------------
// Stem sanitization
// ---------------------------------------------------------------------------

/**
 * Convert a raw filename stem to a filesystem-safe ASCII identifier for staging directories.
 * Output filenames retain the original readable baseName.
 */
export function sanitizeStem(raw: string): string {
  return (
    raw
      .normalize("NFC")
      .replace(/[^\w.\-]/gu, "_")
      .replace(/_+/g, "_")
      .replace(/^[_.\s]+|[_.\s]+$/g, "")
      .slice(0, 80) || "video"
  );
}

// ---------------------------------------------------------------------------
// Per-video override loader
// ---------------------------------------------------------------------------

export type OverrideConfig = {
  looks?: Partial<LooksConfig>;
  style?: string;
  energy?: number;
  maxWordsPerLine?: number;
  maxLinesPerChunk?: number;
  srtOffsetMs?: number;
  debug?: boolean;
  quality?: "preview" | "final";
};

export function loadOverride(inputDir: string, baseName: string, stem: string, log?: Logger): OverrideConfig {
  const p1 = path.join(inputDir, `${stem}.override.json`);
  const p2 = path.join(inputDir, `${baseName}.override.json`);
  const target = existsSync(p1) ? p1 : existsSync(p2) ? p2 : null;
  if (!target) return {};

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(target, "utf8"));
  } catch (e) {
    const warn = `override.json parse error in "${path.basename(target)}" (ignored): ${
      e instanceof Error ? e.message : String(e)
    }`;
    log?.warn(warn);
    console.warn(`    [WARN] ${warn}`);
    return {};
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    const warn = `override.json in "${path.basename(target)}" is not an object — ignored`;
    log?.warn(warn);
    console.warn(`    [WARN] ${warn}`);
    return {};
  }

  const obj = raw as Record<string, unknown>;
  const result: OverrideConfig = {};

  for (const [key, value] of Object.entries(obj)) {
    if (!VALID_OVERRIDE_KEYS.has(key)) {
      const warn = `override.json in "${path.basename(target)}": unknown key "${key}" — ignored`;
      log?.warn(warn);
      console.warn(`    [WARN] ${warn}`);
      continue;
    }
    (result as Record<string, unknown>)[key] = value;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Logger (stdout + per-video log.txt)
// ---------------------------------------------------------------------------

export class Logger {
  private lines: string[] = [];
  readonly logFile: string;

  constructor(logFile: string) {
    this.logFile = logFile;
  }

  private record(level: string, msg: string): void {
    const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
    this.lines.push(line);
    this.flush();
  }

  info(msg: string): void {
    console.log(`    ${msg}`);
    this.record("INFO", msg);
  }

  warn(msg: string): void {
    console.warn(`    [WARN] ${msg}`);
    this.record("WARN", msg);
  }

  error(msg: string): void {
    console.error(`    [ERR]  ${msg}`);
    this.record("ERR", msg);
  }

  flush(): void {
    try {
      writeFileSync(this.logFile, this.lines.join("\n") + "\n", "utf8");
    } catch { /* non-critical */ }
  }
}

// ---------------------------------------------------------------------------
// Meta / stage-level resume detection
// ---------------------------------------------------------------------------

export type SourceMeta = { sizeByte: number; mtimeMs: number };
export type WorkMeta = { source: SourceMeta; model: string };

export function readMeta(workDir: string): WorkMeta | null {
  const p = path.join(workDir, "meta.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as WorkMeta;
  } catch {
    return null;
  }
}

export function writeMeta(workDir: string, videoPath: string, model: string): void {
  const st = statSync(videoPath);
  const meta: WorkMeta = {
    source: { sizeByte: st.size, mtimeMs: Math.round(st.mtimeMs) },
    model,
  };
  writeFileSync(path.join(workDir, "meta.json"), JSON.stringify(meta, null, 2) + "\n", "utf8");
}

export function isSourceUnchanged(workDir: string, videoPath: string, model: string): boolean {
  const meta = readMeta(workDir);
  if (!meta || meta.model !== model) return false;
  try {
    const st = statSync(videoPath);
    return st.size === meta.source.sizeByte && Math.round(st.mtimeMs) === meta.source.mtimeMs;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Hard-link with copy fallback (Windows-safe)
// ---------------------------------------------------------------------------

export function linkOrCopy(src: string, dst: string): void {
  if (existsSync(dst)) rmSync(dst, { force: true });
  try {
    linkSync(src, dst);
  } catch {
    copyFileSync(src, dst);
  }
}

// ---------------------------------------------------------------------------
// Build per-video public dir
// ---------------------------------------------------------------------------

export function buildPerVideoPublicDir(
  videoPath: string,
  captionsJsonPath: string,
  workDir: string,
  log?: Logger,
): string {
  const pubDir = path.join(workDir, "public");
  mkdirSync(pubDir, { recursive: true });

  const videoName = globalConfig.video ?? "intro.mp4";
  log?.info(`Linking video as ${videoName} in per-video public dir...`);
  linkOrCopy(videoPath, path.join(pubDir, videoName));

  copyFileSync(captionsJsonPath, path.join(pubDir, "captions.json"));

  const realPub = path.resolve("public");
  const skipFiles = new Set([
    "intro.mp4",
    "intro.proxy.mp4",
    "captions.json",
    "captions.srt",
    "words.json",
    "captions.example.json",
    "annotated-cues.json",
  ]);

  if (existsSync(realPub)) {
    try {
      for (const fname of readdirSync(realPub)) {
        if (skipFiles.has(fname)) continue;
        const src = path.join(realPub, fname);
        try {
          const st = statSync(src);
          if (st.isDirectory()) {
            cpSync(src, path.join(pubDir, fname), { recursive: true, force: true });
          } else if (st.isFile()) {
            linkOrCopy(src, path.join(pubDir, fname));
          }
        } catch { /* skip unreadable files */ }
      }
    } catch { /* non-critical */ }
  }

  return pubDir;
}

// ---------------------------------------------------------------------------
// Build props.json
// ---------------------------------------------------------------------------

export function buildPropsJson(workDir: string, override: OverrideConfig, log?: Logger): string {
  let base: Record<string, unknown> = {};
  const finalJsonPath = path.resolve("props", "final.json");
  if (existsSync(finalJsonPath)) {
    try {
      base = JSON.parse(readFileSync(finalJsonPath, "utf8")) as Record<string, unknown>;
    } catch (e) {
      log?.warn(`Could not parse props/final.json: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const merged: Record<string, unknown> = { ...base };

  if (override.quality !== undefined) merged.quality = override.quality;
  if (override.style !== undefined) merged.style = override.style;
  if (override.maxWordsPerLine !== undefined) merged.maxWordsPerLine = override.maxWordsPerLine;
  if (override.maxLinesPerChunk !== undefined) merged.maxLinesPerChunk = override.maxLinesPerChunk;
  if (override.debug !== undefined) merged.debug = override.debug;

  if (override.looks !== undefined || override.energy !== undefined) {
    const baseLooks: Partial<LooksConfig> =
      (base.looks as Partial<LooksConfig>) ?? globalConfig.looks;
    merged.looks = {
      ...baseLooks,
      ...(override.looks ?? {}),
      ...(override.energy !== undefined ? { energy: override.energy } : {}),
    };
  }

  const propsPath = path.join(workDir, "props.json");
  writeFileSync(propsPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
  return propsPath;
}

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

async function stageTranscribe(
  videoPath: string,
  workDir: string,
  model: SupportedModel,
  log: Logger,
): Promise<void> {
  const srtPath = path.join(workDir, "captions.srt");
  const wordsJsonPath = path.join(workDir, "words.json");
  const wavPath = path.join(workDir, "tmp-audio.wav");

  log.info(`Extracting 16 kHz mono audio...`);
  await run("ffmpeg", ["-y", "-i", videoPath, "-ar", "16000", "-ac", "1", wavPath]);

  const whisperDir = path.resolve("whisper.cpp");
  const assetWhisperFolder = path.resolve("assets", "binaries", "whisper");
  const assetModelsFolder = path.resolve("assets", "models");
  const exeName = process.platform === "win32" ? "main.exe" : "main";
  const modelFileName = `ggml-${model}.bin`;

  let finalExePath: string | null = null;
  if (existsSync(path.join(assetWhisperFolder, exeName))) {
    finalExePath = path.join(assetWhisperFolder, exeName);
  } else if (existsSync(path.join(whisperDir, exeName))) {
    finalExePath = path.join(whisperDir, exeName);
  }

  if (!finalExePath) {
    throw new Error(
      `Local whisper executable (${exeName}) not found. Run "npm run offline:setup" to prepare local assets.`
    );
  }

  if (!existsSync(path.join(whisperDir, exeName))) {
    mkdirSync(whisperDir, { recursive: true });
    copyFileSync(finalExePath, path.join(whisperDir, exeName));
    for (const dll of ["whisper.dll", "SDL2.dll"]) {
      const srcDll = path.join(path.dirname(finalExePath), dll);
      if (existsSync(srcDll) && !existsSync(path.join(whisperDir, dll))) {
        copyFileSync(srcDll, path.join(whisperDir, dll));
      }
    }
  }

  let finalModelPath: string | null = null;
  if (existsSync(path.join(assetModelsFolder, modelFileName))) {
    finalModelPath = path.join(assetModelsFolder, modelFileName);
  } else if (existsSync(path.join(whisperDir, modelFileName))) {
    finalModelPath = path.join(whisperDir, modelFileName);
  }

  if (!finalModelPath) {
    throw new Error(
      `Local whisper model (${modelFileName}) not found. Run "npm run offline:setup" to download models.`
    );
  }

  if (!existsSync(path.join(whisperDir, modelFileName))) {
    mkdirSync(whisperDir, { recursive: true });
    copyFileSync(finalModelPath, path.join(whisperDir, modelFileName));
  }

  log.info(`Transcribing with local whisper (${model})...`);
  const result = await transcribe({
    inputPath: wavPath,
    whisperPath: whisperDir,
    whisperCppVersion: WHISPER_VERSION,
    model: model as WhisperModel,
    tokenLevelTimestamps: true,
    language: "en",
    printOutput: false,
  });

  toCaptions({ whisperCppOutput: result });

  const tokens: TokenInput[] = result.transcription.flatMap((item) =>
    (item.tokens ?? []).map((t) => ({
      text: t.text,
      offsets: { from: t.offsets.from, to: t.offsets.to },
    })),
  );

  const words = mergeTokensToWords(tokens);
  writeFileSync(wordsJsonPath, JSON.stringify({ words }, null, 2) + "\n", "utf8");

  const cues = groupWordsIntoCues(words);
  writeFileSync(srtPath, serializeSrt(cues), "utf8");

  log.info(`Transcription done: ${cues.length} cues, ${words.length} words`);

  try { rmSync(wavPath, { force: true }); } catch { /* ignore */ }
}

function stageAnalyze(
  workDir: string,
  srtOffsetMs: number,
  maxWordsPerLine: number,
  maxLinesPerChunk: number,
  log: Logger,
): void {
  const srtPath = path.join(workDir, "captions.srt");
  const wordsJsonPath = path.join(workDir, "words.json");
  const outPath = path.join(workDir, "captions.json");

  const srtText = readFileSync(srtPath, "utf8");
  const { cues, warnings } = parseSrt(srtText, { offsetMs: srtOffsetMs });
  for (const w of warnings) log.warn(`SRT [${w.code}] ${w.message}`);

  let wordsJson: WordTiming[] | undefined;
  if (existsSync(wordsJsonPath)) {
    try {
      const parsed = JSON.parse(readFileSync(wordsJsonPath, "utf8")) as { words?: WordTiming[] };
      if (Array.isArray(parsed?.words)) wordsJson = parsed.words;
    } catch (e) {
      log.warn(`Could not parse words.json: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const stats = { matched: 0, interpolated: 0 };
  const doc = buildCaptionsDocument(cues, {
    maxWordsPerLine,
    maxLinesPerChunk,
    wordsJson,
    stats,
  });

  if (wordsJson) {
    log.info(`Aligned: ${stats.matched} matched, ${stats.interpolated} interpolated`);
  }

  writeFileSync(outPath, JSON.stringify(doc, null, 2) + "\n", "utf8");
  log.info(`Analyze done: ${doc.chunks.length} chunks`);
}

async function stageRender(
  stem: string,
  outputFileName: string,
  pubDir: string,
  propsPath: string,
  durationSec: number,
  log: Logger,
): Promise<void> {
  mkdirSync("out", { recursive: true });

  const outFinal = path.resolve("out", outputFileName);
  const outTmp = path.resolve("out", `${stem}.tmp.mp4`);

  if (existsSync(outTmp)) {
    log.warn(`Removing leftover .tmp.mp4 from crashed run`);
    rmSync(outTmp, { force: true });
  }

  const timeoutMs = Math.max(120_000, Math.round(durationSec * 10_000) + 120_000);
  log.info(`Rendering → out/${outputFileName}  (timeout: ${Math.round(timeoutMs / 1000)}s)`);

  const absPubDir = path.resolve(pubDir).replace(/\\/g, "/");
  const absPropsPath = path.resolve(propsPath).replace(/\\/g, "/");

  try {
    await runRemotion([
      "render",
      "LayeredCaption",
      outTmp,
      `--public-dir=${absPubDir}`,
      `--props=${absPropsPath}`,
      "--codec=h264",
      "--crf=17",
      `--timeout=${timeoutMs}`,
    ]);

    renameSync(outTmp, outFinal);
    log.info(`Done → out/${outputFileName}`);
  } catch (err) {
    if (existsSync(outTmp)) {
      try { rmSync(outTmp, { force: true }); } catch { /* ignore */ }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Video discovery
// ---------------------------------------------------------------------------

export type VideoEntry = {
  inputPath: string;
  baseName: string;       // original stem (e.g. "my clip")
  stem: string;           // sanitized stem used for staging dirs (e.g. "my_clip")
  outputFileName: string; // readable final filename in out/ (e.g. "my clip.mp4")
};

export function discoverVideos(inputDir: string): {
  videos: VideoEntry[];
  collisionErrors: string[];
} {
  const collisionErrors: string[] = [];
  const videos: VideoEntry[] = [];
  const stemMap = new Map<string, string>();

  let files: string[];
  try {
    files = readdirSync(inputDir).sort();
  } catch (e) {
    die(`Cannot read input directory "${inputDir}": ${e instanceof Error ? e.message : String(e)}`);
  }

  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (!VIDEO_EXTS.has(ext)) continue;

    const baseName = path.basename(f, ext);
    const stem = sanitizeStem(baseName);
    const inputPath = path.join(inputDir, f);
    const outputFileName = `${baseName}.mp4`;

    if (stemMap.has(stem)) {
      collisionErrors.push(
        `Stem collision: "${f}" and "${stemMap.get(stem)}" both sanitize to "${stem}". ` +
        `Rename one of them.`,
      );
      continue;
    }

    stemMap.set(stem, f);
    videos.push({ inputPath, baseName, stem, outputFileName });
  }

  return { videos, collisionErrors };
}

// ---------------------------------------------------------------------------
// Leftover cleanup at startup
// ---------------------------------------------------------------------------

export function cleanupLeftovers(): void {
  const outDir = path.resolve("out");
  if (!existsSync(outDir)) return;
  try {
    for (const f of readdirSync(outDir)) {
      if (!f.endsWith(".tmp.mp4")) continue;
      const full = path.join(outDir, f);
      console.log(`[startup] Removing leftover: ${full}`);
      rmSync(full, { force: true });
    }
  } catch { /* non-critical */ }
}

// ---------------------------------------------------------------------------
// Concurrency pool
// ---------------------------------------------------------------------------

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  const pending = [...tasks];

  async function worker(): Promise<void> {
    while (pending.length > 0) {
      const task = pending.shift();
      if (!task) break;
      results.push(await task());
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Result types & summary table
// ---------------------------------------------------------------------------

export type VideoResult = {
  inputFile: string;
  duration: string;
  transcribeStatus: string;
  renderStatus: string;
  totalTime: string;
  outputOrError: string;
  kind: "done" | "skip" | "fail";
  logFile?: string;
};

export function printSummaryTable(results: VideoResult[], collisionErrors: string[]): number {
  const allResults = [...results];
  for (const msg of collisionErrors) {
    allResults.push({
      inputFile: "(collision)",
      duration: "-",
      transcribeStatus: "-",
      renderStatus: "-",
      totalTime: "0s",
      outputOrError: msg,
      kind: "fail",
    });
  }

  const doneCount = allResults.filter((r) => r.kind === "done").length;
  const skipCount = allResults.filter((r) => r.kind === "skip").length;
  const failCount = allResults.filter((r) => r.kind === "fail").length;
  const totalCount = allResults.length;

  console.log(`\nBatch summary: ${doneCount} done, ${skipCount} skipped, ${failCount} failed (${totalCount} total)\n`);

  // Column definitions
  const headers = ["Input File", "Duration", "Transcribe", "Render", "Total Time", "Output / Error"];
  const rows = allResults.map((r) => [
    r.inputFile,
    r.duration,
    r.transcribeStatus,
    r.renderStatus,
    r.totalTime,
    r.outputOrError,
  ]);

  // Compute column widths
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((row) => (row[i] ?? "").length), 6),
  );

  const pad = (str: string, len: number) => str + " ".repeat(Math.max(0, len - str.length));

  // Render table
  const sep = "+-" + colWidths.map((w) => "-".repeat(w)).join("-+-") + "-+";
  console.log(sep);
  console.log("| " + headers.map((h, i) => pad(h, colWidths[i]!)).join(" | ") + " |");
  console.log(sep);

  for (const row of rows) {
    console.log("| " + row.map((cell, i) => pad(cell, colWidths[i]!)).join(" | ") + " |");
  }
  console.log(sep);

  // Print log locations for failures
  const failedLogs = allResults.filter((r) => r.kind === "fail" && r.logFile);
  if (failedLogs.length > 0) {
    console.log("\nFailure logs:");
    for (const f of failedLogs) {
      console.log(`  - ${f.inputFile}: ${f.logFile}`);
    }
  }

  // Requirement 8: Exit codes
  // 0: all succeeded
  // 1: some failed (partial success)
  // 2: all failed or fatal error / no videos
  if (totalCount === 0 || doneCount + skipCount === 0) {
    return 2;
  }
  if (failCount > 0) {
    return 1;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    process.exit(0);
  }

  const opts = parseArgs(argv);
  const inputDir = path.resolve(opts.inputDir);

  if (!existsSync(inputDir)) {
    die(`Input directory not found: "${inputDir}". Create it and drop videos in.`);
  }

  cleanupLeftovers();

  const { videos, collisionErrors } = discoverVideos(inputDir);

  if (videos.length === 0 && collisionErrors.length === 0) {
    console.log(`No video files found in "${inputDir}" (accepted: .mp4 .mov .mkv .webm .avi)`);
    process.exitCode = 2;
    return;
  }

  console.log(`\nFound ${videos.length} video(s) in "${opts.inputDir}"`);
  for (const e of collisionErrors) console.error(`  [COLLISION] ${e}`);

  if (opts.concurrency > 1) {
    console.log(
      `[INFO] concurrency=${opts.concurrency}: transcription is always sequential; ` +
      `only rendering runs in parallel.`,
    );
  }

  const ac = new AbortController();
  const onSigint = (): void => {
    console.log("\n[Ctrl+C] Aborting — waiting for current work to finish...");
    ac.abort();
  };
  process.on("SIGINT", onSigint);

  // ─── Phase 1: Sequential transcribe + analyze ──────────────────────────────

  const results: VideoResult[] = [];
  const renderQueue: Array<{
    entry: VideoEntry;
    pubDir: string;
    propsPath: string;
    durationSec: number;
    t0: number;
    transcribeStatus: string;
  }> = [];

  for (const entry of videos) {
    if (ac.signal.aborted) break;

    const { inputPath, baseName, stem, outputFileName } = entry;
    const workDir = path.resolve("work", stem);
    mkdirSync(workDir, { recursive: true });

    const logFile = path.join(workDir, "log.txt");
    const log = new Logger(logFile);
    const t0 = performance.now();

    const bar = "─".repeat(60);
    console.log(`\n${bar}`);
    console.log(`  ${baseName}`);
    if (baseName !== stem) console.log(`  stem: ${stem}`);
    console.log(bar);

    if (stem === "intro") {
      const warn =
        `Stem "intro" matches config.video="intro.mp4". The batch is safe (uses --public-dir) ` +
        `but rename the video to avoid confusion with the single-video workflow.`;
      log.warn(warn);
      console.warn(`  [WARN] ${warn}`);
    }

    const outFinal = path.resolve("out", outputFileName);
    const captionsJsonPath = path.join(workDir, "captions.json");
    const srtPath = path.join(workDir, "captions.srt");

    const hasOutput = existsSync(outFinal);
    const hasWorkFiles = existsSync(captionsJsonPath) && existsSync(srtPath);
    const sourceUnchanged = isSourceUnchanged(workDir, inputPath, opts.model);

    // Skip check: if output exists and source is unchanged (and not forcing)
    if (!opts.forceAll && !opts.forceRender && hasOutput && sourceUnchanged) {
      console.log(`  [SKIP] output exists and source unchanged`);
      log.info(`Skipped: already rendered and source unchanged`);
      results.push({
        inputFile: path.basename(inputPath),
        duration: "-",
        transcribeStatus: "CACHED",
        renderStatus: "CACHED",
        totalTime: "0s",
        outputOrError: `out/${outputFileName} (skipped)`,
        kind: "skip",
        logFile,
      });
      continue;
    }

    let probe: VideoInfo | undefined;

    try {
      console.log(`  Probing...`);
      log.info(`Probing ${path.basename(inputPath)}`);
      probe = await probeVideo(inputPath);
      const durationStr = `${probe.durationSec.toFixed(1)}s`;
      const desc = `${probe.width}×${probe.height} @ ${probe.fps.toFixed(2)} fps, ${durationStr}`;
      log.info(desc);
      console.log(`  ${desc}`);

      if (ac.signal.aborted) throw new Error("Batch aborted by user (Ctrl+C)");

      const override = loadOverride(inputDir, baseName, stem, log);
      const srtOffsetMs = override.srtOffsetMs ?? (globalConfig.srtOffsetMs as number | undefined) ?? 0;
      const maxWordsPerLine = override.maxWordsPerLine ?? globalConfig.layout.maxWordsPerLine ?? 4;
      const maxLinesPerChunk = override.maxLinesPerChunk ?? globalConfig.layout.maxLinesPerChunk ?? 2;

      // Transcription
      let transcribeStatus = "DONE";
      const needsTranscribe = opts.forceAll || !hasWorkFiles || !sourceUnchanged;
      if (needsTranscribe) {
        console.log(`  Transcribing (${opts.model})...`);
        log.info(`=== TRANSCRIBE ===`);
        await stageTranscribe(inputPath, workDir, opts.model, log);
        writeMeta(workDir, inputPath, opts.model);
      } else {
        transcribeStatus = "CACHED";
        console.log(`  Transcription: cached`);
        log.info(`Transcription skipped (source unchanged)`);
      }

      if (ac.signal.aborted) throw new Error("Batch aborted by user (Ctrl+C)");

      // Analyze
      const needsAnalyze = opts.forceAll || !existsSync(captionsJsonPath) || !sourceUnchanged;
      if (needsAnalyze) {
        console.log(`  Analyzing...`);
        log.info(`=== ANALYZE ===`);
        stageAnalyze(workDir, srtOffsetMs, maxWordsPerLine, maxLinesPerChunk, log);
      } else {
        console.log(`  Analysis: cached`);
        log.info(`Analysis skipped (captions.json current)`);
      }

      if (ac.signal.aborted) throw new Error("Batch aborted by user (Ctrl+C)");

      // Stage per-video public dir & props
      console.log(`  Staging public dir...`);
      log.info(`=== STAGE ===`);
      const pubDir = buildPerVideoPublicDir(inputPath, captionsJsonPath, workDir, log);
      const propsPath = buildPropsJson(workDir, override, log);

      renderQueue.push({
        entry,
        pubDir,
        propsPath,
        durationSec: probe.durationSec,
        t0,
        transcribeStatus,
      });

    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      log.error(reason);
      console.error(`  [FAIL] ${reason}`);
      const elapsedSec = Math.round((performance.now() - t0) / 1000);
      results.push({
        inputFile: path.basename(inputPath),
        duration: probe ? `${probe.durationSec.toFixed(1)}s` : "-",
        transcribeStatus: "FAIL",
        renderStatus: "-",
        totalTime: `${elapsedSec}s`,
        outputOrError: reason,
        kind: "fail",
        logFile,
      });
    }
  }

  // ─── Phase 2: Parallel render ─────────────────────────────────────────────

  if (renderQueue.length > 0) {
    const bar = "═".repeat(60);
    console.log(`\n${bar}`);
    console.log(`  Rendering ${renderQueue.length} video(s)  (concurrency: ${opts.concurrency})`);
    console.log(bar);

    const renderTasks = renderQueue.map(({ entry, pubDir, propsPath, durationSec, t0, transcribeStatus }) => {
      return async (): Promise<VideoResult> => {
        const { stem, outputFileName, inputPath } = entry;
        const workDir = path.resolve("work", stem);
        const logFile = path.join(workDir, "log.txt");
        const log = new Logger(logFile);

        console.log(`\n  [RENDER] ${outputFileName}`);

        if (ac.signal.aborted) {
          return {
            inputFile: path.basename(inputPath),
            duration: `${durationSec.toFixed(1)}s`,
            transcribeStatus,
            renderStatus: "FAIL",
            totalTime: "0s",
            outputOrError: "Aborted by user (Ctrl+C)",
            kind: "fail",
            logFile,
          };
        }

        try {
          log.info(`=== RENDER ===`);
          await stageRender(stem, outputFileName, pubDir, propsPath, durationSec, log);
          const elapsedSec = Math.round((performance.now() - t0) / 1000);
          console.log(`  [DONE]  ${outputFileName}  (${elapsedSec}s)`);
          return {
            inputFile: path.basename(inputPath),
            duration: `${durationSec.toFixed(1)}s`,
            transcribeStatus,
            renderStatus: "DONE",
            totalTime: `${elapsedSec}s`,
            outputOrError: `out/${outputFileName}`,
            kind: "done",
            logFile,
          };
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          log.error(reason);
          console.error(`  [FAIL]  ${outputFileName}: ${reason}`);
          const elapsedSec = Math.round((performance.now() - t0) / 1000);
          return {
            inputFile: path.basename(inputPath),
            duration: `${durationSec.toFixed(1)}s`,
            transcribeStatus,
            renderStatus: "FAIL",
            totalTime: `${elapsedSec}s`,
            outputOrError: reason,
            kind: "fail",
            logFile,
          };
        }
      };
    });

    const renderResults = await runWithConcurrency(renderTasks, opts.concurrency);
    results.push(...renderResults);
  }

  process.off("SIGINT", onSigint);

  const exitCode = printSummaryTable(results, collisionErrors);
  process.exitCode = exitCode;
}

const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("batch.ts") ||
    process.argv[1].endsWith("batch.js") ||
    path.resolve(process.argv[1]) === path.resolve("scripts/batch.ts"));

if (isMain) {
  main().catch((err: unknown) => {
    console.error(`\nbatch: fatal error — ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  });
}
