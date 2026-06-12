# `src/ui` — user interface

Panels, tools, and controls (modern, retro-flavored). **Mutates simulation state only
through the explicit action/command interface** — never by reaching into state directly.

Responsibilities:
- Tool framework (terraform, water, events, place-life) dispatching commands into the sim.
- Gaia/model panel: live planetary read-outs and adjustable model parameters.
- Map-mode switcher, speed control, save/load UI.
