import type { WorldState } from '@sim/state';
import { placeLife } from '@sim/commands';
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

export const seedLifeTool: Tool = {
  id: 'seed-life',
  label: 'Seed Life',
  apply: (state, x, y) => placeLife(state, x, y, LifeClass.Prokaryote),
};

/** All registered tools, in palette order. */
export const TOOLS: readonly Tool[] = [seedLifeTool];
