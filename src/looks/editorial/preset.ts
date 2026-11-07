import type { FontFamily, WordRole } from "../../types";

// ─── OBSIDIAN STUDIO · Editorial Palette ─────────────────────────────────────
// Deep charcoal backgrounds, cool whites, sapphire accent line, warm champagne
export const EDITORIAL_PALETTE = {
  paper:    "#F7F6F2",          // Warm near-white
  ink:      "#0C0D10",          // Near-black
  sapphire: "#3B82F6",          // Accent: electric sapphire blue
  champagne:"#E8C87A",          // Secondary: warm champagne gold
  slate:    "#94A3B8",          // Subdued connector tone
  vermilion:"#EF4444",          // Emphasis hot-red (kept for compatibility)
  gold:     "#E8C87A",          // Alias for compatibility with index.ts lookToStyleTokens
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
    family:     "Fraunces",
    weight:     800,
    scale:      1.95,
    uppercase:  false,
    trackingEm: -0.02,
    fontStyle:  "italic",
  },
  accent: {
    family:     "Fraunces",
    weight:     600,
    scale:      1.2,
    uppercase:  false,
    trackingEm: 0,
    fontStyle:  "normal",
  },
  normal: {
    family:     "DM Sans",
    weight:     500,
    scale:      1.0,
    uppercase:  false,
    trackingEm: 0.01,
    fontStyle:  "normal",
  },
  connector: {
    family:     "DM Sans",
    weight:     400,
    scale:      0.52,
    uppercase:  true,
    trackingEm: 0.14,
    opacity:    0.72,
  },
};

export const EDITORIAL_TOKENS = {
  name:          "editorial" as const,
  baseFontSizeU: 66,
  palette:       EDITORIAL_PALETTE,
  roles:         EDITORIAL_ROLES,
  shadowPreview: "0 3px 16px rgba(0,0,0,0.65)",
  shadowFinal:   "0 4px 22px rgba(0,0,0,0.80)",
};
