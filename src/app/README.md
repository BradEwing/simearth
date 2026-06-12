# `src/app` — composition root

Wires the layers together: owns the simulation instance, the render loop, and the UI,
and routes UI commands into the sim. The only place that depends on `sim`, `render`, and
`ui` at once. Entry point: `main.ts`.
