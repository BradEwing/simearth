import type { WorldState } from './state';
import { restoreRng, type Rng } from './rng';

/**
 * A simulation system: one slice of planetary behavior (geosphere, atmosphere,
 * biosphere, …). Systems mutate shared {@link WorldState} fields and communicate
 * only through that state — never with each other or with render/UI directly.
 *
 * `dt` is the time-step multiplier (1.0 in normal play; speed control changes
 * how *often* the engine ticks, not `dt`, so semantics stay deterministic).
 */
export interface System {
  readonly name: string;
  update(state: WorldState, dt: number, rng: Rng): void;
}

/**
 * The simulation engine. Owns a {@link WorldState} and an ordered list of
 * systems, and advances the world one tick at a time. The engine is *not* part
 * of the serializable state — only `state` is saved/loaded.
 *
 * The engine wraps `state.rng` in a live generator: because `restoreRng` mutates
 * the same plain object it was handed, every random draw updates `state.rng` in
 * place, so a serialized snapshot always reflects the current PRNG position.
 */
export class Simulation {
  readonly state: WorldState;
  private readonly systems: System[];
  private readonly rng: Rng;

  constructor(state: WorldState, systems: readonly System[] = []) {
    this.state = state;
    this.systems = [...systems];
    this.rng = restoreRng(state.rng);
  }

  /** Systems in execution order. */
  get systemOrder(): readonly string[] {
    return this.systems.map((s) => s.name);
  }

  /** Advances the world by one tick: runs every system in order, then bumps the clock. */
  tick(dt = 1): void {
    for (const system of this.systems) {
      system.update(this.state, dt, this.rng);
    }
    this.state.tick++;
  }

  /** Advances the world by `count` ticks. */
  run(count: number, dt = 1): void {
    for (let i = 0; i < count; i++) this.tick(dt);
  }
}
