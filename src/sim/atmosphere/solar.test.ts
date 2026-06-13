import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { solarEvolutionSystem, SOLAR_BRIGHTENING_PER_TICK } from './solar';

describe('solarEvolutionSystem', () => {
  it('brightens the Sun by the set rate each tick', () => {
    const state = createWorldState();
    expect(state.solarLuminosity).toBe(1);
    new Simulation(state, [solarEvolutionSystem]).tick();
    expect(state.solarLuminosity).toBeCloseTo(1 + SOLAR_BRIGHTENING_PER_TICK, 12);
  });

  it('accumulates monotonically over many ticks', () => {
    const state = createWorldState();
    new Simulation(state, [solarEvolutionSystem]).run(10_000);
    expect(state.solarLuminosity).toBeCloseTo(1 + SOLAR_BRIGHTENING_PER_TICK * 10_000, 6);
    expect(state.solarLuminosity).toBeGreaterThan(1);
  });

  it('is deterministic', () => {
    const a = createWorldState({ seed: 's' });
    const b = createWorldState({ seed: 's' });
    new Simulation(a, [solarEvolutionSystem]).run(500);
    new Simulation(b, [solarEvolutionSystem]).run(500);
    expect(a.solarLuminosity).toBe(b.solarLuminosity);
  });
});
