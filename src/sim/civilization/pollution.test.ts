import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { SurfaceType } from '../geosphere/surface';
import { Biome } from '../biosphere/biome';
import { civilizationSystem, pollutionIntensity } from './civilization';

describe('pollutionIntensity', () => {
  it('is zero pre-industrial, peaks mid-tech, and falls at nanotech', () => {
    expect(pollutionIntensity(1)).toBe(0); // Bronze
    expect(pollutionIntensity(3)).toBeGreaterThan(0); // Industrial
    expect(pollutionIntensity(4)).toBeGreaterThan(pollutionIntensity(3)); // Information peak
    expect(pollutionIntensity(6)).toBe(0); // clean Nanotech
  });
});

function industrialWorld(): ReturnType<typeof createWorldState> {
  const state = createWorldState({ width: 16, height: 16 });
  state.surface.fill(SurfaceType.Land);
  state.biome.fill(Biome.Grassland);
  state.temperature.fill(18);
  state.co2 = 280;
  state.sentienceEmergedTick = 0;
  // Pre-establish an industrial population.
  state.population.fill(0.8);
  state.techLevel = 3.5;
  return state;
}

describe('pollution → CO2 feedback', () => {
  it('populates the pollution field where there are cities at industrial tech', () => {
    const state = industrialWorld();
    new Simulation(state, [civilizationSystem]).tick();
    let polluted = 0;
    for (const p of state.pollution) if (p > 0) polluted++;
    expect(polluted).toBeGreaterThan(0);
  });

  it('emits CO2 into the atmosphere', () => {
    const state = industrialWorld();
    const before = state.co2;
    new Simulation(state, [civilizationSystem]).run(20);
    expect(state.co2).toBeGreaterThan(before);
  });

  it('emits no CO2 from a pre-industrial civilization', () => {
    const state = industrialWorld();
    state.techLevel = 1; // Bronze Age — no pollution
    const before = state.co2;
    new Simulation(state, [civilizationSystem]).run(20);
    expect(state.co2).toBe(before);
  });
});
