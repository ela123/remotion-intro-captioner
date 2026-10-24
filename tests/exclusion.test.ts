import { describe, expect, it } from "vitest";
import { seededChoice, seededFloat, seededInt } from "../src/utils/prng";

type Box = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function boxesOverlap(a: Box, b: Box): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

describe("Decoration Exclusion Box Placement", () => {
  it("guarantees no placed decoration intersects the text exclusion box across 100 seeds", () => {
    const unit = 1;
    // Mock text bounds
    const bounds = { x: 400, y: 700, width: 800, height: 160 };
    const pad = 65 * unit;

    const exclusionBox: Box = {
      minX: bounds.x - pad,
      maxX: bounds.x + bounds.width + pad,
      minY: bounds.y - pad,
      maxY: bounds.y + bounds.height + pad,
    };

    for (let seedIdx = 0; seedIdx < 100; seedIdx++) {
      const startFrame = seedIdx * 60;
      const count = seededInt(`pop-doodles-${startFrame}`, 3, 5);

      for (let i = 0; i < count; i++) {
        const seed = `pop-doodle-${startFrame}-${i}`;
        let placedBox: Box | null = null;

        for (let attempt = 0; attempt < 8; attempt++) {
          const attemptSeed = `${seed}-att-${attempt}`;
          const candX = seededFloat(`${attemptSeed}-x`, 80 * unit, 1840 * unit);
          const candY = seededFloat(`${attemptSeed}-y`, 120 * unit, 960 * unit);
          const size = seededFloat(`${attemptSeed}-sz`, 26 * unit, 44 * unit);

          const candidateBox: Box = {
            minX: candX - size,
            maxX: candX + size,
            minY: candY - size,
            maxY: candY + size,
          };

          if (!boxesOverlap(candidateBox, exclusionBox)) {
            placedBox = candidateBox;
            break;
          }
        }

        if (placedBox) {
          expect(boxesOverlap(placedBox, exclusionBox)).toBe(false);
        }
      }
    }
  });
});
