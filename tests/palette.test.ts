import { describe, expect, it } from "vitest";
import { STYLES } from "../src/styles";
import { applyPalette, contrastRatio, darken, saturation } from "../src/styles/palette";
import type { Palette } from "../src/types";

const palette = (accent: string): Palette => ({ dominant: "#808080", accent, dark: "#101010", light: "#F5F5F5" });

describe("contrastRatio", () => {
  it("white on black is 21", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 5);
  });

  it("identical colors are 1", () => {
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });

  it("matches known pairs", () => {
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
    expect(contrastRatio("rgb(255, 0, 0)", "#FFFFFF")).toBeCloseTo(4.0, 1);
  });

  it("treats unparseable colors as failing", () => {
    expect(contrastRatio("nope", "#000000")).toBe(1);
  });
});

describe("applyPalette", () => {
  it("returns the style unchanged for a null palette", () => {
    expect(applyPalette(STYLES.pop, null)).toBe(STYLES.pop);
  });

  it("keeps defaults when the accent fails contrast against #111111", () => {
    expect(applyPalette(STYLES.editorial, palette("#222244"))).toBe(STYLES.editorial);
  });

  it("replaces the emphasis accent when contrast passes", () => {
    const result = applyPalette(STYLES.pop, palette("#7CFC00"));
    expect(result.emphasis.accentColor).toBe("#7CFC00");
  });
});

describe("colour helpers", () => {
  it("darkens towards black", () => {
    expect(darken("#FFFFFF", 0.5)).toBe("rgb(128, 128, 128)");
    expect(darken("rgba(200, 100, 50, 0.9)", 1)).toBe("rgb(0, 0, 0)");
    expect(darken("#123456", 0)).toBe("rgb(18, 52, 86)");
  });

  it("measures saturation", () => {
    expect(saturation("#FFFFFF")).toBe(0);
    expect(saturation("#000")).toBe(0);
    expect(saturation("#FF0000")).toBe(1);
    expect(saturation("not a colour")).toBe(0);
  });
});
