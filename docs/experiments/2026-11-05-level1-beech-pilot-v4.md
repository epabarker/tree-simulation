# Level 1 beech pilot v4: registration v5, lateShare scored again; tortuosity and late growth are traded on a soft line (2026-11-05)

_Reference-fidelity plan §g, phase 3, the beech pilot's fourth run (the user, 2026-11-05: whether tortuosity05 and
late growth can be had together with the current rules). Provisional: it waits on Level 0's pass and ADR 0052, and
nothing from it is accepted into species params. No core change: nothing under `src/`, `rust/`, `cli/`, `tests/`._

**Naming.** Pilot v4 runs registration **version 5** (edbd327). Its results are in
`docs/experiments/fits/level1-pilot-v4/`, and the run's own files in `runs/level1-pilot-v4/`.

## Findings
1. **The fit holds with lateShare scored.** The hand scores **6.88** on the fresh seeds 101–110 and the finalist
   **3.31**. The hand's 10-seed SD is 1.31 (the noise check), so the gain is 2.7 SDs.
   - **Pilot v3's finalist under this loss** (same seeds, arithmetic on its stored terms: lateShare's 10.09 at band
     0.06 is 3.63 at 0.10) scores 1.62 + 3.63 = **5.25**. v4's finalist beats it by 1.9.
   - **Held out:** 20 of 20 seeds pass (15 needed). Every pooled |z| on the gate's seeds is ≤ 1.03.
2. **The answer to the run's question: the third reading, both partly off, on a soft trade-off line.**
   - **tortuosity05 is in band:** z **−0.81** on 101–110 (the hand −1.11, v3 −0.66); −0.80 on the gate's seeds.
   - **lateShare is about one band short:** **1.326** (term **1.07**) against the target 1.43 at band 0.10; the hand
     1.387 (term 0.18), v3's finalist 1.24 (term 3.63 at this band).
   - **The price, on 101–110:** v4 bought +0.30 z of tortuosity for −0.06 of lateShare. v3 bought +0.45 z for −0.15.
     About 0.2 of lateShare per unit z here against 0.33 in v3: the coupling is real, but softer than v3 implied.
   - So neither clean reading holds. Reading 1 (both in band) fails by 0.04 of lateShare past its band edge; reading
     2 (tortuosity out of band) does not happen.
