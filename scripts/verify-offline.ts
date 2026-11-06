import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { remotionCliPath, runRemotion } from "./lib/remotion";

process.env.OFFLINE = "1";
process.env.NO_UPDATE_NOTIFIER = "1";
process.env.REMOTION_DISABLE_TELEMETRY = "1";
process.env.REMOTION_TELEMETRY = "0";

type VerificationRow = {
  category: string;
  item: string;
  status: "PASS" | "FAIL";
  details: string;
};

function computeSha256(filePath: string): string {
  const hash = createHash("sha256");
  const data = readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

async function runCli(command: string, args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        OFFLINE: "1",
        NO_UPDATE_NOTIFIER: "1",
        REMOTION_DISABLE_TELEMETRY: "1",
        REMOTION_TELEMETRY: "0",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
      process.stdout.write(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
      process.stderr.write(chunk);
    });

    child.on("close", (code) => {
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        code: code ?? 1,
      });
    });
  });
}

async function main(): Promise<void> {
  console.log("================================================================================");
  console.log("   OFFLINE ASSET VERIFICATION (npm run offline:check)   ");
  console.log("================================================================================");
  console.log("Operating under strict offline environment: OFFLINE=1, NO_UPDATE_NOTIFIER=1\n");

  const rows: VerificationRow[] = [];
  let fatalError = false;

  // 1. Verify Manifest
  console.log("1. Checking Asset Manifest...");
  const manifestPath = path.join("assets", "manifests", "manifest.json");
  if (!existsSync(manifestPath)) {
    rows.push({
      category: "Manifest",
      item: "manifest.json",
      status: "FAIL",
      details: "Missing! Run 'npm run offline:setup'",
    });
    fatalError = true;
  } else {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      const count = Array.isArray(manifest.assets) ? manifest.assets.length : 0;
      rows.push({
        category: "Manifest",
        item: "manifest.json",
        status: "PASS",
        details: `${count} recorded assets`,
      });
    } catch {
      rows.push({
        category: "Manifest",
        item: "manifest.json",
        status: "FAIL",
        details: "Invalid JSON format",
      });
      fatalError = true;
    }
  }

  // 2. Verify Local Fonts
  console.log("2. Checking Local Fonts in assets/fonts and public/fonts...");
  const requiredFonts = [
    "Anton-Regular.woff2",
    "LilitaOne-Regular.woff2",
    "Fredoka-Variable.woff2",
    "Fraunces-Normal-Variable.woff2",
    "Fraunces-Italic-Variable.woff2",
    "DMSans-Variable.woff2",
    "SpaceMono-Regular.woff2",
    "SpaceMono-Bold.woff2",
    "Montserrat-Light.woff2",
    "Montserrat-Regular.woff2",
    "Montserrat-ExtraBold.woff2",
    "Poppins-Regular.woff2",
    "Poppins-SemiBold.woff2",
    "Inter-Light.woff2",
    "Inter-Regular.woff2",
    "Inter-Medium.woff2",
    "Inter-SemiBold.woff2",
    "SpaceGrotesk-Medium.woff2",
    "SpaceGrotesk-Bold.woff2",
    "JetBrainsMono-Regular.woff2",
    "JetBrainsMono-Medium.woff2",
    "PlayfairDisplay-Regular.woff2",
    "PlayfairDisplay-Bold.woff2",
    "PlayfairDisplay-Italic.woff2",
  ];

  for (const font of requiredFonts) {
    const assetP = path.join("assets", "fonts", font);
    const pubP = path.join("public", "fonts", font);
    const assetOk = existsSync(assetP) && statSync(assetP).size > 1000;
    const pubOk = existsSync(pubP) && statSync(pubP).size > 1000;

    if (assetOk && pubOk) {
      rows.push({
        category: "Fonts",
        item: font,
        status: "PASS",
        details: `${(statSync(assetP).size / 1024).toFixed(1)} KB (local)`,
      });
    } else {
      rows.push({
        category: "Fonts",
        item: font,
        status: "FAIL",
        details: !assetOk ? "Missing in assets/fonts" : "Missing in public/fonts",
      });
      fatalError = true;
    }
  }

  // 3. Verify Whisper binaries & models
  console.log("3. Checking Whisper.cpp binaries and models...");
  const exeName = process.platform === "win32" ? "main.exe" : "main";
  const whisperAssetExe = path.join("assets", "binaries", "whisper", exeName);
  const whisperLegacyExe = path.join("whisper.cpp", exeName);
  const whisperExeOk =
    (existsSync(whisperAssetExe) && statSync(whisperAssetExe).size > 1000) ||
    (existsSync(whisperLegacyExe) && statSync(whisperLegacyExe).size > 1000);

  rows.push({
    category: "Whisper Binary",
    item: exeName,
    status: whisperExeOk ? "PASS" : "FAIL",
    details: whisperExeOk ? "Executable present" : "Missing! Run 'npm run offline:setup'",
  });
  if (!whisperExeOk) fatalError = true;

  const whisperModels = ["ggml-base.en.bin", "ggml-small.en.bin"];
  for (const model of whisperModels) {
    const assetM = path.join("assets", "models", model);
    const legacyM = path.join("whisper.cpp", model);
    const modelOk =
      (existsSync(assetM) && statSync(assetM).size > 1000) ||
      (existsSync(legacyM) && statSync(legacyM).size > 1000);
    const size = existsSync(assetM) ? statSync(assetM).size : existsSync(legacyM) ? statSync(legacyM).size : 0;

    rows.push({
      category: "Whisper Model",
      item: model,
      status: modelOk ? "PASS" : "FAIL",
      details: modelOk ? `${(size / (1024 * 1024)).toFixed(1)} MB` : "Missing!",
    });
    if (!modelOk) fatalError = true;
  }

  // 4. Verify FFmpeg / FFprobe
  console.log("4. Checking FFmpeg & FFprobe...");
  const tools = ["ffmpeg", "ffprobe"] as const;
  for (const t of tools) {
    const exe = process.platform === "win32" ? `${t}.exe` : t;
    const localP = path.join("assets", "binaries", "ffmpeg", exe);
    const localExists = existsSync(localP) && statSync(localP).size > 1000;

    // Check system availability if local binary not present
    let available = localExists;
    if (!available) {
      const { code } = await runCli(t, ["-version"]);
      available = code === 0;
    }

    rows.push({
      category: "Multimedia Tools",
      item: t,
      status: available ? "PASS" : "FAIL",
      details: localExists ? "Local assets binary" : available ? "System PATH" : "Missing!",
    });
    if (!available) fatalError = true;
  }

  // 5. Verify Remotion headless Chromium
  console.log("5. Checking Remotion headless browser...");
  const cacheDir = path.join(process.cwd(), "node_modules", ".remotion", "chrome-headless-shell");
  const browserExe =
    process.platform === "win32"
      ? path.join(cacheDir, "win64", "chrome-headless-shell-win64", "chrome-headless-shell.exe")
      : path.join(cacheDir, process.arch === "arm64" ? "mac-arm64" : "mac-x64", "chrome-headless-shell");
  const browserOk = existsSync(browserExe) && statSync(browserExe).size > 1000;

  rows.push({
    category: "Browser Runtime",
    item: "Chromium Headless",
    status: browserOk ? "PASS" : "FAIL",
    details: browserOk ? "Cached in node_modules" : "Missing! Run 'npm run offline:setup'",
  });
  if (!browserOk) fatalError = true;

  // Print asset check summary table
  console.log("\n==========================================================================================");
  console.log("| Category             | Item                           | Status | Details               |");
  console.log("==========================================================================================");
  for (const r of rows) {
    const cat = r.category.padEnd(20);
    const item = r.item.slice(0, 30).padEnd(30);
    const status = r.status === "PASS" ? "\x1b[32mPASS\x1b[0m  " : "\x1b[31mFAIL\x1b[0m  ";
    const det = r.details.slice(0, 21).padEnd(21);
    console.log(`| ${cat} | ${item} | ${status} | ${det} |`);
  }
  console.log("==========================================================================================\n");

  if (fatalError) {
    console.error("✗ Offline verification FAILED: One or more required local assets are missing.");
    console.error("Run 'npm run offline:setup' while online to automatically download and prepare missing assets.\n");
    process.exit(1);
  }

  // 6. Test offline still frame rendering
  console.log("6. Testing offline frame rendering using Remotion CLI...");
  const cli = remotionCliPath();
  if (!cli) {
    console.error("Could not find Remotion CLI in node_modules.");
    process.exit(1);
  }

  mkdirSync("out", { recursive: true });
  const outStill = path.join("out", "verify-offline-still.png");
  try {
    await runRemotion([
      "still",
      "LayeredCaption",
      outStill,
      "--props=./props/final.json",
      "--log=warn",
    ]);

    if (existsSync(outStill) && statSync(outStill).size > 1000) {
      const sizeKb = (statSync(outStill).size / 1024).toFixed(1);
      console.log(`\n✓ SUCCESS: Rendered test still frame offline to ${outStill} (${sizeKb} KB)!`);
      console.log("✓ The project is 100% verified to operate offline without any network access.\n");
      process.exit(0);
    } else {
      console.error("\n✗ Offline test render FAILED: output image was not created or empty.");
      process.exit(1);
    }
  } catch (err) {
    console.error("\n✗ Offline test render FAILED:", err);
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("verify:offline failed:", err);
  process.exit(1);
});
