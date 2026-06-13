import type { System } from '../simulation';
import { SurfaceType } from '../geosphere/surface';
import { wrapX } from '../grid';
import { computeOceanCurrents } from './currents';

/** Advection sub-steps per tick (each CFL-stable; together a stronger effect). */
export const OCEAN_ADVECT_SUBSTEPS = 8;
/** Advection coefficient per sub-step (× max |velocity| must stay below ~0.5). */
export const OCEAN_ADVECT_C = 0.4;
/** Light lateral mixing per sub-step, so advection reaches a steady pattern. */
export const OCEAN_DIFFUSE = 0.08;

/**
 * Ocean heat transport: advects the temperature field along the current vectors
 * over ocean tiles, with light diffusion. Currents carry warm water poleward on
 * one limb of each gyre and cold water equatorward on the other, breaking the
 * pure latitude banding into warm/cold currents and moderating coastal climates.
 *
 * Runs after the temperature system: it reshapes that tick's freshly-computed
 * temperature (so the effect never accumulates or destabilizes) before the ice
 * system reads it. The reported global mean (`meanTemperature`) is unchanged —
 * advection redistributes heat, it doesn't create it.
 */
export const oceanHeatSystem: System = {
  name: 'ocean-heat',
  update(state): void {
    computeOceanCurrents(state);
    const { width, height, surface, temperature, currentU, currentV } = state;

    const isOcean = (i: number): boolean => surface[i] === SurfaceType.Ocean;
    let src = Float32Array.from(temperature);
    let dst = Float32Array.from(temperature);

    for (let step = 0; step < OCEAN_ADVECT_SUBSTEPS; step++) {
      for (let y = 0; y < height; y++) {
        const row = y * width;
        for (let x = 0; x < width; x++) {
          const i = row + x;
          if (!isOcean(i)) {
            dst[i] = src[i]!;
            continue;
          }
          const u = currentU[i]!;
          const v = currentV[i]!;
          const here = src[i]!;

          // Upwind gradients; land/off-grid neighbors contribute no flux.
          const iw = row + wrapX(width, x - 1);
          const ie = row + wrapX(width, x + 1);
          const up = here - (isOcean(iw) ? src[iw]! : here);
          const down = (isOcean(ie) ? src[ie]! : here) - here;
          const dTdx = u > 0 ? up : down;

          const iN = i - width;
          const iS = i + width;
          const upN = y > 0 && isOcean(iN) ? src[iN]! : here;
          const upS = y < height - 1 && isOcean(iS) ? src[iS]! : here;
          const dTdy = v > 0 ? here - upN : upS - here;

          // Diffusion toward the mean of ocean neighbors (no-flux at land).
          let sum = 0;
          let n = 0;
          for (const j of [iw, ie, iN, iS]) {
            if (j >= 0 && j < width * height && isOcean(j)) {
              sum += src[j]!;
              n++;
            }
          }
          const diffuse = n > 0 ? (sum / n - here) * OCEAN_DIFFUSE : 0;

          dst[i] = here - OCEAN_ADVECT_C * (u * dTdx + v * dTdy) + diffuse;
        }
      }
      const swap = src;
      src = dst;
      dst = swap;
    }

    for (let i = 0; i < temperature.length; i++) {
      if (isOcean(i)) temperature[i] = src[i]!;
    }
  },
};
