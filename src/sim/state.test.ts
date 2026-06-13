import { describe, it, expect } from 'vitest';
import { createWorldState, copyWorldInto, DEFAULT_WIDTH, DEFAULT_HEIGHT } from './state';

describe('createWorldState', () => {
  it('defaults to the SPEC grid size', () => {
    const w = createWorldState();
    expect(w.width).toBe(DEFAULT_WIDTH);
    expect(w.height).toBe(DEFAULT_HEIGHT);
  });

  it('allocates every per-tile field at width*height length', () => {
    const w = createWorldState({ width: 20, height: 10 });
    const n = 200;
    for (const field of [
      w.altitude,
      w.temperature,
      w.rainfall,
      w.windU,
      w.windV,
      w.currentU,
      w.currentV,
      w.pollution,
    ]) {
      expect(field).toBeInstanceOf(Float32Array);
      expect(field.length).toBe(n);
    }
    for (const field of [w.surface, w.biome]) {
      expect(field).toBeInstanceOf(Uint8Array);
      expect(field.length).toBe(n);
    }
  });

  it('starts zeroed at tick 0 with neutral scalars', () => {
    const w = createWorldState({ width: 8, height: 8 });
    expect(w.tick).toBe(0);
    expect(w.solarLuminosity).toBe(1);
    expect(w.co2).toBe(0);
    expect(w.altitude.every((v) => v === 0)).toBe(true);
    expect(w.surface.every((v) => v === 0)).toBe(true);
  });

  it('seeds the rng deterministically from the world seed', () => {
    const a = createWorldState({ seed: 'gaia' });
    const b = createWorldState({ seed: 'gaia' });
    const c = createWorldState({ seed: 'other' });
    expect(a.rng).toEqual(b.rng);
    expect(a.rng).not.toEqual(c.rng);
  });

  it('rejects degenerate sizes', () => {
    expect(() => createWorldState({ width: 0, height: 10 })).toThrow();
    expect(() => createWorldState({ width: 10, height: -1 })).toThrow();
    expect(() => createWorldState({ width: 1.5, height: 10 })).toThrow();
  });
});

describe('copyWorldInto', () => {
  it('copies fields and scalars in place, keeping the target identity', () => {
    const target = createWorldState({ width: 8, height: 8 });
    const source = createWorldState({ width: 8, height: 8, seed: 'src' });
    source.tick = 99;
    source.co2 = 321;
    source.altitude.fill(0.5);
    source.rng.a = 0xabcdef;

    const altRef = target.altitude; // identity must be preserved
    const rngRef = target.rng;
    copyWorldInto(target, source);

    expect(target.altitude).toBe(altRef); // same array, contents replaced
    expect(target.rng).toBe(rngRef);
    expect(target.tick).toBe(99);
    expect(target.co2).toBe(321);
    expect(target.altitude.every((v) => v === 0.5)).toBe(true);
    expect(target.rng.a).toBe(0xabcdef);
  });

  it('throws on a dimension mismatch', () => {
    const a = createWorldState({ width: 8, height: 8 });
    const b = createWorldState({ width: 10, height: 8 });
    expect(() => copyWorldInto(a, b)).toThrow(/dimensions/);
  });
});
