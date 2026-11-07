import type { FontFamily, WordRole } from "../../types";

export const EDITORIAL_PALETTE = {
  paper: "#F8FAFC",
  ink: "#0A0D14",
  vermilion: "#FF453A",
  gold: "#F3CE72",
  amber: "#E5A93C",
  slate: "#94A3B8",
};

export const EDITORIAL_ROLES: Record<
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
    family: "Fraunces",
    weight: 800,
    scale: 1.95,
    uppercase: false,
    trackingEm: -0.01,
    fontStyle: "italic",
  },
  accent: {
    family: "DM Sans",
    weight: 700,
    scale: 1.22,
    uppercase: false,
    trackingEm: 0,
    fontStyle: "normal",
  },
  normal: {
    family: "DM Sans",
    weight: 500,
    scale: 1.0,
    uppercase: false,
    trackingEm: 0.01,
    fontStyle: "normal",
  },
  connector: {
    family: "Space Mono",
    weight: 700,
    scale: 0.52,
    uppercase: true,
    trackingEm: 0.12,
    opacity: 0.8,
  },
};

export const EDITORIAL_TOKENS = {
  name: "editorial" as const,
  baseFontSizeU: 68,
  palette: EDITORIAL_PALETTE,
  roles: EDITORIAL_ROLES,
  shadowPreview: "0 4px 16px rgba(0, 0, 0, 0.6)",
  shadowFinal: "0 6px 24px rgba(0, 0, 0, 0.75)",
};
