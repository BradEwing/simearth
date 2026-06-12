import type { RGB } from './mapModes';
import { SurfaceType } from '@sim/geosphere/surface';

/**
 * Pixel-art surface palette, indexed by {@link SurfaceType}. Tuned as a cohesive
 * set: cool deep ocean, brighter coastal shelf, verdant land, muted rock, and
 * near-white ice. Used by the surface map mode and (later) overlays.
 */
export const SURFACE_PALETTE: readonly RGB[] = [
  [26, 51, 105], // Ocean
  [70, 128, 170], // Coast
  [82, 138, 70], // Land
  [124, 112, 98], // Mountain
  [236, 242, 250], // Ice
];

/**
 * Shades a surface color by relative elevation to give the flat-colored map
 * subtle relief: `rel` is the tile's elevation relative to its hemisphere's
 * range — negative below sea level (darkens with depth), positive above
 * (lightens with height). `rel = 0` returns the unmodified base color.
 */
export function shadeSurfaceTile(type: SurfaceType, rel: number): RGB {
  const base = SURFACE_PALETTE[type] ?? SURFACE_PALETTE[SurfaceType.Ocean]!;
  const factor = rel < 0 ? 1 + rel * 0.35 : 1 + rel * 0.22;
  return [base[0] * factor, base[1] * factor, base[2] * factor];
}
