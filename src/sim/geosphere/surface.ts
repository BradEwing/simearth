import type { WorldState } from '../state';
import { forEachNeighbor4 } from '../grid';

/**
 * Surface classification stored in `state.surface` (Uint8). A const object +
 * union (rather than a TS `enum`) keeps the numeric values explicit for the
 * typed-array field and plays nicely with `isolatedModules`.
 *
 * Ocean/Coast/Land/Mountain are derived from altitude vs. sea level here. `Ice`
 * is climate-driven (cold tiles freeze) and is applied by the hydrosphere/
 * climate system in M3 — it is not produced from altitude alone.
 */
export const SurfaceType = {
  Ocean: 0,
  Coast: 1,
  Land: 2,
  Mountain: 3,
  Ice: 4,
} as const;
export type SurfaceType = (typeof SurfaceType)[keyof typeof SurfaceType];

export interface SurfaceOptions {
  /** Mountain line as a fraction of the land's altitude range above sea level. */
  mountainFraction?: number;
}

/**
 * Classifies every tile into ocean / coast / land / mountain from `altitude`
 * and `seaLevel`. Ocean is below sea level; mountains are the highest land; a
 * coast is plain land bordering ocean (mountains stay mountains even at the
 * shore). Pure function of altitude + sea level — deterministic, no randomness.
 */
export function classifySurface(state: WorldState, options: SurfaceOptions = {}): void {
  const { width, height, altitude, surface, seaLevel } = state;
  const mountainFraction = options.mountainFraction ?? 0.6;

  let maxAlt = -Infinity;
  for (let i = 0; i < altitude.length; i++) {
    if (altitude[i]! > maxAlt) maxAlt = altitude[i]!;
  }
  const mountainLevel = seaLevel + mountainFraction * (maxAlt - seaLevel);

  // Pass 1: ocean / land / mountain by elevation.
  for (let i = 0; i < altitude.length; i++) {
    const a = altitude[i]!;
    surface[i] =
      a < seaLevel
        ? SurfaceType.Ocean
        : a >= mountainLevel
          ? SurfaceType.Mountain
          : SurfaceType.Land;
  }

  // Pass 2: plain land bordering ocean becomes coast.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (surface[i] !== SurfaceType.Land) continue;
      let coastal = false;
      forEachNeighbor4(width, height, x, y, (_nx, _ny, ni) => {
        if (surface[ni] === SurfaceType.Ocean) coastal = true;
      });
      if (coastal) surface[i] = SurfaceType.Coast;
    }
  }
}
