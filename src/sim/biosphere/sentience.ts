import type { System } from '../simulation';
import type { WorldState } from '../state';
import { LifeClass } from './life';

/** Minimum proto-sapient cover (fraction of tiles) for sentience to advance. */
export const SENTIENCE_MIN_COVER = 0.015;
/** Progress per tick while sustained proto-sapient life is established. */
export const SENTIENCE_RATE = 0.003;
/** Progress lost per tick when proto-sapients dwindle below the threshold. */
export const SENTIENCE_DECAY = 0.002;

/** Total proto-sapient biomass as a fraction of the grid. */
function protoSapientCover(state: WorldState): number {
  const { lifeStage, biomass } = state;
  let cover = 0;
  for (let i = 0; i < lifeStage.length; i++) {
    if (lifeStage[i] === LifeClass.ProtoSapient) cover += biomass[i]!;
  }
  return cover / lifeStage.length;
}

/**
 * Sentience: while proto-sapient life is established planet-wide, accumulate
 * `sentienceProgress`; if it dwindles, regress. When progress first reaches 1,
 * a sentient species emerges — recorded in `sentienceEmergedTick` — the bridge
 * the civilization stage (M5) waits on. A mass extinction before then resets the
 * climb (but emergence, once achieved, is permanent).
 */
export const sentienceSystem: System = {
  name: 'sentience',
  update(state, dt): void {
    if (protoSapientCover(state) >= SENTIENCE_MIN_COVER) {
      state.sentienceProgress = Math.min(
        1,
        state.sentienceProgress + SENTIENCE_RATE * dt,
      );
    } else if (state.sentienceEmergedTick < 0) {
      state.sentienceProgress = Math.max(
        0,
        state.sentienceProgress - SENTIENCE_DECAY * dt,
      );
    }

    if (state.sentienceProgress >= 1 && state.sentienceEmergedTick < 0) {
      state.sentienceEmergedTick = state.tick;
    }
  },
};
