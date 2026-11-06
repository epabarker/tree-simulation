# T: real-tree targets per species (2026-11-06, overnight agent T)

Machine-readable: `/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/t/targets.json` (species → regime → descriptor → {median, p10, p90, n}; each regime also has `_meta`
(n_trees, sources, median H and DBH) and, where sources are mixed, `_bySource`). Raw per-tree rows:
`/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/t/real_desc.json` (572 QSMs, 0 errors). Heights: `/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/t/heights.json`, `/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/t/h/`.

## Method (reproducible)
- **Trees.** TreeML (lone, QSM DBH and height; the CSV's DBH not used), Belgian hedgerows (oak, birch; "lone" as in A6/A11), BioDiv
  (stand beech and hornbeam; the BioDiv hornbeam QSMs fetched by A14 so far), Wytham (stand oak, sycamore; **no Wytham ash exists in the data**:
  its species are ACERPS and QUERRO only), DEMOL (stand ash FEXC, stand beech FSYL; DEMOL is a destructive-sampling set of forest-grown
  trees, treated as stand). **Size filter (A6):** lone QSM DBH >= 10 cm and H 12-22 m; stand QSM DBH >= 12 cm and H >= 10 m.
- **Coarsening.** Every QSM is pruned at d_min 8.62 mm (`co.coarsen`, as A11's `run_real.py`: beech's value, one for all sets; Wytham's own
  floor is 5.0 mm, so Wytham rows carry a slightly different resolution than a Wytham-calibrated run would).
- **Regularity.** `a11/reg.py` unchanged: spacingCV, attachPerM, insertSD, elevSD, curvPersist, earlyFork. The lone hornbeam and beech rows
  reproduce `a11/targets.md` exactly (hornbeam 23: 0.47 / 1.35 / 31.5 / 31.5 / -0.15 / 0.37).
- **Crown shape** (`t/crown.py`, a7/flat-cap.md 1.2 with "leafy bud tip" replaced by a cylinder tip, i.e. a cylinder with no child, of the
  coarsened table): front view, |u| = horizontal offset from the root along the view axis; R = 98th pct |u|; top(r) = 98th pct of tip height
  in bin floor(|u|/R*8); **D = (top(0) - top(0.75R))/R**; **shapeRatio = drop(0.5R)/drop(0.75R)** (bins 4 and 6; drops averaged over azimuths
  first; NaN if drop(0.75R) < 0.02 R); **WH = 2R/H** (R again the 98th pct, so it is the 98%-width); **cbH** = height of the lowest limb
  (first-order axis >= 2.5 m, A11's `limbs`) attachment / H. Each tree: 4 azimuths 45 deg apart from a random offset (seeded by the tree id).
  Reference values for an ellipsoidal crown: D = 0.339 * (crown depth / R), i.e. 0.34 for a hemisphere and larger for a tall crown (D is not
  aspect-free); shapeRatio 0.39 for any ellipse, 0.67 for a cone, 0 for a flat top with a steep rim.
- **Instrument verified both ways.** On real QSMs it reproduces A11's selections; on simulated trees (HEAD params, lone, seeds 1-5, dumped
  at seasons 30, 60, 100) the tip-based, 4-azimuth D agrees with a7's original leafy-bud D (single azimuth along the slab's x, live-bud
  metamer tips on the unpruned skeleton): hornbeam 0.41/0.39, 0.05/0.10, 0.07/0.05 (tip/bud at 30/60/100), beech 0.25/0.36, 0.09/0.05,
  0.06/0.08, within seed noise; the flat hornbeam at 60-100 matches A10's F0 probe (D 0.05-0.11). The A10 F0 hornbeam *tables* (a10/render/t, lone season 25, H 15.7 m)
  read D 0.44, WH 0.73; A9's R0 the same.

