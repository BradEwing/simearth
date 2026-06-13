import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { generateTerrain } from '../geosphere/terrain';
import { classifySurface } from '../geosphere/surface';
import { co2Forcing } from './greenhouse';
import { CO2_REFERENCE } from './climateConstants';
import { carbonCycleSystem, silicateWeathering, VOLCANIC_OUTGASSING } from './carbon';
import { temperatureSystem } from './temperature';
import { initClimate, INITIAL_CO2 } from './climate';

/** A generated, classified, climate-initialized planet for thermostat tests. */
function climateWorld(
  seed: string,
  oceanFraction = 0.7,
): ReturnType<typeof createWorldState> {
  const state = createWorldState({ width: 48, height: 32, seed });
  generateTerrain(state, { oceanFraction });
  classifySurface(state);
  initClimate(state);
  return state;
}

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

  it('adds pure outgassing on a waterworld (no land ⇒ no weathering)', () => {
    const state = createWorldState(); // all ocean, never classified to land
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

describe('silicate weathering thermostat', () => {
  it('weathering rises with temperature', () => {
    const state = climateWorld('w');
    state.meanTemperature = 5;
    const cold = silicateWeathering(state);
    state.meanTemperature = 28;
    const hot = silicateWeathering(state);
    expect(hot).toBeGreaterThan(cold);
    expect(cold).toBeGreaterThan(0); // this planet has land
  });

  it('regulates to a habitable equilibrium from a hot CO2-rich start', () => {
    const state = climateWorld('eq');
    state.co2 = 1500; // start rich and hot
    const sim = new Simulation(state, [temperatureSystem, carbonCycleSystem]);
    sim.run(6000);
    expect(state.meanTemperature).toBeGreaterThan(8);
    expect(state.meanTemperature).toBeLessThan(22);
    expect(state.co2).toBeLessThan(1500); // drawn down

    const before = state.co2;
    sim.run(300);
    expect(Math.abs(state.co2 - before) / before).toBeLessThan(0.02); // equilibrated
  });

  it('converges to the same temperature from CO2-poor and CO2-rich starts', () => {
    const poor = climateWorld('conv');
    poor.co2 = 40;
    const rich = climateWorld('conv');
    rich.co2 = 2500;
    new Simulation(poor, [temperatureSystem, carbonCycleSystem]).run(9000);
    new Simulation(rich, [temperatureSystem, carbonCycleSystem]).run(9000);
    expect(Math.abs(poor.meanTemperature - rich.meanTemperature)).toBeLessThan(1.5);
  });
});
