import type { FontFamily, WordRole } from "../../types";

export const POSTER_PALETTE = {
  bone: "#FFFFFF",
  black: "#05070B",
  signalRed: "#FF1744",
  electricBlue: "#00F0FF",
  acid: "#D4FF00",
  heroCycle: ["#D4FF00", "#00F0FF", "#FF1744"] as const,
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
    scale: 2.1,
    uppercase: true,
    trackingEm: 0.01,
  },
  accent: {
    family: "Anton",
    weight: 400,
    scale: 1.35,
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
    weight: 700,
    scale: 0.52,
    uppercase: true,
    trackingEm: 0.06,
  },
};

export const POSTER_TOKENS = {
  name: "poster" as const,
  baseFontSizeU: 80,
  palette: POSTER_PALETTE,
  roles: POSTER_ROLES,
  tightLeading: 0.92,
};
