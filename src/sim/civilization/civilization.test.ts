import { describe, it, expect } from 'vitest';
import { createWorldState } from '../state';
import { Simulation } from '../simulation';
import { SurfaceType } from '../geosphere/surface';
import { Biome } from '../biosphere/biome';
import { civilizationSystem, civHabitability, totalPopulation } from './civilization';

/** A temperate grassland continent ready to be settled. */
function continent(emerged: boolean): ReturnType<typeof createWorldState> {
  const state = createWorldState({ width: 16, height: 16 });
  state.surface.fill(SurfaceType.Land);
  state.biome.fill(Biome.Grassland);
  state.temperature.fill(18); // comfortable
  if (emerged) state.sentienceEmergedTick = 0;
  return state;
}

describe('civHabitability', () => {
  it('is zero on ocean and ice, positive on temperate farmland', () => {
    const state = continent(false);
    expect(civHabitability(state, 0)).toBeGreaterThan(0);
    state.surface[1] = SurfaceType.Ocean;
    expect(civHabitability(state, 1)).toBe(0);
    state.ice[2] = 0.9;
    expect(civHabitability(state, 2)).toBe(0);
  });

  it('is zero where temperature is extreme', () => {
    const state = continent(false);
    state.temperature[5] = 80;
    expect(civHabitability(state, 5)).toBe(0);
  });
});

describe('civilizationSystem', () => {
  it('does nothing until a sentient species has emerged', () => {
    const state = continent(false);
    new Simulation(state, [civilizationSystem]).run(50);
    expect(totalPopulation(state)).toBe(0);
  });

  it('founds a first settlement once sentience has emerged', () => {
    const state = continent(true);
    new Simulation(state, [civilizationSystem]).tick();
    expect(totalPopulation(state)).toBeGreaterThan(0);
  });

  it('grows and spreads population across habitable land', () => {
    const state = continent(true);
    const sim = new Simulation(state, [civilizationSystem]);
    sim.run(5);
    const early = totalPopulation(state);
    let earlyOccupied = 0;
    for (const p of state.population) if (p > 0.01) earlyOccupied++;
    sim.run(300);
    let lateOccupied = 0;
    for (const p of state.population) if (p > 0.01) lateOccupied++;
    expect(totalPopulation(state)).toBeGreaterThan(early);
    expect(lateOccupied).toBeGreaterThan(earlyOccupied);
  });

  it('declines where land turns inhospitable', () => {
    const state = continent(true);
    new Simulation(state, [civilizationSystem]).run(200);
    expect(totalPopulation(state)).toBeGreaterThan(1);
    // Freeze the whole continent solid.
    state.ice.fill(1);
    new Simulation(state, [civilizationSystem]).run(100);
    expect(totalPopulation(state)).toBeLessThan(0.1);
  });

  it('is deterministic', () => {
    const a = continent(true);
    const b = continent(true);
    new Simulation(a, [civilizationSystem]).run(200);
    new Simulation(b, [civilizationSystem]).run(200);
    expect(a.population).toEqual(b.population);
  });
});
