# SimEarth (browser)

A browser-based replica of Maxis's *SimEarth: The Living Planet* (1990), in
TypeScript. A whole planet — geology, oceans, atmosphere, climate, life, and a
simplified civilization — is simulated entirely client-side. Guide a world from
bare rock through a self-regulating climate, the rise of life and sentience, and
a civilization that launches the **Exodus** to the stars.

The signature mechanic is **Gaia regulation**: as the Sun slowly brightens, a
healthy biosphere draws CO₂ down (via temperature-dependent silicate weathering)
to hold the planet habitable. Sabotage the biosphere and the world cooks.

## Develop

```bash
npm install
npm run dev        # Vite dev server
npm test           # Vitest (run once)
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build
npm run lint       # eslint + prettier --check
```

## Architecture

- **`src/sim/`** — the simulation core. Pure, headless, deterministic: seeded
  PRNG, typed-array Structure-of-Arrays state, a tick loop running ordered
  systems (geosphere → climate → biosphere → civilization). No DOM; runnable in
  tests. See `docs/SPEC.md` and `docs/CLIMATE.md`.
- **`src/render/`** — Canvas 2D renderer; reads state, never mutates it. Ten map
  modes (surface, elevation, temperature, rainfall, wind, currents, biomes,
  life, population, pollution).
- **`src/ui/`** — panels, tools, and controls; mutates the world only through
  the command interface (`src/sim/commands.ts`).
- **`src/persistence/`** — IndexedDB save/load.
- **`src/app/`** — composition root: owns the simulation, the render/sim loop
  (speed-controlled), and wires the UI.

The simulation is the source of truth; the renderer and UI are views over it.

## Deploy (GitHub Pages)

The build uses a relative base, so `dist/` works from a project sub-path.
`.github/workflows/deploy.yml` lints, tests, builds, and publishes to Pages on
push to `main` — enable Pages (source: GitHub Actions) on the repository once a
remote is configured.

## Status

MVP complete (milestones M0–M7 in `docs/TASKS.md`) and **live at
<https://bradewing.github.io/simearth/>**.