## Targets, lone (QSM DBH >= 10 cm, H 12-22 m): median [10-90%] (columns: 6 regularity, then 4 crown)
| species (real n) | H med | spacingCV | attachPerM | insertSD | elevSD | curvPersist | earlyFork | D | shapeRatio | WH | cbH |
|---|---|---|---|---|---|---|---|---|---|---|---|
| beech (9; treeml 9) | 18.2 | 0.47 [0.43–0.50] | 1.49 [1.27–1.72] | 37.00 [32.46–42.42] | 29.03 [26.81–41.58] | -0.09 [-0.16–-0.06] | 0.30 [0.21–0.37] | 0.38 [0.22–0.77] | 0.37 [0.24–0.63] | 0.62 [0.55–0.73] | 0.14 [0.04–0.25] |
| oak (25; treeml 4, belgian 21) | 16.6 | 0.39 [0.31–0.45] | 1.86 [1.46–2.10] | 23.03 [19.68–30.50] | 25.67 [18.37–31.25] | -0.12 [-0.15–-0.04] | 0.35 [0.22–0.54] | 0.36 [0.16–0.59] | 0.41 [0.13–0.57] | 0.64 [0.55–0.82] | 0.18 [0.07–0.31] |
| ↳ treeml (4) | | 0.44 [0.40–0.48] | 1.42 [1.21–1.48] | 23.99 [22.32–29.97] | 26.70 [23.98–28.11] | -0.14 [-0.18–-0.09] | 0.25 [0.20–0.27] | 0.39 [0.17–0.86] | 0.29 [0.13–0.68] | 0.60 [0.57–0.67] | 0.17 [0.13–0.27] |
| ↳ belgian (21) | | 0.38 [0.31–0.43] | 1.92 [1.63–2.10] | 23.03 [19.24–29.59] | 25.63 [18.03–31.65] | -0.12 [-0.15–-0.01] | 0.39 [0.22–0.55] | 0.36 [0.19–0.54] | 0.42 [0.06–0.56] | 0.68 [0.55–0.83] | 0.20 [0.06–0.30] |
| hornbeam (23; treeml 23) | 15.1 | 0.47 [0.40–0.50] | 1.35 [1.09–1.63] | 31.53 [23.68–40.16] | 31.52 [24.35–40.19] | -0.15 [-0.25–-0.10] | 0.37 [0.21–0.49] | 0.55 [0.07–1.04] | 0.53 [0.08–0.69] | 0.62 [0.51–0.73] | 0.12 [0.06–0.22] |
| birch (17; treeml 11, belgian 6) | 15.9 | 0.47 [0.33–0.52] | 1.60 [1.20–1.93] | 30.46 [19.06–42.34] | 30.42 [19.91–36.99] | -0.18 [-0.27–-0.09] | 0.27 [0.16–0.47] | 0.37 [0.07–0.61] | 0.24 [0.09–0.64] | 0.52 [0.38–0.66] | 0.17 [0.09–0.31] |
| ↳ treeml (11) | | 0.50 [0.41–0.52] | 1.45 [1.13–1.64] | 34.80 [19.73–42.14] | 31.88 [23.96–37.46] | -0.17 [-0.22–-0.11] | 0.28 [0.19–0.41] | 0.36 [0.15–0.51] | 0.18 [-0.01–0.54] | 0.54 [0.46–0.65] | 0.17 [0.11–0.28] |
| ↳ belgian (6) | | 0.40 [0.30–0.44] | 1.89 [1.63–2.03] | 24.03 [19.13–39.61] | 24.95 [17.82–30.50] | -0.18 [-0.29–-0.09] | 0.26 [0.08–0.68] | 0.39 [-0.04–1.27] | 0.38 [0.17–0.65] | 0.43 [0.31–0.61] | 0.17 [0.09–0.48] |
| ash (52; treeml 52) | 15.7 | 0.43 [0.36–0.54] | 1.45 [1.04–1.86] | 17.73 [11.24–32.79] | 24.13 [14.15–35.34] | -0.07 [-0.16–0.02] | 0.31 [0.11–0.50] | 0.29 [0.06–0.55] | 0.40 [-0.13–0.58] | 0.63 [0.45–0.82] | 0.23 [0.14–0.38] |
| sycamore (25; treeml 25) | 15.6 | 0.47 [0.40–0.58] | 1.41 [0.95–1.83] | 27.08 [19.10–39.62] | 27.71 [19.28–38.94] | -0.09 [-0.15–-0.00] | 0.35 [0.25–0.50] | 0.51 [0.25–0.74] | 0.43 [0.25–0.58] | 0.63 [0.53–0.80] | 0.20 [0.09–0.28] |
| maple_norway (30; treeml 30) | 16.6 | 0.42 [0.36–0.53] | 1.57 [1.06–1.85] | 21.55 [15.44–35.85] | 26.52 [19.12–34.32] | -0.11 [-0.17–-0.02] | 0.35 [0.25–0.45] | 0.36 [0.11–0.70] | 0.35 [0.04–0.67] | 0.61 [0.44–0.83] | 0.23 [0.10–0.32] |
| maple_field (2; treeml 2) | 16.6 | 0.45 [0.45–0.46] | 1.28 [1.18–1.38] | 32.97 [31.10–34.85] | 29.49 [26.62–32.36] | -0.11 [-0.12–-0.11] | 0.24 [0.21–0.27] | 0.59 [0.38–0.80] | 0.15 [0.10–0.20] | 0.69 [0.63–0.74] | 0.19 [0.17–0.22] |
| lime (55; treeml 55) | 16.1 | 0.39 [0.34–0.46] | 1.92 [1.49–2.11] | 28.39 [20.71–35.30] | 29.75 [22.64–39.23] | -0.12 [-0.18–-0.03] | 0.38 [0.25–0.48] | 0.67 [0.36–1.11] | 0.50 [0.31–0.64] | 0.57 [0.48–0.68] | 0.23 [0.17–0.33] |
| whitebeam (4; treeml 4) | 13.5 | 0.49 [0.44–0.58] | 1.12 [0.87–1.50] | 31.92 [21.73–46.23] | 34.93 [29.11–44.30] | -0.08 [-0.14–-0.04] | 0.32 [0.23–0.52] | 0.33 [0.17–0.41] | 0.40 [-0.24–0.70] | 0.65 [0.54–0.81] | 0.14 [0.12–0.20] |

