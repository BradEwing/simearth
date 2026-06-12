import { describe, it, expect } from 'vitest';
import { Simulation, type System } from './simulation';
import { createWorldState } from './state';
import type { Rng } from './rng';

describe('Simulation', () => {
  it('runs systems in registration order each tick', () => {
    const log: string[] = [];
    const sys = (name: string): System => ({ name, update: () => log.push(name) });
    const sim = new Simulation(createWorldState({ width: 4, height: 4 }), [
      sys('geo'),
      sys('atmo'),
      sys('bio'),
    ]);

    sim.tick();
    expect(log).toEqual(['geo', 'atmo', 'bio']);
    sim.tick();
    expect(log).toEqual(['geo', 'atmo', 'bio', 'geo', 'atmo', 'bio']);
    expect(sim.systemOrder).toEqual(['geo', 'atmo', 'bio']);
  });

  it('advances the tick counter', () => {
    const sim = new Simulation(createWorldState({ width: 2, height: 2 }));
    expect(sim.state.tick).toBe(0);
    sim.run(10);
    expect(sim.state.tick).toBe(10);
  });

  it('passes state and dt through to systems', () => {
    let seenWidth = -1;
    let seenDt = -1;
    const probe: System = {
      name: 'probe',
      update: (state, dt) => {
        seenWidth = state.width;
        seenDt = dt;
      },
    };
    const sim = new Simulation(createWorldState({ width: 7, height: 3 }), [probe]);
    sim.tick(2.5);
    expect(seenWidth).toBe(7);
    expect(seenDt).toBe(2.5);
  });

  it('threads one rng whose draws persist into serializable state', () => {
    const draws: number[] = [];
    const roller: System = {
      name: 'roller',
      update: (_state, _dt, rng: Rng) => draws.push(rng.uint32()),
    };
    const state = createWorldState({ seed: 'engine' });
    const before = { ...state.rng };
    const sim = new Simulation(state, [roller]);
    sim.run(3);

    // Three distinct draws, and state.rng moved (engine mutates it in place).
    expect(new Set(draws).size).toBe(3);
    expect(state.rng).not.toEqual(before);
  });

  it('is deterministic: same seed + systems → identical rng stream', () => {
    const make = (sink: number[]) =>
      new Simulation(createWorldState({ seed: 99 }), [
        { name: 'r', update: (_s, _d, rng) => sink.push(rng.uint32()) },
      ]);
    const a: number[] = [];
    const b: number[] = [];
    make(a).run(20);
    make(b).run(20);
    expect(a).toEqual(b);
    expect(a).toHaveLength(20);
  });
});
