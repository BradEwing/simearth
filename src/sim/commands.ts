import type { WorldState } from './state';
import { wrapX, clampY } from './grid';
import { LifeClass } from './biosphere/life';
import { classifySurface } from './geosphere/surface';

/**
 * Player/UI commands that mutate simulation state through an explicit interface
 * (the UI never writes state fields directly). Commands take the world and
 * parameters, apply a one-shot change, and let the systems take it from there.
 * The tool framework in M6 dispatches these.
 */

/**
 * Visits every tile within `radius` of (cx, cy), wrapping longitude and clamping
 * latitude. `fn` receives the tile index and its normalized distance from the
 * center (0 at the center, 1 at the brush edge) for falloff.
 */
export function forEachInRadius(
  state: WorldState,
  cx: number,
  cy: number,
  radius: number,
  fn: (i: number, falloff: number) => void,
): void {
  const r = Math.max(0, Math.floor(radius));
  for (let dy = -r; dy <= r; dy++) {
    const y = clampY(state.height, cy + dy);
    for (let dx = -r; dx <= r; dx++) {
      const dist = Math.hypot(dx, dy);
      if (dist > radius) continue;
      const x = wrapX(state.width, cx + dx);
      fn(y * state.width + x, radius > 0 ? dist / radius : 0);
    }
  }
}

/**
 * Seeds life of `stage` at tile (x, y) with the given biomass. Coordinates wrap
 * in longitude and clamp in latitude. The placement is unconditional — if the
 * spot is inhospitable the life system will let it die out naturally.
 */
export function placeLife(
  state: WorldState,
  x: number,
  y: number,
  stage: LifeClass = LifeClass.Prokaryote,
  biomass = 0.5,
): void {
  const i = clampY(state.height, y) * state.width + wrapX(state.width, x);
  state.lifeStage[i] = stage;
  state.biomass[i] = biomass;
}

/** Default terraform brush radius and per-click elevation change. */
export const TERRAFORM_RADIUS = 2;
export const TERRAFORM_AMOUNT = 0.15;

/**
 * Raises (delta > 0) or lowers (delta < 0) terrain within the brush, strongest
 * at the center and tapering to the edge, then re-derives the coastline so the
 * change shows immediately.
 */
export function terraform(
  state: WorldState,
  x: number,
  y: number,
  delta: number,
  radius = TERRAFORM_RADIUS,
): void {
  forEachInRadius(state, x, y, radius, (i, falloff) => {
    state.altitude[i]! += delta * (1 - falloff);
  });
  classifySurface(state);
}

/** Depth/height water tools push tiles below/above sea level. */
export const WATER_OFFSET = 0.12;

/**
 * Floods (`makeOcean`) or reclaims land within the brush by pushing altitude
 * below or above sea level, then re-derives the coastline.
 */
export function setWater(
  state: WorldState,
  x: number,
  y: number,
  makeOcean: boolean,
  radius = TERRAFORM_RADIUS,
): void {
  forEachInRadius(state, x, y, radius, (i) => {
    state.altitude[i] = makeOcean
      ? Math.min(state.altitude[i]!, state.seaLevel - WATER_OFFSET)
      : Math.max(state.altitude[i]!, state.seaLevel + WATER_OFFSET);
  });
  classifySurface(state);
}
