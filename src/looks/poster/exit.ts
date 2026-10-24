export type PosterExitStyle = {
  wipeProgress: number; // 0 to 1 across the block
  opacity: number;
};

/**
 * Poster Bar-Wipe-Out: 5 frames
 * A full-width color bar sweeps left to right covering the block,
 * once wiped (t=1), the chunk is gone.
 */
export function getPosterExit(frame: number, exitStartFrame: number): PosterExitStyle {
  const duration = 5;
  const progress = (frame - exitStartFrame) / duration;
  const t = Math.max(0, Math.min(1, progress));

  return {
    wipeProgress: t,
    opacity: t >= 0.99 ? 0 : 1,
  };
}
