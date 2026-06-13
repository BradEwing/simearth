import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { SurfaceType } from '../geosphere/surface';
import { Biome } from '../biosphere/biome';
import { civilizationSystem, populationCeiling, eraName, MAX_TECH } from './civilization';

function settledContinent(): ReturnType<typeof createWorldState> {
  const state = createWorldState({ width: 16, height: 16 });
  state.surface.fill(SurfaceType.Land);
  state.biome.fill(Biome.Grassland);
  state.temperature.fill(18);
  state.sentienceEmergedTick = 0;
  return state;
}

describe('tech progression', () => {
  it('does not advance without a population', () => {
    const state = settledContinent();
    state.sentienceEmergedTick = -1; // no civ
    new Simulation(state, [civilizationSystem]).run(100);
    expect(state.techLevel).toBe(0);
  });

  it('advances once a civilization is established', () => {
    const state = settledContinent();
    new Simulation(state, [civilizationSystem]).run(300);
    expect(state.techLevel).toBeGreaterThan(0);
  });

  it('caps at the Exodus tech level', () => {
    const state = settledContinent();
    new Simulation(state, [civilizationSystem]).run(5000);
    expect(state.techLevel).toBeLessThanOrEqual(MAX_TECH);
    expect(state.techLevel).toBeCloseTo(MAX_TECH, 5);
  });

  it('raises the population ceiling as tech rises', () => {
    const state = settledContinent();
    const lowTech = populationCeiling(state, 0);
    state.techLevel = MAX_TECH;
    const highTech = populationCeiling(state, 0);
    expect(highTech).toBeGreaterThan(lowTech);
  });
});

describe('eraName', () => {
  it('names the condensed eras', () => {
    expect(eraName(0)).toBe('Stone Age');
    expect(eraName(3)).toBe('Industrial Age');
    expect(eraName(MAX_TECH)).toBe('Exodus');
    expect(eraName(3.7)).toBe('Industrial Age'); // floors
  });
});
