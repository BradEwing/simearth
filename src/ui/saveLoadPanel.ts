import type { WorldState } from '@sim/state';
import { serializeWorld, type SerializedWorld } from '@sim/serialization';
import { saveGame, loadGame, listSaves, deleteSave } from '@persistence/storage';

export interface SaveLoadOptions {
  getState: () => WorldState;
  /** Current epoch ms (injected so the module stays side-effect free / testable). */
  now: () => number;
  /** Apply a loaded world to the running game. */
  applyLoaded: (world: SerializedWorld) => void;
}

/**
 * Save/load panel: a name field + Save button, and a refreshing list of stored
 * games (each with Load and Delete). Persists to IndexedDB via the storage
 * module; mutating the world only ever happens through `applyLoaded`.
 */
export function createSaveLoadPanel(opts: SaveLoadOptions): HTMLElement {
  const element = document.createElement('section');
  const heading = document.createElement('h2');
  heading.textContent = 'Saves';

  const form = document.createElement('div');
  form.className = 'se-saves__form';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Save name…';
  input.className = 'se-saves__name';
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.className = 'se-saves__save';
  form.append(input, saveBtn);

  const list = document.createElement('ul');
  list.className = 'se-saves__list';

  element.append(heading, form, list);

  async function refresh(): Promise<void> {
    const saves = await listSaves();
    list.replaceChildren(
      ...saves.map((s) => {
        const li = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = `${s.name} · t${s.tick}`;
        const load = document.createElement('button');
        load.textContent = 'Load';
        load.addEventListener('click', async () => {
          const world = await loadGame(s.name);
          if (world) opts.applyLoaded(world);
        });
        const del = document.createElement('button');
        del.textContent = '✕';
        del.title = 'Delete';
        del.addEventListener('click', async () => {
          await deleteSave(s.name);
          await refresh();
        });
        li.append(label, load, del);
        return li;
      }),
    );
  }

  saveBtn.addEventListener('click', async () => {
    const name = input.value.trim();
    if (!name) return;
    await saveGame(name, serializeWorld(opts.getState()), opts.now());
    input.value = '';
    await refresh();
  });

  void refresh();
  return element;
}
