import type { FontFamily, WordRole } from "../../types";

// ─── THERMAL SIGNAL · Poster Palette ─────────────────────────────────────────
// Pure black canvas, warm neon fills: amber / coral / electric lime
export const POSTER_PALETTE = {
  bone:         "#F9F7F1",          // Warm near-white type
  black:        "#080808",          // Near-black background
  amber:        "#F59E0B",          // Primary fill: deep amber
  coral:        "#FF5A5A",          // Secondary fill: vivid coral
  lime:         "#AADF2E",          // Tertiary fill: electric lime
  heroCycle:    ["#F59E0B", "#FF5A5A", "#AADF2E"] as const,
  electricBlue: "#38BDF8",          // kept for index.ts compatibility
  signalRed:    "#EF4444",          // kept for compatibility
  acid:         "#AADF2E",          // alias
};

export const POSTER_ROLES: Record<
  WordRole,
  {
    family: FontFamily;
    weight: number;
    scale: number;
    uppercase: boolean;
    trackingEm: number;
    opacity?: number;
    fontStyle?: "normal" | "italic";
  }
> = {
  hero: {
    family:     "Anton",
    weight:     400,
    scale:      2.15,
    uppercase:  true,
    trackingEm: 0.01,
  },
  accent: {
    family:     "Anton",
    weight:     400,
    scale:      1.35,
    uppercase:  true,
    trackingEm: 0.02,
  },
  normal: {
    family:     "Anton",
    weight:     400,
    scale:      1.0,
    uppercase:  true,
    trackingEm: 0.01,
  },
  connector: {
    family:     "DM Sans",
    weight:     500,
    scale:      0.5,
    uppercase:  true,
    trackingEm: 0.08,
    opacity:    0.7,
  },
};

export const POSTER_TOKENS = {
  name:          "poster" as const,
  baseFontSizeU: 82,
  palette:       POSTER_PALETTE,
  roles:         POSTER_ROLES,
  tightLeading:  0.91,
};
