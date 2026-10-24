export type EditorialExitStyle = {
  translateYPercent: number;
  opacity: number;
};

/**
 * Editorial Drop Exit: 6 frames
 * Words fall downward through the mask (+120%), lines staggered by 1 frame,
 * bottom line leaves first!
 */
export function getEditorialLineExit(
  frame: number,
  exitStartFrame: number,
  lineIndex: number,
  totalLines: number,
): EditorialExitStyle {
  // Bottom line leaves first: inverted lineIndex
  const invertedIndex = Math.max(0, totalLines - 1 - lineIndex);
  const lineStart = exitStartFrame + invertedIndex * 1;
  const progress = (frame - lineStart) / 5;
  const t = Math.max(0, Math.min(1, progress));

  if (t <= 0) {
    return { translateYPercent: 0, opacity: 1 };
  }

  // Fall downward accelerating: t^2
  const translateYPercent = t * t * 130;
  const opacity = t >= 0.95 ? 0 : 1;

  return {
    translateYPercent,
    opacity,
  };
}
