import { describe, it, expect } from 'vitest';
import { createWorldState } from './state';
import { SurfaceType } from './geosphere/surface';
import { terraform, setWater, forEachInRadius } from './commands';

describe('forEachInRadius', () => {
  it('visits a disc of tiles with center falloff 0', () => {
    const state = createWorldState({ width: 10, height: 10 });
    let centerFalloff = -1;
    let count = 0;
    forEachInRadius(state, 5, 5, 2, (i, f) => {
      count++;
      if (i === 5 * 10 + 5) centerFalloff = f;
    });
    expect(centerFalloff).toBe(0);
    expect(count).toBeGreaterThan(1);
  });
});

describe('terraform', () => {
  it('raises terrain most at the center', () => {
    const state = createWorldState({ width: 12, height: 12 });
    state.seaLevel = 0;
    terraform(state, 6, 6, 0.3, 3);
    const center = state.altitude[6 * 12 + 6]!;
    const edge = state.altitude[6 * 12 + 9]!; // ~3 tiles out
    expect(center).toBeGreaterThan(0);
    expect(center).toBeGreaterThan(edge);
  });

  it('lowering land below sea level reclassifies it to ocean', () => {
    const state = createWorldState({ width: 12, height: 12 });
    state.seaLevel = 0;
    state.altitude.fill(0.2); // all land
    terraform(state, 6, 6, -0.6, 1);
    expect(state.surface[6 * 12 + 6]).toBe(SurfaceType.Ocean);
  });
});

describe('setWater', () => {
  it('floods tiles to ocean and reclaims them to land', () => {
    const state = createWorldState({ width: 12, height: 12 });
    state.seaLevel = 0;
    state.altitude.fill(0.3); // all land

    setWater(state, 6, 6, true, 1); // flood
    expect(state.surface[6 * 12 + 6]).toBe(SurfaceType.Ocean);

    setWater(state, 6, 6, false, 1); // reclaim
    expect(state.surface[6 * 12 + 6]).not.toBe(SurfaceType.Ocean);
  });
});
