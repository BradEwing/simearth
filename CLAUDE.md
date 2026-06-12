# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A browser-based replica of the original SimEarth (Maxis, 1990) written in TypeScript. The planet simulation — terrain, atmosphere, climate, life evolution, and civilization — runs entirely in the browser.

**Hard constraint:** the game must be deployable as a static site on GitHub Pages. No backend, no server-side code, no APIs that require a server for the MVP. Save games use browser storage (localStorage/IndexedDB). All build output must work from a non-root base path (GitHub Pages serves from `/<repo-name>/`).

## Status

Greenfield, spec agreed, implementation not yet started. **Read `docs/SPEC.md` (what the MVP is) and `docs/TASKS.md` (sequenced milestones) before writing code** — they are the source of truth. Don't invent requirements that contradict them; if scope shifts, amend those files in the same commit.

Locked MVP decisions (details in `SPEC.md`): full arc rock→life→sentience→tech→**Exodus** with a *simplified* civilization; geosphere shaped by events/erosion (no plate drift); sandbox economy (free tools); modern retro-flavored UI; **cylindrical-wrap** grid (longitude wraps, poles closed); single tick with selectable speed (eras emergent); biomes + graded life classes (no full food web); full climate model including ocean currents and a **rising solar output that the biosphere must regulate against (Gaia/Daisyworld) — the signature mechanic**.

## Planned toolchain

- **Vite** for dev server and bundling (set `base` in `vite.config.ts` for GitHub Pages)
- **Vitest** for tests
- **TypeScript** in strict mode
- **Canvas 2D** for rendering the planet grid (no game framework unless the spec says otherwise)
- **GitHub Actions** for deploying `dist/` to Pages

Expected commands once scaffolded:

```bash
npm run dev          # Vite dev server
npm run build        # typecheck + production build
npm test             # run all tests (vitest)
npx vitest run path/to/file.test.ts   # run a single test file
npx vitest -t "name"                  # run tests matching a name
```

If these commands don't match `package.json`, trust `package.json` and update this file.

## Architecture principles

These hold regardless of how the spec evolves:

- **Simulation core is pure TypeScript, fully decoupled from the DOM and rendering.** It must be runnable headless (in tests, or a worker). No `window`, `document`, or canvas references inside `src/sim/`.
- **The simulation is deterministic and tick-based.** Given the same seed and inputs, a run reproduces exactly. All randomness flows through a seeded PRNG owned by the simulation state — never `Math.random()` in sim code.
- **SimEarth models the planet as interacting layers** (geosphere, hydrosphere, atmosphere, biosphere, civilization) over a wrapped tile grid. Keep each layer's update logic in its own module with explicit interfaces between layers, so layers can be developed and tested independently.
- **Rendering reads simulation state; it never mutates it.** UI actions (placing life, adjusting model sliders, triggering events) go through an explicit action/command interface into the sim.
- **Sim state must be serializable** (plain data, no class instances holding closures) to support save/load and potentially moving the sim into a Web Worker later.
