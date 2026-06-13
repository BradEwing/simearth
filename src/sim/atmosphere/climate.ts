import type { WorldState } from '../state';
import { CO2_REFERENCE } from './climateConstants';

/** Starting atmospheric CO₂ (at the forcing-neutral reference). */
export const INITIAL_CO2 = CO2_REFERENCE;
/** Starting atmospheric O₂ (abstract units; built up by life later). */
export const INITIAL_O2 = 1;

/**
 * Initializes atmospheric scalars to a habitable starting point. Call once after
 * world creation, before running climate systems — a fresh world starts with
 * CO₂ = 0, which would read as a frozen, airless planet.
 */
export function initClimate(state: WorldState): void {
  state.co2 = INITIAL_CO2;
  state.o2 = INITIAL_O2;
}
