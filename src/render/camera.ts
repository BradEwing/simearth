/**
 * 2D camera over the tile grid. `x`/`y` are the world *tile* coordinates shown
 * at the viewport's top-left; `zoom` is pixels per tile. Longitude (x) wraps
 * with the world; latitude (y) is clamped so the map can't be panned fully off
 * screen. Pure math so it is fully unit-testable without a canvas.
 */
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 32;

export function createCamera(zoom = 6): Camera {
  return { x: 0, y: 0, zoom };
}

export const clampZoom = (zoom: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

const wrap = (v: number, n: number): number => ((v % n) + n) % n;

/**
 * Normalizes the camera in place: wraps x into [0, width); clamps y so the map
 * fills or letterboxes the viewport (centered when the map is shorter than the
 * view). Returns the same camera for convenience.
 */
export function normalizeCamera(
  cam: Camera,
  world: { width: number; height: number },
  viewport: Viewport,
): Camera {
  cam.zoom = clampZoom(cam.zoom);
  cam.x = wrap(cam.x, world.width);

  const visibleY = viewport.height / cam.zoom;
  if (visibleY >= world.height) {
    cam.y = (world.height - visibleY) / 2; // center vertically (letterbox)
  } else {
    cam.y = Math.min(world.height - visibleY, Math.max(0, cam.y));
  }
  return cam;
}

/** Screen pixel (relative to viewport top-left) → world tile coordinate. */
export function screenToTile(
  cam: Camera,
  world: { width: number; height: number },
  sx: number,
  sy: number,
): { x: number; y: number } {
  return {
    x: wrap(Math.floor(cam.x + sx / cam.zoom), world.width),
    y: Math.floor(cam.y + sy / cam.zoom),
  };
}

/**
 * Zooms by `factor` about a screen anchor point, keeping the world tile under
 * the anchor fixed. Mutates and returns the camera (un-normalized — call
 * {@link normalizeCamera} after).
 */
export function zoomAt(
  cam: Camera,
  factor: number,
  anchorX: number,
  anchorY: number,
): Camera {
  const next = clampZoom(cam.zoom * factor);
  // world coord under the anchor before/after must match:
  // worldX = cam.x + anchorX/zoom  ⇒  newCamX = worldX - anchorX/newZoom
  cam.x = cam.x + anchorX / cam.zoom - anchorX / next;
  cam.y = cam.y + anchorY / cam.zoom - anchorY / next;
  cam.zoom = next;
  return cam;
}
