import type { System } from '../simulation';
import type { WorldState } from '../state';
import { latitudeOf, wrapX } from '../grid';
import { SurfaceType } from '../geosphere/surface';

const DEG = Math.PI / 180;

/** Prevailing wind speed (abstract units). */
export const WIND_SPEED = 1;
/** Recompute wind/rainfall every N ticks (quasi-static; saves per-tick cost). */
export const RAINFALL_INTERVAL = 16;

const MAX_FETCH = 40; // tiles to search upwind for an ocean moisture source
const FETCH_SCALE = 12; // moisture e-folds over this many land tiles inland
const OROGRAPHIC_UP = 4; // rainfall boost per unit windward uplift
const OROGRAPHIC_DOWN = 6; // rainfall suppression per unit leeward descent

/**
 * Prevailing zonal winds by latitude: tropical easterlies (westward) and
 * mid/high-latitude westerlies (eastward), via a `−cos(3·lat)` profile. Sets
 * `windU` (zonal); `windV` is left ~0 for the MVP (rainfall is governed by the
 * dominant east–west flow). Wind depends only on latitude, so it is static.
 */
export function computeWind(state: WorldState): void {
  const { width, height, windU, windV } = state;
  for (let y = 0; y < height; y++) {
    const u = -WIND_SPEED * Math.cos(3 * latitudeOf(height, y) * DEG);
    const row = y * width;
    for (let x = 0; x < width; x++) {
      windU[row + x] = u;
      windV[row + x] = 0;
    }
  }
}

/**
 * Base rainfall by latitude: a wet equatorial belt (ITCZ), dry subtropics
 * (~25–30°), a mid-latitude storm-track peak (~50°), and dry poles.
 */
export function baseLatitudeRain(latitudeDeg: number): number {
  const a = Math.abs(latitudeDeg);
  const itcz = 1.4 * Math.exp(-((a / 12) ** 2));
  const midlat = 0.7 * Math.exp(-(((a - 50) / 18) ** 2));
  return 0.15 + itcz + midlat;
}

/**
 * Computes per-tile rainfall from prevailing winds, ocean fetch, and terrain.
 *
 * Oceans are wet (the moisture source). Over land, moisture decays with distance
 * downwind from the nearest upwind ocean (continental interiors dry out), and is
 * modulated by terrain along the wind: windward (rising) slopes wring out extra
 * rain (orographic), while leeward (descending) slopes sit in a rain shadow.
 */
export function computeRainfall(state: WorldState): void {
  const { width, height, surface, altitude, windU, rainfall } = state;
  for (let y = 0; y < height; y++) {
    const base = baseLatitudeRain(latitudeOf(height, y));
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const i = row + x;
      if (surface[i] === SurfaceType.Ocean) {
        rainfall[i] = base;
        continue;
      }
      const dirX = windU[i]! > 0 ? -1 : 1; // step toward upwind

      let landSteps = 0;
      let foundOcean = false;
      let cx = x;
      for (let s = 0; s < MAX_FETCH; s++) {
        cx = wrapX(width, cx + dirX);
        if (surface[row + cx] === SurfaceType.Ocean) {
          foundOcean = true;
          break;
        }
        landSteps++;
      }
      const moisture = foundOcean ? Math.exp(-landSteps / FETCH_SCALE) : 0.05;

      const slope = altitude[i]! - altitude[row + wrapX(width, x + dirX)]!;
      const orographic =
        slope > 0 ? 1 + OROGRAPHIC_UP * slope : 1 / (1 + OROGRAPHIC_DOWN * -slope);

      rainfall[i] = base * moisture * orographic;
    }
  }
}

/**
 * Recomputes wind and rainfall on a fixed cadence (they shift only as coastlines
 * and terrain change). Downstream systems — erosion and biomes — read the
 * rainfall field it produces.
 */
export const weatherSystem: System = {
  name: 'weather',
  update(state): void {
    if (state.tick % RAINFALL_INTERVAL !== 0) return;
    computeWind(state);
    computeRainfall(state);
  },
};
