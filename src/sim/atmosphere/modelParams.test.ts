import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { temperatureSystem } from './temperature';
import { initClimate } from './climate';

function ticked(mutate: (s: ReturnType<typeof createWorldState>) => void): number {
  const state = createWorldState({ width: 16, height: 16, seed: 'mp' });
  initClimate(state);
  state.co2 *= 2; // nonzero forcing so the greenhouse factor bites
  mutate(state);
  new Simulation(state, [temperatureSystem]).tick();
  return state.meanTemperature;
}

describe('adjustable model parameters', () => {
  it('greenhouseFactor amplifies (and weakens) CO2 warming', () => {
    const normal = ticked(() => {});
    const strong = ticked((s) => (s.greenhouseFactor = 2));
    const weak = ticked((s) => (s.greenhouseFactor = 0.3));
    expect(strong).toBeGreaterThan(normal);
    expect(weak).toBeLessThan(normal);
  });

  it('solarFactor scales the solar input', () => {
    const normal = ticked(() => {});
    const brighter = ticked((s) => (s.solarFactor = 1.2));
    const dimmer = ticked((s) => (s.solarFactor = 0.8));
    expect(brighter).toBeGreaterThan(normal);
    expect(dimmer).toBeLessThan(normal);
  });

  it('defaults (factor 1) leave the climate unchanged', () => {
    const a = ticked(() => {});
    const b = ticked((s) => {
      s.greenhouseFactor = 1;
      s.solarFactor = 1;
    });
    expect(a).toBe(b);
  });
});
