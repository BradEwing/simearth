import type { WorldState } from '../state';
import { SURFACE_ALBEDO, ICE_ALBEDO, PLANETARY_ALBEDO } from './climateConstants';
import { BIOME_ALBEDO } from '../biosphere/biome';

/**
 * Albedo (shortwave reflectivity) of tile `i`, combining three layers:
 *
 *  1. the surface's base albedo (ocean/land/mountain),
 *  2. blended toward the tile's *biome* albedo by its biomass — vegetation
 *     darkens forests and brightens deserts (the biota-albedo feedback), and
 *  3. blended toward bright ice by the ice fraction.
 *
 * Dark ocean/forest absorb; bright ice/desert reflect — these contrasts drive
 * the ice-albedo feedback and let the biosphere influence climate.
 */
export function albedoAt(state: WorldState, i: number): number {
  let a = SURFACE_ALBEDO[state.surface[i]!] ?? PLANETARY_ALBEDO;

  const b = state.biomass[i]!;
  if (b > 0) {
    const veg = BIOME_ALBEDO[state.biome[i]!] ?? a;
    a = a * (1 - b) + veg * b;
  }

  const ice = state.ice[i]!;
  return a * (1 - ice) + ICE_ALBEDO * ice;
}
