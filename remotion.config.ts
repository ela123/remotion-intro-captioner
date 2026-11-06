import path from "node:path";
import { existsSync } from "node:fs";
import { Config } from "@remotion/cli/config";
import { config } from "./src/intro.config";

Config.setEntryPoint("./src/index.ts");
Config.setVideoImageFormat("png");
Config.setColorSpace("bt709");
Config.setScale(config.outputScale);
Config.setCodec("h264");
Config.setCrf(17);
Config.setOverwriteOutput(true);
Config.setCachingEnabled(true);
Config.setTimeoutInMilliseconds(240000);

// Disable update notifications and telemetry for offline predictability
process.env.NO_UPDATE_NOTIFIER = "1";
process.env.REMOTION_DISABLE_TELEMETRY = "1";
process.env.REMOTION_TELEMETRY = "0";
process.env.OFFLINE = "1";

// Resolve browser executable:
// 1. Explicit environment override
// 2. Pre-cached Remotion Chromium headless shell
// 3. System Google Chrome / Chromium fallback
const cacheDir = path.join(process.cwd(), "node_modules", ".remotion", "chrome-headless-shell");
let cachedBrowser = "";
if (process.platform === "win32") {
  cachedBrowser = path.join(cacheDir, "win64", "chrome-headless-shell-win64", "chrome-headless-shell.exe");
} else if (process.platform === "linux") {
  cachedBrowser = path.join(cacheDir, "linux-x64", "chrome-headless-shell-linux64", "chrome-headless-shell");
} else {
  cachedBrowser = path.join(cacheDir, process.arch === "arm64" ? "mac-arm64" : "mac-x64", "chrome-headless-shell");
}

if (process.env.REMOTION_BROWSER_EXECUTABLE && existsSync(process.env.REMOTION_BROWSER_EXECUTABLE)) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
} else if (existsSync(cachedBrowser)) {
  Config.setBrowserExecutable(cachedBrowser);
} else if (process.platform === "win32" && existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")) {
  Config.setBrowserExecutable("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
} else if (process.platform === "linux" && existsSync("/usr/bin/google-chrome")) {
  Config.setBrowserExecutable("/usr/bin/google-chrome");
} else if (process.platform === "linux" && existsSync("/usr/bin/chromium-browser")) {
  Config.setBrowserExecutable("/usr/bin/chromium-browser");
} else if (process.platform === "linux" && existsSync("/usr/bin/chromium")) {
  Config.setBrowserExecutable("/usr/bin/chromium");
}
