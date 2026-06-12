import type { WorldState } from '@sim/state';
import type { CanvasSurface } from './canvas';
import type { Camera } from './camera';
import { normalizeCamera } from './camera';
import type { MapMode } from './mapModes';

const BACKGROUND = '#0b0e14';

/**
 * Renders the planet grid to a canvas.
 *
 * The grid is painted once into an offscreen buffer at 1 px per tile (via the
 * active {@link MapMode}), then blitted to the visible surface scaled by the
 * camera's zoom with image smoothing off (crisp pixel-art). The offscreen is
 * tiled horizontally so longitude wraps seamlessly; latitude is letterboxed.
 *
 * `update` (repaint the buffer) and `draw` (blit) are separate so the buffer is
 * only recomputed when the simulation changes, while panning/zooming just
 * re-blits.
 */
export class PlanetRenderer {
  private readonly offscreen: HTMLCanvasElement;
  private readonly offCtx: CanvasRenderingContext2D;
  private readonly image: ImageData;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = width;
    this.offscreen.height = height;
    const ctx = this.offscreen.getContext('2d');
    if (!ctx) throw new Error('offscreen 2D context unavailable');
    this.offCtx = ctx;
    this.image = this.offCtx.createImageData(width, height);
  }

  /** Repaints the offscreen pixel buffer from state using the given map mode. */
  update(state: WorldState, mode: MapMode): void {
    mode.paint(state, this.image.data);
    this.offCtx.putImageData(this.image, 0, 0);
  }

  /** Blits the buffer to the surface with camera pan/zoom and longitude wrap. */
  draw(surface: CanvasSurface, cam: Camera): void {
    const { ctx, width: vw, height: vh } = surface;
    normalizeCamera(cam, this, { width: vw, height: vh });

    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, vw, vh);
    ctx.imageSmoothingEnabled = false;

    // Integer destination metrics keep wrapped copies pixel-aligned (no seams).
    const mapPxW = Math.round(this.width * cam.zoom);
    const mapPxH = Math.round(this.height * cam.zoom);
    const originY = Math.round(-cam.y * cam.zoom);
    // cam.x is normalized to [0, width), so the first copy starts in (-mapPxW, 0].
    const startX = Math.round(-cam.x * cam.zoom);

    for (let sx = startX; sx < vw; sx += mapPxW) {
      ctx.drawImage(this.offscreen, sx, originY, mapPxW, mapPxH);
    }
  }
}
