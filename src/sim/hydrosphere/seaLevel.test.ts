import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { generateTerrain } from '../geosphere/terrain';
import { classifySurface, SurfaceType } from '../geosphere/surface';
import { temperatureSystem } from '../atmosphere/temperature';
import { iceSystem } from '../atmosphere/ice';
import { initClimate } from '../atmosphere/climate';
import { seaLevelSystem, SEALEVEL_PER_ICE } from './seaLevel';

function planet(seed: string): ReturnType<typeof createWorldState> {
  const state = createWorldState({ width: 48, height: 32, seed });
  generateTerrain(state, { oceanFraction: 0.6 });
  classifySurface(state);
  initClimate(state);
  return state;
}

const oceanCount = (surface: Uint8Array): number => {
  let n = 0;
  for (const s of surface) if (s === SurfaceType.Ocean) n++;
  return n;
};

describe('seaLevelSystem', () => {
  it('leaves sea level at the base when there is no ice', () => {
    const state = planet('noice');
    state.ice.fill(0);
    const base = state.seaLevelBase;
    new Simulation(state, [seaLevelSystem]).tick();
    expect(state.seaLevel).toBe(base);
  });

  it('lowers sea level as land ice accumulates', () => {
    const state = planet('glaciate');
    const base = state.seaLevelBase;
    // Freeze all land solid.
    for (let i = 0; i < state.surface.length; i++) {
      const s = state.surface[i];
      if (s !== SurfaceType.Ocean) state.ice[i] = 1;
    }
    const expectedFrac = landFrac(state); // captured before reclassification
    new Simulation(state, [seaLevelSystem]).tick();
    expect(state.seaLevel).toBeLessThan(base);
    expect(base - state.seaLevel).toBeCloseTo(SEALEVEL_PER_ICE * expectedFrac, 6);
  });

  it('exposes more land when seas fall (coastline retreats)', () => {
    const state = planet('coast');
    const oceanBefore = oceanCount(state.surface);
    for (let i = 0; i < state.surface.length; i++) {
      if (state.surface[i] !== SurfaceType.Ocean) state.ice[i] = 1;
    }
    new Simulation(state, [seaLevelSystem]).tick();
    expect(oceanCount(state.surface)).toBeLessThan(oceanBefore);
  });

  it('drives glaciation→sea-level coupling in a full climate run', () => {
    // Cold planet (faint sun) grows ice and should drop its seas below base.
    const state = planet('cold');
    state.solarLuminosity = 0.85;
    const base = state.seaLevelBase;
    new Simulation(state, [temperatureSystem, iceSystem, seaLevelSystem]).run(800);
    expect(state.seaLevel).toBeLessThanOrEqual(base);
  });

  it('is deterministic', () => {
    const a = planet('det');
    const b = planet('det');
    a.solarLuminosity = b.solarLuminosity = 0.9;
    new Simulation(a, [temperatureSystem, iceSystem, seaLevelSystem]).run(300);
    new Simulation(b, [temperatureSystem, iceSystem, seaLevelSystem]).run(300);
    expect(a.seaLevel).toBe(b.seaLevel);
    expect(a.surface).toEqual(b.surface);
  });
});

/** Test helper mirroring the system's land-ice fraction (all land iced here). */
function landFrac(state: ReturnType<typeof createWorldState>): number {
  let land = 0;
  for (const s of state.surface) {
    if (s === SurfaceType.Land || s === SurfaceType.Coast || s === SurfaceType.Mountain) {
      land++;
    }
  }
  return land / state.surface.length;
}
