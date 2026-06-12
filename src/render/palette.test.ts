import { describe, it, expect } from 'vitest';
import { SURFACE_PALETTE, shadeSurfaceTile } from './palette';
import { SurfaceType } from '@sim/geosphere/surface';

const luma = (c: readonly [number, number, number]): number =>
  0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

describe('shadeSurfaceTile', () => {
  it('returns the base color at rel = 0', () => {
    expect(shadeSurfaceTile(SurfaceType.Land, 0)).toEqual(
      SURFACE_PALETTE[SurfaceType.Land],
    );
  });

  it('darkens deeper ocean (negative rel)', () => {
    const shallow = shadeSurfaceTile(SurfaceType.Ocean, -0.1);
    const deep = shadeSurfaceTile(SurfaceType.Ocean, -1);
    expect(luma(deep)).toBeLessThan(luma(shallow));
  });

  it('lightens higher land (positive rel)', () => {
    const low = shadeSurfaceTile(SurfaceType.Land, 0.1);
    const high = shadeSurfaceTile(SurfaceType.Land, 1);
    expect(luma(high)).toBeGreaterThan(luma(low));
  });

  it('has a palette entry for every surface type', () => {
    for (const t of Object.values(SurfaceType)) {
      expect(SURFACE_PALETTE[t]).toBeDefined();
    }
  });
});
