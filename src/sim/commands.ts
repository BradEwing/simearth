import type { WorldState } from './state';
import { wrapX, clampY } from './grid';
import { LifeClass } from './biosphere/life';

/**
 * Player/UI commands that mutate simulation state through an explicit interface
 * (the UI never writes state fields directly). Commands take the world and
 * parameters, apply a one-shot change, and let the systems take it from there.
 * The tool framework in M6 dispatches these.
 */

/**
 * Seeds life of `stage` at tile (x, y) with the given biomass. Coordinates wrap
 * in longitude and clamp in latitude. The placement is unconditional — if the
 * spot is inhospitable the life system will let it die out naturally.
 */
export function placeLife(
  state: WorldState,
  x: number,
  y: number,
  stage: LifeClass = LifeClass.Prokaryote,
  biomass = 0.5,
): void {
  const i = clampY(state.height, y) * state.width + wrapX(state.width, x);
  state.lifeStage[i] = stage;
  state.biomass[i] = biomass;
}
