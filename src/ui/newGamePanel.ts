export interface NewGameOptions {
  /** Start a fresh planet from the given seed. */
  onNewPlanet: (seed: string) => void;
  /** Produce a fresh random seed (injected to keep the module deterministic-friendly). */
  randomSeed: () => string;
}

/**
 * New-game panel: a seed field, a randomize button, and "New Planet". Submitting
 * regenerates the world from the seed (blank → a fresh random seed).
 */
export function createNewGamePanel(opts: NewGameOptions): HTMLElement {
  const element = document.createElement('section');
  const heading = document.createElement('h2');
  heading.textContent = 'New Planet';

  const form = document.createElement('div');
  form.className = 'se-newgame__form';

  const seedInput = document.createElement('input');
  seedInput.type = 'text';
  seedInput.placeholder = 'Seed…';
  seedInput.className = 'se-saves__name';

  const randomBtn = document.createElement('button');
  randomBtn.textContent = '🎲';
  randomBtn.title = 'Random seed';
  randomBtn.addEventListener('click', () => {
    seedInput.value = opts.randomSeed();
  });

  const createBtn = document.createElement('button');
  createBtn.textContent = 'New Planet';
  createBtn.addEventListener('click', () => {
    const seed = seedInput.value.trim() || opts.randomSeed();
    seedInput.value = seed;
    opts.onNewPlanet(seed);
  });

  form.append(seedInput, randomBtn, createBtn);
  element.append(heading, form);
  return element;
}
