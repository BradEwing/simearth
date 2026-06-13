# SimEarth — Implementation Plan

Sequenced milestones for the MVP defined in `SPEC.md`. Ordering is dependency-driven:
each milestone builds a working, demonstrable slice on top of the last. Within a milestone,
each checkbox is sized to be **one atomic commit** (builds green, tests pass).

**Working agreement for autonomous runs** (see also memory `simearth-dispatch-workflow`):
- Drive with the `/loop` skill.
- Commit after each checkbox: small, self-contained, green.
- Compact / start a fresh session at milestone boundaries or when context bloats.
- Keep `src/sim/` headless and deterministic at every step. Add tests alongside systems.
- Update this file's checkboxes as work lands; if reality diverges from the plan, fix the
  plan in the same commit.

---

## M0 — Project scaffold
Goal: an empty but deployable, tested, typed app skeleton.

- [x] Vite + TypeScript (strict) project; `package.json` scripts (`dev`/`build`/`test`).
- [x] Vitest wired with one trivial passing test.
- [x] `vite.config.ts` with `base` set for GitHub Pages; relative asset URLs.
- [x] GitHub Actions workflow: build + deploy `dist/` to Pages.
- [x] Directory skeleton: `src/sim/`, `src/render/`, `src/ui/`, `src/app/`; lint/format config.
- [x] App boots to a blank canvas + empty UI shell.

## M1 — Core sim harness
Goal: a deterministic, headless, tickable world with serializable state.

- [x] Seeded PRNG module + tests (reproducibility, distribution sanity).
- [x] State definition: typed-array SoA fields + global scalars; allocation by W×H.
- [x] Tick loop + system-registry ordering; `update(state, dt, rng)` contract.
- [x] Grid helpers: index/wrap math (longitude wrap, pole clamping), neighbor iteration + tests.
- [x] Save/load: serialize/deserialize full state (incl. seed), versioned; round-trip test.

## M2 — Geosphere + first render
Goal: see a procedurally generated planet on screen.

- [x] Seeded terrain generation (noise → altitude); continents/oceans; tests for determinism.
- [x] Surface classification (ocean/coast/land/mountain/ice) from altitude + sea level.
- [x] Canvas tile renderer: altitude/surface map mode; pan/zoom; longitude-wrap rendering.
- [x] Render loop decoupled from sim tick; reads state read-only.
- [x] Pixel-art tile palette for surface types.

## M3 — Atmosphere & climate (the core loop)
Goal: a planet with a regulating climate.

- [x] Latitude insolation + base temperature field; temperature map mode.
- [x] Greenhouse: CO₂ scalar → temperature forcing; volcanic/respiration sources.
- [x] Rising solar luminosity over ticks (stellar evolution).
- [x] Carbonate–silicate weathering: temperature-dependent CO₂ drawdown (negative feedback).
- [x] Albedo from ice/surface → feedback; ice-age hysteresis.
- [x] Hydrosphere: sea level driven by global ice budget; coastline updates.
- [x] Ocean currents vector field + heat advection; current map mode.
- [x] Wind bands + rainfall (orographic + rain shadow); rainfall/wind map modes.
- [x] Erosion driven by rainfall/slope feeding back into geosphere.
- [x] **Integration checkpoint:** verify emergent regulation holds mean temp habitable as the sun brightens (headless test over many ticks).

## M4 — Biosphere
Goal: life that spreads, evolves, and regulates the planet.

- [x] Biome assignment from temperature × rainfall (Whittaker); biome map mode + palette.
- [x] Biome effects on albedo and carbon uptake (close Gaia loop with life).
- [x] Life-class model: tolerances, spreading into suitable neighbors, competition, decline.
- [x] Life map mode; place-life tool.
- [x] Sentience accumulation + threshold → sentient-species event.
- [x] **Integration checkpoint:** biotic regulation measurably outperforms a dead planet (test).

## M5 — Civilization & win condition
Goal: a complete playable arc ending in Exodus.

- [x] Settlement founding from a sentient species; spread across habitable land.
- [x] Tech progression (condensed eras) raising population ceilings.
- [x] Pollution from tech/population feeding CO₂/pollution fields (climate feedback).
- [x] Pollution map mode; population/city rendering.
- [x] Exodus win condition + victory screen.

## M6 — Player tools & model panels
Goal: the player can shape and read the world like the original.

- [ ] Tool framework + action/command interface into sim (no direct mutation from UI).
- [ ] Terraform (raise/lower), water add/remove tools.
- [ ] Event tools: volcano, meteor, earthquake.
- [x] Map-mode switcher UI for all overlays.
- [ ] Gaia/model panel: live planetary read-outs (temp, CO₂/O₂, sea level, biomass, pop, solar, era).
- [ ] Adjustable model parameter(s) (e.g., greenhouse strength) for experimentation.
- [x] Speed control (pause/slow/normal/fast).

## M7 — Persistence, polish, ship
Goal: shippable MVP.

- [ ] Save/load UI to IndexedDB; multiple named saves.
- [ ] Export/import planet to file.
- [ ] New-game flow: seed entry / randomize; starting conditions.
- [ ] Performance pass at default grid; (optional) move sim into a Web Worker.
- [ ] Onboarding/help overlay; basic responsive layout.
- [ ] Deploy to GitHub Pages; verify the live build end-to-end.

---

## Cross-cutting (apply throughout, not a milestone)
- Determinism guardrail: a test that runs N ticks twice from one seed and asserts identical state.
- Keep `SPEC.md` and this file honest — amend in the same commit when scope shifts.
- Performance budget checks as fields/systems are added (watch the per-tick cost).
