import { SPEED_LEVELS, type SimClock } from '@app/simClock';

/**
 * Builds the speed control: pause / slow / normal / fast buttons that set the
 * {@link SimClock}'s tick rate. Returns the element to mount; highlights the
 * active speed. Starts on whatever level matches the clock's current rate.
 */
export function createSpeedControl(clock: SimClock): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'se-speed';

  const buttons = SPEED_LEVELS.map((level) => {
    const btn = document.createElement('button');
    btn.className = 'se-speed__btn';
    btn.textContent = level.label;
    btn.title = level.title;
    btn.addEventListener('click', () => {
      clock.setSpeed(level.ticksPerSecond);
      sync();
    });
    wrap.append(btn);
    return { btn, level };
  });

  function sync(): void {
    for (const { btn, level } of buttons) {
      btn.classList.toggle('is-active', level.ticksPerSecond === clock.ticksPerSecond);
    }
  }
  sync();

  return wrap;
}
