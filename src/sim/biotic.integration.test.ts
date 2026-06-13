import { describe, it, expect } from 'vitest';
import { createWorldState } from './state';
import { Simulation } from './simulation';
import { generateTerrain } from './geosphere/terrain';
import { classifySurface } from './geosphere/surface';
import { initClimate } from './atmosphere/climate';
import { CLIMATE_SYSTEMS } from './climateSystems';
import { WORLD_SYSTEMS } from './worldSystems';

/**
 * M4 integration checkpoint — biotic regulation.
 *
 * A living planet (full world: climate + biosphere) should regulate its climate
 * better than an identical *dead* planet (climate only, biomass stays 0):
 * vegetation enhances weathering, drawing CO₂ down and holding a cooler, more
 * habitable mean temperature.
 */
function freshPlanet(seed: string): ReturnType<typeof createWorldState> {
  const state = createWorldState({ width: 40, height: 24, seed });
  generateTerrain(state, { oceanFraction: 0.6 });
  classifySurface(state);
  initClimate(state);
  return state;
}

const peakBiomass = (b: Float32Array): number => b.reduce((m, v) => Math.max(m, v), 0);

describe('biotic regulation (integration)', () => {
  it('a living planet runs cooler and lower-CO2 than a dead one', () => {
    const alive = freshPlanet('biotic');
    const dead = freshPlanet('biotic');

    new Simulation(alive, WORLD_SYSTEMS).run(5000);
    new Simulation(dead, CLIMATE_SYSTEMS).run(5000); // no biosphere ⇒ biomass stays 0

    // Life took hold on the living planet; the dead one stayed barren.
    expect(peakBiomass(alive.biomass)).toBeGreaterThan(0.1);
    expect(peakBiomass(dead.biomass)).toBe(0);

    // Biotic weathering drew CO2 down further, holding a cooler climate.
    expect(alive.co2).toBeLessThan(dead.co2);
    expect(alive.meanTemperature).toBeLessThan(dead.meanTemperature - 2);

    // …and the living planet stayed comfortably habitable.
    expect(alive.meanTemperature).toBeGreaterThan(0);
    expect(alive.meanTemperature).toBeLessThan(30);
  }, 30_000);
});
