import type { WorldState } from '@sim/state';

interface ParamSpec {
  key: 'greenhouseFactor' | 'solarFactor';
  label: string;
  min: number;
  max: number;
  step: number;
}

const PARAMS: readonly ParamSpec[] = [
  { key: 'greenhouseFactor', label: 'Greenhouse', min: 0.2, max: 3, step: 0.05 },
  { key: 'solarFactor', label: 'Solar', min: 0.5, max: 1.6, step: 0.02 },
];

/**
 * Model-parameter sliders (the "model" knobs): let the player dial planetary
 * forcings — greenhouse strength, solar input — and watch the climate respond.
 * Writes directly to the adjustable state scalars; `onChange` triggers a repaint
 * so the effect is visible even while paused.
 */
export function createModelParams(state: WorldState, onChange: () => void): HTMLElement {
  const element = document.createElement('div');
  element.className = 'se-params';

  for (const spec of PARAMS) {
    const row = document.createElement('label');
    row.className = 'se-param';

    const name = document.createElement('span');
    name.textContent = spec.label;

    const value = document.createElement('span');
    value.className = 'se-param__value';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(spec.min);
    slider.max = String(spec.max);
    slider.step = String(spec.step);
    slider.value = String(state[spec.key]);

    const render = (): void => {
      value.textContent = `${state[spec.key].toFixed(2)}×`;
    };
    render();

    slider.addEventListener('input', () => {
      state[spec.key] = Number(slider.value);
      render();
      onChange();
    });

    row.append(name, slider, value);
    element.append(row);
  }

  return element;
}
