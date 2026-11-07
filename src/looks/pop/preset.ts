import type { FontFamily, WordRole } from "../../types";

export const POP_PALETTE = {
  ink: "#080A12",
  cream: "#FFFFFF",
  pink: "#FF2A6D",
  yellow: "#FACC15",
  sky: "#00F0FF",
  mint: "#22C55E",
  violet: "#8B5CF6",
  cyan: "#00F0FF",
  cycle: ["#00F0FF", "#22C55E", "#FACC15", "#FF2A6D", "#8B5CF6"] as const,
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
    scale: 1.85,
    uppercase: true,
    trackingEm: -0.01,
  },
  accent: {
    family: "DM Sans",
    weight: 700,
    scale: 1.25,
    uppercase: false,
    trackingEm: 0,
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
    weight: 500,
    scale: 0.65,
    uppercase: true,
    trackingEm: 0.08,
    opacity: 0.8,
  },
};

export const POP_TOKENS = {
  name: "pop" as const,
  baseFontSizeU: 76,
  palette: POP_PALETTE,
  roles: POP_ROLES,
  // Stroke & shadow rules
  strokeWidthEm: 0,
  dropShadow: "0 4px 20px rgba(0, 0, 0, 0.85)",
  // Text fill contrast rule
  textColorForBacking: (bgColor: string): string => {
    const c = bgColor.toUpperCase();
    if (c === POP_PALETTE.yellow || c === POP_PALETTE.mint || c === POP_PALETTE.sky || c === "#00F0FF" || c === "#22C55E" || c === "#FACC15") {
      return POP_PALETTE.ink;
    }
    return POP_PALETTE.cream;
  },
};
