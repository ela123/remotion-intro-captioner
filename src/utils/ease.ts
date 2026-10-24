/**
 * Named easing curves
 * pure functions taking t in [0, 1] and returning progress in [0, 1] (or with overshoot)
 */

export function expoOut(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function backOut(overshoot = 1.4): (t: number) => number {
  const c1 = overshoot;
  const c3 = c1 + 1;
  return (t: number): number => {
    const p = t - 1;
    return 1 + c3 * Math.pow(p, 3) + c1 * Math.pow(p, 2);
  };
}

export function quartInOut(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

export function cubicOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function elasticSettle(t: number): number {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}
