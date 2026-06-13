import type { System } from './simulation';
import { CLIMATE_SYSTEMS } from './climateSystems';
import { biomeSystem } from './biosphere/biome';
import { lifeSystem } from './biosphere/life';
import { sentienceSystem } from './biosphere/sentience';

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
 * The full ordered world update: geophysics/climate then biosphere. The
 * civilization stage (M5) appends to this; the app (M6) runs it each tick.
 */
export const WORLD_SYSTEMS: readonly System[] = [
  ...CLIMATE_SYSTEMS,
  ...BIOSPHERE_SYSTEMS,
];
