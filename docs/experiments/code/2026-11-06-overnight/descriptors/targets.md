# A11: within-tree regularity descriptors on coarsened tables (real QSMs and A9's R0-R4)

Code: `reg.py` (descriptors), `run_real.py`, `run_sim.py`, `summ.py`, `dist.py`, `sens.py` (all in this folder; results in real.json, sim.json).
One code path: `describe.geometric_labels` (continuation by subtree volume), `describe._resample`, `cylinders.trunk/subtree_volume`, `form.FORK_RATIO`. Real QSMs: `qsm.read`, then `coarsen.prune` at d_min 8.62 mm (A9's/beech's d_min; same for all rows). Sims: A9's `render/t/*.json` (already inflated + pruned at the same d_min). Limb = first-order axis of >= 2.5 m (describe's LIMB).

## Definitions
1. **spacingCV**: along each limb, attachment points of every non-continuation child (position = child start projected on the parent cylinder, as arc length from the limb base) are merged into sites (a new site once a point is >= 0.25 m past the site's first); CV (SD/mean) of the spacings between sites, limbs with >= 4 sites; tree value = median over limbs (>= 2 limbs).
2. **attachPerM**: sites per metre of limb arc length, all limbs pooled. (Density; context, not regularity as such.)
3. **insertSD**: within-tree SD (deg, ddof 1) of the first-order insertion angle: limb chord over its first 0.5 m vs the trunk chord over +-0.25 m of arc around the attachment; >= 5 limbs.
4. **elevSD**: within-tree SD (deg) of limb elevation, the chord from 0.5 m to 2.5 m of arc; >= 5 limbs. (Includes the trend with height on the trunk.)
5. **curvPersist**: along each limb resampled at 0.5 m, mean cosine between successive direction-change vectors (+1 steady arch, 0 independent, -1 zigzag); median over limbs with >= 5 chords.
6. **earlyFork**: share of limbs with a fork (child radius >= 0.7 x continuation's and child top-reach >= 0.7 x, form.py's rule) within the first third of the limb's arc; >= 5 limbs.

## Table (median [10-90%] over trees; n per row)
Real lone: TreeML Carpinus, QSM DBH >= 10 cm, H 12-22 m (n 23). Real stand: **BioDiv beech** (n 53, DBH >= 10 cm; H 12-22 subset n 13): the BioDiv hornbeam QSMs are not on disk (only Fagus was fetched; labels list 66 Carpinus). Fetching them is a download, not done. Sims: R0-R4 hornbeam, lone n 8 (seeds 101-108, height-matched season, H 15.7-16.6), stand n 20-32 trees at season 70 (H 25-28 m; taller than real 12-22 beech stand subset).

| row | n | spacingCV | attachPerM | insertSD | elevSD | curvPersist | earlyFork |
|---|---|---|---|---|---|---|---|
| real hornbeam lone | 23 | 0.47 [0.40-0.50] | 1.35 [1.09-1.63] | 31.5 [23.7-40.2] | 31.5 [24.4-40.2] | -0.15 [-0.25 - -0.10] | 0.37 [0.21-0.49] |
| real beech lone | 9 | 0.47 [0.43-0.50] | 1.49 [1.27-1.72] | 37.0 [32.5-42.4] | 29.0 [26.8-41.6] | -0.09 [-0.16 - -0.06] | 0.30 [0.21-0.37] |
| real beech stand (all) | 53 | 0.40 [0.33-0.50] | 1.50 [1.01-2.07] | 27.9 [19.8-42.1] | 24.8 [18.8-36.2] | -0.07 [-0.23-0.03] | 0.23 [0.13-0.45] |
| real beech stand (H 12-22) | 13 | 0.38 [0.26-0.42] | 1.24 [0.74-2.03] | 27.7 [20.1-38.2] | 30.2 [17.3-38.1] | -0.05 [-0.25-0.09] | 0.41 [0.20-0.51] |
| R0 lone | 8 | 0.28 [0.26-0.32] | 2.32 [2.21-2.36] | 6.2 [4.6-8.4] | 10.6 [8.4-12.2] | 0.08 [0.03-0.12] | 0.61 [0.51-0.69] |
| R1 lone | 8 | 0.30 [0.29-0.31] | 2.23 [2.22-2.28] | 5.0 [4.1-8.0] | 9.7 [8.5-11.0] | 0.09 [0.05-0.14] | 0.67 [0.59-0.74] |
| R2 lone | 8 | 0.39 [0.36-0.45] | 1.79 [1.66-1.86] | 9.6 [7.0-11.9] | 12.1 [10.7-15.0] | 0.14 [0.10-0.18] | 0.64 [0.50-0.67] |
| R3 lone | 8 | 0.31 [0.28-0.34] | 2.29 [2.25-2.35] | 10.2 [8.8-11.6] | 12.8 [10.6-14.0] | 0.08 [0.06-0.13] | 0.62 [0.56-0.74] |
| R4 lone | 8 | 0.42 [0.39-0.47] | 1.71 [1.67-1.79] | 13.1 [10.6-15.5] | 13.7 [12.4-15.4] | 0.17 [0.11-0.20] | 0.53 [0.47-0.58] |
| R0 stand | 25-31 | 0.20 [0.15-0.24] | 2.20 [2.05-2.31] | 11.5 [9.5-13.8] | 16.9 [13.1-20.3] | -0.02 [-0.08-0.07] | 0.22 [0.12-0.30] |
| R1 stand | 23-32 | 0.26 [0.23-0.29] | 2.18 [1.85-2.29] | 11.5 [9.9-14.2] | 16.4 [12.7-18.2] | 0.02 [-0.04-0.08] | 0.27 [0.19-0.41] |
| R2 stand | 13-20 | 0.34 [0.29-0.38] | 1.85 [1.35-1.90] | 15.6 [12.5-23.2] | 17.8 [13.1-21.3] | 0.06 [0.02-0.11] | 0.20 [0.07-0.35] |
| R3 stand | 21-32 | 0.22 [0.15-0.25] | 2.23 [1.44-2.33] | 10.3 [8.8-14.0] | 15.9 [11.7-17.8] | 0.01 [-0.06-0.09] | 0.23 [0.12-0.33] |
| R4 stand | 13-24 | 0.36 [0.32-0.40] | 1.78 [0.99-1.86] | 13.5 [11.7-15.0] | 15.8 [14.3-21.1] | 0.07 [0.04-0.17] | 0.32 [0.22-0.40] |

(R5 lone: 0.41 / 1.75 / 14.7 / 15.6 / 0.15 / 0.57; storms add little.)

Standardised gap, (median sim - median real) / SD of real trees (lone, hornbeam):
| | spacingCV | attachPerM | insertSD | elevSD | curvPersist | earlyFork |
|---|---|---|---|---|---|---|
| R0 | -4.8 | +4.0 | -3.8 | -2.8 | +3.6 | +2.3 |
| R1 | -4.4 | +3.7 | -4.0 | -2.9 | +3.8 | +2.9 |
| R2 | -2.0 | +1.8 | -3.3 | -2.6 | +4.6 | +2.6 |
| R3 | -4.2 | +3.9 | -3.2 | -2.5 | +3.6 | +2.4 |
| R4 | -1.3 | +1.5 | -2.8 | -2.4 | +5.0 | +1.6 |
Stand (vs beech stand, all H): R0 -3.1 / +1.6 / -1.7 / -1.0 / +0.6 / 0.0; R4 -0.7 / +0.7 / -1.5 / -1.1 / +1.5 / +0.7.

## Per-rule verdicts
- **R1 stochastic bud break**: spacingCV +0.02 lone, +0.06 stand (toward real, small: ~4% of the gap); everything else unchanged or slightly worse (insertSD, earlyFork up). Nearly no effect.
- **R2 shoot-length lognormal**: the strongest single rule: spacingCV 0.28 -> 0.39 and attachPerM 2.32 -> 1.79 (both most of the way to real); insertSD and elevSD slightly toward; curvPersist AWAY (+0.08 -> +0.14).
- **R3 axis set-point offset**: insertSD 6.2 -> 10.2 (toward, ~16% of the gap), elevSD small step toward; spacing/density/fork unmoved; curvPersist unchanged.
- **R4 (all three)**: toward real on spacingCV (0.42 vs 0.47, within range at 10-90%), attachPerM (1.71 vs 1.35), earlyFork; insertSD and elevSD about 40% closer in absolute terms but still 2.8 and 2.4 SD short (13 and 14 deg against 32); curvPersist AWAY (+0.17 vs -0.15).

## Strongest handle
By standardised distance R0 vs real lone: spacingCV (-4.8 SD; AUC 0.00, no overlap) then attachPerM (+4.0), insertSD (-3.8; no overlap), curvPersist (+3.6), elevSD (-2.8). In the stand: spacingCV (-3.1) then insertSD (-1.7). **Best objective handle: spacingCV** (largest, both regimes, and R2/R4 visibly move it), but it is a one-knob (shoot length/internode) number. The better test of the *remaining* gap after R4 is **insertSD** (and elevSD): no overlap in any of the four sensitivity settings, and R4 still 2.8 SD short. attachPerM is largely the same fact as spacingCV (density). curvPersist is a warning: sims arch steadily (+0.1) where QSM limbs zigzag (-0.15 lone), and the rules widen the gap.

## Caveats
- **QSM artefacts**: real limbs include cylinder-fit noise. Its first 0.5 m chord and cylinder-quantised attachment positions inflate insertSD and the spacing CV and push curvPersist negative (white noise in position gives a negative lag-1 correlation of its second differences). The same coarsening does not remove this. Part of the gaps (insertSD, curvPersist) may be measurement, not tree. Check by adding noise to sim tables, or reading a destructively measured tree.
- Sensitivity (lone): spacingCV real 0.64/0.47/0.34 for site gaps 0.1/0.25/0.5 m, R4 0.49/0.42/0.27; the ordering and the R2/R4 move hold. insertSD with a 1.0 m window: real 29.5, R0 10.6, R4 16.0.
- Real SDs are small for spacingCV (0.04) so the SD-standardised gaps are big; read them as a ranking.
- n: sim lone n=8 (seeds), real lone 23; percentiles over 8 are crude. Real stand is beech and taller-matched poorly (sim stand H 25-28 m; real beech subset H 12-22, n 13, thin). The real stand rows differ in species from the sim stand.
- d_min is beech's; TreeML hornbeam QSMs have their own resolution. Sim trees have no height filter.
- elevSD and insertSD depend on where limbs sit on the trunk; a young simulated tree with a narrower height range of limbs is not directly comparable.
