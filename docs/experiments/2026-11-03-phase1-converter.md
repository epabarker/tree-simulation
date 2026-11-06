# Phase 1: the converter, describe(), and which descriptors survive QSM resolution (gates a–c)

_2026-11-03/04, sessions 1a–1c, 1d-i (v2, v3) and 1d-ii (v3.1, run) of the [reference-fidelity plan](../plans/2026-11-03-reference-fidelity.md) §j; ADR 0049._

**Latest (1d-ii, 2026-11-04): gate c v3.1 on simulated trees, see "Gate c v3.1" at the end:** beech 16 of 21 floor-clear descriptors reach a tier (amendment E needs 11), maple 12 of 15, oak not run (its stand never reaches the reference DBH). The paragraphs below are v1's result, kept as written.

**Result (v1).** Gates a and b pass. Gate c triggers amendment E's stop for oak (5 of 22 gated descriptors survive)
and beech (1 of 26). Maple passes (12 of 22) only under
this session's extension of H1 to maple. Under the user's ruling as given (H1 for oak only) its four radius
descriptors count, none survives, and maple stops too: 12 of 26 (spec-reviewer, checked against `gate-c.csv`). Nothing was loosened; the plan waits on the user (Decisions below).
The pre-registered control shows the coarsening at a dataset's own resolution is not neutral on that dataset's
own QSMs: badly so on Demol, mildly on Wytham. So part of gate c's failure measures the operator, not the
simulator.

**v2 (session 1d-i) admitted no species**: the re-cut moved Wytham's own tortuosities, and BioDiv's repeat floor
held out 13 of 24 for beech. **v3 (the same session, after the user's rulings) is registered** (commit 6610fb4):
- coarsening is prune only;
- every segment-length-dependent descriptor is read at the 0.5 m step;
- beech's value is the median of its repeats.

The control is neutral at Wytham to 5.0 mm (p20) and at BioDiv to 8.6 mm (p2). Before any simulated tree, the
descriptors that pass the floor are oak 18, maple 15 and beech 21. See "v2 and v3" below.

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
| maple | **12 of 22** with H1 extended; **12 of 26: stop** without | widestAt, profileCentre, crownFullness, branchAngle2, limbElevation, p0–p3, tortuosity, tortuosity05, pendulousFraction | forkHeight, limbDroop, limbUpturn, both bifurcation ratios, length2 (forkHeight and limbDroop also pass gate c) | length0, length1, length3, centroidHeight | – |

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

## Decisions for the user after v1 (answered: the 1d brief, plan §j)
1. **What next for oak and beech, after the stop?** The control shows that d_min as the *median* terminal diameter
   prunes half of a real QSM's own tips. So "at the dataset's resolution" is not where the QSMs are. One option: a
   new pre-registration that sets d_min where the control is neutral on that dataset's own QSMs, for example a low
   quantile of terminal diameters. It would be fixed from real data alone, with the reason in this note, before
   gate c is re-run. Whether that counts as loosening is the user's call; this session changed nothing. The other
   options: accept the hold-outs (beech would fit on one descriptor), or keep ×1 and drop ×2 at Demol.
2. **H1 for maple:** the exclusion extended to Wytham's sycamores. This decides maple's gate c. Confirmed, it passes
   (12 of 22). Reverted, it stops (12 of 26): junctionDelta and ldSlope pass 0 seeds of 20, leaderDominance 3, and
   taper passes gate c but is held out by its noise floor (0.504 × the SD).
   The count here is of descriptors that survive (pass gate c and clear the noise floor), the reading of the
   pre-registered `held_out` rule. Counting gate c passes alone would give maple 14 of 22, or 14 of 26 (a pass
   either way); oak and beech stop under both readings (oak 6 of 22, beech 1 of 26).
3. **Beech's noise floor:** no 10-model set exists for beech. BioDiv's 5 repeats give large ratios (taper 4.4,
   bifurcation ratios 1.7–2.0) but are "Phase 1 only". Use them as the verdict, fetch repeats elsewhere, or leave
   it unmeasured?
4. **`dump-trees.ts --gate-c`** widens a script approved for gate b only (it is still in no build). Keep it?
5. **Size matching (a deviation from the brief):** the fixed choices say "stand to 150, DBH-matched"; nothing was
   matched, and only the tolerance is detrended on ln DBH. The stand trees carry 1–2k metamers (oak 1,028–1,871 on
   seed 1; maple 387–1,767 live), so a fixed d_min strips proportionally more from them than from the references. Also, the simulated stand at 150 is taller than any reference: oak 41 m against Wytham's oaks'
   24 m at most, beech 50 m against BioDiv's 34 m. Oak's DBH sits at the bottom of Wytham's. Phases 3–4 compare at matched size, so this needs
   attention before they start.

## v2 and v3 (session 1d-i, 2026-11-03)

### v2
**How it was made.**
- **When:** v2 was designed after v1 failed and after its control was seen. It was registered in
  `phase1-tolerances.json` v2 (commit 3f13c29) before any simulated tree was measured again.
- **What it was designed from:**
  - the user's eight rulings (plan §j, the 1d brief);
  - three rulings at the session's plan;
  - the advisor's review of the plan as measurement design.
- **Every v2 parameter derives from real data only:**
  - the tolerances and noise floors, from the QSMs and their repeat or model sets;
  - the grid, from each dataset's own terminal diameters;
  - d_min, from the control on that dataset's own QSMs;
  - the reference DBH, from the measured DBH;
  - the stress point, from Demol et al. 2022.
- **The fixed numbers are the user's:** 0.5 × SD, the 0.5 floor, 90/90, [d_min, 2·d_min] and 15 of 20.
- **Nothing in v2 reads `runs/phase1/sim` or `cli/dump-trees.ts`.** The dump script is hashed, never run.
- **v1** is commit e74063c. It is copied into the file's `v1` block.

**What changed, and why.** v1's control failed at the median: d_min as the median terminal diameter prunes half
of a QSM's own tips (Demol 20 of 26 descriptors over tolerance).

| | v1 (e74063c) | v2 (3f13c29) |
|---|---|---|
| d_min | the median terminal diameter; bracket ×0.5, ×2 | the largest grid percentile (1, 2, 5, 10, 20, 50) at which ≥ 90% of gated descriptors have ≥ 90% of real trees within tolerance after `coarsen()`; bracket withdrawn |
| points gated | ×0.5, ×1, ×2, inflation at ×1 | d_min, grid points inside (d_min, 2·d_min), 2·d_min, inflation at d_min (kept gated: the user) |
| pass rule | per-seed median shift within tolerance on ≥ 15 of 20 seeds at every point | tier A, as v1 at every point; else tier B: per-seed median of v(p) − v(d_min) within tolerance at every point, and the control neutral at d_min (`tiers.py`, hashed) |
| beech tolerances and floor | Demol's 15 FSYL; floor not measured | BioDiv's 53 (dTLS); floor from its 5 repeats (the 1d brief, 4) |
| oak's datasets | Wytham, BioDiv (beech's resolution) | Wytham only (the user: no oak QSMs at BioDiv, so no control can set an oak d_min; this removes a dataset v1 failed oak on) |
| Demol | gated for beech | control curve reported; beech's held-out site |
| ldSlope, junctionDelta | gated (beech), H1 (oak, maple) | report-only |
| H1 for maple | proposed | confirmed |
| size matching | none (a deviation) | `rules.size_match`: the first season of 50–300 by 10 at which the seeds' median DBH reaches the reference median; lone tree ≤ 100 |
| stress point | – | 5 cm (Demol 2022), reported only |
| hashes | 5 code files | 10 code files, `dump-trees.ts`, the manifest, and per-dataset digests of every data file read |

