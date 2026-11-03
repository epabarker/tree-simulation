# Phase 1: the converter, describe(), and which descriptors survive QSM resolution (gates a–c)

_2026-11-03, sessions 1a–1c of the [reference-fidelity plan](../plans/2026-11-03-reference-fidelity.md) §j; ADR 0049._

**Result.** Gates a and b pass. Gate c triggers amendment E's stop for oak (5 of 22 gated descriptors survive)
and beech (1 of 26). Maple passes (12 of 22). Nothing was loosened; the plan waits on the user (Decisions below).
The pre-registered control shows the coarsening at a dataset's own resolution is not neutral on that dataset's
own QSMs: badly so on Demol, mildly on Wytham. So part of gate c's failure measures the operator, not the
simulator.

## Reproduce
```
uv run --project analysis python -I -m treesim.fetch noise                       # Wytham's 10-model sets
uv run --project analysis python -I -m treesim.qsm_gate                          # gate a
node cli/dump-trees.ts && uv run --project analysis python -I -m treesim.form_gate   # gate b
uv run --project analysis python -I -m treesim.tolerance                         # the pre-registration (committed)
uv run --project analysis python -I analysis/experiments/phase1_degradation.py dump|live|gate|control|bias
```
Data: `data/reference/` (git-ignored), every member in `analysis/fit/sources/reference-manifest.csv` (319 rows: the
199 one-model QSMs, and 120 rows `wytham-noise`). Outputs: `runs/phase1/` (`gate-c.csv`, `gate-c.md`, `shifts.csv`,
`sim-describe.csv`, `control.csv`, `dbh-bias.md`).

## Gates a and b (1a, 1b)
- **Gate a:** recomputed DBH and H against each publisher's own QSM values. Demol 65, Wytham 77 and BioDiv 53 trees
  are all within 5% on both. Ceilings (reported): BioDiv DBH against `dTLS` within 5% for 32%.
- **Gate b:** `form.py` against `form.rs` on 30 trees. The worst relative error is 2.5e-13.
- **BioDiv's 53 beech are "Phase 1 only"** (R5). They are the head of the stream: 19 plots, gap treatments G and
  GD. They are never a source of tolerances or targets.

## Step 2: the tolerances (committed before any run, e74063c)
`analysis/fit/sources/phase1-tolerances.json`, written by `treesim/tolerance.py`.
- **Between-tree SD:** the residual SD (ddof 2) of an OLS fit on ln of measured DBH (R2).
- **Tolerance:** half the between-tree SD.
- **Noise floor:** the RMS over trees of the SD across Wytham's 10 models. A floor of at least half the
  between-tree SD holds the descriptor out.
- **Tolerance sets:**
  - oak: Wytham's 34 oaks with `DBH_pts`;
  - maple: Wytham's 39 sycamores (a proxy);
  - beech: Demol's 15 FSYL, tape DBH. Their spread is used, never their location: Demol is phase 3's held-out site.
- **Noise sets:** 8 middle sycamores, and the 4 oaks of largest between-model DBH SD (81, 6, 8399, 56), which makes
  oak's floor conservative.
- **Beech's noise floor is not measured.** BioDiv's 5 repeats of the optimum's input set are reported beside it,
  and are not a verdict.
- **Leak guard:** sha256 of `describe.py`, `form.py`, `cylinders.py`, `qsm.py` and `coarsen.py`. The gate refuses
  to run on a mismatch (`test_tolerance.py`). The rules (bracket, pass and fail rules, the dead-tree rule, the H2
  criterion, the control) are in the file's `rules`.

**Resolution per dataset**, from each dataset's own cylinders (raw radii, pooled over its trees):

