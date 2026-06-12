import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { generateTerrain } from './terrain';

const gen = (seed: string, opts = {}) => {
  const state = createWorldState({ width: 64, height: 32, seed });
  generateTerrain(state, opts);
  return state;
};

describe('generateTerrain', () => {
  it('is deterministic for a seed and varies between seeds', () => {
    expect(gen('alpha').altitude).toEqual(gen('alpha').altitude);
    expect(gen('alpha').altitude).not.toEqual(gen('beta').altitude);
  });

  it('hits the requested ocean fraction (within quantile granularity)', () => {
    for (const target of [0.4, 0.65, 0.8]) {
      const state = gen('oceans', { oceanFraction: target });
      let ocean = 0;
      for (const a of state.altitude) if (a < state.seaLevel) ocean++;
      const frac = ocean / state.altitude.length;
      expect(Math.abs(frac - target)).toBeLessThan(0.03);
    }
  });

  it('produces both land and ocean (not a degenerate planet)', () => {
    const state = gen('mixed');
    let land = 0;
    for (const a of state.altitude) if (a >= state.seaLevel) land++;
    expect(land).toBeGreaterThan(0);
    expect(land).toBeLessThan(state.altitude.length);
  });

  it('wraps seamlessly across the east–west seam', () => {
    const { width, height, altitude } = gen('seam');

    // Mean |Δaltitude| between the seam columns (x=0 and x=W-1)...
    let seamDiff = 0;
    // ...versus a typical interior adjacent-column pair (x=0 and x=1).
    let interiorDiff = 0;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      seamDiff += Math.abs(altitude[row]! - altitude[row + width - 1]!);
      interiorDiff += Math.abs(altitude[row]! - altitude[row + 1]!);
    }
    seamDiff /= height;
    interiorDiff /= height;

    // A discontinuity would make the seam difference far larger than interior;
    // on a cylinder they are comparable.
    expect(seamDiff).toBeLessThan(interiorDiff * 1.6 + 1e-6);
  });

  it('advances the world rng (consumed entropy for generation)', () => {
    const state = createWorldState({ width: 32, height: 16, seed: 'rngmove' });
    const before = { ...state.rng };
    generateTerrain(state);
    expect(state.rng).not.toEqual(before);
  });
});
