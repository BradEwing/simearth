import type { System } from '../simulation';
import type { WorldState } from '../state';
import { SurfaceType } from '../geosphere/surface';
import {
  WEATHERING_T_REF,
  WEATHERING_T_SCALE,
  LAND_REFERENCE,
  CO2_FLOOR,
} from './climateConstants';

/**
 * Volcanic CO₂ outgassing per tick — the carbon cycle's baseline source. Roughly
 * constant (the solid Earth degasses regardless of climate). The weathering sink
 * is calibrated so it equals this at the reference temperature and land fraction,
 * which pins the equilibrium climate.
 *
 * Its magnitude sets only the carbon cycle's *speed* (source and weathering base
 * scale together, so the equilibrium T/CO₂ are unchanged). It is chosen so CO₂
 * adjusts faster than solar luminosity drifts (M3.3), letting the thermostat
 * track a brightening Sun.
 */
export const VOLCANIC_OUTGASSING = 2.0;

/**
 * Fraction of the planet that is exposed, weatherable rock: land (not ocean),
 * weighted by how ice-free it is. Ice-covered land doesn't weather, so a
 * glaciated planet's CO₂ sink shuts down and outgassing rebuilds CO₂ — the
 * mechanism that escapes a snowball and underpins ice-age hysteresis.
 */
function weatherableFraction(state: WorldState): number {
  const { surface, ice } = state;
  let land = 0;
  for (let i = 0; i < surface.length; i++) {
    const s = surface[i];
    if (s === SurfaceType.Land || s === SurfaceType.Coast || s === SurfaceType.Mountain) {
      land += 1 - ice[i]!;
    }
  }
  return land / surface.length;
}

/**
 * How much life enhances weathering: roots, soil acids, and litter accelerate
 * silicate weathering several-fold. Scales with mean biomass over weatherable
 * land — a lush planet draws CO₂ down harder than a barren one.
 */
export const BIOTIC_WEATHERING_BOOST = 1.5;

/** Mean biomass over ice-free land (the biotic weathering multiplier's input). */
function meanLandBiomass(state: WorldState): number {
  const { surface, ice, biomass } = state;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < surface.length; i++) {
    const s = surface[i];
    if (s === SurfaceType.Land || s === SurfaceType.Coast || s === SurfaceType.Mountain) {
      sum += biomass[i]! * (1 - ice[i]!);
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

/**
 * Carbonate–silicate weathering rate (CO₂ removed per tick). Rises with
 * temperature (Arrhenius-like), with exposed land area, and with life cover
 * (biotic enhancement). Calibrated so that at `WEATHERING_T_REF` on a bare
 * `LAND_REFERENCE` planet it equals {@link VOLCANIC_OUTGASSING} — pinning the
 * abiotic equilibrium temperature to the reference. Vegetation pushes the
 * equilibrium cooler by drawing CO₂ down faster.
 */
export function silicateWeathering(state: WorldState): number {
  const land = weatherableFraction(state);
  const tempFactor = Math.exp(
    (state.meanTemperature - WEATHERING_T_REF) / WEATHERING_T_SCALE,
  );
  const biotic = 1 + BIOTIC_WEATHERING_BOOST * meanLandBiomass(state);
  return VOLCANIC_OUTGASSING * (land / LAND_REFERENCE) * tempFactor * biotic;
}

/**
 * The carbon cycle: CO₂ evolves as outgassing (source) minus silicate weathering
 * (temperature-dependent sink). This is the Gaia thermostat: warmer → faster
 * weathering → CO₂ drawdown → cooling, balancing ~constant outgassing so the
 * equilibrium temperature is pinned regardless of solar output. Respiration,
 * photosynthesis, and pollution add further terms in M4/M5.
 */
export const carbonCycleSystem: System = {
  name: 'carbon-cycle',
  update(state, dt): void {
    const next = state.co2 + (VOLCANIC_OUTGASSING - silicateWeathering(state)) * dt;
    state.co2 = Math.max(CO2_FLOOR, next);
  },
};
