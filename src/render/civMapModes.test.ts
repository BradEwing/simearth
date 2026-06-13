import { describe, it, expect } from 'vitest';
import { createWorldState } from '@sim/state';
import { populationMapMode, pollutionMapMode } from './mapModes';

const buffer = (n: number): Uint8ClampedArray => new Uint8ClampedArray(n * 4);
const luma = (rgba: Uint8ClampedArray, i: number): number =>
  0.299 * rgba[i * 4]! + 0.587 * rgba[i * 4 + 1]! + 0.114 * rgba[i * 4 + 2]!;

describe('populationMapMode', () => {
  it('renders empty tiles dark and dense tiles bright', () => {
    const state = createWorldState({ width: 3, height: 1 });
    state.population.set([0, 0.3, 1.5]);
    const rgba = buffer(3);
    populationMapMode.paint(state, rgba);
    expect(luma(rgba, 0)).toBeLessThan(luma(rgba, 1));
    expect(luma(rgba, 1)).toBeLessThanOrEqual(luma(rgba, 2));
    for (let i = 0; i < 3; i++) expect(rgba[i * 4 + 3]).toBe(255);
  });
});

describe('pollutionMapMode', () => {
  it('shifts from clean toward toxic as pollution rises', () => {
    const state = createWorldState({ width: 2, height: 1 });
    state.pollution.set([0, 2]);
    const rgba = buffer(2);
    pollutionMapMode.paint(state, rgba);
    // Toxic end is much redder than the clean end.
    const cleanRed = rgba[0]!;
    const toxicRed = rgba[4]!;
    expect(toxicRed).toBeGreaterThan(cleanRed);
  });
});
