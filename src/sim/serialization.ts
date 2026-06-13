import { createWorldState, type WorldState } from './state';
import type { RngState } from './rng';

/**
 * Save format for {@link WorldState}.
 *
 * Per-tile typed arrays are stored generically as base64-encoded bytes tagged
 * with their constructor name, so adding a new field to WorldState needs no
 * change here — the round-trip discovers fields by reflection. Scalars and meta
 * are stored explicitly. The result is a plain object: `JSON.stringify` it for
 * file export, or hand it to IndexedDB directly (M7).
 *
 * Byte order is the platform's (little-endian on every target browser/device);
 * cross-endian transfer is out of scope for the MVP.
 */
export const SAVE_VERSION = 1;

interface SerializedField {
  type: string; // typed-array constructor name, e.g. 'Float32Array'
  b64: string;
}

export interface SerializedWorld {
  version: number;
  width: number;
  height: number;
  tick: number;
  seed: number | string;
  rng: RngState;
  scalars: {
    seaLevel: number;
    seaLevelBase: number;
    solarLuminosity: number;
    co2: number;
    o2: number;
    meanTemperature: number;
  };
  fields: Record<string, SerializedField>;
}

/** Typed-array constructors we know how to reconstruct on load. */
const TYPED_ARRAY_CTORS = {
  Float32Array,
  Float64Array,
  Uint8Array,
  Uint16Array,
  Uint32Array,
  Int8Array,
  Int16Array,
  Int32Array,
} as const;

type TypedArray = InstanceType<
  (typeof TYPED_ARRAY_CTORS)[keyof typeof TYPED_ARRAY_CTORS]
>;

const isTypedArray = (v: unknown): v is TypedArray =>
  ArrayBuffer.isView(v) && !(v instanceof DataView);

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000; // avoid arg-count limits in String.fromCharCode
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Serializes a world to a plain, versioned, JSON-friendly object. */
export function serializeWorld(state: WorldState): SerializedWorld {
  const fields: Record<string, SerializedField> = {};
  for (const [key, value] of Object.entries(state)) {
    if (isTypedArray(value)) {
      const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      fields[key] = { type: value.constructor.name, b64: bytesToBase64(bytes) };
    }
  }

  return {
    version: SAVE_VERSION,
    width: state.width,
    height: state.height,
    tick: state.tick,
    seed: state.seed,
    rng: { ...state.rng },
    scalars: {
      seaLevel: state.seaLevel,
      seaLevelBase: state.seaLevelBase,
      solarLuminosity: state.solarLuminosity,
      co2: state.co2,
      o2: state.o2,
      meanTemperature: state.meanTemperature,
    },
    fields,
  };
}

/** Reconstructs a world from {@link serializeWorld} output. */
export function deserializeWorld(data: SerializedWorld): WorldState {
  if (data.version > SAVE_VERSION) {
    throw new Error(
      `Save version ${data.version} is newer than supported (${SAVE_VERSION}); update the game.`,
    );
  }

  // Allocate a correctly-sized, fully-populated world, then overwrite it. Any
  // field present now but absent from the save stays zeroed (forward compat);
  // any saved field no longer on the state is ignored (backward compat).
  const state = createWorldState({
    width: data.width,
    height: data.height,
    seed: data.seed,
  });
  state.tick = data.tick;
  state.rng = { ...data.rng };

  state.seaLevel = data.scalars.seaLevel;
  state.seaLevelBase = data.scalars.seaLevelBase;
  state.solarLuminosity = data.scalars.solarLuminosity;
  state.co2 = data.scalars.co2;
  state.o2 = data.scalars.o2;
  state.meanTemperature = data.scalars.meanTemperature;

  const target = state as unknown as Record<string, unknown>;
  for (const [key, field] of Object.entries(data.fields)) {
    const current = target[key];
    if (!isTypedArray(current)) continue; // unknown/removed field — skip
    const ctor = TYPED_ARRAY_CTORS[field.type as keyof typeof TYPED_ARRAY_CTORS];
    if (!ctor || current.constructor.name !== field.type) {
      throw new Error(`Field '${key}' type mismatch: save has ${field.type}`);
    }
    const bytes = base64ToBytes(field.b64);
    if (bytes.byteLength !== current.byteLength) {
      throw new Error(`Field '${key}' size mismatch on load`);
    }
    new Uint8Array(current.buffer, current.byteOffset, current.byteLength).set(bytes);
  }

  return state;
}
