import { Config } from "@remotion/cli/config";
import { config } from "./src/intro.config";

Config.setEntryPoint("./src/index.ts");
Config.setVideoImageFormat("png");
Config.setColorSpace("bt709");
Config.setScale(config.outputScale);
Config.setCodec("h264");
Config.setCrf(17);
Config.setOverwriteOutput(true);
Config.setTimeoutInMilliseconds(120000);
