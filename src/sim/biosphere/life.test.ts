import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { generateTerrain } from '../geosphere/terrain';
import { classifySurface, SurfaceType } from '../geosphere/surface';
import { initClimate } from '../atmosphere/climate';
import { temperatureSystem } from '../atmosphere/temperature';
import { weatherSystem } from '../atmosphere/weather';
import { biomeSystem } from './biome';
import { suitability, lifeSystem, LifeClass, MAX_LIFE_STAGE } from './life';

function livingPlanet(seed: string): ReturnType<typeof createWorldState> {
  const state = createWorldState({ width: 40, height: 24, seed });
  generateTerrain(state, { oceanFraction: 0.6 });
  classifySurface(state);
  initClimate(state);
  // Establish a climate + biomes before life runs.
  new Simulation(state, [temperatureSystem, weatherSystem, biomeSystem]).run(2);
  return state;
}

const occupied = (b: Float32Array): number => {
  let n = 0;
  for (const v of b) if (v > 0.01) n++;
  return n;
};
const maxStage = (s: Uint8Array): number => s.reduce((m, v) => Math.max(m, v), 0);

describe('suitability', () => {
  it('is zero outside a class temperature tolerance', () => {
    const state = createWorldState({ width: 1, height: 1 });
    state.surface[0] = SurfaceType.Ocean;
    state.temperature[0] = 200; // far too hot for anything
    expect(suitability(state, 0, LifeClass.Prokaryote)).toBe(0);
  });

  it('keeps proto-sapients off the ocean (land-only)', () => {
    const state = createWorldState({ width: 1, height: 1 });
    state.surface[0] = SurfaceType.Ocean;
    state.temperature[0] = 20;
    expect(suitability(state, 0, LifeClass.ProtoSapient)).toBe(0);
  });
});

describe('lifeSystem', () => {
  it('spreads life from a seed across suitable tiles', () => {
    const state = livingPlanet('spread');
    // Seed one ocean tile with prokaryotes.
    let seedIdx = -1;
    for (let i = 0; i < state.surface.length; i++) {
      if (state.surface[i] === SurfaceType.Ocean && suitability(state, i, 1) > 0.3) {
        seedIdx = i;
        break;
      }
    }
    expect(seedIdx).toBeGreaterThanOrEqual(0);
    state.lifeStage[seedIdx] = LifeClass.Prokaryote;
    state.biomass[seedIdx] = 0.5;

    const before = occupied(state.biomass);
    new Simulation(state, [lifeSystem]).run(200);
    expect(occupied(state.biomass)).toBeGreaterThan(before * 3);
  });

  it('evolves life toward more advanced classes over time', () => {
    const state = livingPlanet('evolve');
    // Seed several ocean tiles to give evolution many chances.
    let seeded = 0;
    for (let i = 0; i < state.surface.length && seeded < 20; i++) {
      if (state.surface[i] === SurfaceType.Ocean && suitability(state, i, 1) > 0.3) {
        state.lifeStage[i] = LifeClass.Prokaryote;
        state.biomass[i] = 0.8;
        seeded++;
      }
    }
    new Simulation(state, [
      temperatureSystem,
      weatherSystem,
      biomeSystem,
      lifeSystem,
    ]).run(1500);
    expect(maxStage(state.lifeStage)).toBeGreaterThan(LifeClass.Prokaryote);
  });

  it('life arises on its own via abiogenesis', () => {
    const state = livingPlanet('abio');
    expect(occupied(state.biomass)).toBe(0);
    new Simulation(state, [lifeSystem]).run(3000);
    expect(occupied(state.biomass)).toBeGreaterThan(0);
  });

  it('life dies where conditions are lethal', () => {
    const state = createWorldState({ width: 4, height: 4 });
    state.surface.fill(SurfaceType.Ocean);
    state.temperature.fill(300); // lethal everywhere
    state.lifeStage.fill(LifeClass.Prokaryote);
    state.biomass.fill(0.8);
    new Simulation(state, [lifeSystem]).run(50);
    expect(occupied(state.biomass)).toBe(0);
  });

  it('is deterministic', () => {
    const a = livingPlanet('det');
    const b = livingPlanet('det');
    a.lifeStage[a.lifeStage.length - 1] = LifeClass.Prokaryote;
    a.biomass[a.biomass.length - 1] = 0.5;
    b.lifeStage[b.lifeStage.length - 1] = LifeClass.Prokaryote;
    b.biomass[b.biomass.length - 1] = 0.5;
    new Simulation(a, [lifeSystem]).run(300);
    new Simulation(b, [lifeSystem]).run(300);
    expect(a.biomass).toEqual(b.biomass);
    expect(a.lifeStage).toEqual(b.lifeStage);
    expect(maxStage(a.lifeStage)).toBeLessThanOrEqual(MAX_LIFE_STAGE);
  });
});
