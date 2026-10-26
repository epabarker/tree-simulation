# Roadmap

Milestones follow spec §7. A milestone is **done** when its automated checks pass in CI, its visible test has been seen in the browser, and STATUS and the devlog are updated.

Status key: ✅ done · 🚧 in progress · ⏳ not started.

## Milestones

| # | Build | Visible test (§7) | Automated check | Status |
|---|---|---|---|---|
| M0 | Metamer graph, distichous buds, all buds grow; worker, renderer, CLI, analysis | Exponential bush (Borchert–Slade explosion) | `src/core/world.test.ts`: parent-before-child; growth ratio > 1.5; alternating sides; replay; goldens | ✅ 2026-10-26 |
| M1 | C2 shadow triangle | Density regulated; shadow heatmap and bud-light overlay | `light/shadow-triangle.test.ts`: deposit pattern, Q formula, V away from shade, opaque box. `world.test.ts`: growth ≪ M0, late ratio < 1.2, most buds dormant | ✅ 2026-10-26 |
| M2 | C3 Borchert–Honda allocation | λ 0.46 → 0.56: spreading → leader | `principles/c3-allocation.test.ts`: split formula; v_base = α·Q_base = root inflow; slot shares sum to inflow; `equal` gives equal shares; height at 0.56 > 1.3 × at 0.46 (5 seeds). [λ sweep](experiments/2026-10-26-m2-lambda-sweep.md) | ✅ 2026-10-26 |
| M3 | C4 direction | Lean away from a wall; tropism sign flips spread | `principles/c4-direction.test.ts`: each term of the weighted sum; the wall shifts the centroid by > 1 cell away (5 seeds); η −0.3 crowns > 1.2 × the width of η +0.3 | ✅ 2026-10-26 |
| M4 | C5 shedding + C6 pipe girth | Clear bole; junction-exponent histogram near n | `principles/c5-c6.test.ts`: pipe sums, memory, shedding with scar and remap, grace period; radii never decrease; Δ = n everywhere without shedding; C5 sheds, shrinks crowns and doesn't lower the crown base (5 seeds). Isolated trees form only a low bole (1–6 cells); see the [calibration note](experiments/2026-10-26-m4-calibration.md) | ✅ 2026-10-26 (bole retested at M5) |
| M5 | N trees, one grid | Crowns asymmetric away from each other; short tree suppressed | `stand.test.ts` (5 seeds each): a pair leans apart; a late tree is < 0.6 × the height, < 0.3 × the metamers and < 0.3 × the Q_base of its neighbours; after a removal the neighbour's centroid moves > 2 cells into the gap; results don't depend on tree processing order. Crown bases don't lift in stands: the shadow triangle is too shallow (→ M6) | ✅ 2026-10-26 |
| M6 | Sky sweep (Beer–Lambert, K directions) | Edge trees lean outward; neighbours lean into a gap | `light/sky-sweep.test.ts` (exact Beer–Lambert, own cell, shallow rays, side light, open sides, tilt); `sky.test.ts` (5 seeds): edge trees lean out, interior crown base > 15 and > 5× open-grown, neighbours lean into a felled tree's gap, oblique sun, order independence. [Note](experiments/2026-10-26-m6-sky-sweep.md), ADR 0005 | ✅ 2026-10-26 |
| M6b | WebGL2 renderer (ADR 0001) | Same scenes at 60 fps on a phone | — | ⏳ |
| M7 | R2 physiological age; §9 species presets | Massart conifer, Rauh broadleaf, Aubréville tiers | — | ⏳ |
| M8 | R1 carbon balance | Height plateau; suppressed tree dies; crown base rises | — | ⏳ |
| M9 | R3 mechanics | Drooping limbs with upturned tips; willow; Troll straightening | — | ⏳ |
| M10 | R4 dormancy/release + R5 shade avoidance | Epicormic flush after neighbour removal; slender stand trees | — | ⏳ |
| M11 | O4 stand dynamics, then O2 | Log–log thinning line; crown gaps | — | ⏳ |

## Principles: from spec to code

| ID | Principle | Spec | Switch | Code | Tests | Overlay / colour | Status |
|---|---|---|---|---|---|---|---|
| C1 | Metamers, buds, distichous side sequence | §C1 | always on | `principles/c1-buds.ts` | `world.test.ts` | colour: order; buds | ✅ M0 |
| C2 | Shadow triangle or sky sweep → Q, V | §C2 | `c2.enabled`, `c2.model` (`sky` default, `triangle`) | `light/shadow-triangle.ts`, `light/sky-sweep.ts` | `shadow-triangle.test.ts`, `sky-sweep.test.ts`, `sky.test.ts` | shade heatmap; colour: light (branches and buds) | ✅ M1, M6 |
| C3 | Basipetal ΣQ, Borchert–Honda split | §C3 | `c3.mode` (`bh`; `equal` = §8 ablation; `none` = M0–M1 scaffold) | `principles/c3-allocation.ts` | `c3-allocation.test.ts` | colour: resource v | ✅ M2 |
| C4 | Weighted shoot direction | §C4 | `c4.enabled` | `principles/c4-direction.ts` (noise: `Purpose.directionNoise`, keyed by birthId and season) | `c4-direction.test.ts` | walls drawn | ✅ M3 |
| C5 | Self-pruning | §C5 | `c5.enabled` | `principles/c5-shedding.ts` | `c5-c6.test.ts` | shed ghosts | ✅ M4 |
| C6 | Pipe girth with memory | §C6 | `c6.enabled` | `principles/c6-girth.ts` (+ `junctionExponents`) | `c5-c6.test.ts` | width; Δ histogram chart | ✅ M4 |
| R1–R5 | Refinements | §R1–R5 | — | — | — | — | ⏳ M7–M10 |
| O1–O4 | Optional | §O1–O4 | — | — | — | — | ⏳ M11+ |

## Parameters awaiting calibration

No published value exists for these. Tune each on an isolated tree (spec §2 table) and record the result in an experiment note.

| Param | Placeholder | Notes |
|---|---|---|
| `c2.kExt` sky extinction | 0.5 | [M6](experiments/2026-10-26-m6-sky-sweep.md): ≥ 1 stalls some seedlings and thins crowns |
| `c2.K`, `skyExponent`, `minElevation` | 7, 1, 15° | Not yet swept; K = 7 shows faint streaks in the shade overlay |
| `c2.a` shadow strength (triangle) | 0.15 | [M1](experiments/2026-10-26-m1-shadow-calibration.md), [M4](experiments/2026-10-26-m4-calibration.md). M5: in 10-tree stands, 0.2 stalled 5 of 40 seedlings and 0.15 stalled none |
| `c2.b` shadow decay | 1.5 | M4 calibration: deeper shade once shedding is on |
| `c2.C` full exposure | 1 | The buds of one node share a cell, so C > a·(buds per node − 1) |
| `c5.T` shedding threshold | 0.1 | M4 calibration; ≥ 0.2 over-prunes |
| `c6.r0` tip radius | 0.08 cells | Visual only until R1/R3 |
| `c4` weights `wd, xi, eta, epsilon, sigma` | 1, 0.3, 0.15, 0.5, 20° | Palubicki Fig. 12 is qualitative. Strong upward η (0.4) can starve a seedling whose buds bunch up |

## Later (out of prototype scope)

- Arrow output from the CLI.
- An R analysis environment (`sudo dnf install R`, then the `arrow` or `readr` package).
- Rust/WASM core and WebGPU: only when the ADR 0001 triggers fire.
- Shareable URLs that hold the seed, preset and param edits.
- Embedding in the personal website.