**The control curves.** The cell is the number of gated descriptors that are neutral (≥ 90% of trees within
tolerance) at each grid percentile; "stress" is 5 cm. Gated means not report-only, not H1-excluded and not held
out by the noise floor.

| dataset, species (gated) | operator | p1 | p2 | p5 | p10 | p20 | p50 | stress | rule passes at |
|---|---|---|---|---|---|---|---|---|---|
| Wytham oak (19) | full | 16 | 13 | 13 | 13 | 13 | 8 | 0 | none |
| | prune only | 19 | 19 | 19 | 19 | 17 | 10 | 1 | (diagnostic) |
| Wytham maple (16) | full | 14 | 14 | 14 | 14 | 11 | 3 | 0 | none |
| | prune only | 16 | 16 | 16 | 16 | 16 | 3 | 0 | |
| BioDiv beech (11) | full | 11 | 8 | 3 | 0 | 0 | 0 | 0 | **p1: d_min 7.4 mm** |
| | prune only | 11 | 11 | 4 | 0 | 0 | 0 | 0 | |
| Demol FSYL (11, reported) | full | 9 | 6 | 2 | 1 | 0 | 0 | 0 | none |
| | prune only | 10 | 9 | 2 | 1 | 0 | 0 | 0 | |

- **Grid diameters (mm), p1 to p50:**
  - Wytham: 2.0, 2.5, 2.5, 2.5, 5.0, 12.1. TreeQSM 2.0's terminal radii are quantised: p2 = p5 = p10.
  - BioDiv: 7.4, 8.6, 11.0, 13.6, 18.3, 20.0.
  - Demol: 13.3, 14.8, 17.7, 21.4, 27.3, 43.4.
  - The curves fall monotonically, so d_min needed no tie-breaking rule.
- **Re-cut only.** It does not depend on d. Wytham fails on it:
  - oak: 16 of 19 descriptors neutral (forkHeight 0.89, tortuosity 0.73, tortuosity05 0.73);
  - maple: 14 of 16 (both tortuosities 0.78);
  - BioDiv and Demol pass.
  - Since the full operator contains the re-cut, no grid point can pass at Wytham with `coarsen()` as it is.
