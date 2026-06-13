import type { WorldState } from '../state';
import { SURFACE_ALBEDO, ICE_ALBEDO, PLANETARY_ALBEDO } from './climateConstants';

/**
 * Albedo (shortwave reflectivity) of tile `i`: the surface's base albedo blended
 * toward bright ice by the tile's ice fraction. Dark ocean absorbs; bright ice
 * reflects — the contrast is what makes the ice-albedo feedback (and ice-age
 * hysteresis) possible.
 */
export function albedoAt(state: WorldState, i: number): number {
  const base = SURFACE_ALBEDO[state.surface[i]!] ?? PLANETARY_ALBEDO;
  const ice = state.ice[i]!;
  return base * (1 - ice) + ICE_ALBEDO * ice;
}