| dataset | QSMs | d_min (median terminal diameter) | l/r by radius class <5, 5–10, 10–20, 20–40, 40–80, 80–160, ≥160 mm |
|---|---|---|---|
| Demol | 66 (5 sites) | 43 mm (FSYL alone 47) | 29, 14, 6.8, 4.5, 3.5, 2.0, 2.2 |
| Wytham | 77 | 12 mm | 67, 21, 9.7, 5.4, 4.5, 4.7, 4.8 |
| BioDiv | 53 beech | 20 mm (also applied to oak) | 11, 6.4, 5.2, 3.5, 2.6, 1.8, 1.2 |

**Tolerances** (between-tree SD [its 95% χ² interval]; tolerance = half the SD; noise floor as a fraction of the SD).
The verdict from the noise floor alone is "noise", "H1" or clear (blank):

| descriptor | oak SD | tol | noise | | maple SD | tol | noise | | beech SD [95%] | tol | BioDiv 5-repeat (not a verdict) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| widestAt | 0.17 | 0.085 | 0.52 | noise | 0.21 | 0.11 | 0.48 | | 0.23 [0.17, 0.37] | 0.11 | 0.47 |
| profileCentre | 0.040 | 0.020 | 0.19 | | 0.035 | 0.018 | 0.40 | | 0.062 [0.045, 0.099] | 0.031 | 0.39 |
| crownFullness | 0.065 | 0.032 | 0.18 | | 0.073 | 0.037 | 0.42 | | 0.11 [0.077, 0.17] | 0.053 | 0.42 |
| forkHeight | 0.16 | 0.079 | 0.28 | | 0.11 | 0.056 | 0.66 | noise | 0.12 [0.089, 0.20] | 0.061 | 0.75 |
| leaderDominance | 0.22 | 0.11 | 0.82 | H1 | 0.22 | 0.11 | 0.78 | H1 | 0.43 [0.31, 0.70] | 0.22 | 0.91 |
| branchAngle2 (°) | 5.2 | 2.6 | 0.30 | | 7.6 | 3.8 | 0.29 | | 6.0 [4.3, 9.6] | 3.0 | 1.39 |
| limbDroop (°) | 16 | 8.1 | 0.56 | noise | 20 | 10 | 0.62 | noise | 16 [11, 25] | 7.8 | 0.71 |
| limbUpturn (°) | 14 | 7.2 | 0.72 | noise | 15 | 7.7 | 0.71 | noise | 10 [7.6, 17] | 5.2 | 0.92 |
| junctionDelta | 0.38 | 0.19 | 0.25 | H1 | 0.30 | 0.15 | 0.80 | H1 | 0.21 [0.15, 0.34] | 0.10 | 0.67 |
| ldSlope | 0.24 | 0.12 | 0.60 | H1 | 0.32 | 0.16 | 0.91 | H1 | 0.15 [0.11, 0.25] | 0.076 | 0.67 |
| limbElevation (°) | 9.0 | 4.5 | 0.23 | | 13 | 6.6 | 0.33 | | 9.8 [7.1, 16] | 4.9 | 0.25 |
| p0 | 0.17 | 0.086 | 0.17 | | 0.21 | 0.10 | 0.33 | | 0.32 [0.23, 0.51] | 0.16 | 0.29 |
| p1 | 0.17 | 0.086 | 0.17 | | 0.17 | 0.086 | 0.39 | | 0.22 [0.16, 0.35] | 0.11 | 0.26 |
| p2 | 0.082 | 0.041 | 0.11 | | 0.087 | 0.043 | 0.16 | | 0.098 [0.071, 0.16] | 0.049 | 0.84 |
| p3 | 0.11 | 0.057 | 0.27 | | 0.15 | 0.077 | 0.19 | | 0.14 [0.10, 0.23] | 0.070 | 0.57 |
| bifurcationRatio | 0.43 | 0.22 | 0.35 | | 0.54 | 0.27 | 0.64 | noise | 0.18 [0.13, 0.29] | 0.089 | 1.66 |
| bifurcationRatio2 | 0.42 | 0.21 | 0.41 | | 0.79 | 0.40 | 0.56 | noise | 0.21 [0.16, 0.35] | 0.11 | 2.03 |
| tortuosity | 0.18 | 0.090 | 0.22 | | 0.21 | 0.10 | 0.42 | | 0.13 [0.094, 0.21] | 0.065 | 0.84 |
| tortuosity05 | 0.088 | 0.044 | 0.22 | | 0.13 | 0.062 | 0.38 | | 0.10 [0.075, 0.17] | 0.051 | 0.82 |
| length0 | 0.055 | 0.027 | 0.02 | | 0.026 | 0.013 | 0.23 | | 0.017 [0.012, 0.027] | 0.0082 | 0.28 |
| length1 | 0.10 | 0.051 | 0.03 | | 0.048 | 0.024 | 0.36 | | 0.032 [0.023, 0.052] | 0.016 | 0.36 |
| length2 | 0.044 | 0.022 | 0.20 | | 0.040 | 0.020 | 0.52 | noise | 0.038 [0.027, 0.061] | 0.019 | 0.41 |
| length3 | 0.17 | 0.085 | 0.07 | | 0.074 | 0.037 | 0.45 | | 0.077 [0.056, 0.12] | 0.038 | 0.27 |
| pendulousFraction | 0.062 | 0.031 | 0.16 | | 0.10 | 0.052 | 0.18 | | 0.055 [0.040, 0.088] | 0.027 | 0.38 |
| taper | 0.13 | 0.063 | 0.77 | H1 | 0.11 | 0.057 | 0.50 | H1 | 0.079 [0.057, 0.13] | 0.040 | 4.36 |
| centroidHeight | 0.069 | 0.034 | 0.06 | | 0.068 | 0.034 | 0.12 | | 0.075 [0.054, 0.12] | 0.037 | 0.36 |

