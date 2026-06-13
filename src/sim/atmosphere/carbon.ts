import type { System } from '../simulation';

/**
 * Volcanic CO₂ outgassing per tick — the carbon cycle's baseline source. Roughly
 * constant (the solid Earth degasses regardless of climate). Tuned together with
 * the weathering sink (M3.4) so their balance pins a habitable equilibrium.
 */
export const VOLCANIC_OUTGASSING = 0.5;

/**
 * The carbon cycle: evolves atmospheric CO₂ from its sources and sinks.
 *
 * Sources (here): volcanic outgassing. Respiration and pollution add later
 * (M4/M5). Sink: temperature-dependent silicate weathering (M3.4) — the
 * negative feedback that, balanced against ~constant outgassing, produces the
 * Gaia thermostat. With only a source, CO₂ rises monotonically; that's expected
 * until the weathering sink closes the loop.
 */
export const carbonCycleSystem: System = {
  name: 'carbon-cycle',
  update(state, dt): void {
    state.co2 += VOLCANIC_OUTGASSING * dt;
    if (state.co2 < 0) state.co2 = 0;
  },
};