- **Why the Wytham trees fail.** None is NaN after coarsening; all are shifts beyond tolerance.
  - The tortuosities fall systematically: oak tortuosity −0.09 to −0.22 on 10 of 37 trees, maple's −0.11 to −0.32
    on 9 of 40. The re-cut merges every cylinder shorter than its class median, so a path-length descriptor
    flattens by construction (`describe.py`'s table already says so).
  - forkHeight jumps on 4 oaks, both ways (−0.27 to +0.48), with a median shift of 0: the fork is reassigned.

**Tolerances, v1 beside v2.** Oak and maple are unchanged: the same Wytham sets, and their between-tree SDs, χ²
intervals and floors are in the JSON. Beech's SD [95%] and noise ratio:

| descriptor | v1 SD (Demol 15) | v2 SD [95%] (BioDiv 53) | v2 tol | v2 floor / SD (5 repeats) | v2 verdict |
|---|---|---|---|---|---|
| widestAt | 0.23 | 0.21 [0.18, 0.26] | 0.11 | 0.51 | noise |
| profileCentre | 0.062 | 0.039 [0.033, 0.049] | 0.020 | 0.61 | noise |
| crownFullness | 0.11 | 0.071 [0.060, 0.088] | 0.036 | 0.63 | noise |
| forkHeight | 0.12 | 0.15 [0.13, 0.19] | 0.075 | 0.62 | noise |
| leaderDominance | 0.43 | 0.78 [0.65, 0.96] | 0.39 | 0.51 | noise |
| branchAngle2 (°) | 6.0 | 7.1 [6.0, 8.8] | 3.6 | 1.17 | noise |
| limbDroop (°) | 16 | 20 [16, 24] | 9.7 | 0.57 | noise |
| limbUpturn (°) | 10 | 16 [14, 20] | 8.2 | 0.58 | noise |
| junctionDelta | 0.21 | 0.24 [0.20, 0.30] | 0.12 | 0.58 | report-only |
| ldSlope | 0.15 | 0.11 [0.095, 0.14] | 0.057 | 0.91 | report-only |
| limbElevation (°) | 9.8 | 13 [11, 16] | 6.5 | 0.19 | clear |
| p0 | 0.32 | 0.20 [0.17, 0.25] | 0.10 | 0.45 | clear |
| p1 | 0.22 | 0.16 [0.14, 0.20] | 0.081 | 0.35 | clear |
| p2 | 0.098 | 0.14 [0.12, 0.18] | 0.071 | 0.58 | noise |
| p3 | 0.14 | 0.14 [0.12, 0.18] | 0.071 | 0.57 | noise |
| bifurcationRatio | 0.18 | 0.42 [0.35, 0.52] | 0.21 | 0.71 | noise |
| bifurcationRatio2 | 0.21 | 0.60 [0.50, 0.74] | 0.30 | 0.73 | noise |
| tortuosity | 0.13 | 0.28 [0.24, 0.35] | 0.14 | 0.39 | clear |
| tortuosity05 | 0.10 | 0.20 [0.17, 0.25] | 0.10 | 0.42 | clear |
| length0 | 0.017 | 0.077 [0.065, 0.096] | 0.039 | 0.06 | clear |
| length1 | 0.032 | 0.075 [0.063, 0.093] | 0.037 | 0.16 | clear |
| length2 | 0.038 | 0.080 [0.067, 0.099] | 0.040 | 0.19 | clear |
| length3 | 0.077 | 0.13 [0.11, 0.16] | 0.065 | 0.16 | clear |
| pendulousFraction | 0.055 | 0.093 [0.078, 0.12] | 0.046 | 0.22 | clear |
| taper | 0.079 | 0.18 [0.15, 0.22] | 0.090 | 1.92 | noise |
| centroidHeight | 0.075 | 0.079 [0.066, 0.098] | 0.040 | 0.34 | clear |

**Hold-outs, by the noise floor alone** (`[level1]` `gate_c_v2_*` in each targets file):
- oak: widestAt, limbDroop and limbUpturn;
- maple: forkHeight, limbDroop, limbUpturn, both bifurcation ratios and length2;
- beech: 13: widestAt, profileCentre, crownFullness, forkHeight, leaderDominance, branchAngle2, limbDroop,
  limbUpturn, p2, p3, both bifurcation ratios and taper.

**Standings before any simulated tree.**

| species | dataset, d_min | report-only | H1 | noise | candidate A or B | outcome |
|---|---|---|---|---|---|---|
| oak | Wytham, none | 2 | 2 | 3 | – (19 clear, no d_min) | stop at the control |
| maple | Wytham, none | 2 | 2 | 6 | – (16 clear, no d_min) | stop at the control |
| beech | BioDiv, 7.4 mm (p1) | 2 | 0 | 13 | 11: limbElevation, p0, p1, tortuosity, tortuosity05, length0–3, pendulousFraction, centroidHeight | at most 11 of 24 can reach a tier: stop under amendment E (counted as v1 counted, noise hold-outs in the denominator) |

Every beech candidate's control is neutral at d_min, so none is "A only". **Reference DBH for the size match**
(median measured): oak 0.596 m (Wytham, 34), maple 0.247 m (39), beech 0.291 m (BioDiv, 53).

**Reproduce:** `uv run --project analysis python -I -m treesim.tolerance` (writes the JSON and
`runs/phase1/control-grid.csv`, ≈ 25 min on 12 workers; the per-tree results are cached in `runs/phase1/real/`),
and `… -m treesim.tolerance probe` (re-cut only).

### Decisions for the user after v2 (answered: v3 below)
1. **Wytham's re-cut.** The re-cut is not neutral on Wytham's own QSMs at any d, through tortuosity and
   tortuosity05 (and forkHeight on oak). The options:
   - a different re-cut, which would be a new registration;
   - prune-only coarsening (neutral to p10 = 2.5 mm on oak, p20 = 5.0 mm on maple), also a new registration;
   - holding the two tortuosities, and forkHeight for oak, out at Wytham as re-cut-sensitive by construction. That
     is a loosening of the 90/90 rule's input.
2. **Beech's floor.** BioDiv's 5 repeats hold out 13 of 24, and under v1's reading of amendment E beech stops
   before any simulated tree. The options:
   - accept the stop;
   - another floor (repeats elsewhere);
   - read the denominator as the descriptors clear of the noise floor (11), under which 6 tier passes would
     suffice. That is a different reading from v1's and the user's to make.
3. **Is BioDiv's p1 a stable d_min?** It is the grid's first point, and p2 (8.6 mm) already fails (8 of 11), so
   beech's d_min sits at the grid's edge.

### v3 (commit 6610fb4)
**How it was made.**
- **When:** v3 was designed after v2's control failed on the re-cut, from the user's six rulings and two answers.
- **Every v3 parameter derives from real data only,** as in v2.
- **Nothing simulated has been measured since v1.** v2 and v3 read no simulated tree; `runs/phase1/sim` is v1's.
- **The JSON keeps v2 and v1** in its `v2` and `v1` blocks.

**What changed from v2, and why:**
- **Coarsening is prune only** (`coarsen.py`; inflation stays a gated variant).
  - The re-cut is withdrawn. It was a second answer to segmentation, which `describe()` already handles at its
    0.5 m step, and v2's control showed it non-neutral on Wytham's own trees.
- **The 0.5 m step, with no exceptions.** Droop, upturn and branchAngle2 were already 0.5 m chords, and
  tortuosity05 exists. Two descriptors are new:
  - **limbElevation05:** the length-weighted median elevation of the 0.5 m chords along each resampled first-order
    path;
  - **pendulousFraction05:** the share of order ≥ 1 length on axes whose last 0.5 m of arc heads below horizontal.
  - The per-cylinder tortuosity, limbElevation and pendulousFraction are report-only. ldSlope and junctionDelta
    stay report-only.
- **Beech's estimator.**
  - A tree's value is the median over its 5 repeats (NaN under 3 finite), in the tolerance and the control alike.
  - The floor is the between-repeat SD / √5 against the between-tree SD of the medians, size-detrended on ln dTLS.
  - **The asymmetry:** Wytham's trees stay single-model (only 12 have 10 models), with the floor their SD across
    10 models, undivided.
- **Amendment E** applies to the coarsening test, over the descriptors that pass the floor. Floor hold-outs are
  reported as noise-limited at that dataset.
- **The hashes are re-registered:** 10 code files, `dump-trees.ts`, the manifest, and data digests (now TreeML too).
- **Not this session:** wiring `tiers.py` into `phase1_degradation.py` (1d-ii's first step).

**The control curves, prune only.** Each cell is the number of descriptors passing the floor that are neutral
(≥ 90% of trees within tolerance), at the same grid as v2.

| dataset, species (pass the floor) | p1 | p2 | p5 | p10 | p20 | p50 | 5 cm | d_min |
|---|---|---|---|---|---|---|---|---|
| Wytham oak (18) | 18 | 18 | 18 | 18 | 17 | 10 | 1 | **5.0 mm (p20)** |
| Wytham maple (15) | 15 | 15 | 15 | 15 | 15 | 4 | 0 | (shared) |
| BioDiv beech (21) | 21 | 21 | 5 | 1 | 0 | 0 | 0 | **8.6 mm (p2)** |
| Demol FSYL (21, reported) | 18 | 14 | 4 | 2 | 0 | 0 | 0 | none |

- **Wytham at p20:** oak's one non-neutral descriptor is length2 (0.89). At p50 (12.1 mm) the rule fails for both
  species.
- **BioDiv (ruling 4, re-run before deciding about the edge):** d_min moved from v2's p1 (7.4 mm) to p2 (8.6 mm).
  The rule fails at p5 (11.0 mm), where 16 descriptors drop under 0.9. It sits two grid points from the edge.
- **Demol:** p1 (13.3 mm) already fails on crownFullness, p1 and p2 (0.87 each, 13 of 15 trees). It is reported,
  never gated.
- **TreeML** (3 optcsv trees, phase 7's; no tolerance set, no verdict), median shifts:
  - at Wytham's 5.0 mm, 0 on every descriptor;
  - at BioDiv's 8.6 mm: limbElevation05 +0.18°, branchAngle2 −0.40°, the bifurcation ratios −0.07 and −0.08,
    junctionDelta +0.22, ldSlope +0.10, limbElevation +0.08°, the rest under 0.03.

**Tolerances and floors, v2 beside v3.**
- **Oak and maple:** unchanged, the same single-model descriptors. The new ones:
  - limbElevation05: oak SD 9.6° (tolerance 4.8, floor 0.26); maple 14° (6.9, 0.31);
  - pendulousFraction05: oak 0.095 (0.047, 0.16); maple 0.13 (0.067, 0.23).
- **Beech** (BioDiv; v2 single-model, v3 the median of 5 repeats):

| descriptor | v2 SD | v2 floor / SD | v3 SD [95%] | v3 tol | v3 floor / SD | v3 |
|---|---|---|---|---|---|---|
| widestAt | 0.21 | 0.51 | 0.19 [0.16, 0.24] | 0.096 | 0.25 | clear |
| profileCentre | 0.039 | 0.61 | 0.043 [0.036, 0.053] | 0.021 | 0.25 | clear |
| crownFullness | 0.071 | 0.63 | 0.077 [0.064, 0.095] | 0.038 | 0.26 | clear |
| forkHeight | 0.15 | 0.61 | 0.13 [0.11, 0.17] | 0.067 | 0.30 | clear |
| leaderDominance | 0.78 | 0.51 | 0.65 [0.54, 0.81] | 0.33 | 0.27 | clear |
| branchAngle2 (°) | 7.1 | 1.17 | 5.3 [4.4, 6.5] | 2.6 | 0.71 | noise-limited |
| limbDroop (°) | 19 | 0.57 | 18 [15, 22] | 9.0 | 0.27 | clear |
| limbUpturn (°) | 16 | 0.58 | 11 [9, 13] | 5.4 | 0.40 | clear |
| p0 | 0.20 | 0.45 | 0.22 [0.18, 0.27] | 0.11 | 0.19 | clear |
| p1 | 0.16 | 0.35 | 0.17 [0.14, 0.21] | 0.083 | 0.15 | clear |
| p2 | 0.14 | 0.58 | 0.13 [0.11, 0.17] | 0.067 | 0.27 | clear |
| p3 | 0.14 | 0.57 | 0.14 [0.12, 0.17] | 0.069 | 0.26 | clear |
| bifurcationRatio | 0.42 | 0.71 | 0.37 [0.31, 0.46] | 0.19 | 0.35 | clear |
| bifurcationRatio2 | 0.60 | 0.73 | 0.54 [0.45, 0.67] | 0.27 | 0.36 | clear |
| tortuosity05 | 0.20 | 0.42 | 0.14 [0.12, 0.17] | 0.069 | 0.27 | clear |
| length0 | 0.077 | 0.06 | 0.078 [0.065, 0.096] | 0.039 | 0.03 | clear |
| length1 | 0.075 | 0.16 | 0.075 [0.062, 0.092] | 0.037 | 0.07 | clear |
| length2 | 0.080 | 0.19 | 0.078 [0.065, 0.097] | 0.039 | 0.09 | clear |
| length3 | 0.13 | 0.16 | 0.13 [0.11, 0.16] | 0.065 | 0.07 | clear |
| taper | 0.18 | 1.92 | 0.14 [0.12, 0.17] | 0.070 | 1.10 | noise-limited |
| centroidHeight | 0.079 | 0.34 | 0.079 [0.066, 0.098] | 0.039 | 0.15 | clear |
| limbElevation05 (°) | – | – | 14 [12, 17] | 7.0 | 0.09 | clear (new) |
| pendulousFraction05 | – | – | 0.10 [0.086, 0.13] | 0.052 | 0.13 | clear (new) |

Report-only: junctionDelta, ldSlope, tortuosity, limbElevation and pendulousFraction.

**Noise-limited, by the floor alone** (the JSON's label is `held out (noise)`). These are the label- and base-dependent descriptors (the user's
observation): they hang on which child continues, where order 1 starts, or the trunk's base.
- Oak at Wytham: widestAt, limbDroop, limbUpturn.
- Maple at Wytham: forkHeight, limbDroop, limbUpturn, both bifurcation ratios, length2.
- Beech at BioDiv: branchAngle2 (order 1 → 2) and taper (the trunk's labels at half height).

**Standings before any simulated tree** (`[level1]` `gate_c_v3_*` in each targets file):

| species | dataset, d_min | report-only | H1 | noise-limited | pass the floor | of which A-only (control not neutral at d_min) | amendment E stops below |
|---|---|---|---|---|---|---|---|
| oak | Wytham, 5.0 mm | 5 | 2 | 3 | 18 | length2 | 9 |
| maple | Wytham, 5.0 mm | 5 | 2 | 6 | 15 | – | 8 |
| beech | BioDiv, 8.6 mm | 5 | 0 | 2 | 21 | – | 11 |

Size-match references (median measured DBH): oak 0.596 m, maple 0.247 m, beech 0.291 m.

**Reproduce:** `uv run --project analysis python -I -m treesim.tolerance` (≈ 17 min on 12 workers; it writes the
JSON and `runs/phase1/control-grid.csv`, with per-tree results cached in `runs/phase1/real/control3-*`).

**A ruling after v3's curves (the user, 2026-11-03), for 1d-ii.**
- **Tier B's bracket** becomes [d_min, the first grid point at which the control fails], instead of
  [d_min, 2·d_min]:
  - Wytham [5.0, 12.1 mm] (p20 to p50);
  - BioDiv [8.6, 11.0 mm] (p2 to p5).
- **Its provenance:** it was set after the control curves were seen, and it is taken from them alone, so from real
  data only. No simulated tree has been measured.
- **The changed bracket in each dataset's terms:**
  - Wytham's upper end is 2.4 × d_min, wider than 2·d_min (10.0 mm);
  - BioDiv's is 1.28 × d_min, narrower than 2·d_min (17.2 mm), where its own control already fails.
- **The files it touches:** `tiers.evaluation_points` and the JSON's rule text, both hashed. 1d-ii re-registers
  them (v3.1) before anything else.
- **For phase 3:** Demol has no neutral d_min (its p1, 13.3 mm, already fails). As beech's held-out site it serves
  tier A descriptors only.

**v3.1 registered (2026-11-04, session 1d-ii, before any simulated tree was measured against it).**
- **What changed:** `tiers.evaluation_points` (now `(grid, d_min, upper)`), a new `tiers.upper_end`, and the JSON's
  `rules.evaluation_points` and `rules.tier_b`; the JSON gains each gated dataset's `upper_end`. Hashes of
  `tiers.py` and `tolerance.py` re-taken; `describe.py`, `coarsen.py`, `control.py` and the rest unchanged.
- **Provenance, as for v2 → v3:** the bracket was set from the control curves after seeing them; the criterion is
  "the first grid point above d_min at which the dataset's control fails", not a chosen width; no simulated value
  entered. The user's reason: under 2·d_min BioDiv's bracket runs to 17 mm, where BioDiv's own QSMs are already
  non-neutral, so tier B would hold descriptors out for the bracket's fault rather than their own.
- **Reading taken (the ruling is silent):** tier A's rule is unchanged but it reads the same evaluation points, so
  it is now evaluated at d_min, the grid points inside, the upper end and inflation (Wytham 12.1 mm, wider than
  v3's 10.0; BioDiv 11.0 mm, narrower than 17.2).
- **Resulting points:** Wytham d_min 5.0 mm, upper 12.1 mm (p50), no grid point inside; BioDiv 8.6 mm, upper 11.0 mm
  (p5), none inside. Each tier B check is therefore one coarsened point plus inflation, against d_min.

**Next, 1d-ii:** done, see "Gate c v3.1" below.

## Gate c v3.1 (session 1d-ii, 2026-11-04)

**Order of events.** v3.1 registered (e66bbd3, before any simulated tree); `tiers.py` wired into
`analysis/experiments/phase1_degradation.py` (not hashed) and tested on synthetic fixtures and a synthetic tree through
the real `describe()` and `coarsen()` (`test_gate_c_wiring.py`, 12 tests) before any real run; size-matching; the gate.
Nothing in the instrument changed after the registration. All hashes were verified against HEAD at the start (v3) and
again by the script on every run (v3.1).

**What ran.** Beech at its Level 0 fit (`docs/experiments/fits/level0/beech.json`, `fit.assign`; not accepted into
species params). Oak and maple at the shipped params, "shipped params" tables so that they exist; their Level 0 fits are
not accepted. 20 seeds (1–20), the closed stand's four measured trees, live ones only.
`cli/dump-trees.ts` is hashed and fixed at season 150 (stand) and 100 (lone), so size-matched seasons need
`analysis/experiments/gate_c_sim.ts`, whose `dump` is that file's, line for line. Its output at 150/100 for oak seed 1
is byte-identical to `node cli/dump-trees.ts --gate-c oak 1`. The sweep's DBH is `cli/allometry.ts` (parity 1e-9 with
`cylinders.dbh`); the gate re-reads `describe()`'s DBH on the dumped trees: beech 0.296 m (reference 0.291), maple
0.251 m (0.247), both reproduce the size match.

### Size matching (`rules.size_match`)
Median over seeds 1–20 of the per-seed median DBH of the live measured trees; the first listed season that reaches the
reference (median measured DBH, R2).

| species | reference DBH, height (m) | stand season | sim median DBH, height (m) | live of 4 (median) | lone season | lone DBH, height (m) |
|---|---|---|---|---|---|---|
| beech (Level 0 fit) | 0.291, 26.8 (BioDiv hTLS) | **70** | 0.296, 22.5 | 4 | 50 (already above at the first listed) | 0.481, 15.3 |
| maple (shipped) | 0.247, 18.2 (Wytham Hgt_pts) | **150** | 0.251, 20.9 | 3 | 50 (as beech) | 0.291, 16.6 |
| oak (shipped) | 0.596, 19.9 (Wytham Hgt_pts) | **none by 300** | 0.352 at 300, 47.5 | 4 | 90 | 0.620, 41.4 |

- **Oak:** the rule says "None by 300: report and stop", so oak's gate was **not run**. The stand's DBH flattens
  (0.301 m at 80, 0.332 at 150, 0.352 at 300) while height keeps climbing to 47 m: a slender stand, 135 for H/D at 300.
- **Beech** is shorter than BioDiv's at the same DBH (22.5 m against 26.8 m, 84%); maple taller (20.9 against 18.2, 115%).
  Heights are reported, not gated.
- The stand tables by season are in `runs/gate-c/sizematch.md` (not committed).

### Points (d_min and tier B's bracket, from the control curves)
| species | dataset | d_min | upper end | grid points inside | inflation |
|---|---|---|---|---|---|
| beech | BioDiv | 8.6 mm (p2) | 11.0 mm (p5) | none | at d_min |
| maple | Wytham | 5.0 mm (p20) | 12.1 mm (p50) | none | at d_min |

### The beech table (stand season 70, 20 seeds, tier A against the fine tree, tier B against d_min)
**16 of 21 floor-clear descriptors reach a tier; amendment E stops below 11. No stop.** Shift is the median over seeds
of the per-seed median signed shift at the deciding tier's worst point (for held-out, tier A's), in the descriptor's units.

| descriptor | tier | shift | tolerance | floor ratio | verdict | reason |
|---|---|---|---|---|---|---|
| widestAt | A | 0 | 0.0963 | 0.252 | tier A | within tolerance on ≥ 15 seeds at every point (fewest 19, d_min) |
| profileCentre | A | 0.00146 | 0.0213 | 0.252 | tier A | fewest 20 (d_min) |
| crownFullness | A | −0.00506 | 0.0383 | 0.262 | tier A | fewest 20 (d_min) |
| forkHeight | A | 0.0146 | 0.0673 | 0.305 | tier A | fewest 19 (upper) |
| leaderDominance | A | 0.00347 | 0.326 | 0.27 | tier A | fewest 17 (d_min) |
| branchAngle2 | – | – | 2.63 | 0.709 | held out (noise) | floor ≥ 0.5 × between-tree SD at BioDiv |
| limbDroop | **B** | −0.355 | 8.98 | 0.274 | tier B | A fails (upper: 14 of 20); B passes (fewest 16, upper); control neutral at d_min |
| limbUpturn | A | 0 | 5.41 | 0.396 | tier A | fewest 17 (d_min) |
| junctionDelta, ldSlope, limbElevation, tortuosity, pendulousFraction | – | – | – | – | report-only | per-cylinder readings and the dead-limb pair (decision 7, v3) |
| p0 | A | −0.00528 | 0.109 | 0.186 | tier A | fewest 20 (d_min) |
| p1 | A | 0 | 0.0831 | 0.155 | tier A | fewest 20 (d_min) |
| p2 | A | −0.000972 | 0.0671 | 0.274 | tier A | fewest 20 (d_min) |
| p3 | A | 0 | 0.0692 | 0.257 | tier A | fewest 20 (d_min) |
| bifurcationRatio | – | 0.181 | 0.187 | 0.354 | held out (resolution-sensitive) | A fails (upper: 8 of 20); B fails (inflated: 11 of 20) |
| bifurcationRatio2 | – | 0.0416 | 0.271 | 0.359 | held out (resolution-sensitive) | A fails (d_min: 9 of 20); B fails (inflated: 9 of 20) |
| tortuosity05 | A | −0.00464 | 0.0691 | 0.273 | tier A | fewest 17 (d_min) |
| length0 | A | 0.0156 | 0.0388 | 0.0263 | tier A | fewest 19 (upper) |
| length1 | – | 0.0661 | 0.0373 | 0.0697 | held out (resolution-sensitive) | A fails (upper: 0 of 20); B fails (inflated: 8 of 20) |
| length2 | – | 0.0672 | 0.0391 | 0.0888 | held out (resolution-sensitive) | A fails (upper: 2 of 20); B fails (inflated: 4 of 20) |
| length3 | – | −0.0925 | 0.0651 | 0.0703 | held out (resolution-sensitive) | A fails (d_min: 0 of 20); B fails (inflated: 0 of 20) |
| taper | – | – | 0.0705 | 1.1 | held out (noise) | floor 1.1 × the between-tree SD |
| centroidHeight | A | 0.00139 | 0.0394 | 0.151 | tier A | fewest 20 (d_min) |
| limbElevation05 | A | 0.946 | 6.98 | 0.0873 | tier A | fewest 19 (d_min) |
| pendulousFraction05 | A | 0.0126 | 0.0515 | 0.133 | tier A | fewest 19 (d_min) |

- **Targets for phase 3 (beech, BioDiv):** tier A, 15: widestAt, profileCentre, crownFullness, forkHeight,
  leaderDominance, limbUpturn, p0–p3, tortuosity05, length0, centroidHeight, limbElevation05, pendulousFraction05.
  Tier B, 1: limbDroop (valid only against a BioDiv-resolution reading; the fit compares the coarsened simulator).
  Held out, resolution-sensitive, 5: bifurcationRatio, bifurcationRatio2, length1, length2, length3 (the order-wise
  length fractions and the Strahler ratios move when twigs are pruned or inflated, whatever the tree). Noise-limited at
  BioDiv, 2: branchAngle2, taper.
- **Demol** serves tier A descriptors only (no neutral d_min; its p1, 13.3 mm, already fails). Nothing was read there.

### Maple (shipped params, stand season 150)
**12 of 15 floor-clear descriptors reach a tier; amendment E stops below 8. No stop.** All twelve are tier A: widestAt,
profileCentre, crownFullness, branchAngle2, p0–p3, tortuosity05, centroidHeight, limbElevation05, pendulousFraction05
(fewest seeds: 16 for tortuosity05 at the 12.1 mm upper end, else ≥ 18 of 20). Held out, resolution-sensitive: length0
(A and B both 1 of 20 at upper), length1 (1), length3 (0). Noise-limited at Wytham, 6: forkHeight, limbDroop, limbUpturn,
both bifurcation ratios, length2. H1: leaderDominance, taper. Maple's table is in `[level1]` of
`analysis/fit/targets/maple.toml`; it is a proxy for field maple (sycamore, Wytham) and the shipped params are not fitted.

### Oak
Not run (above). `analysis/fit/targets/oak.toml` records it.

### Reading the result
- What fails is the same family in both species: the length fractions by order (length0–3) and, for beech, the
  Strahler ratios. Every profile descriptor (p0–p3, widestAt, crownFullness, centroidHeight) and the limb readings
  (upturn, limbElevation05, pendulousFraction05) pass tier A on 17–20 of 20 seeds. (Observation from the tables; no
  mechanism was tested.)
- Two close calls, not loosened: beech limbDroop (tier A 14 of 20 at the upper end, so it is tier B) and maple
  tortuosity05 (16 of 20 at the upper end, which v3.1 moved from 10.0 to 12.1 mm).
- I did not run v3's 2·d_min bracket beside v3.1, so nothing here says what the bracket change did to the verdicts.

**Reproduce:** `node analysis/experiments/gate_c_sim.ts sizematch SPECIES SEED OUT [assign.json]` per species and seed
(60 jobs), then `uv run --project analysis python -I analysis/experiments/phase1_degradation.py sizematch`, `dump`, `gate`
(≈ 2.5 min for the dumps, ≈ 3 min for the gate on 12 workers). Outputs in `runs/gate-c/` (not committed).

## Gate c v3.2 (2026-11-05): a supplement for crownBase80 and trunkTortuosity05
v3.1's rules unchanged, on four new descriptors, as a supplement (`analysis/fit/sources/phase1-tolerances-v3.2.json`,
`analysis/experiments/gate_c_v32.py`). `phase1-tolerances.json` (v3.1) is untouched. d_min and the upper end are frozen
at v3.1's (BioDiv 8.6 mm, 11.0 mm), because a full rerun could re-choose d_min over the larger descriptor set; d_min's
rule holds with the new descriptors as without. Self-checks: all 84 v3.1 rows reproduce exactly; the control's shares at
d_min reproduce on all 28 beech descriptors. The 16 registered Level 1 descriptors are bit-identical before and after
the describe.py edit (7,440 values; with boleSway, the 16 and the four, 9,300 values). The amendment for boleSway reproduces the first four rows of 3dc1278 exactly.

| descriptor | tier | floor ratio | control at d_min | seeds within (A: d_min, upper, inflated) |
|---|---|---|---|---|
| crownBase80 (70, 90) | **A** | 0.080 (0.089, 0.053) | 1.00 | 19, 19, 20 (each) |
| trunkTortuosity05 | held out (noise) | **0.747** | 0.98 | – |
| boleSway (amended the same day, the user) | **A** | 0.345 | 0.96 | 19, 19, 20 |

Readings and the probe that used them: [the crown base and bole note](2026-11-05-crown-base-and-bole.md). Level 1's v6
registration hashes this supplement; v5 reproduces from b4fdbff.
