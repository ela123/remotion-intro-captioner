import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  downloadWhisperModel,
  installWhisperCpp,
  toCaptions,
  transcribe,
  type WhisperModel,
} from "@remotion/install-whisper-cpp";
import { config } from "../src/intro.config";
import { serializeSrt } from "../src/srt/parse";
import { splitInlineValues, wantsHelp } from "./lib/cli";
import { run } from "./lib/ffmpeg";
import { probeVideo } from "./lib/probe";
import {
  groupWordsIntoCues,
  MAX_DURATION_SEC_PER_CUE,
  MAX_WORD_GAP_SEC,
  MAX_WORDS_PER_CUE,
  mergeTokensToWords,
  type TokenInput,
} from "./lib/transcribe-helpers";

// Configurable cue grouping rules
export { MAX_WORDS_PER_CUE, MAX_DURATION_SEC_PER_CUE, MAX_WORD_GAP_SEC };

const WHISPER_VERSION = "1.5.5";
const VALID_MODELS = ["base.en", "small.en", "medium.en"] as const;
type SupportedModel = (typeof VALID_MODELS)[number];

const USAGE = `Usage: npm run transcribe -- [video-path] [options]

Transcribes audio from a video using local whisper.cpp and generates public/captions.srt and public/words.json.

Arguments:
  video-path          Path to source video. If given, copied to public/intro.mp4.
                      If omitted, uses existing public/intro.mp4.

Options:
  --model <name>      Whisper model to use: base.en | small.en | medium.en (default: small.en)
  --force             Overwrite existing public/captions.srt without asking
  -h, --help          Show this help message`;

