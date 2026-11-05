import { Config } from "@remotion/cli/config";
import { config } from "./src/intro.config";

Config.setEntryPoint("./src/index.ts");
Config.setVideoImageFormat("png");
Config.setColorSpace("bt709");
Config.setScale(config.outputScale);
Config.setCodec("h264");
Config.setCrf(17);
Config.setOverwriteOutput(true);
Config.setTimeoutInMilliseconds(600000);

// Disable update notifications and telemetry for offline predictability
process.env.NO_UPDATE_NOTIFIER = "1";
process.env.REMOTION_DISABLE_TELEMETRY = "1";
process.env.REMOTION_TELEMETRY = "0";

// Optional manual override for browser executable (only if cached browser fails)
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
