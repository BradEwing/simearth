import type { Tool } from './tools';

export interface ToolPalette {
  readonly element: HTMLElement;
  /** The currently selected tool, or null for inspect (no tool). */
  active(): Tool | null;
}

/**
 * Tool palette: one button per tool. Clicking selects it; clicking the active
 * tool again deselects (back to inspect mode, where map clicks do nothing).
 */
export function createToolPalette(tools: readonly Tool[]): ToolPalette {
  const element = document.createElement('div');
  element.className = 'se-tools';

  let active: Tool | null = null;

  const buttons = tools.map((tool) => {
    const btn = document.createElement('button');
    btn.className = 'se-tool__btn';
    btn.textContent = tool.label;
    btn.addEventListener('click', () => {
      active = active === tool ? null : tool;
      sync();
    });
    element.append(btn);
    return { btn, tool };
  });

  function sync(): void {
    for (const { btn, tool } of buttons)
      btn.classList.toggle('is-active', tool === active);
  }

  return {
    element,
    active: () => active,
  };
}