3. **The route is not v3's.** The finalist's dLambda is **0.0165**, near the hand's 0.0138 (v3's 0.027), and its aC
   15.5 near the hand's 14.4. What moved most is **kappa 0.431 → 0.224** and **branchAngle (1) 50.1° → 40.3°**
   ([below](#the-finalists-knobs)). Which of them makes the limbs wander is not tested (Limits).
   - **What kappa does** (`rust/core/src/principles/r2.rs:471–515`, `acrotony_weights`): each metamer's vigour
     weight is exp(κ(pos − 1)), pos its node's place along the shoot it grew with (1 at the tip). Lower κ flattens
     the gradient, so buds lower on a shoot keep more vigour against the tip. That is a plausible source of relays
     and kinks; it is not demonstrated.
   - **How late growth is lost here:** not by front-loading as in v3. H60 is the hand's (79.1 against 78.6 cells);
     H100 is 104.2 against 108.6 and H150 112.5 against 119.5. The stand also thins more by 100 (alive 0.82 against
     0.93).
4. **The gate still fails on between-tree spread only:** **tortuosity05 at 0.48×** (fitted) and **limbUpturn at
   0.36×** (held out). limbDroop clears at 0.51×, limbElevation05 at 0.71×; shapeFlag is clear.
   - tortuosity05's spread is 0.40× on 101–110, and the penalty paid for it (0.07). It sits under the floor, the same
     floor-equals-edge case v3 found with limbDroop.
   - limbUpturn's spread is worse than v3's (0.47×); its z is −0.98. ADR 0053's case is unchanged: individual
     variation of limb posture blocks Level 1, now joined by tortuosity's.

## The run
- **Launch:** registration v5 (edbd327), 07:49 UTC 2026-11-05; the log's first line names edbd327, clean. 12 workers,
  under `systemd-inhibit`.
- **Fit:** complete, 32 generations, 3,880 evaluations, 6.68 h wall (≈ 745 s a generation). Fit exit 0 at 14:30 UTC;
  gate exit 0 at 14:32.
- **In-run run best (search seeds; the hand there ≈ 5.7, from its stored v4 terms, not measured):** 6.45 at generation
  0, 4.79 at 1, 4.39 at 6, 3.87 at 10, 3.65 at 12, 3.57 at 16, 3.24 at 30. The median fell from 14.7 to 5.7.
- **Finalists on 101–110:** 4.24 (generation 30's best, dLambda 0.023), 5.15 (dLambda 0.021) and **3.31**
  (generation 16's best, dLambda 0.0165). The search-seed best did not hold on fresh seeds; the selected finalist is
  the third.

## The finalist's knobs
| knob | hand | v4 finalist | v3 finalist |
|---|---|---|---|
| λ (0) | 0.5308 | 0.5400 | 0.5462 |
| λ (1) | 0.5124 | 0.5109 | 0.5177 |
| setPoint (1) | 34.3 | 28.5 | 66.9 |
| postureSetPoint (1) | 34.3 | 33.6 | 33.7 |
| branchAngle (1) | 50.1 | **40.3** | 41.3 |
| eta (1) | 0.570 | 0.567 | 0.341 |
| setPoint (2) | 94.6 | 87.0 | 88.1 |
| aC | 14.4 | 15.5 | 18.0 |
| dLambda | 0.0138 | **0.0165** | 0.0269 |
| kappa | 0.431 | **0.224** | 0.555 |

The other two finalists share kappa 0.17–0.20, branchAngle (1) ≈ 44° and dLambda 0.021–0.023.

## The terms on 101–110 (hand → fit)
| term | hand | fit |
|---|---|---|
| **Level 1 location** | **2.25** | **1.28** |
| tortuosity05 | 0.87 | 0.47 |
| centroidHeight | 0.51 | 0.23 |
| forkHeight | 0.08 | 0.23 |
| p2 | 0.02 | 0.12 |
| crownFullness | 0.07 | 0.09 |
| limbDroop | 0.01 | 0.06 |
| p0 | 0.33 | 0.06 |
| pendulousFraction05 | 0.19 | 0.02 |
| leaderDominance, profileCentre | 0.17 | 0.01 |
| **Level 1 spread penalty** | **3.05** | **0.07** |
| tortuosity05 | 2.31 | 0.07 |
| leaderDominance | 0.68 | 0 |
| pendulousFraction05 | 0.06 | 0 |
| **Level 0, scored** | **1.58** | **1.95** |
| lateShare (band 0.10) | 0.18 | **1.07** |
| LAI | 0.56 | 0.39 |
| talloCR | 0.40 | 0.16 |
| talloH | 0.22 | 0.13 |
| survivalLight | 0.13 | 0.13 |
| height at 60 | 0.09 | 0.07 |
| **total** | **6.88** | **3.31** |
| _reported, not scored:_ height at 100 | 0.27 | 0.47 |

Per fitted descriptor on 101–110, z (spread ratio): the hand → the fit.

| descriptor | hand | fit |
|---|---|---|
| centroidHeight | +1.18 (0.49) | +0.79 (0.57) |
| crownFullness | −0.50 (0.79) | −0.58 (1.54) |
| forkHeight | +0.40 (0.72) | +0.67 (1.28) |
| leaderDominance | −0.38 (0.25) | +0.01 (0.68) |
| limbDroop | −0.12 (0.51) | +0.38 (0.58) |
| p0 | −1.17 (0.78) | −0.48 (1.19) |
| p1 | +0.01 (0.62) | −0.06 (1.46) |
| p2 | +0.29 (0.66) | −0.64 (0.97) |
| pendulousFraction05 | +0.59 (0.40) | −0.17 (0.97) |
| profileCentre | +0.67 (0.64) | +0.22 (1.51) |
| tortuosity05 | −1.11 (0.14) | −0.81 (0.40) |

## The gate (seeds 1–20; `fits/level1-pilot-v4/beech.gate.txt`, `.json`)
- **The verdict:** **FAIL**. Held out 20/20, spread outside ×2, shapeFlag clear.
- **The stand:** season 70, 78 trees, median DBH 0.294 m; none outside the real DBH range.
- **Pooled z (spread ratio):**
  - fitted:
    - centroidHeight +0.86 (0.62), crownFullness −0.21 (1.26), forkHeight +0.67 (1.16);
    - leaderDominance +0.30 (0.59), limbDroop +0.48 (0.51), p0 −0.08 (1.16);
    - p1 +0.08 (1.06), p2 −0.94 (0.99), pendulousFraction05 −0.11 (0.88);
    - profileCentre +0.06 (1.27), tortuosity05 −0.80 (**0.48**);
  - held out: length0 −0.31 (1.78), limbElevation05 −0.29 (0.71), limbUpturn −0.98 (**0.36**), p3 +0.26 (1.26),
    widestAt −1.03 (1.33).
- **Demol, out of sample:** pendulousFraction05 +2.26; every other descriptor within ±1.85.
- **shapeFlag:** the candidate's nearest gallery reject is round2-spindle at 0.64, and the hand form sits at 0.37. Not
  flagged.
- **Level 0's statistic on the same runs** (reported, not gated): 9 of 20 seeds within T 1.00 (the Level 0 fit's: 9).

## Noise check (before the run; `fits/level1-pilot-v4/noise.json`)
- The hand on v3's three 10-seed draws scores 4.71, 7.14 and 6.75: SD 1.31, over the user's 0.6, noted, seeds
  unchanged. lateShare adds 0.10 ± 0.08 on the hand. The cross-check matches v3's stored terms to 9e-16.

## For the ADR list
- **A per-level dLambda is not demanded by this run.** The fit reached tortuosity in band without dLambda, at a
  lateShare price of about one band. Whether a per-level dLambda would remove that last band is open; this run cannot
  say.
- **Individual variation (ADR 0053)** is still the gate's blocker, now on two descriptors: limbUpturn (0.36×) and
  tortuosity05 (0.48×). The penalty's floor and the gate's edge coincide, so a fitted descriptor can sit at 0.5×
  and fail on noise.

## Limits
- **Point estimates on 10 + 20 seeds.** The finalist was selected from 384 candidates on the search seeds and
  re-measured on 101–110; the three finalists span 3.31–5.15, and the search-seed best (3.24) re-measured at 4.24.
- **lateShare's per-seed SD is 0.137** on ten seeds (SE 0.043), so its one-band miss (0.10) is under one per-seed SD.
  The reading "both partly off" rests on a 0.04 excess over the band edge.
- **The route is read from one fit's knobs.** kappa, branchAngle (1) and setPoint (1) moved together; a one-knob probe
  from the hand would say which carries tortuosity.
- **Provisional:** nothing here is accepted, and nothing changes species params.
