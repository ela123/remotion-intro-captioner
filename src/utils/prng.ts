/**
 * Mulberry32 32-bit PRNG
 * Pure and deterministic function of seed string or integer.
 */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch: number; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string | number): () => number {
  const numericSeed = typeof seed === "number" ? seed : cyrb53(seed);
  return mulberry32(numericSeed);
}

export function seededFloat(seed: string | number, min: number, max: number): number {
  const rng = createRng(seed);
  return min + rng() * (max - min);
}

export function seededInt(seed: string | number, min: number, max: number): number {
  const rng = createRng(seed);
  return Math.floor(min + rng() * (max - min + 1));
}

export function seededPick<T>(seed: string | number, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("seededPick called with empty array");
  }
  const idx = seededInt(seed, 0, items.length - 1);
  return items[idx]!;
}

export const seededChoice = seededPick;

export function seededRange(seed: string | number, min: number, max: number): number {
  return seededFloat(seed, min, max);
}

export function seededShuffle<T>(seed: string | number, items: readonly T[]): T[] {
  const copy = [...items];
  const rng = createRng(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = temp;
  }
  return copy;
}
