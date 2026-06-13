import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { generateTerrain } from '../geosphere/terrain';
import { classifySurface, SurfaceType } from '../geosphere/surface';
import {
  computeWind,
  computeRainfall,
  baseLatitudeRain,
  weatherSystem,
  WIND_SPEED,
} from './weather';

describe('computeWind', () => {
  it('gives tropical easterlies and mid-latitude westerlies', () => {
    const state = createWorldState({ width: 4, height: 90 });
    computeWind(state);
    const rowU = (latIndex: number): number => state.windU[latIndex * 4]!;
    // Row near the equator (index ~45) is easterly (westward, u < 0).
    expect(rowU(45)).toBeLessThan(0);
    // Row near 45° (index ~22 in the N hemisphere) is westerly (u > 0).
    expect(rowU(22)).toBeGreaterThan(0);
    expect(Math.abs(rowU(45))).toBeLessThanOrEqual(WIND_SPEED + 1e-9);
  });
});

describe('baseLatitudeRain', () => {
  it('is wettest at the equator and dry in the subtropics', () => {
    expect(baseLatitudeRain(0)).toBeGreaterThan(baseLatitudeRain(28));
    expect(baseLatitudeRain(0)).toBeGreaterThan(baseLatitudeRain(90));
  });

  it('has a secondary mid-latitude peak above the subtropical minimum', () => {
    expect(baseLatitudeRain(50)).toBeGreaterThan(baseLatitudeRain(28));
  });
});

describe('computeRainfall', () => {
  it('keeps oceans wet and dries continental interiors', () => {
    const state = createWorldState({ width: 64, height: 32, seed: 'rain' });
    generateTerrain(state, { oceanFraction: 0.55 });
    classifySurface(state);
    computeWind(state);
    computeRainfall(state);

    // Coastal land (adjacent to ocean) should generally be wetter than deep
    // interior land. Compare the wettest coast tile to a far-inland sample.
    let coastSum = 0;
    let coastN = 0;
    for (let i = 0; i < state.surface.length; i++) {
      if (state.surface[i] === SurfaceType.Coast) {
        coastSum += state.rainfall[i]!;
        coastN++;
      }
    }
    let landSum = 0;
    let landN = 0;
    for (let i = 0; i < state.surface.length; i++) {
      if (state.surface[i] === SurfaceType.Land) {
        landSum += state.rainfall[i]!;
        landN++;
      }
    }
    expect(coastN).toBeGreaterThan(0);
    expect(landN).toBeGreaterThan(0);
    expect(coastSum / coastN).toBeGreaterThan(landSum / landN);
  });

  it('produces a rain shadow: windward slopes wetter than leeward', () => {
    // Equatorial row (easterly wind, blows west). Ocean to the east supplies
    // moisture; a central ridge gets a wet east (windward) face and a dry west
    // (leeward) face.
    const W = 24;
    const state = createWorldState({ width: W, height: 1 });
    state.seaLevel = 0;
    for (let x = 0; x < W; x++) {
      // Ocean for x>=18 (east), a ridge peaking at x=10, low land westward.
      const peakDist = Math.abs(x - 10);
      state.altitude[x] = x >= 18 ? -1 : Math.max(0.05, 1.2 - peakDist * 0.18);
    }
    classifySurface(state);
    computeWind(state); // equator → easterly (u<0) → upwind is east (+x)
    computeRainfall(state);

    const windward = state.rainfall[12]!; // east face of ridge (toward ocean)
    const leeward = state.rainfall[8]!; // west face (rain shadow)
    expect(windward).toBeGreaterThan(leeward);
  });
});

describe('weatherSystem', () => {
  it('computes fields on the first tick and is deterministic', () => {
    const make = (): ReturnType<typeof createWorldState> => {
      const s = createWorldState({ width: 32, height: 16, seed: 'w' });
      generateTerrain(s, { oceanFraction: 0.6 });
      classifySurface(s);
      new Simulation(s, [weatherSystem]).tick();
      return s;
    };
    const a = make();
    const b = make();
    let anyRain = false;
    for (const r of a.rainfall) if (r > 0) anyRain = true;
    expect(anyRain).toBe(true);
    expect(a.rainfall).toEqual(b.rainfall);
    expect(a.windU).toEqual(b.windU);
  });
});
