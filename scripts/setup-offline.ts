import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type CheckResult = {
  item: string;
  category: string;
  passed: boolean;
  details: string;
};

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

function checkTool(tool: "ffmpeg" | "ffprobe"): { passed: boolean; details: string } {
  try {
    const res = spawnSync(tool, ["-version"], { stdio: "ignore" });
    if (res.status === 0) {
      return { passed: true, details: "Available in system PATH" };
    }
  } catch {
    // continue to remotion fallback
  }
  return { passed: false, details: "Missing in PATH" };
}

async function main(): Promise<void> {
  console.log("=== Remotion Intro Captioner: Offline Setup Checklist ===\n");
  const results: CheckResult[] = [];

  // 1. Check Node & package dependencies
  const nodeModulesExist = existsSync("node_modules");
  const remotionFontsExist = existsSync("node_modules/@remotion/fonts");
  results.push({
    category: "Dependencies",
    item: "node_modules installed",
    passed: nodeModulesExist && remotionFontsExist,
    details: remotionFontsExist ? "@remotion/fonts present" : "Run npm install",
  });

  // 2. Ensure Remotion Browser (Chromium / chrome-headless-shell)
  console.log("Checking Remotion browser...");
  let browserOk = false;
  let browserDetails = "";

  const customExe = process.env.REMOTION_BROWSER_EXECUTABLE;
  if (customExe && existsSync(customExe)) {
    browserOk = true;
    browserDetails = `Custom browser: ${customExe}`;
  } else {
    const cacheDir = path.join(process.cwd(), "node_modules", ".remotion", "chrome-headless-shell");
    const exe = process.platform === "win32"
      ? path.join(cacheDir, "win64", "chrome-headless-shell-win64", "chrome-headless-shell.exe")
      : path.join(cacheDir, process.arch === "arm64" ? "mac-arm64" : "mac-x64", "chrome-headless-shell");

    if (existsSync(exe)) {
      browserOk = true;
      browserDetails = "chrome-headless-shell cached locally";
    } else {
      console.log("Browser not found in cache. Running 'npx remotion browser ensure'...");
      const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
      const ensureRes = spawnSync(npxCmd, ["remotion", "browser", "ensure"], { stdio: "inherit" });
      browserOk = ensureRes.status === 0 && existsSync(exe);
      browserDetails = browserOk ? "Installed via browser ensure" : "Failed to install browser";
    }
  }

  results.push({
    category: "Browser",
    item: "Remotion Chromium",
    passed: browserOk,
    details: browserDetails,
  });

  // 3. Check Local Font Files
  for (const font of REQUIRED_FONTS) {
    const fontPath = path.join("public", "fonts", font);
    const exists = existsSync(fontPath);
    let size = 0;
    if (exists) {
      size = statSync(fontPath).size;
    }
    results.push({
      category: "Fonts",
      item: font,
      passed: exists && size > 1000,
      details: exists ? `${(size / 1024).toFixed(1)} KB` : "Missing in public/fonts/",
    });
  }

  // 4. Check Whisper.cpp binary and GGML models
  for (const whisperFile of REQUIRED_WHISPER_FILES) {
    const filePath = path.join("whisper.cpp", whisperFile);
    const exists = existsSync(filePath);
    let size = 0;
    if (exists) {
      size = statSync(filePath).size;
    }
    results.push({
      category: "Whisper",
      item: whisperFile,
      passed: exists && size > 1000,
      details: exists ? `${(size / (1024 * 1024)).toFixed(1)} MB` : "Missing in whisper.cpp/",
    });
  }

  // 5. Check FFmpeg and FFprobe in PATH
  const ffmpegCheck = checkTool("ffmpeg");
  const ffprobeCheck = checkTool("ffprobe");
  results.push({
    category: "System Tools",
    item: "ffmpeg",
    passed: ffmpegCheck.passed,
    details: ffmpegCheck.details,
  });
  results.push({
    category: "System Tools",
    item: "ffprobe",
    passed: ffprobeCheck.passed,
    details: ffprobeCheck.details,
  });

  // Summary Table
  console.log("\n+--------------------+--------------------------------+--------+---------------------------------------+");
  console.log("| Category           | Item                           | Status | Details                               |");
  console.log("+--------------------+--------------------------------+--------+---------------------------------------+");
  for (const r of results) {
    const cat = r.category.padEnd(18);
    const item = r.item.padEnd(30);
    const status = r.passed ? "\x1b[32mPASS\x1b[0m  " : "\x1b[31mFAIL\x1b[0m  ";
    const det = r.details.slice(0, 37).padEnd(37);
    console.log(`| ${cat} | ${item} | ${status} | ${det} |`);
  }
  console.log("+--------------------+--------------------------------+--------+---------------------------------------+\n");

  const allPassed = results.every((r) => r.passed);
  if (allPassed) {
    console.log("✓ All checks PASSED! The project is ready to run completely offline.");
    console.log("Run 'npm run verify:offline' to test local rendering without internet.\n");
  } else {
    const failed = results.filter((r) => !r.passed).map((r) => `${r.category}: ${r.item}`);
    console.error("✗ Some offline requirements are missing:\n  - " + failed.join("\n  - "));
    console.error("\nPlease resolve the missing items while online before disconnecting.");
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("setup:offline failed:", err);
  process.exit(1);
});
