import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { generateTerrain } from '../geosphere/terrain';
import { classifySurface, SurfaceType } from '../geosphere/surface';
import { initClimate } from '../atmosphere/climate';
import { albedoAt } from '../atmosphere/albedo';
import { silicateWeathering } from '../atmosphere/carbon';
import { temperatureSystem } from '../atmosphere/temperature';
import { carbonCycleSystem } from '../atmosphere/carbon';
import { Biome } from './biome';

describe('biome albedo (albedoAt)', () => {
  it('darkens forested tiles and brightens deserts as biomass grows', () => {
    const state = createWorldState({ width: 3, height: 1 });
    state.surface.fill(SurfaceType.Land);
    state.biome.set([Biome.Rainforest, Biome.Desert, Biome.Grassland]);

    state.biomass.fill(0);
    const bareForest = albedoAt(state, 0);
    const bareDesert = albedoAt(state, 1);

    state.biomass.fill(1);
    const lushForest = albedoAt(state, 0);
    const lushDesert = albedoAt(state, 1);

    expect(lushForest).toBeLessThan(bareForest); // forest absorbs more
    expect(lushDesert).toBeGreaterThan(bareDesert); // desert reflects more
  });

  it('biomass=0 leaves albedo at the bare surface value', () => {
    const state = createWorldState({ width: 1, height: 1 });
    state.surface[0] = SurfaceType.Land;
    state.biome[0] = Biome.Rainforest;
    state.biomass[0] = 0;
    expect(albedoAt(state, 0)).toBeCloseTo(0.33, 6); // SURFACE_ALBEDO[Land]
  });
});

function planet(seed: string): ReturnType<typeof createWorldState> {
  const state = createWorldState({ width: 40, height: 24, seed });
  generateTerrain(state, { oceanFraction: 0.6 });
  classifySurface(state);
  initClimate(state);
  return state;
}

describe('biotic weathering enhancement', () => {
  it('life increases the weathering rate', () => {
    const bare = planet('w');
    const lush = planet('w');
    lush.biomass.fill(1);
    bare.meanTemperature = lush.meanTemperature = 15;
    expect(silicateWeathering(lush)).toBeGreaterThan(silicateWeathering(bare));
  });

  it('a vegetated planet equilibrates cooler than a bare one', () => {
    const bare = planet('cool');
    const lush = planet('cool');
    lush.biomass.fill(1);
    new Simulation(bare, [temperatureSystem, carbonCycleSystem]).run(4000);
    new Simulation(lush, [temperatureSystem, carbonCycleSystem]).run(4000);
    // Enhanced weathering draws CO2 lower → cooler equilibrium.
    expect(lush.meanTemperature).toBeLessThan(bare.meanTemperature - 2);
    expect(lush.co2).toBeLessThan(bare.co2);
  });
});
