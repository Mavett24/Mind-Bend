/**
 * Seeded pseudo-random number generation.
 *
 * Every puzzle in Mind Bend is generated from a seed, so the same seed always
 * produces the same board. Never use Math.random in the engine or in a
 * generator: it would break daily boards and challenge links.
 */

/** Hash any string to a 32-bit unsigned integer (cyrb53, folded to 32 bits). */
export function hashString(input: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive on both ends. */
  int(min: number, max: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** One random element. Throws on an empty array. */
  pick<T>(items: readonly T[]): T;
  /** A shuffled copy (Fisher-Yates). The input is not modified. */
  shuffle<T>(items: readonly T[]): T[];
  /** A child generator with its own stream, so sub-steps don't shift each other. */
  fork(label: string): Rng;
}

/** Mulberry32: small, fast, good enough statistical quality for games. */
function mulberry32(state: number): () => number {
  let a = state >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string | number): Rng {
  const seedString = String(seed);
  const next = mulberry32(hashString(seedString));

  const rng: Rng = {
    next,
    int(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new RangeError(`int(${min}, ${max}) needs integers with min <= max`);
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(p) {
      return next() < p;
    },
    pick(items) {
      if (items.length === 0) throw new RangeError("pick() on an empty array");
      return items[Math.floor(next() * items.length)];
    },
    shuffle(items) {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    fork(label) {
      return createRng(`${seedString}/${label}`);
    },
  };
  return rng;
}
