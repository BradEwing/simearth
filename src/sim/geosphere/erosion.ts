import type { System } from '../simulation';
import { forEachNeighbor8 } from '../grid';
import { classifySurface, SurfaceType } from './surface';

const isLand = (s: number): boolean =>
  s === SurfaceType.Land || s === SurfaceType.Coast || s === SurfaceType.Mountain;

/** Erosion coefficient: fraction of the downhill drop moved per unit rainfall. */
export const EROSION_RATE = 0.0006;
/** Re-derive coastlines/mountains from eroded terrain on this cadence. */
export const EROSION_RECLASSIFY_INTERVAL = 64;
/** Never move more than this fraction of the drop in one tick (stability). */
const MAX_FLUX_FRACTION = 0.4;

/**
 * Erosion: rainfall wears down high, wet terrain and deposits the material in
 * the lowest neighbor (silting up basins and shallow seas). Each land tile sends
 * a flux proportional to rainfall × its steepest downhill drop; the flux is
 * mass-conserving (subtracted here, added there) so total elevation is preserved.
 * Periodically reclassifies the surface so eroded peaks become land and new
 * coastlines appear — the feedback into the geosphere.
 */
export const erosionSystem: System = {
  name: 'erosion',
  update(state, dt): void {
    const { width, height, surface, altitude, rainfall } = state;
    const delta = new Float32Array(altitude.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (!isLand(surface[i]!)) continue;

        let bestJ = -1;
        let bestDrop = 0;
        forEachNeighbor8(width, height, x, y, (_nx, _ny, j) => {
          const drop = altitude[i]! - altitude[j]!;
          if (drop > bestDrop) {
            bestDrop = drop;
            bestJ = j;
          }
        });
        if (bestJ < 0) continue;

        const flux = Math.min(
          EROSION_RATE * Math.max(0, rainfall[i]!) * bestDrop * dt,
          bestDrop * MAX_FLUX_FRACTION,
        );
        delta[i]! -= flux;
        delta[bestJ]! += flux;
      }
    }

    for (let i = 0; i < altitude.length; i++) altitude[i]! += delta[i]!;

    if (state.tick % EROSION_RECLASSIFY_INTERVAL === 0) classifySurface(state);
  },
};
