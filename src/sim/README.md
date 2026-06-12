# `src/sim` — simulation core

The living planet. Pure, headless TypeScript: **no `window`, `document`, canvas, or
DOM** (enforced by ESLint). Runs in tests and, later, a Web Worker.

Rules:
- **Deterministic.** All randomness flows through the seeded PRNG carried in state.
  `Math.random()` is banned here (enforced by ESLint).
- **Serializable state.** Typed-array Structure-of-Arrays + plain scalars. No class
  instances or closures in the hot state, so it round-trips through save/load and
  transfers to a worker.
- **Systems** expose `update(state, dt, rng)` and communicate only through shared state
  fields. They never call into render or UI.

See `../../docs/SPEC.md` §3–4 for the world model and system list.
