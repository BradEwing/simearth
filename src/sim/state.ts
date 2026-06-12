import { seedRng, type RngState } from './rng';

/**
 * The complete simulation state — the living planet as plain, serializable data.
 *
 * Per-tile fields are typed arrays in Structure-of-Arrays form: one array per
 * field, length `width * height`, indexed `y * width + x` (see `grid.ts`). This
 * layout is cache-friendly, cheap to serialize, and transferable to a Web Worker
 * without reshaping. Global (planet-wide) quantities are plain number scalars.
 *
 * Systems own the *meaning* of these fields and fill them in over later
 * milestones; this module only defines the shape and allocates it zeroed.
 */
export interface WorldState {
  // --- Identity & clock ---
  readonly width: number;
  readonly height: number;
  /** Monotonic simulation step counter. */
  tick: number;
  /** The seed the world was generated from (kept for display/regeneration). */
  readonly seed: number | string;
  /** Live PRNG state — advances as the sim draws randomness. Serializable. */
  rng: RngState;

  // --- Global scalars (planet-wide) ---
  /** Sea level as an altitude threshold; tiles below are ocean. */
  seaLevel: number;
  /** Stellar output relative to present-day Sun (1.0). Rises over deep time. */
  solarLuminosity: number;
  /** Atmospheric CO2 (abstract units; drives the greenhouse in M3). */
  co2: number;
  /** Atmospheric O2 (abstract units; produced by life). */
  o2: number;
  /** Area-weighted mean surface temperature in °C (derived each tick in M3). */
  meanTemperature: number;

  // --- Per-tile fields (length width*height) ---
  /** Geosphere: surface elevation relative to sea level (negative = below). */
  altitude: Float32Array;
  /** Geosphere: SurfaceType enum (ocean/coast/land/mountain/ice). */
  surface: Uint8Array;
  /** Atmosphere: surface temperature in °C. */
  temperature: Float32Array;
  /** Atmosphere: rainfall (abstract units). */
  rainfall: Float32Array;
  /** Atmosphere: wind vector components. */
  windU: Float32Array;
  windV: Float32Array;
  /** Hydrosphere: ocean current vector components (heat transport). */
  currentU: Float32Array;
  currentV: Float32Array;
  /** Biosphere: Biome enum per land tile. */
  biome: Uint8Array;
  /** Civilization: pollution level (feeds back into climate). */
  pollution: Float32Array;
}

/** Default planet grid size (SPEC §3.1: cylindrical wrap, 128×64). */
export const DEFAULT_WIDTH = 128;
export const DEFAULT_HEIGHT = 64;

export interface WorldOptions {
  width?: number;
  height?: number;
  seed?: number | string;
}

/**
 * Allocates a fresh, zeroed world of the given size. Scalars start at neutral
 * Earth-like placeholders; the generation and climate systems set real values.
 */
export function createWorldState(options: WorldOptions = {}): WorldState {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const seed = options.seed ?? 0;

  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error(`Invalid world size ${width}x${height}`);
  }

  const n = width * height;

  return {
    width,
    height,
    tick: 0,
    seed,
    rng: seedRng(seed),

    seaLevel: 0,
    solarLuminosity: 1,
    co2: 0,
    o2: 0,
    meanTemperature: 0,

    altitude: new Float32Array(n),
    surface: new Uint8Array(n),
    temperature: new Float32Array(n),
    rainfall: new Float32Array(n),
    windU: new Float32Array(n),
    windV: new Float32Array(n),
    currentU: new Float32Array(n),
    currentV: new Float32Array(n),
    biome: new Uint8Array(n),
    pollution: new Float32Array(n),
  };
}
