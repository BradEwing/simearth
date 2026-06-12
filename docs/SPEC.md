# SimEarth (Browser) — MVP Specification

A browser-based replica of Maxis's *SimEarth: The Living Planet* (1990), in TypeScript,
deployable as a static site on GitHub Pages. The planet — geology, oceans, atmosphere,
climate, life, and a simplified civilization — is simulated entirely client-side.

This document is the source of truth for **what** the MVP is. Implementation sequencing
lives in `TASKS.md`. Where the original game and good engineering disagree, this spec
records the decision and why.

---

## 1. Design pillars

1. **The simulation is the product.** SimEarth's appeal is a living planet that surprises
   you. Depth and correct feedback loops matter more than feature count or chrome.
2. **Faithful in feel, modern in build.** We reproduce the original's systems and
   information density, not its 1990 Mac chrome or (copyrighted) art.
3. **Gaia is the throughline.** The defining loop is a biosphere that regulates a planet
   against a slowly brightening sun. This is mechanically central, not flavor.
4. **Deterministic and inspectable.** Same seed + same inputs → same run, every time.
   The player can open any layer and see why the planet is doing what it's doing.

---

## 2. MVP scope decisions

These were decided collaboratively. Each line is a boundary; anything labeled *phase 2*
is explicitly **out** of the MVP.

| Area | MVP decision | Deferred to phase 2 |
|---|---|---|
| **Playable arc** | Full arc: rock → life → sentience → tech eras → **Exodus** win condition. Civilization is *simplified*. | Energy-allocation micromanagement; detailed war/plague; philosophical bent. |
| **Geosphere** | Terrain from seeded generation; reshaped by volcanoes, meteors, erosion, sea-level change. | Continental drift / plate migration. |
| **Economy** | Sandbox: unlimited energy, all tools free. | Ω energy budget replenished by biomass (game mode). |
| **UI** | Modern, responsive panels + pixel-art tiles + original info density. | Faithful System-6 windowed recreation. |
| **Topology** | Cylindrical wrap: grid wraps east–west, poles are impassable top/bottom rows. Latitude drives climate bands. | Rotating-globe projection view. |
| **Time** | Single tick, player-selectable speed. Era is *emergent* from low/high per-tick process rates. | Nested per-era timescales. |
| **Life** | Biomes (temp × rainfall, Whittaker-style) + life classes that spread, compete, and evolve toward sentience. | Explicit trophic food web with population dynamics. |
| **Climate** | Temperature/latitude bands, greenhouse CO₂ feedback, rainfall & wind, ocean currents, **rising solar output with Gaia regulation**. | — (climate is the most complete system in the MVP). |

---

## 3. The world model

### 3.1 Grid

- A rectangular tile grid, default **128 (lon) × 64 (lat)**. Size is configurable; all
  sim code reads dimensions from state, never hard-codes them.
- **Topology:** longitude wraps (x = -1 ≡ x = W-1); latitude does not — row 0 and row H-1
  are the poles and act as closed boundaries.
- **Latitude → climate:** row index maps to latitude in [-90°, +90°]; insolation falls off
  toward the poles. This is the primary driver of temperature bands.

### 3.2 State layout (Structure-of-Arrays)

Sim state is **typed arrays, one per field**, length `W*H`, indexed `y*W + x`. This is
fast, cache-friendly, trivially serializable, and worker-transferable. **No per-tile
objects, no class instances in the hot state.**

Representative fields (final list in code):

- Geosphere: `altitude` (Float32, below/above sea level), `surfaceType` (Uint8: ocean /
  coast / land / mountain / ice), `rockAge`/material as needed.
- Hydrosphere: `seaLevel` (global scalar), derived water mask, `currentU`/`currentV`
  (ocean current vectors), ice coverage.
- Atmosphere: `temperature` (Float32), `rainfall` (Float32), `windU`/`windV`,
  global scalars for `CO2`, `O2`, solar luminosity, mean temp.
- Biosphere: `biome` (Uint8), per-class presence/biomass (`Uint8`/`Float32` per life
  class), `sentienceProgress`.
- Civilization: `population`, `techLevel`, `pollution`, city markers.

### 3.3 Global scalars & the clock

A single `tick` counter advances the world. Process rates are tuned so geologic events are
rare per tick and civ events frequent — the player experiences "eras" without the engine
modeling them as modes. Speed control (pause / slow / normal / fast) changes ticks-per-
second, not simulation semantics.

---

## 4. Simulation systems

Each system is a module with an explicit `update(state, dt, rng)` step and no knowledge of
rendering. Systems run in a fixed order each tick. Inter-system coupling happens only
through shared state fields, documented here.

### 4.1 Geosphere

- **Generation:** seeded procedural terrain (value/Perlin-style noise → altitude field),
  producing continents and ocean basins. Seed is part of save state.
- **Erosion:** rainfall and slope gradually lower high terrain and silt up lows.
- **Events:** volcanoes (raise land, inject CO₂ + ash), meteor strikes (crater, dust →
  transient cooling), earthquakes. Events are player-triggered or random (rate-tuned).
- **No drift:** landmasses do not migrate. Sea-level changes (from ice melt/freeze) move
  coastlines instead.

### 4.2 Hydrosphere

- Tiles below `seaLevel` are ocean. Global ice budget shifts `seaLevel`: colder planet →
  more ice → lower seas → more exposed land (and vice versa). This couples climate ↔ map.
- **Ocean currents:** a stable, mostly-static-per-epoch vector field (wind-driven gyres +
  latitudinal flow) that **transports heat**, warming poles and moderating equators.
  Recomputed when coastlines change materially, not every tick.

