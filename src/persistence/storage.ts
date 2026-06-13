import type { SerializedWorld } from '@sim/serialization';

/**
 * Named-save persistence in IndexedDB. Each record is a {@link SerializedWorld}
 * plus light metadata (name, tick, timestamp) so the load list can be shown
 * without deserializing every save. All operations are async and resolve/reject
 * via promises. No network — everything is local (the GitHub Pages constraint).
 */

const DB_NAME = 'simearth';
const STORE = 'saves';
const DB_VERSION = 1;

export interface SaveRecord {
  name: string;
  savedAt: number;
  tick: number;
  world: SerializedWorld;
}

/** Summary of a save for listing (no heavy world payload). */
export type SaveSummary = Pick<SaveRecord, 'name' | 'savedAt' | 'tick'>;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'name' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const store = db.transaction(STORE, mode).objectStore(STORE);
        const req = run(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
      }),
  );
}

/** Saves (or overwrites) a named game. `savedAt` is supplied by the caller. */
export function saveGame(
  name: string,
  world: SerializedWorld,
  savedAt: number,
): Promise<void> {
  const record: SaveRecord = { name, savedAt, tick: world.tick, world };
  return tx('readwrite', (s) => s.put(record)).then(() => undefined);
}

/** Loads a named game, or null if it doesn't exist. */
export function loadGame(name: string): Promise<SerializedWorld | null> {
  return tx<SaveRecord | undefined>('readonly', (s) => s.get(name)).then(
    (rec) => rec?.world ?? null,
  );
}

/** Lists all saves, newest first (summaries only). */
export function listSaves(): Promise<SaveSummary[]> {
  return tx<SaveRecord[]>('readonly', (s) => s.getAll()).then((recs) =>
    recs
      .map(({ name, savedAt, tick }) => ({ name, savedAt, tick }))
      .sort((a, b) => b.savedAt - a.savedAt),
  );
}

/** Deletes a named save. */
export function deleteSave(name: string): Promise<void> {
  return tx('readwrite', (s) => s.delete(name)).then(() => undefined);
}
