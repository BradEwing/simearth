import type { MapMode } from '@render/mapModes';

/**
 * Builds the map-mode switcher: one button per overlay (Surface, Elevation,
 * Temperature, Rainfall, …). Selecting one invokes `onSelect` and highlights it.
 * Returns the element to mount in the side panel.
 */
export function createMapModeSwitcher(
  modes: readonly MapMode[],
  active: MapMode,
  onSelect: (mode: MapMode) => void,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'se-mapmodes';

  const buttons = modes.map((mode) => {
    const btn = document.createElement('button');
    btn.className = 'se-mapmode__btn';
    btn.textContent = mode.label;
    btn.addEventListener('click', () => {
      active = mode;
      sync();
      onSelect(mode);
    });
    wrap.append(btn);
    return { btn, mode };
  });

  function sync(): void {
    for (const { btn, mode } of buttons) {
      btn.classList.toggle('is-active', mode === active);
    }
  }
  sync();

  return wrap;
}
