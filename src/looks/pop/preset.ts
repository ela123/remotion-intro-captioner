import type { FontFamily, WordRole } from "../../types";

// ─── THERMAL · Pop Palette ───────────────────────────────────────────────────
// Warm cinematic broadcast: amber / coral / electric chartreuse
export const POP_PALETTE = {
  ink:    "#0D0F14",          // Near-black base
  cream:  "#FEFCE8",          // Warm off-white
  amber:  "#F59E0B",          // Primary accent: deep amber
  coral:  "#FF6B6B",          // Secondary: vivid coral
  lime:   "#A3E635",          // Tertiary: electric lime
  sky:    "#38BDF8",          // Cool pop: sky blue
  violet: "#A78BFA",          // Luxe violet
  cycle:  ["#F59E0B", "#FF6B6B", "#A3E635", "#38BDF8", "#A78BFA"] as const,
};

export const POP_ROLES: Record<
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
    family: "DM Sans",
    weight: 900,
    scale: 1.9,
    uppercase: true,
    trackingEm: -0.02,
  },
  accent: {
    family: "DM Sans",
    weight: 700,
    scale: 1.3,
    uppercase: false,
    trackingEm: -0.01,
  },
  normal: {
    family: "DM Sans",
    weight: 600,
    scale: 1.0,
    uppercase: false,
    trackingEm: 0,
  },
  connector: {
    family: "DM Sans",
    weight: 400,
    scale: 0.62,
    uppercase: true,
    trackingEm: 0.1,
    opacity: 0.75,
  },
};

export const POP_TOKENS = {
  name: "pop" as const,
  baseFontSizeU: 76,
  palette: POP_PALETTE,
  roles: POP_ROLES,
  strokeWidthEm: 0,
  dropShadow: "0 4px 24px rgba(0,0,0,0.9)",
  textColorForBacking: (bgColor: string): string => {
    const c = bgColor.toUpperCase();
    if (
      c === POP_PALETTE.amber.toUpperCase() ||
      c === POP_PALETTE.lime.toUpperCase() ||
      c === POP_PALETTE.sky.toUpperCase()
    ) {
      return POP_PALETTE.ink;
    }
    return POP_PALETTE.cream;
  },
};
