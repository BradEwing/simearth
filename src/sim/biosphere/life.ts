import type { System } from '../simulation';
import type { WorldState } from '../state';
import { forEachNeighbor8 } from '../grid';
import { SurfaceType } from '../geosphere/surface';

/**
 * Graded life classes — a simplified evolutionary ladder. Each tile tracks its
 * most-advanced class (`lifeStage`) and total cover (`biomass`). Life arises in
 * the oceans, spreads to suitable neighbors, competes (advanced outcompetes
 * primitive), declines outside tolerance, and occasionally evolves upward —
 * climbing toward the proto-sapient class that enables sentience (M4.5).
 */
export const LifeClass = {
  None: 0,
  Prokaryote: 1,
  Eukaryote: 2,
  Plant: 3,
  Invertebrate: 4,
  Vertebrate: 5,
  Mammal: 6,
  ProtoSapient: 7,
} as const;
export type LifeClass = (typeof LifeClass)[keyof typeof LifeClass];

export const MAX_LIFE_STAGE = LifeClass.ProtoSapient;

interface ClassDef {
  minTemp: number;
  maxTemp: number;
  ocean: boolean;
  land: boolean;
}

/** Temperature tolerance and habitat per class (index = LifeClass value). */
const CLASS_DEFS: readonly (ClassDef | null)[] = [
  null, // None
  { minTemp: -15, maxTemp: 90, ocean: true, land: true }, // Prokaryote — hardy
  { minTemp: -8, maxTemp: 55, ocean: true, land: true }, // Eukaryote
  { minTemp: -2, maxTemp: 48, ocean: true, land: true }, // Plant
  { minTemp: -2, maxTemp: 42, ocean: true, land: true }, // Invertebrate
  { minTemp: -8, maxTemp: 40, ocean: true, land: true }, // Vertebrate
  { minTemp: -25, maxTemp: 38, ocean: true, land: true }, // Mammal — wide range
  { minTemp: -12, maxTemp: 36, ocean: false, land: true }, // ProtoSapient — land only
];

/** Land carrying-capacity by biome (index = Biome value). Oceans use a flat base. */
const LAND_PRODUCTIVITY: readonly number[] = [
  0.05, // Barren
  0.2, // Tundra
  0.5, // Taiga
  0.5, // Grassland
  0.4, // Shrubland
  0.8, // TemperateForest
  0.5, // Savanna
  0.1, // Desert
  1.0, // Rainforest
  0.9, // Wetland
];

const TEMP_EDGE = 5; // °C ramp at the tolerance limits
const OCEAN_PRODUCTIVITY = 0.85;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Habitability of tile `i` for a given life class, in [0, 1]: the product of
 * temperature tolerance, habitat match (ocean vs land), and resource
 * availability (biome productivity, suppressed by ice). 0 means uninhabitable.
 */
export function suitability(state: WorldState, i: number, stage: number): number {
  const def = CLASS_DEFS[stage];
  if (!def) return 0;
  const t = state.temperature[i]!;
  const tempSuit = clamp01(
    Math.min((t - def.minTemp) / TEMP_EDGE, (def.maxTemp - t) / TEMP_EDGE, 1),
  );
  if (tempSuit <= 0) return 0;

  const ocean = state.surface[i] === SurfaceType.Ocean;
  if (ocean ? !def.ocean : !def.land) return 0;

  const resource = ocean
    ? OCEAN_PRODUCTIVITY
    : (LAND_PRODUCTIVITY[state.biome[i]!] ?? 0.05) * (1 - state.ice[i]!);
  return tempSuit * resource;
}

// Dynamics tuning.
const GROWTH = 0.15;
const DECLINE = 0.1;
const SEED = 0.05;
const MIN_BIOMASS = 0.01;
const DEATH_SUIT = 0.05;
const COLONIZE_SUIT = 0.12;
const SPREAD_MIN = 0.1;
const EVOLVE_BIOMASS = 0.55;
const EVOLVE_SUIT = 0.2;
const EVOLVE_PROB = 0.02;
const ABIOGENESIS_PROB = 0.0008;
const ABIOGENESIS_SUIT = 0.3;

/**
 * Advances the biosphere one tick. Uses double buffering (reads the old state,
 * writes a new one) so the result is independent of tile iteration order and
 * fully deterministic. Per tile, in order: logistic growth toward carrying
 * capacity (or decline/death when unsuitable); colonization and competition from
 * neighbors; random upward evolution where well-established; and spontaneous
 * abiogenesis of prokaryotes in hospitable empty seas.
 */
export const lifeSystem: System = {
  name: 'life',
  update(state, dt, rng): void {
    const { width, height, surface, biomass, lifeStage } = state;
    const nextB = Float32Array.from(biomass);
    const nextS = Uint8Array.from(lifeStage);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        let b = biomass[i]!;
        let s = lifeStage[i]!;

        // 1. Growth or decline of resident life.
        if (b > 0) {
          const k = suitability(state, i, s);
          if (k < DEATH_SUIT) {
            b -= DECLINE * dt;
            if (b <= MIN_BIOMASS) {
              b = 0;
              s = LifeClass.None;
            }
          } else {
            b = clamp01(b + GROWTH * dt * b * (1 - b / k));
          }
        }

        // 2. Colonization / competition from neighbors (read old buffers).
        let bestStage = 0;
        forEachNeighbor8(width, height, x, y, (_nx, _ny, j) => {
          const ns = lifeStage[j]!;
          if (
            biomass[j]! > SPREAD_MIN &&
            ns > bestStage &&
            suitability(state, i, ns) > COLONIZE_SUIT
          ) {
            bestStage = ns;
          }
        });
        if (bestStage > 0) {
          if (b <= MIN_BIOMASS) {
            s = bestStage;
            b = Math.max(b, SEED);
          } else if (bestStage > s) {
            s = bestStage; // advanced life takes over the tile
          }
        }

        // 3. Evolution: established life occasionally advances a class.
        if (b > EVOLVE_BIOMASS && s > 0 && s < MAX_LIFE_STAGE) {
          if (
            suitability(state, i, s + 1) > EVOLVE_SUIT &&
            rng.next() < EVOLVE_PROB * dt
          ) {
            s += 1;
          }
        }

        // 4. Abiogenesis: life sparks in hospitable empty seas.
        if (b <= MIN_BIOMASS && surface[i] === SurfaceType.Ocean) {
          if (
            suitability(state, i, LifeClass.Prokaryote) > ABIOGENESIS_SUIT &&
            rng.next() < ABIOGENESIS_PROB * dt
          ) {
            s = LifeClass.Prokaryote;
            b = SEED;
          }
        }

        nextB[i] = b;
        nextS[i] = s;
      }
    }

    biomass.set(nextB);
    lifeStage.set(nextS);
  },
};
