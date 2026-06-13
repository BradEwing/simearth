import type { System } from '../simulation';
import type { WorldState } from '../state';
import { latitudeOf } from '../grid';
import { insolationFactor, areaWeight } from './insolation';
import {
  SOLAR_CONSTANT,
  OLR_A,
  OLR_B,
  HEAT_TRANSPORT,
  PLANETARY_ALBEDO,
} from './climateConstants';

/** cos-weighted mean of the insolation factor over all latitude rows. */
function meanInsolation(height: number): number {
  let wsum = 0;
  let wins = 0;
  for (let y = 0; y < height; y++) {
    const lat = latitudeOf(height, y);
    const w = areaWeight(lat);
    wsum += w;
    wins += w * insolationFactor(lat);
  }
  return wins / wsum;
}

/**
 * Surface temperature from the energy-balance model (see `docs/CLIMATE.md`).
 *
 * The global mean is exact (heat transport conserves energy):
 * `T̄ = (absorbed̄ − A_eff) / B`. Each tile then relaxes toward `T̄` by latitude:
 * `T_i = (absorbed_i − A_eff + C·T̄) / (B + C)`.
 *
 * Greenhouse forcing (which lowers `A_eff`) and surface/ice albedo arrive in
 * M3.2 / M3.5; this baseline uses a flat albedo and no greenhouse, giving a pure
 * latitude gradient (warm equator, cold poles).
 */
export const temperatureSystem: System = {
  name: 'temperature',
  update(state: WorldState): void {
    const { width, height, temperature, solarLuminosity } = state;

    const absorbed = (SOLAR_CONSTANT / 4) * solarLuminosity * (1 - PLANETARY_ALBEDO);
    const aEff = OLR_A; // no greenhouse yet (M3.2)

    const tBar = (absorbed * meanInsolation(height) - aEff) / OLR_B;

    for (let y = 0; y < height; y++) {
      const ins = insolationFactor(latitudeOf(height, y));
      const t =
        (absorbed * ins - aEff + HEAT_TRANSPORT * tBar) / (OLR_B + HEAT_TRANSPORT);
      const row = y * width;
      for (let x = 0; x < width; x++) temperature[row + x] = t;
    }

    state.meanTemperature = tBar;
  },
};
