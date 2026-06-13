import { describe, it, expect } from 'vitest';
import { createWorldState } from './state';
import { Simulation } from './simulation';
import { generateTerrain } from './geosphere/terrain';
import { classifySurface } from './geosphere/surface';
import { initClimate } from './atmosphere/climate';
import { CLIMATE_SYSTEMS } from './climateSystems';

/**
 * M3 integration checkpoint — Gaia regulation.
 *
 * Asserts the *emergent* behavior the whole climate stack was built for: as the
 * Sun brightens, the silicate-weathering thermostat draws CO₂ down and holds the
 * planet's mean temperature inside the habitable band — and that without the
 * thermostat the identical brightening overheats the planet.
 */
function freshPlanet(seed: string): ReturnType<typeof createWorldState> {
  const state = createWorldState({ width: 40, height: 24, seed });
  generateTerrain(state, { oceanFraction: 0.65 });
  classifySurface(state);
  initClimate(state);
  return state;
}

// These run the full climate stack over thousands of ticks — allow ample time.
const LONG = 30_000;

describe('Gaia regulation (integration)', () => {
  it(
    'holds the climate habitable while the Sun brightens, by drawing down CO2',
    () => {
      const state = freshPlanet('gaia');
      const startSolar = state.solarLuminosity;
      const startCO2 = state.co2;

      const sim = new Simulation(state, CLIMATE_SYSTEMS);
      let minT = Infinity;
      let maxT = -Infinity;
      // ~2500 ticks; sample the mean temperature along the way.
      for (let k = 0; k < 50; k++) {
        sim.run(50);
        minT = Math.min(minT, state.meanTemperature);
        maxT = Math.max(maxT, state.meanTemperature);
      }

      // The Sun genuinely brightened…
      expect(state.solarLuminosity).toBeGreaterThan(startSolar * 1.03);
      // …yet the mean temperature stayed in a habitable band throughout…
      expect(minT).toBeGreaterThan(2);
      expect(maxT).toBeLessThan(32);
      // …because CO2 was drawn down to compensate the extra sunlight.
      expect(state.co2).toBeLessThan(startCO2);
    },
    LONG,
  );

  it(
    'under a hot sun, the thermostat stays habitable while fixed-CO2 cooks',
    () => {
      // Hold a bright sun fixed (drop solar evolution) so we compare equilibria.
      const noSolar = CLIMATE_SYSTEMS.filter((s) => s.name !== 'solar-evolution');
      const noThermostat = noSolar.filter((s) => s.name !== 'carbon-cycle');

      const regulated = freshPlanet('contrast');
      regulated.solarLuminosity = 1.2;
      const fixed = freshPlanet('contrast');
      fixed.solarLuminosity = 1.2;

      new Simulation(regulated, noSolar).run(3000);
      new Simulation(fixed, noThermostat).run(3000);

      // The thermostat draws CO2 down and holds a habitable climate…
      expect(regulated.meanTemperature).toBeLessThan(30);
      expect(regulated.co2).toBeLessThan(fixed.co2); // CO2 was drawn down
      // …while the un-thermostatted planet (CO2 stuck high) runs far hotter.
      expect(fixed.meanTemperature).toBeGreaterThan(regulated.meanTemperature + 8);
    },
    LONG,
  );
});
