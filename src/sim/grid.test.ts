import { describe, it, expect } from 'vitest';
import {
  idx,
  xOf,
  yOf,
  wrapX,
  clampY,
  toIndexClamped,
  neighborIndex,
  forEachNeighbor4,
  forEachNeighbor8,
  latitudeOf,
} from './grid';

const W = 8;
const H = 4;

describe('grid index math', () => {
  it('idx / xOf / yOf round-trip', () => {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = idx(W, x, y);
        expect(xOf(W, i)).toBe(x);
        expect(yOf(W, i)).toBe(y);
      }
    }
  });

  it('wrapX wraps longitude in both directions', () => {
    expect(wrapX(W, 0)).toBe(0);
    expect(wrapX(W, W - 1)).toBe(W - 1);
    expect(wrapX(W, -1)).toBe(W - 1);
    expect(wrapX(W, W)).toBe(0);
    expect(wrapX(W, W + 3)).toBe(3);
    expect(wrapX(W, -(W + 2))).toBe(W - 2);
  });

  it('clampY clamps latitude to the poles', () => {
    expect(clampY(H, -5)).toBe(0);
    expect(clampY(H, 0)).toBe(0);
    expect(clampY(H, H - 1)).toBe(H - 1);
    expect(clampY(H, H + 9)).toBe(H - 1);
  });

  it('toIndexClamped wraps x and clamps y', () => {
    expect(toIndexClamped(W, H, -1, -1)).toBe(idx(W, W - 1, 0));
    expect(toIndexClamped(W, H, W, H)).toBe(idx(W, 0, H - 1));
  });
});

describe('neighborIndex', () => {
  it('finds interior neighbors', () => {
    expect(neighborIndex(W, H, 3, 1, 1, 0)).toBe(idx(W, 4, 1));
    expect(neighborIndex(W, H, 3, 1, 0, -1)).toBe(idx(W, 3, 0));
  });

  it('wraps longitude at the seam', () => {
    expect(neighborIndex(W, H, 0, 1, -1, 0)).toBe(idx(W, W - 1, 1));
    expect(neighborIndex(W, H, W - 1, 1, 1, 0)).toBe(idx(W, 0, 1));
  });

  it('returns -1 across a pole (closed boundary)', () => {
    expect(neighborIndex(W, H, 3, 0, 0, -1)).toBe(-1);
    expect(neighborIndex(W, H, 3, H - 1, 0, 1)).toBe(-1);
  });
});

describe('forEachNeighbor', () => {
  const collect4 = (x: number, y: number): number[] => {
    const out: number[] = [];
    forEachNeighbor4(W, H, x, y, (_nx, _ny, i) => out.push(i));
    return out;
  };

  it('yields 4 interior neighbors', () => {
    expect(collect4(3, 1)).toHaveLength(4);
  });

  it('omits the missing neighbor at a pole', () => {
    expect(collect4(3, 0)).toHaveLength(3); // no up
    expect(collect4(3, H - 1)).toHaveLength(3); // no down
  });

  it('still yields the wrapped longitude neighbor at the seam corner', () => {
    const corner = collect4(0, 0); // up omitted (pole), left wraps to x=W-1
    expect(corner).toHaveLength(3);
    expect(corner).toContain(idx(W, W - 1, 0));
  });

  it('forEachNeighbor8 yields 8 interior and 5 at a pole', () => {
    const count = (x: number, y: number): number => {
      let n = 0;
      forEachNeighbor8(W, H, x, y, () => n++);
      return n;
    };
    expect(count(3, 1)).toBe(8);
    expect(count(3, 0)).toBe(5); // three up-row neighbors omitted
  });
});

describe('latitudeOf', () => {
  it('runs +90 (north) at row 0 to -90 (south) at the last row', () => {
    const top = latitudeOf(H, 0);
    const bottom = latitudeOf(H, H - 1);
    expect(top).toBeGreaterThan(0);
    expect(top).toBeLessThan(90);
    expect(bottom).toBeLessThan(0);
    expect(bottom).toBeGreaterThan(-90);
    expect(top).toBeCloseTo(-bottom, 6); // symmetric about the equator
  });

  it('decreases monotonically toward the south', () => {
    for (let y = 1; y < 64; y++) {
      expect(latitudeOf(64, y)).toBeLessThan(latitudeOf(64, y - 1));
    }
  });
});
