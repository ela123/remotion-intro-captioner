import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const INPUT_DIR = path.resolve("input");
mkdirSync(INPUT_DIR, { recursive: true });

console.log("Generating speech audio via Windows SpeechSynthesizer...");
const psScript = `
Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.SetOutputToWaveFile("test-speech-1.wav")
$speaker.Speak("Welcome to the video captioner studio")
$speaker.SetOutputToWaveFile("test-speech-2.wav")
$speaker.Speak("This is the second test video clip")
$speaker.SetOutputToWaveFile("test-speech-3.wav")
$speaker.Speak("Here is a video with spaces in filename")
$speaker.Dispose()
`;

writeFileSync("generate-speech.ps1", psScript, "utf8");
execSync("powershell -ExecutionPolicy Bypass -File generate-speech.ps1", { stdio: "inherit" });
rmSync("generate-speech.ps1", { force: true });

console.log("Generating test videos with ffmpeg...");

// 1. video1.mp4 (2s, 320x180)
execSync(
  'ffmpeg -y -f lavfi -i testsrc=duration=2:size=320x180:rate=30 -i test-speech-1.wav -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "input/video1.mp4"',
  { stdio: "inherit" }
);

// 2. video2.mp4 (2s, 320x180)
execSync(
  'ffmpeg -y -f lavfi -i testsrc=duration=2:size=320x180:rate=30 -i test-speech-2.wav -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "input/video2.mp4"',
  { stdio: "inherit" }
);

// 3. video with spaces.mp4 (2s, 320x180)
execSync(
  'ffmpeg -y -f lavfi -i testsrc=duration=2:size=320x180:rate=30 -i test-speech-3.wav -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "input/video with spaces.mp4"',
  { stdio: "inherit" }
);

// 4. broken.mp4 (invalid corrupt data)
writeFileSync(path.join(INPUT_DIR, "broken.mp4"), "CORRUPT_INVALID_HEADER_GARBAGE_DATA_12345");

// 5. video2.override.json (valid keys + 1 unknown key to verify warning)
writeFileSync(
  path.join(INPUT_DIR, "video2.override.json"),
  JSON.stringify(
    {
      style: "editorial",
      energy: 0.8,
      bogusKeyShouldWarn: "testing key validation warning",
    },
    null,
    2
  )
);

// Clean up temp wavs
try { rmSync("test-speech-1.wav", { force: true }); } catch {}
try { rmSync("test-speech-2.wav", { force: true }); } catch {}
try { rmSync("test-speech-3.wav", { force: true }); } catch {}
try { rmSync("test-speech.wav", { force: true }); } catch {}

console.log("Test fixtures successfully created in input/ directory!");
