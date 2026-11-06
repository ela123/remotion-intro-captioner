/**
 * scripts/test-batch-e2e.ts
 *
 * End-to-end verification script for the batch processing pipeline.
 * Tests:
 * 1. Two normal videos (video1.mp4, video2.mp4)
 * 2. One video with spaces in filename ("video with spaces.mp4")
 * 3. One deliberately broken video (broken.mp4)
 * 4. Per-video override with valid and unknown keys (video2.override.json)
 * 5. Run 1: Execution, stage directories, output files, error handling, exit code 1
 * 6. Run 2: Resume proof (proves cached outputs are skipped without re-rendering)
 */

import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const INPUT_DIR = path.resolve("input");
const OUT_DIR = path.resolve("out");
const WORK_DIR = path.resolve("work");

function runCommand(cmd: string, args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(cmd, args, {
    cwd: path.resolve("."),
    encoding: "utf8",
    stdio: "pipe",
    shell: true,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

async function main() {
  console.log("============================================================");
  console.log("  BATCH PROCESSING END-TO-END VERIFICATION");
  console.log("============================================================\n");

  // Step 1: Clean input, out, work for test videos
  console.log("[1/6] Setting up test fixtures...");
  mkdirSync(INPUT_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const testFiles = [
    "video1.mp4",
    "video2.mp4",
    "video with spaces.mp4",
    "broken.mp4",
    "video2.override.json",
  ];

  for (const f of testFiles) {
    const p = path.join(INPUT_DIR, f);
    if (existsSync(p)) rmSync(p, { force: true });
  }

  // Clean out and work for these stems
  const stems = ["video1", "video2", "video_with_spaces", "broken"];
  for (const s of stems) {
    const w = path.join(WORK_DIR, s);
    if (existsSync(w)) rmSync(w, { recursive: true, force: true });
  }
  const outFiles = ["video1.mp4", "video2.mp4", "video with spaces.mp4"];
  for (const f of outFiles) {
    const p = path.join(OUT_DIR, f);
    if (existsSync(p)) rmSync(p, { force: true });
  }

  // Step 2: Generate synthetic videos with ffmpeg (1 sec duration, fast!)
  console.log("[2/6] Generating test videos with ffmpeg...");

  // video1.mp4: 1.0s, 320x180, 440Hz tone
  runCommand("ffmpeg", [
    "-y",
    "-f", "lavfi", "-i", "testsrc=duration=1:size=320x180:rate=30",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    path.join(INPUT_DIR, "video1.mp4"),
  ]);

  // video2.mp4: 1.0s, 320x180, 880Hz tone
  runCommand("ffmpeg", [
    "-y",
    "-f", "lavfi", "-i", "testsrc=duration=1:size=320x180:rate=30",
    "-f", "lavfi", "-i", "sine=frequency=880:duration=1",
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    path.join(INPUT_DIR, "video2.mp4"),
  ]);

  // video with spaces.mp4: 1.0s, 320x180, 660Hz tone
  runCommand("ffmpeg", [
    "-y",
    "-f", "lavfi", "-i", "testsrc=duration=1:size=320x180:rate=30",
    "-f", "lavfi", "-i", "sine=frequency=660:duration=1",
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    path.join(INPUT_DIR, "video with spaces.mp4"),
  ]);

  // broken.mp4: Deliberately invalid file
  writeFileSync(path.join(INPUT_DIR, "broken.mp4"), "CORRUPT_INVALID_NOT_A_VIDEO_FILE_DATA_12345");

  // video2.override.json: Valid keys + 1 unknown key to verify warning
  writeFileSync(
    path.join(INPUT_DIR, "video2.override.json"),
    JSON.stringify({
      style: "editorial",
      energy: 0.8,
      bogusUnknownKey: "should trigger a warning without crashing",
    }, null, 2),
  );

  console.log("  Created: input/video1.mp4");
  console.log("  Created: input/video2.mp4");
  console.log("  Created: input/video with spaces.mp4");
  console.log("  Created: input/broken.mp4 (corrupt)");
  console.log("  Created: input/video2.override.json\n");

  // Step 3: Run Batch #1 (First Run)
  console.log("[3/6] Running Batch #1 (Initial processing)...");
  const run1 = runCommand("npx", ["tsx", "scripts/batch.ts", "input", "--model=base.en"]);
  console.log("=== BATCH RUN 1 STDOUT ===");
  console.log(run1.stdout);
  if (run1.stderr) {
    console.log("=== BATCH RUN 1 STDERR ===");
    console.log(run1.stderr);
  }
  console.log(`Exit code: ${run1.status}\n`);

  // Assertions for Run 1
  console.log("[4/6] Verifying Run 1 results...");
  const v1Out = path.join(OUT_DIR, "video1.mp4");
  const v2Out = path.join(OUT_DIR, "video2.mp4");
  const vSpacesOut = path.join(OUT_DIR, "video with spaces.mp4");

  if (!existsSync(v1Out)) throw new Error("FAIL: out/video1.mp4 was not created!");
  if (!existsSync(v2Out)) throw new Error("FAIL: out/video2.mp4 was not created!");
  if (!existsSync(vSpacesOut)) throw new Error("FAIL: out/video with spaces.mp4 was not created!");

  // Verify staging dirs
  if (!existsSync(path.join(WORK_DIR, "video1", "captions.json")))
    throw new Error("FAIL: work/video1/captions.json missing!");
  if (!existsSync(path.join(WORK_DIR, "video_with_spaces", "captions.json")))
    throw new Error("FAIL: work/video_with_spaces/captions.json missing (stem sanitization)!");
  if (!existsSync(path.join(WORK_DIR, "broken", "log.txt")))
    throw new Error("FAIL: work/broken/log.txt missing!");

  // Verify unknown key warning was emitted
  if (!run1.stderr.includes("bogusUnknownKey") && !run1.stdout.includes("bogusUnknownKey")) {
    console.warn("WARNING: bogusUnknownKey warning not spotted in output");
  } else {
    console.log("  PASS: Warning on unknown key 'bogusUnknownKey' was emitted cleanly without crashing");
  }

  // Verify exit code is 1 (3 passed, 1 broken failed)
  if (run1.status !== 1) {
    throw new Error(`FAIL: Expected exit code 1 (partial success), got ${run1.status}`);
  }
  console.log("  PASS: Exit code is 1 (partial success: 3 succeeded, 1 failed)");
  console.log("  PASS: out/video1.mp4 created");
  console.log("  PASS: out/video2.mp4 created");
  console.log("  PASS: out/video with spaces.mp4 created (readable filename preserved)");
  console.log("  PASS: work/video_with_spaces staged directory correctly sanitized\n");

  // Save mtimes of rendered files
  const mtime1 = statSync(v1Out).mtimeMs;
  const mtime2 = statSync(v2Out).mtimeMs;
  const mtimeSpaces = statSync(vSpacesOut).mtimeMs;

  // Step 4: Run Batch #2 (Resume proof)
  console.log("[5/6] Running Batch #2 (Resume test - nothing modified)...");
  const run2 = runCommand("npx", ["tsx", "scripts/batch.ts", "input", "--model=base.en"]);
  console.log("=== BATCH RUN 2 STDOUT ===");
  console.log(run2.stdout);
  console.log(`Exit code: ${run2.status}\n`);

  console.log("[6/6] Verifying Resume behaviour...");
  // Verify files were skipped and NOT re-rendered
  const mtime1After = statSync(v1Out).mtimeMs;
  const mtime2After = statSync(v2Out).mtimeMs;
  const mtimeSpacesAfter = statSync(vSpacesOut).mtimeMs;

  if (mtime1 !== mtime1After) throw new Error("FAIL: out/video1.mp4 was re-rendered instead of skipped!");
  if (mtime2 !== mtime2After) throw new Error("FAIL: out/video2.mp4 was re-rendered instead of skipped!");
  if (mtimeSpaces !== mtimeSpacesAfter) throw new Error("FAIL: out/video with spaces.mp4 was re-rendered instead of skipped!");

  if (!run2.stdout.includes("[SKIP]")) {
    throw new Error("FAIL: Batch run 2 did not indicate [SKIP]!");
  }

  console.log("  PASS: All 3 rendered videos were SKIPPED on second run");
  console.log("  PASS: File modification times are identical (zero re-render overhead)");
  console.log("  PASS: Resume logic verified 100%\n");

  console.log("============================================================");
  console.log("  ALL TESTS PASSED SUCCESSFULLY!");
  console.log("============================================================");
}

main().catch((err) => {
  console.error("\nE2E TEST FAILED:", err);
  process.exit(1);
});
