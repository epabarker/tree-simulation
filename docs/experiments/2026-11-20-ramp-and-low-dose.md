# #138's ramp at θ_hi 0.10 with a low shade dose δλ, on M (2026-11-20)

**Ticket:** [#138](https://github.com/epabarker/tree-simulation/issues/138) (understorey saplings with a carbon surplus do not grow). **Follows:** [the low-dose ladder](2026-11-20-sapling-release-low-dose.md) (δλ 0.10–0.25, PR #161) and [the ramp re-probe](2026-11-16-understorey-ramp-memory-probe.md) (θ_hi 0.10–0.25 with light memory). **ADRs:** [0068](../decisions/0068-understorey-signal-design.md) (the `topLight` ramp, the band), [0071](../decisions/0071-shade-apical-control.md) (δλ), [0072](../decisions/0072-seedling-stubs.md) and [0073](../decisions/0073-light-memory.md) (M). Exploratory: params only, nothing under `rust/` or `src/` changes, and no default moves. The user approved the probe on 2026-11-20; it is the last before the garden adoption.

**Why.** The low-dose ladder found that δλ 0.10 and 0.15 grow M's shaded saplings at a realistic rate (0.18 and 0.28 m a decade) but flood the late frames: stems ≥ 7 cm DBH at frame 200 are 484 and 594/ha against `M`'s 204 (ADR 0068's band is 200–400), and at 300 1,172 and 1,266 against `M`'s 1,055. Its conclusion was that a release needs a sink for the stems it sends past 7 cm. The ramp re-probe found the opposite failure: ADR 0068's `topLight` ramp at θ_hi 0.10 kills dark stems (42% of the cohort dead by 300 against `M`'s 22%) and empties the phone. The two have never been run together. **The idea:** the ramp removes the stems that stay dark, while δλ lets the rest grow out of the dark. **Does the pair give realistic sapling growth without worsening the late overshoot?**

**Code:** [`code/2026-11-20-ramp-low-dose/`](code/2026-11-20-ramp-low-dose/): `run.ts`, `bars.ts` and `stand.py`, copied from the low-dose ladder's and changed only in the arms, the reuse (below), the ramp re-probe's cohort (its code, unchanged) and the phone's stem count added to each garden, and bars 14–16. Every measure the ladder read is computed by the same code.

## Arms and bars (fixed before the runs)

Written and committed before any run of this probe. Nothing below this heading changes them.

### Arms

| arm | world | per species | source |
|---|---|---|---|
| `M` | o4: s3d (`stubs`, `stubLight` 0.15, `stubDeath` 3, `stubDemote` 0.075) + `lightMemory` 2.5 | – | the reference: the candidate garden; reused |
| `Mr10` | as `M`, and o4 `suppressionSignal` "topLight", `topLightThreshold` (θ_hi) 0.10, `mSuppression` 1 | `o4.survivalLight` (θ_sp): the ramp re-probe's values | the ramp re-probe's "M + ramp 0.10"; its 160-cell gardens reused |
| `Mdl10` | as `M`, and `r5.dLambda` 0.10 | every species: `r5.dLambda` 0.10 | the low-dose ladder's; reused |
| `Mdl15` | as `M`, and `r5.dLambda` 0.15 | every species: `r5.dLambda` 0.15 | the low-dose ladder's; reused |
| `Mr10dl10` | as `Mr10`, and `r5.dLambda` 0.10 | θ_sp, and `r5.dLambda` 0.10 | new |
| `Mr10dl15` | as `Mr10`, and `r5.dLambda` 0.15 | θ_sp, and `r5.dLambda` 0.15 | new |

- **θ_sp:** birch 0.21, oak 0.114, beech 0.034, hornbeam 0.033, willow 0.16, rowan 0.11, maple 0.075, holly 0.035, pine 0.25, fir 0.0275 (`cli/understorey-probe.ts`'s `SURVIVAL_LIGHT`, as in the ramp re-probe).
- **Patched per species.** δλ is set on the world and on every species' own patch, θ_sp on every species' patch (a world-level patch misses fields species set). `run.ts` prints each species' effective δλ, signal, θ_hi, m_s, θ_sp and C5 flag per arm as a check.
- **Held fixed:** M's params; HEAD's seed supply, `maxTrees`, `c2.rotate`; R1's `unspent` "lost"; one commit for every new run.
- **Stages, per arm and seed:** as the ladder's: the garden (`forestParams(width, seed)`) at 160 and 66 cells to season 300, metamers at 100, 200 and 300; the sapling probe (`rust/core/examples/sapling_probe.rs`) on the 160-cell params to 300; lone beech, hornbeam, oak and maple (`loneTreeParams`) to 100, seeds 1–3.
- **Reuse.** Nothing under `rust/`, `src/core/`, `src/wasm/` or `cli/` has changed since the ladder's commit (ced255b). Since the ramp re-probe's (b223db6) only #135's floored-height rule was added (`extent.rs`, off and bit-identical by its own check). Every linked run's params must equal this script's, or the script stops.
  - From the ladder: `M`'s 160-cell gardens and sapling probes; `Mdl10`'s and `Mdl15`'s gardens at both widths, sapling probes and lone trees.
  - From the ramp re-probe: `Mr10`'s 160-cell gardens. It ran no sapling probe or lone beech and maple, so `Mr10`'s sapling probes and lone trees are new here.
  - On seeds 1–3 every linked garden and sapling probe is re-run under `check/`: the garden's hash and `saplings.csv`'s bytes must equal the linked run's.
  - `M`'s and `Mr10`'s 66-cell gardens (the phone's wall within this load) and `M`'s lone trees are re-run on every seed, and each hash must equal its source's.
  - If any check differs, the affected arm is re-run in full and the note says so. The check is written to `reuse-check.txt`.
  - `Mdl10`'s and `Mdl15`'s phone wall times are the ladder's load; they are reference arms, and bar 10 for them is read as reported there.
- **Pilot:** seeds 1–3 of the two new arms (with the re-runs and checks) first, read for crashes and wall time, and judged per frame on stems ≥ 7 cm/ha at frames 200 and 300 at 160 cells (each seed's value, against `M`'s, `Mr10`'s and the same dose alone's on the same seed), not on a median over frames. Both new arms then run on seeds 1–20 whatever the pilot shows; the pilot's runs are part of the 20.
- **Simulators:** at most 10 (`-j 10`, the sapling probe counted), after `pgrep -c treesim`.

### Definitions

- As the ladder's: the sapling class (live trees 4–20 cells, 1–5 m, seasons 50–290 of the 160-cell sapling probe, all species); a sapling-season without growth; the gain per decade; the shaded beech and hornbeam saplings (top bud light `qTop` under 0.5); DBH at 1.3 m; a canopy tree (drawn and strictly over half the season's top height); per hectare on width × 64 cells of 0.25 m; frames 100, 200 and 300; canopy deaths; cap seasons; wall time; the distance from the band, max(0, 200 − x, x − 400); beech's canopy share at 300.
- **The cohort** (the ramp re-probe's, its code unchanged): the drawn stems (≥ 1.3 m) under 7 cm DBH alive at season 200, and the share of them dead by 300, pooled over the 20 runs per width. The share of its survivors that are ≥ 7 cm at 300 is reported beside it. Under the ramp re-probe `M` was 22% / 47% (160 / 66 cells) and `Mr10` 42% / 79%.
- **The phone's stems:** the number of stems ≥ 7 cm DBH in the 66-cell plot at a frame (one stem is 38/ha there), the median over the 20 runs. Under the ladder `M` is 114 / 76/ha at frames 200 / 300, that is 3 / 2 stems.

### Bars

Bars 1–13 are the ladder's, as written there and judged by the same code (`bars.ts`), read against `M` for every arm (the two new arms are judged; `Mr10`, `Mdl10` and `Mdl15` are read as references):

1. **Per seed, no growth** below `M`'s on the same seed in **≥ 15 of 20** seeds.
2. **Per seed, gain** above `M`'s on the same seed in **≥ 15 of 20** (in both, a seed where either side has under 30 sapling-seasons is a miss).
3. **Pooled no growth ≤ 0.61.**
4. **#122's gates** in **≥ 18 of 20** runs at each width.
5. **Canopy trees/ha** at each width **at least `M`'s**.
6. **The band kept:** frames with stems ≥ 7 cm at 200–400/ha at 160 cells **no fewer than `M`'s** (of 60; the ladder's `M`: 16).
7. **Maple's pooled no-growth share at most `M`'s + 0.05** (`M` 0.83).
8. **#134's bar 6** (`stand.py`): hornbeam passes at 100 and 300, and no species–season cell that passes under `M` fails.
9. **Canopy deaths** per run (mean, 160 cells) **at most 1.5× `M`'s**.
10. **The phone's wall time** (median per run at 66 cells) **at most 1.25× `M`'s** (`M`'s 66-cell runs re-run in this load).
11. **The lone trees' hashes** at 100 equal `M`'s (or, where one differs, inside the ladder's noise bar).
12. **Realism:** the median gain per decade of shaded beech and hornbeam saplings, seeds 1–20 pooled, **within 0.1–0.5 m** (`M` 0.04). The seeds whose own median is in the band are reported beside it.
13. **The late frames no worse than `M`:** at 160 cells, the median over runs of stems ≥ 7 cm/ha at frame 200 and at frame 300, each **no farther from the 200–400 band than `M`'s**: `M` is 204/ha at 200 (in the band, so the arm must be in it too) and 1,055/ha at 300 (so the arm must be at most 1,055 there). Per seed counts (no worse than `M`'s same seed; in the band) are reported; the 66-cell values are reported, not gated.

And three new, judged on the paired arms (`Mr10dl10`, `Mr10dl15`) only:

14. **The ramp lowers the late stems against the same dose alone:** at 160 cells, the median over runs of stems ≥ 7 cm/ha at frame 200 and at frame 300 each **strictly below** the same dose's δλ-only arm (`Mr10dl10` against `Mdl10`: 484 / 1,172; `Mr10dl15` against `Mdl15`: 594 / 1,266). The seeds lower than the same seed's δλ-only value are reported beside it.
15. **The cohort:** the share of the cohort dead by 300 at 160 and at 66 cells each **at most `Mr10`'s** (the ramp re-probe's 42% / 79%, re-read here on `Mr10`'s runs). This is the idea under test: δλ lets the ramp's dark stems grow out of the dark before it kills them. `M`'s (22% / 47%) is reported beside it.
16. **The phone:** at 66 cells, the median number of stems ≥ 7 cm in the plot at frame 200 and at frame 300, each **at least `M`'s** (3 and 2 stems). The ramp emptied it before (`Mr10`: 38–76/ha from 200). The runs with no such stem at 200 or 300 are reported beside it, against `M`'s.

A paired arm **passes** if it passes all sixteen. **A pass is not adoption:** it is recommended to the user. No default changes in this PR, and no ADR changes.

**Reported, not gated:** maple's no-growth share; beech's canopy share at 300 at both widths, and the canopy's leading species; the seedling bank (live stems under 1.3 m) per frame; cap seasons at 160 and 66; band frames at both widths; stems ≥ 7 cm/ha by frame at both widths; thrown canopy trees and canopy deaths per run, and canopy deaths as a share of canopy trees a season; the gain per decade over the whole class; the no-growth share per species; the cohort's survivors ≥ 7 cm at 300; bars 1–13 on `Mr10` against `M`.

### Expected (written before the runs)

- **Bar 12 likely holds:** the ramp acts on stems that are already dark and not growing; the saplings it spares are released as under δλ alone, so the shaded gain should stay near 0.18 / 0.28 m. It may rise a little (fewer competitors) or fall (the ramp's deficit reduces vigour before death).
- **Bar 14 is the question.** The ramp re-probe's `Mr10` held 250/ha median over frames against `M`'s 297, so the ramp does thin the stems that would cross 7 cm. Whether it thins the δλ arms' extra ~280–390/ha at 200 is open: the stems δλ releases are the ones that grow, and the ramp spares growing stems. The likeliest outcome is a small reduction at 200 and little at 300, so the arms pass 14 and still fail 13.
- **Bar 15 may pass:** δλ raises the top light of released stems, so fewer stay under θ_hi.
- **Bar 16 is at risk:** the ramp emptied the phone in every ramp arm; δλ alone kept `M`'s 114 / 76/ha there at 0.10.
- **Maple (bar 7)** froze at every dose; the ramp adds shade-death for maple saplings under θ_sp 0.075, so it likely fails again.
- **The lone trees** hash as `M`'s: R5's shade and the ramp's deficit are both zero for a lone tree in full light.

## Results (seeds 1–20, 1346f7e)

**No paired arm passes. The ramp does the job it was paired for, but at a cost.** Against the same dose alone it lowers stems ≥ 7 cm/ha at 160 cells at both late frames (bar 14 passes for both arms). `Mr10dl10` is the nearest: it keeps frame 200 in ADR 0068's band (297/ha) and brings frame 300 under `M`'s overshoot (766 against 1,055/ha). Its shaded beech and hornbeam gain 0.25 m a decade, inside the realism band. It passes 12 of 16 bars and fails four:
- band frames: 11 of 60, against `M`'s 16;
- canopy deaths: 18.0 a run, against a bar of 15.1;
- the cohort: 58% / 88% dead by 300, against `Mr10`'s 42% / 79%;
- the phone: a median of 2 / 1 stems ≥ 7 cm in the plot at 200 / 300, against `M`'s 3 / 2.

`Mr10dl15` fails seven bars (4, 5, 6, 7, 9, 13 and 16). **The idea under test fails at 0.10.** δλ 0.10 does not let the ramp's dark stems grow out of the dark: more of the cohort dies, not fewer. Nothing is adopted.

**Runs:** 255 runs at 1346f7e, with the 27 checks among them (the pilot on seeds 1–3, 39.5 min; the rest 44.4 min; 10 simulators). The other 204 runs were linked: `M`'s, `Mdl10`'s and `Mdl15`'s from the ladder, and `Mr10`'s 160-cell gardens from the ramp re-probe.

**The reuse holds.** Every linked run's params equal this script's, and all 79 re-runs and checks equal their sources ([`reuse-check.txt`](code/2026-11-20-ramp-low-dose/reuse-check.txt)):
- the 27 checks on seeds 1–3 (garden hashes and `saplings.csv` bytes);
- `M`'s and `Mr10`'s 66-cell gardens on all 20 seeds;
- `M`'s 12 lone trees.

`Mr10` re-reads as the ramp re-probe's: cohort 42% / 79%, 15 band frames, a median of 250/ha. The output is in [`bars.txt`](code/2026-11-20-ramp-low-dose/bars.txt), [`output.txt`](code/2026-11-20-ramp-low-dose/output.txt), [`pilot.txt`](code/2026-11-20-ramp-low-dose/pilot.txt) and [`tables.md`](code/2026-11-20-ramp-low-dose/tables.md) (`stand.py`).

### The pilot (seeds 1–3, stems ≥ 7 cm/ha at 160 cells, frames 200 / 300)

| arm | s1 | s2 | s3 |
|---|---|---|---|
| `M` | 109 / 78 | 188 / 1,156 | 797 / 672 |
| `Mr10` | 63 / 31 | 94 / 1,031 | 703 / 359 |
| `Mdl10` | 141 / 859 | 1,656 / 1,406 | 797 / 719 |
| `Mdl15` | 63 / 1,297 | 1,453 / 1,281 | 1,016 / 1,406 |
| `Mr10dl10` | 109 / 844 | 1,844 / 1,125 | 891 / 609 |
| `Mr10dl15` | 31 / 1,266 | 1,594 / 891 | 875 / 969 |

No run crashed, and the phone's wall was 87–104 s a run. Read per frame, both paired arms were over `M` at 300 on 2 of the 3 seeds. Seed 2 flooded at 200 under every δλ arm, with or without the ramp. Both arms then ran on 20 seeds, as pre-registered.

### Bars 1–13 (each arm against `M`)

`M`'s values: pooled no growth 0.68; shaded gain 0.04 m; canopy/ha 133 / 76; band frames 16 of 60; maple 0.83; canopy deaths 10.1 a run; the phone's wall 89 s; gates 20 / 19.

| arm | 1: no growth falls per seed (≥ 15 of 20) | 2: gain rises per seed (≥ 15 of 20) | 3: pooled no growth (≤ 0.61) | 4: gates 160 / 66 (≥ 18 of 20) | 5: canopy/ha 160 / 66 (≥ 133 / 76) | 6: band frames, 160 (≥ 16 of 60) | 7: maple (≤ 0.88) | 8: hornbeam z 100 / 300; M's cells kept | 9: canopy deaths/run (≤ 15.1) | 10: phone wall (≤ 1.25×) | 11: lone hashes (12) | 12: shaded gain (0.1–0.5 m) | 13: frames 200 / 300 (in band; ≤ 1,055) | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `Mr10dl10` | 17 ✓ | 17 ✓ | 0.60 ✓ | 20 / 19 ✓ | 148 / 76 ✓ | **11** ✗ | 0.85 ✓ | 0.13 / −0.31 ✓ | **18.0** ✗ | 94 s (1.05) ✓ | 12 equal ✓ | 0.25 ✓ (9 of 20 seeds) | 297 / 766 ✓ (seeds no worse than M: 9 / 12) | fail (6, 9; and 15, 16) |
| `Mr10dl15` | 18 ✓ | 18 ✓ | 0.52 ✓ | 19 / **17** ✗ | 164 / **57** ✗ | **5** ✗ | **0.89** ✗ | −0.27 / −0.68 ✓ | **23.6** ✗ | 91 s (1.03) ✓ | 12 equal ✓ | 0.44 ✓ (9 of 20) | **555** / 907 ✗ (8 / 11) | fail (4, 5, 6, 7, 9, 13; and 16) |
| `Mr10` (ref.) | 14 ✗ | 14 ✗ | 0.66 ✗ | 20 / 18 ✓ | 125 / 38 ✗ | 15 ✗ | 0.82 ✓ | −0.10 / −0.08 ✓ | 14.6 ✓ | 92 s (1.03) ✓ | 12 equal ✓ | 0.09 ✗ (5 of 20) | 219 / 664 ✓ (11 / 13) | fail |
| `Mdl10` (ref.) | 14 ✗ | 16 ✓ | 0.64 ✗ | 20 / 19 ✓ | 148 / 76 ✓ | 9 ✗ | 0.92 ✗ | −0.02 / −0.85 ✓ | 14.5 ✓ | 95 s (1.07)¹ ✓ | 12 equal ✓ | 0.18 ✓ | 484 / 1,172 ✗ | fail (as in the ladder) |
| `Mdl15` (ref.) | 13 ✗ | 18 ✓ | 0.60 ✓ | 20 / 20 ✓ | 148 / 114 ✓ | 10 ✗ | 0.94 ✗ | −0.29 / −0.96 ✓ | 17.0 ✗ | 96 s (1.08)¹ ✓ | 12 equal ✓ | 0.28 ✓ | 594 / 1,266 ✗ | fail (as in the ladder) |

¹ Wall times from the ladder's load, against this load's `M`.

### Bars 14–16 (the paired arms)

| arm | 14: ≥ 7 cm/ha at 160, frames 200 / 300, below the dose alone's | 15: cohort dead by 300, 160 / 66 (≤ `Mr10`'s 42% / 79%) | 16: the phone, ≥ 7 cm stems in the plot at 66, frames 200 / 300 (≥ `M`'s 3 / 2) |
|---|---|---|---|
| `Mr10dl10` | 297 / 766 against `Mdl10`'s 484 / 1,172 ✓ (seeds lower 11 / 16 of 20) | **58% / 88%** ✗ (`M` 22% / 47%) | **2 / 1** ✗ (no run empty at 200 or 300) |
| `Mr10dl15` | 555 / 907 against `Mdl15`'s 594 / 1,266 ✓ (13 / 15 of 20) | 42% / 65% ✓ | **2** / 3 ✗ (no run empty) |

### The cohort and the phone (bars 15 and 16, and reported)

| arm | cohort per run, 160 / 66 | dead by 300, 160 / 66 | survivors ≥ 7 cm at 300, 160 / 66 | ≥ 7 cm stems in the 66-cell plot, 100 / 200 / 300 (per ha) | band frames 160 / 66 (of 60) |
|---|---|---|---|---|---|
| `M` | 56.9 / 5.1 | 22% / 47% | 37% / 41% | 3 / 3 / 2 (114 / 114 / 76) | 16 / 5 |
| `Mr10` | 51.4 / 6.9 | 42% / 79% | 48% / 48% | 3.5 / 1 / 1 (133 / 38 / 38) | 15 / 6 |
| `Mdl10` | 62.7 / 6.4 | 23% / 75% | 40% / 31% | 4.5 / 3 / 2 (171 / 114 / 76) | 9 / 8 |
| `Mdl15` | 61.5 / 3.9 | 20% / 55% | 48% / 54% | 3.5 / 3 / 5 (133 / 114 / 190) | 10 / 9 |
| `Mr10dl10` | 47.5 / 5.2 | 58% / 88% | 60% / 25% | 3.5 / 2 / 1 (133 / 76 / 38) | 11 / 6 |
| `Mr10dl15` | 42.2 / 3.3 | 42% / 65% | 63% / 78% | 3 / 2 / 3 (114 / 76 / 114) | 5 / 6 |

- **At δλ 0.10 the pair kills more of the cohort than the ramp alone** (58% against 42% at 160 cells), and its survivors cross 7 cm more often (60% against 48%). An inference, not traced here: δλ releases the stems that already grow, those overtop their neighbours, the neighbours' mean top light falls under θ_hi, and the ramp takes them. At 0.15 the cohort is smaller at 200 (42.2 a run against 51.4) and dies at the ramp's own rate.
- **The ramp's sink works on the late frames.** At 160 cells it takes 188 / 406 stems ≥ 7 cm/ha off δλ 0.10 at 200 / 300, and 39 / 359 off 0.15. Per seed it lowers frame 300 in 16 and 15 of 20 seeds. That puts 0.10's median at 200 in the band and its 300 under `M`'s. It does not do the same for 0.15 at 200 (555/ha).
- **The median hides the spread (bar 6).** `Mr10dl10`'s median is in the band at 200, but only 11 of its 60 frames are: 3 seeds at 200 and none at 300. The seeds either flood (seed 2: 1,844/ha at 200) or stay low. `M` is in the band in 16 frames.
- **The phone thins as under the ramp alone.** At 66 cells `Mr10dl10` keeps a median of 2, then 1, stems ≥ 7 cm in the plot at 200 and 300 (`M` 3 and 2; `Mr10` 1 and 1). No run is empty. δλ 0.15 restores frame 300 (3 stems) but not 200.
- **The canopy deaths (bar 9) come from the ramp's rate:** 0.43% and 0.44% of canopy trees a season, against `M`'s 0.28%. That is `Mr10`'s 0.42%, on a larger canopy. In the ladder the cause was different: the same rate on more trees.

### Reported

| arm | gain/decade, whole class (median; P90; share none) | maple no growth | bank per frame 160 / 66 | cap seasons 160 / 66 | thrown/run 160 / 66 | canopy deaths/run 160 / 66 | canopy deaths, % of canopy trees a season, 160 / 66 | beech canopy share at 300, 160 / 66 | canopy at 300, 160 |
|---|---|---|---|---|---|---|---|---|---|
| `M` | 0.04; 1.28; 0.29 | 0.83 | 7.5 / 0 | 62.5 / 14.5 | 4.3 / 1.6 | 10.1 / 6.7 | 0.28 / 0.48 | 0.13 / 0.12 | hornbeam 0.74, beech 0.13 |
| `Mr10` | 0.08; 1.35; 0.26 | 0.82 | 6 / 0 | 57.5 / 19.5 | 3.6 / 1.6 | 14.6 / 8.8 | 0.42 / 0.64 | 0.10 / 0.05 | hornbeam 0.77, beech 0.10 |
| `Mdl10` | 0.18; 1.85; 0.23 | 0.92 | 3.5 / 0 | 61 / 19.5 | 5.6 / 2.5 | 14.5 / 7.6 | 0.31 / 0.44 | 0.33 / 0.28 | hornbeam 0.61, beech 0.33 |
| `Mdl15` | 0.29; 1.85; 0.18 | 0.94 | 2 / 0 | 72 / 29 | 6.8 / 2.5 | 17.0 / 9.4 | 0.33 / 0.45 | 0.51 / 0.37 | beech 0.51, hornbeam 0.45 |
| `Mr10dl10` | 0.24; 2.14; 0.20 | 0.85 | 4 / 1 | 41 / 19.5 | 5.4 / 2.3 | 18.0 / 9.4 | 0.43 / 0.60 | 0.30 / 0.29 | hornbeam 0.64, beech 0.30 |
| `Mr10dl15` | 0.46; 2.66; 0.15 | 0.89 | 2 / 0 | 57.5 / 17 | 7.7 / 2.3 | 23.6 / 9.9 | 0.44 / 0.50 | 0.68 / 0.27 | beech 0.68, hornbeam 0.30 |

- **Maple comes back with the ramp:** 0.85 under `Mr10dl10` against `Mdl10`'s 0.92, inside bar 7. Under 0.15 it is 0.89, just over the bar.
- **Beech's canopy share** at 300 follows the dose, not the ramp: 0.30 and 0.68 at 160 cells, against 0.33 and 0.51 without the ramp. `Mr10dl15` is a beech wood at 160 cells.
- **Cap seasons:** `Mr10dl10` lowers the desktop's median cap from 62.5 to 41 seasons. The phone's is 19.5 against `M`'s 14.5, as under `Mr10` and `Mdl10`. Two of its 66-cell runs never reach the cap.
- **The lone trees** hash as `M`'s in every arm (12 of 12 each).
- **#134's bar 6:** hornbeam passes at 100 and 300 in every arm, and no cell that passes under `M` fails.

## Conclusions

- **The pair does better than either half, but still fails its bars.** `Mr10dl10` is the first arm on M with all three of these:
  - a realistic release (0.25 m a decade);
  - frame 200 in the band;
  - frame 300 below `M`'s overshoot.
  It also keeps maple, the canopy, the gates, hornbeam's bar 6 and the phone's wall. At θ_hi 0.10 the ramp is the sink for released stems that the ladder asked for.
- **It fails on the ramp's costs, not on the flood:**
  - the phone thins (2 / 1 stems ≥ 7 cm against 3 / 2);
  - canopy trees die at the ramp's rate (18 a run, 0.43% a season);
  - the band holds only in the median, in 11 of 60 frames.
- **The cohort result goes against the idea under test.** It fails at 58% dead: δλ does not rescue the ramp's dark stems.
- **δλ 0.15 is too much even with the ramp.** Frame 200 floods (555/ha), beech takes the canopy, and the phone's gates fall.

## Decisions for the user

1. **Is `Mr10dl10` acceptable despite the bars it fails?** It passes 12 of 16. It fails:
   - band frames: 11 against 16;
   - canopy deaths: 18.0 against 15.1;
   - the cohort: 58% / 88% against `Mr10`'s 42% / 79%;
   - the phone: 2 / 1 stems against 3 / 2.

   If the user takes the late medians (bar 13) as the band's test, and accepts one or two stems ≥ 7 cm on the phone, it is the candidate that answers #138. Otherwise #138 has no params-only answer on M: `r5.dLambda` stays 0.02 and the ramp stays off.
2. **The garden adoption.** The user's rule, set while this probe ran (devlog, 2026-11-20), was that if the pairing fails, M is adopted as it stands. On the pre-registered bars both pairs fail, so the recommendation is to adopt M with neither rule. Taking `Mr10dl10` instead would mean waiving bars 6, 9, 15 and 16. That is the user's call, and would be recorded in ADRs 0068 and 0071.
3. **If more is wanted:** the phone is where the ramp fails in every probe. Two candidates need a code change, outside this probe: a ramp that waits until a stem has had a chance at a gap (the ramp re-probe's "release term"), or a ceiling for the phone alone.

## Limits

- One θ_hi (0.10), two doses, and δλ on every species. θ_hi below 0.10 and doses between 0.10 and 0.15 were not run.
- Bar 13 is judged on the median over runs at each frame. The per-seed counts beside it (for `Mr10dl10`, 9 / 12 of 20 seeds no worse than `M`'s same seed) are weaker than the medians suggest, and bar 6 shows the spread.
- The phone bar counts 2–3 stems in a 66 × 64-cell plot, so one stem moves it. The per-hectare values are those counts × 38.
- `Mdl10`'s and `Mdl15`'s phone wall times come from the ladder's load. They are reference arms only.
- `Mr10`'s 160-cell gardens were made at b223db6. Its re-runs on seeds 1–3, and its 66-cell re-runs, show them unchanged at 1346f7e.

## Reproduce

```
node docs/experiments/code/2026-11-20-ramp-low-dose/run.ts -j 10 --seeds 1-3 --reuse-dl <the ladder's runs/138-dl-ladder> --reuse-ramp <the ramp re-probe's runs/132-ramp-memory>
node docs/experiments/code/2026-11-20-ramp-low-dose/run.ts -j 10 --reuse-dl <the same> --reuse-ramp <the same>
uv run --project analysis python -I docs/experiments/code/2026-11-20-ramp-low-dose/stand.py -j 10
node docs/experiments/code/2026-11-20-ramp-low-dose/bars.ts runs/138-ramp-dl
```

Runs (not committed): `runs/138-ramp-dl/`.
