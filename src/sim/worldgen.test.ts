import { describe, it, expect } from 'vitest';
import { createPlanet } from './worldgen';
import { SurfaceType } from './geosphere/surface';
import { INITIAL_CO2 } from './atmosphere/climate';

describe('createPlanet', () => {
  it('produces a ready-to-run world (land, ocean, initialized atmosphere)', () => {
    const state = createPlanet({ width: 48, height: 32, seed: 'world' });
    let land = 0;
    let ocean = 0;
    for (const s of state.surface) {
      if (s === SurfaceType.Ocean) ocean++;
      else land++;
    }
    expect(land).toBeGreaterThan(0);
    expect(ocean).toBeGreaterThan(0);
    expect(state.co2).toBe(INITIAL_CO2);
    expect(state.tick).toBe(0);
  });

  it('is deterministic for a seed and varies between seeds', () => {
    expect(createPlanet({ seed: 'a' }).altitude).toEqual(
      createPlanet({ seed: 'a' }).altitude,
    );
    expect(createPlanet({ seed: 'a' }).altitude).not.toEqual(
      createPlanet({ seed: 'b' }).altitude,
    );
  });
});
