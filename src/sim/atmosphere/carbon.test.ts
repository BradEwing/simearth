import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { co2Forcing } from './greenhouse';
import { CO2_REFERENCE } from './climateConstants';
import { carbonCycleSystem, VOLCANIC_OUTGASSING } from './carbon';
import { initClimate, INITIAL_CO2 } from './climate';

describe('co2Forcing', () => {
  it('is zero at the reference CO2', () => {
    expect(co2Forcing(CO2_REFERENCE)).toBeCloseTo(0, 10);
  });

  it('is positive above and negative below the reference, and monotonic', () => {
    expect(co2Forcing(CO2_REFERENCE * 2)).toBeGreaterThan(0);
    expect(co2Forcing(CO2_REFERENCE / 2)).toBeLessThan(0);
    expect(co2Forcing(400)).toBeGreaterThan(co2Forcing(300));
  });

  it('is logarithmic: equal forcing steps per CO2 doubling', () => {
    const step1 = co2Forcing(CO2_REFERENCE * 2) - co2Forcing(CO2_REFERENCE);
    const step2 = co2Forcing(CO2_REFERENCE * 4) - co2Forcing(CO2_REFERENCE * 2);
    expect(step1).toBeCloseTo(step2, 10);
  });
});

describe('carbonCycleSystem', () => {
  it('initializes CO2 to the reference (neutral greenhouse)', () => {
    const state = createWorldState();
    initClimate(state);
    expect(state.co2).toBe(INITIAL_CO2);
    expect(co2Forcing(state.co2)).toBeCloseTo(0, 10);
  });

  it('adds volcanic outgassing each tick (source only, for now)', () => {
    const state = createWorldState();
    initClimate(state);
    const sim = new Simulation(state, [carbonCycleSystem]);
    sim.tick();
    expect(state.co2).toBeCloseTo(INITIAL_CO2 + VOLCANIC_OUTGASSING, 10);
    sim.run(9);
    expect(state.co2).toBeCloseTo(INITIAL_CO2 + VOLCANIC_OUTGASSING * 10, 6);
  });

  it('never drives CO2 negative', () => {
    const state = createWorldState();
    initClimate(state);
    state.co2 = 0;
    new Simulation(state, [carbonCycleSystem]).run(5);
    expect(state.co2).toBeGreaterThanOrEqual(0);
  });
});
