# R: regularity search on hornbeam (agent R, 2026-11-06)

Branch `r-regularity` (on A9's 5f7ae79). New rule: `c1.betaSD` (purpose 17), see the report.

## Method
- Hornbeam, seeds 101–108. The stand runs to season 70 and scores the four measured trees a seed (32 in all). The lone tree is dumped at seasons 20, 25, 30 and 35; each setting is scored at the season whose median coarsened height is nearest 16 m.
- Coarsening and descriptors follow A9's convert step: inflated, pruned at d_min 8.62 mm. Descriptors are A11's `reg.py`. Pipeline: `run.py`, `desc.py`, `score.py` and `table.py` in this folder.
- **Checking the pipeline:** R0 reproduces A11's R0 row exactly.
  - lone 0.28 / 2.32 / 6.19 / 10.58 / 0.08 / 0.61;
  - stand 0.20 / 2.20 / 11.47 / 16.87 / −0.02 / 0.22.
- **The loss:** z = (sim median − real median) / real SD. Loss = Σ|z| over the usable descriptors, lone plus stand.
  - Real lone: TreeML Carpinus, 12–22 m, DBH ≥ 10 cm (n 23).
  - Real stand: BioDiv hornbeam, after A14 (see the next section). The pilot's first scoring used A11's BioDiv beech row; every table here is rescored on A14's targets.
- **Constraints, a hard filter (F = feasible):**
  - stand survival at 70 ≥ 28 of 32;
  - lone metamers at 16 m (interpolated between the bracketing seasons) ≤ 1.25× R0's. The ratio at season 25 is shown too.
- ✓ = the median falls inside the real 10–90% band.

## Targets after A14 (a14/noise.md, used for every table below)
- **The loss** is Σ|z| over spacingCV, attachPerM, insertSD and elevSD, lone plus stand.
  - curvPersist is dropped (noise-dominated).
  - earlyFork is a check only: it is shown, but it is not in the loss and not in the in-band count.
- **The real stand** is BioDiv hornbeam: the median over 5 repeats a tree, DBH ≥ 10 cm, all heights, n 38 (`targets14.py`, `targets_a14.json`). Its SD is the SD of the per-tree medians.
- **G-reg's bands** are the real 10–90% widened by A14's noise: spacingCV ±0.05, insertSD ±6°, elevSD ±5°, earlyFork ±0.09, attachPerM 0.
  - lone: spacingCV [0.35, 0.55], attachPerM [1.09, 1.63], insertSD [17.7, 46.2], elevSD [19.4, 45.2];
  - stand: spacingCV [0.30, 0.54], attachPerM [1.06, 2.14], insertSD [14.2, 41.9], elevSD [15.6, 41.0].
- R0's loss on these targets is 23.1. G-reg needs ≤ 11.55.

## Pilot (2 seeds, 101–102, so survival is out of 8; on A14's targets; not ranked)
- The loss and the drop are against R0 on seeds 101–108 (23.1).
- Metamers are at 16 m, as a multiple of R0's.

| setting | loss | drop | survival | metamers ×R0 | lone spacingCV | lone attachPerM | lone insertSD | lone elevSD | stand insertSD | stand elevSD |
|---|---|---|---|---|---|---|---|---|---|---|
| R0 (8 seeds) | 23.1 | 0% | 31/32 | 1.00 | 0.28 | 2.32 | 6.2 | 10.6 | 11.5 | 16.9 |
| axisSD 30 | 20.5 | 11% | 8/8 | 1.01 | 0.30 | 2.34 | 13.6 | 13.4 | 14.5 | 16.5 |
| axisSD 40 | 19.9 | 14% | 8/8 | 1.03 | 0.30 | 2.38 | 15.1 | 16.4 | 11.4 | 19.9 |
| **betaSD 40** | 16.3 | 30% | 8/8 | 1.04 | 0.33 | 2.33 | **22.8** | 12.3 | 25.3 | 17.0 |
| axisSD 30, betaSD 40 | 17.7 | 23% | 8/8 | 0.97 | 0.30 | 2.34 | 19.4 | 17.2 | 21.5 | 21.9 |
| shootLengthSD 0.3 | 15.7 | 32% | 5/8 | 0.93 | 0.37 | 1.86 | 9.4 | 13.4 | 15.4 | 17.0 |
| s 0.3, axis 30, β 20 | 13.2 | 43% | 8/8 | 1.29 | 0.35 | 1.95 | 14.9 | 21.6 | 18.0 | 19.0 |

betaSD is the strong lever on insertSD, and axisSD the one on elevSD. A grid at 0–20° could not reach the bands, so the grid's angle levels were raised.

## The grid (pruned; 25 settings × 8 seeds)
- **Pruned levels:**
  - shootLengthSD {0.2, 0.35}, with one probe at 0.5. The 0.5 and 0.7 levels were dropped because A9's 0.4 alone already kept only 20 of 32 trees alive at 70;
  - axisSD {0, 20, 40};
  - betaSD {20, 40, 60};
  - budBreak off, plus width 0.5 at axisSD 20 × every β × both s.
- **Refinements:** 15 local settings around the grid's best (`ref1.json`, `ref2.json`).
  - shootLengthSD raised from 0.35 to 0.55, with budBreak width 0.5–2 to offset its cost to survival and metamers;
  - axisSD 40–50 and betaSD 50–70.
- **Hold-out:** the four best G-reg passers, plus R0, re-run on seeds 109–116 (marked `-H` and scored against R0-H).

## Findings
- **Each descriptor has one main lever:**
  - shootLengthSD moves spacingCV and attachPerM;
  - betaSD moves insertSD;
  - axisSD moves elevSD.
- **budBreak alone does little, but at width 1–2 it cancels shootLengthSD's cost.**
  - With it: metamers fall back to about 1× R0's, and survival returns to 28–32 of 32.
  - Without it: s ≥ 0.35 loses stand trees (20–27 of 32).
- **The binding descriptor is lone attachPerM** (band ≤ 1.63). It needs s ≈ 0.5, which is feasible only with a budBreak width of at least 1.
- **Survival is coarse with only 4 measured trees a seed** (binomial SD ≈ 1.5 trees of 32), and 28 is the line. axisSD 50 passed on seeds 101–108 (31 alive) but failed on 109–116 (26).
- **Two descriptors are fixed by no setting** (neither is in the loss):
  - curvPersist stays positive: about +0.2 lone against −0.15 real (noise-dominated per A14), and it moves away from real as s rises;
  - lone earlyFork sits at 0.46–0.59 (band ≤ 0.58).

## The best two
Picked by the overseer's rule (02:15): the lowest loss, preferring the less extreme setting when it is within +1 loss of the best. The patches are hornbeam species assigns, in dotted keys as `withAssign` takes them. Each figure below is given as seeds 101–108 / hold-out 109–116.

**The lowest loss** is `s0.5-a50-b60-w1` (the overseer's G-forest candidate).
- loss 4.2 / 5.5; G-reg passes on both seed sets;
- the closed-trial survival is 31/32 / **26/32**, failing the 28 line on the hold-out (the garden showed no such loss, per the overseer).

1. **`{"c1.shootLengthSD":0.5,"c4.axisSD":40,"c1.betaSD":50,"c1.budBreak":{"mode":"stochastic","width":1}}`** (the least extreme within +1)
   - loss 5.1 / 4.8 (−78% / −79% against R0);
   - G-reg passes on both seed sets, 4 of 4 usable descriptors in band lone and stand;
   - survival 32/32 / 30/32;
   - lone metamers at 16 m 0.88× / 0.98×;
   - height-matched at season 25 on both seed sets.
2. **`{"c1.shootLengthSD":0.5,"c4.axisSD":40,"c1.betaSD":60,"c1.budBreak":{"mode":"stochastic","width":1}}`**
   - loss 4.5 / 5.0 (−80% / −78%);
   - G-reg passes on both seed sets;
   - survival 28/32 / 28/32, on the line;
   - metamers 1.15× / 0.98×;
   - matched at season 30 on 101–108 (which flatters elevSD) and at 25 on the hold-out.

**Also passing:** `…betaSD 60, width 1.5` (loss 5.5 / 5.8, survival 29 / 29, metamers 0.96× / 0.90×).

**The thinnest margin is lone attachPerM:** 1.56–1.61 against a band top of 1.63, and A14 gives it no noise widening.

## For integration
- **budBreak at width 1–1.5 refuses a large share of lateral breaks.** Stand survival at 70 is the only stand-dynamics check this search applied. The overseer's G-forest run covered a50-b60-w1; settings 1 and 2 have not been run through G-forest.
- **docs/architecture.md's RNG table lacks purposes 15–17** (the reviewer's note).
- **curvPersist moves away from real** as s rises (+0.25 against −0.15). It is noise-dominated per A14, but it is the one descriptor the rules push the wrong way.

## Proposed ADR (for the overseer to write; agent R does not edit docs/)
**ADR 00xx: per-axis branch angle (`c1.betaSD`), proposed.**
- **The context:** β is fixed per physiological-age level (§C1.6, `r2::branch_angle_of`). C4's direction noise is white, and R3's posture restores every axis to its level's set point. So limbs leave the trunk at one angle: within-tree first-order insertion SD is 6° in today's lone hornbeam, against 31.5° in TreeML hornbeam and 26.9° in BioDiv hornbeam.
- **The decision:** an off-by-default rule. When a lateral bud breaks into a new axis, its frame is turned in its host's plane by s_β·N(0, 1) degrees.
  - [RNG: branchAngle, purpose 17, keyed by the axis's first birthId, i.e. `next_metamer_id` at break.]
  - The angle to the host is held in [0, 180°], and L is carried by parallel transport.
  - Relays and fork arms take the offset too.
  - It is within-tree variation, a complement to ADR 0053's between-tree draw, not its option (b).
- **The evidence:** betaSD 40 alone takes lone insertSD from 6° to 23°. With axisSD 40, shootLengthSD 0.5 and a stochastic budBreak of width 1, hornbeam's within-tree regularity sits inside G-reg's bands on all four usable descriptors, lone and stand, on two seed sets. The summed |z| is 79% below R0's.
- **The cost:** off-by-default, so goldens are unchanged; one extra draw per new axis.
- **The alternatives considered:**
  - extending axisSD's draw: axisSD moves elevation but barely insertion, because R3 restores the set point, not β;
  - feeding β into the set point.
- **Open:** whether §C1.6's "β per order" should read "β per order, with per-axis variation" in the spec.


## Every setting (8 seeds each)
z is in brackets. ✓ = inside the widened band. The in-band counts are over the 4 usable descriptors.

usable: spacingCV, attachPerM, insertSD, elevSD

| setting | assign | seeds | loss | drop vs R0 | survival | metamers@16m ×R0 | @25 ×R0 | lone season, H | lone spacingCV | lone attachPerM | lone insertSD | lone elevSD | lone curvPersist | lone earlyFork | stand spacingCV | stand attachPerM | stand insertSD | stand elevSD | stand curvPersist | stand earlyFork | in band lone/stand |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| s0.5-a50-b60-w1 | `{"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}` | 8 | 4.2 | +82% | 31/32 | 1.15 | 1.04 | 30, 16.7 | 0.46 (-0.2)✓ | 1.57 (+0.9)✓ | 28.16 (-0.5)✓ | 23.75 (-1.0)✓ | 0.23 (+5.9) | 0.59 (+2.2) | 0.42 (+0.2)✓ | 1.52 (-0.6)✓ | 28.39 (+0.2)✓ | 22.06 (-0.5)✓ | 0.14 (+4.3) | 0.28 (-0.1)✓ | 4/4 |
| s0.5-a40-b60-w1 | `{"c1.shootLengthSD": 0.5, "c4.axisSD": 40.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}` | 8 | 4.5 | +80% | 28/32 | 1.15 | 1.03 | 30, 16.7 | 0.46 (-0.1)✓ | 1.55 (+0.8)✓ | 28.41 (-0.5)✓ | 22.41 (-1.2)✓ | 0.26 (+6.5) | 0.51 (+1.4)✓ | 0.44 (+0.6)✓ | 1.49 (-0.7)✓ | 29.42 (+0.3)✓ | 23.52 (-0.3)✓ | 0.18 (+4.9) | 0.24 (-0.5)✓ | 4/4 |
| s0.5-a40-b50-w1-H | `{"c1.shootLengthSD": 0.5, "c4.axisSD": 40.0, "c1.betaSD": 50.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}` | 8 | 4.8 | +79% | 30/32 | 0.98 | 1.06 | 25, 16.4 | 0.45 (-0.6)✓ | 1.56 (+0.9)✓ | 28.01 (-0.5)✓ | 22.07 (-1.3)✓ | 0.28 (+6.7) | 0.52 (+1.5)✓ | 0.41 (+0.2)✓ | 1.42 (-0.8)✓ | 26.01 (-0.1)✓ | 22.87 (-0.4)✓ | 0.13 (+4.1) | 0.27 (-0.2)✓ | 4/4 |
| s0.5-a40-b60-w1-H | `{"c1.shootLengthSD": 0.5, "c4.axisSD": 40.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}` | 8 | 5.0 | +78% | 28/32 | 0.98 | 1.08 | 25, 16.5 | 0.45 (-0.6)✓ | 1.59 (+1.0)✓ | 26.87 (-0.7)✓ | 23.28 (-1.1)✓ | 0.25 (+6.2) | 0.50 (+1.3)✓ | 0.42 (+0.2)✓ | 1.44 (-0.8)✓ | 25.72 (-0.2)✓ | 21.94 (-0.6)✓ | 0.18 (+4.9) | 0.29 (-0.1)✓ | 4/4 |
| s0.5-a40-b50-w1 | `{"c1.shootLengthSD": 0.5, "c4.axisSD": 40.0, "c1.betaSD": 50.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}` | 8 | 5.1 | +78% | 32/32 | 0.88 | 0.99 | 25, 16.5 | 0.44 (-0.7)✓ | 1.61 (+1.1)✓ | 28.63 (-0.4)✓ | 21.46 (-1.4)✓ | 0.23 (+6.0) | 0.46 (+0.9)✓ | 0.41 (+0.1)✓ | 1.57 (-0.5)✓ | 27.63 (+0.1)✓ | 19.36 (-0.9)✓ | 0.15 (+4.5) | 0.33 (+0.3)✓ | 4/4 |
| s0.45-a40-b60-w1 | `{"c1.shootLengthSD": 0.45, "c4.axisSD": 40.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}` | 8 | 5.2 | +77% | 29/32 | 1.02 | 0.99 | 25, 15.5 | 0.43 (-1.1)✓ | 1.67 (+1.3) | 32.64 (+0.2)✓ | 22.49 (-1.2)✓ | 0.25 (+6.3) | 0.58 (+2.1) | 0.40 (-0.0)✓ | 1.51 (-0.6)✓ | 27.01 (+0.0)✓ | 20.27 (-0.8)✓ | 0.16 (+4.6) | 0.29 (-0.0)✓ | 3/4 |
| s0.5-a40-b60-w1.5 | `{"c1.shootLengthSD": 0.5, "c4.axisSD": 40.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.5}}` | 8 | 5.5 | +76% | 29/32 | 0.96 | 0.99 | 25, 15.9 | 0.42 (-1.3)✓ | 1.61 (+1.1)✓ | 30.49 (-0.2)✓ | 24.04 (-1.0)✓ | 0.26 (+6.5) | 0.51 (+1.4)✓ | 0.43 (+0.5)✓ | 1.45 (-0.8)✓ | 26.48 (-0.1)✓ | 21.44 (-0.6)✓ | 0.14 (+4.3) | 0.33 (+0.3)✓ | 4/4 |
| s0.55-a40-b60-w1.5 | `{"c1.shootLengthSD": 0.55, "c4.axisSD": 40.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.5}}` | 8 | 5.7 | +76% | 30/32 | 1.00 | 1.02 | 25, 15.8 | 0.45 (-0.6)✓ | 1.47 (+0.5)✓ | 33.26 (+0.3)✓ | 24.55 (-0.9)✓ | 0.30 (+7.1) | 0.52 (+1.5)✓ | 0.50 (+1.7)✓ | 1.45 (-0.7)✓ | 28.80 (+0.2)✓ | 20.84 (-0.7)✓ | 0.18 (+4.9) | 0.29 (-0.1)✓ | 4/4 |
| s0.45-a40-b60-w2 | `{"c1.shootLengthSD": 0.45, "c4.axisSD": 40.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 2.0}}` | 8 | 5.7 | +75% | 28/32 | 0.85 | 0.90 | 25, 16.0 | 0.42 (-1.3)✓ | 1.67 (+1.3) | 31.00 (-0.1)✓ | 21.15 (-1.4)✓ | 0.24 (+6.1) | 0.52 (+1.5)✓ | 0.41 (+0.2)✓ | 1.58 (-0.5)✓ | 27.73 (+0.1)✓ | 20.05 (-0.8)✓ | 0.16 (+4.6) | 0.36 (+0.5)✓ | 3/4 |
| s0.5-a40-b60-w1.5-H | `{"c1.shootLengthSD": 0.5, "c4.axisSD": 40.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.5}}` | 8 | 5.8 | +75% | 29/32 | 0.90 | 0.98 | 25, 16.4 | 0.43 (-0.9)✓ | 1.60 (+1.0)✓ | 29.53 (-0.3)✓ | 22.09 (-1.3)✓ | 0.24 (+6.1) | 0.49 (+1.2)✓ | 0.44 (+0.6)✓ | 1.49 (-0.6)✓ | 29.48 (+0.3)✓ | 21.05 (-0.7)✓ | 0.14 (+4.2) | 0.37 (+0.6)✓ | 4/4 |
| s0.45-a50-b70-w1.5 | `{"c1.shootLengthSD": 0.45, "c4.axisSD": 50.0, "c1.betaSD": 70.0, "c1.budBreak": {"mode": "stochastic", "width": 1.5}}` | 8 | 5.9 | +75% | 31/32 | 0.97 | 0.92 | 25, 15.4 | 0.40 (-1.6)✓ | 1.66 (+1.3) | 31.94 (+0.1)✓ | 23.87 (-1.0)✓ | 0.24 (+6.1) | 0.50 (+1.3)✓ | 0.41 (+0.2)✓ | 1.54 (-0.5)✓ | 31.67 (+0.6)✓ | 22.34 (-0.5)✓ | 0.14 (+4.2) | 0.30 (+0.0)✓ | 3/4 |
| s0.4-a40-b60-w1 | `{"c1.shootLengthSD": 0.4, "c4.axisSD": 40.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}` | 8 | 6.3 | +73% | 29/32 | 1.02 | 0.98 | 25, 15.3 | 0.36 (-2.7)✓ | 1.75 (+1.7) | 30.23 (-0.2)✓ | 23.00 (-1.1)✓ | 0.22 (+5.8) | 0.55 (+1.8)✓ | 0.40 (+0.0)✓ | 1.72 (-0.2)✓ | 27.60 (+0.1)✓ | 23.59 (-0.3)✓ | 0.15 (+4.4) | 0.30 (-0.0)✓ | 3/4 |
| s0.5-a40-b60-w2 | `{"c1.shootLengthSD": 0.5, "c4.axisSD": 40.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 2.0}}` | 8 | 6.3 | +73% | 31/32 | 0.85 | 0.94 | 25, 16.4 | 0.42 (-1.2)✓ | 1.60 (+1.0)✓ | 28.09 (-0.5)✓ | 23.97 (-1.0)✓ | 0.27 (+6.6) | 0.52 (+1.5)✓ | 0.45 (+0.8)✓ | 1.47 (-0.7)✓ | 29.57 (+0.3)✓ | 20.67 (-0.7)✓ | 0.16 (+4.6) | 0.33 (+0.3)✓ | 4/4 |
| s0.4-a40-b60-w0.5 | `{"c1.shootLengthSD": 0.4, "c4.axisSD": 40.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 0.5}}` | 8 | 6.5 | +72% | 28/32 | 1.08 | 1.05 | 25, 15.4 | 0.38 (-2.2)✓ | 1.74 (+1.6) | 28.82 (-0.4)✓ | 22.72 (-1.2)✓ | 0.23 (+6.0) | 0.48 (+1.1)✓ | 0.38 (-0.3)✓ | 1.74 (-0.1)✓ | 27.84 (+0.1)✓ | 22.01 (-0.5)✓ | 0.13 (+4.1) | 0.33 (+0.2)✓ | 3/4 |
| s0.35-a40-b60-w1 | `{"c1.shootLengthSD": 0.35, "c4.axisSD": 40.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}` | 8 | 7.6 | +67% | 30/32 | 0.98 | 0.97 | 25, 15.6 | 0.36 (-2.7)✓ | 1.79 (+1.8) | 31.33 (-0.0)✓ | 21.18 (-1.4)✓ | 0.20 (+5.5) | 0.53 (+1.6)✓ | 0.36 (-0.7)✓ | 1.76 (-0.1)✓ | 27.73 (+0.1)✓ | 19.66 (-0.8)✓ | 0.13 (+4.0) | 0.26 (-0.3)✓ | 3/4 |
| s0.35-a40-b60-w2 | `{"c1.shootLengthSD": 0.35, "c4.axisSD": 40.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 2.0}}` | 8 | 8.4 | +64% | 30/32 | 0.78 | 0.84 | 25, 16.2 | 0.35 (-3.1) | 1.84 (+2.0) | 29.12 (-0.4)✓ | 20.74 (-1.5)✓ | 0.22 (+5.8) | 0.60 (+2.3) | 0.38 (-0.3)✓ | 1.70 (-0.2)✓ | 28.65 (+0.2)✓ | 20.44 (-0.7)✓ | 0.14 (+4.2) | 0.33 (+0.3)✓ | 2/4 |
| s0.35-a40-b60 | `{"c1.shootLengthSD": 0.35, "c4.axisSD": 40, "c1.betaSD": 60}` | 8 | 8.5 | +63% | 28/32 | 1.07 | 1.09 | 25, 15.7 | 0.37 (-2.5)✓ | 1.84 (+2.0) | 30.37 (-0.2)✓ | 20.07 (-1.5)✓ | 0.18 (+5.2) | 0.51 (+1.4)✓ | 0.33 (-1.2)✓ | 1.82 (+0.0)✓ | 27.95 (+0.1)✓ | 20.02 (-0.8)✓ | 0.08 (+3.1) | 0.25 (-0.4)✓ | 3/4 |
| s0.35-a40-b60-w0.5 | `{"c1.shootLengthSD": 0.35, "c4.axisSD": 40.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 0.5}}` | 8 | 8.6 | +63% | 28/32 | 1.01 | 1.01 | 25, 15.6 | 0.38 (-2.4)✓ | 1.85 (+2.1) | 30.63 (-0.1)✓ | 20.31 (-1.5)✓ | 0.19 (+5.3) | 0.56 (+1.8)✓ | 0.33 (-1.3)✓ | 1.80 (+0.0)✓ | 28.71 (+0.2)✓ | 18.92 (-0.9)✓ | 0.11 (+3.6) | 0.30 (+0.0)✓ | 3/4 |
| s0.35-a40-b40 | `{"c1.shootLengthSD": 0.35, "c4.axisSD": 40, "c1.betaSD": 40}` | 8 | 8.8 | +62% | 28/32 | 1.16 | 1.14 | 25, 15.5 | 0.39 (-2.0)✓ | 1.82 (+1.9) | 23.05 (-1.3)✓ | 22.65 (-1.2)✓ | 0.15 (+4.7) | 0.54 (+1.6)✓ | 0.32 (-1.4)✓ | 1.80 (+0.0)✓ | 24.73 (-0.3)✓ | 21.00 (-0.7)✓ | 0.07 (+2.9) | 0.32 (+0.1)✓ | 3/4 |
| s0.35-a20-b60-w0.5 | `{"c1.shootLengthSD": 0.35, "c4.axisSD": 20, "c1.betaSD": 60, "c1.budBreak": {"mode": "stochastic", "width": 0.5}}` | 8 | 8.9 | +61% | 30/32 | 1.00 | 0.99 | 25, 15.7 | 0.38 (-2.2)✓ | 1.83 (+2.0) | 28.48 (-0.5)✓ | 17.25 (-1.9) | 0.21 (+5.6) | 0.58 (+2.1)✓ | 0.34 (-1.1)✓ | 1.77 (-0.0)✓ | 23.60 (-0.4)✓ | 20.41 (-0.8)✓ | 0.11 (+3.7) | 0.32 (+0.2)✓ | 2/4 |
| s0.35-a0-b60 | `{"c1.shootLengthSD": 0.35, "c1.betaSD": 60}` | 8 | 10.1 | +56% | 28/32 | 0.95 | 1.12 | 25, 17.2 | 0.36 (-2.8)✓ | 1.84 (+2.0) | 29.49 (-0.3)✓ | 15.68 (-2.1) | 0.19 (+5.3) | 0.61 (+2.4) | 0.33 (-1.3)✓ | 1.88 (+0.2)✓ | 30.08 (+0.4)✓ | 19.43 (-0.9)✓ | 0.08 (+3.1) | 0.33 (+0.3)✓ | 2/4 |
| s0.2-a40-b60 | `{"c1.shootLengthSD": 0.2, "c4.axisSD": 40, "c1.betaSD": 60}` | 8 | 12.2 | +47% | 29/32 | 0.99 | 1.00 | 25, 15.8 | 0.31 (-4.0) | 2.02 (+2.8) | 29.39 (-0.3)✓ | 18.63 (-1.7) | 0.11 (+4.1) | 0.58 (+2.0)✓ | 0.29 (-2.0) | 2.01 (+0.5)✓ | 24.87 (-0.3)✓ | 21.29 (-0.6)✓ | 0.06 (+2.8) | 0.29 (-0.1)✓ | 1/3 |
| s0.2-a20-b60-w0.5 | `{"c1.shootLengthSD": 0.2, "c4.axisSD": 20, "c1.betaSD": 60, "c1.budBreak": {"mode": "stochastic", "width": 0.5}}` | 8 | 12.4 | +46% | 32/32 | 0.94 | 0.95 | 25, 15.8 | 0.32 (-3.7) | 2.11 (+3.1) | 31.28 (-0.0)✓ | 18.07 (-1.8) | 0.17 (+5.0) | 0.61 (+2.4) | 0.29 (-1.9) | 2.04 (+0.5)✓ | 25.03 (-0.3)✓ | 18.27 (-1.0)✓ | 0.10 (+3.5) | 0.33 (+0.3)✓ | 1/3 |
| s0.2-a20-b60 | `{"c1.shootLengthSD": 0.2, "c4.axisSD": 20, "c1.betaSD": 60}` | 8 | 13.1 | +43% | 31/32 | 1.06 | 1.05 | 25, 15.6 | 0.32 (-3.9) | 2.07 (+3.0) | 27.76 (-0.6)✓ | 17.69 (-1.9) | 0.17 (+5.0) | 0.55 (+1.7)✓ | 0.27 (-2.2) | 2.05 (+0.6)✓ | 24.89 (-0.3)✓ | 20.52 (-0.7)✓ | 0.04 (+2.3)✓ | 0.33 (+0.3)✓ | 1/3 |
| s0.2-a40-b40 | `{"c1.shootLengthSD": 0.2, "c4.axisSD": 40, "c1.betaSD": 40}` | 8 | 13.6 | +41% | 32/32 | 1.07 | 1.06 | 25, 15.7 | 0.31 (-4.1) | 2.06 (+2.9) | 25.86 (-0.9)✓ | 20.07 (-1.5)✓ | 0.12 (+4.3) | 0.56 (+1.8)✓ | 0.28 (-2.2) | 2.05 (+0.6)✓ | 22.12 (-0.6)✓ | 20.63 (-0.7)✓ | 0.02 (+2.0)✓ | 0.22 (-0.6)✓ | 2/3 |
| s0.2-a20-b40-w0.5 | `{"c1.shootLengthSD": 0.2, "c4.axisSD": 20, "c1.betaSD": 40, "c1.budBreak": {"mode": "stochastic", "width": 0.5}}` | 8 | 14.1 | +39% | 31/32 | 1.01 | 0.96 | 25, 15.4 | 0.31 (-4.0) | 2.01 (+2.7) | 23.14 (-1.3)✓ | 16.91 (-2.0) | 0.19 (+5.4) | 0.60 (+2.3) | 0.29 (-2.0) | 2.03 (+0.5)✓ | 22.30 (-0.6)✓ | 18.04 (-1.1)✓ | 0.09 (+3.3) | 0.26 (-0.3)✓ | 1/3 |
| s0.2-a0-b60 | `{"c1.shootLengthSD": 0.2, "c1.betaSD": 60}` | 8 | 14.7 | +36% | 29/32 | 1.01 | 1.06 | 25, 16.0 | 0.31 (-4.2) | 2.07 (+3.0) | 28.01 (-0.5)✓ | 12.94 (-2.5) | 0.16 (+4.8) | 0.57 (+2.0)✓ | 0.26 (-2.4) | 2.09 (+0.7)✓ | 29.71 (+0.4)✓ | 17.85 (-1.1)✓ | 0.06 (+2.6) | 0.32 (+0.2)✓ | 1/3 |
| s0.2-a20-b40 | `{"c1.shootLengthSD": 0.2, "c4.axisSD": 20, "c1.betaSD": 40}` | 8 | 15.3 | +34% | 29/32 | 1.14 | 1.09 | 25, 15.3 | 0.31 (-4.1) | 2.07 (+3.0) | 20.71 (-1.6)✓ | 17.14 (-1.9) | 0.18 (+5.1) | 0.62 (+2.5) | 0.26 (-2.5) | 2.05 (+0.5)✓ | 22.37 (-0.6)✓ | 18.46 (-1.0)✓ | 0.02 (+1.9)✓ | 0.24 (-0.4)✓ | 1/3 |
| s0.2-a0-b40 | `{"c1.shootLengthSD": 0.2, "c1.betaSD": 40}` | 8 | 16.0 | +31% | 28/32 | 1.04 | 1.08 | 25, 15.9 | 0.32 (-3.8) | 2.05 (+2.9) | 19.62 (-1.8)✓ | 13.03 (-2.5) | 0.14 (+4.5) | 0.61 (+2.3) | 0.25 (-2.7) | 2.10 (+0.7)✓ | 22.81 (-0.5)✓ | 17.12 (-1.2)✓ | 0.08 (+3.1) | 0.24 (-0.5)✓ | 1/3 |
| s0.2-a20-b20-w0.5 | `{"c1.shootLengthSD": 0.2, "c4.axisSD": 20, "c1.betaSD": 20, "c1.budBreak": {"mode": "stochastic", "width": 0.5}}` | 8 | 17.2 | +26% | 30/32 | 1.07 | 1.01 | 25, 15.3 | 0.30 (-4.2) | 2.13 (+3.2) | 14.88 (-2.5) | 16.66 (-2.0) | 0.13 (+4.3) | 0.62 (+2.5) | 0.28 (-2.1) | 2.06 (+0.6)✓ | 16.35 (-1.4)✓ | 17.34 (-1.1)✓ | 0.08 (+3.1) | 0.32 (+0.2)✓ | 0/3 |
| R0 | `{}` | 8 | 23.1 | +0% | 31/32 | 1.00 | 1.00 | 25, 15.7 | 0.28 (-4.8) | 2.32 (+4.0) | 6.19 (-3.8) | 10.58 (-2.8) | 0.08 (+3.6) | 0.61 (+2.3) | 0.20 (-3.5) | 2.20 (+0.9) | 11.47 (-2.1) | 16.87 (-1.2)✓ | -0.02 (+1.3)✓ | 0.22 (-0.6)✓ | 0/1 |
| R0-H | `{}` | 8 | 23.3 | +0% | 32/32 | 1.00 | 1.00 | 25, 15.8 | 0.28 (-4.9) | 2.33 (+4.1) | 5.25 (-3.9) | 10.62 (-2.8) | 0.05 (+3.2) | 0.61 (+2.3) | 0.21 (-3.4) | 2.18 (+0.8) | 10.77 (-2.1) | 16.78 (-1.2)✓ | -0.04 (+0.8)✓ | 0.22 (-0.6)✓ | 0/1 |
| s0.5-a50-b60-w1-H | `{"c1.shootLengthSD": 0.5, "c4.axisSD": 50.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 1.0}}` | 8 | 5.5 | +76% | 26/32 | 1.00 | 1.02 | 25, 15.9 | 0.43 (-0.9)✓ | 1.61 (+1.1)✓ | 30.04 (-0.2)✓ | 26.04 (-0.7)✓ | 0.24 (+6.1) | 0.55 (+1.8)✓ | 0.44 (+0.6)✓ | 1.52 (-0.6)✓ | 31.51 (+0.6)✓ | 19.99 (-0.8)✓ | 0.17 (+4.8) | 0.30 (+0.1)✓ | 4/4 |
| s0.45-a40-b60-w0.5 | `{"c1.shootLengthSD": 0.45, "c4.axisSD": 40.0, "c1.betaSD": 60.0, "c1.budBreak": {"mode": "stochastic", "width": 0.5}}` | 8 | 6.1 | +74% | 26/32 | 0.96 | 1.00 | 25, 16.0 | 0.41 (-1.5)✓ | 1.67 (+1.3) | 34.02 (+0.4)✓ | 22.17 (-1.3)✓ | 0.19 (+5.4) | 0.50 (+1.3)✓ | 0.38 (-0.3)✓ | 1.62 (-0.4)✓ | 24.46 (-0.3)✓ | 21.51 (-0.6)✓ | 0.13 (+4.0) | 0.25 (-0.4)✓ | 3/4 |
| s0.5-a20-b40 | `{"c1.shootLengthSD": 0.5, "c4.axisSD": 20, "c1.betaSD": 40}` | 8 | 6.5 | +72% | 21/32 | 1.35 | 1.33 | 25, 15.5 | 0.44 (-0.8)✓ | 1.56 (+0.8)✓ | 22.17 (-1.4)✓ | 19.80 (-1.6)✓ | 0.24 (+6.0) | 0.55 (+1.8)✓ | 0.42 (+0.3)✓ | 1.54 (-0.6)✓ | 24.59 (-0.3)✓ | 19.96 (-0.8)✓ | 0.09 (+3.3) | 0.30 (+0.1)✓ | 4/4 |
| s0.35-a20-b60 | `{"c1.shootLengthSD": 0.35, "c4.axisSD": 20, "c1.betaSD": 60}` | 8 | 9.7 | +58% | 27/32 | 1.19 | 1.17 | 25, 15.6 | 0.38 (-2.3)✓ | 1.86 (+2.1) | 28.63 (-0.4)✓ | 17.40 (-1.9) | 0.18 (+5.1) | 0.56 (+1.8)✓ | 0.32 (-1.4)✓ | 1.87 (+0.2)✓ | 28.97 (+0.3)✓ | 17.87 (-1.1)✓ | 0.08 (+3.2) | 0.29 (-0.0)✓ | 2/4 |
| s0.35-a40-b20 | `{"c1.shootLengthSD": 0.35, "c4.axisSD": 40, "c1.betaSD": 20}` | 8 | 10.3 | +55% | 27/32 | 1.11 | 1.18 | 25, 16.1 | 0.38 (-2.3)✓ | 1.82 (+1.9) | 19.45 (-1.8)✓ | 20.63 (-1.5)✓ | 0.18 (+5.2) | 0.50 (+1.3)✓ | 0.34 (-1.0)✓ | 1.83 (+0.1)✓ | 19.31 (-1.0)✓ | 21.12 (-0.7)✓ | 0.05 (+2.5) | 0.29 (-0.1)✓ | 3/4 |
| s0.35-a0-b40 | `{"c1.shootLengthSD": 0.35, "c1.betaSD": 40}` | 8 | 11.0 | +52% | 25/32 | 1.28 | 1.23 | 25, 15.4 | 0.39 (-2.0)✓ | 1.84 (+2.0) | 25.69 (-0.9)✓ | 13.63 (-2.4) | 0.21 (+5.7) | 0.55 (+1.8)✓ | 0.31 (-1.6)✓ | 1.87 (+0.2)✓ | 22.57 (-0.6)✓ | 16.17 (-1.3)✓ | 0.09 (+3.3) | 0.25 (-0.4)✓ | 2/4 |
| s0.35-a20-b40-w0.5 | `{"c1.shootLengthSD": 0.35, "c4.axisSD": 20, "c1.betaSD": 40, "c1.budBreak": {"mode": "stochastic", "width": 0.5}}` | 8 | 11.1 | +52% | 27/32 | 0.90 | 1.03 | 25, 16.7 | 0.36 (-2.7)✓ | 1.84 (+2.0) | 20.86 (-1.6)✓ | 16.66 (-2.0) | 0.20 (+5.5) | 0.55 (+1.8)✓ | 0.34 (-1.1)✓ | 1.82 (+0.1)✓ | 23.45 (-0.5)✓ | 17.32 (-1.1)✓ | 0.12 (+3.9) | 0.30 (+0.0)✓ | 2/4 |
| s0.35-a20-b40 | `{"c1.shootLengthSD": 0.35, "c4.axisSD": 20, "c1.betaSD": 40}` | 8 | 11.1 | +52% | 22/32 | 1.26 | 1.22 | 25, 15.2 | 0.36 (-2.7)✓ | 1.84 (+2.0) | 21.37 (-1.5)✓ | 17.81 (-1.8) | 0.16 (+4.8) | 0.57 (+2.0)✓ | 0.32 (-1.5)✓ | 1.82 (+0.1)✓ | 25.07 (-0.2)✓ | 16.61 (-1.2)✓ | 0.09 (+3.2) | 0.31 (+0.1)✓ | 2/4 |
| s0.35-a20-b20 | `{"c1.shootLengthSD": 0.35, "c4.axisSD": 20, "c1.betaSD": 20}` | 8 | 13.1 | +43% | 24/32 | 1.29 | 1.22 | 25, 15.3 | 0.36 (-2.7)✓ | 1.86 (+2.1) | 15.30 (-2.4) | 16.40 (-2.0) | 0.15 (+4.8) | 0.57 (+2.0)✓ | 0.33 (-1.3)✓ | 1.84 (+0.1)✓ | 17.31 (-1.3)✓ | 17.37 (-1.1)✓ | 0.09 (+3.3) | 0.23 (-0.5)✓ | 1/4 |
| s0.35-a20-b20-w0.5 | `{"c1.shootLengthSD": 0.35, "c4.axisSD": 20, "c1.betaSD": 20, "c1.budBreak": {"mode": "stochastic", "width": 0.5}}` | 8 | 13.3 | +42% | 20/32 | 1.00 | 1.04 | 25, 16.0 | 0.35 (-3.0)✓ | 1.86 (+2.1) | 14.52 (-2.6) | 16.78 (-2.0) | 0.19 (+5.4) | 0.57 (+1.9)✓ | 0.34 (-1.1)✓ | 1.83 (+0.1)✓ | 16.73 (-1.4)✓ | 17.52 (-1.1)✓ | 0.09 (+3.3) | 0.34 (+0.3)✓ | 1/4 |
| s0.35-a0-b20 | `{"c1.shootLengthSD": 0.35, "c1.betaSD": 20}` | 8 | 13.7 | +41% | 24/32 | 1.29 | 1.25 | 25, 15.4 | 0.38 (-2.3)✓ | 1.81 (+1.9) | 12.44 (-2.9) | 12.00 (-2.6) | 0.17 (+5.0) | 0.64 (+2.7) | 0.33 (-1.2)✓ | 1.90 (+0.2)✓ | 17.46 (-1.3)✓ | 16.62 (-1.2)✓ | 0.04 (+2.4)✓ | 0.25 (-0.4)✓ | 1/4 |
| s0.2-a40-b20 | `{"c1.shootLengthSD": 0.2, "c4.axisSD": 40, "c1.betaSD": 20}` | 8 | 15.7 | +32% | 26/32 | 1.12 | 1.11 | 25, 15.6 | 0.32 (-3.9) | 2.06 (+2.9) | 17.81 (-2.1)✓ | 18.63 (-1.7) | 0.06 (+3.4) | 0.55 (+1.8)✓ | 0.25 (-2.6) | 2.09 (+0.6)✓ | 18.03 (-1.2)✓ | 20.67 (-0.7)✓ | 0.02 (+1.9)✓ | 0.23 (-0.5)✓ | 1/3 |
| s0.2-a20-b20 | `{"c1.shootLengthSD": 0.2, "c4.axisSD": 20, "c1.betaSD": 20}` | 8 | 16.8 | +27% | 25/32 | 1.07 | 1.10 | 25, 15.9 | 0.32 (-3.8) | 2.03 (+2.8) | 15.23 (-2.4) | 16.22 (-2.1) | 0.11 (+4.0) | 0.61 (+2.3) | 0.26 (-2.4) | 2.08 (+0.6)✓ | 15.98 (-1.5)✓ | 17.25 (-1.2)✓ | 0.03 (+2.1)✓ | 0.21 (-0.7)✓ | 0/3 |
| s0.2-a0-b20 | `{"c1.shootLengthSD": 0.2, "c1.betaSD": 20}` | 8 | 18.6 | +19% | 22/32 | 1.13 | 1.09 | 25, 15.5 | 0.32 (-3.9) | 2.02 (+2.8) | 11.44 (-3.0) | 9.77 (-2.9) | 0.13 (+4.4) | 0.67 (+2.9) | 0.24 (-2.8) | 2.05 (+0.6)✓ | 17.02 (-1.3)✓ | 15.97 (-1.3)✓ | 0.00 (+1.6)✓ | 0.24 (-0.5)✓ | 0/3 |

## Check and sheet
- **`npm run check:stamp`: green** on the fourth run, at 02:17, stamped 7a2c533 for f6dda9d (log `check4.log`). Goldens are unchanged, and the off-golden test includes betaSD 0.
- **Runs 1–3 were red on 30 s vitest timeouts only**, a different set each run, under load 8–16 from other agents (`check.log`, `check2.log`, `check3.log`, `check-run3.log`).
- **The sheet** is `sheet.png` (half size; `sheet-full.png` is full size), rendered by `render/sheet.py`:
  - R0 against setting 1, seeds 101–104, leaf off and leaf on;
  - lone at 25, and the stand at 70 centred on measured tree 4, with its neighbours visible.
