import type { System } from '../simulation';
import type { WorldState } from '../state';
import { forEachNeighbor8 } from '../grid';
import { SurfaceType } from '../geosphere/surface';

/** Top tech level — the Exodus-capable era. */
export const MAX_TECH = 6;
/** Each tech level raises the population ceiling by this fraction. */
export const TECH_POP_BONUS = 0.35;

/** Civilization food value by biome (index = Biome value): farmland thrives. */
const CIV_FOOD: readonly number[] = [
  0, // Barren
  0.1, // Tundra
  0.4, // Taiga
  1.0, // Grassland
  0.5, // Shrubland
  0.9, // TemperateForest
  0.8, // Savanna
  0.1, // Desert
  0.6, // Rainforest
  0.7, // Wetland
];

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/**
 * How habitable tile `i` is for settlement, in [0, 1]: comfortable temperature ×
 * food value of the biome. Ocean and heavily-iced tiles are 0.
 */
export function civHabitability(state: WorldState, i: number): number {
  if (state.surface[i] === SurfaceType.Ocean) return 0;
  if (state.ice[i]! > 0.4) return 0;
  const t = state.temperature[i]!;
  const comfort = clamp(Math.min((t + 10) / 8, (42 - t) / 8, 1), 0, 1);
  if (comfort <= 0) return 0;
  return comfort * (CIV_FOOD[state.biome[i]!] ?? 0);
}

/** Population ceiling for a tile, raised by the global tech level. */
export function populationCeiling(state: WorldState, i: number): number {
  return civHabitability(state, i) * (1 + state.techLevel * TECH_POP_BONUS);
}

/** Total settlement population across the planet. */
export function totalPopulation(state: WorldState): number {
  let sum = 0;
  for (let i = 0; i < state.population.length; i++) sum += state.population[i]!;
  return sum;
}

// Dynamics tuning.
const GROWTH = 0.08;
const DECLINE = 0.05;
const MIN_POP = 0.005;
const SEED_COLONY = 0.05;
const DEATH_HAB = 0.02;
const COLONIZE_HAB = 0.06;
const SPREAD_MIN = 0.08;

/**
 * The civilization stage. Inactive until a sentient species emerges
 * (`sentienceEmergedTick`); then it founds a first settlement at the most
 * habitable land and, thereafter, grows population logistically toward each
 * tile's (tech-raised) ceiling and spreads to habitable neighbors. Population
 * declines and vanishes where land becomes inhospitable. Double-buffered for
 * order-independent determinism. Tech progression, pollution, and the Exodus
 * win build on this in M5.2–M5.5.
 */
export const civilizationSystem: System = {
  name: 'civilization',
  update(state, dt): void {
    if (state.sentienceEmergedTick < 0) return;

    const { width, height, population } = state;

    // Founding: seed the first settlement when none exists yet.
    if (totalPopulation(state) < 1e-6) {
      let best = -1;
      let bestH = 0;
      for (let i = 0; i < population.length; i++) {
        const h = civHabitability(state, i);
        if (h > bestH) {
          bestH = h;
          best = i;
        }
      }
      if (best >= 0) population[best] = 0.1;
      return;
    }

    const next = Float32Array.from(population);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const k = populationCeiling(state, i);
        let p = population[i]!;

        if (p > 0) {
          if (k < DEATH_HAB) {
            p -= DECLINE * dt;
            if (p < MIN_POP) p = 0;
          } else {
            p = clamp(p + GROWTH * dt * p * (1 - p / k), 0, k * 1.1);
          }
        }

        if (k > COLONIZE_HAB && p < SEED_COLONY) {
          let neighborPopulated = false;
          forEachNeighbor8(width, height, x, y, (_nx, _ny, j) => {
            if (population[j]! > SPREAD_MIN) neighborPopulated = true;
          });
          if (neighborPopulated) p = SEED_COLONY;
        }

        next[i] = p;
      }
    }
    population.set(next);
  },
};
