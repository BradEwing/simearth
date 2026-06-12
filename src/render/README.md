# `src/render` — rendering

Draws the planet to a Canvas 2D context. **Reads simulation state; never mutates it.**

Responsibilities:
- Tile rendering of the grid with longitude wrap, pan/zoom.
- Data-overlay "map modes" (altitude, temperature, rainfall, biome, life, currents,
  pollution) — each is a read-only projection of existing state fields to colors.
- Decoupled from the sim tick: the render loop runs on its own cadence and snapshots
  whatever state is current.
