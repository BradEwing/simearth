/** Details shown on the Exodus victory screen. */
export interface VictoryInfo {
  /** Tick the Exodus was achieved. */
  tick: number;
}

export interface VictoryOverlay {
  /** Reveal the victory screen with the given details (idempotent). */
  show(info: VictoryInfo): void;
  /** Hide the victory screen. */
  hide(): void;
  readonly visible: boolean;
}

/**
 * The Exodus victory overlay. Builds a hidden full-stage banner under `root` and
 * reveals it when the civilization launches the Exodus. Dismissable so the
 * player can keep tending the planet afterward (sandbox).
 */
export function createVictoryOverlay(root: HTMLElement): VictoryOverlay {
  const overlay = document.createElement('div');
  overlay.className = 'se-victory';
  overlay.hidden = true;

  const card = document.createElement('div');
  card.className = 'se-victory__card';

  const title = document.createElement('h1');
  title.textContent = 'The Exodus';

  const body = document.createElement('p');

  const dismiss = document.createElement('button');
  dismiss.className = 'se-victory__dismiss';
  dismiss.textContent = 'Continue tending the planet';

  card.append(title, body, dismiss);
  overlay.append(card);
  root.append(overlay);

  let visible = false;
  const hide = (): void => {
    visible = false;
    overlay.hidden = true;
  };
  dismiss.addEventListener('click', hide);

  return {
    show(info: VictoryInfo): void {
      body.textContent =
        `Your sentient species has mastered its world and departed for the stars, ` +
        `launching the Exodus at tick ${info.tick.toLocaleString()}. The living ` +
        `planet you shepherded set them on their way.`;
      visible = true;
      overlay.hidden = false;
    },
    hide,
    get visible(): boolean {
      return visible;
    },
  };
}
