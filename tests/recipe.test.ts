import { describe, expect, it } from "vitest";
import { getStyle, STYLES } from "../src/styles";
import { DEFAULT_RECIPE, mergeRecipe, resolveRecipe } from "../src/template/recipe";
import type { LookId } from "../src/types";

describe("mergeRecipe", () => {
  it("keeps defaults when overrides are empty", () => {
    expect(mergeRecipe(DEFAULT_RECIPE)).toEqual(DEFAULT_RECIPE);
  });

  it("merges deeply without dropping unrelated fields", () => {
    const merged = mergeRecipe(DEFAULT_RECIPE, {
      lines: [{ enter: { ease: "outBack" } }],
      settle: { overshoot: 0.1 },
    });
    expect(merged.lines[0].enter.ease).toBe("outBack");
    expect(merged.lines[0].enter.frames).toBe(DEFAULT_RECIPE.lines[0].enter.frames);
    expect(merged.lines[1]).toEqual(DEFAULT_RECIPE.lines[1]);
    expect(merged.settle.overshoot).toBe(0.1);
    expect(merged.settle.frames).toBe(DEFAULT_RECIPE.settle.frames);
  });
});

describe("resolveRecipe", () => {
  it("resolves recipe with style and slots", () => {
    const resolved = resolveRecipe(STYLES.pop);
    expect(resolved.style).toBe(STYLES.pop);
    expect(resolved.slotTypography).toEqual(STYLES.pop.slots);
  });

  it("override beats style", () => {
    const resolved = resolveRecipe(STYLES.pop, {
      lines: [{ enter: { ease: "pop" } }],
      settle: { overshoot: 0.05 },
    });
    expect(resolved.lines[0].enter.ease).toBe("pop");
    expect(resolved.settle.overshoot).toBe(0.05);
  });
});

describe("getStyle", () => {
  it.each(["pop", "editorial", "poster"] as LookId[])("returns known look %s without warning", (name) => {
    expect(getStyle(name)).toEqual({ style: STYLES[name], warning: null });
  });

  it("falls back to pop with a warning", () => {
    const { style, warning } = getStyle("vaporwave");
    expect(style.name).toBe("pop");
    expect(warning).toContain("vaporwave");
  });
});
