import type { System } from '../simulation';
import type { WorldState } from '../state';
import { latitudeOf } from '../grid';
import { insolationFactor, areaWeight } from './insolation';
import { co2Forcing } from './greenhouse';
import { albedoAt } from './albedo';
import { SOLAR_CONSTANT, OLR_A, OLR_B, HEAT_TRANSPORT } from './climateConstants';

/**
 * Surface temperature from the energy-balance model (see `docs/CLIMATE.md`).
 *
 * Per tile, absorbed shortwave is `(S₀/4)·L·(1−albedo_i)·insolation(latᵢ)`, where
 * albedo comes from surface type and ice cover (`albedoAt`). Because heat
 * transport conserves energy, the global mean is exact and computed directly
 * from the cos-weighted mean absorbed:
 *
 * `T̄ = (absorbed̄ − A_eff) / B`,  then  `T_i = (absorbed_i − A_eff + C·T̄)/(B+C)`.
 *
 * Greenhouse forcing lowers `A_eff` (`co2Forcing`). Ice raising albedo lowers
 * absorbed → colder → more ice: the positive feedback behind ice-age hysteresis,
 * mediated through the ice system updating *after* this one.
 */
export const temperatureSystem: System = {
  name: 'temperature',
  update(state: WorldState): void {
    const { width, height, temperature } = state;
    const solarFlux = (SOLAR_CONSTANT / 4) * state.solarLuminosity * state.solarFactor;
    const aEff = OLR_A - co2Forcing(state.co2) * state.greenhouseFactor;

    // cos-weighted mean of (1 − albedo)·insolation → exact global mean temp.
    let wsum = 0;
    let wAbsorbed = 0;
    for (let y = 0; y < height; y++) {
      const lat = latitudeOf(height, y);
      const w = areaWeight(lat);
      const ins = insolationFactor(lat);
      const row = y * width;
      let rowAbsorbed = 0;
      for (let x = 0; x < width; x++) {
        rowAbsorbed += (1 - albedoAt(state, row + x)) * ins;
      }
      wsum += w * width;
      wAbsorbed += w * rowAbsorbed;
    }
    const tBar = (solarFlux * (wAbsorbed / wsum) - aEff) / OLR_B;

    for (let y = 0; y < height; y++) {
      const ins = insolationFactor(latitudeOf(height, y));
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const i = row + x;
        const absorbed = solarFlux * (1 - albedoAt(state, i)) * ins;
        temperature[i] =
          (absorbed - aEff + HEAT_TRANSPORT * tBar) / (OLR_B + HEAT_TRANSPORT);
      }
    }

    state.meanTemperature = tBar;
  },
};
