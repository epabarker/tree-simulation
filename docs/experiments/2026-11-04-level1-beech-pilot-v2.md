# Level 1 beech pilot v2: registration v3, its noise floor, the launch (2026-11-04)

_Reference-fidelity plan §g, phase 3, the beech pilot's second run (the user, 2026-11-04). Provisional: it waits on
Level 0's pass and ADR 0052, and nothing from it is accepted into species params. The [pilot](2026-11-04-level1-beech-pilot.md)
(registration v2, 44a21ba) failed its gate. Its noise floor was wider than the differences CMA-ES ranked by. Pilot v2
registers the changes below before any fit and keeps everything else. No core change: nothing under `src/`, `rust/`,
`cli/`, `tests/`._

**Naming.** Pilot v2 runs registration **version 3**. v1 (3c64f48) was never run; v2 (44a21ba, r3.c frozen) is the
pilot. Results go to `docs/experiments/fits/level1-pilot-v2/` and `runs/level1-pilot-v2/`.

## Reproduce
```
uv run --project analysis python -I analysis/experiments/level1_targets.py --species beech --version 3 --freeze r3.c --redraw --reason "…"
uv run --project analysis python -I analysis/experiments/level1_gate.py --species beech --control --json docs/experiments/fits/level1-pilot-v2/control.json
uv run --project analysis python -I analysis/experiments/level1_noise.py --species beech     # sets seeds_per_candidate, once
LEVEL1_OUT=level1-pilot-v2 analysis/experiments/level1_fit_gate.sh beech 32 HOURS
```
- **Code:**
  - the rules in `analysis/treesim/level1.py`: `correlation`, `location_weights`, `clusters`, `cluster_held_out`,
    `fit_seeds`, `spread_names`;
  - the registration in `analysis/experiments/level1_targets.py` (`--redraw`);
  - the noise rule in `analysis/experiments/level1_noise.py` (new);
  - the search in `analysis/treesim/fit_level1.py` (fixed seeds), the gate in `level1_gate.py`, the wrapper in
    `level1_fit_gate.sh` (seeds from the registration; the commit in the log's first line).
- **Tests:** `analysis/tests/test_level1.py`.
- The pilot's `postfit.py` reads registration v2's loss; run it at 7e641bf.

## What changed, and the pilot result behind each (the registration's `changes`)
1. **Location weights from the measured correlation.**
   - **The rule:** each fitted descriptor's location term weighs 1 / Σ_j |r_ij| over the 16 descriptors, self
     included. Every |r| below the two-sided p < 0.05 critical value at n = 53 (0.2706) is zeroed first, so sampling
     noise does not compress independent descriptors (the user, at plan approval).
   - **It replaces** v1–v2's outline group (one unit shared by its fitted members) and the single units for the rest.
   - **Why:** the pilot grouped descriptors by name, and correlated ones sat on both sides of the grouping. p1 and
     widestAt were held out against the fitted outline, so the out-of-sample test rested on three descriptors.
2. **Hold-outs: whole clusters, to a third.**
   - **The rule:** average linkage on 1 − |r|, cut at |r| 0.5; each pair or singleton is one unit. The clusters, in
     canonical order, are drawn without replacement with the same seed, 20261104, and taken whole until at least 5
     descriptors are held out (ADR 0049 §3; the user).
   - **Why:** independence, for the same reason as change 1. It is not motivated by which descriptor failed.
     pendulousFraction05 (0 of 20 on the pilot's fit) and limbUpturn (the pilot's largest noise term) fall where the
     rule puts them. pendulousFraction05 is reported whether or not it is drawn.
3. **Spread out of the loss.** The loss is Level 0's contributions plus Σ_fitted w_k z_k². Each descriptor's spread s
   is computed and reported, never scored.
   - **Why:** the pilot's noise floor. The hand's loss had SD 6.38 over six 5-seed draws, mostly the spread terms of
     limbUpturn (4.0) and leaderDominance (2.8), on a near-degenerate simulated distribution. The in-run bests
     (9.15–11.13) were selection on noise; on fresh seeds they scored 19.9–22.6.
4. **Spread gated on all 16 descriptors, fitted and held out**, each within ×2 (the user).
   - **Why:** spread is not fitted, so gating it on the held-out descriptors leaks nothing. Whether simulated trees
     vary as real ones do is a question about the model, not the fit.
5. **Fixed search seeds.** Every candidate of every generation grows on the same seeds: the first
   seeds_per_candidate of a list drawn once (numpy seed 20261107) from 1000–9999, less 1001–1006 and the noise check's
   60 seeds. The list is disjoint from the gate's 1–20 and the finalists' 101–110.
   - **Why:** the pilot drew fresh seeds each generation. In-run losses then compared candidates on different seeds,
     and the run's lowest losses were its luckiest readings.
6. **Seeds per candidate by a rule**, set once on this registration before any fit (below).
   - **Why:** the pilot's third design fault: the noise floor was wider than the differences the search ranked by.

**What the gate can and cannot show.** The gate cannot pass until limbs and the leader vary between trees as real
ones do. In the pilot, limbUpturn's spread was 0.26× real for the hand and 0.35× for the fit; leaderDominance's was
0.38× and 0.22×. Both are now in the spread criterion whatever the draw. The finding is at the level of the rules
(the pilot's ADR-list item 1), and no form knob changed it. **The pilot's object is the location terms.**

**Unchanged:**
- Level 0's seven knobs, frozen at the v2 beech fit; r3.c frozen at 0.04879;
- Level 0's terms at their Level 0 weights;
- ADR 0029's ten form knobs, their bounds and the start;
- the coarsened-simulation rule and the size match;
- the budget in generations (32);
- the finalists (101–110) and the hand re-measured beside them;
- the gate's seeds, |z| ≤ 2 and 15 of 20; shapeFlag;
- the real distributions, Demol and the gap strata. `level1_targets.py` refuses any change to them, and they came
  out identical to v2's.

## The correlation matrix (BioDiv's 53 trees, detrended as the targets are)
| | cH | cF | fH | lD | l0 | lDr | lE | lU | p0 | p1 | p2 | p3 | pF | pC | t05 | wA | w |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cH centroidHeight | · | .38 | −.30 | −.35 | **−.60** | −.37 | .22 | −.27 | −.20 | .15 | .44 | **.56** | .42 | .37 | −.37 | .40 | 0.363 |
| cF crownFullness | −.14 | · | .07 | −.00 | −.44 | −.12 | .24 | −.21 | **.62** | .45 | **.55** | .18 | .34 | −.41 | −.27 | −.10 | 0.266 |
| fH forkHeight | −.19 | .07 | · | .21 | .16 | .11 | −.04 | −.05 | .39 | .14 | −.22 | −.43 | .00 | −.47 | −.11 | **−.52** | 0.520 |
| lD leaderDominance | **−.51** | −.01 | .06 | · | −.23 | .43 | −.37 | .39 | .14 | .26 | −.46 | −.15 | .30 | −.27 | .11 | −.20 | 0.662 |
| l0 length0 (held out) | .07 | −.45 | .03 | −.14 | · | −.14 | −.16 | −.01 | .10 | **−.64** | −.19 | −.20 | **−.77** | −.02 | **.76** | .02 | 0.322 |
| lDr limbDroop | .31 | .19 | −.17 | −.21 | −.22 | · | −.31 | .44 | .09 | .19 | −.48 | −.20 | .37 | −.24 | .23 | −.15 | 0.412 |
| lE limbElevation05 (held out) | .35 | −.30 | −.36 | −.18 | **.57** | .10 | · | **−.63** | −.17 | .32 | **.58** | −.02 | −.16 | .07 | **−.64** | −.06 | 0.272 |
| lU limbUpturn (held out) | −.06 | −.20 | .11 | .00 | −.16 | −.18 | −.23 | · | .05 | .02 | −.48 | −.15 | .02 | −.13 | .20 | −.03 | 0.725 |
| p0 p0 | −.32 | **.63** | .24 | .10 | −.01 | −.10 | −.29 | .04 | · | .08 | .02 | −.33 | −.00 | **−.84** | .20 | −.32 | 0.244 |
| p1 p1 | −.01 | **.57** | .11 | −.09 | **−.52** | −.02 | −.26 | .09 | .31 | · | .11 | −.35 | .35 | −.41 | **−.54** | **−.56** | 0.263 |
| p2 p2 | .12 | .40 | −.13 | .00 | **−.57** | .32 | −.12 | −.19 | −.29 | .08 | · | .24 | .04 | .11 | −.44 | .12 | 0.282 |
| p3 p3 (held out) | .10 | .16 | −.27 | −.07 | .22 | .23 | .26 | −.38 | −.22 | −.46 | .25 | · | .26 | **.75** | .05 | **.76** | 0.298 |
| pF pendulousFraction05 | −.08 | .07 | .01 | .03 | −.24 | .38 | −.49 | −.14 | .14 | .04 | −.03 | −.13 | · | .03 | −.01 | .10 | 0.534 |
| pC profileCentre | .27 | −.40 | −.29 | −.11 | .13 | .22 | .31 | −.27 | **−.85** | **−.56** | .42 | **.66** | −.16 | · | −.07 | **.68** | 0.185 |
| t05 tortuosity05 | .22 | −.09 | .10 | −.27 | −.22 | .41 | −.24 | .23 | −.07 | −.09 | −.07 | .04 | .25 | .06 | · | .16 | 0.709 |
| wA widestAt (held out) | .15 | −.00 | −.18 | −.05 | −.06 | .08 | .11 | −.19 | −.43 | −.40 | **.55** | **.58** | −.12 | **.66** | .03 | · | 0.277 |

- **Reading the table:** real r below the diagonal, the simulated hand's above (seeds 1–20, the stand at season 70,
  75 trees). Bold: |r| ≥ 0.5. The last column is the registered weight.
- **How r was computed:** Pearson, pairwise complete (n 52–53), on each descriptor detrended to 0.291 m by its own
  slope. The weights and the draw read the real matrix only. The simulated one was measured after the registration
  was written, and nothing reads it.
- **Real against simulated:** the mean |Δr| over the 120 pairs is 0.24, and 38 pairs differ by more than 0.3. The
  largest differences:
  - length0–tortuosity05: real −0.22, simulated +0.76;
  - limbDroop–p2: +0.32, −0.48;
  - length0–limbElevation05: +0.57, −0.16. This is a held-out cluster whose simulated pair does not hold together.
- **The simulated hand's clusters** by the same rule (reported only):
  {centroidHeight, length0, pendulousFraction05}, {crownFullness, p2}, {limbElevation05, tortuosity05},
  {p0, p3, profileCentre, widestAt}, and five singletons. The simulated trees covary differently from the real ones,
  outside the outline.

## Clusters, draw and weights
**Clusters** (average linkage; complete linkage gives the same):

| cluster | r |
|---|---|
| centroidHeight, leaderDominance | −0.51 |
| crownFullness, p1 | +0.57 |
| length0, limbElevation05 | +0.57 |
| p0, profileCentre | −0.85 |
| p3, widestAt | +0.58 |
| forkHeight · limbDroop · limbUpturn · p2 · pendulousFraction05 · tortuosity05 | singletons |

**The draw** (`default_rng(20261104).choice(11, 11, replace=False)` over the canonical order):
1. {p3, widestAt}
2. limbUpturn
3. {length0, limbElevation05}

Then, not taken: tortuosity05, {crownFullness, p1}, limbDroop, {p0, profileCentre}, forkHeight, pendulousFraction05,
{centroidHeight, leaderDominance}, p2.

| | descriptors |
|---|---|
| **Held out (5)** | length0, limbElevation05, limbUpturn, p3, widestAt |
| **Fitted (11)** | centroidHeight, crownFullness, forkHeight, leaderDominance, limbDroop, p0, p1, p2, pendulousFraction05, profileCentre, tortuosity05 |

**Facts the registration records (none changes it):**
- **Pairs that straddle the line.** No pair inside a cluster can straddle the fitted/held-out line, but average
  linkage leaves five cross-cluster pairs at |r| ≥ 0.5 on both sides: length0–p1 −0.52, length0–p2 −0.57,
  p3–profileCentre +0.66, widestAt–p2 +0.55, widestAt–profileCentre +0.66.
  - So only limbElevation05 (largest |r| with a fitted descriptor 0.49, pendulousFraction05) and limbUpturn (0.27) are
    out of sample in v1's sense.
  - Single linkage would separate every |r| ≥ 0.5 pair, but it chains the outline, length0 and limbElevation05 into
    one cluster of 9. The same seed then holds out 12 of 16.
- **Pairs near the cut** (r's standard error ≈ 0.1 at n = 53): centroidHeight–leaderDominance −0.509, length0–p1
  −0.517, limbElevation05–pendulousFraction05 −0.489.
- **limbUpturn is held out by the rule,** with the pilot's own seed and an order fixed before the draw. Its spread is
  still gated.

**Weights:**
- **Fitted:** 0.185 (profileCentre) to 0.709 (tortuosity05) and 0.662 (leaderDominance). The fitted set's total is
  **4.44, beside Level 0's 7.0** (its seven scored traits at weight 1; the death penalties apart).
- **The pilot's balance:** 6 location units and 6 spread units against the same 7.
- **The held-out weights**, for the record: limbUpturn 0.725, length0 0.322, p3 0.298, widestAt 0.277,
  limbElevation05 0.272.
- **Five pairs sit within 0.01 of the critical value:**
  - kept: centroidHeight–profileCentre +0.273, forkHeight–p3 −0.271;
  - zeroed: leaderDominance–tortuosity05 −0.267, limbElevation05–p3 +0.262, limbUpturn–profileCentre −0.267.

## The advisor's check (once, before the registration commit)
None of its points needed a hashed file changed, so the registration stands as written. Each is recorded here.

**1. Is 1/Σ|r| defensible with 53 trees?** Yes, as an effective-number-of-measurements heuristic, with three
properties stated:
- **The sum runs over all 16 descriptors** (the user's rule), so a fitted descriptor is discounted for correlates the
  loss does not hold. profileCentre's denominator includes p3, widestAt and limbElevation05, all held out.
- **The threshold is a step.** Five pairs sit within 0.01 of 0.2706. Had leaderDominance–tortuosity05 (−0.267) been
  kept, both weights would fall by about 15% (0.662 → 0.56, 0.709 → 0.60).
- **Resampling the 53 trees** (`code/2026-11-04-level1-pilot-v2/weights_bootstrap.py`; 2,000 sets, seed 20261108;
  real trees only; registered slopes and r_crit; `fits/level1-pilot-v2/weights-bootstrap.json`):
  - **The registered weights sit at the top of their resampled ranges.** The fitted total is 4.44 against a 5–95% range
    of 3.10–4.46 (median 3.72). tortuosity05's 0.709 lies above its 95% point (0.612), because several of its |r| sit
    just under the threshold, and a resample pushes some of them over. The range is the bootstrap's spread, not a
    bias-corrected interval: resampling with replacement raises small |r| on average.
  - **Each fitted weight** (registered; 5–95%):

    | descriptor | registered | 5–95% |
    |---|---|---|
    | centroidHeight | 0.363 | 0.23–0.58 |
    | crownFullness | 0.266 | 0.20–0.33 |
    | forkHeight | 0.520 | 0.27–1.00 |
    | leaderDominance | 0.662 | 0.32–0.70 |
    | limbDroop | 0.412 | 0.22–0.50 |
    | p0 | 0.244 | 0.17–0.33 |
    | p1 | 0.263 | 0.19–0.35 |
    | p2 | 0.282 | 0.18–0.39 |
    | pendulousFraction05 | 0.534 | 0.29–0.59 |
    | profileCentre | 0.185 | 0.15–0.22 |
    | tortuosity05 | 0.709 | 0.27–0.61 |
  - **The clusters are fragile at n = 53.** The registered 11 come back in 0.05% of resamples, and the same draw gives
    the same held-out set in 0.2%. The pairs near the cut (above) are why. The draw is one realisation of a rule, as
    ADR 0049 §3's seeded draw always was.

**2. Can a fitted descriptor collapse its spread at no cost?** Yes, every one, by design. z reads the median only, so
nothing in the loss sees spread. Its only cost is the spread gate on all 16.
- **The reward is small.** The median's sampling variance adds about π/(2·n) · (sim SD / real SD)² to E[z²] per
  descriptor: ≈ 0.04 at about 40 trees (10 seeds) with the real spread. Over the fitted weights that is ≈ 0.17,
  against the hand's gap of 2.36, too small to choose between finalists.
- **Fixed seeds do not remove it.** They fix where the sampling error falls instead of redrawing it each generation,
  and a low-spread candidate's median still sits nearer its own centre. (The advisor read it as removed in-run. I
  cannot show that; the bound above holds either way.)
- **Watch leaderDominance (weight 0.66).** In the pilot its spread fell from 0.38 to 0.22 even with spread in the
  loss. Every row carries `l1.<k>.s`, so a collapse will show in the run's own files.

**3. Does anything read as chosen by the pilot's result?** The rules were each fixed before what they produced:
- the cluster rule, by the user, in answer to a question that showed the real clusters and not the draw;
- the |r| threshold, at plan approval, before any simulated tree was scored on v3;
- the seed rule, before the noise run;
- the noise draws, reused (NOISE_SEED 20261106) so that the two floors are paired, which the exact determinism shows;
- the draw, which reproduces from the stored real matrix (`test_level1.py`).

The outcome still falls in v2's favour on both of the pilot's failures: pendulousFraction05, its held-out failure, is
now fitted, and limbUpturn, its largest noise term, is now held out. **v3's held-out test is weaker than v1's, and it
no longer tests what v1 failed:**
- p3, widestAt and length0 each have a fitted correlate at |r| ≥ 0.5.
- **limbUpturn's z is pinned.** Its simulated median sits near 0°, so its per-seed z is ≈ −1.27. It fails only if
  that median falls below ≈ −8° or rises above ≈ 35°.
- **limbElevation05 is the one live out-of-sample check** (largest |r| with a fitted descriptor 0.49,
  pendulousFraction05). In the simulated hand it covaries with fitted tortuosity05 at −0.64 (real −0.24), and length0
  with tortuosity05 at +0.76 (real −0.22). Fitting tortuosity05, the hand's largest location term, will move both
  held-out descriptors through the model's own covariance.

**The seed decision stands as registered.** The SD of 0.834 rests on six draws, and its 95% interval is ≈ 0.52–2.04,
which straddles the threshold of 0.59. 10 seeds is the conservative side of the rule.

## The control (real trees, no simulation; seed 20261105)
- **BioDiv** (in sample): 20 of 20 pseudo-seeds pass the held-out rule; P(≥ 15) = 1.000 over 2,000 draws.
- **Spread on its 80 trees, all 16:** 0.79 (forkHeight) to 1.53 (length0), all within ×2.
- **Demol** (out of sample, the five held out): 20 of 20; P(≥ 15) = 1.000 (pass counts, 5/50/95%: 19, 20, 20).
  On limbElevation05 and limbUpturn alone: 20 of 20.

## The noise floor and the seed decision
**The run.** The hand on the pilot's own draws: numpy seed 20261106, six draws of 5 seeds and three of 10
(`noise.json`). These are the same simulated trees as the pilot's post-fit check. Level 0's terms, and the z² of
forkHeight, leaderDominance and limbDroop, reproduce postfit.json exactly (difference 0.0). The floors below are
therefore paired, and they differ only in how the trees are scored.

| loss, the same trees | 5 seeds: the six losses | 5 seeds: mean ± SD | 10 seeds: mean ± SD |
|---|---|---|---|
| the pilot (v2: location + spread) | 20.68, 26.93, 14.98, 13.73, 23.49, 29.66 | 21.58 ± 6.38 | 26.97 ± 13.20 |
| the pilot without its spread terms | 6.15, 7.52, 8.11, 5.85, 7.01, 6.96 | 6.93 ± 0.84 | 6.00 ± 0.58 |
| **pilot v2 (v3's loss)** | 5.21, 6.29, 7.13, 4.75, 6.07, 5.91 | **5.89 ± 0.83** | **4.93 ± 0.40** |

- **What the spread terms were adding:**
  - at 5 seeds, +14.7 to the mean and SD 0.84 → 6.38;
  - at 10 seeds, +21.0 and SD 0.58 → 13.20.

  That is almost all of the pilot's noise.
- **The reweighting and the redraw** lower the mean by 1.0 and leave the SD unchanged (0.84 → 0.83).
- **v3's loss, split** (mean ± SD):

  | part | 5 seeds | 10 seeds |
  |---|---|---|
  | Level 1 location | 2.36 ± 0.55 | 2.45 ± 0.31 |
  | Level 0 | 3.53 ± 0.86 | 2.48 ± 0.19 |

- **Where the remaining noise is** (5-seed SD of each term): stand.lateShare 1.14, a Level 0 term, then stand.lai 0.34,
  pendulousFraction05 0.19, p0 0.18, the rest ≤ 0.16.
- **The hand's location terms** (5-seed means): tortuosity05 0.89, centroidHeight 0.46, p0 0.32, pendulousFraction05
  0.28, the rest smaller.
- **The hand's matched season** moves with the seeds: 60–80 over the nine draws (70 on 101–110 and on 1–20). One
  5-seed draw had 16 trees, the others 20; the 10-seed draws had 36–39.

**The seed decision** (the rule registered before the measurement):

| quantity | value |
|---|---|
| SD of v3's loss over the six 5-seed draws | 0.834 |
| the hand's mean Level 1 location loss over those draws (every target is 0, so this is the hand-to-target gap) | 2.358 |
| a quarter of the gap | 0.590 |

0.834 > 0.590, so **10 seeds per candidate**. The 10-seed SD (0.40, over three draws: rough) sits under the quarter-gap.

The decision was made from this floor, measured on registration v3 after it was written and before any fit.
`level1_noise.py` wrote it into the registration's `loss` (seeds_per_candidate 10, and the noise file's sha256), and
the fit refuses to start without it.

## The launch
**The budget** is unchanged at 32 generations, now at 10 seeds a candidate: 32 × 12 × 10 = 3,840 evaluations,
plus 40 for the finalists and the hand on 101–110, or 3,880 in all.

**Wall-clock (projected):** the pilot took ≈ 365 s a generation at 5 seeds, so ≈ 730 s at 10. That gives 32 × 730 s
≈ 6.5 h, plus ≈ 4 min of finalists and ≈ 3 min of gate: **≈ 6.6 h**. The safety stop is 9 h.

**The command,** on this machine, after the registration commit; the log's first line names the commit:
```
tmux new -d -s level1v2 'systemd-inhibit --what=sleep:idle --why="Level 1 beech pilot v2" env LEVEL1_OUT=level1-pilot-v2 analysis/experiments/level1_fit_gate.sh beech 32 9'
```
On macOS (no systemd), use `caffeinate -ims` instead, with that host's own outputs and 8 workers. It holds the Mac
awake only on AC power with the lid open:
```
tmux new -d -s level1v2mac 'caffeinate -ims env TREESIM_WORKERS=8 LEVEL1_OUT=level1-pilot-v2-mac analysis/experiments/level1_fit_gate.sh beech 32 9'
```
- **Resume:** run the same command again.
- **Outputs:**
  - in `docs/experiments/fits/level1-pilot-v2/`: `beech{.json,-best.json,-progress.csv}`;
  - in `runs/level1-pilot-v2/`: the log `beech.log`, the gate `beech.gate.{txt,json}`.
