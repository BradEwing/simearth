/** Selectable simulation speeds (ticks per second). Pause = 0. */
export const SPEED_LEVELS = [
  { id: 'paused', label: '❚❚', title: 'Pause', ticksPerSecond: 0 },
  { id: 'slow', label: '▶', title: 'Slow', ticksPerSecond: 5 },
  { id: 'normal', label: '▶▶', title: 'Normal', ticksPerSecond: 25 },
  { id: 'fast', label: '▶▶▶', title: 'Fast', ticksPerSecond: 100 },
] as const;

export type SpeedId = (typeof SPEED_LEVELS)[number]['id'];

/** Cap on ticks run per advance, so a long pause (backgrounded tab) can't spiral. */
export const MAX_STEPS_PER_ADVANCE = 8;

/**
 * Converts real elapsed time into a whole number of simulation ticks at the
 * current speed, carrying the fractional remainder between calls so the average
 * rate stays accurate. This decouples the simulation's tick rate from the
 * display refresh rate — the render loop draws every frame; the sim advances
 * only as many ticks as the chosen speed dictates. Pure and testable.
 */
export class SimClock {
  private accumulator = 0;
  ticksPerSecond: number;

  constructor(ticksPerSecond: number = SPEED_LEVELS[2].ticksPerSecond) {
    this.ticksPerSecond = ticksPerSecond;
  }

  setSpeed(ticksPerSecond: number): void {
    this.ticksPerSecond = ticksPerSecond;
    if (ticksPerSecond <= 0) this.accumulator = 0;
  }

  get paused(): boolean {
    return this.ticksPerSecond <= 0;
  }

  /** Returns how many sim ticks to run for `dtMs` of elapsed real time. */
  advance(dtMs: number): number {
    if (this.ticksPerSecond <= 0) return 0;
    this.accumulator += (dtMs / 1000) * this.ticksPerSecond;
    let steps = Math.floor(this.accumulator);
    this.accumulator -= steps;
    if (steps > MAX_STEPS_PER_ADVANCE) {
      steps = MAX_STEPS_PER_ADVANCE;
      this.accumulator = 0;
    }
    return steps;
  }
}
