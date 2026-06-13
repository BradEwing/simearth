import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { generateTerrain } from '../geosphere/terrain';
import { classifySurface, SurfaceType } from '../geosphere/surface';
import { temperatureSystem } from '../atmosphere/temperature';
import { initClimate } from '../atmosphere/climate';
import { computeOceanCurrents } from './currents';
import { oceanHeatSystem } from './oceanHeat';

function planet(seed: string): ReturnType<typeof createWorldState> {
  const state = createWorldState({ width: 48, height: 32, seed });
  generateTerrain(state, { oceanFraction: 0.6 });
  classifySurface(state);
  initClimate(state);
  return state;
}

describe('computeOceanCurrents', () => {
  it('produces flow on ocean and none on land', () => {
    const state = planet('cur');
    computeOceanCurrents(state);
    for (let i = 0; i < state.surface.length; i++) {
      const moving = state.currentU[i] !== 0 || state.currentV[i] !== 0;
      if (state.surface[i] === SurfaceType.Ocean) {
        // most ocean tiles move (a few sit exactly on a streamfunction node)
      } else {
        expect(moving).toBe(false);
      }
    }
    let movingOcean = 0;
    let ocean = 0;
    for (let i = 0; i < state.surface.length; i++) {
      if (state.surface[i] === SurfaceType.Ocean) {
        ocean++;
        if (state.currentU[i] !== 0 || state.currentV[i] !== 0) movingOcean++;
      }
    }
    expect(movingOcean / ocean).toBeGreaterThan(0.9);
  });

  it('is deterministic', () => {
    const a = planet('d');
    const b = planet('d');
    computeOceanCurrents(a);
    computeOceanCurrents(b);
    expect(a.currentU).toEqual(b.currentU);
    expect(a.currentV).toEqual(b.currentV);
  });
});

const oceanStats = (state: ReturnType<typeof createWorldState>) => {
  let sum = 0;
  let n = 0;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < state.surface.length; i++) {
    if (state.surface[i] !== SurfaceType.Ocean) continue;
    const t = state.temperature[i]!;
    sum += t;
    n++;
    if (t < min) min = t;
    if (t > max) max = t;
  }
  return { mean: sum / n, min, max, n };
};

describe('oceanHeatSystem', () => {
  it('redistributes ocean heat without changing the reported global mean', () => {
    const advected = planet('adv');
    const plain = planet('adv');
    new Simulation(advected, [temperatureSystem, oceanHeatSystem]).run(50);
    new Simulation(plain, [temperatureSystem]).run(50);

    // The energy-balance global mean is untouched (advection only moves heat).
    expect(advected.meanTemperature).toBeCloseTo(plain.meanTemperature, 6);

    // But the ocean temperature pattern changes — heat moved around.
    let changed = false;
    for (let i = 0; i < advected.surface.length; i++) {
      if (advected.surface[i] !== SurfaceType.Ocean) continue;
      if (Math.abs(advected.temperature[i]! - plain.temperature[i]!) > 0.5) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });

  it('keeps ocean temperatures bounded (stable, no blow-up)', () => {
    const state = planet('stable');
    new Simulation(state, [temperatureSystem, oceanHeatSystem]).run(500);
    const { min, max } = oceanStats(state);
    expect(Number.isFinite(min)).toBe(true);
    expect(min).toBeGreaterThan(-80);
    expect(max).toBeLessThan(80);
  });

  it('creates east–west temperature variation within a latitude band', () => {
    // Pure EBM gives a row uniform in longitude; currents should break that.
    const state = planet('ew');
    new Simulation(state, [temperatureSystem, oceanHeatSystem]).run(100);
    const { width, height, surface, temperature } = state;
    const y = Math.floor(height * 0.3); // a mid-latitude band
    let min = Infinity;
    let max = -Infinity;
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (surface[i] !== SurfaceType.Ocean) continue;
      if (temperature[i]! < min) min = temperature[i]!;
      if (temperature[i]! > max) max = temperature[i]!;
    }
    expect(max - min).toBeGreaterThan(0.5); // genuine longitudinal structure
  });

  it('is deterministic', () => {
    const a = planet('det');
    const b = planet('det');
    new Simulation(a, [temperatureSystem, oceanHeatSystem]).run(60);
    new Simulation(b, [temperatureSystem, oceanHeatSystem]).run(60);
    expect(a.temperature).toEqual(b.temperature);
  });
});
