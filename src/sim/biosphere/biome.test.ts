import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { SurfaceType } from '../geosphere/surface';
import { Biome, biomeFor, biomeSystem } from './biome';

describe('biomeFor (Whittaker)', () => {
  it('maps cold climates to tundra/taiga', () => {
    expect(biomeFor(-20, 1)).toBe(Biome.Tundra);
    expect(biomeFor(0, 1)).toBe(Biome.Taiga);
    expect(biomeFor(0, 0.1)).toBe(Biome.Tundra); // cold + dry
  });

  it('maps hot + wet to rainforest, hot + dry to desert', () => {
    expect(biomeFor(27, 3)).toBe(Biome.Rainforest);
    expect(biomeFor(27, 0.1)).toBe(Biome.Desert);
    expect(biomeFor(27, 0.8)).toBe(Biome.Savanna);
  });

  it('maps temperate climates to grassland/forest by moisture', () => {
    expect(biomeFor(10, 0.1)).toBe(Biome.Desert);
    expect(biomeFor(10, 0.8)).toBe(Biome.Grassland);
    expect(biomeFor(10, 2)).toBe(Biome.TemperateForest);
  });

  it('is wetter → more vegetated at fixed temperature', () => {
    // At a warm temperature, increasing rain moves desert → forest/rainforest.
    const dry = biomeFor(25, 0.1);
    const wet = biomeFor(25, 3);
    expect(dry).toBe(Biome.Desert);
    expect(wet).toBe(Biome.Rainforest);
  });
});

describe('biomeSystem', () => {
  it('leaves ocean and heavy ice barren, assigns biomes to land', () => {
    const state = createWorldState({ width: 3, height: 1 });
    state.surface.set([SurfaceType.Ocean, SurfaceType.Land, SurfaceType.Land]);
    state.temperature.set([20, 25, -10]);
    state.rainfall.set([0, 3, 1]);
    state.ice.set([0, 0, 0.9]); // last tile heavily iced

    new Simulation(state, [biomeSystem]).tick();
    expect(state.biome[0]).toBe(Biome.Barren); // ocean
    expect(state.biome[1]).toBe(Biome.Rainforest); // warm + wet land
    expect(state.biome[2]).toBe(Biome.Barren); // iced over
  });

  it('is deterministic', () => {
    const make = (): Uint8Array => {
      const s = createWorldState({ width: 8, height: 8 });
      for (let i = 0; i < 64; i++) {
        s.surface[i] = SurfaceType.Land;
        s.temperature[i] = (i % 40) - 10;
        s.rainfall[i] = (i % 5) * 0.5;
      }
      new Simulation(s, [biomeSystem]).tick();
      return s.biome;
    };
    expect(make()).toEqual(make());
  });
});
