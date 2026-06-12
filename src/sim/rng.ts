/**
 * Deterministic pseudo-random number generator for the simulation.
 *
 * Uses sfc32 (128-bit state, fast, statistically solid) seeded via the xmur3
 * string hash. The generator's entire state is four uint32s exposed as plain
 * data ({@link RngState}) so it serializes with the rest of the sim and a loaded
 * game resumes the exact same sequence. This is the *only* source of randomness
 * permitted in `src/sim` — `Math.random()` is banned there.
 */

/** Serializable generator state: four 32-bit words. Plain data, no methods. */
export interface RngState {
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform unsigned 32-bit integer in [0, 2^32). */
  uint32(): number;
  /** Uniform integer in [min, max], inclusive of both ends. */
  int(min: number, max: number): number;
  /** Uniform float in [min, max). */
  float(min: number, max: number): number;
  /** True with probability `p` (default 0.5). */
  bool(p?: number): boolean;
  /** A copy of the internal state, safe to serialize. */
  snapshot(): RngState;
}

/** xmur3: hashes a string into a function yielding well-mixed uint32 seeds. */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (): number => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** Derives an initial generator state from a numeric or string seed. */
export function seedRng(seed: number | string): RngState {
  const next = xmur3(typeof seed === 'number' ? `seed:${seed}` : seed);
  return { a: next(), b: next(), c: next(), d: next() };
}

/** Wraps a (mutable) {@link RngState} in the {@link Rng} interface. */
export function restoreRng(state: RngState): Rng {
  // sfc32 step: advances `state` in place and returns the raw uint32 output.
  const step = (): number => {
    let { a, b, c, d } = state;
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    state.a = a;
    state.b = b;
    state.c = c;
    state.d = d;
    return t >>> 0;
  };

  const rng: Rng = {
    uint32: step,
    next: () => step() / 4294967296,
    float: (min, max) => min + (step() / 4294967296) * (max - min),
    int: (min, max) => min + Math.floor((step() / 4294967296) * (max - min + 1)),
    bool: (p = 0.5) => step() / 4294967296 < p,
    snapshot: () => ({ ...state }),
  };
  return rng;
}

/** Creates a fresh generator from a seed. */
export function createRng(seed: number | string): Rng {
  return restoreRng(seedRng(seed));
}
