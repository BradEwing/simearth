import type { Camera } from '@render/camera';
import { zoomAt } from '@render/camera';

const ZOOM_STEP = 1.12;

/**
 * Wires pointer drag-to-pan and wheel-to-zoom on the canvas, mutating `camera`
 * in place. Panning is in tile units (scaled by zoom) so it tracks the cursor;
 * zooming anchors on the cursor. Returns a disposer that removes the listeners.
 *
 * No redraw is triggered here — the continuous {@link RenderLoop} picks up the
 * mutated camera on the next frame. `onChange` is optional for on-demand setups.
 */
export function attachCameraControls(
  canvas: HTMLCanvasElement,
  camera: Camera,
  onChange?: () => void,
): () => void {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const onPointerDown = (e: PointerEvent): void => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!dragging) return;
    camera.x -= (e.clientX - lastX) / camera.zoom;
    camera.y -= (e.clientY - lastY) / camera.zoom;
    lastX = e.clientX;
    lastY = e.clientY;
    onChange?.();
  };

  const onPointerUp = (e: PointerEvent): void => {
    dragging = false;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    zoomAt(camera, factor, e.clientX - rect.left, e.clientY - rect.top);
    onChange?.();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.style.cursor = 'grab';

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('wheel', onWheel);
  };
}
