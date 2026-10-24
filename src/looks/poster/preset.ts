import type { FontFamily, WordRole } from "../../types";

export const POSTER_PALETTE = {
  bone: "#F2F0EB",
  black: "#0B0B0B",
  signalRed: "#FF3B1D",
  electricBlue: "#2E5BFF",
  acid: "#D7FF3A",
  heroCycle: ["#FF3B1D", "#2E5BFF", "#D7FF3A"] as const,
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
    family: "Anton",
    weight: 400,
    scale: 2.2,
    uppercase: true,
    trackingEm: 0.01,
  },
  accent: {
    family: "Anton",
    weight: 400,
    scale: 1.4,
    uppercase: true,
    trackingEm: 0.02,
  },
  normal: {
    family: "Anton",
    weight: 400,
    scale: 1.0,
    uppercase: true,
    trackingEm: 0.01,
  },
  connector: {
    family: "Space Mono",
    weight: 400,
    scale: 0.5,
    uppercase: true,
    trackingEm: 0.04,
  },
};

export const POSTER_TOKENS = {
  name: "poster" as const,
  baseFontSizeU: 84,
  palette: POSTER_PALETTE,
  roles: POSTER_ROLES,
  tightLeading: 0.9,
};
