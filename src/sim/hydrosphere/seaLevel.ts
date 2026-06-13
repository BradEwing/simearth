import type { System } from '../simulation';
import type { WorldState } from '../state';
import { SurfaceType, classifySurface } from '../geosphere/surface';

/**
 * Sea-level drop per unit land-ice fraction. Land ice (glaciers) locks water out
 * of the ocean, lowering sea level; ice-free conditions restore it. Tuned in the
 * altitude units of the terrain so glaciation visibly moves coastlines.
 */
export const SEALEVEL_PER_ICE = 0.4;

/** Don't reclassify coastlines until sea level moves at least this much. */
const SEALEVEL_EPSILON = 1e-3;

/** Fraction of the whole grid that is ice-covered *land* (sea ice excluded). */
function landIceFraction(state: WorldState): number {
  const { surface, ice } = state;
  let v = 0;
  for (let i = 0; i < surface.length; i++) {
    const s = surface[i];
    if (s === SurfaceType.Land || s === SurfaceType.Coast || s === SurfaceType.Mountain) {
      v += ice[i]!;
    }
  }
  return v / surface.length;
}

/**
 * Hydrosphere: sets sea level from the global land-ice budget and re-derives the
 * coastline when it shifts. More land ice → lower seas → more exposed land;
 * melting raises seas and drowns coasts. Reclassification only runs when sea
 * level actually moves, so a stable climate costs nothing here.
 */
export const seaLevelSystem: System = {
  name: 'sea-level',
  update(state: WorldState): void {
    const next = state.seaLevelBase - SEALEVEL_PER_ICE * landIceFraction(state);
    if (Math.abs(next - state.seaLevel) > SEALEVEL_EPSILON) {
      state.seaLevel = next;
      classifySurface(state);
    }
  },
};
