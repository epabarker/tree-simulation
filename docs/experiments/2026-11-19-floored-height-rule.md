# #135: the floored height rule at Choi's rates, on 20 seeds (2026-11-19)

**Ticket:** [#135](https://github.com/epabarker/tree-simulation/issues/135), step 5 of [#129](https://github.com/epabarker/tree-simulation/issues/129)'s chain. **ADR:** [0074](../decisions/0074-height-floored-extent-rule.md) (proposed). Built off by default: nothing here changes a default, a preset, a species or a golden.

**Question.** The rule `H40k2f` (level shoots extend with a chance that falls with the tree's height, L_x 10 m, k 2, floor 0.1; [the crown-extent probe](2026-11-13-crown-extent-probe.md) §1–3) was run there on three seeds with defects. Built as a principle with its defects settled, does it bring the lone tree's late crown-edge rate to Choi et al. 2001's 2–3 cm a season, and how does it leave ADR 0067's lone triad? With beech's B2 leader beside it, and in the candidate garden M?

**Code:** [`code/2026-11-19-floored-height/`](code/2026-11-19-floored-height/): `lone.ts` (one lone tree), `run.sh` and `arms.json` (the lone arms), `table.ts` (the lone tables and bars), `stand.ts` (the garden runs and their summary), `stand.py` (bar 6 and the stand H/D, through #134's `stand.py`).

## 1. The condition (step 1, before the rule was built)

The issue is conditional: the rule is needed only if the late edge rate at HEAD is still above Choi's.

- **The measure:** the crown-extent probe's (§3): the gain in mean crown radius (dbh.py's `cr_m`, the four core extents ÷ 4, here from the core's `crownWidth` and `crownDepth`) from season 60 to 100, in cm a season, of the lone open-grown tree (`loneTreeParams`). **Choi's level** is 2–3 cm/yr at that size; "above" is a median over seeds 1–20 above 3.
- **The run:** `head` of `arms.json`, six exemplars × seeds 1–20, run first and alone (`run.sh … head 1 20`), before any rule code changed.

**The condition holds: the rule is needed.** HEAD's late edge rate, seeds 1–20 (`table.ts runs/135-floored-height/head.jsonl`), median (range; seeds at or under 3 cm a season):

| species | edge 60–100 (cm/season) | above Choi's? |
|---|---|---|
| beech | 16.1 (13.2–19.1; 0 of 20) | **yes** |
| birch | 12.5 (3.5–15.1; 0 of 20) | **yes** |
| maple | 4.7 (1.7–7.4; 2 of 20) | **yes** |
| oak | 2.0 (−8.3–13.9; 10 of 20) | no |
| hornbeam | −0.0 (−0.1–4.9; 19 of 20) | no |
| holly | −0.0 (−0.0–0.5; 20 of 20) | no |

- Beech's 20 runs reproduce the [λ₀ confirmation](2026-11-16-beech-lam0-confirm.md)'s `head` row exactly (edge 16.1, 13.2–19.1; H/D 66–128, median 75; W/H at 100 1.31–1.62), so the lone build is unchanged since.
- Hornbeam, holly and (on its median) oak already sit at Choi's level: their crowns stop growing out after season 60. So bar E below applies to beech, birch and maple.

## 2. Arms and bars (fixed before any rule run)

Written and committed after the condition's HEAD runs and before any run of the rule. Nothing below this heading changes them.

### 2.1 The lone tree

The lone open-grown tree (`loneTreeParams`, ADR 0062's 60 m box), seeds 1–20, to season 100, read every 10 seasons and at 25 (`lone.ts`, through WASM). At most 10 simulators.

| arm | species | change |
|---|---|---|
| `head` | oak, maple, birch, beech, hornbeam, holly | none (the condition's runs) |
| `rule` | the six | the world's `c1`: `extentLimit` "height", `extentSpare` true, `extentScale` 40, `extentSteepness` 2, `extentFloor` 0.1 (`H40k2f`), under ADR 0074's held buds |
| `rule+B2` | beech | `rule`, and beech's `r2.levels.0.lambda` 0.6708 (B2, the λ₀ confirmation's `lam0+14`) on its own patch |

B2 is a lone-tree arm only: the user keeps today's beech in the stand, because B2 makes beech take about 0.89 of the garden's canopy ([the beech stand check](2026-11-16-beech-stand-check.md)). B2 without the rule is the λ₀ confirmation's `lam0+14` row, on the same seeds and the same lone build (nothing that reaches a lone tree has changed since), and is quoted from there, not re-run.

**Bars** (`table.ts`), each on 20 seeds with the count stated:
- **E, the late edge rate** (the issue's criterion): for each species whose HEAD median is above 3, at or under 3 cm a season in **≥ 15 of 20** seeds.
- **T1, W/H at 100** (`lone.spread`'s measure, the larger core extent ÷ height) in ADR 0067's 0.6–1.2, beech and hornbeam, in **≥ 15 of 20**.
- **T2, H/D at 1.3 m** (D pooled over a codominant fork, `cli/allometry.ts` `pooledDbh`) at 100 in `lone.slenderness`'s band (beech 40–56, hornbeam 48–68) in **≥ 15 of 20**.
- **T3, no species worse than HEAD** (the triad note's bar 5, all six): per species, the median distance from the H/D band at 100 (where a band exists: beech, hornbeam, birch 32–48, oak and maple 40–56) and from the W/H-at-100 band (beech, hornbeam) no larger than HEAD's; the median W ÷ Pretzsch's 95% edge at DBH 40 (where read) no larger than HEAD's; the median height at 100 at least 0.9 of HEAD's (the crown-extent probe's guard).
- **Reported, not gated:** W/H at 60 (bar 2: beech 0.4–0.8, hornbeam 0.5–0.9) with its in-band count and the seeds nearer the band than HEAD's on the same seed; **W at DBH 40 ÷ Pretzsch's edge** (bar 4, half weight), read only where the taper (D at 1.3 m ÷ the root metamer's D) is in 0.8–1.25, with its count of seeds at or under 1.2; H/D at 60; H, W, D and metamers at 100.

An arm **passes** if it meets E, T1, T2 and T3. `rule+B2` is read against HEAD by the same bars, and beside `rule`'s beech (does B2 add to the rule?).

### 2.2 The stand check

The garden (`forestParams(width, seed)`), widths 160 and 66, seeds 1–20, to season 300, natively, metamers at 100, 200 and 300 (`stand.ts`). At most 10 simulators.

| arm | world o4 | world c1 |
|---|---|---|
| `M` | s3d (`stubs`, `stubLight` 0.15, `stubDeath` 3, `stubDemote` 0.075) + `lightMemory` 2.5: the ramp re-probe's `M` | – |
| `MR` | as `M` | `rule`'s |

- **Reuse:** `M` at 160 cells is linked from [the ramp re-probe](2026-11-16-understorey-ramp-memory-probe.md)'s runs after each record's params are checked equal to this script's. At 66 cells `M` is re-run on this build: each hash must equal the ramp re-probe's (the reuse check, and the rule-off bit-identity of this build in the garden). If any differs, `M` at 160 is re-run too and the note says so.
- **Definitions:** the ramp re-probe's (its run.ts measures, unchanged): a canopy tree is drawn and over half the season's top height; per hectare on width × 64 cells of 0.25 m; frames 100, 200, 300.

**Bars** (`MR` against `M`):
- **S1, the gates** (#122): a canopy tree in every season after 50, and at 66 cells in every season from 100, each in **≥ 18 of 20** runs.
- **S2, #129's target 1:** canopy trees/ha from season 100 (the median over runs of each run's median) at least 120 **and** not below `M`'s, at 160 cells.
- **S3, the understorey kept:** ADR 0068's bar-1 frames (stems ≥ 7 cm at 200–400/ha) and bar-2 frames (a ≥ 7 cm canopy share ≥ 0.6) each no fewer than `M`'s, at 160 cells (60 frames).
- **S4, canopy deaths** per run (mean) at most 1.5× `M`'s, at 160 cells.
- **S5, bar 6** (the stand gate, #134's `stand.py`: per species, |median Tallo CR z| ≤ 1 on ≥ 8 canopy trees inside Tallo's support, seeds pooled, 160 cells, at 100 and 300): no species–season cell that passes under `M` fails under `MR`.
- **Reported:** thrown canopy trees, the stand H/D per species against `stand.slenderness` (beech 70–94, hornbeam 74–98), drawn stems/ha, cap seasons, and the wall time at 66 cells (the phone's cost) against `M`'s.

The rule **passes the stand check** if it meets S1–S5.

**The verdict.** The rule is recommended for adoption on a species only if it passes the lone bars (§2.1) and the stand check. If it passes neither, the note says what it does and what it lacks; if the condition fails, it is not built.

RESULTS
