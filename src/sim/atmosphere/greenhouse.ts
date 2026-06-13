import { CO2_FORCING_COEF, CO2_REFERENCE } from './climateConstants';

/**
 * CO₂ greenhouse radiative forcing: `ΔF = k · ln(CO₂ / CO₂_ref)` in W/m².
 * Positive (warming) above the reference, negative below, zero at it. This
 * lowers the effective OLR intercept in the energy balance (`A_eff = A₀ − ΔF`),
 * so more CO₂ → warmer. Logarithmic, matching real CO₂ forcing's diminishing
 * returns per added unit.
 */
export function co2Forcing(co2: number): number {
  return CO2_FORCING_COEF * Math.log(Math.max(1e-6, co2) / CO2_REFERENCE);
}
