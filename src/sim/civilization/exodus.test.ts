import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { SurfaceType } from '../geosphere/surface';
import { Biome } from '../biosphere/biome';
import { civilizationSystem, MAX_TECH } from './civilization';

function settledContinent(): ReturnType<typeof createWorldState> {
  const state = createWorldState({ width: 16, height: 16 });
  state.surface.fill(SurfaceType.Land);
  state.biome.fill(Biome.Grassland);
  state.temperature.fill(18);
  state.sentienceEmergedTick = 0;
  return state;
}

describe('Exodus win condition', () => {
  it('is not won before reaching the Exodus tech tier', () => {
    const state = settledContinent();
    new Simulation(state, [civilizationSystem]).run(100);
    expect(state.techLevel).toBeLessThan(MAX_TECH);
    expect(state.exodusTick).toBe(-1);
  });

  it('fires when a thriving civilization reaches the Exodus tier', () => {
    const state = settledContinent();
    const sim = new Simulation(state, [civilizationSystem]);
    sim.run(3000); // enough to max tech and densify
    expect(state.techLevel).toBeCloseTo(MAX_TECH, 5);
    expect(state.exodusTick).toBeGreaterThanOrEqual(0);
  });

  it('records the Exodus tick once and never moves it', () => {
    const state = settledContinent();
    const sim = new Simulation(state, [civilizationSystem]);
    sim.run(3000);
    const won = state.exodusTick;
    expect(won).toBeGreaterThanOrEqual(0);
    sim.run(100);
    expect(state.exodusTick).toBe(won);
  });
});
