import { describe, it, expect } from 'vitest';
import {
  createCamera,
  clampZoom,
  normalizeCamera,
  screenToTile,
  zoomAt,
  MIN_ZOOM,
  MAX_ZOOM,
} from './camera';

const world = { width: 128, height: 64 };

describe('clampZoom', () => {
  it('bounds zoom to [MIN, MAX]', () => {
    expect(clampZoom(0.1)).toBe(MIN_ZOOM);
    expect(clampZoom(9999)).toBe(MAX_ZOOM);
    expect(clampZoom(8)).toBe(8);
  });
});

describe('normalizeCamera', () => {
  it('wraps x into [0, width)', () => {
    const cam = { x: 130, y: 10, zoom: 8 };
    normalizeCamera(cam, world, { width: 400, height: 400 });
    expect(cam.x).toBe(2);

    const cam2 = { x: -3, y: 10, zoom: 8 };
    normalizeCamera(cam2, world, { width: 400, height: 400 });
    expect(cam2.x).toBe(125);
  });

  it('clamps y so the map cannot be panned off the bottom', () => {
    const viewport = { width: 400, height: 256 }; // 32 tiles tall at zoom 8
    const cam = { x: 0, y: 1000, zoom: 8 };
    normalizeCamera(cam, world, viewport);
    expect(cam.y).toBe(world.height - viewport.height / cam.zoom); // 64 - 32 = 32
  });

  it('centers vertically when the map is shorter than the viewport', () => {
    const viewport = { width: 400, height: 1024 }; // 128 tiles tall at zoom 8 > 64
    const cam = { x: 0, y: 5, zoom: 8 };
    normalizeCamera(cam, world, viewport);
    expect(cam.y).toBe((world.height - viewport.height / cam.zoom) / 2); // negative → letterbox
    expect(cam.y).toBeLessThan(0);
  });
});

describe('screenToTile', () => {
  it('inverts the camera transform and wraps x', () => {
    const cam = createCamera(10);
    cam.x = 5;
    cam.y = 3;
    expect(screenToTile(cam, world, 0, 0)).toEqual({ x: 5, y: 3 });
    expect(screenToTile(cam, world, 25, 40)).toEqual({ x: 7, y: 7 }); // +2.5 tiles, +4 tiles
  });

  it('wraps tile x past the seam', () => {
    const cam = createCamera(10);
    cam.x = 126;
    expect(screenToTile(cam, world, 50, 0).x).toBe((126 + 5) % 128); // 3
  });
});

describe('zoomAt', () => {
  it('keeps the world tile under the anchor fixed', () => {
    const cam = createCamera(8);
    cam.x = 10;
    cam.y = 10;
    const anchorX = 120;
    const anchorY = 80;
    const worldBefore = {
      x: cam.x + anchorX / cam.zoom,
      y: cam.y + anchorY / cam.zoom,
    };
    zoomAt(cam, 2, anchorX, anchorY);
    const worldAfter = {
      x: cam.x + anchorX / cam.zoom,
      y: cam.y + anchorY / cam.zoom,
    };
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 9);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 9);
    expect(cam.zoom).toBe(16);
  });

  it('respects zoom bounds', () => {
    const cam = createCamera(MAX_ZOOM);
    zoomAt(cam, 4, 0, 0);
    expect(cam.zoom).toBe(MAX_ZOOM);
  });
});
