import type { System } from '../simulation';

/**
 * Solar luminosity increase per tick (relative to present output = 1.0).
 *
 * Models stellar main-sequence brightening — the Sun grows ~7% brighter per
 * billion years. Slow enough here that the silicate-weathering thermostat (and,
 * later, the biosphere) can draw CO₂ down to hold the climate habitable as it
 * climbs. This *is* the forcing Gaia regulates against: left unchecked the
 * planet trends toward a runaway greenhouse.
 */
export const SOLAR_BRIGHTENING_PER_TICK = 2e-5;

/** Brightens the Sun slowly over time. */
export const solarEvolutionSystem: System = {
  name: 'solar-evolution',
  update(state, dt): void {
    state.solarLuminosity += SOLAR_BRIGHTENING_PER_TICK * dt;
  },
};
