import type { System } from './simulation';
import { solarEvolutionSystem } from './atmosphere/solar';
import { temperatureSystem } from './atmosphere/temperature';
import { weatherSystem } from './atmosphere/weather';
import { carbonCycleSystem } from './atmosphere/carbon';
import { iceSystem } from './atmosphere/ice';
import { oceanHeatSystem } from './hydrosphere/oceanHeat';
import { seaLevelSystem } from './hydrosphere/seaLevel';
import { erosionSystem } from './geosphere/erosion';

/**
 * The ordered geophysics/climate systems (M3). Order is load-bearing:
 *
 *  1. solar — advance luminosity
 *  2. temperature — energy balance (sets the temperature field + global mean)
 *  3. ocean heat — advect that temperature along currents
 *  4. weather — winds & rainfall (cadenced)
 *  5. carbon — outgassing − weathering (reads the global mean)
 *  6. ice — grow/shrink ice from temperature (feeds back via albedo next tick)
 *  7. sea level — from ice budget; reclassify coastlines
 *  8. erosion — rainfall-driven, feeds back into terrain
 */
export const CLIMATE_SYSTEMS: readonly System[] = [
  solarEvolutionSystem,
  temperatureSystem,
  oceanHeatSystem,
  weatherSystem,
  carbonCycleSystem,
  iceSystem,
  seaLevelSystem,
  erosionSystem,
];