type CliOptions = {
  videoArg?: string;
  model: SupportedModel;
  force: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const args = splitInlineValues(argv);
  let videoArg: string | undefined;
  let model: SupportedModel = "small.en";
  let force = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i] ?? "";
    if (a === "--model") {
      const val = args[++i] ?? "";
      if (!VALID_MODELS.includes(val as SupportedModel)) {
        console.error(`Invalid model "${val}". Allowed models: ${VALID_MODELS.join(", ")}`);
        process.exit(1);
      }
      model = val as SupportedModel;
    } else if (a === "--force") {
      force = true;
    } else if (!a.startsWith("--")) {
      if (!videoArg) {
        videoArg = a;
      } else {
        console.error(`Unexpected extra argument: ${a}`);
        process.exit(1);
      }
    } else {
      console.error(`Unknown option: ${a}`);
      process.exit(1);
    }
  }

  return { videoArg, model, force };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (wantsHelp(argv)) {
    console.log(USAGE);
    return;
  }

  const { videoArg, model, force } = parseArgs(argv);

  const publicDir = path.resolve("public");
  mkdirSync(publicDir, { recursive: true });

  const targetVideoPath = path.resolve(publicDir, config.video ?? "intro.mp4");
  const srtPath = path.resolve(publicDir, config.srt ?? "captions.srt");
  const wordsJsonPath = path.resolve(publicDir, "words.json");

  // 1. Resolve source video
  if (videoArg) {
    const resolvedSource = path.resolve(videoArg);
    if (!existsSync(resolvedSource)) {
      console.error(`Source video not found: ${resolvedSource}`);
      console.error(USAGE);
      process.exit(1);
    }
    if (path.resolve(resolvedSource) !== path.resolve(targetVideoPath)) {
      console.log(`Copying video ${resolvedSource} -> ${targetVideoPath}`);
      copyFileSync(resolvedSource, targetVideoPath);
    }
  } else {
    if (!existsSync(targetVideoPath)) {
      console.error(`No video specified and default video not found: ${targetVideoPath}`);
      console.error(USAGE);
      process.exit(1);
    }
  }

  // 8. Safety check: refuse to overwrite captions.srt unless --force is given
  if (existsSync(srtPath) && !force) {
    console.error(`\nError: ${srtPath} already exists.`);
    console.error(`To overwrite it, pass --force:`);
    console.error(`  npm run transcribe -- --force\n`);
    process.exit(1);
  }

  // 2. Check video duration with Remotion's ffprobe
  let maxDurationSec = 30;
  try {
    if (typeof config?.maxDurationSec === "number" && config.maxDurationSec > 0) {
      maxDurationSec = config.maxDurationSec;
    }
  } catch {
    maxDurationSec = 30;
  }

  try {
    const probe = await probeVideo(targetVideoPath);
    if (probe.durationSec > maxDurationSec) {
      console.warn(
        `\n[WARNING] Video duration (${probe.durationSec.toFixed(1)}s) exceeds maxDurationSec (${maxDurationSec}s).` +
          ` Captions beyond this limit will not be rendered.`,
      );
    }
  } catch (err) {
    console.warn(`Could not probe video duration: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. Extract audio to temporary 16 kHz mono WAV
  const wavPath = path.resolve("tmp-audio.wav");

  try {
    console.log(`\nExtracting 16 kHz mono audio to ${wavPath}...`);
    await run("ffmpeg", ["-y", "-i", targetVideoPath, "-ar", "16000", "-ac", "1", wavPath]);

    // 4. Install whisper.cpp and download model
    const whisperFolder = path.resolve("whisper.cpp");
    console.log(`\nEnsuring whisper.cpp (v${WHISPER_VERSION}) is ready at ${whisperFolder}...`);
    await installWhisperCpp({
      to: whisperFolder,
      version: WHISPER_VERSION,
      printOutput: true,
    });

    console.log(`\nEnsuring whisper model (${model}) is downloaded...`);
    await downloadWhisperModel({
      model: model as WhisperModel,
      folder: whisperFolder,
      printOutput: true,
    });

    console.log(`\nTranscribing audio with whisper.cpp (${model})...`);
    const transcriptionResult = await transcribe({
      inputPath: wavPath,
      whisperPath: whisperFolder,
      whisperCppVersion: WHISPER_VERSION,
      model: model as WhisperModel,
      tokenLevelTimestamps: true,
      language: "en",
      printOutput: true,
    });

    // Also call toCaptions as required
    toCaptions({ whisperCppOutput: transcriptionResult });

    // 5. Merge sub-word tokens into whole words
    const tokens: TokenInput[] = transcriptionResult.transcription.flatMap((item) =>
      (item.tokens ?? []).map((t) => ({
        text: t.text,
        offsets: { from: t.offsets.from, to: t.offsets.to },
      })),
    );

    const words = mergeTokensToWords(tokens);

    // 6. Write public/words.json
    writeFileSync(wordsJsonPath, `${JSON.stringify({ words }, null, 2)}\n`, "utf8");

    // 7. Group words into SRT cues and write public/captions.srt
    const cues = groupWordsIntoCues(words);
    writeFileSync(srtPath, serializeSrt(cues), "utf8");

    // 9. On success, print summary
    console.log(`\n✓ Transcription complete!`);
    console.log(`  Cues:  ${cues.length}`);
    console.log(`  Words: ${words.length}`);
    console.log(`  Files written:`);
    console.log(`    - ${wordsJsonPath}`);
    console.log(`    - ${srtPath}`);
    console.log(`\nNext step: Review public/captions.srt, then run: npm run analyze\n`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`\nTranscription failed: ${msg}`);
    if (
      process.platform === "win32" &&
      (msg.includes("cmake") ||
        msg.includes("make") ||
        msg.includes("build") ||
        msg.includes("compiler") ||
        msg.includes("MSB") ||
        msg.includes("Visual Studio"))
    ) {
      console.error("\n[Hint] Whisper.cpp building requires Visual Studio Build Tools and CMake on Windows.");
      console.error("  1. Install Visual Studio Build Tools with 'Desktop development with C++':");
      console.error("     https://visualstudio.microsoft.com/visual-cpp-build-tools/");
      console.error("  2. Install CMake: winget install Kitware.CMake");
    }
    process.exit(1);
  } finally {
    if (existsSync(wavPath)) {
      try {
        rmSync(wavPath, { force: true });
      } catch {
        // ignore cleanup error
      }
    }
  }
}

if (process.argv[1]?.endsWith("transcribe.ts")) {
  main();
}
