import type { ChunkLayout, PlacedLine } from "../../template/word-layout";

export type JustifiedLineScale = {
  lineIndex: number;
  scaleX: number;
  targetWidth: number;
};

/**
 * Computes per-line scale so lines end flush in the justified poster block.
 * Per-line scale is clamped to [0.7, 1.3].
 */
export function computeJustifiedPosterScales(chunkLayout: ChunkLayout): Map<number, number> {
  const lineScales = new Map<number, number>();
  const lines = chunkLayout.lines;
  if (lines.length <= 1) {
    lineScales.set(0, 1.0);
    return lineScales;
  }

  // Find maximum line width to use as flush reference
  const maxWidth = Math.max(...lines.map((l) => l.width));
  if (maxWidth <= 0) return lineScales;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.width <= 0) {
      lineScales.set(i, 1.0);
      continue;
    }
    const rawScale = maxWidth / line.width;
    const clampedScale = Math.max(0.75, Math.min(1.28, rawScale));
    lineScales.set(i, clampedScale);
  }

  return lineScales;
}
