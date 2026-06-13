import { describe, it, expect } from 'vitest';
import { createWorldState } from './state';
import { SurfaceType } from './geosphere/surface';
import { triggerVolcano, triggerMeteor, triggerEarthquake } from './commands';

function flatLand(): ReturnType<typeof createWorldState> {
  const state = createWorldState({ width: 16, height: 16 });
  state.seaLevel = 0;
  state.altitude.fill(0.2);
  return state;
}

describe('triggerVolcano', () => {
  it('raises a peak, vents CO2, and buries local life', () => {
    const state = flatLand();
    state.biomass.fill(0.6);
    state.lifeStage.fill(3);
    const co2Before = state.co2;
    const c = 8 * 16 + 8;
    const altBefore = state.altitude[c]!;

    triggerVolcano(state, 8, 8);
    expect(state.altitude[c]!).toBeGreaterThan(altBefore);
    expect(state.co2).toBeGreaterThan(co2Before);
    expect(state.biomass[c]).toBe(0);
    expect(state.lifeStage[c]).toBe(0);
  });
});

describe('triggerMeteor', () => {
  it('gouges a crater and annihilates life and settlements', () => {
    const state = flatLand();
    state.biomass.fill(0.6);
    state.lifeStage.fill(4);
    state.population.fill(0.5);
    const c = 8 * 16 + 8;
    const altBefore = state.altitude[c]!;

    triggerMeteor(state, 8, 8);
    expect(state.altitude[c]!).toBeLessThan(altBefore);
    expect(state.biomass[c]).toBe(0);
    expect(state.population[c]).toBe(0);
  });

  it('craters below sea level become ocean', () => {
    const state = flatLand(); // land at 0.2
    triggerMeteor(state, 8, 8);
    expect(state.surface[8 * 16 + 8]).toBe(SurfaceType.Ocean);
  });
});

describe('triggerEarthquake', () => {
  it('perturbs terrain and halves local population, deterministically', () => {
    const a = flatLand();
    const b = flatLand();
    a.population.fill(1);
    b.population.fill(1);

    triggerEarthquake(a, 8, 8);
    triggerEarthquake(b, 8, 8);

    const c = 8 * 16 + 8;
    expect(a.population[c]).toBeCloseTo(0.5, 6); // toppled
    expect(a.altitude).toEqual(b.altitude); // deterministic perturbation
  });
});
