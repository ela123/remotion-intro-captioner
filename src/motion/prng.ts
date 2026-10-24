/**
 * Deterministic PRNG using Mulberry32.
 * Pure function of seed without unseeded randomness.
 */

export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandom(seed: string | number): number {
  const numericSeed = typeof seed === "string" ? hashString(seed) : (seed >>> 0);
  return mulberry32(numericSeed)();
}

export function seededFloat(seed: string | number, min: number, max: number): number {
  return min + seededRandom(seed) * (max - min);
}

export function seededInt(seed: string | number, min: number, max: number): number {
  return Math.floor(seededFloat(seed, min, max + 1));
}

export function seededChoice<T>(seed: string | number, items: readonly T[]): T {
  if (items.length === 0) throw new Error("seededChoice called with empty array");
  const idx = Math.floor(seededRandom(seed) * items.length) % items.length;
  return items[idx]!;
}
