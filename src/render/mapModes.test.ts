import { describe, it, expect } from 'vitest';
import { createWorldState } from '@sim/state';
import { generateTerrain } from '@sim/geosphere/terrain';
import { classifySurface, SurfaceType } from '@sim/geosphere/surface';
import { surfaceMapMode, altitudeMapMode } from './mapModes';
import { SURFACE_PALETTE } from './palette';

const buffer = (n: number): Uint8ClampedArray => new Uint8ClampedArray(n * 4);

describe('surfaceMapMode', () => {
  it('maps each surface type to its palette color with opaque alpha', () => {
    const state = createWorldState({ width: 5, height: 1 });
    state.surface.set([
      SurfaceType.Ocean,
      SurfaceType.Coast,
      SurfaceType.Land,
      SurfaceType.Mountain,
      SurfaceType.Ice,
    ]);
    const rgba = buffer(5);
    surfaceMapMode.paint(state, rgba);

    // altitude is 0 everywhere here, so relief shading is a no-op (factor 1):
    // tiles render at their base palette color.
    for (let i = 0; i < 5; i++) {
      const c = SURFACE_PALETTE[i]!;
      expect([rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]).toEqual([c[0], c[1], c[2]]);
      expect(rgba[i * 4 + 3]).toBe(255);
    }
  });
});

describe('altitudeMapMode', () => {
  it('paints ocean tiles bluer than land tiles', () => {
    const state = createWorldState({ width: 32, height: 16, seed: 'alt-map' });
    generateTerrain(state, { oceanFraction: 0.6 });
    classifySurface(state);
    const rgba = buffer(state.altitude.length);
    altitudeMapMode.paint(state, rgba);

    // Average blue-minus-green for ocean vs land tiles.
    let oceanBias = 0;
    let oceanN = 0;
    let landBias = 0;
    let landN = 0;
    for (let i = 0; i < state.altitude.length; i++) {
      const bias = rgba[i * 4 + 2]! - rgba[i * 4 + 1]!; // blue - green
      if (state.altitude[i]! < state.seaLevel) {
        oceanBias += bias;
        oceanN++;
      } else {
        landBias += bias;
        landN++;
      }
    }
    expect(oceanBias / oceanN).toBeGreaterThan(landBias / landN);
  });

  it('writes opaque alpha for every tile', () => {
    const state = createWorldState({ width: 16, height: 8, seed: 'alpha' });
    generateTerrain(state);
    const rgba = buffer(state.altitude.length);
    altitudeMapMode.paint(state, rgba);
    for (let i = 0; i < state.altitude.length; i++) expect(rgba[i * 4 + 3]).toBe(255);
  });
});
