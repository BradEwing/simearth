import { describe, it, expect } from 'vitest';
import { createRng, restoreRng, seedRng } from './rng';

const draw = (seed: number | string, n: number): number[] => {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => rng.next());
};

describe('rng', () => {
  it('reproduces the same sequence for the same seed', () => {
    expect(draw(42, 100)).toEqual(draw(42, 100));
    expect(draw('gaia', 100)).toEqual(draw('gaia', 100));
  });

  it('produces different sequences for different seeds', () => {
    expect(draw(1, 50)).not.toEqual(draw(2, 50));
    expect(draw('a', 50)).not.toEqual(draw('b', 50));
  });

  it('next() stays in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('int() is inclusive of both bounds and never escapes them', () => {
    const rng = createRng('ints');
    let sawMin = false;
    let sawMax = false;
    for (let i = 0; i < 20_000; i++) {
      const x = rng.int(3, 8);
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(3);
      expect(x).toBeLessThanOrEqual(8);
      if (x === 3) sawMin = true;
      if (x === 8) sawMax = true;
    }
    expect(sawMin && sawMax).toBe(true);
  });

  it('float() stays within [min, max)', () => {
    const rng = createRng('floats');
    for (let i = 0; i < 10_000; i++) {
      const x = rng.float(-5, 5);
      expect(x).toBeGreaterThanOrEqual(-5);
      expect(x).toBeLessThan(5);
    }
  });

  it('has a mean near 0.5 (distribution sanity)', () => {
    const rng = createRng('dist');
    const n = 200_000;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += rng.next();
    expect(Math.abs(sum / n - 0.5)).toBeLessThan(0.005);
  });

  it('fills uniform-ish buckets (distribution sanity)', () => {
    const rng = createRng('buckets');
    const buckets = new Array(10).fill(0);
    const n = 200_000;
    for (let i = 0; i < n; i++) buckets[Math.floor(rng.next() * 10)]++;
    const expected = n / 10;
    for (const count of buckets) {
      expect(Math.abs(count - expected) / expected).toBeLessThan(0.05);
    }
  });

  it('snapshot/restore resumes the identical sequence', () => {
    const rng = createRng('resume');
    for (let i = 0; i < 17; i++) rng.next(); // advance to a mid-stream point
    const saved = rng.snapshot();

    const original = Array.from({ length: 50 }, () => rng.next());
    const resumedRng = restoreRng({ ...saved });
    const resumed = Array.from({ length: 50 }, () => resumedRng.next());

    expect(resumed).toEqual(original);
  });

  it('snapshot is a copy, not a live reference to internal state', () => {
    const rng = createRng('copy');
    const snap = rng.snapshot();
    const frozen = { ...snap };
    rng.next();
    expect(snap).toEqual(frozen); // advancing the rng must not mutate the snapshot
  });

  it('seedRng is deterministic for a given seed', () => {
    expect(seedRng(123)).toEqual(seedRng(123));
    expect(seedRng('x')).not.toEqual(seedRng('y'));
  });
});
