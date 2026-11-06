# A14: the noise floor of A11's six regularity descriptors, and the real hornbeam stand row

Code (this folder): `fetch_hornbeam.py` (wrapper around fetch.py's constants; streams the 108 GB tarball, keeps validQSM Carpinus), `run_noise.py` (descriptors on every repeat), `run_sets.py` (all 16 input sets), `final.py`, `sets_an.py`, `gaps.py`; results `rep_beech.json`, `rep_hornbeam.json`, `sets_*.json`.

## Fetched
38 BioDiv hornbeam all.mat files (every `validQSM == True` Carpinus_betulus; the other 27 labelled hornbeam have no valid QSM and were not fetched; label counts are 38 valid + 27 invalid + 1 blank = 66). 1.5 GB (data/reference/biodiv: 2.0 -> 3.5 GB). Plots SEW24, HEW32 etc. (the whole tar was read: 3282 QSM/all members, 35 min). 38 rows appended to analysis/fit/sources/reference-manifest.csv by `treesim.fetch biodiv-manifest`.

## What "repeats" are
Each all.mat has 16 input sets x 5 repeats (random restarts of the same TreeQSM input). The optimum set's 5 repeats are the "repeats" below (the same model selection as `qsm.optimum_set`). Same coarsening as A11 (d_min 8.62 mm), DBH >= 10 cm filter (beech 53 trees, hornbeam 38, 5 repeats each). Repeat noise is a LOWER bound on measurement error: it contains cylinder-fit/random-restart noise but not any error common to all repeats (TLS occlusion, systematic smoothing).

## Noise table (single-model SD)
within = pooled within-tree SD across the 5 repeats; between = SD of tree means, corrected for the noise in a 5-repeat mean (var_between = var(means) - within^2/5).

| descriptor | beech within | beech between | ratio | hornbeam within | hornbeam between | ratio |
|---|---|---|---|---|---|---|
| spacingCV | 0.050 | 0.052 | 0.96 | 0.050 | 0.051 | 0.98 |
| attachPerM | 0.088 | 0.415 | 0.21 | 0.076 | 0.457 | 0.17 |
| insertSD (deg) | 6.34 | 6.38 | 0.99 | 4.76 | 7.13 | 0.67 |
| elevSD (deg) | 5.34 | 5.50 | 0.97 | 3.92 | 7.14 | 0.55 |
| curvPersist | 0.073 | 0.062 | 1.17 | 0.073 | 0.039 | 1.84 |
| earlyFork | 0.090 | 0.116 | 0.78 | 0.089 | 0.113 | 0.79 |

Within-tree SD across all 16 input sets (min-pmdistance model each; beech / hornbeam): spacingCV 0.043/0.044, attachPerM 0.084/0.079, insertSD 5.6/4.5, elevSD 4.1/3.6, curvPersist 0.067/0.063, earlyFork 0.080/0.086. Practically equal to the repeat SD, and Spearman correlation with PatchDiam1 is ~0 (|rho| <= 0.1): the input-set choice adds no trend, the descriptors are random-restart noise, not a resolution effect.

Reading: spacingCV, insertSD, elevSD, curvPersist have within/between about 1: tree-to-tree differences in these are mostly reconstruction noise (partly also finite-limb-count sampling). attachPerM is the only descriptor that separates trees (0.2). Noise affects the *per-tree* value; a population median over n trees is far steadier (SE ~ SD/sqrt(n)), so medians remain comparable, if not biased.

## Updated targets table (median [10-90%] over trees; stand = median over the 5 repeats per tree, DBH >= 10 cm)
Real lone hornbeam (TreeML, n 23, H 12-22), real beech rows and R0-R4 are copied from A11's targets.md.

| row | n | spacingCV | attachPerM | insertSD | elevSD | curvPersist | earlyFork |
|---|---|---|---|---|---|---|---|
| real hornbeam lone (TreeML) | 23 | 0.47 [0.40-0.50] | 1.35 [1.09-1.63] | 31.5 [23.7-40.2] | 31.5 [24.4-40.2] | -0.15 [-0.25 - -0.10] | 0.37 [0.21-0.49] |
| **real hornbeam stand (BioDiv), all H** | 38 | 0.40 [0.35-0.49] | 1.79 [1.06-2.14] | 26.9 [20.2-35.9] | 26.2 [20.6-36.0] | -0.08 [-0.16 - -0.02] | 0.30 [0.19-0.51] |
| **real hornbeam stand (BioDiv), H 12-22** | 24 | 0.39 [0.35-0.47] | 1.81 [1.11-2.09] | 26.5 [21.1-34.3] | 25.5 [21.2-34.5] | -0.08 [-0.14 - -0.02] | 0.30 [0.22-0.53] |
| real beech stand (BioDiv, 5-repeat medians), all H | 53 | 0.42 [0.35-0.49] | 1.50 [0.98-1.98] | 29.8 [19.6-39.4] | 25.8 [19.6-33.8] | -0.06 [-0.16-0.03] | 0.23 [0.13-0.45] |
| real beech stand, H 12-22 | 14 | 0.40 [0.35-0.45] | 1.33 [0.73-1.85] | 26.2 [20.4-35.4] | 27.6 [19.5-35.6] | -0.02 [-0.15-0.09] | 0.35 [0.19-0.54] |
| real beech lone (TreeML) | 9 | 0.47 | 1.49 | 37.0 | 29.0 | -0.09 | 0.30 |
| R0 / R1 / R2 / R3 / R4 lone | 8 | 0.28 / 0.30 / 0.39 / 0.31 / 0.42 | 2.32 / 2.23 / 1.79 / 2.29 / 1.71 | 6.2 / 5.0 / 9.6 / 10.2 / 13.1 | 10.6 / 9.7 / 12.1 / 12.8 / 13.7 | 0.08 / 0.09 / 0.14 / 0.08 / 0.17 | 0.61 / 0.67 / 0.64 / 0.62 / 0.53 |
| R0 / R1 / R2 / R3 / R4 stand | 13-32 | 0.20 / 0.26 / 0.35 / 0.22 / 0.36 | 2.20 / 2.18 / 1.85 / 2.23 / 1.78 | 11.5 / 11.5 / 15.6 / 10.3 / 13.5 | 16.9 / 16.4 / 17.8 / 15.9 / 15.8 | -0.02 / 0.02 / 0.06 / 0.01 / 0.07 | 0.22 / 0.27 / 0.20 / 0.23 / 0.32 |

(5-repeat medians of the beech stand differ slightly from A11's single-optimum row: e.g. spacingCV 0.42 vs 0.40, insertSD 29.8 vs 27.9: the size of single-model noise on a 53-tree median.) The BioDiv hornbeam stand is close to the TreeML lone hornbeam on spacingCV, insertSD, elevSD (lone slightly higher: 0.47 / 31.5 / 31.5 against 0.40 / 26.9 / 26.2), and denser (attachPerM 1.8 against 1.35). Stand vs lone hornbeam therefore does not differ much in these within-tree descriptors; only earlyFork and the sims' R-rows differ between regimes (sim stand earlyFork 0.2-0.3, sim lone 0.5-0.67).

## Gaps against noise (R4, the best simulated row; gap = real - sim, in units of the single-model within SD, hornbeam/beech mean)
| descriptor | within SD | R4 lone gap (real lone) | R4 stand gap (real hornbeam stand) | R0 lone gap |
|---|---|---|---|---|
| spacingCV | 0.050 | +0.05 (1.0 SD) | +0.04 (0.9 SD) | +0.19 (3.8 SD) |
| attachPerM | 0.08 | -0.36 (4.5 SD) | +0.01 (0.1 SD) | -0.97 (12 SD) |
| insertSD | 5.5 | +18.4 deg (3.3 SD) | +13.4 deg (2.4 SD) | +25 (4.6 SD) |
| elevSD | 4.6 | +17.8 deg (3.9 SD) | +10.4 deg (2.3 SD) | +21 (4.5 SD) |
| curvPersist | 0.073 | -0.32 (4.4 SD) | -0.15 (2.0 SD) | -0.23 (3.2 SD) |
| earlyFork | 0.09 | -0.16 (1.8 SD) | -0.02 (0.2 SD) | -0.24 (2.7 SD) |

## Verdicts
Criteria: within/between < 0.4 and gap > 3 within-SD = usable; gap 1.5-3 within-SD, or per-tree noise comparable to the spread = band; gap <= 1.5 or sign set by the artefact = noise-dominated. Caveat that no repeat can lift: a bias common to all repeats (see A11's caveat 1) is not measured here.

- **attachPerM: usable target.** Within/between 0.2; noise SD 0.08 against sims 0.4-1.0 above real lone. Target 1.35-1.8 (lone vs stand hornbeam); it is a density/length number (largely spacingCV's flip side, so one fit, not two). In the stand R4's 1.78 already sits on the real stand median 1.79.
- **spacingCV: use with a band of +-0.05.** Tree-level noise equals tree-to-tree SD (ratio 0.98), so the per-tree value carries no information, but the population median is steady (0.39-0.47). Target 0.40-0.47; R2 (0.39) and R4 (0.42 lone / 0.36 stand) are inside the band; R0, R1, R3 (0.20-0.31) are outside at 2-4 SD. Also depends on the 0.25 m site-gap (A11: 0.34-0.64 across 0.1-0.5 m), so compare only at that setting.
- **insertSD: use with a band of +-6 deg.** Target 27-32 deg. Per-tree noise 5-6 deg (ratio 0.7-1.0) but the gap from every sim (5-16 deg) is 2.4-4.6 SD: robustly "sims too regular", not a number to tune to within a few degrees. A sim at >= 20 deg is within noise of the real.
- **elevSD: use with a band of +-5 deg.** Target 26-32 deg; same reasoning; the gap (10-21 deg) is 2.3-4.5 SD. Depends on limb position along the trunk (A11), so also compare on size-matched trees.
- **earlyFork: use with a band of +-0.09, weak.** Target 0.30 (stand) to 0.37 (lone); R4 stand (0.32) is inside it, sim lone (0.5-0.67) is 1.8-3.4 SD above. Between-tree ratio 0.8; a threshold-share of 5-20 limbs per tree is naturally noisy. Use only as a regime check (lone sims fork early; stands do not).
- **curvPersist: noise-dominated.** Within/between 1.2-1.8, and the sign is set by the artefact: white-noise position error gives negative lag-1 correlation of second differences, so the real -0.08 to -0.15 is not a tree property (repeats cannot size the common bias, but the SD 0.073 alone exceeds the +0.08 to +0.17 / -0.15 separation only by a factor 2 to 4). Do not fit to it; a deliberate test would add QSM-like jitter to the sim tables.
