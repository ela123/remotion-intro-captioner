import { seededFloat } from "../../utils/prng";

export type PopExitStyle = {
  scale: number;
  rotation: number;
  opacity: number;
};

/**
 * Pop-out exit: 5-6 frames
 * Smooth cinematic zoom-dissolve (1.0 -> 1.03 -> 0.92, opacity 1 -> 0) with subtle organic micro-drift.
 */
export function getPopLineExit(
  frame: number,
  exitStartFrame: number,
  lineIndex: number,
  totalLines: number,
  seed: string,
): PopExitStyle {
  const lineStart = exitStartFrame + lineIndex * 1;
  const progress = (frame - lineStart) / 5;
  const t = Math.max(0, Math.min(1, progress));

  if (t <= 0) {
    return { scale: 1, rotation: 0, opacity: 1 };
  }

  const lineSeed = `${seed}-pop-line-${lineIndex}`;
  const maxRot = seededFloat(lineSeed, -1.8, 1.8);

  let scale = 1;
  if (t < 0.3) {
    // Subtle anticipation snap (1.0 -> 1.03)
    scale = 1 + (t / 0.3) * 0.03;
  } else {
    // Smooth cinematic dissolve
    scale = 1.03 - ((t - 0.3) / 0.7) * 0.12;
  }

  const rotation = maxRot * t;
  const opacity = Math.max(0, 1 - t * 1.05);

  return {
    scale: Math.max(0, scale),
    rotation,
    opacity,
  };
}
