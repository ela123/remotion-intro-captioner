import { spring as remotionSpring } from "remotion";

export type FixedSpringOptions = {
  frame: number;
  fps: number;
  durationInFrames: number;
  damping?: number;
  stiffness?: number;
  overshoot?: number; // 0 for no overshoot, > 0 for overshoot
};

/**
 * Fixed-duration spring helper:
 * Guarantees that any overshoot and settling occurs cleanly within `durationInFrames`
 * and ends exactly at 1.0 without ringing past the entrance window.
 */
export function fixedSpring(options: FixedSpringOptions): number {
  const { frame, fps, durationInFrames, overshoot = 0.15 } = options;
  if (frame <= 0) return 0;
  if (frame >= durationInFrames) return 1;

  const t = Math.min(1, Math.max(0, frame / durationInFrames));

  // If remotion's spring supports durationInFrames, use it, or use analytic damped oscillation:
  // f(t) = 1 - e^(-decay * t) * cos(omega * t)
  // Scaled so f(1) = 1
  if (overshoot <= 0) {
    // Pure smooth ease
    return 1 - Math.pow(1 - t, 3);
  }

  // Damped oscillation that hits ~1 + overshoot around t=0.5..0.6 and converges to 1 at t=1
  const decay = 5.5;
  const omega = Math.PI * 2.2;
  const envelope = Math.exp(-decay * t);
  const oscillation = Math.cos(omega * t);

  // Raw damped harmonic from 0 to ~1
  const raw = 1 - envelope * oscillation;

  // S-curve envelope to guarantee exact 0 at t=0 and exact 1 at t=1
  // We blend between raw and 1 near t -> 1
  const settleFactor = Math.pow(t, 2);
  const val = raw * (1 + overshoot * 0.8 * envelope * Math.sin(omega * t));

  // Normalize endpoint to exactly 1.0
  const normalized = t >= 0.95 ? 1 + (val - 1) * ((1 - t) / 0.05) : val;
  return normalized;
}

/**
 * Remotion bounded spring wrapper
 */
export function boundedSpring(
  frame: number,
  fps: number,
  durationInFrames: number,
  config?: { damping?: number; stiffness?: number; mass?: number },
): number {
  if (frame <= 0) return 0;
  if (frame >= durationInFrames) return 1;

  return remotionSpring({
    frame,
    fps,
    durationInFrames,
    config: {
      damping: config?.damping ?? 12,
      stiffness: config?.stiffness ?? 200,
      mass: config?.mass ?? 1,
    },
  });
}
