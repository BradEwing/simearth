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

  // Export / import to a file (shareable, independent of IndexedDB).
  const fileRow = document.createElement('div');
  fileRow.className = 'se-saves__form';
  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export';
  const importBtn = document.createElement('button');
  importBtn.textContent = 'Import';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.hidden = true;
  fileRow.append(exportBtn, importBtn, fileInput);

  const list = document.createElement('ul');
  list.className = 'se-saves__list';

  element.append(heading, form, fileRow, list);

  exportBtn.addEventListener('click', () => {
    const json = JSON.stringify(serializeWorld(opts.getState()));
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `planet-t${opts.getState().tick}.simearth.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const world = JSON.parse(await file.text()) as SerializedWorld;
      opts.applyLoaded(world);
    } catch {
      // Invalid file — ignore (a real UI would surface an error toast).
    }
    fileInput.value = '';
  });

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
