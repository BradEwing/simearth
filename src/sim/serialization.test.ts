import { describe, it, expect } from 'vitest';
import { createWorldState } from './state';
import { Simulation, type System } from './simulation';
import { serializeWorld, deserializeWorld, SAVE_VERSION } from './serialization';
import type { Rng } from './rng';

// A system that scribbles deterministic data into several fields and scalars,
// so saves under test carry real, varied content.
const scribble: System = {
  name: 'scribble',
  update: (state, _dt, rng: Rng) => {
    const i = rng.int(0, state.altitude.length - 1);
    state.altitude[i] = rng.float(-1, 1);
    state.temperature[i] = rng.float(-40, 40);
    state.surface[i] = rng.int(0, 4);
    state.biome[i] = rng.int(0, 7);
    state.co2 += rng.float(0, 0.1);
    state.solarLuminosity += 0.0001;
  },
};

const runWorld = (seed: string, ticks: number): WorldStateLike => {
  const sim = new Simulation(createWorldState({ width: 16, height: 12, seed }), [
    scribble,
  ]);
  sim.run(ticks);
  return sim.state;
};
type WorldStateLike = ReturnType<typeof createWorldState>;

describe('serialization', () => {
  it('round-trips a populated world exactly', () => {
    const original = runWorld('round-trip', 200);
    const restored = deserializeWorld(serializeWorld(original));

    expect(restored.width).toBe(original.width);
    expect(restored.height).toBe(original.height);
    expect(restored.tick).toBe(original.tick);
    expect(restored.seed).toBe(original.seed);
    expect(restored.rng).toEqual(original.rng);

    expect(restored.co2).toBe(original.co2);
    expect(restored.solarLuminosity).toBe(original.solarLuminosity);
    expect(restored.meanTemperature).toBe(original.meanTemperature);

    expect(restored.altitude).toEqual(original.altitude);
    expect(restored.temperature).toEqual(original.temperature);
    expect(restored.surface).toEqual(original.surface);
    expect(restored.biome).toEqual(original.biome);
  });

  it('survives a JSON string trip (file-export shape)', () => {
    const original = runWorld('json', 50);
    const restored = deserializeWorld(
      JSON.parse(JSON.stringify(serializeWorld(original))),
    );
    expect(restored.altitude).toEqual(original.altitude);
    expect(restored.rng).toEqual(original.rng);
  });

  it('resumes the identical simulation after save/load', () => {
    // Run A: 100 ticks, save, then 100 more — record a field sum.
    const a = new Simulation(
      createWorldState({ width: 16, height: 12, seed: 'resume' }),
      [scribble],
    );
    a.run(100);
    const saved = serializeWorld(a.state);
    a.run(100);

    // Run B: load the save, run the same 100 more — must match A exactly.
    const b = new Simulation(deserializeWorld(saved), [scribble]);
    b.run(100);

    expect(b.state.tick).toBe(a.state.tick);
    expect(b.state.rng).toEqual(a.state.rng);
    expect(b.state.altitude).toEqual(a.state.altitude);
    expect(b.state.co2).toBe(a.state.co2);
  });

  it('does not alias the original arrays', () => {
    const original = runWorld('alias', 10);
    const restored = deserializeWorld(serializeWorld(original));
    restored.altitude[0] = 123.5;
    expect(original.altitude[0]).not.toBe(123.5);
  });

  it('rejects a save from a newer version', () => {
    const data = serializeWorld(createWorldState({ width: 4, height: 4 }));
    data.version = SAVE_VERSION + 1;
    expect(() => deserializeWorld(data)).toThrow(/newer than supported/);
  });

  it('ignores unknown fields and leaves new fields zeroed', () => {
    const data = serializeWorld(createWorldState({ width: 4, height: 4 }));
    data.fields['legacyGhostField'] = { type: 'Float32Array', b64: '' };
    // Should not throw; ghost field is silently skipped.
    const restored = deserializeWorld(data);
    expect(restored.altitude.every((v) => v === 0)).toBe(true);
  });
});
