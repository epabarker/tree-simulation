# Crown competition in the closed stand: why crowns interpenetrate (2026-11-04)

A diagnosis session (the plan's §k, after night 1 on v2: [note](2026-11-04-level0-night1-v2.md)). Read-only on the core.
No params accepted, nothing re-registered, no rule implemented. ADR 0051 (proposed) draws the decision from it.

Scripts in `analysis/experiments/`:
- `crown_dump.ts` (the stand, every tree's live-bud tips at 60/100/150);
- `crown_overlap.py` (step 1);
- `crown_rivals.py` (step 3);
- `crown_spread.py` (step 4);
- `crown_levers.py` (steps 3 and 5's probes).

Raw dumps are in `runs/crown-competition/` (git-ignored). The fits are night 1's `docs/experiments/fits/level0/S.json`
(`fit.assign`); "hand" is the shipped species. Seeds 1–5 unless stated.

**Check:** the dump's CR for beech fit, seed 1 (5.02 / 5.30 / 5.81 m) equals `beech.gate.json`'s rows[0].

## The premises, corrected
- **6.5–7.2 m is the hand (shipped) oak**, as in ADR 0050. Night 1's fitted oak has CR 4.5–4.9 m. Both are over Tallo:
  its median at 20 cm is 2.3 m.
- **qMin at its bound holds for birch only** (0.187 of 0.2). Oak's fit is 0.123 (u 0.84), beech's 0.031.

## The stand
`cli/trials.ts:77–90` with `presets.ts:115–127`: three rows of four on an 84-cell periodic ring, with opaque faces
(τ 0) at z = 0 and 64.
- **Rows:** z = 10.7, 32 and 53.3. Row r is shifted +7r cells in x.
- **The measured trees** are the middle row, trees 4–7.
- **Their neighbours:** at 5.25 m in-row, and at 5.6 / 6.4 m diagonally. That is 357 stems/ha, fixed for the whole
  run.
- **CR** (`cli/allometry.ts:128–145`): the mean over ±x, ±z of the furthest tip of any active, dormant or short-shoot
  bud.

## 1. Overlap
Notes on the columns:
- **"Voronoi CR"** keeps only tips nearer their own stem than any other.
- **"Foreign"** is the share of live-bud tips nearer a neighbour's stem.
- **Vertical class** compares a foreign tip with the neighbour's leafy tips within 1 m of it:
  - above them;
  - within their height range;
  - below them;
  - "gap": the neighbour has no foliage there.
- **q ratio** compares foreign leafy tips with own-side leafy tips in the same 2 m height band (median of the band
  medians).
- Means over trees and seeds. Seed SD of CR: 0.05–1.3 m. Seed SD of foreign: 1–15 points. "—": some tree had no bud of that state, so the mean is undefined.

**oak** (CR columns in m)

| set | season | DBH cm | H m | CR (gate) | leafy CR | Voronoi CR | p95 CR | foreign % | of active / short / dormant, % | above / within / below / gap, % | q ratio |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hand | 60 | 22.4 | 27.1 | 6.62 | 6.57 | 2.83 | 4.63 | 41 | 43 / 41 / 39 | 21 / 71 / 8 / 0 | 1.10 |
| hand | 100 | 33.0 | 33.7 | 6.71 | 6.43 | 2.79 | 4.43 | 30 | 32 / 27 / 41 | 17 / 66 / 16 / 2 | 0.96 |
| hand | 150 | 34.1 | 40.7 | 6.74 | 6.52 | 2.78 | 4.67 | 24 | 18 / 23 / 28 | 18 / 54 / 24 / 4 | 1.11 |
| fit | 60 | 21.5 | 20.4 | 4.92 | 4.88 | 2.83 | 3.68 | 32 | 42 / 34 / 25 | 26 / 63 / 8 / 3 | 1.05 |
| fit | 100 | 30.8 | 26.4 | 4.54 | 4.53 | 2.82 | 3.79 | 31 | 37 / 35 / 21 | 40 / 46 / 7 / 6 | 1.08 |
| fit | 150 | 31.9 | 31.2 | 4.76 | 4.76 | 2.81 | 3.75 | 34 | 35 / 38 / 24 | 35 / 35 / 11 / 18 | 0.99 |

**beech** (CR columns in m)

| set | season | DBH cm | H m | CR (gate) | leafy CR | Voronoi CR | p95 CR | foreign % | of active / short / dormant, % | above / within / below / gap, % | q ratio |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hand | 60 | 28.6 | 32.9 | 3.83 | 3.79 | 2.74 | 3.13 | 30 | 33 / 31 / 21 | 35 / 44 / 11 / 10 | 0.98 |
| hand | 100 | 41.2 | 41.4 | 4.78 | 4.78 | 3.08 | 3.94 | 40 | — / 43 / 28 | 49 / 21 / 8 / 21 | 1.16 |
| hand | 150 | 59.9 | 50.0 | 6.94 | 7.13 | 4.13 | 5.65 | 35 | 41 / 36 / 29 | 36 / 20 / 4 / 41 | 1.02 |
| fit | 60 | 28.0 | 20.0 | 4.19 | 4.19 | 2.77 | 3.52 | 42 | 49 / 46 / 29 | 36 / 36 / 5 / 23 | 1.11 |
| fit | 100 | 33.4 | 29.2 | 4.29 | 4.29 | 3.12 | 3.41 | 25 | — / — / 17 | 34 / 37 / 9 / 21 | 1.01 |
| fit | 150 | 34.7 | 31.8 | 4.43 | 4.19 | 3.33 | 3.67 | 25 | — / 32 / 18 | 38 / 30 / 13 / 19 | 1.02 |

**birch** (CR columns in m)

| set | season | DBH cm | H m | CR (gate) | leafy CR | Voronoi CR | p95 CR | foreign % | of active / short / dormant, % | above / within / below / gap, % | q ratio |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hand | 60 | 17.2 | 32.1 | 4.38 | 4.38 | 2.80 | 3.58 | 24 | 48 / 26 / 10 | 23 / 72 / 4 / 0 | 1.02 |
| hand | 100 | 28.9 | 36.6 | 5.67 | 5.67 | 2.76 | 4.37 | 36 | 39 / 37 / 19 | 38 / 56 / 5 / 1 | 0.97 |
| hand | 150 | 30.5 | 40.2 | 7.26 | 7.31 | 2.75 | 5.68 | 39 | 60 / 42 / 11 | 48 / 45 / 5 / 2 | 1.01 |
| fit | 60 | 39.5 | 26.2 | 5.83 | 5.72 | 2.82 | 4.84 | 38 | 41 / 40 / 30 | 5 / 90 / 6 / 0 | 0.96 |
| fit | 100 | 42.4 | 33.9 | 5.03 | 5.00 | 2.81 | 4.35 | 34 | 39 / 35 / 29 | 12 / 79 / 8 / 0 | 1.01 |
| fit | 150 | 44.2 | 37.2 | 4.63 | 4.61 | 2.79 | 3.99 | 30 | 23 / 31 / 26 | 18 / 65 / 14 / 3 | 1.01 |

**Encroachment against legacy, and what sets the gate's CR.**
- "This season's shoot ends" are active buds: the tips of shoots grown this season (age 0).
- The extreme tips are the four tips (±x, ±z) that set the gate's CR.
- The shared share counts 1 m voxels, and (x, z) columns, above the stand's crown base that hold leafy tips of two or
  more trees.

| species | set | season | foreign tips: this season's shoot ends / wood < 10 y, % | CR's extreme tips: active / short shoot / dormant, % | their wood age, median y | wood < 10 y, % | on a neighbour's side, % | shared 1 m voxels, % | shared columns, % |
|---|---|---|---|---|---|---|---|---|---|
| beech | hand | 60 | 18 / 77 | 18 / 70 / 12 | 6 | 72 | 91 | 12 | 16 |
| beech | hand | 100 | 12 / 60 | 30 / 58 / 12 | 3 | 83 | 91 | 8 | 18 |
| beech | hand | 150 | 12 / 50 | 29 / 50 / 21 | 9 | 48 | 83 | 4 | 12 |
| beech | fit | 60 | 16 / 72 | 28 / 61 / 11 | 5 | 79 | 88 | 18 | 17 |
| beech | fit | 100 | 9 / 51 | 14 / 72 / 14 | 8 | 53 | 84 | 10 | 13 |
| beech | fit | 150 | 3 / 36 | 8 / 72 / 20 | 12 | 45 | 88 | 5 | 9 |
| birch | hand | 60 | 12 / 49 | 30 / 59 / 11 | 9 | 71 | 100 | 8 | 12 |
| birch | hand | 100 | 6 / 24 | 41 / 54 / 5 | 10 | 70 | 99 | 8 | 14 |
| birch | hand | 150 | 2 / 13 | 12 / 82 / 5 | 14 | 46 | 100 | 8 | 15 |
| birch | fit | 60 | 27 / 75 | 18 / 61 / 21 | 6 | 72 | 100 | 26 | 24 |
| birch | fit | 100 | 7 / 22 | 4 / 81 / 15 | 25 | 19 | 100 | 13 | 13 |
| birch | fit | 150 | 2 / 23 | 1 / 80 / 19 | 37 | 29 | 100 | 8 | 7 |
| oak | hand | 60 | 7 / 40 | 11 / 55 / 34 | 7 | 65 | 100 | 15 | 25 |
| oak | hand | 100 | 5 / 29 | 6 / 46 / 48 | 13 | 39 | 100 | 9 | 19 |
| oak | hand | 150 | 2 / 28 | 4 / 57 / 39 | 16 | 32 | 100 | 5 | 12 |
| oak | fit | 60 | 11 / 66 | 14 / 49 / 38 | 6 | 70 | 96 | 16 | 19 |
| oak | fit | 100 | 4 / 25 | 15 / 69 / 16 | 14 | 39 | 98 | 12 | 19 |
| oak | fit | 150 | 2 / 15 | 2 / 81 / 16 | 37 | 12 | 94 | 7 | 16 |

**Reach and nearest stem by direction** (medians over trees and seeds; nearest stem within ±45° of each axis):
- **Beech hand:** the neighbour distances widen with deaths (8.80 m in x at 150).
- **Beech fit:** reaches further in +x than in −x (mean 1.7 m at the same tree; the sky is untilted, `c2.skyTilt` 0).
  Recorded, not chased.

| species | set | season | reach +x / −x / +z / −z, m | nearest stem +x / −x / +z / −z, m |
|---|---|---|---|---|
| beech | hand | 60 | 4.42 / 3.47 / 4.10 / 3.92 | 5.25 / 5.25 / 5.61 / 5.61 |
| beech | hand | 100 | 4.36 / 4.56 / 5.20 / 4.09 | 5.25 / 5.25 / 5.61 / 5.61 |
| beech | hand | 150 | 6.98 / 7.20 / 6.80 / 5.77 | 8.80 / 8.80 / 6.38 / 6.38 |
| beech | fit | 60 | 5.04 / 2.69 / 4.67 / 4.32 | 5.25 / 5.25 / 5.61 / 5.61 |
| beech | fit | 100 | 4.91 / 3.44 / 4.16 / 4.23 | 5.25 / 5.25 / 5.61 / 5.61 |
| beech | fit | 150 | 4.93 / 3.30 / 4.38 / 4.57 | 5.25 / 5.25 / 5.61 / 6.38 |
| birch | hand | 60 | 4.37 / 4.36 / 4.20 / 4.51 | 5.25 / 5.25 / 5.61 / 5.61 |
| birch | hand | 100 | 6.15 / 6.70 / 4.56 / 4.88 | 5.25 / 5.25 / 5.61 / 5.61 |
| birch | hand | 150 | 9.09 / 9.46 / 5.39 / 6.07 | 5.25 / 5.25 / 5.61 / 5.61 |
| birch | fit | 60 | 5.90 / 6.12 / 5.60 / 5.57 | 5.25 / 5.25 / 5.61 / 5.61 |
| birch | fit | 100 | 5.16 / 5.01 / 5.16 / 5.10 | 5.25 / 5.25 / 5.61 / 5.61 |
| birch | fit | 150 | 4.70 / 4.66 / 4.69 / 4.81 | 5.25 / 5.25 / 5.61 / 5.61 |
| oak | hand | 60 | 6.55 / 6.77 / 6.54 / 6.90 | 5.25 / 5.25 / 5.61 / 5.61 |
| oak | hand | 100 | 6.38 / 7.06 / 6.95 / 7.49 | 5.25 / 5.25 / 5.61 / 5.61 |
| oak | hand | 150 | 5.79 / 6.57 / 7.21 / 7.75 | 5.25 / 5.25 / 5.61 / 5.61 |
| oak | fit | 60 | 5.05 / 4.20 / 4.88 / 5.03 | 5.25 / 5.25 / 5.61 / 5.61 |
| oak | fit | 100 | 4.94 / 4.12 / 4.61 / 5.63 | 5.25 / 5.25 / 5.61 / 5.61 |
| oak | fit | 150 | 4.49 / 4.09 / 4.44 / 4.89 | 5.25 / 5.25 / 5.61 / 5.61 |

**What step 1 shows**
- **Crowns interpenetrate in every species and both parameter sets.** 24–42% of live-bud tips lie nearer a
  neighbour's stem than their own. The tips that set CR are on a neighbour's side in 84–100% of directions.
- **The gate's CR is the reach past the midpoint.** Voronoi CR is 2.7–2.85 m in every oak and birch row: half the
  spacing, a geometric ceiling rather than a crown measurement. CR = ceiling + reach past the midpoint; for oak fit at
  60, 4.92 = 2.83 + 2.1. A crown that stopped at the midpoint would score z ≈ +0.46 (below), inside T 1.04. **Oak's
  whole binding term is the reach past the midpoint.**
- **It starts as encroachment and is held as legacy.**
  - At 60, the CR tips are on young wood: 65–80% under 10 years, median 5–7 years.
  - By 150 they are old limbs (oak fit: median 37 years, 12% young), held as **leafy short shoots** (72–82%) and dormant
    buds (16–39%).
  - Nothing grown before canopy closure (season 15–30) survives as a CR tip.
- **The foreign tips sit in the neighbour's crown, not above it.** In oak and birch, 35–90% are within the height range
  of the neighbour's foliage within 1 m; 5–40% are above it.
- **They get the same light as own-side tips at the same height:** q ratio 0.96–1.16. Nothing in the light tells a tip
  that it is inside another tree.
- **Leafy-only CR equals the gate's CR within 0.25 m.** Dormant buds are not what makes CR wide: the last tip in each
  direction is usually leafy.

**CR's readings against Tallo** (median z of the measured trees, seeds 1–5; reported, never a target). Voronoi's z
describes the 5.25 m planting, not the crowns. p95 is the 95th percentile of the tips' reach within ±45° of each axis.

| species | set | z of the gate's CR 60/100/150 | z of leafy CR | z of Voronoi CR | z of p95 CR |
|---|---|---|---|---|---|
| oak | hand | +2.64 / +2.21 / +1.91 | +2.56 / +2.00 / +1.83 | +0.48 / −0.47 / −0.53 | +1.76 / +1.05 / +0.92 |
| oak | fit | +1.76 / +1.11 / +1.25 | +1.67 / +1.05 / +1.23 | +0.46 / −0.33 / −0.42 | +1.08 / +0.59 / +0.77 |
| beech | hand | +0.40 / +0.30 / +0.01 | +0.39 / +0.30 / −0.16 | −0.71 / −1.24 / −0.99 | −0.31 / −0.37 / −0.55 |
| beech | fit | +0.73 / +0.78 / +0.88 | +0.73 / +0.67 / +0.73 | −0.68 / −0.47 / −0.56 | +0.09 / −0.14 / −0.03 |
| birch | hand | +1.97 / +2.06 / +2.95 | +1.97 / +2.06 / +2.97 | +0.99 / −0.29 / −0.56 | +1.54 / +1.28 / +2.12 |
| birch | fit | +1.75 / +0.88 / −0.01 | +1.73 / +0.77 / −0.04 | −1.54 / −1.89 / −2.19 | +0.84 / −0.16 / −0.68 |

**The max statistic.** The gate's CR is a maximum over ~2,000 tips: it moves only when the last intruding tip goes.
For oak fit, p95 z is about 0.5 lower than the max at every age. That tail is what the gate scores.

## 2. What a tip inside a neighbour's crown experiences (the code)
| process | rule | file:line | owner-aware? | effect inside a neighbour's crown |
|---|---|---|---|---|
| light read | Q, V at the bud's metamer tip from the slab sweep: K = 16 directions, weights ∝ sin^p, Beer–Lambert through all foliage | `season.rs:246–262`, `light/slab_sweep.rs:11–15, 66–94` | no | Q falls with the foliage above, whoever owns it (q ratio ≈ 1) |
| resource | Borchert–Honda split by Q | `c3.rs:53–61` | no | as for own crown at equal Q |
| extension | n metamers from v; length × (1 + e_s·s), s = R5's neighbour-shade signal | `c1.rs:199–208`, `season.rs:502`, `r5.rs:23` | **yes** (owner grid, `r5.rs:50`, `season.rs:264–280`) | **longer** internodes under another tree's foliage |
| apical share, set point | λ + δλ·s; A_set·(1 − δ_A·s) | `r5.rs` `shaded_lambda`, `set_point_scale` | yes | favours the axis and steepens it: no stop |
| direction | ξ·V (toward light) + set point + noise | `c4.rs:51`, `r2.rs:248–276` | no | toward the gap, whichever tree owns it |
| bud that does not grow | short shoot if Q ≥ Q_ss, else dormant: **never dies of light** | `r6.rs:39–45`, `season.rs:584` | no | stays leafy while Q ≥ qMin |
| dormant bud's death | age > L_dorm (40) only | `r4.rs:38–40`, `season.rs:595` | no | light-blind |
| dormant release | threshold × (1 + δ_b·s) | `r4.rs:15–29` | yes | suppresses only *re*-growth |
| branch shedding | carbon: deficit ≥ k_shed (1) seasons, or Q_b/n_b < T_rel·Q_top | `c5.rs:46, 57–83` | no | a lit limb in a neighbour's crown is never shed |
| abrasion (crown shyness) | a leafy bud swaying into another tree's foliage cell dies with p_abr | `o2.rs:79–124`; switch world-level `season.rs:382` | **yes** | **off in every species and preset** (ADR 0013) |

**Nothing makes growing into an occupied crown worse than growing into open space at equal light.** The one
owner-aware rule that is on (R5's neighbour signal) lengthens and steepens shoots under another tree's foliage, and
only suppresses the release of dormant buds. The owner-aware loss process the spec has, §O2's abrasion, is off.
ADR 0013 turned it off because in 2D light alone kept crowns apart (touching in ≈ 3% of canopy rows). In 3D the median
reach exceeds half the spacing in every species and set (Voronoi ceiling ≈ 2.8 m; CR 3.8–7.3 m), so that premise no
longer holds.

Ownerless light is correct physics: in a real stand, light at a point does not depend on whose foliage shades it. What
the stand lacks is a loss process, not a different light.

## 3. Rivals
Probes: oak and beech fits, seeds 1–5; table in step 5.
- **Periodic x, three-row depth, opaque faces.**
  - **Oak: excluded.** The middle row reaches as far in z as in x (fit 4.8 against 5.0 m at 60). The outer rows lean
    in by 0.6–1.2 m and are shorter (oak fit H 24 against 31 m at 150), but the middle row's ±z reach is not larger.
    Six rows (depth 128, an inner row measured) give oak fit z_CR +2.05 / +1.59 / +1.06; open faces give +2.35 /
    +2.36 / +2.34 (light from the faces feeds more crown, LAI 13.9).
  - **Beech: not excluded.** Six rows drop beech fit's CR from 4.29 / 4.59 / 4.80 to 3.65 / 3.90 / 4.10 m (z_CR
    +0.39 / +0.23 / +0.34). That is borderline on 5 seeds with a per-seed CR SD of 0.5–0.8 m, but real.
  - **Image:** the fits' largest offset is 5.7–9.0 m against half the ring, 10.5 m. Shipped birch reaches 15.6 m at
    150, past its own image: the gate's CR there includes a wrapped tip (hand birch only).
- **Spacing.**
  - **What we plant:** 357 stems/ha, fixed. The crowns' implied spacing (2·CR) is 8–14 m, against a Voronoi ceiling
    that implies 5.5–5.7 m.
  - **What Tallo has:** no stand density, plot type or open-grown field (columns: tree_id … crown_radius_m,
    reference_id). Its CR is "mostly derived from 2 to 8 orthogonal crown radii measurements or otherwise from crown
    projection areas" (Jucker et al. 2022, §2.1); how the radii are combined, and how overlap was handled, is not
    documented.
  - **A yield table:** the hornbeam table in the repo (Lockow 2009, site index 32) thins from 423 stems/ha at 60 to 207
    at 100 and 164 at 130. So a real stand's cell widens with age, ours does not.
  - **Verdict:** spacing sets the Voronoi ceiling, not the reach past it. Not the cause.
- **CR's reading.** The decomposition and the readings table (step 1) are the evidence for ADR 0050's open ruling 2
  (CR's definition). Reported, not proposed as a redefinition.
- **Light resolution.** K 32 and sky p 0.5 leave CR flat (oak fit z_CR at 60: +1.77, +1.85 against +1.76). Excluded.
- **Mortality and release.**
  - **Oak and birch: excluded.** No deaths in the fits (oak 0.2 of 12 at 150).
  - **Beech: partial.** 4.0 (fit) and 6.6 (hand) of 12 trees are dead by 150. Measured trees with a dead neighbour
    reach 5.05 m at 150 against 3.21 m without (fit; n 13 against 2).
- **The user's premise that the fit compensates through qMin: refuted.** qMin is at its bound only in birch. Past the
  bound, LAI collapses (oak fit 5.2 → 1.6), trees die (beech 8–10 of 12), the survivors spread into the gaps, and
  beech's CR rises (fit z_CR at 100: +0.78 → +1.99).

## 4. Spread against height (beech, seeds 1–20)
Per-tree CR at 60 against height rank at 150, ranked within each seed (`crown_spread.py`):

| set | ρ(CR 60, H rank 150) | ρ(CR 60, ΔH 60→150) | ρ(H 60, H 150) | per-seed ρ, positive in | measured trees dead by 150 |
|---|---|---|---|---|---|
| hand | +0.12 (p 0.46, 39 trees, 12 seeds) | +0.07 | +0.39 (p 0.01) | 8 of 12 | 25 of 80 |
| fit | −0.12 (p 0.39, 51 trees, 14 seeds) | −0.16 | +0.60 (p < 0.001) | 5 of 14 | 14 of 80 |

**No association detected.** The ranks are within seeds of 3–4 survivors, and many measured trees die. Height at 60
predicts height at 150; sideways spread at 60 does not.

## 5. Lever probes (one change from the base, seeds 1–5)
- **Columns:** z, CR, foreign and dead come from the stand's dump. LAI, shade light and loss are the fitter's
  (`fit_level0.evaluate`); values in parentheses are the dump's LAI at 60.
- **World-level cells** (O2, the rivals) cannot be set by a species assign, so they are dump-only. The lone tree and the
  shade house have no neighbour, so O2 leaves them as they are.
- **Checked before reading:** every assign landed (`world.paramsOf`).
- **Labels:**
  - lDorm is a light-blind proxy: no rule makes a bud's survival depend on light.
  - Trel bounds CR by losing crown, not by separating crowns.
  - **The O2 prediction, written before the run:** O2 kills only leafy buds, so if the excess sat in dormant tips it
    could not move CR. Step 1 then put the excess mostly in short shoots, which O2 can reach.

**oak, hand**

| cell | z_CR 60/100/150 | z_H 60/100/150 | CR m 60/100/150 | foreign at 60, % | LAI (fit's) | shade light | loss | dead of 12 at 150 |
|---|---|---|---|---|---|---|---|---|
| base | +2.64 / +2.21 / +1.91 | +1.33 / +1.32 / +2.47 | 6.65 / 6.93 / 6.59 | 41 | 3.81 | 0.11 | 21.4 | 0.0 |
| qMin=0.3 | +2.89 / +1.79 / +0.72 | +1.47 / +1.59 / +2.29 | 6.49 / 5.41 / 3.89 | 27 | 1.65 | 0.26 | 48.5 | 0.2 |
| qMin=0.5 | +2.31 / +0.74 / -0.20 | +1.53 / +1.53 / +2.11 | 4.68 / 3.27 / 2.40 | 26 | 0.62 | 0.68 | 372.5 | 8.0 |
| eS=0 | +2.79 / +2.22 / +1.90 | +1.39 / +1.15 / +1.95 | 6.73 / 6.75 / 6.62 | 29 | 3.73 | 0.11 | 23.2 | 0.0 |
| eS=0.3 | +2.64 / +2.43 / +1.97 | +1.11 / +1.53 / +2.34 | 6.70 / 7.19 / 6.90 | 36 | 3.69 | 0.11 | 23.5 | 0.0 |
| lDorm=10 | +2.63 / +2.01 / +1.67 | +1.39 / +1.58 / +2.63 | 6.39 / 6.51 / 5.80 | 41 | 3.67 | 0.11 | 21.8 | 0.0 |
| lDorm=20 | +2.67 / +2.29 / +1.99 | +1.31 / +1.50 / +2.56 | 6.68 / 7.25 / 6.58 | 41 | 3.78 | 0.11 | 22.0 | 0.0 |
| Trel×3 | +1.91 / +1.39 / +1.03 | +1.15 / +1.37 / +2.29 | 5.32 / 5.05 / 4.56 | 38 | 3.44 | 0.11 | 20.7 | 0.0 |
| Trel×10 | +0.85 / +0.11 / -0.72 | +1.84 / +1.80 / +2.79 | 3.10 / 2.99 / 2.30 | 27 | 1.52 | 0.11 | 29.3 | 0.0 |
| O2 pAbr=0.5 | +2.57 / +2.16 / +1.66 | +1.32 / +1.33 / +2.21 | 6.27 / 6.27 / 6.02 | 29 | (3.5) | as base | — | 0.0 |
| O2 pAbr=1 | +2.47 / +2.10 / +1.34 | +1.51 / +1.61 / +2.03 | 6.08 / 5.95 / 5.40 | 25 | (3.4) | as base | — | 0.0 |

**oak, fit**

| cell | z_CR 60/100/150 | z_H 60/100/150 | CR m 60/100/150 | foreign at 60, % | LAI (fit's) | shade light | loss | dead of 12 at 150 |
|---|---|---|---|---|---|---|---|---|
| base | +1.76 / +1.11 / +1.25 | +0.17 / +0.24 / +0.82 | 4.85 / 4.60 / 4.56 | 32 | 5.19 | 0.11 | 3.2 | 0.2 |
| qMin=0.3 | +1.64 / +1.48 / +1.09 | +0.39 / +0.48 / +1.42 | 4.12 / 4.57 / 4.43 | 24 | 2.83 | 0.26 | 30.8 | 2.6 |
| qMin=0.5 | +1.73 / +1.59 / +0.89 | +0.42 / +0.64 / +1.23 | 3.94 / 4.53 / 4.13 | 27 | 1.61 | 0.68 | 363.3 | 8.8 |
| eS=0 | +1.84 / +1.26 / +1.12 | +0.32 / +0.35 / +0.82 | 4.66 / 4.66 / 4.53 | 28 | 5.30 | 0.11 | 2.7 | 0.6 |
| eS=0.3 | +1.91 / +1.20 / +1.01 | -0.02 / +0.43 / +0.58 | 4.96 / 4.69 / 4.60 | 30 | 5.23 | 0.11 | 2.6 | 0.2 |
| lDorm=10 | +1.81 / +1.13 / +1.22 | +0.17 / +0.24 / +0.63 | 4.70 / 4.41 / 4.82 | 28 | 5.21 | 0.11 | 2.9 | 1.6 |
| lDorm=20 | +1.93 / +1.02 / +1.14 | +0.26 / +0.36 / +0.82 | 4.91 / 4.30 / 4.56 | 30 | 5.22 | 0.11 | 4.8 | 1.6 |
| Trel×3 | +1.60 / +1.21 / +1.10 | +0.19 / +0.07 / +0.87 | 4.19 / 4.50 / 4.42 | 26 | 4.73 | 0.11 | 3.8 | 0.6 |
| Trel×10 | +1.34 / +0.98 / +0.64 | +0.67 / +0.62 / +1.56 | 3.60 / 4.05 / 3.90 | 38 | 3.30 | 0.11 | 5.0 | 0.0 |
| O2 pAbr=0.5 | +1.93 / +1.39 / +1.02 | +0.27 / +0.59 / +0.98 | 4.84 / 4.63 / 4.46 | 20 | (5.0) | as base | — | 0.2 |
| O2 pAbr=1 | +1.80 / +1.24 / +0.94 | +0.38 / +0.72 / +1.26 | 4.39 / 4.17 / 4.14 | 16 | (5.1) | as base | — | 0.0 |
| faces open | +2.35 / +2.36 / +2.34 | +0.29 / +0.60 / +0.53 | 5.54 / 5.69 / 5.75 | 24 | (13.9) | as base | — | 0.0 |
| depth 128 | +2.05 / +1.59 / +1.06 | +0.22 / +0.47 / +0.84 | 4.90 / 4.86 / 4.47 | 24 | (6.1) | as base | — | 0.0 |
| K=32 | +1.77 / +1.41 / +1.21 | +0.17 / +0.30 / +0.79 | 4.81 / 5.05 / 4.91 | 30 | (5.2) | as base | — | 1.0 |
| sky p=0.5 | +1.85 / +1.28 / +1.28 | +0.26 / +0.48 / +1.06 | 4.65 / 4.58 / 4.54 | 34 | (4.8) | as base | — | 0.2 |

**beech, hand**

| cell | z_CR 60/100/150 | z_H 60/100/150 | CR m 60/100/150 | foreign at 60, % | LAI (fit's) | shade light | loss | dead of 12 at 150 |
|---|---|---|---|---|---|---|---|---|
| base | +0.40 / +0.30 / +0.01 | +1.41 / +1.61 / +1.91 | 3.88 / 4.57 / 6.05 | 30 | 10.33 | 0.03 | 15.9 | 6.6 |
| qMin=0.3 | +0.80 / +0.76 / +0.33 | +1.45 / +1.76 / +1.93 | 3.82 / 5.15 / 6.68 | 28 | 2.61 | 0.26 | 558.6 | 10.2 |
| qMin=0.5 | +1.14 / +1.92 / +1.65 | +0.70 / +1.10 / +1.55 | 4.22 / 6.53 / 7.48 | 26 | 1.56 | 0.68 | 4192.8 | 9.8 |
| eS=0 | +0.46 / +0.04 / +0.03 | +1.54 / +1.76 / +1.69 | 3.88 / 4.46 / 6.05 | 25 | 10.34 | 0.03 | 23.0 | 6.0 |
| eS=0.3 | +0.50 / -0.05 / -0.27 | +1.67 / +1.84 / +1.96 | 3.86 / 4.49 / 6.65 | 39 | 10.24 | 0.03 | 17.7 | 7.8 |
| lDorm=10 | +0.56 / +0.31 / +0.30 | +1.51 / +2.03 / +2.03 | 4.18 / 4.61 / 7.44 | 37 | 10.37 | 0.03 | 17.6 | 7.2 |
| lDorm=20 | +0.50 / +0.30 / -0.82 | +1.43 / +1.97 / +1.81 | 4.00 / 4.29 / 5.07 | 31 | 10.30 | 0.03 | 15.3 | 5.6 |
| Trel×3 | +0.35 / +0.13 / -0.05 | +1.62 / +1.94 / +2.08 | 3.84 / 4.58 / 6.87 | 26 | 10.38 | 0.03 | 19.4 | 7.4 |
| Trel×10 | +0.34 / -0.33 / -0.39 | +1.74 / +2.00 / +1.88 | 3.72 / 3.94 / 4.87 | 31 | 10.20 | 0.03 | 22.6 | 6.0 |
| O2 pAbr=0.5 | +0.56 / +0.45 / -0.35 | +1.16 / +1.44 / +1.39 | 4.13 / 4.91 / 5.89 | 25 | (10.1) | as base | — | 6.0 |
| O2 pAbr=1 | +0.25 / +0.08 / -0.51 | +1.56 / +1.92 / +1.90 | 3.74 / 4.10 / 5.52 | 25 | (9.7) | as base | — | 6.0 |

**beech, fit**

| cell | z_CR 60/100/150 | z_H 60/100/150 | CR m 60/100/150 | foreign at 60, % | LAI (fit's) | shade light | loss | dead of 12 at 150 |
|---|---|---|---|---|---|---|---|---|
| base | +0.73 / +0.78 / +0.88 | -0.69 / +0.23 / +0.53 | 4.29 / 4.59 / 4.80 | 42 | 10.15 | 0.04 | 4.5 | 4.0 |
| qMin=0.3 | +1.37 / +1.99 / +1.45 | -0.98 / +0.41 / +0.82 | 4.84 / 6.41 / 5.82 | 50 | 3.52 | 0.26 | 579.7 | 8.4 |
| qMin=0.5 | +1.41 / +1.63 / +0.73 | -0.75 / -0.04 / +0.39 | 4.67 / 5.60 / 4.65 | 27 | 1.71 | 0.68 | 4204.4 | 8.8 |
| eS=0 | +0.65 / +1.08 / +0.96 | -0.71 / +0.11 / +0.28 | 4.03 / 4.94 / 5.39 | 45 | 10.10 | 0.04 | 9.3 | 5.6 |
| eS=0.3 | +0.69 / +0.55 / +0.76 | -0.71 / +0.27 / +0.51 | 4.17 / 4.44 / 4.80 | 41 | 9.87 | 0.04 | 2.3 | 4.0 |
| lDorm=10 | +0.77 / +0.84 / +0.89 | -0.67 / +0.24 / +0.54 | 4.24 / 4.74 / 5.05 | 46 | 10.01 | 0.04 | 9.1 | 4.6 |
| lDorm=20 | +0.75 / +0.83 / +0.73 | -0.70 / +0.16 / +0.40 | 4.31 / 4.59 / 4.79 | 42 | 10.15 | 0.04 | 3.3 | 4.0 |
| Trel×3 | +0.39 / +0.92 / +0.94 | -0.67 / +0.36 / +0.87 | 3.80 / 4.86 / 4.97 | 40 | 10.05 | 0.04 | 2.8 | 3.6 |
| Trel×10 | +0.65 / +0.44 / +0.48 | -0.57 / +0.59 / +0.94 | 3.97 / 4.14 / 4.48 | 44 | 9.91 | 0.04 | 14.4 | 4.4 |
| O2 pAbr=0.5 | +0.50 / +0.93 / +0.53 | -0.67 / +0.04 / +0.01 | 3.90 / 4.75 / 4.47 | 43 | (9.7) | as base | — | 4.0 |
| O2 pAbr=1 | +0.59 / +0.68 / +0.98 | -0.68 / +0.07 / +0.29 | 3.95 / 4.58 / 5.27 | 34 | (9.9) | as base | — | 4.8 |
| faces open | +0.95 / +0.59 / +0.54 | -0.66 / -0.01 / +0.10 | 4.36 / 4.10 / 4.09 | 39 | (23.0) | as base | — | 0.8 |
| depth 128 | +0.39 / +0.23 / +0.34 | -0.58 / +0.33 / +0.81 | 3.65 / 3.90 / 4.10 | 38 | (10.4) | as base | — | 5.6 |
| K=32 | +0.77 / +0.59 / +0.68 | -0.58 / +0.77 / +0.99 | 4.12 / 4.26 / 4.51 | 44 | (10.8) | as base | — | 3.0 |
| sky p=0.5 | +0.80 / +0.84 / +0.85 | -0.76 / -0.06 / -0.09 | 4.01 / 4.56 / 4.66 | 41 | (9.2) | as base | — | 4.0 |

**What step 5 shows**
- **No probed lever brings oak fit's z_CR at 60 under T (1.04) without collapsing the canopy.**
  - The nearest is Trel×10: +1.24 at LAI 3.3 (from 5.2), with z_H at 150 rising to +1.42.
  - On the hand params, Trel×10 reaches +0.85 at LAI 1.5.
- **qMin past its bound:** LAI collapses, the shade house fails (survival light 0.26–0.68), and trees die. CR falls only
  where the crown thins (oak hand); in beech it rises.
- **e_s (shade elongation) and L_dorm:** flat, within seed noise. Shade elongation is not what drives tips in. L_dorm
  removes dormant extremes, but the short shoots then carry CR.
- **O2 at ADR 0013's settings (p_abr 0.5).** Paired per seed against the base, since seeds 1–5 are shared:
  - **Oak fit:**
    - CR at 60 does not move: 4.84 against 4.85 m, down in 2 of 5 seeds, z_CR at 60 +1.93.
    - Foreign tips at 60 fall 32 → 20%, in 5 of 5 seeds.
    - z_H rises in 4 of 5 seeds at 100 and at 150 (+0.1 to +0.45): a possible height cost, suggestive on 5 seeds.
  - **Hand oak:** CR at 60 falls in 5 of 5 seeds (−0.23 to −0.54 m).
  - **Beech:** within seed noise.
- **O2 at p_abr 1** (beyond ADR 0013; choosing it for CR would be fitting it to CR):
  - Oak fit's CR at 60 is 4.39 m, its foreign tips 16%, and z_CR at 60 +1.80.
  - z_H at 100 rises in 5 of 5 seeds.
- **Why O2 falls short of the gate either way:** the gate reads a maximum over ~2,000 tips, which moves only when the
  last intruding tip goes, and O2 acts on the bulk. Its sway is k·Q·h/r cells (`o2.rs:69–71`), and it skips dormant
  buds (`o2.rs:84`).
- **Untested:** R3's bending of long horizontal limbs, the other physical bound on reach.

## Verdict
- **Surviving mechanism.** Light alone does not keep 3D crowns apart. No rule makes a lit limb inside a neighbour's
  crown worse off than the same limb in open space:
  - it is fed and kept leafy;
  - it is never shed;
  - R5 even lengthens it.
- **Where it fails.** The spec's ownership-aware loss process (§O2) is off. ADR 0013's reason (2D crowns kept gaps) no
  longer holds in 3D.
- **What the gate sees.** Oak's binding term is the reach past the midpoint, read by a maximum. The bulk levers move
  the bulk well before they move that maximum:
  - O2 at ADR 0013's setting separates crowns but leaves oak fit's CR at 60 unchanged;
  - shedding trims CR by losing crown.
- **With the maximum kept, no probed lever passes oak.**
- **The ruling.** Whether the gate should read that maximum is ADR 0050's ruling 2, now with this evidence.

**Provenance audit (2026-11-05, ruling 3; [note](2026-11-05-target-provenance-audit.md)).** Step 5's "collapse"
verdicts read LAI and the shade house. Both are measured (Hagemeier & Leuschner 2019), with conventional bands.
- The shade-house failures past qMin's bound stand: z +4.9 to +65.
- Oak fit's Trel×10 is LAI z −1.47 against the measured 5.5 ± 1.5: outside one band, inside two. Its "collapse" was
  read against the model's base.
- "No probed lever passes oak" is unchanged: Trel×10's z_CR stays over T.
- The text above and the oak-fit table disagree on Trel×10's z_CR at 60 (+1.24 against +1.34) and its z_H at 150
  (+1.42 against +1.56). Not re-derived.

## Advisor (step 6): objections and answers
1. **"Voronoi CR in band" is a ceiling, not a crown.** Accepted: reframed as the decomposition, CR = ceiling + reach
   past the midpoint.
2. **The max statistic explains O2's small effect and decides between the options.** Accepted. Checked: no cell brings
   oak fit under T at 60 without collapsing LAI, so the recommendation depends on the user's ruling.
3. **Rivals need exact verdicts.** Light resolution excluded; mortality excluded for oak and birch, partial for beech;
   the slab not excluded for beech (six rows); qMin refuted by its mechanism; shedding bounds by losing crown.
4. **Ownerless light is physics, not a defect.** Accepted: the missing piece is a loss process, and the comparison
   with ADR 0013 is by reach against half-spacing, not by the voxel share.
5. **The line.** A rule reading the owner grid (foliage deposits, as R5 already does) is a local rule. A rule reading
   stem positions or Voronoi cells is an envelope and out. O2's parameters must come from ADR 0013 or the
   literature, never be fitted to Tallo CR. Its switch is world-level, so it is a preset or trial setting, and the
   goldens `oakOpen`, `forest`, `mixedWood` and `beechWood` would change if it were turned on in the woods.
6. **Minor items.** Recorded above: hand birch's wrapped tip; step 4 is "no association detected"; R3 untested.
7. **(Second round, after the commit.)** Option B's evidence had used p_abr 1's numbers under ADR 0013's label.
   Corrected:
   - At 0.5, oak fit's CR at 60 does not move.
   - Paired per seed, its foreign tips fall in 5 of 5 seeds and z_H rises in 4 of 5.
   - B is now offered on realism alone, never as a Level 0 fix.
   - The directional reach and nearest-stem columns were added.
