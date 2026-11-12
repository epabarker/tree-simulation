# The garden's suppression probe: overtopping signals and a longer depth period (2026-11-10)

**Exploratory: seeds 1–3, widths 160 and 66.** One round, approved by the user as a follow-up to [#121](https://github.com/epabarker/tree-simulation/issues/121). Nothing here is adopted. The probe params live only on the branch `probe/121-suppression`.

**Question.** [The schedule note](2026-11-10-garden-schedule.md) found two limits that no rate could move:
- understorey trees pay their maintenance (P/M 2–15), so a suppression rate read from P/M never acts on them;
- canopy crowns span the 64-cell depth period.

This round tests one candidate for each limit, against that note's committed schedule (r6, m_c 0.003):
- **A**, a suppression signal that marks an overtopped tree;
- **B**, a longer depth period.

**Second round:** [why the canopy is thin and hornbeam floods, and the levers tried](2026-11-11-garden-canopy-levers.md).

**Answer.**
- **No condition meets the #121 criteria on seeds 1–3, at either width.** Of the 18 judged frames per condition, none has drawn stems in band, ≥ 60% canopy and no species over 70% at once. r6 had one such frame, at 160 cells.
- **Every condition reaches the cap**, in all 6 runs.
- **A1 (dark top) does what it was meant to do**:
  - it kills the overtopped understorey, mostly hornbeam;
  - birch seedlings go first and beech and holly wait.
- **A1 does not stop the cap.** The cap fills with seedlings that establish faster than even a dark-top signal removes them.
- **With the understorey gone, too few drawn stems are left**: 30–90/ha of canopy at 160 cells, one tree at 66.
- **B (D = 96, 128) does not raise the canopy per hectare**:
  - 78–104/ha at 160 cells, against 94/ha at D = 64;
  - so crowns are wide in their own right, not because they wrap.
- **The limit behind all of it is the canopy itself.** The simulated stand holds about 80–110 canopy trees/ha. 200–400 drawn stems/ha at ≥ 60% canopy needs ≥ 120.

## The candidates (probe-only params, the `twoPart` mode)

- **`o4.suppressionSignal`** (the world's): `"carbon"` (absent, the default), `"topLight"` (A1) or `"growth"` (A2).
  - Writing out `"carbon"` with the other knobs set is bit-identical to leaving it absent (`the_carbon_signal_written_out_is_the_default`, o4.rs). No golden moved.
  - Each signal gives a deficit in [0, 1]. The rate is m_s·deficit·e^(−β_s(T − 1)), the carbon rate's tolerance scaling. It is drawn with the existing STAND_MORTALITY draw; no RNG purpose was registered.
- **A1, `topLight`**: deficit = (1 − (Q_top/C)/θ_q)₊.
  - Q_top is the tree's `q_top`: its live buds' `c5.topQuantile` (0.9) quantile of Q, from this season's light field. C5 already computes it for every garden species (all have T_rel > 0).
  - Knobs: θ_q (`o4.topLightThreshold`) and m_s.
- **A2, `growth`**: deficit = (1 − ΔH/(k·g))₊, where ΔH is the height gained over the last k seasons. Trees younger than k have no deficit.
  - ΔH is read from the existing metamer column `birthSeason`: height now, less the highest tip among metamers born k or more seasons ago.
  - So A2 needs **no new tree state and no checkpoint change**.
  - Knobs: k (`o4.growthSeasons`) and g (`o4.growthFloor`, cells a season). I used an absolute floor; the species' open-grown increment would need a per-species reference value, which no param holds yet.
- **B**: `world.depth` 96 or 128.
  - The planting is per hectare in the core, so it scales itself: 26 → 51 saplings at 160 cells.
  - The cap guard is scaled with the depth (`sweep.ts`'s `depth`), so it stays 2,500/ha.
- **Conditions** (9; seeds 1–3 × widths 160, 66 each):
  - A1: θ_q 0.3; θ_q 0.5; θ_q 0.5 with m_s 3.
  - A2: k 5, g 0.1; k 10, g 0.3.
  - B: D 96; D 128.
  - A1 + B: θ_q 0.3 and 0.5, each at D 128.

**Code:** `code/2026-11-10-garden-schedule/`.
- `sweep.ts` runs the conditions (it now takes `depth` and records each run's wall time).
- The per-condition numbers: `table.py` (the tables), `bars.py` (bar counts), `canopy.py` (canopy per ha).
- The diagnostics: `deaths.py` (who dies of what) and `diag.py` (crowns, establishment light, seedling lifetimes).
- `classes.py`: the scale of each signal by height class.
- `wasm-cost.ts`: B's cost in WASM.

**Runs:** `runs/garden-schedule/s*/` (not committed). 8 simulators ran at once alongside another agent's evidence run, so wall times are contended.

**Why A2's floor is hard to set.** Before the round, I measured height gained per season over 5 seasons at seasons 150–200 (r6, `classes.py`):
- understorey trees: median 0.00–0.51 cells a season;
- canopy trees: median 0.00–0.02, because they have reached the stand's top;
- seedlings: 0.00.

A stalled leader therefore marks the canopy as well as the overtopped.

## Results

Frame counts are per width (9 frames: 3 seeds × seasons 100/200/300). "All three" = in band, canopy ≥ 60% and no species over 70% in the same frame. None of the 6 runs per condition is cap-free, and no frame of any condition meets all three bars.

| condition | 160: in band | 160: canopy ≥ 0.6 | 160: all three | 66: in band | 66: canopy ≥ 0.6 | 66: all three | a canopy tree after 50 (160 / 66) | canopy/ha, median 100–300 (160 / 66) |
|---|---|---|---|---|---|---|---|---|
| r6 (#121's schedule) | 2/9 | 1/9 | 1/9 | 2/9 | 1/9 | 0/9 | 3/3 / 3/3 | 94 / 38 |
| A1 θ 0.3 | 1/9 | 4/9 | 0/9 | 1/9 | 6/9 | 0/9 | 3/3 / 3/3 | 47 / 38 |
| A1 θ 0.5 | 1/9 | 4/9 | 0/9 | 1/9 | 7/9 | 0/9 | 3/3 / 3/3 | 47 / 38 |
| A1 θ 0.5, m_s 3 | 1/9 | 5/9 | 0/9 | 0/9 | 9/9 | 0/9 | 3/3 / 2/3 | 31 / 38 |
| A2 k 5, g 0.1 | 0/9 | 3/9 | 0/9 | 2/9 | 4/9 | 0/9 | 3/3 / 1/3 | 78 / 76 |
| A2 k 10, g 0.3 | 1/9 | 3/9 | 0/9 | 1/9 | 7/9 | 0/9 | 3/3 / 0/3 | 109 / 227 |
| B D 96 | 2/9 | 0/9 | 0/9 | 3/9 | 0/9 | 0/9 | 3/3 / 3/3 | 104 / 51 |
| B D 128 | 2/9 | 0/9 | 0/9 | 2/9 | 0/9 | 0/9 | 3/3 / 3/3 | 78 / 38 |
| A1 θ 0.3 + D 128 | 1/9 | 2/9 | 0/9 | 0/9 | 5/9 | 0/9 | 3/3 / 3/3 | 55 / 38 |
| A1 θ 0.5 + D 128 | 2/9 | 1/9 | 0/9 | 1/9 | 5/9 | 0/9 | 3/3 / 3/3 | 39 / 38 |

How to read the table:
- **A1's canopy share at 66 cells is trivial.** It is 1 or 2 drawn stems, one of them the canopy tree: 38–76/ha, far below the band.
- **A2's canopy/ha is inflated.** When the canopy dies, the top height falls and a young cohort counts as "canopy". Under A2, 160 s2 has 101 "canopy" trees at season 100 with a top of 60 cells: a gap phase passing as canopy.

### Who dies of the new signal

The tallies below are O4 deaths by height class, read where the tree died (`deaths.py`). The O4 draw is one draw against the canopy rate plus the signal; below the canopy, the canopy rate is negligible.
- **A1 θ 0.3, 160 s2** (against r6's 247 seedling, 21 understorey and 5 canopy):
  - seedlings: 1,334 (hornbeam 1,143, rowan 114, maple 48, holly 20, beech 8);
  - understorey: 183 (hornbeam 170);
  - canopy: 16 (birch 6, willow 3, oak 2, rowan 2, holly 1, hornbeam 1, maple 1).
- **A1 θ 0.5, 160 s3**:
  - understorey: 448 (hornbeam 376, maple 31, birch 18, rowan 14);
  - seedlings: 1,580 (hornbeam 726, rowan 405, maple 208, birch 203).
- **A1 kills light-demanding canopy trees.** A birch or willow under the top half of the stand has a top darker than θ_q and little tolerance. The canopy per hectare falls from 94 to 47.
- **A2 k 5, g 0.1, 160 s2: 70 canopy deaths** (hornbeam 55) and 245 in the understorey. As measured above, a canopy tree at the stand's top has stalled too.
- **The seedling bank survives under A1, in the right order.** Median seasons alive of recruits that die below 1.3 m:
  - A1 θ 0.3: birch 3–4.5, rowan 4, maple 5–6, hornbeam 9–10, holly 9.5–13, beech 14;
  - A1 θ 0.5: birch 2, oak 3, rowan 4, maple 5, hornbeam 9.
  - The bank holds 44–153 stems per run (mean from season 100) and fills the cap.
- **Under A2 the bank also survives**: holly 14, hornbeam 9, beech 7.

### Hornbeam's share

Hornbeam is the top species in nearly every frame of every condition:
- A1: 0.5–1.0 at 160 cells, 1.0 at 66;
- B: 0.7–0.9 by season 200;
- A1 + D 128: 0.36–0.89 at 160 cells.

Its seed supply, measured in the schedule note at 0.2–0.6 million seeds a run, is untouched by any candidate. A1 kills its understorey trees, and its seedlings refill the cap.

### The 66-cell garden

In every condition a single canopy tree holds the 66-cell garden, at both 64 and 128 cells of depth:
- crowns are 83–98 cells wide and deep at seasons 100–150;
- the canopy is one tree, 38/ha, at the median of every condition except A2;
- A2's higher canopy/ha at 66 is the gap-phase artefact above.

5–10 drawn stems "mostly canopy" needs ≥ 3 canopy trees on 0.026 ha, crowns of about 7 m. No candidate gives that. A deeper period adds area (D 128: 0.053 ha, 132 cap) but still about one canopy tree per 0.026 ha.

### B's cost

Measured on the stand at the cap, seed 1, under the other agent's load:

| garden | WASM ms/season (101–120) | WASM memory | native s/season (300 seasons, contended) |
|---|---|---|---|
| 160 × 64 | 956 | 198 MB | ≈ 1.2–1.4 (A1 runs; r6 has no wall record) |
| 160 × 96 | 976 | 287 MB | ≈ 1.4–1.9 |
| 160 × 128 | 1,195 | 383 MB | ≈ 1.9–2.1 |
| 66 × 64 | 382 | 81 MB | ≈ 0.5–0.6 |
| 66 × 128 | 705 | 163 MB | ≈ 0.8–0.9 |

- Memory doubles with D: the light grid is W × D × 24 bytes a row.
- WASM time rises 25% at 160 cells and 85% at 66.

## What adopting either would need

Nothing here meets the bars, so nothing is proposed. If the user still wants A1 as the suppression signal (it is the one that kills the right trees in the right order), adoption needs:
- **Params:** `o4.suppressionSignal` with `topLight` as the garden's, and `o4.topLightThreshold` with a value from the ≥ 20-seed run.
  - Either keep `carbon` as the default and an ablation, or combine the signals (max of the two deficits). Combining is a spec decision.
- **State:** none. Q_top is computed each season by C5 when T_rel > 0. Without C5's relative test, O4 would compute `crown_top_light` itself.
- **Checkpoints:** no layout change. A2 needs none either, because it reads `birthSeason`.
- **ADR 0063:** decision 3 amended. It says "a suppression rate from low vigour (R1's carbon balance)"; it would name the top's relative light as the vigour signal, scaled by shade tolerance as now.
- **Spec §O4:** amended to match, with the threshold's anchor (an overtopped crown's relative light), plus a unit test per signal (one exists on this branch).

B would need:
- `forestParams`' depth set to 96 or 128;
- the per-hectare cap kept;
- the memory and WASM-time increase above accepted for the phone;
- ADR 0062 decision 3's "D stays 64 unless the density needs a longer period" invoked with this evidence.

This round's evidence does not support B: canopy/ha did not rise.

**What still fails under every candidate:**
- **The canopy holds too few trees per hectare** (about 80–110 at best) for "mostly canopy" at 200–400 drawn/ha.
- **The seedling bank, refilled by hornbeam's seed supply, reaches the cap.**

Neither is a rate or a period. The canopy count depends on crown width in a stand, and the bank's size on seed supply, the cap's size or the bars themselves. All of these are decisions for the user.

## Per-condition tables

Each cell gives drawn stems (per ha), canopy share and top species. The r6 baseline is in [the schedule note](2026-11-10-garden-schedule.md).

**sA1-q30** `{"params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.3}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 6 (94), 0.83, hornbeam 50% | 3 (47), 1.00, hornbeam 67% | 2 (31), 1.00, hornbeam 100% | 171 | yes | 0.50/0.67/1.00 |
| 160 | 2 | 4 (63), 0.75, hornbeam 75% | 149 (2328), 0.01, hornbeam 100% | 56 (875), 0.05, hornbeam 100% | 214 | yes | 0.75/1.00/1.00 |
| 160 | 3 | 109 (1703), 0.06, hornbeam 89% | 29 (453), 0.21, hornbeam 86% | 18 (281), 0.44, hornbeam 89% | 188 | yes | 0.89/0.86/0.89 |
| 66 | 1 | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 2 (76), 0.50, hornbeam 100% | 167 | yes | 1.00/1.00/1.00 |
| 66 | 2 | 2 (76), 0.50, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 5 (189), 0.20, hornbeam 100% | 215 | yes | 1.00/1.00/1.00 |
| 66 | 3 | 2 (76), 1.00, hornbeam 50% | 1 (38), 1.00, hornbeam 100% | 9 (341), 0.89, hornbeam 100% | 128 | yes | 0.50/1.00/1.00 |

**sA1-q50** `{"params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.5}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 6 (94), 0.67, hornbeam 50% | 5 (78), 0.60, hornbeam 80% | 20 (313), 0.10, hornbeam 100% | 181 | yes | 0.50/0.80/1.00 |
| 160 | 2 | 6 (94), 0.67, hornbeam 67% | 115 (1797), 0.02, hornbeam 100% | 89 (1391), 0.02, hornbeam 100% | 219 | yes | 0.67/1.00/1.00 |
| 160 | 3 | 74 (1156), 0.08, hornbeam 91% | 82 (1281), 0.05, hornbeam 96% | 12 (188), 0.92, hornbeam 83% | 172 | yes | 0.91/0.96/0.83 |
| 66 | 1 | 1 (38), 1.00, hornbeam 100% | 2 (76), 0.50, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 147 | yes | 1.00/1.00/1.00 |
| 66 | 2 | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 4 (152), 0.25, hornbeam 100% | 188 | yes | 1.00/1.00/1.00 |
| 66 | 3 | 2 (76), 1.00, hornbeam 50% | 1 (38), 1.00, hornbeam 100% | 6 (227), 0.67, hornbeam 100% | 128 | yes | 0.50/1.00/1.00 |

**sA1-q50-m3** `{"params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.5, "mSuppression": 3}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 3 (47), 1.00, hornbeam 67% | 2 (31), 1.00, hornbeam 100% | 2 (31), 1.00, hornbeam 100% | 155 | yes | 0.67/1.00/1.00 |
| 160 | 2 | 4 (63), 0.75, hornbeam 100% | 16 (250), 0.13, hornbeam 100% | 5 (78), 0.40, hornbeam 100% | 215 | yes | 1.00/1.00/1.00 |
| 160 | 3 | 31 (484), 0.16, hornbeam 87% | 39 (609), 0.08, hornbeam 95% | 8 (125), 1.00, hornbeam 63% | 170 | yes | 0.87/0.95/0.63 |
| 66 | 1 | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 148 | yes | 1.00/1.00/1.00 |
| 66 | 2 | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 192 | yes | 1.00/1.00/1.00 |
| 66 | 3 | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 4 (152), 1.00, hornbeam 100% | 147 | no | 1.00/1.00/1.00 |

**sA2-k5-g10** `{"params": {"o4": {"suppressionSignal": "growth", "growthSeasons": 5, "growthFloor": 0.1}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 6 (94), 0.67, beech 33% | 4 (63), 1.00, hornbeam 75% | 11 (172), 0.09, beech 82% | 140 | yes | 0.33/0.75/0.18 |
| 160 | 2 | 155 (2422), 0.65, hornbeam 87% | 106 (1656), 0.05, hornbeam 99% | 86 (1344), 0.06, hornbeam 100% | 134 | yes | 0.87/0.99/1.00 |
| 160 | 3 | 122 (1906), 0.02, hornbeam 91% | 91 (1422), 0.05, beech 52% | 107 (1672), 0.04, hornbeam 64% | 188 | yes | 0.91/0.48/0.64 |
| 66 | 1 | 1 (38), 1.00, hornbeam 100% | 3 (114), 1.00, hornbeam 100% | 8 (303), 0.88, hornbeam 100% | 53 | no | 1.00/1.00/1.00 |
| 66 | 2 | 54 (2045), 0.70, hornbeam 94% | 32 (1212), 0.06, hornbeam 100% | 12 (455), 0.08, hornbeam 100% | 117 | no | 0.94/1.00/1.00 |
| 66 | 3 | 7 (265), 0.14, beech 57% | 3 (114), 0.33, beech 100% | 2 (76), 0.50, beech 100% | 130 | yes | 0.00/0.00/0.00 |

**sA2-k10-g30** `{"params": {"o4": {"suppressionSignal": "growth", "growthSeasons": 10, "growthFloor": 0.3}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 4 (63), 0.75, hornbeam 50% | 9 (141), 0.89, hornbeam 100% | 14 (219), 0.71, hornbeam 100% | 98 | yes | 0.50/1.00/1.00 |
| 160 | 2 | 157 (2453), 0.25, hornbeam 88% | 127 (1984), 0.01, beech 95% | 79 (1234), 0.18, beech 99% | 202 | yes | 0.88/0.05/0.00 |
| 160 | 3 | 138 (2156), 0.03, hornbeam 88% | 92 (1438), 0.12, hornbeam 100% | 156 (2438), 0.01, hornbeam 100% | 168 | yes | 0.88/1.00/1.00 |
| 66 | 1 | 1 (38), 1.00, hornbeam 100% | 2 (76), 1.00, hornbeam 100% | 18 (682), 0.78, hornbeam 100% | 81 | no | 1.00/1.00/1.00 |
| 66 | 2 | 54 (2045), 0.56, hornbeam 98% | 42 (1591), 0.10, hornbeam 100% | 7 (265), 0.86, hornbeam 100% | 101 | no | 0.98/1.00/1.00 |
| 66 | 3 | 1 (38), 1.00, hornbeam 100% | 4 (152), 0.75, hornbeam 100% | 25 (947), 0.76, hornbeam 100% | 146 | no | 1.00/1.00/1.00 |

**sB-d96** `{"depth": 96}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 25 (260), 0.40, hornbeam 20% | 190 (1979), 0.06, hornbeam 89% | 129 (1344), 0.05, hornbeam 89% | 213 | yes | 0.20/0.89/0.89 |
| 160 | 2 | 37 (385), 0.38, maple 24% | 209 (2177), 0.04, hornbeam 66% | 187 (1948), 0.06, hornbeam 73% | 243 | yes | 0.11/0.66/0.73 |
| 160 | 3 | 172 (1792), 0.07, hornbeam 76% | 197 (2052), 0.06, hornbeam 84% | 145 (1510), 0.04, hornbeam 72% | 244 | yes | 0.76/0.84/0.72 |
| 66 | 1 | 4 (101), 0.50, beech 50% | 8 (202), 0.25, hornbeam 100% | 26 (657), 0.08, hornbeam 100% | 185 | yes | 0.50/1.00/1.00 |
| 66 | 2 | 6 (152), 0.50, beech 33% | 6 (152), 0.33, hornbeam 50% | 44 (1111), 0.05, hornbeam 95% | 228 | yes | 0.33/0.50/0.95 |
| 66 | 3 | 6 (152), 0.33, beech 33% | 8 (202), 0.25, hornbeam 50% | 11 (278), 0.36, hornbeam 82% | 185 | yes | 0.33/0.50/0.82 |

**sB-d128** `{"depth": 128}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 35 (273), 0.29, beech 23% | 271 (2117), 0.04, hornbeam 69% | 246 (1922), 0.04, hornbeam 70% | 222 | yes | 0.20/0.69/0.70 |
| 160 | 2 | 37 (289), 0.46, hornbeam 19% | 274 (2141), 0.03, hornbeam 91% | 247 (1930), 0.05, hornbeam 89% | 232 | yes | 0.19/0.91/0.89 |
| 160 | 3 | 190 (1484), 0.09, hornbeam 71% | 268 (2094), 0.05, hornbeam 84% | 233 (1820), 0.04, hornbeam 84% | 242 | yes | 0.71/0.84/0.84 |
| 66 | 1 | 7 (133), 0.43, beech 29% | 14 (265), 0.07, hornbeam 86% | 53 (1004), 0.02, hornbeam 96% | 153 | yes | 0.29/0.86/0.96 |
| 66 | 2 | 6 (114), 0.33, beech 33% | 5 (95), 0.40, hornbeam 80% | 13 (246), 0.15, hornbeam 92% | 222 | yes | 0.33/0.80/0.92 |
| 66 | 3 | 106 (2008), 0.07, beech 71% | 95 (1799), 0.11, beech 65% | 102 (1932), 0.04, beech 58% | 249 | yes | 0.16/0.25/0.39 |

**sAB-q30-d128** `{"depth": 128, "params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.3}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 11 (86), 0.64, hornbeam 36% | 97 (758), 0.05, hornbeam 85% | 62 (484), 0.06, hornbeam 87% | 195 | yes | 0.36/0.85/0.87 |
| 160 | 2 | 17 (133), 0.88, birch 35% | 180 (1406), 0.03, hornbeam 89% | 82 (641), 0.17, hornbeam 61% | 235 | yes | 0.29/0.89/0.61 |
| 160 | 3 | 121 (945), 0.12, hornbeam 85% | 70 (547), 0.16, hornbeam 84% | 48 (375), 0.21, beech 50% | 237 | yes | 0.85/0.84/0.40 |
| 66 | 1 | 2 (38), 1.00, hornbeam 100% | 2 (38), 1.00, hornbeam 100% | 2 (38), 1.00, hornbeam 100% | 171 | yes | 1.00/1.00/1.00 |
| 66 | 2 | 2 (38), 1.00, hornbeam 100% | 3 (57), 0.67, hornbeam 100% | 5 (95), 0.40, hornbeam 100% | 213 | yes | 1.00/1.00/1.00 |
| 66 | 3 | 59 (1117), 0.07, beech 78% | 35 (663), 0.06, hornbeam 63% | 10 (189), 0.30, beech 60% | 231 | yes | 0.19/0.63/0.40 |

**sAB-q50-d128** `{"depth": 128, "params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.5}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 5 (39), 0.80, hornbeam 80% | 72 (563), 0.03, hornbeam 100% | 120 (938), 0.02, hornbeam 100% | 185 | yes | 0.80/1.00/1.00 |
| 160 | 2 | 34 (266), 0.26, hornbeam 62% | 194 (1516), 0.02, hornbeam 96% | 58 (453), 0.26, hornbeam 53% | 230 | yes | 0.62/0.96/0.53 |
| 160 | 3 | 116 (906), 0.12, hornbeam 88% | 81 (633), 0.10, hornbeam 93% | 39 (305), 0.23, hornbeam 87% | 231 | yes | 0.88/0.93/0.87 |
| 66 | 1 | 3 (57), 1.00, hornbeam 67% | 2 (38), 1.00, hornbeam 100% | 3 (57), 0.67, hornbeam 100% | 163 | yes | 0.67/1.00/1.00 |
| 66 | 2 | 2 (38), 1.00, hornbeam 100% | 3 (57), 0.67, hornbeam 100% | 21 (398), 0.10, hornbeam 100% | 218 | yes | 1.00/1.00/1.00 |
| 66 | 3 | 60 (1136), 0.05, beech 73% | 10 (189), 0.40, hornbeam 70% | 36 (682), 0.06, beech 64% | 240 | yes | 0.23/0.70/0.33 |

