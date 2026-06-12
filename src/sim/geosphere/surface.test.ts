import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { generateTerrain } from './terrain';
import { classifySurface, SurfaceType } from './surface';

describe('classifySurface', () => {
  it('classifies a handcrafted profile (ocean/coast/land/mountain)', () => {
    const state = createWorldState({ width: 6, height: 3 });
    state.seaLevel = 0;
    // Same profile every row: ocean | coast | land | land | mountain | ocean
    const profile = [-1, 0.2, 0.2, 0.2, 2.0, -1];
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 6; x++) state.altitude[y * 6 + x] = profile[x]!;
    }

    classifySurface(state);
    const row = Array.from(state.surface.subarray(6, 12)); // middle row
    expect(row).toEqual([
      SurfaceType.Ocean,
      SurfaceType.Coast,
      SurfaceType.Land,
      SurfaceType.Land,
      SurfaceType.Mountain,
      SurfaceType.Ocean,
    ]);
  });

  it('marks tiles below sea level as ocean and never as land', () => {
    const state = createWorldState({ width: 48, height: 24, seed: 'cls' });
    generateTerrain(state, { oceanFraction: 0.6 });
    classifySurface(state);
    for (let i = 0; i < state.altitude.length; i++) {
      const isOcean = state.altitude[i]! < state.seaLevel;
      const labeledOcean = state.surface[i] === SurfaceType.Ocean;
      expect(labeledOcean).toBe(isOcean);
    }
  });

  it('every coast tile is land that borders ocean', () => {
    const state = createWorldState({ width: 48, height: 24, seed: 'coast' });
    generateTerrain(state, { oceanFraction: 0.55 });
    classifySurface(state);
    const { width, height, surface } = state;
    let coastCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (surface[y * width + x] !== SurfaceType.Coast) continue;
        coastCount++;
        let bordersOcean = false;
        // inline neighbor check with wrap + pole skip
        const offsets: ReadonlyArray<[number, number]> = [
          [0, -1],
          [-1, 0],
          [1, 0],
          [0, 1],
        ];
        for (const [dx, dy] of offsets) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          const nx = (((x + dx) % width) + width) % width;
          if (surface[ny * width + nx] === SurfaceType.Ocean) bordersOcean = true;
        }
        expect(bordersOcean).toBe(true);
      }
    }
    expect(coastCount).toBeGreaterThan(0); // a realistic planet has coastline
  });

  it('is deterministic for identical input', () => {
    const make = () => {
      const s = createWorldState({ width: 32, height: 16, seed: 'det' });
      generateTerrain(s);
      classifySurface(s);
      return s.surface;
    };
    expect(make()).toEqual(make());
  });
});
