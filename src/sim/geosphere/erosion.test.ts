import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { classifySurface } from './surface';
import { erosionSystem } from './erosion';

/** A small world with a single tall central peak on a low plain (all land). */
function peakWorld(rainfall = 1): ReturnType<typeof createWorldState> {
  const W = 9;
  const H = 9;
  const state = createWorldState({ width: W, height: H });
  state.seaLevel = -1; // everything is land
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - 4, y - 4);
      state.altitude[y * W + x] = Math.max(0.05, 1 - d * 0.2);
      state.rainfall[y * W + x] = rainfall;
    }
  }
  classifySurface(state);
  return state;
}

const sum = (a: Float32Array): number => a.reduce((s, v) => s + v, 0);

describe('erosionSystem', () => {
  it('lowers the peak and raises the surroundings', () => {
    const state = peakWorld();
    const peak = 4 * 9 + 4;
    const peakBefore = state.altitude[peak]!;
    const edge = 0; // a low corner
    const edgeBefore = state.altitude[edge]!;

    new Simulation(state, [erosionSystem]).run(400);

    expect(state.altitude[peak]!).toBeLessThan(peakBefore);
    expect(state.altitude[edge]!).toBeGreaterThanOrEqual(edgeBefore);
  });

  it('conserves total elevation (mass-conserving transport)', () => {
    const state = peakWorld();
    const before = sum(state.altitude);
    new Simulation(state, [erosionSystem]).run(300);
    expect(sum(state.altitude)).toBeCloseTo(before, 4);
  });

  it('erodes faster where it rains more', () => {
    const wet = peakWorld(2);
    const dry = peakWorld(0.2);
    const peak = 4 * 9 + 4;
    const start = wet.altitude[peak]!;
    new Simulation(wet, [erosionSystem]).run(300);
    new Simulation(dry, [erosionSystem]).run(300);
    expect(start - wet.altitude[peak]!).toBeGreaterThan(start - dry.altitude[peak]!);
  });

  it('reduces terrain roughness over time (smooths relief)', () => {
    const state = peakWorld();
    const variance = (a: Float32Array): number => {
      const m = sum(a) / a.length;
      return a.reduce((s, v) => s + (v - m) * (v - m), 0) / a.length;
    };
    const before = variance(state.altitude);
    new Simulation(state, [erosionSystem]).run(500);
    expect(variance(state.altitude)).toBeLessThan(before);
  });

  it('is deterministic', () => {
    const a = peakWorld();
    const b = peakWorld();
    new Simulation(a, [erosionSystem]).run(200);
    new Simulation(b, [erosionSystem]).run(200);
    expect(a.altitude).toEqual(b.altitude);
  });
});
