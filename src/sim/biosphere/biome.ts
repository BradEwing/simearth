import type { System } from '../simulation';
import { SurfaceType } from '../geosphere/surface';

/**
 * Biome per land tile, derived from temperature × rainfall (a Whittaker
 * diagram). A const object + union (not a TS enum) keeps the numeric values
 * explicit for the `biome` Uint8 field. `Barren` covers ocean and ice (no biome).
 */
export const Biome = {
  Barren: 0,
  Tundra: 1,
  Taiga: 2, // boreal forest
  Grassland: 3,
  Shrubland: 4,
  TemperateForest: 5,
  Savanna: 6,
  Desert: 7,
  Rainforest: 8,
  Wetland: 9,
} as const;
export type Biome = (typeof Biome)[keyof typeof Biome];

/**
 * Effective planetary albedo of each biome (vegetation, cloud-inclusive),
 * indexed by Biome. Dark forests/rainforest absorb (warm the surface); bright
 * deserts and tundra reflect (cool it) — the vegetation-albedo feedback that
 * lets the biosphere nudge climate (Daisyworld-style). Applied in `albedoAt`
 * scaled by a tile's biomass.
 */
export const BIOME_ALBEDO: readonly number[] = [
  0.3, // Barren
  0.35, // Tundra
  0.18, // Taiga
  0.26, // Grassland
  0.28, // Shrubland
  0.16, // TemperateForest
  0.27, // Savanna
  0.37, // Desert
  0.14, // Rainforest
  0.18, // Wetland
];

// Rainfall band thresholds (abstract units matching the weather model output).
const ARID = 0.25;
const SEMIARID = 0.6;
const MOIST = 1.2;
const WET = 2.0;

/**
 * Whittaker classification: maps a tile's temperature (°C) and rainfall to a
 * biome. Cold favors tundra/taiga; warm+wet favors forests and rainforest;
 * dry-at-any-temperature favors desert/grassland/savanna.
 */
export function biomeFor(temp: number, rain: number): Biome {
  if (temp < -5) return Biome.Tundra;
  if (temp < 3) return rain < SEMIARID ? Biome.Tundra : Biome.Taiga;
  if (temp < 13) {
    if (rain < ARID) return Biome.Desert;
    if (rain < MOIST) return Biome.Grassland;
    return Biome.TemperateForest;
  }
  if (temp < 22) {
    if (rain < ARID) return Biome.Desert;
    if (rain < SEMIARID) return Biome.Shrubland;
    if (rain < MOIST) return Biome.Grassland;
    if (rain < WET) return Biome.TemperateForest;
    return Biome.Wetland;
  }
  // Hot
  if (rain < ARID) return Biome.Desert;
  if (rain < MOIST) return Biome.Savanna;
  if (rain < WET) return Biome.TemperateForest;
  return Biome.Rainforest;
}

/**
 * Assigns a biome to every tile from the current temperature and rainfall.
 * Ocean and heavily ice-covered tiles are Barren; other land gets a Whittaker
 * biome. Cheap per-tile lookup, run each tick so biomes track the climate.
 */
export const biomeSystem: System = {
  name: 'biome',
  update(state): void {
    const { surface, temperature, rainfall, ice, biome } = state;
    for (let i = 0; i < biome.length; i++) {
      if (surface[i] === SurfaceType.Ocean || ice[i]! > 0.6) {
        biome[i] = Biome.Barren;
      } else {
        biome[i] = biomeFor(temperature[i]!, rainfall[i]!);
      }
    }
  },
};
