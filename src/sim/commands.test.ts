import { describe, it, expect } from 'vitest';
import { createWorldState } from './state';
import { placeLife } from './commands';
import { LifeClass } from './biosphere/life';

describe('placeLife', () => {
  it('seeds life of the given class and biomass at a tile', () => {
    const state = createWorldState({ width: 10, height: 10 });
    placeLife(state, 3, 4, LifeClass.Plant, 0.7);
    const i = 4 * 10 + 3;
    expect(state.lifeStage[i]).toBe(LifeClass.Plant);
    expect(state.biomass[i]).toBeCloseTo(0.7, 6);
  });

  it('defaults to prokaryotes at half cover', () => {
    const state = createWorldState({ width: 4, height: 4 });
    placeLife(state, 1, 1);
    const i = 1 * 4 + 1;
    expect(state.lifeStage[i]).toBe(LifeClass.Prokaryote);
    expect(state.biomass[i]).toBeCloseTo(0.5, 6);
  });

  it('wraps longitude and clamps latitude for off-grid coordinates', () => {
    const state = createWorldState({ width: 8, height: 4 });
    placeLife(state, -1, 99, LifeClass.Vertebrate); // x wraps to 7, y clamps to 3
    const i = 3 * 8 + 7;
    expect(state.lifeStage[i]).toBe(LifeClass.Vertebrate);
  });
});
