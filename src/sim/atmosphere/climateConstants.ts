/**
 * Constants for the energy-balance climate model. See `docs/CLIMATE.md` for the
 * full model and the reasoning; keep that table and these values in sync. All
 * are gameplay-tunable — they anchor present-day-ish behavior (T̄ ≈ 15 °C at
 * L = 1, CO₂ = reference), not exact Earth physics.
 */

/** Solar constant at 1 AU (W/m²). Scaled by `solarLuminosity` over time. */
export const SOLAR_CONSTANT = 1361;

/** Outgoing longwave radiation, linearized: OLR = OLR_A + OLR_B · T(°C). */
export const OLR_A = 204; // W/m² intercept
export const OLR_B = 2.17; // W/m² per °C slope

/** Poleward heat-transport coefficient: tiles relax toward the global mean. */
export const HEAT_TRANSPORT = 3.8; // W/m² per °C

/** Baseline planetary albedo, until surface/ice albedo replaces it in M3.5. */
export const PLANETARY_ALBEDO = 0.3;

/** CO₂ level at which greenhouse forcing is zero (abstract "ppm" units). */
export const CO2_REFERENCE = 280;

/** CO₂ radiative forcing coefficient: ΔF = k · ln(CO₂ / CO₂_ref), W/m². */
export const CO2_FORCING_COEF = 5.35;
