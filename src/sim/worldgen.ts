import { createWorldState, type WorldState, type WorldOptions } from './state';
import { generateTerrain, type TerrainOptions } from './geosphere/terrain';
import { classifySurface } from './geosphere/surface';
import { initClimate } from './atmosphere/climate';

export interface PlanetOptions extends WorldOptions {
  terrain?: TerrainOptions;
}

/**
 * Creates a ready-to-run planet from a seed: allocates state, generates terrain,
 * classifies the surface, and initializes the atmosphere. The single entry point
 * for starting a world — used by app boot and the new-game flow. Deterministic
 * for a given seed.
 */
export function createPlanet(options: PlanetOptions = {}): WorldState {
  const state = createWorldState(options);
  generateTerrain(state, options.terrain);
  classifySurface(state);
  initClimate(state);
  return state;
}
