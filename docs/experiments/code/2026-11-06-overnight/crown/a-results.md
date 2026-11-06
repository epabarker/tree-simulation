# A: the crown shape on hornbeam (overnight 2026-11-06, 00:37–02:10)

**Branch:** `a-crown` = b783d73, A10's two prototypes, both off by default and pushed unchanged.

**No new core code.** Every candidate here is an existing param:
- `r2.dLambdaTrunk` (A10's rule: `rust/core/src/principles/r2.rs:117`, params.rs:239/565, params.ts:336, unit test r2.rs:597);
- ADR 0034's curve;
- ADR 0038's aged set point;
- the ADR 0033/0039–0042 fork package;
- `c2.skyExponent`;
- level λ.

Scripts are in `a/code/`: conds.py, probe.py, score.py, dvh.py, ytab.py, stand.py/stand.ts, sheet.py, garden_cmp.py.
- **Data:** `a/probe.csv`, `a/dvh.csv`, `a/stand.csv`, `a/garden-F3/`.
- **Pass rule:** registered in `a/rule.md` before any result.

## Measure and target
**Measure.** T's crown() (`t/crown.py`) on the sim table coarsened at BioDiv's d_min, mean of 4 azimuths, which is the targets' own measure. F0 s1 reproduces T's HEAD sim values.

**The slab clips W/H on big crowns.** The slab's depth (64 cells, 16 m) clips a big crown in z, so the 4-azimuth W/H of a 35 m tree is too narrow by construction. Below about 20 m the crown's half-width (about 25 cells) fits inside the slab, so the measure is valid there.
- A front-view column (x only: Dx, ratiox, WHx) was added **after** the results, as a diagnosis of the slab. It is not a pass.

**Target.** Real lone hornbeam (T: TreeML, 12–22 m, n 23):

| | median | band |
|---|---|---|
| D | 0.55 | Q1 0.23, p10–p90 0.07–1.04 |
| shape ratio | 0.53 | 0.08–0.69 |
| W/H | 0.62 | 0.51–0.73 |

**Pass rule:** ≥ 4 of 5 seeds pass at both 60 and 100, and metamers ≤ 1.25× F0's. A seed passes when D ≥ 0.23 and both the ratio and W/H are in band.

## Probe: lone hornbeam, seeds 1–5, medians at 60/100 (D, ratio and W/H by T's 4-azimuth measure)
| cond | patch | D | ratio | W/H | top5 leaf | k | metamers (×F0 at 100) | seeds passing 60/100 |
|---|---|---|---|---|---|---|---|---|
| F0 | today | 0.05/0.07 | −0.03/0.30 | 0.72/0.67 | 0.37/0.38 | 0.71/0.47 | 49.4k/67.1k (1.00) | 0/0 |
| F3 | dLambdaTrunk | 0.35/0.27 | 0.52/0.56 | 0.62/0.51 | 0.29/0.32 | 0.85/0.65 | 41.9k/57.8k (0.86) | 5/2 |
| SKY | c2.skyExponent 0 | 0.06/0.01 | 0.47/– | 0.67/0.59 | 0.34/0.34 | 0.73/0.50 | 43.0k/60.1k (0.90) | 0/0 |
| SKY3 | SKY + F3 | 0.28/0.38 | 0.55/0.62 | 0.56/0.44 | 0.29/0.23 | 0.86/0.68 | 34.8k/47.3k (0.70) | 5/0 |
| CRV | levels.1.curve 30/20 | 0.06/0.01 | 0.33/– | 0.73/0.64 | 0.39/0.37 | 0.71/0.47 | 49.7k/66.2k (0.99) | 0/0 |
| CRV3 | CRV + F3 | 0.34/0.34 | 0.55/0.57 | 0.61/0.53 | 0.29/0.27 | 0.85/0.65 | 41.9k/57.8k (0.86) | 5/2 |
| TRL | levels.1 setPoint 60 → aged 15 over 20 | 0.08/0.05 | 0.21/0.09 | 0.72/0.63 | 0.38/0.36 | 0.71/0.47 | 48.7k/64.4k (0.96) | 0/0 |
| TRL3 | TRL + F3 | 0.34/0.32 | 0.49/0.66 | 0.62/0.50 | 0.29/0.27 | 0.86/0.65 | 42.2k/55.2k (0.82) | 5/1 |
| FRK | beech's relay, fork, vigour and light-orthotropy package | 0.07/0.06 | 0.29/0.35 | 0.77/0.69 | 0.39/0.35 | 0.70/0.45 | 52.7k/72.7k (1.08) | 0/0 |
| FRK3 | FRK + F3 (confounded: arms are pa 0) | 0.06/0.06 | 0.27/0.28 | 0.67/0.61 | 0.44/0.48 | 0.81/0.58 | 42.5k/58.9k (0.88) | 0/0 |
| SPR3 | levels.1 setPoint 50 + F3 | 0.32/0.40 | 0.54/0.59 | 0.64/0.51 | 0.29/0.27 | 0.84/0.64 | 42.3k/56.9k (0.85) | 5/2 |
| C45_3 | curve 45/15 + F3 | 0.34/0.39 | 0.55/0.69 | 0.62/0.51 | 0.30/0.29 | 0.85/0.65 | 42.8k/57.9k (0.86) | 5/2 |
| LAX (own) | levels.1 λ 0.53 | 0.09/−0.01 | 0.49/– | 0.71/0.65 | 0.36/0.34 | 0.71/0.47 | 49.0k/65.5k (0.98) | 0/0 |
| LAX3 (own) | LAX + F3 | −0.32/−0.23 | –/– | 0.60/0.58 | 0.10/0.29 | 0.75/0.55 | 44.4k/60.1k (0.90) | 0/0 |

Wall time: 76–117 s per run to 100 (native, under load 8–21). The table is noisy; F3 runs about 15% faster than F0.

**No condition passes the registered rule.** The F3 family passes at 60 (5/5) and fails at 100 (≤ 2/5):
- On the 4-azimuth measure, W/H at 100 is 0.50–0.53, the slab clip above.
- On the front view, the ratio at 100 is conical: ratiox 0.65–0.87, against the real 0.53.

**Geometry alone does nothing to the top** (A7's prediction holds):
- curvature (CRV), Troll's secondary straightening (TRL), the fork package (FRK) and the sky exponent (SKY) all stay flat (D ≤ 0.08);
- on top of F3, these add at most ±0.1 of D.

**My own idea failed.** It raised the limbs' λ above the trunk's (LAX) to drive the limb tips outward. The limbs overtook the leader instead: a bowl (D −0.3).

## D against height (interpolated per seed at H; medians of 5 seeds; `a/dvh.csv`)
| cond | 15 m | 20 m | 25 m | 30 m | k at 20/25 m |
|---|---|---|---|---|---|
| F0 | 0.46 (ratio 0.70, W/H 0.72) | 0.30 (0.38, 0.75) | **0.09** (0.06, 0.73) | 0.06 | 0.95/0.77 |
| F3 | 0.41 (0.45, 0.68) | 0.50 (0.49, 0.66) | 0.37 (0.52, 0.62) | 0.31 (0.55, 0.57) | 1.01/0.87 |
| SPR3 | 0.38 | 0.49 | 0.33 | 0.33 | 1.01/0.85 |
| CRV3 | 0.40 | 0.48 | 0.35 | 0.33 | 1.01/0.87 |
| K1 (limbs keep λ) | 0.33 | 0.21 | 0.11 | 0.04 | 0.93/0.76 |
| K2 (twigs keep λ) | 0.34 | 0.48 | 0.40 | 0.32 (W/H 0.76–0.89, +25% metamers) | 0.97/0.85 |

- **When F0's cap appears.** F0 is a real-like dome up to about 20 m and crosses D 0.23 at about 21–22 m, by season ≈ 45; it is flat by 25 m (season ≈ 54).
  - The cap is a size effect: it arrives as k falls through about 0.8 (A7's mechanism).
  - It appears below 25 m, while hornbeam's own range runs to 31–32 m (Tallo q90 at the sim's DBH; Lockow's top height at SI 32, at 100).
- **The registered per-seed rule, applied at matched height** (`perseed_h.py`; NaN fails; the 4-azimuth W/H is valid to about 25 m):
  - F0 0/5 at 20 m (W/H 0.75 just over 0.73) and 0/5 at 25 m (flat);
  - F3 5/5 and 5/5; CRV3 5/5 and 5/5; SPR3 4/5 and 5/5; SKY3 5/5 and 5/5; K1 and K2 0/5.
- **F3 holds the dome through 30 m.** Its D is 0.31–0.50 and its ratio 0.45–0.55 (real 0.53).
- **Which level's λ matters (a mechanism hint, not a clean ablation).** K1 and K2 raise one level's λ by Δλ, so the early λ is high too. The result: the dome comes from the order-2 (twig) axes keeping their λ (K2), not the limbs (K1). A twig at λ 0.42 spreads its resource over sub-threshold laterals.

## Y's height patch (the coordinator's question)
`{"r1.Lh": 10, "r2.dLambda": 0.06}`, lone, seeds 1–5:

| cond | season | H m | D | ratio | W/H | metamers |
|---|---|---|---|---|---|---|
| F0 + Y | 60 | 17.9 | −0.20 | – | 0.39 | 3.3k |
| F0 + Y | 100 | 20.7 | −0.34 | – | 0.36 | 3.7k |
| F0 + Y | 150 | 23.8 | −0.47 | – | 0.36 | 3.9k |
| F3 + Y | 60 | 18.3 | −0.31 | – | 0.29 | 2.7k |
| F3 + Y | 100 | 24.2 | −0.70 | – | 0.23 | 2.7k |
| F3 + Y | 150 | 31.3 | −2.28 | – | 0.17 | 2.7k |
| SPR3 + Y | 100 | 24.5 | −0.42 | – | 0.23 | 2.8k |

**No: a hornbeam held to about 22 m by Y's patch is not a dome.**
- It is a sparse narrow pole with a V-shaped top: W/H 0.36 against 0.62, D negative, k 0.20–0.28.
- It carries 18× fewer metamers than F0 (3.7k against 67k at 100).
- On F3, Y's patch grows a whip (`a/sheet-Y.png`).
- L_h 10 starves the crown rather than stopping height. The hyperbolic discount at a path of 100 cells is 1/(1 + 100/10) = 0.09, against 0.48 at L_h 92.4: about 5× less production at the crown's edge.
- The patch landed as Y ran it: Y0h's heights (11.65/17.9/20.65/23.8 m at 20/60/100/150) match Y's curve.
- Y checked heights, not crown carbon. Any height patch needs metamers and W/H in its gate before it becomes the shared base.

So the flat cap is overgrowth only in the sense that F0 is a dome at real sizes. A height fix that keeps the crown's carbon economy is still needed to show that; this patch is not it.

## Stand (closed hornbeam stand, seeds 1–5, middle row; medians)
| cond | alive 70/100 (of 20) | limb crown ratio 70/100 | floor 70/100 | LAI 70/100 | H 100 |
|---|---|---|---|---|---|
| F0 | 20/13 | 0.47/0.43 | 0.015/0.019 | 10.3/8.2 | 129 |
| F3 | 20/20 | 0.28/0.29 | 0.024/0.029 | 10.9/9.1 | 138 |
| SPR3 | 20/20 | 0.29/0.30 | 0.021/0.038 | 11.3/9.2 | 139 |

F3's cost is shallower crowns in the stand: limb crown ratio 0.47 → 0.28.
- On T's like-for-like measure (stand at 70), cbH is F0 0.49, F3 0.65, against real 0.23, so F3 moves away from real.
- Its gains are survival (13 → 20 of 20) and a lighter floor.

## Garden world (B0's harness, F3 patch on hornbeam, seeds 1–5, against baseline.json's seeds 1–5)
- **The four checks:** floor100 1 against 1, hd300 1 against 0, crown 2 against 2, plateau 2 against 3. Planted alive at 150/300: 8/5 against 8/5.
- **Metamers at 200:** 0.98×.
- **Composition at 300 shifts:** mean live trees per seed, F3 against base:
  - hornbeam 163 against 184 (share 0.71 against 0.80 of 229);
  - rowan 44 against 16;
  - beech 3.0 against 7.8;
  - maple 8.6 against 14.4.
- **Read this as a change of composition, not a gate pass:** 5 seeds cannot carry the "base − 2" rule.
  - Hornbeam's share falls slightly.
  - Rowan gains about 2.8×.
  - Beech and maple lose ground.

## Sheets
- `a/sheet.png`: lone hornbeam at 100, seeds 1–4; rows F0, F3, SPR3. F0 is the flat cap on an inverted cone. F3 and SPR3 have a rounded top on a narrow, tiered column, at 35 m, a size no real lone hornbeam reaches.
- `a/sheet-Y.png`: F0, F0 + Y, F3 + Y at 100.

## Check
`npm run check:stamp` on b783d73 came back green (stamp c1b91c9a) on the second run, so the goldens are unchanged.
- The first run (load about 10) was red on three 30 s timeouts only: checkpoint-bytes "mixed wood", the checkpoint M21 restore, and structure I2. Its log is /tmp/treesim-check-2b7ca7a8/check.log.
- `a-crown` is pushed to origin with no new commit.

## Proposed ADR (draft)
1. **Context.** The lone flat cap is a size effect: F0 is a real-like dome to about 20 m, and its D crosses the real Q1 at about 21–22 m, as k falls below about 0.8.
2. **Proposed, for the overseer's gates:** `r2.dLambdaTrunk` for hornbeam, so λ's ontogenetic fall acts on pa-0 wood only.
   - It **fails the registered rule at season 100** (≤ 2/5).
   - It **passes at matched height**: 5/5 at 20 and 25 m. D stays 0.31–0.50 and the ratio about 0.5 through 30 m, with 0.86× metamers.
3. **Costs.** The stand's limb crown ratio falls from 0.47 to 0.28. The garden's composition shifts (rowan up, beech and maple down). At 35 m the crown reads as a tiered column.
4. **Mechanism.** Twig-level (order-2) apical control, not the limbs': a candidate rule is "dΛ by level", with only levels 0–1 falling.
5. **Rejected:** arching by geometry alone (curve, aged set point, fork package), sky exponent 0, raised limb λ, and Y's L_h 10 height patch, which starves the crown.
