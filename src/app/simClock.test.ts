import { describe, it, expect } from 'vitest';
import { SimClock, MAX_STEPS_PER_ADVANCE } from './simClock';

describe('SimClock', () => {
  it('runs no ticks when paused', () => {
    const clock = new SimClock(0);
    expect(clock.paused).toBe(true);
    expect(clock.advance(1000)).toBe(0);
  });

  it('runs ticks at the configured rate (below the spiral cap)', () => {
    const clock = new SimClock(25); // 25 ticks/sec
    expect(clock.advance(280)).toBe(7); // 280ms × 25/s = 7
    expect(clock.advance(40)).toBe(1); // 40ms × 25/s = 1
  });

  it('carries the fractional remainder between calls', () => {
    const clock = new SimClock(10); // 10/sec → 1 tick per 100ms
    expect(clock.advance(60)).toBe(0); // 0.6 accumulated
    expect(clock.advance(60)).toBe(1); // 1.2 → 1 tick, 0.2 carried
    expect(clock.advance(60)).toBe(0); // 0.8
    expect(clock.advance(60)).toBe(1); // 1.4 → 1
  });

  it('caps ticks per advance to avoid a spiral of death', () => {
    const clock = new SimClock(100);
    expect(clock.advance(100_000)).toBe(MAX_STEPS_PER_ADVANCE);
  });

  it('resets the accumulator when paused', () => {
    const clock = new SimClock(10);
    clock.advance(90); // 0.9 accumulated
    clock.setSpeed(0);
    clock.setSpeed(10);
    expect(clock.advance(90)).toBe(0); // accumulator was cleared, only 0.9 again
  });
});
