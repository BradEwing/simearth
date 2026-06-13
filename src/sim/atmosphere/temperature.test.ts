import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { latitudeOf } from '../grid';
import { insolationFactor, areaWeight } from './insolation';
import { temperatureSystem } from './temperature';
import { initClimate } from './climate';

describe('insolation', () => {
  it('is highest at the equator and lowest at the poles', () => {
    expect(insolationFactor(0)).toBeGreaterThan(insolationFactor(45));
    expect(insolationFactor(45)).toBeGreaterThan(insolationFactor(90));
  });

  it('is symmetric about the equator', () => {
    expect(insolationFactor(30)).toBeCloseTo(insolationFactor(-30), 10);
  });

  it('area weight falls from equator to pole', () => {
    expect(areaWeight(0)).toBeCloseTo(1, 6);
    expect(areaWeight(60)).toBeCloseTo(0.5, 6);
    expect(areaWeight(90)).toBeCloseTo(0, 6);
  });
});

const run = (seed = 'temp'): ReturnType<typeof createWorldState> => {
  const state = createWorldState({ width: 32, height: 32, seed });
  initClimate(state);
  new Simulation(state, [temperatureSystem]).tick();
  return state;
};

describe('temperatureSystem', () => {
  it('produces an Earth-like global mean (~15 °C) at L = 1', () => {
    const state = run();
    expect(state.meanTemperature).toBeGreaterThan(10);
    expect(state.meanTemperature).toBeLessThan(20);
  });

  it('is warm at the equator and cold at the poles', () => {
    const { width, height, temperature } = run();
    const equatorRow = Math.floor(height / 2);
    const tEquator = temperature[equatorRow * width]!;
    const tNorthPole = temperature[0]!;
    const tSouthPole = temperature[(height - 1) * width]!;
    expect(tEquator).toBeGreaterThan(tNorthPole + 10);
    expect(tEquator).toBeGreaterThan(tSouthPole + 10);
  });

  it('latitude bands are uniform across longitude (no albedo variation yet)', () => {
    const { width, temperature } = run();
    const row = 7 * width;
    for (let x = 1; x < width; x++) {
      expect(temperature[row + x]).toBeCloseTo(temperature[row]!, 10);
    }
  });

  it('warms the whole planet when solar luminosity rises', () => {
    const cool = createWorldState({ width: 16, height: 16, seed: 's' });
    initClimate(cool);
    new Simulation(cool, [temperatureSystem]).tick();
    const warm = createWorldState({ width: 16, height: 16, seed: 's' });
    initClimate(warm);
    warm.solarLuminosity = 1.1;
    new Simulation(warm, [temperatureSystem]).tick();
    expect(warm.meanTemperature).toBeGreaterThan(cool.meanTemperature + 5);
  });

  it('warms when CO2 rises above the reference (greenhouse)', () => {
    const ref = createWorldState({ width: 16, height: 16, seed: 'g' });
    initClimate(ref);
    new Simulation(ref, [temperatureSystem]).tick();
    const rich = createWorldState({ width: 16, height: 16, seed: 'g' });
    initClimate(rich);
    rich.co2 *= 2; // one CO2 doubling
    new Simulation(rich, [temperatureSystem]).tick();
    // ΔF(2x) ≈ 3.7 W/m² ⇒ ~1.7 °C warming.
    expect(rich.meanTemperature).toBeGreaterThan(ref.meanTemperature + 1);
    expect(rich.meanTemperature).toBeLessThan(ref.meanTemperature + 3);
  });

  it('is deterministic and independent of longitude position', () => {
    expect(run('x').temperature).toEqual(run('x').temperature);
  });

  it('matches the closed-form mean: equals the cos-weighted tile mean', () => {
    const { width, height, temperature, meanTemperature } = run();
    let wsum = 0;
    let wt = 0;
    for (let y = 0; y < height; y++) {
      const w = areaWeight(latitudeOf(height, y));
      wsum += w * width;
      for (let x = 0; x < width; x++) wt += w * temperature[y * width + x]!;
    }
    expect(wt / wsum).toBeCloseTo(meanTemperature, 6);
  });
});
