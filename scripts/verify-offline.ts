import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { remotionCliPath } from "./lib/remotion";

process.env.OFFLINE = "1";
process.env.NO_UPDATE_NOTIFIER = "1";
process.env.REMOTION_DISABLE_TELEMETRY = "1";
process.env.REMOTION_TELEMETRY = "0";

const REQUIRED_FONTS = [
  "Anton-Regular.woff2",
  "LilitaOne-Regular.woff2",
  "Fredoka-Variable.woff2",
  "Fraunces-Normal-Variable.woff2",
  "Fraunces-Italic-Variable.woff2",
  "DMSans-Variable.woff2",
  "SpaceMono-Regular.woff2",
  "SpaceMono-Bold.woff2",
];

const REQUIRED_WHISPER_FILES = [
  process.platform === "win32" ? "main.exe" : "main",
  "ggml-base.en.bin",
  "ggml-small.en.bin",
];

async function runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, OFFLINE: "1", NO_UPDATE_NOTIFIER: "1", REMOTION_DISABLE_TELEMETRY: "1" },
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
  console.log("=== Remotion Intro Captioner: Offline Verification ===\n");
  console.log("Running with OFFLINE=1, NO_UPDATE_NOTIFIER=1, REMOTION_DISABLE_TELEMETRY=1\n");

  let hasError = false;

  // 1. Verify font files exist locally
  console.log("1. Verifying local font assets...");
  for (const font of REQUIRED_FONTS) {
    const fontPath = path.join("public", "fonts", font);
    if (!existsSync(fontPath) || statSync(fontPath).size < 1000) {
      console.error(`  ✗ Missing or empty font: ${fontPath}`);
      hasError = true;
    } else {
      console.log(`  ✓ ${font.padEnd(32)} (${(statSync(fontPath).size / 1024).toFixed(1)} KB)`);
    }
  }

  // 2. Verify whisper local assets
  console.log("\n2. Verifying local whisper.cpp assets...");
  for (const wf of REQUIRED_WHISPER_FILES) {
    const p = path.join("whisper.cpp", wf);
    if (!existsSync(p) || statSync(p).size < 1000) {
      console.error(`  ✗ Missing or empty whisper file: ${p}`);
      hasError = true;
    } else {
      console.log(`  ✓ ${wf.padEnd(32)} (${(statSync(p).size / (1024 * 1024)).toFixed(1)} MB)`);
    }
  }

  if (hasError) {
    console.error("\nAborting verification: required offline files are missing. Run 'npm run setup:offline' first.");
    process.exit(1);
  }

  // 3. Test frame rendering using local browser and local fonts
  console.log("\n3. Testing frame render with Remotion still (LayeredCaption)...");
  const cli = remotionCliPath();
  if (!cli) {
    console.error("Could not find Remotion CLI in node_modules.");
    process.exit(1);
  }

  const outStill = path.join("out", "verify-offline-still.png");
  mkdirSync("out", { recursive: true });
  const propsFile = existsSync("./props/final.json") ? "./props/final.json" : "./props/preview.json";

  const renderResult = await runCommand(process.execPath, [
    cli,
    "still",
    "LayeredCaption",
    outStill,
    "--frame=0",
    "--overwrite",
    `--props=${propsFile}`,
    "--log=warn",
  ]);

  if (renderResult.code !== 0) {
    console.error(`\nRender failed with exit code ${renderResult.code}:`);
    if (renderResult.stdout) console.log(renderResult.stdout);
    if (renderResult.stderr) console.error(renderResult.stderr);
    process.exit(1);
  }

  // Check for font fallback warnings or network errors
  const fullLog = `${renderResult.stdout}\n${renderResult.stderr}`;
  const hasFallbackWarning =
    fullLog.includes("Font load fallback warning") ||
    fullLog.includes("Timed out loading") ||
    fullLog.includes("ENOTFOUND") ||
    fullLog.includes("ERR_INTERNET_DISCONNECTED") ||
    fullLog.includes("Failed to download");

  if (hasFallbackWarning) {
    console.error("\n✗ Render succeeded, but warning detected in logs:");
    console.error(fullLog);
    process.exit(1);
  }

  if (!existsSync(outStill)) {
    console.error(`\n✗ Render finished, but output frame not found at: ${outStill}`);
    process.exit(1);
  }

  const fileSize = statSync(outStill).size;
  console.log(`  ✓ Rendered ${outStill} (${(fileSize / 1024).toFixed(1)} KB) successfully!`);
  console.log(`  ✓ No font fallback warnings or network requests detected.`);
  console.log("\n=======================================================");
  console.log("✓ VERIFIED: The project is 100% offline ready!");
  console.log("=======================================================\n");
}

main().catch((err: unknown) => {
  console.error("verify:offline failed:", err);
  process.exit(1);
});