The oak and maple intervals are narrower than beech's (n 34 and 39 against 15): about ×0.81 to ×1.30. Oak's and
maple's are in the JSON.

## Step 3: coarsen() and the simulated trees
- **`treesim/coarsen.py`, in order:**
  1. inflate (the inflation point only);
  2. prune every cylinder under d_min, with its subtree;
  3. re-cut each geometric axis greedily to the class ratio, keeping volume.
  - Coarsening twice changes nothing (`test_coarsen.py`, which covers the bracket on a branching crown).
- **The inflation variant** comes from Demol et al. 2022 (*Silva Fennica* 56(1) 10550), checked against the PDF.
  On two leaf-off *Fraxinus*, §3.2 measures the QSM diameter overestimate at +73% for d < 2.5 cm and +4% for d > 10 cm.
  Between the two it is log-interpolated (not measured). Table 3's per-class volumes agree: classes < 5 cm are about
  80–83% of the excess.
- **The simulated trees:** oak, beech and maple (field maple; sycamore its proxy), seeds 1–20, through
  `cli/dump-trees.ts --gate-c` (out of any build, as gate b).
  - **The closed stand at 150, gated:** the four measured trees, live ones only.
  - **Live trees per seed:** oak 4 every seed; beech 2–4; maple 2–4. Every seed has at least one.
  - **The lone tree at 100:** reported only.
- **Simulated sizes at 150** (median, range):

  | species | DBH | H |
  |---|---|---|
  | oak | 0.33 m (0.27–0.46) | 41 m |
  | beech | 0.58 m (0.30–0.77) | 50 m |
  | maple | 0.25 m (0.17–0.43) | 22 m |

  Oak's DBH sits at the small end of Wytham's measured oaks (0.39–1.03 m). Oak and beech are taller than every
  reference QSM: Wytham's oaks reach 24 m (median 20), Demol's beech 24 m and BioDiv's 34 m. Maple's height is within
  Wytham's sycamores (8–31 m).

