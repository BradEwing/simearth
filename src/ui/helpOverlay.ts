export interface HelpOverlay {
  show(): void;
  hide(): void;
  toggle(): void;
}

const SECTIONS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'The goal',
    body: 'Shepherd a planet from bare rock to a living world. Keep the climate habitable, seed life and guide it to sentience, then watch a civilization rise — and launch the Exodus to the stars.',
  },
  {
    title: 'Navigate',
    body: 'Drag to pan the map; scroll to zoom. The speed buttons (top right) pause or run time from slow to fast.',
  },
  {
    title: 'Read the planet',
    body: 'The Map buttons switch overlays — surface, temperature, rainfall, currents, biomes, life, population, pollution. The Gaia panel shows live vital signs.',
  },
  {
    title: 'Shape the world',
    body: 'Pick a Tool, then click the map: raise/lower land, add/remove water, seed life, or trigger volcanoes, meteors, and earthquakes. The Greenhouse and Solar sliders tune the climate.',
  },
  {
    title: 'Watch Gaia',
    body: 'As the Sun brightens, a healthy biosphere draws CO₂ down to keep the planet habitable. Sabotage it and the world cooks. Save, export, or start a new seed any time.',
  },
];

/**
 * Onboarding / help overlay: a dismissable panel explaining the goal and
 * controls. Shown once on first load; reopenable from the topbar "?" button.
 */
export function createHelpOverlay(root: HTMLElement): HelpOverlay {
  const overlay = document.createElement('div');
  overlay.className = 'se-help';
  overlay.hidden = true;

  const card = document.createElement('div');
  card.className = 'se-help__card';

  const title = document.createElement('h1');
  title.textContent = 'SimEarth';
  card.append(title);

  for (const section of SECTIONS) {
    const h = document.createElement('h3');
    h.textContent = section.title;
    const p = document.createElement('p');
    p.textContent = section.body;
    card.append(h, p);
  }

  const dismiss = document.createElement('button');
  dismiss.className = 'se-help__dismiss';
  dismiss.textContent = 'Begin';
  card.append(dismiss);

  overlay.append(card);
  root.append(overlay);

  const hide = (): void => {
    overlay.hidden = true;
  };
  const show = (): void => {
    overlay.hidden = false;
  };
  dismiss.addEventListener('click', hide);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hide(); // click backdrop to dismiss
  });

  return { show, hide, toggle: () => (overlay.hidden ? show() : hide()) };
}
