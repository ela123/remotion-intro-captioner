import type { FontFamily, WordRole } from "../../types";

export const POP_PALETTE = {
  ink: "#1B1B2F",
  cream: "#FFF8E7",
  pink: "#FF3D8B",
  yellow: "#FFD93D",
  sky: "#4CC9F0",
  mint: "#3DDC97",
  violet: "#7B5CFF",
  cycle: ["#FF3D8B", "#FFD93D", "#4CC9F0", "#3DDC97", "#7B5CFF"] as const,
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
    family: "Lilita One",
    weight: 400,
    scale: 2.0,
    uppercase: true,
    trackingEm: 0.02,
  },
  accent: {
    family: "Fredoka",
    weight: 700,
    scale: 1.35,
    uppercase: false,
    trackingEm: 0.01,
  },
  normal: {
    family: "Fredoka",
    weight: 600,
    scale: 1.0,
    uppercase: false,
    trackingEm: 0,
  },
  connector: {
    family: "Fredoka",
    weight: 500,
    scale: 0.6,
    uppercase: false,
    trackingEm: 0.05,
    opacity: 0.9,
  },
};

export const POP_TOKENS = {
  name: "pop" as const,
  baseFontSizeU: 78,
  palette: POP_PALETTE,
  roles: POP_ROLES,
  // Stroke & shadow rules
  strokeWidthEm: 0.18,
  dropShadow: "0.06em 0.08em 0 #1B1B2F",
  // Text fill contrast rule
  textColorForBacking: (bgColor: string): string => {
    const c = bgColor.toUpperCase();
    if (c === POP_PALETTE.yellow || c === POP_PALETTE.mint || c === POP_PALETTE.sky) {
      return POP_PALETTE.ink;
    }
    return POP_PALETTE.cream;
  },
};
