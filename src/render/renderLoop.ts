/**
 * A display-driven render loop. Calls `render(dtMs)` once per animation frame,
 * entirely independently of the simulation's tick rate — the loop just draws
 * whatever the current state is. This is the decoupling point: the sim can tick
 * fast, slow, or be paused while the view keeps repainting at display refresh.
 */
export class RenderLoop {
  private running = false;
  private handle = 0;
  private last = 0;

  constructor(private readonly render: (dtMs: number) => void) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const frame = (now: number): void => {
      if (!this.running) return;
      const dt = now - this.last;
      this.last = now;
      this.render(dt);
      this.handle = requestAnimationFrame(frame);
    };
    this.handle = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.handle);
  }

  get isRunning(): boolean {
    return this.running;
  }
}
