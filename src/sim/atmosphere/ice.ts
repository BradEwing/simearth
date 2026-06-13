import type { System } from '../simulation';
import { ICE_FREEZE_TEMP, ICE_FULL_TEMP, ICE_RELAX_RATE } from './climateConstants';

/** Equilibrium ice fraction for a temperature: 0 above freezing, 1 once frigid. */
function targetIce(temp: number): number {
  if (temp >= ICE_FREEZE_TEMP) return 0;
  if (temp <= ICE_FULL_TEMP) return 1;
  return (ICE_FREEZE_TEMP - temp) / (ICE_FREEZE_TEMP - ICE_FULL_TEMP);
}

/**
 * Cryosphere: relaxes each tile's ice cover toward the fraction implied by its
 * temperature. Runs after the temperature system, so this tick's ice (and thus
 * albedo) feeds into *next* tick's temperature — the lag that lets the
 * ice-albedo feedback build, producing polar caps, snowball states, and ice-age
 * hysteresis (multiple stable climates at the same solar input).
 */
export const iceSystem: System = {
  name: 'ice',
  update(state, dt): void {
    const { temperature, ice } = state;
    const rate = Math.min(1, ICE_RELAX_RATE * dt);
    for (let i = 0; i < ice.length; i++) {
      const target = targetIce(temperature[i]!);
      ice[i]! += (target - ice[i]!) * rate;
    }
  },
};
