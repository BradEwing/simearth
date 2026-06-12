import type { WorldState } from '@sim/state';
import { SurfaceType } from '@sim/geosphere/surface';

/** An RGB triple in 0–255. */
export type RGB = readonly [number, number, number];

/**
 * A map mode projects the simulation state to one color per tile. Each mode
 * fills an RGBA byte buffer (length `width*height*4`); the renderer blits that
 * buffer to the canvas. Modes are pure reads of state — never mutations.
 */
export interface MapMode {
  readonly id: string;
  readonly label: string;
  paint(state: WorldState, rgba: Uint8ClampedArray): void;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpRGB = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

const put = (rgba: Uint8ClampedArray, i: number, c: RGB): void => {
  const o = i * 4;
  rgba[o] = c[0];
  rgba[o + 1] = c[1];
  rgba[o + 2] = c[2];
  rgba[o + 3] = 255;
};

/** Surface-type colors, indexed by SurfaceType value. */
export const SURFACE_COLORS: readonly RGB[] = [
  [28, 52, 110], // Ocean
  [74, 130, 175], // Coast
  [86, 140, 74], // Land
  [120, 110, 96], // Mountain
  [232, 240, 248], // Ice
];

/** Colors the map by surface classification (ocean/coast/land/mountain/ice). */
function paintSurface(state: WorldState, rgba: Uint8ClampedArray): void {
  const { surface } = state;
  for (let i = 0; i < surface.length; i++) {
    put(rgba, i, SURFACE_COLORS[surface[i]!] ?? SURFACE_COLORS[0]!);
  }
}

// Hypsometric ramps: ocean depth (deep→shallow) and land height (low→peak).
const OCEAN_DEEP: RGB = [12, 26, 64];
const OCEAN_SHALLOW: RGB = [64, 120, 170];
const LAND_LOW: RGB = [70, 120, 64];
const LAND_MID: RGB = [150, 140, 80];
const LAND_HIGH: RGB = [120, 96, 72];
const LAND_PEAK: RGB = [245, 245, 250];

/** Colors the map by elevation, split at sea level into ocean and land ramps. */
function paintAltitude(state: WorldState, rgba: Uint8ClampedArray): void {
  const { altitude, seaLevel } = state;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < altitude.length; i++) {
    const a = altitude[i]!;
    if (a < min) min = a;
    if (a > max) max = a;
  }
  const belowSpan = Math.max(1e-6, seaLevel - min);
  const aboveSpan = Math.max(1e-6, max - seaLevel);

  for (let i = 0; i < altitude.length; i++) {
    const a = altitude[i]!;
    let c: RGB;
    if (a < seaLevel) {
      c = lerpRGB(OCEAN_DEEP, OCEAN_SHALLOW, (a - min) / belowSpan);
    } else {
      const t = (a - seaLevel) / aboveSpan; // 0..1 over land
      c =
        t < 0.5
          ? lerpRGB(LAND_LOW, LAND_MID, t / 0.5)
          : t < 0.85
            ? lerpRGB(LAND_MID, LAND_HIGH, (t - 0.5) / 0.35)
            : lerpRGB(LAND_HIGH, LAND_PEAK, (t - 0.85) / 0.15);
    }
    put(rgba, i, c);
  }
}

export const surfaceMapMode: MapMode = {
  id: 'surface',
  label: 'Surface',
  paint: paintSurface,
};

export const altitudeMapMode: MapMode = {
  id: 'altitude',
  label: 'Elevation',
  paint: paintAltitude,
};

/** All map modes available so far, in display order. */
export const MAP_MODES: readonly MapMode[] = [surfaceMapMode, altitudeMapMode];

export { SurfaceType };
