import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { generateTerrain } from '../geosphere/terrain';
import { classifySurface } from '../geosphere/surface';
import { temperatureSystem } from './temperature';
import { iceSystem } from './ice';
import { initClimate } from './climate';

/** Generated, classified, climate-initialized planet (CO2 fixed at reference). */
function planet(seed: string): ReturnType<typeof createWorldState> {
  const state = createWorldState({ width: 48, height: 32, seed });
  generateTerrain(state, { oceanFraction: 0.65 });
  classifySurface(state);
  initClimate(state);
  return state;
}

const meanIce = (ice: Float32Array): number =>
  ice.reduce((a, b) => a + b, 0) / ice.length;

describe('iceSystem', () => {
  it('forms ice at the cold poles but not the warm equator', () => {
    const state = planet('caps');
    const { width, height } = state;
    new Simulation(state, [temperatureSystem, iceSystem]).run(400);

    const poleIce = state.ice[0]! + state.ice[(height - 1) * width]!;
    const equatorIce = state.ice[Math.floor(height / 2) * width]!;
    expect(poleIce).toBeGreaterThan(0.5);
    expect(equatorIce).toBeLessThan(0.05);
  });

  it('is a positive feedback: ice cover lowers the global mean temperature', () => {
    const withIce = planet('fb');
    new Simulation(withIce, [temperatureSystem, iceSystem]).run(600);

    const withoutIce = planet('fb');
    new Simulation(withoutIce, [temperatureSystem]).run(600); // ice never forms

    expect(meanIce(withIce.ice)).toBeGreaterThan(0);
    expect(withIce.meanTemperature).toBeLessThan(withoutIce.meanTemperature);
  });

  it('exhibits ice-albedo bistability (hysteresis) at one forcing', () => {
    // Identical planet, solar, and CO2 — only the starting ice differs.
    const warm = planet('hys');
    new Simulation(warm, [temperatureSystem, iceSystem]).run(2500);

    const snowball = planet('hys');
    snowball.ice.fill(1); // start glaciated
    new Simulation(snowball, [temperatureSystem, iceSystem]).run(2500);

    // Two stable climates coexist at the same inputs (history-dependent).
    expect(warm.meanTemperature).toBeGreaterThan(5);
    expect(snowball.meanTemperature).toBeLessThan(-15);
    expect(warm.meanTemperature - snowball.meanTemperature).toBeGreaterThan(25);
    expect(meanIce(snowball.ice)).toBeGreaterThan(0.9); // stayed frozen
  });
});
