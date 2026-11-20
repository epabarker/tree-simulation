# #138's low-dose ladder on M: δλ 0.10, 0.15 and 0.25 on every species (2026-11-20)

**Ticket:** [#138](https://github.com/epabarker/tree-simulation/issues/138) (understorey saplings with a carbon surplus do not grow). **Follows:** [#138 re-probed on M](2026-11-19-sapling-release-on-m.md) (δλ 0.40, PR #159). **ADRs:** [0071](../decisions/0071-shade-apical-control.md) (δλ, deferred), [0068](../decisions/0068-understorey-signal-design.md) (the band), [0072](../decisions/0072-seedling-stubs.md) and [0073](../decisions/0073-light-memory.md) (M). Exploratory: params only, nothing under `rust/` or `src/` changes, and no default moves. The ladder was approved by the user on 2026-11-20.

**Why.** δλ (`r5.dLambda`) 0.40 on the candidate garden M released the frozen saplings but flooded the band of stems ≥ 7 cm DBH (ADR 0068's 200–400/ha) a century early: 1,141–1,407/ha at frame 200 against M's 204. Only one dose was run on M: the lower per-species dose was skipped because its pilot condition was a median over nine frames, which the early frames held down and so hid the late ones. On HEAD ([the sapling-release probe](2026-11-16-sapling-release-probe.md)) δλ 0.10 gave 5× HEAD's median gain with stems ≥ 7 cm at 328/ha, inside the band. **Is there a dose on M that grows the shaded saplings at a realistic rate without making the late frames worse than M's own?**

**Code:** [`code/2026-11-20-sapling-release-low-dose/`](code/2026-11-20-sapling-release-low-dose/): `run.ts`, `bars.ts` and `stand.py`, copied from the previous probe's and changed only in the arms, the reuse (below) and three added measures (bar 12's saplings, the canopy death rate and the canopy's species per frame); every measure the previous probe read is computed by the same code.

## Arms and bars (fixed before the runs)

Written and committed before any run of this probe. Nothing below this heading changes them.

### Arms

| arm | world | per species | why |
|---|---|---|---|
| `M` | o4: s3d (`stubs`, `stubLight` 0.15, `stubDeath` 3, `stubDemote` 0.075) + `lightMemory` 2.5 | – | the reference: the candidate garden |
| `Mdl10` | as `M`, and `r5.dLambda` 0.10 | every species: `r5.dLambda` 0.10 | HEAD's in-band dose |
| `Mdl15` | as `M`, and `r5.dLambda` 0.15 | every species: `r5.dLambda` 0.15 | between |
| `Mdl25` | as `M`, and `r5.dLambda` 0.25 | every species: `r5.dLambda` 0.25 | the dose under the previous probe's 0.40 |

- **Patched per species.** No species patch carries an `r5` today; each arm sets δλ on the world and on every species' own patch (a world-level patch misses fields species set). `run.ts` prints each species' effective δλ per arm as a check.
- **Held fixed:** M's params; HEAD's seed supply, `maxTrees`, `c2.rotate`; R1's `unspent` "lost"; the ramp off; one commit for every new run.
- **Stages, per arm and seed:** as the previous probe: the garden (`forestParams(width, seed)`) at 160 and 66 cells to season 300, metamers at 100, 200 and 300; the sapling probe (`rust/core/examples/sapling_probe.rs`) on the 160-cell params to 300; lone beech, hornbeam, oak and maple (`loneTreeParams`) to 100, seeds 1–3.
- **Reuse of `M`.** Nothing under `rust/`, `src/core/` or `cli/` has changed since the previous probe's commit (7d54173). `M`'s 160-cell gardens and its sapling probe are linked from the previous probe's runs after each one's params are checked equal to this script's; on seeds 1–3 both are re-run here as well, and the garden's hash and `saplings.csv`'s bytes must equal the linked runs'. `M`'s 66-cell gardens (the phone's wall within one load) and lone trees are re-run on all seeds, and each hash must equal the previous probe's. If any check differs, all of `M` is re-run and the note says so. The check is written to `reuse-check.txt`.
- **Pilot:** seeds 1–3 of every arm first, read for crashes and wall time, and judged on stems ≥ 7 cm/ha at frames 200 and 300 at 160 cells (each seed's value, and the arm's median against `M`'s), not on a median over frames. All three doses then run on seeds 1–20 whatever the pilot shows: the ladder is the question, and the pilot's runs are part of the 20.
- **Simulators:** at most 10 (`-j 10`, the sapling probe counted), after `pgrep -c treesim`.

### Definitions

- As the previous probe's: the sapling class (live trees 4–20 cells, 1–5 m, seasons 50–290 of the 160-cell sapling probe, all species); a sapling-season without growth; the gain per decade; DBH at 1.3 m; a canopy tree (drawn and strictly over half the season's top height); per hectare on width × 64 cells of 0.25 m; frames 100, 200 and 300; canopy deaths (a canopy tree in the season before its death, not thrown); cap seasons; wall time.
- **Shaded beech and hornbeam saplings** (bar 12): the sapling-seasons of beech and hornbeam in the class whose top bud's light `qTop` is under 0.5 (R5's shade s = 1 − Q/C over 0.5, with C = 1). Their gain per decade is the height gain over the next 10 seasons, as above. Under `M` these are 99% of beech's and hornbeam's sapling-seasons.
- **The distance from the band** of a frame's stems ≥ 7 cm/ha x: max(0, 200 − x, x − 400). A frame is **no worse than `M`** when its distance is at most `M`'s.
- **Canopy deaths as a percentage of canopy trees a season:** canopy deaths (not thrown) over the canopy tree-seasons (`stand.csv`'s `canopy`, summed over seasons 1–300), pooled over the 20 runs, × 100.
- **Beech's canopy share at 300:** beech's share of the canopy trees alive at season 300, pooled over the 20 runs.

### Bars (each arm against `M`)

Bars 1–11 are the previous probe's, as written there and judged by the same code (`bars.ts`):

1. **Per seed, no growth** below `M`'s on the same seed in **≥ 15 of 20** seeds.
2. **Per seed, gain** above `M`'s on the same seed in **≥ 15 of 20** (in both, a seed where either side has under 30 sapling-seasons is a miss).
3. **Pooled no growth ≤ 0.61.**
4. **#122's gates** in **≥ 18 of 20** runs at each width.
5. **Canopy trees/ha** at each width **at least `M`'s**.
6. **The band kept:** frames with stems ≥ 7 cm at 200–400/ha at 160 cells **no fewer than `M`'s** (of 60).
7. **Maple's pooled no-growth share at most `M`'s + 0.05.**
8. **#134's bar 6** (`stand.py`): hornbeam passes at 100 and 300, and no species–season cell that passes under `M` fails.
9. **Canopy deaths** per run (mean, 160 cells) **at most 1.5× `M`'s**.
10. **The phone's wall time** (median per run at 66 cells) **at most 1.25× `M`'s**.
11. **The lone trees' hashes** at 100 equal `M`'s (or, where one differs, inside the previous probe's noise bar).

And two new:

12. **Realism:** the median gain per decade of shaded beech and hornbeam saplings, seeds 1–20 pooled, **within 0.1–0.5 m**. `M`'s is 0.04 m (a re-read of the previous probe's runs, which this definition was checked on before any run here); δλ 0.40 gave 0.75 and 1.24 m over the whole class. The number of seeds whose own median (≥ 30 decades) is in the band is reported beside it.
13. **The late frames no worse than `M`:** at 160 cells, the median over runs of stems ≥ 7 cm/ha at frame 200 and at frame 300, each **no farther from the 200–400 band than `M`'s** at the same frame. `M` is 204/ha at 200 (in the band, so the arm must be in it too) and 1,055/ha at 300 (so the arm must be at most 1,055 there). The note states each frame against the band and against `M`'s value, and reports per seed how many seeds are no worse than `M`'s same seed and how many are in the band; the 66-cell values are reported, not gated.

An arm **passes** if it passes all thirteen. **A pass is not adoption:** it is recommended to the user, with ADR 0071 changed only on the user's call. No default changes in this PR.

**Reported, not gated:** maple's no-growth share; the seedling bank (live stems under 1.3 m) per frame; cap seasons at 160 and 66; thrown canopy trees per run; canopy deaths per run and as a percentage of canopy trees a season, at both widths; beech's canopy share at 300 at both widths, and the canopy's leading species; stems ≥ 7 cm/ha by frame at both widths; the gain per decade over the whole class; the no-growth share per species.

### Expected (written before the runs)

- **The release is graded:** on HEAD δλ 0.10 / 0.25 gave a median class gain of 0.10 / 0.33 m, and on M 0.40 gave 0.75, so on M roughly 0.1–0.2 m at 0.10, 0.2–0.3 at 0.15 and 0.4–0.6 at 0.25. Bar 12 likely passes at 0.10 or 0.15 and is at risk above 0.5 at 0.25.
- **The flood may be graded too, or may be a threshold:** if the saplings that grow at all reach 7 cm by 200 the late frames move as with 0.40, only later. On HEAD 0.10 stayed in the band; M's stubs and memory make the stand denser, so frame 200 is at risk at every dose, and least at 0.10.
- **Maple:** 0.40 froze it (0.83 → 0.97); a lower dose shades it less, so bar 7 likely passes at 0.10 and 0.15.
- **The lone trees** hash as `M`'s: R5's signal is neighbour shade, zero for a tree alone.

## Results (seeds 1–20, ced255b)

**No dose passes. δλ 0.10 and 0.15 reach the realism band (shaded beech and hornbeam gain 0.18 and 0.28 m a decade; 0.25 overshoots it at 0.54), but every dose makes the late frames worse than `M`: stems ≥ 7 cm/ha at frame 200 are 484, 594 and 1,375 against `M`'s 204 (in the band), and at 300 1,172, 1,266 and 1,516 against `M`'s 1,055. Every dose also freezes maple harder (bar 7) and loses band frames (bar 6). No dose grows the saplings realistically without worsening the late frames. Nothing is adopted; ADR 0071 stays deferred.**

**Runs:** 254 new runs at ced255b (the pilot, seeds 1–3, 33.7 min; the rest 52.9 min, 10 simulators), and `M`'s 20 gardens at 160 cells and 20 sapling probes linked from the previous probe. **The reuse holds:** every linked run's params equal this script's; the 6 re-runs on seeds 1–3 (garden hash and `saplings.csv` bytes), `M`'s 20 gardens at 66 cells and its 12 lone trees all equal the previous probe's: 38 of 38 ([`reuse-check.txt`](code/2026-11-20-sapling-release-low-dose/reuse-check.txt)). The output is in [`bars.txt`](code/2026-11-20-sapling-release-low-dose/bars.txt), [`output.txt`](code/2026-11-20-sapling-release-low-dose/output.txt), [`pilot.txt`](code/2026-11-20-sapling-release-low-dose/pilot.txt) and [`tables.md`](code/2026-11-20-sapling-release-low-dose/tables.md) (`stand.py`).

### The pilot (seeds 1–3, frames 200 and 300 at 160 cells)

| arm | s1 | s2 | s3 | median, 200 / 300 |
|---|---|---|---|---|
| `M` | 109 / 78 | 188 / 1,156 | 797 / 672 | 188 / 672 |
| `Mdl10` | 141 / 859 | 1,656 / 1,406 | 797 / 719 | 797 / 859 |
| `Mdl15` | 63 / 1,297 | 1,453 / 1,281 | 1,016 / 1,406 | 1,016 / 1,297 |
| `Mdl25` | 94 / 1,313 | 2,031 / 1,625 | 234 / 1,578 | 234 / 1,578 |

No crashes; the phone's wall 75–104 s a run. Read per frame, the pilot already showed every dose over `M` at 300 on all three seeds, and over it at 200 on 2, 2 and 1 of the three (0.10, 0.15, 0.25). `Mdl25`'s median at 200 (234, in the band) was seed 3's; on 20 seeds it is 1,375. All three doses ran on 20 seeds as pre-registered.

### The bars

`M`: pooled no growth 0.68; shaded beech and hornbeam gain 0.04 m; canopy/ha 133 / 76; band frames 16 of 60; maple 0.83; hornbeam bar 6 z −0.74 / −0.08; canopy deaths 10.1 a run; the phone's wall 85 s; gates 20 / 19.

| arm | 1: no growth falls per seed (≥ 15 of 20) | 2: gain rises per seed (≥ 15 of 20) | 3: pooled no growth (≤ 0.61) | 4: gates 160 / 66 (≥ 18 of 20) | 5: canopy/ha 160 / 66 (≥ M's) | 6: band frames, 160 (≥ 16 of 60) | 7: maple no growth (≤ 0.88) | 8: hornbeam z 100 / 300; M's cells kept | 9: canopy deaths/run (≤ 15.1) | 10: phone wall (≤ 1.25×) | 11: lone hashes (12) | 12: shaded gain (0.1–0.5 m) | 13: late frames no worse than M | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `Mdl10` | 14 ✗ | 16 ✓ | 0.64 ✗ | 20 / 19 ✓ | 148 / 76 ✓ | 9 ✗ | **0.92** ✗ | −0.02 / −0.85 ✓ | 14.5 ✓ | 95 s (1.13) ✓ | 12 equal ✓ | **0.18** ✓ (11 of 20 seeds in band) | 484 / 1,172 ✗ (seeds no worse: 8 / 5 of 20) | **fail** (1, 3, 6, 7, 13) |
| `Mdl15` | 13 ✗ | 18 ✓ | 0.60 ✓ | 20 / 20 ✓ | 148 / 114 ✓ | 10 ✗ | **0.94** ✗ | −0.29 / −0.96 ✓ | 17.0 ✗ | 96 s (1.13) ✓ | 12 equal ✓ | **0.28** ✓ (10 of 20) | 594 / 1,266 ✗ (6 / 6 of 20) | **fail** (1, 6, 7, 9, 13) |
| `Mdl25` | 17 ✓ | 20 ✓ | 0.51 ✓ | 20 / 20 ✓ | 172 / 95 ✓ | 7 ✗ | **0.90** ✗ | −0.28 / −0.46 ✓ | 19.8 ✗ | 90 s (1.06) ✓ | 12 equal ✓ | 0.54 ✗ (8 of 20) | 1,375 / 1,516 ✗ (5 / 1 of 20) | **fail** (6, 7, 9, 12, 13) |

### The flood, frame by frame (bar 13 and reported)

| arm | ≥ 7 cm/ha at 160: 100 / 200 / 300 | frame 200 vs band; vs M (204) | frame 300 vs band; vs M (1,055) | seeds in the band at 200 / 300 (of 20) | at 66: 100 / 200 / 300 (M 114 / 114 / 76) |
|---|---|---|---|---|---|
| `M` | 203 / 204 / 1,055 | in | over (+655) | – | 114 / 114 / 76 |
| `Mdl10` | 188 / 484 / 1,172 | over; **worse** (+281) | over; **worse** (+117) | 2 / 0 | 171 / 114 / 76 |
| `Mdl15` | 196 / 594 / 1,266 | over; **worse** (+390) | over; **worse** (+211) | 0 / 0 | 133 / 114 / 190 |
| `Mdl25` | 172 / 1,375 / 1,516 | over; **worse** (+1,171) | over; **worse** (+461) | 2 / 0 | 152 / 133 / 493 |

- **The flood is graded, not a threshold, and it starts at the lowest dose.** Frame 100 is unchanged (172–203/ha at every dose); by 200 each dose moves the stand's stems ≥ 7 cm out of the band, in order of dose, and at 300 each adds to `M`'s own overshoot. Per seed, at 300 only 5, 6 and 1 of 20 seeds are no worse than `M`'s same seed.
- **At 66 cells (the phone)** 0.10 matches `M` at 200 and 300; 0.15 and 0.25 overshoot at 300 (190 and 493 against 76). Reported only.

### Reported

| arm | gain/decade, whole class (median; P90; share none) | maple no growth | seedling bank per frame 160 / 66 | cap seasons 160 / 66 | thrown/run 160 / 66 | canopy deaths/run 160 / 66 | canopy deaths, % of canopy trees a season, 160 / 66 | beech canopy share at 300, 160 / 66 | canopy at 300, 160 |
|---|---|---|---|---|---|---|---|---|---|
| `M` | 0.04; 1.28; 0.29 | 0.83 | 7.5 / 0 | 62.5 / 14.5 | 4.3 / 1.6 | 10.1 / 6.7 | 0.28 / 0.48 | 0.13 / 0.12 | hornbeam 0.74, beech 0.13 |
| `Mdl10` | 0.18; 1.85; 0.23 | 0.92 | 3.5 / 0 | 61 / 19.5 | 5.6 / 2.5 | 14.5 / 7.6 | 0.31 / 0.44 | 0.33 / 0.28 | hornbeam 0.61, beech 0.33 |
| `Mdl15` | 0.29; 1.85; 0.18 | 0.94 | 2 / 0 | 72 / 29 | 6.8 / 2.5 | 17.0 / 9.4 | 0.33 / 0.45 | 0.51 / 0.37 | beech 0.51, hornbeam 0.45 |
| `Mdl25` | 0.55; 3.05; 0.14 | 0.90 | 1 / 0 | 74 / 30 | 13.7 / 3.7 | 19.8 / 12.3 | 0.29 / 0.46 | 0.46 / 0.64 | hornbeam 0.50, beech 0.46 |

- **The release is graded and linear in dose:** shaded beech and hornbeam gain 0.04 → 0.18 → 0.28 → 0.54 m a decade (the whole class 0.04 → 0.18 → 0.29 → 0.55). Bar 12's band is crossed between 0.15 and 0.25. Per seed the gain is spread: only 8–11 seeds of 20 have their own median in the band at any dose.
- **Canopy deaths per run rise with the canopy, not the rate:** canopy deaths as a share of canopy trees a season are 0.29–0.33% at 160 cells against `M`'s 0.28% (and 0.44–0.46% against 0.48% at 66). Bar 9's fail at 0.15 and 0.25 is more canopy trees dying at the same rate.
- **Beech takes the canopy with dose:** its share at 300 rises 0.13 → 0.33 → 0.51 → 0.46 at 160 cells (0.64 at 66 under 0.25). Hornbeam keeps bar 6 at every dose, beech passes it at 300 at every dose (z 0.86, 0.64, 0.83; it fails under `M`), and oak passes at 300 under 0.25 (z 0.75). No species–season cell that passes under `M` fails.
- **Maple freezes at every dose** (0.83 → 0.90–0.94), as under 0.40 (0.97): the released beech and hornbeam shade it.
- **The seedling bank at 160 cells** falls 7.5 → 3.5 → 2 → 1 a frame; at 66 it is empty in every arm.
- **The lone trees** hash as `M`'s at every dose (36 of 36).

## Conclusions

- **The previous probe's question is answered: there is no low dose that releases without flooding.** Every rung of the ladder that moves the saplings at all (0.10 and up) puts the frame-200 stand out of ADR 0068's band and adds to frame 300's overshoot. The doses that reach the realism band (0.10, 0.15) are exactly the doses that flood less, not the doses that do not flood.
- **HEAD's 0.10 does not transfer to M.** On HEAD 0.10 kept stems ≥ 7 cm at 328/ha; on M, whose stubs and memory keep more stems alive under the canopy, the same dose reaches 484/ha at 200. This repeats the previous probe's conclusion: on M the band holds at 200 only because the saplings are frozen.
- **A dose of δλ is not the lever for #138 on this stand.** Any release needs a sink for the stems it sends past 7 cm (thinning or mortality of released stems), or a stand at lower carrying density. Both are design choices.

## Decisions for the user

1. **Reject ADR 0071 for the garden as it stands?** Five arms on M (δλ 0.10, 0.15 and 0.25 here, 0.40 in two scopes before) fail the band; the recommendation is to mark it rejected for M and keep `r5.dLambda` at 0.02, or keep it deferred behind a sink for stems ≥ 7 cm.
2. **Whether `Mdl10` is acceptable if the late band is not held as a gate.** It gives a realistic release (0.18 m a decade), keeps the gates, canopy, hornbeam's and beech's bar 6, the death rate per canopy tree, and the phone (66 cells, frames at `M`'s), at the cost of frame 200 (484/ha), frame 300 (+117/ha over `M`) and maple (0.92).
3. **#138's next step:** close it as "the freeze holds the band on M", or open a sink for released stems (a thinning or mortality term on stems ≥ 7 cm in shade) as a new ticket.

## Limits

- One species scope (every species); the per-species scope was rejected at 0.40 for turning the garden into a beech wood, and was not re-run.
- Bar 12's "shaded" is the top bud's light under 0.5 of open sky; under `M` that is 99% of beech's and hornbeam's sapling-seasons, so the bar is close to the whole beech and hornbeam class.
- Bar 13 is judged on the median over runs per frame; the per-seed counts are reported beside it and agree.
- `M`'s 160-cell gardens were made on 6a1bd67 and its sapling probes on 7d54173; the re-runs above show both unchanged at ced255b.

## Reproduce

```
node docs/experiments/code/2026-11-20-sapling-release-low-dose/run.ts -j 10 --seeds 1-3 --reuse <the previous probe's runs/138-dl-on-m>
node docs/experiments/code/2026-11-20-sapling-release-low-dose/run.ts -j 10 --reuse <the same>
uv run --project analysis python -I docs/experiments/code/2026-11-20-sapling-release-low-dose/stand.py -j 10
node docs/experiments/code/2026-11-20-sapling-release-low-dose/bars.ts runs/138-dl-ladder
```

Runs (not committed): `runs/138-dl-ladder/`.
