import type { IntroConfig, LookId } from "./types";

export const config: IntroConfig = {
  video: "intro.mp4",
  proxyVideo: "intro.proxy.mp4",
  srt: "captions.srt",
  captionsJson: "captions.json",
  srtOffsetMs: 0,
  maxDurationSec: 30,
  cueSource: "json",

  // Multi-look Director system
  looks: {
    enabled: ["pop", "editorial", "poster"] as LookId[],
    force: null, // or a LookId to lock one look
    sequence: null, // or LookId[] to hand-author the plan
    energy: 1, // 0..1, scales shake/overshoot/confetti
  },
  debug: false, // draws safe areas, exclusion boxes and active look label

  style: "pop",
  recipe: {},

  layout: {
    anchor: { vertical: "bottom", horizontal: "center" },
    align: "center",
    safeArea: { x: 0.08, y: 0.12 },
    lineGap: 0.14,
    offsetY: 0,
    maxWordsPerLine: 4,
    maxLinesPerChunk: 2,
  },

  palette: { enabled: false },

  effects: {
    scrim: false,
    shadow: true,
    depthLayer: false,
    glow: false,
    glitch: false,
    grain: false,
  },

  footageIsLight: false,
  motionBlur: { enabled: false },
  drift: false,

  outputScale: 1,
  render: { concurrency: 2 },
};