### 4.3 Atmosphere & climate — the core loop

This is the most complete system in the MVP. Temperature at a tile is a function of:

`solar insolation (by latitude, time) × albedo + greenhouse forcing + heat advection (wind + ocean currents) − radiative loss`

Coupled pieces:

- **Rising solar output.** Luminosity increases slowly with `tick` to model stellar
  evolution (the faint-young-sun problem). Left unchecked, the planet trends to a runaway
  greenhouse — survival depends on regulation.
- **Greenhouse.** `CO2` (and other GHGs) trap heat. Sources: volcanism, respiration,
  pollution. Sinks: photosynthesis, ocean/rock uptake.
- **Carbonate–silicate weathering.** CO₂ drawdown by rock weathering *increases with
  temperature* — a negative feedback that cools a hot planet and warms a cold one.
- **Biotic regulation (Gaia / Daisyworld).** Life amplifies regulation: photosynthesizers
  draw down CO₂ and shift albedo. As the sun brightens over eons, a healthy biosphere keeps
  mean temperature inside the habitable band by drawing CO₂ down. A dead planet cannot, and
  cooks. **This emergent homeostasis is the signature behavior we are building toward.**
- **Albedo:** ice and clouds reflect (cooling); ocean and forest absorb (warming) — feeds
  back into temperature, enabling ice-age hysteresis.

### 4.4 Rainfall & wind

- Prevailing winds from latitude bands (trade winds, westerlies). Winds carry moisture off
  oceans; rainfall drops on windward slopes (orographic) and falls inland/leeward (rain
  shadow). Rainfall drives biomes (§4.5) and erosion (§4.1).

### 4.5 Biosphere

- **Biomes** are assigned per land tile from temperature × rainfall (Whittaker diagram):
  desert, grassland, forest, jungle, taiga, tundra, swamp, etc. Biomes set albedo, carbon
  uptake, and habitability.
- **Life classes** (graded, simplified from the original): prokaryotes → eukaryotes →
  plants / radiates / arthropods / amphibians / reptiles / mammals / etc. Each class has
  environmental tolerances. Classes spread into suitable neighboring tiles, compete where
  they overlap, and decline outside tolerance.
- **Evolution toward sentience.** Sustained, advanced, stable life accumulates
  `sentienceProgress`. Crossing the threshold yields a **sentient species** — the bridge to
  the civilization stage. (Player tools and rare events can nudge this.)

### 4.6 Civilization (simplified)

- A sentient species founds settlements that spread across habitable land along a tech
  progression (Stone → Bronze → Iron → Industrial → Information → Nanotech, condensed).
- **Tech advances** raise population ceilings and unlock the **Exodus**.
- **Pollution** scales with tech/population and feeds `CO2`/pollution fields — closing the
  loop back into climate (industrial civilizations can cook their own planet).
- **Win condition — Exodus:** reaching the top tech tier with sufficient stable population
  triggers the Exodus (civilization departs the planet) → **victory screen**.
- *Deferred:* energy-allocation sliders, explicit war/plague resolution, philosophy.

---

## 5. Player interaction

- **Tools** (sandbox, free): terraform raise/lower; add/remove water; trigger volcano /
  meteor / earthquake; place life class; paint/seed biome; place atmosphere-affecting
  events. Curated toolset, extensible.
- **Model panels (the "Gaia window"):** read-outs of planetary state — mean temperature,
  CO₂/O₂, sea level, biomass, biome distribution, population, solar output, current era —
  plus a small set of adjustable model parameters (e.g., greenhouse strength) for
  experimentation. Faithful to the original's data-rich panels without its chrome.
- **Data overlays (map modes):** the map can render by altitude, temperature, rainfall,
  biome, life, air/ocean currents, pollution. Cheap to compute (they read existing fields)
  and iconic — included in MVP.
- **Speed control:** pause / slow / normal / fast.

---

## 6. Persistence

- **Save/load** the full sim state (typed arrays + scalars + seed) to **IndexedDB**;
  **export/import** to a `.json`/binary file for sharing.
- Saves are versioned; loader tolerates older versions or refuses with a clear message.
- No network, no accounts — everything is local (GitHub Pages constraint).

---

## 7. Technical constraints & targets

- **Static-only.** No backend. Build must run from a non-root base path (`/<repo>/`); set
  Vite `base` and use relative asset URLs.
- **Determinism.** All sim randomness flows through one seeded PRNG carried in state.
  `Math.random()` is banned in `src/sim/`.
- **Decoupling.** `src/sim/` has zero DOM/canvas/`window` references and runs headless in
  tests. Rendering reads state and never mutates it; UI mutates state only through an
  explicit action/command interface.
- **Performance.** Target a smooth tick at default grid size on a mid laptop. Sim uses
  typed-array SoA so it can move into a **Web Worker** later without reshaping state
  (transferable buffers). Worker move is allowed but not required for MVP.
- **Toolchain.** Vite + TypeScript (strict) + Vitest; Canvas 2D rendering; GitHub Actions
  deploy of `dist/` to Pages.

---

## 8. What "done" means for the MVP

A player can: generate a seeded planet; watch terrain, oceans, climate, and life evolve;
use tools to shape the world; observe **Gaia regulation** hold the climate habitable
against a brightening sun (and watch it fail on a sabotaged/dead planet); guide life to
sentience; see a simplified civilization rise, pollute, advance through tech, and trigger
the **Exodus** win; and save/load the planet — all in a browser served from GitHub Pages.
