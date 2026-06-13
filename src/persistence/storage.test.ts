import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { createWorldState } from '@sim/state';
import { generateTerrain } from '@sim/geosphere/terrain';
import { serializeWorld, deserializeWorld } from '@sim/serialization';
import { saveGame, loadGame, listSaves, deleteSave } from './storage';

function sampleWorld(seed: string): ReturnType<typeof serializeWorld> {
  const state = createWorldState({ width: 16, height: 12, seed });
  generateTerrain(state);
  state.tick = 123;
  return serializeWorld(state);
}

// Clear the store between tests.
beforeEach(async () => {
  for (const s of await listSaves()) await deleteSave(s.name);
});

describe('storage (IndexedDB)', () => {
  it('saves and loads a world, preserving its data', async () => {
    const world = sampleWorld('idb');
    await saveGame('Alpha', world, 1000);
    const loaded = await loadGame('Alpha');
    expect(loaded).not.toBeNull();
    // Round-trips back to identical state.
    const restored = deserializeWorld(loaded!);
    const original = deserializeWorld(world);
    expect(restored.altitude).toEqual(original.altitude);
    expect(restored.tick).toBe(123);
  });

  it('returns null for a missing save', async () => {
    expect(await loadGame('nope')).toBeNull();
  });

  it('lists saves newest-first with summaries', async () => {
    await saveGame('Old', sampleWorld('a'), 1000);
    await saveGame('New', sampleWorld('b'), 2000);
    const list = await listSaves();
    expect(list.map((s) => s.name)).toEqual(['New', 'Old']);
    expect(list[0]!.tick).toBe(123);
  });

  it('overwrites a save with the same name', async () => {
    await saveGame('Slot', sampleWorld('a'), 1000);
    await saveGame('Slot', sampleWorld('b'), 2000);
    const list = await listSaves();
    expect(list).toHaveLength(1);
    expect(list[0]!.savedAt).toBe(2000);
  });

  it('deletes a save', async () => {
    await saveGame('Doomed', sampleWorld('a'), 1000);
    await deleteSave('Doomed');
    expect(await loadGame('Doomed')).toBeNull();
    expect(await listSaves()).toHaveLength(0);
  });
});
