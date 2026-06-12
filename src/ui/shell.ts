/** References to the mounted shell's mutable regions. */
export interface Shell {
  readonly canvas: HTMLCanvasElement;
  readonly topbar: HTMLElement;
  readonly panel: HTMLElement;
  readonly status: HTMLElement;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * Builds the static app shell (topbar / canvas stage / side panel) into `root`
 * and returns handles to the regions later milestones populate. Pure DOM
 * construction — no simulation or rendering concerns.
 */
export function mountShell(root: HTMLElement): Shell {
  root.replaceChildren();

  const shell = el('div', 'se-shell');

  const topbar = el('header', 'se-topbar');
  const title = el('span', 'se-title', 'SimEarth');
  const spacer = el('div', 'se-topbar__spacer');
  const status = el('span', 'se-muted', 'scaffold');
  topbar.append(title, spacer, status);

  const stage = el('main', 'se-stage');
  const canvas = el('canvas');
  stage.append(canvas);

  const panel = el('aside', 'se-panel');
  panel.append(
    el('h2', undefined, 'Gaia'),
    el('p', 'se-muted', 'Planet model — coming online.'),
  );

  shell.append(topbar, stage, panel);
  root.append(shell);

  return { canvas, topbar, panel, status };
}
