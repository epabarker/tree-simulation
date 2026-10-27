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
| M6b | WebGL2 renderer (ADR 0001) | Same scenes at 60 fps on a phone | `web/render/scene.test.ts` (shared scene: positions match the core, taper, grow-in, picking, leaves). Measured (desktop, headless Firefox): stand 2.3 ms vs 19 ms CPU per frame (Canvas 2D), 28k metamers 5.8 ms at 60 fps. Phone not yet measured on a device | ✅ 2026-10-27 |
| M6c | Pseudo-depth natural view (ADR 0008, page only); r0 = 0.02; slenderness metric | Crowns read as full discs; `depth` off shows the x-ray shell; realistic H/D | `scene.test.ts`: cluster count, back/front split, stable depth across frames, x-ray view unchanged. `metrics`: interior `skyStand` H/D in 50–90, open-grown below the stand median (5 seeds). Goldens regenerated for r0. Measured: interior stand H/D 62–72, open-grown 41–43 (5 seeds, season 45). [Figure](experiments/figures/2026-10-27-m6c-depth-view.png) | ✅ 2026-10-27 (phone not yet seen) |
| M6d | C5 relative threshold (ADR 0007); R6 short shoots (ADR 0006) | Suppressed trees keep deeper crowns; leafy older limbs | C5 unit test (same branch light shed under a bright top, kept under a dim one); suppressed vs dominant crown depth (5 seeds). R6 unit test of bud fate; R6 off leaves goldens unchanged; `shortShoots` preset + golden; short-shoot leaf share > 50% and deeper mean leaf depth. [Experiment note](experiments/2026-10-27-m6d-shedding-short-shoots.md); `sky.test.ts` M6d checks (overtopped tree > 2× metamers and crown depth; short-shoot share > 0.4; gaps still filled) | ✅ 2026-10-27 |
| M6e | Light calibration: `groundLight` metric, k_ext, K, optional `c2.rotate`, overcast preset | Ground light under a closed stand 2–10% of open sky; no K streaks | `sky-sweep.test.ts`: `c2.rotate` keeps Σw = C and moves the directions each season (off: fixed grid). `sky.test.ts` (5 seeds): `groundLight` full on bare ground, low under a crown; interior floor 2–10% of open sky at season 45; K = 7 vs K = 15 within 10% on width, height, size, H/D and 25% on bole, no stalls. `overcast` preset + golden. Measured: floor 3.5–6% for k_ext 0.25–0.75 (the canopy adjusts its leaf area); K = 7 converged except a crown base ≈ 7 cells lower than K = 31. [Note](experiments/2026-10-27-m6e-light-calibration.md) | ✅ 2026-10-27 |
| M7 | R2 physiological age; §9 species presets | Massart conifer, Rauh broadleaf, Aubréville tiers | — Also: A_set per order and light; species knobs k_ext, T, T_rel; c4 weights fitted on patterns (branch angle, width/height, lean) | ⏳ |
| M8 | R1 carbon balance, two switchable plateau causes (L_h; reproductive sink after a size threshold) | Height plateau; suppressed tree dies; crown base rises | — | ⏳ |
| M9 | R3 mechanics | Drooping limbs with upturned tips; willow; Troll straightening | — Expect Δ > 2 at heavy, wide junctions | ⏳ |
| M10 | R4 dormancy/release + R5 shade avoidance (elongation, fewer bud breaks, upright A_set) | Epicormic flush after neighbour removal; slender stand trees | — | ⏳ |
| M11 | O4 stand dynamics, then O2 | Log–log thinning line; crown gaps | — Validate slope, size CV and bimodality together. First give the world sides that act like a continuing forest (periodic, or canopy beyond the sides): open sides light every stand from its edges (M6e) | ⏳ |

### Reading before each milestone
From the [2026-10-27 literature review](research/2026-10-27-literature-review.md) §5.

| Milestone | Read |
|---|---|
| M6c | Kitajima et al. 2004 (crown light extinction) |
| M6d | Kothari et al. 2025; Sprugel 2002; Millan et al. 2022 |
| M7 | Yun et al. 2025 (branch angles); Roychoudhry et al. 2013 (GSA) |
| M8 | Ryan et al. 2006; Mencuccini et al. 2005; Becker et al. 2000; Nauber & Mäder 2024 |
| M9 | Jirasek et al. 2000; Taylor-Hell 2005; Costes et al. 2008; Minamino & Tateno 2014 |
| M10 | Cao et al. 2023; Beveridge et al. 2023; Schneider et al. 2019; MacFarlane et al. 2017 |
| M11 | Loehle 2025; Reynolds & Ford 2005; Mrad et al. 2020; Ma et al. 2019; arXiv 2608.28692 |

## Principles: from spec to code

