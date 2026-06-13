import type { WorldState } from '../state';
import { SurfaceType } from '../geosphere/surface';

/** Number of subtropical gyres around the planet (longitudinal cells). */
export const GYRE_COUNT = 3;

/**
 * Builds a stable ocean-current vector field into `currentU`/`currentV` (zero on
 * land). The field is the curl of a streamfunction `ψ = sin(π·y) · sin(G·2π·x)`,
 * giving rotating gyre cells — so it is (near) divergence-free, i.e. circulating
 * rather than piling water up. Velocities are ~[-1, 1]; the heat-transport system
 * scales them. Recompute when the coastline changes (cheap analytic pass).
 */
export function computeOceanCurrents(state: WorldState): void {
  const { width, height, surface, currentU, currentV } = state;
  const kx = GYRE_COUNT * 2 * Math.PI;
  for (let y = 0; y < height; y++) {
    const fy = (y + 0.5) / height;
    const cy = Math.cos(Math.PI * fy);
    const sy = Math.sin(Math.PI * fy);
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (surface[i] !== SurfaceType.Ocean) {
        currentU[i] = 0;
        currentV[i] = 0;
        continue;
      }
      const fx = (x + 0.5) / width;
      currentU[i] = cy * Math.sin(kx * fx); // ∝ ∂ψ/∂y
      currentV[i] = -sy * Math.cos(kx * fx); // ∝ −∂ψ/∂x
    }
  }
}
