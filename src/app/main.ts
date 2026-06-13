import './style.css';
import { mountShell } from '@ui/shell';
import { attachCanvasSurface } from '@render/canvas';
import { copyWorldInto } from '@sim/state';
import { createPlanet } from '@sim/worldgen';
import { deserializeWorld } from '@sim/serialization';
import { Simulation } from '@sim/simulation';
import { WORLD_SYSTEMS } from '@sim/worldSystems';
import { eraName } from '@sim/civilization/civilization';
import { PlanetRenderer } from '@render/planetRenderer';
import { surfaceMapMode, MAP_MODES, type MapMode } from '@render/mapModes';
import { createCamera } from '@render/camera';
import { RenderLoop } from '@render/renderLoop';
import { attachCameraControls } from '@ui/cameraControls';
import { SimClock } from './simClock';
import { createSpeedControl } from '@ui/speedControl';
import { createMapModeSwitcher } from '@ui/mapModeSwitcher';
import { createGaiaPanel } from '@ui/gaiaPanel';
import { createModelParams } from '@ui/modelParams';
import { createSaveLoadPanel } from '@ui/saveLoadPanel';
import { createNewGamePanel } from '@ui/newGamePanel';
import { createHelpOverlay } from '@ui/helpOverlay';
import { TOOLS } from '@ui/tools';
import { createToolPalette } from '@ui/toolPalette';
import { attachToolInput } from '@ui/toolInput';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('#app root element not found');

const shell = mountShell(root);

// Build and seed a living planet.
const state = createPlanet({ seed: 'simearth' });

const sim = new Simulation(state, WORLD_SYSTEMS);
const clock = new SimClock();
const renderer = new PlanetRenderer(state.width, state.height);
const camera = createCamera(8);
let activeMapMode: MapMode = surfaceMapMode;

renderer.update(state, activeMapMode);

const { surface } = attachCanvasSurface(shell.canvas);
attachCameraControls(shell.canvas, camera);
shell.topbar.append(createSpeedControl(clock));

// Help / onboarding overlay, shown once on first load, reopenable via "?".
const help = createHelpOverlay(root);
const helpBtn = document.createElement('button');
helpBtn.className = 'se-help__open';
helpBtn.textContent = '?';
helpBtn.title = 'Help';
helpBtn.addEventListener('click', () => help.toggle());
shell.topbar.append(helpBtn);
help.show();

// Side panel: map-mode switcher (Gaia read-outs added in M6.5).
const mapSection = document.createElement('section');
const mapHeading = document.createElement('h2');
mapHeading.textContent = 'Map';
mapSection.append(
  mapHeading,
  createMapModeSwitcher(MAP_MODES, activeMapMode, (mode) => {
    activeMapMode = mode;
    renderer.update(state, mode); // repaint immediately, even when paused
  }),
);

const gaiaPanel = createGaiaPanel();
gaiaPanel.update(state);

// Tools section + click-to-apply on the map.
const toolSection = document.createElement('section');
const toolHeading = document.createElement('h2');
toolHeading.textContent = 'Tools';
const palette = createToolPalette(TOOLS);
toolSection.append(toolHeading, palette.element);

const repaint = (): void => {
  renderer.update(state, activeMapMode);
  gaiaPanel.update(state);
};
attachToolInput(shell.canvas, {
  getTool: palette.active,
  getCamera: () => camera,
  state,
  onApplied: repaint,
});

// Model-parameter sliders live under the Gaia read-outs.
gaiaPanel.element.append(createModelParams(state, repaint));

// Save/load: loaded worlds are copied into the live state in place, so the
// running simulation and all UI bindings stay valid.
const saveSection = createSaveLoadPanel({
  getState: () => state,
  now: () => Date.now(),
  applyLoaded: (world) => {
    copyWorldInto(state, deserializeWorld(world));
    repaint();
  },
});

const newGameSection = createNewGamePanel({
  randomSeed: () => Math.random().toString(36).slice(2, 9),
  onNewPlanet: (seed) => {
    copyWorldInto(state, createPlanet({ seed }));
    repaint();
  },
});

shell.panel.replaceChildren(
  gaiaPanel.element,
  newGameSection,
  mapSection,
  toolSection,
  saveSection,
);

// Single rAF loop: advance the sim by elapsed real time at the chosen speed,
// repaint the map buffer when the world changed, then draw at refresh rate.
const loop = new RenderLoop((dtMs) => {
  const steps = clock.advance(dtMs);
  for (let i = 0; i < steps; i++) sim.tick();
  if (steps > 0) {
    renderer.update(state, activeMapMode);
    gaiaPanel.update(state);
    shell.status.textContent = `tick ${state.tick} · ${state.meanTemperature.toFixed(1)}°C · ${eraName(state.techLevel)}`;
  }
  renderer.draw(surface, camera);
});
loop.start();

shell.status.textContent = `seed ${state.seed} · ${state.width}×${state.height}`;
