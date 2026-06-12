import type { Rng } from './rng';

/** A 3D coherent-noise function returning roughly [-1, 1]. */
export type Noise3D = (x: number, y: number, z: number) => number;

/**
 * Improved Perlin gradient noise in 3D, with its permutation table shuffled by
 * the simulation PRNG (so terrain is seeded and deterministic). 3D is used so
 * the planet can be sampled on a *cylinder* — wrapping longitude seamlessly —
 * by feeding (cos θ, sin θ) for the east–west axis. See `geosphere/terrain.ts`.
 */
export function createPerlin3(rng: Rng): Noise3D {
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  // Fisher–Yates shuffle using the deterministic PRNG.
  for (let i = 255; i > 0; i--) {
    const j = rng.int(0, i);
    const tmp = perm[i]!;
    perm[i] = perm[j]!;
    perm[j] = tmp;
  }
  // Doubled table avoids index wrapping in the lookups below.
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255]!;

  const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t: number, a: number, b: number): number => a + t * (b - a);
  const grad = (hash: number, x: number, y: number, z: number): number => {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  return (x: number, y: number, z: number): number => {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const zi = Math.floor(z) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);
    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);

    const a = p[xi]! + yi;
    const aa = p[a]! + zi;
    const ab = p[a + 1]! + zi;
    const b = p[xi + 1]! + yi;
    const ba = p[b]! + zi;
    const bb = p[b + 1]! + zi;

    return lerp(
      w,
      lerp(
        v,
        lerp(u, grad(p[aa]!, xf, yf, zf), grad(p[ba]!, xf - 1, yf, zf)),
        lerp(u, grad(p[ab]!, xf, yf - 1, zf), grad(p[bb]!, xf - 1, yf - 1, zf)),
      ),
      lerp(
        v,
        lerp(u, grad(p[aa + 1]!, xf, yf, zf - 1), grad(p[ba + 1]!, xf - 1, yf, zf - 1)),
        lerp(
          u,
          grad(p[ab + 1]!, xf, yf - 1, zf - 1),
          grad(p[bb + 1]!, xf - 1, yf - 1, zf - 1),
        ),
      ),
    );
  };
}

/**
 * Fractal Brownian motion: sums `octaves` of noise at rising frequency and
 * falling amplitude. Normalized so the result stays in roughly [-1, 1].
 */
export function fbm(
  noise: Noise3D,
  x: number,
  y: number,
  z: number,
  octaves: number,
  lacunarity = 2,
  gain = 0.5,
): number {
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amplitude * noise(x * frequency, y * frequency, z * frequency);
    norm += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return sum / norm;
}
