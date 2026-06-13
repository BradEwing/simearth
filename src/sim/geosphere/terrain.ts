import type { WorldState } from '../state';
import { restoreRng } from '../rng';
import { createPerlin3, fbm } from '../noise';

export interface TerrainOptions {
  /** Target fraction of tiles below sea level (Earth ≈ 0.71). */
  oceanFraction?: number;
  /**
   * Base feature scale: roughly how many large landmass-wavelengths span the
   * equator. Lower → fewer, bigger continents. ~2–3 gives a handful.
   */
  continentScale?: number;
  /** fBm octaves; more adds finer coastline/mountain detail. */
  octaves?: number;
}

/** Sorted-copy quantile of a typed array (q in [0, 1]). */
function quantile(values: Float32Array, q: number): number {
  const sorted = Float32Array.from(values).sort();
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
  return sorted[i]!;
}

/**
 * Generates the planet's terrain into `state.altitude` and sets `state.seaLevel`.
 *
 * Altitude is sampled from fBm on a *cylinder*: longitude maps to an angle so
 * the east–west seam is seamless (matching the wrapped topology), while latitude
 * maps linearly. Sea level is then chosen as the altitude quantile that yields
 * the requested ocean fraction, so the land/water split is controllable
 * regardless of the noise. Draws from `state.rng`, advancing it deterministically.
 */
export function generateTerrain(state: WorldState, options: TerrainOptions = {}): void {
  const { width, height, altitude } = state;
  const oceanFraction = options.oceanFraction ?? 0.65;
  const continentScale = options.continentScale ?? 2.5;
  const octaves = options.octaves ?? 6;

  const noise = createPerlin3(restoreRng(state.rng));

  // Circle radius so the equator's circumference equals `continentScale` noise
  // units; latitude uses the same per-tile step for roughly isotropic features.
  const radius = continentScale / (2 * Math.PI);
  const yStep = continentScale / width;

  for (let y = 0; y < height; y++) {
    const ny = y * yStep;
    for (let x = 0; x < width; x++) {
      const angle = (x / width) * Math.PI * 2;
      const nx = Math.cos(angle) * radius;
      const nz = Math.sin(angle) * radius;
      altitude[y * width + x] = fbm(noise, nx, ny, nz, octaves);
    }
  }

  state.seaLevel = quantile(altitude, oceanFraction);
  state.seaLevelBase = state.seaLevel; // ice-free reference for the hydrosphere
}
