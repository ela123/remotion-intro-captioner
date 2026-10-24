import type { FontFamily, WordRole } from "../../types";

export const EDITORIAL_PALETTE = {
  paper: "#F4EFE6",
  ink: "#111111",
  vermilion: "#E4572E",
  gold: "#C9A227",
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
    weight: 700,
    scale: 2.1,
    uppercase: false,
    trackingEm: -0.01,
    fontStyle: "italic",
  },
  accent: {
    family: "Fraunces",
    weight: 600,
    scale: 1.25,
    uppercase: false,
    trackingEm: 0,
    fontStyle: "normal",
  },
  normal: {
    family: "Fraunces",
    weight: 400,
    scale: 1.0,
    uppercase: false,
    trackingEm: 0.01,
    fontStyle: "normal",
  },
  connector: {
    family: "DM Sans",
    weight: 500,
    scale: 0.55,
    uppercase: true,
    trackingEm: 0.12,
    opacity: 0.85,
  },
};

export const EDITORIAL_TOKENS = {
  name: "editorial" as const,
  baseFontSizeU: 64,
  palette: EDITORIAL_PALETTE,
  roles: EDITORIAL_ROLES,
  shadowPreview: "0 2px 4px rgba(0, 0, 0, 0.6)",
  shadowFinal: "0 2px 4px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.35)",
};
