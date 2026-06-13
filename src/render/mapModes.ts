import type { WorldState } from '@sim/state';
import { SurfaceType } from '@sim/geosphere/surface';
import { shadeSurfaceTile } from './palette';

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

/**
 * Colors the map by surface classification (ocean/coast/land/mountain/ice),
 * with subtle relief: each tile's color is shaded by its elevation relative to
 * its hemisphere's range, so deep ocean darkens and high land lightens.
 */
function paintSurface(state: WorldState, rgba: Uint8ClampedArray): void {
  const { surface, altitude, seaLevel } = state;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < altitude.length; i++) {
    const a = altitude[i]!;
    if (a < min) min = a;
    if (a > max) max = a;
  }
  const belowSpan = Math.max(1e-6, seaLevel - min);
  const aboveSpan = Math.max(1e-6, max - seaLevel);

  for (let i = 0; i < surface.length; i++) {
    const a = altitude[i]!;
    const rel = a < seaLevel ? (a - seaLevel) / belowSpan : (a - seaLevel) / aboveSpan;
    put(rgba, i, shadeSurfaceTile(surface[i] as SurfaceType, rel));
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

// Diverging temperature ramp: cold blue → temperate pale → hot red, over a
// roughly habitable display range of −40…+40 °C.
const TEMP_COLD: RGB = [40, 84, 200];
const TEMP_MILD: RGB = [232, 230, 206];
const TEMP_HOT: RGB = [206, 60, 42];

/** Colors the map by surface temperature. */
function paintTemperature(state: WorldState, rgba: Uint8ClampedArray): void {
  const { temperature } = state;
  for (let i = 0; i < temperature.length; i++) {
    const t = Math.min(1, Math.max(0, (temperature[i]! + 40) / 80));
    const c =
      t < 0.5
        ? lerpRGB(TEMP_COLD, TEMP_MILD, t * 2)
        : lerpRGB(TEMP_MILD, TEMP_HOT, (t - 0.5) * 2);
    put(rgba, i, c);
  }
}

export const surfaceMapMode: MapMode = {
  id: 'surface',
  label: 'Surface',
  paint: paintSurface,
};

export const temperatureMapMode: MapMode = {
  id: 'temperature',
  label: 'Temperature',
  paint: paintTemperature,
};

export const altitudeMapMode: MapMode = {
  id: 'altitude',
  label: 'Elevation',
  paint: paintAltitude,
};

/** All map modes available so far, in display order. */
export const MAP_MODES: readonly MapMode[] = [
  surfaceMapMode,
  altitudeMapMode,
  temperatureMapMode,
];

export { SurfaceType };
