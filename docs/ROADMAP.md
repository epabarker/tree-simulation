# Roadmap

Milestones follow spec §7. A milestone is **done** when its automated checks pass in CI, its visible test has been seen in the browser, and STATUS and the devlog are updated.

Status key: ✅ done · 🚧 in progress · ⏳ not started.

## Milestones

| # | Build | Visible test (§7) | Automated check | Status |
|---|---|---|---|---|
| M0 | Metamer graph, distichous buds, all buds grow; worker, renderer, CLI, analysis | Exponential bush (Borchert–Slade explosion) | `src/core/world.test.ts`: parent-before-child; growth ratio > 1.5; alternating sides; replay; goldens | ✅ 2026-10-26 |
| M1 | C2 shadow triangle | Density regulated; shadow heatmap and bud-light overlay | Deposit pattern a·b^(−q); growth ratio below M0's | ⏳ |
| M2 | C3 Borchert–Honda allocation | λ 0.46 → 0.56: spreading → leader | Σ v at buds = v_base; leader dominance at 0.56 > at 0.46 (5 seeds); λ sweep note | ⏳ |
| M3 | C4 direction | Lean away from a wall; tropism sign flips spread | Wall pushes the centroid away; tropism sign changes width | ⏳ |
| M4 | C5 shedding + C6 pipe girth | Clear bole; junction-exponent histogram near n | Radii never decrease; Δ = n at unscarred junctions; bole with C5 on, none off | ⏳ |
| M5 | N trees, one grid | Crowns asymmetric away from each other; short tree suppressed | Two trees lean apart; a late tree gets less Q; removal → neighbour leans into the gap | ⏳ |
| M6 | Sky sweep (Beer–Lambert, K directions); WebGL2 renderer | Edge trees lean outward; neighbours lean into a gap | — | ⏳ |
| M7 | R2 physiological age; §9 species presets | Massart conifer, Rauh broadleaf, Aubréville tiers | — | ⏳ |
| M8 | R1 carbon balance | Height plateau; suppressed tree dies; crown base rises | — | ⏳ |
| M9 | R3 mechanics | Drooping limbs with upturned tips; willow; Troll straightening | — | ⏳ |
| M10 | R4 dormancy/release + R5 shade avoidance | Epicormic flush after neighbour removal; slender stand trees | — | ⏳ |
| M11 | O4 stand dynamics, then O2 | Log–log thinning line; crown gaps | — | ⏳ |

## Principles: from spec to code

| ID | Principle | Spec | Switch | Code | Tests | Overlay / colour | Status |
|---|---|---|---|---|---|---|---|
| C1 | Metamers, buds, distichous side sequence | §C1 | always on | `principles/c1-buds.ts` | `world.test.ts` | colour: order; buds | ✅ M0 |
| C2 | Shadow triangle → Q, V | §C2 | `c2.enabled` | `light/` | — | shadow heatmap; colour: light | ⏳ M1 |
| C3 | Basipetal ΣQ, Borchert–Honda split | §C3 | `c3.mode` (`bh`/`equal`/`none`) | `principles/c3-allocation.ts` (basipetal pass and `none` mode exist) | — | colour: resource | ⏳ M2 |
| C4 | Weighted shoot direction | §C4 | `c4.enabled` | — | — | — | ⏳ M3 |
| C5 | Self-pruning | §C5 | `c5.enabled` | — | — | shed ghosts | ⏳ M4 |
| C6 | Pipe girth with memory | §C6 | `c6.enabled` | — | — | width | ⏳ M4 |
| R1–R5 | Refinements | §R1–R5 | — | — | — | — | ⏳ M7–M10 |
| O1–O4 | Optional | §O1–O4 | — | — | — | — | ⏳ M11+ |

## Parameters awaiting calibration

No published value exists for these. Tune each on an isolated tree (spec §2 table) and record the result in an experiment note.

| Param | Placeholder | Notes |
|---|---|---|
| `c2.a` shadow strength | 1 | Palubicki gives only a > 0. In 2D, lower a or raise b (§2) |
| `c2.b` shadow decay | 2 | b > 1 |
| `c2.C` full exposure | 1 | |
| `c5.T` shedding threshold | 0.3 | Light per metamer; recalibrate for 2D (§C5.5) |
| `c6.r0` tip radius | 0.08 cells | Visual only until R1/R3 |
| `c4` weights `wd, xi, eta, sigma` | 1, 0.3, 0.15, 8° | Palubicki Fig. 12 is qualitative |

## Later (out of prototype scope)

- Arrow output from the CLI.
- An R analysis environment (`sudo dnf install R`, then the `arrow` or `readr` package).
- Rust/WASM core and WebGPU: only when the ADR 0001 triggers fire.
- Shareable URLs that hold the seed, preset and param edits.
- Embedding in the personal website.
