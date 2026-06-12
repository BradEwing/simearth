/**
 * Grid geometry for the cylindrical planet (SPEC §3.1).
 *
 * The map is a `width × height` tile grid indexed `y * width + x`. Longitude
 * (x) **wraps** east–west; latitude (y) does **not** — rows `0` and `height-1`
 * are the poles and act as closed boundaries (no neighbor exists beyond them).
 *
 * These are free functions taking explicit dimensions so they inline cleanly in
 * the hot per-tile loops of the simulation systems.
 */

/** Flat array index for in-range coordinates. */
export const idx = (width: number, x: number, y: number): number => y * width + x;

/** Column (x) of a flat index. */
export const xOf = (width: number, index: number): number => index % width;

/** Row (y) of a flat index. */
export const yOf = (width: number, index: number): number => Math.floor(index / width);

/** Wraps a longitude to [0, width) (handles arbitrarily out-of-range x). */
export const wrapX = (width: number, x: number): number => ((x % width) + width) % width;

/** Clamps a latitude row to [0, height-1] (poles are the limits). */
export const clampY = (height: number, y: number): number =>
  y < 0 ? 0 : y >= height ? height - 1 : y;

/**
 * Flat index for arbitrary coordinates, wrapping longitude and clamping
 * latitude to the poles. Use for sampling a point that may be off-grid.
 */
export const toIndexClamped = (
  width: number,
  height: number,
  x: number,
  y: number,
): number => clampY(height, y) * width + wrapX(width, x);

/**
 * Flat index of the neighbor at offset (dx, dy), or -1 if it would cross a pole.
 * Longitude wraps; latitude is a closed boundary. Use for flux/diffusion where
 * "off the top/bottom of the world" means no neighbor.
 */
export const neighborIndex = (
  width: number,
  height: number,
  x: number,
  y: number,
  dx: number,
  dy: number,
): number => {
  const ny = y + dy;
  if (ny < 0 || ny >= height) return -1;
  return ny * width + wrapX(width, x + dx);
};

/** 4-connected (von Neumann) offsets: up, left, right, down. */
export const OFFSETS_4: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
];

/** 8-connected (Moore) offsets. */
export const OFFSETS_8: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

type NeighborFn = (nx: number, ny: number, nIndex: number) => void;

const forEachNeighbor = (
  offsets: ReadonlyArray<readonly [number, number]>,
  width: number,
  height: number,
  x: number,
  y: number,
  fn: NeighborFn,
): void => {
  for (const [dx, dy] of offsets) {
    const ny = y + dy;
    if (ny < 0 || ny >= height) continue; // closed poles: no neighbor
    const nx = wrapX(width, x + dx);
    fn(nx, ny, ny * width + nx);
  }
};

/** Visits the 4-connected neighbors that exist (wraps longitude, skips poles). */
export const forEachNeighbor4 = (
  width: number,
  height: number,
  x: number,
  y: number,
  fn: NeighborFn,
): void => forEachNeighbor(OFFSETS_4, width, height, x, y, fn);

/** Visits the 8-connected neighbors that exist (wraps longitude, skips poles). */
export const forEachNeighbor8 = (
  width: number,
  height: number,
  x: number,
  y: number,
  fn: NeighborFn,
): void => forEachNeighbor(OFFSETS_8, width, height, x, y, fn);

/**
 * Latitude of a row's center, in degrees: +90 (north) at row 0 down to -90
 * (south) at the last row. Uses cell centers so no row sits exactly on a pole
 * (avoids degenerate zero-insolation rows in the climate model).
 */
export const latitudeOf = (height: number, y: number): number =>
  90 - ((y + 0.5) / height) * 180;