## Step 4: gate c
The pass rule: |shift| ≤ tolerance on at least 15 of the 20 seeds, at every bracket point (d_min ×0.5, ×1, ×2, and
inflation at ×1) and at every dataset of the species. The shift is the per-seed median, over the live measured
trees, of the coarsened descriptor minus the original. A hold-out is read as "tolerance uncertain" when its worst
median |shift| lies within half the upper 95% bound of the SD, and "resolution-sensitive" beyond it.
Full table: `runs/phase1/gate-c.md`.

| species | survive (of gated) | survivors | held out: noise floor | resolution-sensitive | tolerance uncertain |
|---|---|---|---|---|---|
| oak | **5 of 22: stop** | forkHeight, limbElevation, p0, tortuosity, tortuosity05 | widestAt, limbDroop, limbUpturn | profileCentre, crownFullness, branchAngle2, p2, p3, both bifurcation ratios, length0–3, centroidHeight | p1, pendulousFraction |
| beech | **1 of 26: stop** | taper | (not measured) | crownFullness, leaderDominance, branchAngle2, limbDroop, junctionDelta, ldSlope, limbElevation, p2, both bifurcation ratios, tortuosity, tortuosity05, length0–3, pendulousFraction, centroidHeight | widestAt, profileCentre, forkHeight, limbUpturn, p0, p1, p3 |
| maple | **12 of 22** | widestAt, profileCentre, crownFullness, branchAngle2, limbElevation, p0–p3, tortuosity, tortuosity05, pendulousFraction | forkHeight, limbDroop, limbUpturn, both bifurcation ratios, length2 (forkHeight and limbDroop also pass gate c) | length0, length1, length3, centroidHeight | – |

H1-excluded and not counted: junctionDelta, ldSlope, taper and leaderDominance for oak and maple.

**Where it fails:** the number of gated, noise-clear descriptors passing at each point.
- Oak (19): Wytham ×0.5 17, ×1 12, ×2 6, inflated 14; BioDiv ×0.5 14, ×1 7, ×2 5, inflated 13.
- Beech (26): Demol ×0.5 16, ×1 6, ×2 1, inflated 13; BioDiv ×0.5 17, ×1 17, ×2 6, inflated 15.
- Maple (16): Wytham ×0.5 16, ×1 13, ×2 12, inflated 16.

The bracket's ×2 point does most of the damage. At Demol's ×1 (47 mm) already, and ×2 (95 mm), most of a
150-season crown is pruned.

**The control** (pre-registered): each real QSM coarsened at its own dataset's resolution ×1. The median shift
exceeds the tolerance for:
- oak (Wytham): junctionDelta, ldSlope (both H1), tortuosity (−0.12) and length2;
- maple: junctionDelta (H1) and length0–3;
- beech (Demol): 20 of 26, among them limbDroop −35°, limbElevation +17°, length0 +0.36 and tortuosity −0.50.

d_min is the *median* terminal diameter, so ×1 removes half of a real QSM's own tips and everything beyond them.
The operator is not neutral at "the dataset's resolution", and on Demol it is far from it. The length-by-order
descriptors and raw tortuosity also move on Wytham's own trees.

