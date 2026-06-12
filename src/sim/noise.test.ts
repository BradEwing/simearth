import { describe, it, expect } from 'vitest';
import { createPerlin3, fbm } from './noise';
import { createRng } from './rng';

describe('perlin noise', () => {
  it('is deterministic for the same seeded permutation', () => {
    const a = createPerlin3(createRng('noise'));
    const b = createPerlin3(createRng('noise'));
    for (let i = 0; i < 100; i++) {
      const x = i * 0.37;
      expect(a(x, x * 0.5, -x)).toBe(b(x, x * 0.5, -x));
    }
  });

  it('differs for different permutations', () => {
    const a = createPerlin3(createRng('one'));
    const b = createPerlin3(createRng('two'));
    let anyDiff = false;
    for (let i = 0; i < 100; i++) {
      if (a(i * 0.3, i * 0.1, i * 0.2) !== b(i * 0.3, i * 0.1, i * 0.2)) anyDiff = true;
    }
    expect(anyDiff).toBe(true);
  });

  it('stays within roughly [-1, 1]', () => {
    const n = createPerlin3(createRng('range'));
    for (let i = 0; i < 5000; i++) {
      const v = n(i * 0.13, i * 0.07, i * 0.29);
      expect(v).toBeGreaterThanOrEqual(-1.01);
      expect(v).toBeLessThanOrEqual(1.01);
    }
  });

  it('is continuous: small input steps give small output steps', () => {
    const n = createPerlin3(createRng('cont'));
    let maxStep = 0;
    let prev = n(0, 0, 0);
    for (let i = 1; i < 1000; i++) {
      const v = n(i * 0.01, 0, 0);
      maxStep = Math.max(maxStep, Math.abs(v - prev));
      prev = v;
    }
    expect(maxStep).toBeLessThan(0.2); // no jumps for a 0.01 step
  });

  it('returns 0 at integer lattice points (perlin property)', () => {
    const n = createPerlin3(createRng('lattice'));
    expect(n(1, 2, 3)).toBeCloseTo(0, 6);
    expect(n(-4, 5, 0)).toBeCloseTo(0, 6);
  });
});

describe('fbm', () => {
  it('stays normalized within roughly [-1, 1]', () => {
    const n = createPerlin3(createRng('fbm'));
    for (let i = 0; i < 5000; i++) {
      const v = fbm(n, i * 0.05, i * 0.03, i * 0.02, 6);
      expect(v).toBeGreaterThanOrEqual(-1.01);
      expect(v).toBeLessThanOrEqual(1.01);
    }
  });

  it('adds detail without exploding amplitude as octaves grow', () => {
    const n = createPerlin3(createRng('octaves'));
    const one = fbm(n, 1.3, 2.7, 0.4, 1);
    const many = fbm(n, 1.3, 2.7, 0.4, 8);
    expect(Number.isFinite(one)).toBe(true);
    expect(Number.isFinite(many)).toBe(true);
    expect(Math.abs(many)).toBeLessThanOrEqual(1.01);
  });
});
