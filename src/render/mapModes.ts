import type { WorldState } from '@sim/state';
import { SurfaceType } from '@sim/geosphere/surface';
import { Biome } from '@sim/biosphere/biome';
import { MAX_LIFE_STAGE } from '@sim/biosphere/life';
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

const ICE_WHITE: RGB = [238, 244, 250];

/**
 * Colors the map by surface classification (ocean/coast/land/mountain), with
 * subtle elevation relief, then blends toward white by each tile's ice cover so
 * polar caps and glaciation are visible.
 */
function paintSurface(state: WorldState, rgba: Uint8ClampedArray): void {
  const { surface, altitude, ice, seaLevel } = state;
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
    const base = shadeSurfaceTile(surface[i] as SurfaceType, rel);
    put(rgba, i, ice[i]! > 0 ? lerpRGB(base, ICE_WHITE, ice[i]!) : base);
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

// Ocean-current ramp: still/land dark → fast current bright cyan.
const CURRENT_DARK: RGB = [10, 16, 28];
const CURRENT_BRIGHT: RGB = [90, 220, 235];

/** Colors ocean tiles by current speed; land stays dark. */
function paintCurrents(state: WorldState, rgba: Uint8ClampedArray): void {
  const { currentU, currentV } = state;
  for (let i = 0; i < currentU.length; i++) {
    const speed = Math.min(1, Math.hypot(currentU[i]!, currentV[i]!));
    put(rgba, i, lerpRGB(CURRENT_DARK, CURRENT_BRIGHT, speed));
  }
}

// Rainfall ramp: arid tan → lush green → wet deep blue.
const RAIN_DRY: RGB = [196, 170, 110];
const RAIN_MOIST: RGB = [70, 150, 80];
const RAIN_WET: RGB = [34, 86, 150];

/** Colors the map by rainfall, normalized to the current maximum. */
function paintRainfall(state: WorldState, rgba: Uint8ClampedArray): void {
  const { rainfall } = state;
  let max = 1e-6;
  for (let i = 0; i < rainfall.length; i++) if (rainfall[i]! > max) max = rainfall[i]!;
  for (let i = 0; i < rainfall.length; i++) {
    const t = rainfall[i]! / max;
    const c =
      t < 0.5
        ? lerpRGB(RAIN_DRY, RAIN_MOIST, t * 2)
        : lerpRGB(RAIN_MOIST, RAIN_WET, (t - 0.5) * 2);
    put(rgba, i, c);
  }
}

// Wind ramp: westward (easterlies) teal ← calm dark → eastward (westerlies) amber.
const WIND_WEST: RGB = [60, 180, 180];
const WIND_CALM: RGB = [20, 24, 34];
const WIND_EAST: RGB = [220, 170, 70];

/** Colors the map by zonal wind: direction by hue, speed by intensity. */
function paintWind(state: WorldState, rgba: Uint8ClampedArray): void {
  const { windU } = state;
  for (let i = 0; i < windU.length; i++) {
    const u = Math.max(-1, Math.min(1, windU[i]!));
    const c =
      u >= 0 ? lerpRGB(WIND_CALM, WIND_EAST, u) : lerpRGB(WIND_CALM, WIND_WEST, -u);
    put(rgba, i, c);
  }
}

/** Biome colors, indexed by Biome value. */
const BIOME_COLORS: readonly RGB[] = [
  [28, 52, 110], // Barren (ocean/ice → deep blue)
  [200, 208, 214], // Tundra
  [64, 104, 92], // Taiga
  [156, 176, 92], // Grassland
  [150, 150, 96], // Shrubland
  [56, 120, 60], // TemperateForest
  [176, 160, 80], // Savanna
  [214, 196, 138], // Desert
  [30, 96, 54], // Rainforest
  [78, 138, 128], // Wetland
];

/** Colors the map by biome. */
function paintBiome(state: WorldState, rgba: Uint8ClampedArray): void {
  const { biome } = state;
  for (let i = 0; i < biome.length; i++) {
    put(rgba, i, BIOME_COLORS[biome[i]!] ?? BIOME_COLORS[Biome.Barren]!);
  }
}

// Life-class colors by stage (None → ProtoSapient): microbial teal up through
// vertebrate warmth to a bright sapient magenta.
const LIFE_NONE: RGB = [16, 20, 28];
const STAGE_COLORS: readonly RGB[] = [
  [16, 20, 28], // None
  [40, 120, 120], // Prokaryote
  [50, 150, 130], // Eukaryote
  [70, 170, 90], // Plant
  [150, 190, 70], // Invertebrate
  [210, 170, 60], // Vertebrate
  [220, 110, 70], // Mammal
  [225, 90, 200], // ProtoSapient
];

/** Colors the map by life: hue per class, intensity per biomass. */
function paintLife(state: WorldState, rgba: Uint8ClampedArray): void {
  const { lifeStage, biomass } = state;
  for (let i = 0; i < lifeStage.length; i++) {
    const stage = Math.min(MAX_LIFE_STAGE, lifeStage[i]!);
    const c = STAGE_COLORS[stage] ?? LIFE_NONE;
    // Fade from the dark backdrop to the class color by abundance.
    put(
      rgba,
      i,
      stage === 0 ? LIFE_NONE : lerpRGB(LIFE_NONE, c, Math.min(1, biomass[i]!)),
    );
  }
}

export const surfaceMapMode: MapMode = {
  id: 'surface',
  label: 'Surface',
  paint: paintSurface,
};

export const biomeMapMode: MapMode = {
  id: 'biome',
  label: 'Biomes',
  paint: paintBiome,
};

export const lifeMapMode: MapMode = {
  id: 'life',
  label: 'Life',
  paint: paintLife,
};

export const rainfallMapMode: MapMode = {
  id: 'rainfall',
  label: 'Rainfall',
  paint: paintRainfall,
};

export const windMapMode: MapMode = {
  id: 'wind',
  label: 'Wind',
  paint: paintWind,
};

export const currentMapMode: MapMode = {
  id: 'currents',
  label: 'Ocean Currents',
  paint: paintCurrents,
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
  rainfallMapMode,
  windMapMode,
  currentMapMode,
  biomeMapMode,
  lifeMapMode,
];

export { SurfaceType };