## H1–H4 (the user's hypotheses after 1b)
- **H1 (Wytham radii):** applied: oak's four radius descriptors are neither targets nor hold-outs. Extended here to
  maple, which uses the same dataset (the user's to confirm). Consistent with it: the control moves junctionDelta
  by −0.84 on Wytham's own oaks and −1.06 on its sycamores, about 4 and 7 tolerances.
- **H2 (ldSlope from small-branch inflation): not supported.**
  - The prediction was that inflation moves the simulated ldSlope toward the QSM medians (beech: Demol 0.30,
    BioDiv 0.05; the simulated 0.94).
  - It moves away: to 1.52 at Demol and 1.40 at BioDiv.
  - The gap closed: −0.88 at Demol and −0.52 at BioDiv (and at ×1 without inflation, −0.47 and −0.17). On oak at
    Wytham it is −1.70, on maple −2.07.
  - Inflating the twigs raises ldSlope. So the QSMs' low slope is not this bias, and the gap stays unexplained.
- **H3 (tortuosity):** resampling at 0.5 m on both sides narrows the gap without closing it.

  | | raw | at 0.5 m |
  |---|---|---|
  | QSM medians: Demol beech | 1.59 | 1.29 |
  | QSM medians: BioDiv beech | 1.46 | 1.26 |
  | QSM medians: Wytham oak | 1.56 | 1.26 |
  | QSM medians: Wytham sycamore | 1.44 | 1.19 |
  | simulated stand at 150: beech | 1.18 | 1.14 |
  | simulated stand at 150: oak | 1.02 | 1.02 |
  | simulated stand at 150: maple | 1.34 | 1.24 |
  | simulated lone at 100: beech | 1.24 | 1.19 |
  | simulated lone at 100: oak | 1.09 | 1.07 |
  | simulated lone at 100: maple | 1.21 | 1.13 |

  Coarsening barely moves the simulated value (Wytham ×1: oak 1.019 and 1.017). Real axes stay bendier than the
  simulator's above 0.5 m, most for oak. Resampling also halves the between-tree SD (oak's tolerance falls from 0.090 to 0.044); both versions pass
  gate c for oak and maple, and both fail for beech.
- **H4 (the DBH offset): the signs disagree, so BioDiv's thin DBH is not a shared method offset.** The median of
  QSM DBH over the measured DBH, minus 1 (`runs/phase1/dbh-bias.md`):

  | dataset | species | reference | n | median | IQR | share > 0 |
  |---|---|---|---|---|---|---|
  | Demol | beech (FSYL) | tape | 15 | −0.5% | −1.0 to +0.2% | 27% |
  | Demol | ash, pines, larch | tape | 50 | −2.0 to −6.4% | | 0–27% |
  | Wytham | sycamore | points (`DBH_pts`) | 39 | −1.0% | −2.7 to +1.1% | 38% |
  | Wytham | oak | points | 34 | **+6.8%** | +2.1 to +12.0% | 79% |
  | BioDiv | beech | points (`dTLS`) | 53 | **−7.4%** | −17 to −3.3% | 9% |

  The references differ in kind (tape against point clouds), so even agreement would have been weak evidence. Here
  there is none: Wytham's oaks read thick and BioDiv's beech thin.

## Notes
- `form.py`'s branchAngle2 raises a numpy warning (a zero-length horizontal heading) on some QSMs. It was present
  in 1b and is left alone: it is hashed code. Not investigated in 1c.
- The gate's NaN rule counts a seed whose descriptor is NaN on any live tree as a fail.

## Decisions for the user (the plan waits here)
1. **What next for oak and beech, after the stop?** The control shows that d_min as the *median* terminal diameter
   prunes half of a real QSM's own tips. So "at the dataset's resolution" is not where the QSMs are. One option: a
   new pre-registration that sets d_min where the control is neutral on that dataset's own QSMs, for example a low
   quantile of terminal diameters. It would be fixed from real data alone, with the reason in this note, before
   gate c is re-run. Whether that counts as loosening is the user's call; this session changed nothing. The other
   options: accept the hold-outs (beech would fit on one descriptor), or keep ×1 and drop ×2 at Demol.
2. **H1 for maple:** the exclusion extended to Wytham's sycamores. Confirm or revert.
3. **Beech's noise floor:** no 10-model set exists for beech. BioDiv's 5 repeats give large ratios (taper 4.4,
   bifurcation ratios 1.7–2.0) but are "Phase 1 only". Use them as the verdict, fetch repeats elsewhere, or leave
   it unmeasured?
4. **`dump-trees.ts --gate-c`** widens a script approved for gate b only (it is still in no build). Keep it?
5. **Size matching:** the simulated stand at 150 is taller than any reference: oak 41 m against Wytham's oaks'
   24 m at most, beech 50 m against BioDiv's 34 m. Oak's DBH sits at the bottom of Wytham's. Phases 3–4 compare at matched size, so this needs
   attention before they start.
