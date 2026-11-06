import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { config } from "../src/intro.config";

const videoInput = path.join("public", config.video);
const captionsInput = path.join("out", "captions.webm");
const outputDir = "out";
const finalOutput = path.join(outputDir, "final.mp4");

if (!existsSync(captionsInput)) {
  console.error(`Error: ${captionsInput} not found. Run "npm run render:captions" first.`);
  process.exit(1);
}

if (!existsSync(videoInput)) {
  console.error(`Error: Base video ${videoInput} not found.`);
  process.exit(1);
}

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

console.log(`Overlaying ${captionsInput} onto ${videoInput} -> ${finalOutput}...`);

const ffmpegArgs = [
  "-y",
  "-i",
  videoInput,
  "-c:v",
  "libvpx",
  "-i",
  captionsInput,
  "-filter_complex",
  "[0:v][1:v]overlay=0:0[outv]",
  "-map",
  "[outv]",
  "-map",
  "0:a?",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-c:a",
  "copy",
  finalOutput,
];

const res = spawnSync("ffmpeg", ffmpegArgs, { stdio: "inherit" });

if (res.status !== 0) {
  console.error(`FFmpeg overlay failed with exit code ${res.status}`);
  process.exit(res.status ?? 1);
}

console.log(`Successfully created ${finalOutput}`);
