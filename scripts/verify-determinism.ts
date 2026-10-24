import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function hashFile(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function run(): Promise<void> {
  const frame = process.argv[2] ? Number.parseInt(process.argv[2], 10) : 30;
  console.log(`Verifying frame determinism at frame ${frame}...`);

  const outDir = path.resolve("out");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const run1 = path.join(outDir, "det_run1.png");
  const run2 = path.join(outDir, "det_run2.png");

  if (fs.existsSync(run1)) fs.unlinkSync(run1);
  if (fs.existsSync(run2)) fs.unlinkSync(run2);

  console.log("Rendering run 1...");
  execSync(`npx remotion still LayeredCaption ${run1} --frame=${frame} --props=./props/final.json`, {
    stdio: "inherit",
  });

  console.log("Rendering run 2...");
  execSync(`npx remotion still LayeredCaption ${run2} --frame=${frame} --props=./props/final.json`, {
    stdio: "inherit",
  });

  const hash1 = hashFile(run1);
  const hash2 = hashFile(run2);

  console.log(`Run 1 SHA-256: ${hash1}`);
  console.log(`Run 2 SHA-256: ${hash2}`);

  if (hash1 === hash2) {
    console.log("✅ Frame determinism verified! Exact byte-for-byte pixel match.");
    process.exit(0);
  } else {
    console.error("❌ Determinism failed! Hashes differ.");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
