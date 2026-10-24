import { seededFloat } from "../../utils/prng";

export type PopExitStyle = {
  scale: number;
  rotation: number;
  opacity: number;
};

/**
 * Pop-out exit: 6 frames
 * scale 1.0 -> 1.08 -> 0 with +/-8deg seeded rotation per line, lines staggered by 1 frame.
 */
export function getPopLineExit(
  frame: number,
  exitStartFrame: number,
  lineIndex: number,
  totalLines: number,
  seed: string,
): PopExitStyle {
  const lineStart = exitStartFrame + lineIndex * 1; // 1 frame stagger
  const progress = (frame - lineStart) / 5; // 5-6 frames duration
  const t = Math.max(0, Math.min(1, progress));

  if (t <= 0) {
    return { scale: 1, rotation: 0, opacity: 1 };
  }

  const lineSeed = `${seed}-pop-line-${lineIndex}`;
  const maxRot = seededFloat(lineSeed, -8, 8);

  let scale = 1;
  if (t < 0.3) {
    // 1.0 -> 1.08
    scale = 1 + (t / 0.3) * 0.08;
  } else {
    // 1.08 -> 0
    scale = 1.08 * (1 - (t - 0.3) / 0.7);
  }

  const rotation = maxRot * t;
  const opacity = t >= 0.95 ? 0 : 1;

  return {
    scale: Math.max(0, scale),
    rotation,
    opacity,
  };
}