## Targets, stand (QSM DBH >= 12 cm, H >= 10 m)
| species (real n) | H med | spacingCV | attachPerM | insertSD | elevSD | curvPersist | earlyFork | D | shapeRatio | WH | cbH |
|---|---|---|---|---|---|---|---|---|---|---|---|
| beech (66; demol 15, biodiv 51) | 24.0 | 0.41 [0.33–0.52] | 1.52 [1.02–1.96] | 24.95 [17.43–39.41] | 24.82 [18.62–37.33] | -0.07 [-0.21–0.03] | 0.24 [0.13–0.46] | 0.18 [-0.18–0.83] | 0.23 [-0.31–0.59] | 0.31 [0.23–0.41] | 0.38 [0.10–0.56] |
| ↳ demol (15) | | 0.42 [0.33–0.52] | 1.54 [1.38–1.70] | 18.38 [15.40–28.63] | 24.74 [16.88–37.40] | -0.04 [-0.11–0.01] | 0.30 [0.17–0.48] | 0.17 [-0.01–0.73] | 0.22 [-0.19–0.53] | 0.34 [0.23–0.39] | 0.44 [0.26–0.59] |
| ↳ biodiv (51) | | 0.40 [0.33–0.50] | 1.50 [1.00–2.04] | 27.81 [19.79–42.19] | 24.90 [18.79–36.36] | -0.07 [-0.23–0.03] | 0.22 [0.13–0.43] | 0.25 [-0.49–0.82] | 0.23 [-0.32–0.59] | 0.29 [0.23–0.41] | 0.34 [0.09–0.52] |
| oak (37; wytham 37) | 19.9 | 0.41 [0.36–0.55] | 1.49 [1.15–1.81] | 26.27 [18.97–34.96] | 23.94 [18.80–30.64] | -0.07 [-0.17–0.02] | 0.23 [0.07–0.44] | 0.09 [-0.34–0.42] | 0.24 [-0.25–0.58] | 0.62 [0.43–0.80] | 0.26 [0.12–0.37] |
| hornbeam (36; biodiv 36) | 21.5 | 0.40 [0.32–0.49] | 1.80 [1.06–2.24] | 27.27 [18.55–38.06] | 26.89 [19.05–37.11] | -0.09 [-0.18–0.02] | 0.30 [0.14–0.53] | 0.14 [-0.12–0.58] | -0.00 [-1.38–0.67] | 0.44 [0.32–0.57] | 0.22 [0.09–0.34] |
| ash (16; demol 16) | 20.4 | 0.45 [0.38–0.52] | 1.39 [1.06–1.49] | 12.63 [8.19–21.19] | 15.34 [8.84–26.44] | -0.08 [-0.20–0.08] | 0.13 [0.01–0.32] | 0.17 [-1.26–0.60] | 0.16 [-0.24–0.74] | 0.29 [0.22–0.42] | 0.41 [0.15–0.52] |
| sycamore (37; wytham 37) | 18.9 | 0.46 [0.32–0.61] | 1.48 [1.26–1.78] | 18.44 [9.79–30.33] | 19.50 [12.69–29.06] | -0.07 [-0.17–0.09] | 0.25 [0.00–0.50] | 0.08 [-0.79–0.33] | 0.09 [-3.05–0.46] | 0.45 [0.37–0.64] | 0.46 [0.29–0.62] |

