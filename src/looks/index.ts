import { EDITORIAL_PALETTE, EDITORIAL_ROLES, EDITORIAL_TOKENS } from "./editorial/preset";
import { POP_PALETTE, POP_ROLES, POP_TOKENS } from "./pop/preset";
import { POSTER_PALETTE, POSTER_ROLES, POSTER_TOKENS } from "./poster/preset";
import type { LookId, StyleTokens } from "../types";

export { POP_PALETTE, POP_ROLES, POP_TOKENS } from "./pop/preset";
export { EDITORIAL_PALETTE, EDITORIAL_ROLES, EDITORIAL_TOKENS } from "./editorial/preset";
export { POSTER_PALETTE, POSTER_ROLES, POSTER_TOKENS } from "./poster/preset";

export const LOOKS = {
  pop: POP_TOKENS,
  editorial: EDITORIAL_TOKENS,
  poster: POSTER_TOKENS,
} as const;

export function getLook(id: LookId) {
  return LOOKS[id] ?? POP_TOKENS;
}

export function lookToStyleTokens(lookId: LookId): StyleTokens {
  const look = getLook(lookId);
  return {
    name: lookId,
    roles: {
      hero: { ...look.roles.hero, color: "#FFFFFF" },
      accent: { ...look.roles.accent, color: "#FFFFFF" },
      normal: { ...look.roles.normal, color: "#FFFFFF" },
      connector: { ...look.roles.connector, color: "#FFFFFF" },
    },
    slots: {
      A: {
        family: look.roles.hero.family,
        weight: look.roles.hero.weight,
        sizeU: look.baseFontSizeU * look.roles.hero.scale,
        uppercase: look.roles.hero.uppercase,
        trackingEm: look.roles.hero.trackingEm,
        color: "#FFFFFF",
      },
      B: {
        family: look.roles.accent.family,
        weight: look.roles.accent.weight,
        sizeU: look.baseFontSizeU * look.roles.accent.scale,
        uppercase: look.roles.accent.uppercase,
        trackingEm: look.roles.accent.trackingEm,
        color: "#FFFFFF",
      },
      C: {
        family: look.roles.normal.family,
        weight: look.roles.normal.weight,
        sizeU: look.baseFontSizeU * look.roles.normal.scale,
        uppercase: look.roles.normal.uppercase,
        trackingEm: look.roles.normal.trackingEm,
        color: "#FFFFFF",
      },
    },
    recipe: {
      anticipationFrames: 2,
      exitOrder: "forward",
      settle: { overshoot: 0.15, frames: 6 },
    },
    durationMultiplier: 1.0,
    emphasis: {
      pop: lookId === "pop",
      accentColor: lookId === "editorial" ? EDITORIAL_PALETTE.vermilion : POP_PALETTE.yellow,
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
}
