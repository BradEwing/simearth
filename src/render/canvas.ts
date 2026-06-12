/** A canvas drawing surface whose backing store tracks its displayed size. */
export interface CanvasSurface {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** Logical drawing size in CSS pixels (drawing coords are CSS pixels). */
  width: number;
  height: number;
  dpr: number;
}

/**
 * Sizes a canvas's backing store to its displayed size accounting for device
 * pixel ratio, scales the 2D context so drawing coordinates are CSS pixels, and
 * keeps both in sync on resize. `onResize` fires after every (re)size, including
 * the initial one. Returns the surface and a disposer that stops observing.
 */
export function attachCanvasSurface(
  canvas: HTMLCanvasElement,
  onResize?: (surface: CanvasSurface) => void,
): { surface: CanvasSurface; dispose: () => void } {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');

  const surface: CanvasSurface = { canvas, ctx, width: 0, height: 0, dpr: 1 };

  const resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    surface.width = width;
    surface.height = height;
    surface.dpr = dpr;
    onResize?.(surface);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  return { surface, dispose: () => observer.disconnect() };
}
