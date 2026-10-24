import { describe, expect, it } from "vitest";
import { STYLES } from "../src/styles";
import { resolveActiveStyle, resolveEffects } from "../src/template/active-style";
import { MAX_LISTED_WARNINGS, studioWarnings } from "../src/template/studio-warnings";
import { referenceUnit } from "../src/template/units";
import type { IntroConfig } from "../src/types";

type EffectSettings = Pick<IntroConfig, "effects" | "motionBlur" | "drift">;

const settings = (effects: Partial<IntroConfig["effects"]> = {}, drift = false): EffectSettings => ({
  effects: { scrim: false, shadow: true, depthLayer: false, glow: false, glitch: false, grain: false, ...effects },
  motionBlur: { enabled: true },
  drift,
});

describe("referenceUnit", () => {
  it.each([
    [1920, 1080, 1],
    [3840, 2160, 2],
    [1280, 720, 2 / 3],
    [1080, 1920, 1],
    [2160, 3840, 2],
    [1080, 1080, 1],
  ])("%ix%i -> %d", (width, height, unit) => {
    expect(referenceUnit(width, height)).toBeCloseTo(unit, 9);
  });

  it("matches the old width / 1920 scale for every 16:9 frame", () => {
    for (const height of [360, 720, 1080, 1440, 2160]) {
      expect(referenceUnit((height * 16) / 9, height)).toBeCloseTo(((height * 16) / 9) / 1920, 9);
    }
  });
});

describe("resolveEffects", () => {
  it("drops motion blur, glitch, grain and drift in preview", () => {
    for (const style of Object.values(STYLES)) {
      expect(resolveEffects(style, "preview", settings({}, true))).toMatchObject({
        motionBlur: false,
        glitch: false,
        grain: false,
        drift: false,
      });
    }
  });
});

describe("resolveActiveStyle", () => {
  it("falls back to pop with a warning and applies config recipe overrides", () => {
    const active = resolveActiveStyle({
      style: "comic" as any,
      palette: { enabled: false },
      recipe: { anticipationFrames: 5 },
    });
    expect(active.style.name).toBe("pop");
    expect(active.warning).toContain("comic");
    expect(active.recipe.anticipationFrames).toBe(5);
  });
});

describe("studioWarnings", () => {
  it("is hidden while rendering and when there is nothing to show", () => {
    expect(studioWarnings(["x"], { isRendering: true })).toBeNull();
    expect(studioWarnings([], { isRendering: false })).toBeNull();
  });

  it("shows up to MAX_LISTED_WARNINGS items and a counter for the rest", () => {
    const warnings = Array.from({ length: MAX_LISTED_WARNINGS + 3 }, (_, i) => `w${i}`);
    const badge = studioWarnings(warnings, { isRendering: false });
    expect(badge?.count).toBe(MAX_LISTED_WARNINGS + 3);
    expect(badge?.listed).toHaveLength(MAX_LISTED_WARNINGS);
    expect(badge?.hidden).toBe(3);
  });
});