Notes on the tables. Real n is the number of trees passing the filter; the per-descriptor n (trees with a defined value) is in targets.json
(insertSD, elevSD and earlyFork need >= 5 limbs, spacingCV >= 2 limbs of >= 4 sites, shapeRatio a drop(0.75R) > 0.02 R).
**Species with >= 8 real trees:** lone: beech 9, oak 25 (4 TreeML + 21 Belgian), hornbeam 23, birch 17 (11 TreeML + 6 Belgian), ash 52, sycamore 25,
Norway maple 30, lime 55. Fewer: field maple 2, whitebeam 4. Stand: beech 66 (BioDiv 51 + DEMOL 15), oak 37, hornbeam 36 (BioDiv; hornbeam QSMs were still arriving from A14's fetch, count as of the final run), sycamore 37, ash 16 (DEMOL
only). **No stand birch, Norway maple or lime.** Stand-regime shapeRatio and D are noisy (the tips of a crowded crown have no clean envelope;
p10 of D is negative for several species because the centre bin is lower than the shoulder bin): read the median, not the band. The BioDiv
beech stand H 12-22 subset in A11 is a different filter from this one (H >= 10).

## The dome answer
**Yes: real lone hornbeams, beeches and oaks are domes by D, not flat caps.** Median D (4-azimuth, tips), lone, QSM DBH >= 10 cm, H 12-22 m:
- hornbeam **0.55 [0.07–1.04] (n 23)**, shapeRatio 0.53 [0.08–0.69] (n 21), W/H 0.62 [0.51–0.73] (n 23); 18 of 23 have D > 0.2, only 3 of 23 have D < 0.11 (the top of simulated F0's 0.05-0.11);
- beech **0.38 [0.22–0.77] (n 9)** (8 of 9 above 0.2; lowest 0.11); oak **0.36 [0.16–0.59] (n 25)** (21 of 25 above 0.2; TreeML oaks 0.39, Belgian 0.36);
- birch 0.37 [0.07–0.61] (n 17); ash 0.29 [0.06–0.55] (n 52); sycamore 0.51 [0.25–0.74] (n 25); lime 0.67 [0.36–1.11] (n 55).
  (A tall crown inflates D: the shapeRatio, which has no aspect dependence, is 0.37-0.53 for hornbeam and beech and 0.41 for oak, against 0.39 for an ellipse and 0.67 for a cone: rounded, not flat.)
- Simulated F0 against it, HEAD params, lone, seeds 1-5 (same instrument): 

| species | season | sim H m | sim D median [min..max] | sim D (a7 leafy-bud) | sim shapeRatio | sim W/H |
|---|---|---|---|---|---|---|
| hornbeam | 30 | 17.4 | 0.41 [0.38..0.50] | 0.39 | 0.62 | 0.75 |
| hornbeam | 60 | 26.8 | 0.05 [0.03..0.11] | 0.10 | -0.03 | 0.72 |
| hornbeam | 100 | 37.0 | 0.07 [-0.01..0.08] | 0.05 | 0.30 | 0.67 |
| beech | 30 | 12.3 | 0.25 [0.16..0.40] | 0.36 | 0.24 | 1.12 |
| beech | 60 | 22.1 | 0.09 [-0.00..0.13] | 0.05 | 0.36 | 1.04 |
| beech | 100 | 30.6 | 0.06 [-0.06..0.41] | 0.08 | 0.43 | 0.97 |
| oak | 30 | 18.6 | 0.39 [0.35..0.43] | 0.31 | 0.63 | 0.86 |
| oak | 60 | 34.3 | 1.46 [0.81..1.56] | 1.26 | 0.72 | 0.63 |
| oak | 100 | 44.6 | 2.30 [0.17..2.71] | 2.02 | 0.50 | 0.50 |
| birch | 30 | 21.0 | 0.70 [0.62..0.75] | 0.63 | 0.57 | 0.62 |
| birch | 60 | 35.9 | 0.55 [0.45..0.85] | 0.34 | 0.47 | 0.37 |
| birch | 100 | 43.3 | 0.16 [-0.04..0.44] | 0.14 | 1.06 | 0.36 |

**So the simulated lone hornbeam is a dome at real sizes and flattens only when it outgrows them.** Real lone hornbeam D falls with height too (TreeML, QSM DBH >= 10 cm): H < 12 m 0.69 (n 17), 12-16 m 0.73 (14), 16-22 m 0.49 [0.10-0.66] (9).
At season 30 (sim H 17.4 m, inside that window) the simulated D 0.41 sits inside the real band and just under the 16-22 m median; at 60-100 (H 27-38 m) D is 0.05-0.08, flat.
**The aspect-free witness is shapeRatio:** real lone hornbeam 0.53 [0.08-0.69] (hemisphere 0.39, cone 0.67) against the simulation's -0.03 at season 60 (0.30 at 100): a rounded shoulder against a flat lid with a steep rim.
There are **no real lone hornbeams above 22 m on disk** (the tallest TreeML lone hornbeam is 22 m; Lockow's table gives a top height of 32 m at 100 years for the best site), so the real data cannot say whether a 30 m lone hornbeam flattens.
What they do show: **real stand trees are flat to modest by D** (stand medians: oak 0.09, sycamore 0.08, beech 0.18, ash 0.17, hornbeam 0.14 (n 36), bands crossing zero), so a flat top is normal in a crowded stand; the simulated stand
hornbeam (A10 F0 tables, season 70, H 29 m: D 0.00) sits at the low end of the real stand hornbeam band [-0.12-0.58]. For a lone tree the target is a dome: D about 0.4-0.55, W/H about 0.6 (real 0.62 [0.51-0.73]; simulated lone 0.67-0.77, at the band's top) at H 12-22 m.
The simulated lone beech is far wider than real (W/H 1.0-1.1 against 0.62 [0.55-0.73]). The simulated lone oak is the opposite error in D: D 1.5-2.3 at 60-100 (a pointed leader, shapeRatio 0.5-0.7) where real lone oaks are domes (D 0.36, W/H 0.64).
So the flat lone cap is a property of tall, old simulated trees (2-3 x the real lone heights), partly a Level 0 height problem (hornbeam 37.0 m at 100 against a top height of 32 m at site index 32; see the height table).
**Caveats.** (1) TreeML's "lone" trees are **Munich street trees** (pruned, in light wells): D, W/H and above all crown base (lone cbH 0.12-0.23 against the simulation's 0.01) may reflect street pruning, not growth: do not tune crown base to them.
(2) Leaf-off TLS misses some top tips (occlusion), which would bias real D low, not high. (3) Seeds 1-5 only; D's 98th-percentile bins rest on 1,000-4,000 tips.

## Level 0 mature heights (ten garden species; flora.ts has ten, not eleven: birch, oak, beech, fir, hornbeam, maple, holly, rowan, willow, pine)
Sim: native core via `cli/trials.ts` (`loneParams`, `forestParams(146, seed)`, `standParams` for fir and pine) and `cli/allometry.ts` (DBH at 1.3 m, height of the highest metamer, m), seeds 1-5 (garden forest also 6-10), planted trees only,
dead trees excluded. These ran on the WASM build of the same Rust core through `cli/trials.ts` (the native `npm run sim` was not used: the trials give DBH from the allometry rule directly); the garden-forest rows reproduce `scratchpad/heights/run-2`'s native metrics.csv for seed 2 to the decimal (rowan 19.9 / 23.1 / 22.9 m at 60 / 100 / 150). **Fir and pine do not occur in the garden's planting (`MIXED`), so their "forest" rows come from the closed stand trial (`standParams`), marked \***; the garden forest's coverage is in the note under the table.
Bands: **Tallo level-0 v2** (H against DBH, q10/q50/q90 at the simulated DBH, clamped to the support's upper end; `band` own/borrowed) with the source `tallo-level0-curves.csv`; **age anchors**:
NW-FVA H100 classes -1..3 (oak, beech, pine; `nwfva_h100.csv`), Lockow 2009 top height at site index 32..18 (hornbeam), Chapman-Richards top-height curves (`minor_species_growth_curves.csv`: willow = Salix caprea classes I-III,
rowan = Sorbus aucuparia, holly = Ilex aquifolium; the curves cap at A = 19, 17.3 and 13.6 m). The age is the season. Two ratios are shown, sim median H over Tallo's own-band q90 at the simulated DBH (borrowed Tallo bands are shown but not used: rowan's borrowed band says 28 m at 22 cm DBH, which is the six broadleaves', not rowan's) and over the age-anchored upper; a row is flagged when **either** exceeds 1.3, and the basis column says which. Beech's 150 anchor has classes 2-3 only (the tables end earlier for the better classes). Yield-table top heights are stand values, so for lone trees the age bounds are lenient; holly's and rowan's curves are "estimated" (not measured), willow's extrapolated beyond its measured range (capped A = 19 m). Rows within 0.05 of 1.3 are marked borderline. Closed-stand rows count all 12 planted trees per seed (60 over 5 seeds).

**Flags in short (seeds 1-5; garden rows seeds 1-10, n per species 2-15 planted, survivors fewer).**
- **Rowan:** lone 29.8 m at 100 and 32.8 at 150 = 1.75x and 1.90x the age anchor (17.0, 17.3 m): flagged. In the garden forest the median survivor is 17.4 m (1.03x, n 4) but the tallest garden tree is 23.1 m (1.36x; seed 2, where rowan is the only survivor): the overseer's "about 23 m" is that tree.
- **Lone trees over 1.3x at 100 or 150:** oak (age anchor 1.35 at 100, 1.37 at 150; Tallo 1.33 at 150), hornbeam at 150 (49 m: 1.57x Tallo q90, 1.39x Lockow), willow at 150 (1.37x), holly at 100 (1.36x of an estimated curve; 1.27 at 150), pine at 150 (1.40x Tallo). Birch, beech, fir, maple are under 1.3 lone (birch 1.10-1.19 of Tallo, fir 1.22-1.26 borderline, beech 0.66-0.84, maple 0.77-0.80).
- **Garden forest:** nothing exceeds 1.3; hornbeam at 150 is 1.26 borderline (n 1), rowan 1.03-1.06. Maple, willow, holly, beech sit well below their bands in the forest (0.45-0.63, 0.54-0.55 of the age anchor, 0.79-0.85, 0.45-0.52): these are survivors under shade and a pinched-in garden stand.
- **Fir and pine closed-stand flags are H/D (slenderness) flags**, not height outliers: they trigger only on Tallo's q90 at their thin stand DBH (18-24 cm); pine at 100 is 28.8 m against NW-FVA's 21-33 m (0.87x the upper). Neither species occurs in the garden planting.
- Hornbeam lone 37 m at 100 (1.16x Lockow's site-index-32 top height; 1.19x Tallo): the lone-tree flat cap lives at these oversize heights (see the dome answer).

| species | season | regime | n alive/planted trees (seeds) | sim H median (max) m | sim DBH cm | Tallo H q10/q50/q90 at DBH (band) | age-anchored top height, upper..lower | H / Tallo q90 | H / age upper | flag (>1.3x), basis |
|---|---|---|---|---|---|---|---|---|---|---|
| beech | 100 | lone | 5/5 | 30.6 (31.9) | 103 | 32.5/38.9/46.1 (own, clamped to 74 cm) | 40.5..24.5 (NW-FVA beech H100 classes -1..3 at 100) | 0.66 | 0.76 |  |
| beech | 100 | garden forest | 2/5 | 18.6 (22.5) | 58 | 28.1/34.6/41.2 (own) | 40.5..24.5 (NW-FVA beech H100 classes -1..3 at 100) | 0.45 | 0.46 |  |
| beech | 150 | lone | 5/5 | 39.0 (40.1) | 125 | 32.5/38.9/46.1 (own, clamped to 74 cm) | 34.1..29.7 (NW-FVA beech H100 classes 2..3 at 150) | 0.84 | 1.14 |  |
| beech | 150 | garden forest | 2/5 | 23.8 (30.8) | 85 | 32.5/38.9/46.1 (own, clamped to 74 cm) | 34.1..29.7 (NW-FVA beech H100 classes 2..3 at 150) | 0.52 | 0.70 |  |
| oak | 100 | lone | 5/5 | 44.6 (46.7) | 64 | 25.5/33.8/37.8 (own) | 33.0..21.0 (NW-FVA oak H100 classes -1..3 at 100) | 1.18 | 1.35 | **FLAG** age anchor |
| oak | 100 | garden forest | 4/5 | 29.1 (29.8) | 40 | 20.1/29.3/33.8 (own) | 33.0..21.0 (NW-FVA oak H100 classes -1..3 at 100) | 0.86 | 0.88 |  |
| oak | 150 | lone | 5/5 | 50.9 (51.7) | 71 | 26.4/34.2/38.2 (own) | 37.2..25.4 (NW-FVA oak H100 classes -1..3 at 150) | 1.33 | 1.37 | **FLAG** Tallo q90 at DBH+age anchor |
| oak | 150 | garden forest | 2/5 | 32.1 (32.3) | 47 | 22.1/31.2/35.5 (own) | 37.2..25.4 (NW-FVA oak H100 classes -1..3 at 150) | 0.90 | 0.86 |  |
| hornbeam | 100 | lone | 5/5 | 37.0 (38.4) | 78 | 23.4/27.0/31.1 (own, clamped to 39 cm) | 32.0..18.0 (Lockow 2009 top height, site index 32..18 at 100) | 1.19 | 1.16 |  |
| hornbeam | 100 | garden forest | 3/5 | 30.9 (33.0) | 76 | 23.4/27.0/31.1 (own, clamped to 39 cm) | 32.0..18.0 (Lockow 2009 top height, site index 32..18 at 100) | 0.99 | 0.97 |  |
| hornbeam | 150 | lone | 5/5 | 48.8 (49.8) | 96 | 23.4/27.0/31.1 (own, clamped to 39 cm) | 35.1..19.5 (Lockow 2009 top height, site index 32..18 at 150) | 1.57 | 1.39 | **FLAG** Tallo q90 at DBH+age anchor |
| hornbeam | 150 | garden forest | 1/5 | 39.1 (39.1) | 143 | 23.4/27.0/31.1 (own, clamped to 39 cm) | 35.1..19.5 (Lockow 2009 top height, site index 32..18 at 150) | 1.26 | 1.11 | borderline |
| birch | 100 | lone | 5/5 | 43.3 (43.9) | 45 | 29.8/36.6/39.3 (own) | none | 1.10 | n/a |  |
| birch | 100 | garden forest | 3/15 | 32.8 (35.5) | 39 | 26.8/33.2/37.0 (own) | none | 0.88 | n/a |  |
| birch | 150 | lone | 5/5 | 49.3 (50.8) | 55 | 32.8/40.0/41.6 (own, clamped to 51 cm) | none | 1.19 | n/a |  |
| birch | 150 | garden forest | 2/15 | 35.3 (37.1) | 51 | 32.4/39.6/41.3 (own) | none | 0.85 | n/a |  |
| maple | 100 | lone | 5/5 | 21.0 (22.5) | 45 | 15.6/22.8/27.2 (own) | none | 0.77 | n/a |  |
| maple | 100 | garden forest | 3/5 | 12.6 (13.7) | 26 | 9.9/15.8/20.1 (own) | none | 0.63 | n/a |  |
| maple | 150 | lone | 5/5 | 24.2 (25.1) | 57 | 18.2/25.9/30.2 (own, clamped to 54 cm) | none | 0.80 | n/a |  |
| maple | 150 | garden forest | 3/5 | 12.7 (13.6) | 29 | 11.1/17.3/21.6 (own) | none | 0.59 | n/a |  |
| willow | 100 | lone | 5/5 | 22.0 (25.0) | 48 | 10.8/14.8/18.2 (borrowed, clamped to 29 cm) | 18.9..17.5 (Salix caprea Chapman-Richards (minor_species_growth_curves.csv) at 100) | n/a | 1.17 |  |
| willow | 100 | garden forest | 1/5 | 10.2 (10.2) | 29 | 10.9/14.8/18.2 (borrowed) | 18.9..17.5 (Salix caprea Chapman-Richards (minor_species_growth_curves.csv) at 100) | n/a | 0.54 |  |
| willow | 150 | lone | 5/5 | 25.9 (29.0) | 52 | 10.8/14.8/18.2 (borrowed, clamped to 29 cm) | 19.0..18.6 (Salix caprea Chapman-Richards (minor_species_growth_curves.csv) at 150) | n/a | 1.37 | **FLAG** age anchor |
| willow | 150 | garden forest | 1/5 | 10.4 (10.4) | 29 | 10.8/14.8/18.2 (borrowed) | 19.0..18.6 (Salix caprea Chapman-Richards (minor_species_growth_curves.csv) at 150) | n/a | 0.55 |  |
| rowan | 100 | lone | 5/5 | 29.8 (30.8) | 42 | 21.0/28.5/35.3 (borrowed, clamped to 22 cm) | 17.0..17.0 (Sorbus aucuparia Chapman-Richards (minor_species_growth_curves.csv) at 100) | n/a | 1.75 | **FLAG** age anchor |
| rowan | 100 | garden forest | 4/5 | 17.4 (23.1) | 35 | 21.0/28.5/35.3 (borrowed, clamped to 22 cm) | 17.0..17.0 (Sorbus aucuparia Chapman-Richards (minor_species_growth_curves.csv) at 100) | n/a | 1.03 |  |
| rowan | 150 | lone | 5/5 | 32.8 (36.3) | 43 | 21.0/28.5/35.3 (borrowed, clamped to 22 cm) | 17.3..17.3 (Sorbus aucuparia Chapman-Richards (minor_species_growth_curves.csv) at 150) | n/a | 1.90 | **FLAG** age anchor |
| rowan | 150 | garden forest | 4/5 | 18.4 (22.9) | 35 | 21.0/28.5/35.3 (borrowed, clamped to 22 cm) | 17.3..17.3 (Sorbus aucuparia Chapman-Richards (minor_species_growth_curves.csv) at 150) | n/a | 1.06 |  |
| holly | 100 | lone | 5/5 | 16.9 (20.5) | 25 | no curve | 12.4..12.4 (Ilex aquifolium Chapman-Richards (minor_species_growth_curves.csv) at 100) | n/a | 1.36 | **FLAG** age anchor |
| holly | 100 | garden forest | 5/5 | 10.5 (15.0) | 11 | no curve | 12.4..12.4 (Ilex aquifolium Chapman-Richards (minor_species_growth_curves.csv) at 100) | n/a | 0.85 |  |
| holly | 150 | lone | 5/5 | 16.9 (21.0) | 27 | no curve | 13.3..13.3 (Ilex aquifolium Chapman-Richards (minor_species_growth_curves.csv) at 150) | n/a | 1.27 | borderline |
| holly | 150 | garden forest | 3/5 | 10.5 (11.1) | 12 | no curve | 13.3..13.3 (Ilex aquifolium Chapman-Richards (minor_species_growth_curves.csv) at 150) | n/a | 0.79 |  |
| fir | 100 | lone | 5/5 | 50.5 (51.0) | 60 | 30.3/35.5/40.2 (own) | none | 1.26 | n/a | borderline |
| fir | 100 | closed stand* | 60/60 | 35.1 (39.0) | 23 | 15.3/18.9/23.8 (own) | none | 1.47 | n/a | **FLAG** Tallo q90 at DBH |
| fir | 150 | lone | 5/5 | 52.1 (52.9) | 76 | 32.6/38.0/42.5 (own, clamped to 67 cm) | none | 1.22 | n/a |  |
| fir | 150 | closed stand* | 60/60 | 41.0 (50.5) | 24 | 16.1/19.7/24.6 (own) | none | 1.66 | n/a | **FLAG** Tallo q90 at DBH |
| pine | 100 | lone | 5/5 | 37.1 (37.4) | 37 | 19.4/26.5/32.0 (own) | 33.0..21.0 (NW-FVA pine H100 classes 0..3 at 100) | 1.16 | 1.12 |  |
| pine | 100 | closed stand* | 60/60 | 28.8 (30.4) | 18 | 13.7/18.4/21.8 (own) | 33.0..21.0 (NW-FVA pine H100 classes 0..3 at 100) | 1.32 | 0.87 | **FLAG** Tallo q90 at DBH (borderline) |
| pine | 150 | lone | 5/5 | 48.7 (49.2) | 44 | 20.6/28.6/34.8 (own) | none | 1.40 | n/a | **FLAG** Tallo q90 at DBH |
| pine | 150 | closed stand* | 60/60 | 33.7 (38.3) | 20 | 14.5/19.4/23.0 (own) | none | 1.46 | n/a | **FLAG** Tallo q90 at DBH |


**Garden-forest coverage** (forestParams(146, seed): 5 planted trees per seed, species rotated by the seed; 10 seeds): beech 5 planted, 2 alive at 100, 2 at 150; birch 15 planted, 3 alive at 100, 2 at 150; holly 5 planted, 5 alive at 100, 3 at 150; hornbeam 5 planted, 3 alive at 100, 1 at 150; maple 5 planted, 3 alive at 100, 3 at 150; oak 5 planted, 4 alive at 100, 2 at 150; rowan 5 planted, 4 alive at 100, 4 at 150; willow 5 planted, 1 alive at 100, 1 at 150. The garden's own survivors are few (most trees die by 100: e.g. seed 2 keeps only its rowan, matching `scratchpad/heights/run-2`'s native metrics.csv exactly), so the garden rows are anecdotal; the lone rows (5 seeds) carry the comparison. Fir and pine never occur in the garden planting; their closed-stand rows (three rows of four, tau 0) are thin (DBH 18-25 cm) so Tallo's q90 at that small DBH is the flag trigger: those are slenderness (H/D) flags, not height outliers (pine at 100 is 28.6 m against NW-FVA's 21-33 m).
