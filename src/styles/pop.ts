import { POP_PALETTE, POP_ROLES, POP_TOKENS } from "../looks/pop/preset";
import type { StyleTokens } from "../types";

export { POP_PALETTE, POP_ROLES, POP_TOKENS } from "../looks/pop/preset";

export const POP_THEME: StyleTokens = {
  name: "pop",
  slots: {
    A: {
      family: "DM Sans",
      weight: 900,
      sizeU: 140,
      uppercase: true,
      trackingEm: -0.01,
      color: POP_PALETTE.yellow,
    },
    B: {
      family: "DM Sans",
      weight: 700,
      sizeU: 95,
      uppercase: false,
      trackingEm: 0,
      color: POP_PALETTE.cyan,
    },
    C: {
      family: "DM Sans",
      weight: 600,
      sizeU: 76,
      uppercase: false,
      trackingEm: 0,
      color: POP_PALETTE.cream,
    },
  },
  roles: {
    hero: { ...POP_ROLES.hero, color: POP_PALETTE.yellow },
    accent: { ...POP_ROLES.accent, color: POP_PALETTE.cyan },
    normal: { ...POP_ROLES.normal, color: POP_PALETTE.cream },
    connector: { ...POP_ROLES.connector, color: POP_PALETTE.cream },
  },
  recipe: {
    anticipationFrames: 2,
    exitOrder: "forward",
    settle: { overshoot: 0.15, frames: 6 },
  },
  durationMultiplier: 1.0,
  emphasis: {
    pop: true,
    accentColor: POP_PALETTE.yellow,
    underline: false,
    glowPulse: false,
  },
  effects: {
    scrim: false,
    shadow: true,
    depthLayer: false,
    glow: false,
    glitch: false,
    grain: false,
  },
};