| ID | Principle | Spec | Switch | Code | Tests | Overlay / colour | Status |
|---|---|---|---|---|---|---|---|
| C1 | Metamers, buds, distichous side sequence | §C1 | always on | `principles/c1-buds.ts` | `world.test.ts` | colour: order; buds | ✅ M0 |
| C2 | Shadow triangle or sky sweep → Q, V | §C2 | `c2.enabled`, `c2.model` (`sky` default, `triangle`), `c2.rotate` | `light/shadow-triangle.ts`, `light/sky-sweep.ts` | `shadow-triangle.test.ts`, `sky-sweep.test.ts`, `sky.test.ts` | shade heatmap; colour: light (branches and buds) | ✅ M1, M6 |
| C3 | Basipetal ΣQ, Borchert–Honda split | §C3 | `c3.mode` (`bh`; `equal` = §8 ablation; `none` = M0–M1 scaffold) | `principles/c3-allocation.ts` | `c3-allocation.test.ts` | colour: resource v | ✅ M2 |
| C4 | Weighted shoot direction | §C4 | `c4.enabled` | `principles/c4-direction.ts` (noise: `Purpose.directionNoise`, keyed by birthId and season) | `c4-direction.test.ts` | walls drawn | ✅ M3 |
| C5 | Self-pruning (relative threshold, ADR 0007) | §C5 | `c5.enabled`; `c5.Trel` = 0 is the baseline | `principles/c5-shedding.ts` | `c5-c6.test.ts` | shed ghosts | ✅ M4; T_rel ✅ M6d |
| C6 | Pipe girth with memory | §C6 | `c6.enabled` | `principles/c6-girth.ts` (+ `junctionExponents`) | `c5-c6.test.ts` | width; Δ histogram chart | ✅ M4 |
| R6 | Short shoots (ADR 0006) | §R6 | `r6.enabled` | `principles/r6-short-shoots.ts` | `r6-short-shoots.test.ts`, `sky.test.ts` | short-shoot rosettes; buds by state | ✅ M6d |
| R1–R5 | Refinements | §R1–R5 | — | — | — | — | ⏳ M7–M10 |
| O1–O4 | Optional | §O1–O4 | — | — | — | — | ⏳ M11+ |

## Parameters awaiting calibration

No published value exists for these. Calibrate on *patterns*: several weak targets at once (H/D, crown base, crown width, ground light, bud-break fraction, Δ), not one strong one (Reynolds & Ford 2005). Record each result in an experiment note. Anchors and derivations are in the [literature review](research/2026-10-27-literature-review.md) §4. Physical scale: trees grow ≈ 2 cells a season, so a cell is ≈ 0.2–0.3 m.

| Param | Value | Anchor / target | Status |
|---|---|---|---|
| `c2.skyExponent` | 1 | Exactly a uniform 3D sky projected onto the plane; standard overcast sky ≈ 1.5 | Settled; `overcast` preset (p = 1.5: floor 7.3%, edge lean −1 cell) |
| `c2.minElevation` | 15° | Uniform sky puts 3.4% of its weight below 15° per side | Settled |
| `c2.K`, `c2.rotate` | 7, off | Sampling only. [M6e](experiments/2026-10-27-m6e-light-calibration.md): patterns at K = 7 match K = 31 except crown base (46 vs 53, ≈ 2 SE); rotate hides the zenith streaks but changes no pattern | Settled; K = 11 if crown base matters (M8, M11) |
| `c2.kExt` sky extinction | 0.5 | Target: ground light under a closed stand 2–10% of open sky; met at every k_ext 0.25–1 (3.5–6% at 0.5) because leaf area adjusts ([M6e](experiments/2026-10-27-m6e-light-calibration.md)). ≥ 0.75 lowers crown base and starves overtopped trees. Species ratio ≈ 1.5–2× plagiotropic over orthotropic (Kitajima et al. 2004) | Settled; species values at M7, fitted on crown leaf area and depth, not floor light |
| `c5.T` shedding threshold | 0.1 | Light-demanding ≈ 0.1, shade-tolerant 0.02–0.05 (sapling survival at 10–15% vs 1–2% of full light). M4: ≥ 0.2 over-prunes | Species values at M7 |
| `c5.Trel`, `c5.topQuantile` (+ floor `c5.T`) | sky presets 0.12, 0.9, T = 0.03 | Canopy unchanged, overtopped tree keeps 4× deeper crown ([M6d](experiments/2026-10-27-m6d-shedding-short-shoots.md)) | Settled for sky presets |
| `r6.qMin`, `r6.leafArea` | 0.1, 2 (sky presets) | Short-shoot leaf share 0.50 stand, 0.58 open (target > 0.5) | Settled for sky presets |
| `c6.r0` tip radius | 0.02 cells | H/D stand-grown 60–80 (Watt et al. 2023). Measured at 0.02: interior stand 62–72, edge 54–57, open-grown 41–43 | Settled (M6c) |
| `c4` weights `wd, xi, eta, epsilon, sigma` | 1, 0.3, 0.15, 0.5, 20° | Qualitative only (Palubicki Fig. 12). Strong upward η (0.4) can starve a seedling whose buds bunch up | M7, on patterns |
| `c2.a`, `b`, `C` (triangle) | 0.15, 1.5, 1 | [M1](experiments/2026-10-26-m1-shadow-calibration.md), [M4](experiments/2026-10-26-m4-calibration.md); legacy model pinned to M1–M5 presets | Frozen |

## Later (out of prototype scope)

- Arrow output from the CLI.
- An R analysis environment (`sudo dnf install R`, then the `arrow` or `readr` package).
- Rust/WASM core and WebGPU: only when the ADR 0001 triggers fire.
- Depth beyond ADR 0008, held: parallel transects drawn behind each other (forest depth), or a thick 3D slab (W × D × H, about 50× the light cost; reverses spec §2). Revisit if trees must be seen from an angle.
- Shareable URLs that hold the seed, preset and param edits.
- Embedding in the personal website.
