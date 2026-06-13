import type { WorldState } from '@sim/state';
import { placeLife, terraform, setWater, TERRAFORM_AMOUNT } from '@sim/commands';
import { LifeClass } from '@sim/biosphere/life';

/**
 * A player tool: a named action applied at a clicked tile, dispatching one or
 * more sim {@link placeLife}-style commands. Tools are the only path by which
 * the UI mutates the world. More tools (terraform, water, events) register here
 * in M6.2–M6.3.
 */
export interface Tool {
  readonly id: string;
  readonly label: string;
  apply(state: WorldState, x: number, y: number): void;
}

export const raiseTerrainTool: Tool = {
  id: 'raise',
  label: 'Raise Land',
  apply: (state, x, y) => terraform(state, x, y, TERRAFORM_AMOUNT),
};

export const lowerTerrainTool: Tool = {
  id: 'lower',
  label: 'Lower Land',
  apply: (state, x, y) => terraform(state, x, y, -TERRAFORM_AMOUNT),
};

export const addWaterTool: Tool = {
  id: 'add-water',
  label: 'Add Water',
  apply: (state, x, y) => setWater(state, x, y, true),
};

export const removeWaterTool: Tool = {
  id: 'remove-water',
  label: 'Remove Water',
  apply: (state, x, y) => setWater(state, x, y, false),
};

export const seedLifeTool: Tool = {
  id: 'seed-life',
  label: 'Seed Life',
  apply: (state, x, y) => placeLife(state, x, y, LifeClass.Prokaryote),
};

/** All registered tools, in palette order. */
export const TOOLS: readonly Tool[] = [
  raiseTerrainTool,
  lowerTerrainTool,
  addWaterTool,
  removeWaterTool,
  seedLifeTool,
];
