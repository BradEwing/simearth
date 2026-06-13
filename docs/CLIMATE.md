# Climate model

The climate is an energy-balance model (EBM, Budyko–Sellers style) chosen because
it is linear, stable, cheap, and — crucially — exhibits the **silicate-weathering
thermostat** that produces Gaia homeostasis (SPEC §4.3). This doc is the reference
for the constants and feedbacks; the code lives in `src/sim/atmosphere/`.

## Energy balance

Per tile, at (quasi-)equilibrium each tick:

```
absorbed_i + C·(T̄ − T_i) = A_eff + B·T_i
```

- `absorbed_i = (S₀/4)·L·(1 − albedo_i)·insolation(latᵢ)` — incoming shortwave.
  `S₀` solar constant, `L` luminosity multiplier (rises over time, M3.3),
  `insolation(lat)` the latitude profile (2nd-Legendre approx; equator ≈ 1.24×,
  poles ≈ 0.52× the mean).
- `A_eff + B·T_i` — outgoing longwave (linearized). Greenhouse lowers `A_eff`:
  `A_eff = A₀ − ΔF(CO₂)`, with `ΔF = k·ln(CO₂/CO₂_ref)` (M3.2).
- `C·(T̄ − T_i)` — poleward heat transport, relaxing tiles toward the global mean.

Because transport conserves energy, the **global mean is exact and transport-free**:

```
T̄ = (S₀/4 · L · (1 − ᾱ) · insolation̄ − A_eff) / B
```

so we compute `T̄` directly (area/`cos`-weighted), then each `T_i` from it. No
relaxation iteration needed.

## The thermostat (Gaia)

CO₂ evolves as `dCO₂/dt = sources − sinks`:

- **Sources:** volcanic outgassing (≈ constant), respiration, pollution (M5).
- **Sink:** carbonate–silicate weathering, which **rises with temperature** (M3.4).
  Life amplifies it (M4).

At steady state `weathering(T̄) = outgassing`. Since outgassing is ~fixed, this
pins `T̄` regardless of `L`: as the Sun brightens, CO₂ is drawn down to hold the
temperature in the habitable band. A dead/parched planet weathers weakly and
overheats — the contrast the M4 checkpoint measures.

## Constants (present-day-ish anchors)

| Symbol | Value | Meaning |
|---|---|---|
| S₀ | 1361 W/m² | solar constant |
| A₀ | 204 W/m² | OLR intercept |
| B | 2.17 W/m²/°C | OLR slope |
| C | 3.8 W/m²/°C | heat transport |
| ᾱ | 0.30 | baseline albedo (until M3.5) |
| CO₂_ref | 280 | forcing-zero reference |
| k | 5.35 W/m² | CO₂ forcing coefficient |

These yield T̄ ≈ 15–16 °C at `L = 1`, CO₂ = ref. Values are gameplay-tunable;
keep this table and the code's `climateConstants.ts` in sync.
