// Dev-only visual check: renders the real terrain→classify→color pipeline to a
// PNG so the planet can be eyeballed without a browser. Run via vite-node.
import { writeFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
import { createWorldState } from '../src/sim/state';
import { generateTerrain } from '../src/sim/geosphere/terrain';
import { classifySurface } from '../src/sim/geosphere/surface';
import { Simulation } from '../src/sim/simulation';
import { initClimate } from '../src/sim/atmosphere/climate';
import { WORLD_SYSTEMS } from '../src/sim/worldSystems';
import { eraName, totalPopulation } from '../src/sim/civilization/civilization';
import {
  surfaceMapMode,
  altitudeMapMode,
  temperatureMapMode,
  currentMapMode,
  rainfallMapMode,
  windMapMode,
  biomeMapMode,
  lifeMapMode,
  populationMapMode,
  pollutionMapMode,
  type MapMode,
} from '../src/render/mapModes';

function chunk(type: string, data: Buffer): Buffer {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(w: number, h: number, rgba: Uint8ClampedArray, scale: number): Buffer {
  const W = w * scale;
  const H = h * scale;
  const stride = 1 + W * 4;
  const raw = Buffer.alloc(H * stride);
  for (let y = 0; y < H; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter: none
    const sy = (y / scale) | 0;
    for (let x = 0; x < W; x++) {
      const si = (sy * w + ((x / scale) | 0)) * 4;
      const di = rowStart + 1 + x * 4;
      raw[di] = rgba[si]!;
      raw[di + 1] = rgba[si + 1]!;
      raw[di + 2] = rgba[si + 2]!;
      raw[di + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const state = createWorldState({ seed: 'simearth', width: 96, height: 48 });
generateTerrain(state);
classifySurface(state);
initClimate(state);

// Run the full arc: climate → life → sentience → civilization → Exodus.
const sim = new Simulation(state, WORLD_SYSTEMS);
const TICKS = 12000;
for (let t = 0; t < TICKS && state.exodusTick < 0; t++) sim.tick();

const rgba = new Uint8ClampedArray(state.width * state.height * 4);
const renderMode = (mode: MapMode, file: string): void => {
  mode.paint(state, rgba);
  writeFileSync(file, encodePNG(state.width, state.height, rgba, 8));
  console.log(`wrote ${file}`);
};

renderMode(surfaceMapMode, '/tmp/planet-surface.png');
renderMode(altitudeMapMode, '/tmp/planet-altitude.png');
renderMode(temperatureMapMode, '/tmp/planet-temperature.png');
renderMode(currentMapMode, '/tmp/planet-currents.png');
renderMode(rainfallMapMode, '/tmp/planet-rainfall.png');
renderMode(windMapMode, '/tmp/planet-wind.png');
renderMode(biomeMapMode, '/tmp/planet-biome.png');
renderMode(lifeMapMode, '/tmp/planet-life.png');
renderMode(populationMapMode, '/tmp/planet-population.png');
renderMode(pollutionMapMode, '/tmp/planet-pollution.png');

let maxStage = 0;
for (let i = 0; i < state.lifeStage.length; i++) {
  if (state.lifeStage[i]! > maxStage) maxStage = state.lifeStage[i]!;
}
console.log('--- planetary history ---');
console.log(`ticks run: ${state.tick}`);
console.log(
  `mean temperature: ${state.meanTemperature.toFixed(1)} C, CO2 ${state.co2.toFixed(1)}`,
);
console.log(`life: max stage ${maxStage}`);
console.log(`sentience emerged: ${state.sentienceEmergedTick}`);
console.log(`tech: ${state.techLevel.toFixed(2)} (${eraName(state.techLevel)})`);
console.log(`population: ${totalPopulation(state).toFixed(1)}`);
console.log(
  `exodus: ${state.exodusTick >= 0 ? `WON at tick ${state.exodusTick}` : 'not yet'}`,
);
