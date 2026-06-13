import type { WorldState } from '@sim/state';
import type { Camera } from '@render/camera';
import { screenToTile } from '@render/camera';
import type { Tool } from './tools';

/** Pointer travel (px) above which a gesture is treated as a pan, not a click. */
const CLICK_SLOP = 4;

export interface ToolInputOptions {
  getTool: () => Tool | null;
  getCamera: () => Camera;
  state: WorldState;
  /** Called after a tool mutates the world (so the view can repaint). */
  onApplied: () => void;
}

/**
 * Applies the active tool where the player clicks the map. A click is a
 * pointerdown/up with little travel; dragging (pan) is left to the camera
 * controls. Translates the click to a tile via the camera and dispatches the
 * tool. Returns a disposer.
 */
export function attachToolInput(
  canvas: HTMLCanvasElement,
  opts: ToolInputOptions,
): () => void {
  let downX = 0;
  let downY = 0;
  let moved = 0;

  const onDown = (e: PointerEvent): void => {
    downX = e.clientX;
    downY = e.clientY;
    moved = 0;
  };
  const onMove = (e: PointerEvent): void => {
    moved = Math.max(moved, Math.abs(e.clientX - downX), Math.abs(e.clientY - downY));
  };
  const onUp = (e: PointerEvent): void => {
    if (moved > CLICK_SLOP) return; // it was a pan
    const tool = opts.getTool();
    if (!tool) return;
    const rect = canvas.getBoundingClientRect();
    const { x, y } = screenToTile(
      opts.getCamera(),
      opts.state,
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
    tool.apply(opts.state, x, y);
    opts.onApplied();
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  return () => {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
  };
}
