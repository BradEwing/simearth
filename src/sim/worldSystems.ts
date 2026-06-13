import type { System } from './simulation';
import { CLIMATE_SYSTEMS } from './climateSystems';
import { biomeSystem } from './biosphere/biome';
import { lifeSystem } from './biosphere/life';
import { sentienceSystem } from './biosphere/sentience';
import { civilizationSystem } from './civilization/civilization';

/**
 * Biosphere systems (M4), ordered after climate: biomes (need temperature +
 * rainfall) → life (needs biomes + temperature) → sentience (needs life).
 */
export const BIOSPHERE_SYSTEMS: readonly System[] = [
  biomeSystem,
  lifeSystem,
  sentienceSystem,
];

/**
 * The full ordered world update: climate → biosphere → civilization (which the
 * sentience system gates on). The app (M6) runs this list each tick.
 */
export const WORLD_SYSTEMS: readonly System[] = [
  ...CLIMATE_SYSTEMS,
  ...BIOSPHERE_SYSTEMS,
  civilizationSystem,
];
