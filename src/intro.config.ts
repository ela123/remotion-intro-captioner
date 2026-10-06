import type { IntroConfig, StylePreset } from "./types";

export const config: IntroConfig = {
  video: "intro.mp4",
  proxyVideo: "intro.proxy.mp4",
  srt: "captions.srt",
  captionsJson: "captions.json",
  srtOffsetMs: 0,
  maxDurationSec: 30,
  cueSource: "srt",

  style: "bold-energetic" as StylePreset,
  recipe: {},

  layout: {
    anchor: { vertical: "center", horizontal: "center" },
    align: "center",
    safeArea: { x: 0.08, y: 0.08 },
    lineGap: 0.12,
    offsetY: 0,
    maxWordsPerLine: 5,
    maxLinesPerChunk: 3,
  },

  palette: { enabled: false },

  effects: {
    scrim: true,
    shadow: true,
    depthLayer: "auto",
    glow: "auto",
    glitch: "auto",
    grain: "auto",
  },

  motionBlur: { enabled: true },
  drift: false,

  outputScale: 1,
  render: { concurrency: 2 },
};
