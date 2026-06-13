import type { WorldState } from '@sim/state';
import { eraName, totalPopulation } from '@sim/civilization/civilization';

const LIFE_STAGE_NAMES = [
  'None',
  'Prokaryotes',
  'Eukaryotes',
  'Plants',
  'Invertebrates',
  'Vertebrates',
  'Mammals',
  'Proto-Sapients',
];

export interface GaiaPanel {
  readonly element: HTMLElement;
  /** Refresh all read-outs from the current state. */
  update(state: WorldState): void;
}

/**
 * The Gaia model panel: live planetary read-outs (era, temperature, atmosphere,
 * sea level, biosphere, civilization). A read-only view of state, refreshed each
 * time the world advances — the player's window into the planet's vital signs.
 */
export function createGaiaPanel(): GaiaPanel {
  const element = document.createElement('section');
  const heading = document.createElement('h2');
  heading.textContent = 'Gaia';
  const dl = document.createElement('dl');
  dl.className = 'se-readout';
  element.append(heading, dl);

  const rows = new Map<string, HTMLElement>();
  const addRow = (key: string, label: string): void => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = '—';
    dl.append(dt, dd);
    rows.set(key, dd);
  };
  const set = (key: string, value: string): void => {
    const dd = rows.get(key);
    if (dd) dd.textContent = value;
  };

  addRow('era', 'Era');
  addRow('age', 'Age');
  addRow('temp', 'Mean temp');
  addRow('co2', 'CO₂');
  addRow('o2', 'O₂');
  addRow('solar', 'Solar');
  addRow('sea', 'Sea level');
  addRow('bio', 'Biosphere');
  addRow('life', 'Life');
  addRow('sentience', 'Sentience');
  addRow('pop', 'Population');

  return {
    element,
    update(state: WorldState): void {
      // Single pass for biosphere aggregates.
      let biomassSum = 0;
      let maxStage = 0;
      for (let i = 0; i < state.biomass.length; i++) {
        biomassSum += state.biomass[i]!;
        if (state.lifeStage[i]! > maxStage) maxStage = state.lifeStage[i]!;
      }
      const meanBiomass = biomassSum / state.biomass.length;

      set('era', state.exodusTick >= 0 ? 'Exodus achieved ✦' : eraName(state.techLevel));
      set('age', `tick ${state.tick.toLocaleString()}`);
      set('temp', `${state.meanTemperature.toFixed(1)} °C`);
      set('co2', state.co2.toFixed(1));
      set('o2', state.o2.toFixed(2));
      set('solar', `${state.solarLuminosity.toFixed(3)}×`);
      set('sea', `${(state.seaLevel - state.seaLevelBase).toFixed(3)} Δ`);
      set('bio', `${(meanBiomass * 100).toFixed(0)}% cover`);
      set('life', LIFE_STAGE_NAMES[maxStage] ?? '—');
      set('sentience', `${(state.sentienceProgress * 100).toFixed(0)}%`);
      set('pop', totalPopulation(state).toFixed(1));
    },
  };
}
