import './style.css';
import { mountShell } from '@ui/shell';
import { attachCanvasSurface } from '@render/canvas';
import { createWorldState } from '@sim/state';
import { generateTerrain } from '@sim/geosphere/terrain';
import { classifySurface } from '@sim/geosphere/surface';
import { PlanetRenderer } from '@render/planetRenderer';
import { surfaceMapMode } from '@render/mapModes';
import { createCamera } from '@render/camera';
import { RenderLoop } from '@render/renderLoop';
import { attachCameraControls } from '@ui/cameraControls';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('#app root element not found');

const shell = mountShell(root);

// Build a planet. (Seed entry / new-game flow arrives in M7.)
const state = createWorldState({ seed: 'simearth' });
generateTerrain(state);
classifySurface(state);

const renderer = new PlanetRenderer(state.width, state.height);
renderer.update(state, surfaceMapMode);

const camera = createCamera(8);
const { surface } = attachCanvasSurface(shell.canvas);
attachCameraControls(shell.canvas, camera);

// Render loop runs at display refresh, independent of the (not-yet-running)
// simulation tick — it just re-blits the current state and camera each frame.
const loop = new RenderLoop(() => renderer.draw(surface, camera));
loop.start();

shell.status.textContent = `seed ${state.seed} · ${state.width}×${state.height}`;
