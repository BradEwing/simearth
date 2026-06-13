import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { SurfaceType } from '../geosphere/surface';
import { LifeClass } from './life';
import { sentienceSystem, SENTIENCE_MIN_COVER, SENTIENCE_RATE } from './sentience';

/** A world seeded with the given fraction of proto-sapient land tiles. */
function withProtoSapients(coverFraction: number): ReturnType<typeof createWorldState> {
  const state = createWorldState({ width: 20, height: 20 });
  state.surface.fill(SurfaceType.Land);
  const n = Math.round(coverFraction * state.lifeStage.length);
  for (let i = 0; i < n; i++) {
    state.lifeStage[i] = LifeClass.ProtoSapient;
    state.biomass[i] = 1;
  }
  return state;
}

describe('sentienceSystem', () => {
  it('accumulates progress while proto-sapients are established', () => {
    const state = withProtoSapients(0.1); // well above the threshold
    new Simulation(state, [sentienceSystem]).run(10);
    expect(state.sentienceProgress).toBeCloseTo(SENTIENCE_RATE * 10, 6);
  });

  it('does not advance without enough proto-sapient cover', () => {
    const state = withProtoSapients(SENTIENCE_MIN_COVER / 4);
    new Simulation(state, [sentienceSystem]).run(20);
    expect(state.sentienceProgress).toBe(0);
  });

  it('fires the emergence event when progress reaches 1', () => {
    const state = withProtoSapients(0.1);
    const sim = new Simulation(state, [sentienceSystem]);
    sim.run(400); // 400 * 0.003 = 1.2 ≥ 1
    expect(state.sentienceProgress).toBe(1);
    expect(state.sentienceEmergedTick).toBeGreaterThanOrEqual(0);
  });

  it('records the emergence tick once and keeps it permanent', () => {
    const state = withProtoSapients(0.1);
    const sim = new Simulation(state, [sentienceSystem]);
    sim.run(400);
    const emerged = state.sentienceEmergedTick;
    // Wipe out proto-sapients; emergence must persist.
    state.lifeStage.fill(LifeClass.None);
    state.biomass.fill(0);
    sim.run(50);
    expect(state.sentienceEmergedTick).toBe(emerged);
  });

  it('regresses if proto-sapients dwindle before emergence', () => {
    const state = withProtoSapients(0.1);
    const sim = new Simulation(state, [sentienceSystem]);
    sim.run(100); // build some progress
    expect(state.sentienceProgress).toBeGreaterThan(0);
    state.lifeStage.fill(LifeClass.None); // extinction
    state.biomass.fill(0);
    sim.run(50);
    expect(state.sentienceProgress).toBeLessThan(SENTIENCE_RATE * 100);
  });
});
