# Young trees' clear trunk: not ADR 0055; a general low crown base (2026-11-06, box step A2)

**Question (#53):** the advisory lone-tree judge said ADR 0055's irregularity costs young hornbeam and beech their clear trunk ("branches to the ground"). Is that real, and is ADR 0055 the cause? The plan said to check before fixing, because the lone references (TreeML) are crown-lifted street trees.

**Answer.**
- **ADR 0055 is not the cause.** With its irregularity switched off, young garden beech and hornbeam keep a *lower* crown base, not a higher one.
- **The garden's crown base is low at every size, in every species.** It predates 0.16.0. Live crowns reach within about 5% of the ground. Real closed stands sit at 22–38% of height, and real hedgerow oaks, a single row like the garden, at 20%.
- **This is a self-pruning gap** (C5's shedding of shaded lower limbs), not a param slip. It is recorded for a later box, not fixed now.

## Measures
- **Simulated:** `limbBase` / height. `limbBase` is the live crown base by limbs: the lowest limb level holding 5% of the leaf area (`metrics.rs`).
- **Real:** `cbH`, the lowest limb at least 2.5 m long, attached at that height over H. Dead limbs count; computed on QSMs (overnight targets).
- **The two differ.** The leaf-weighted simulated measure reads at or above the geometric lowest limb, so the gap below is, if anything, understated.

## Results
Garden (`forestParams(160)`, quarter cap, seeds 2, 3, 6, 9, 10, 12), live trees ≥ 10 m, median `limbBase`/H by 8 m height bin:

| species | 8–16 m, irregularity on / off | 16–24 m | 24–32 m |
|---|---|---|---|
| beech | 0.11 / 0.05 | 0.20 / 0.07 | 0.05 / 0.07 |
| hornbeam | 0.04 / 0.06 | 0.13 / 0.06 | 0.07 / 0.09 |
| oak | 0.05 / 0.06 | 0.04 / 0.05 | 0.05 / 0.07 |

- **Over 20 seeds** (the adopted birch build), planted beech and hornbeam sit at 0.03–0.07 from season 40 to 150. Bare bole (`boleHeight`/H) is 0.01–0.04.
- **Real `cbH`** (overnight targets; summary statistics only):

  | species | stand | lone, as street trees (pruned) |
  |---|---|---|
  | beech | 0.38 [0.10–0.56] (n 66) | 0.14 |
  | hornbeam | 0.22 [0.09–0.34] (n 36) | 0.12 |
  | oak | 0.26 [0.12–0.37] (n 37) | 0.20 [0.06–0.30] (Belgian hedgerows, n 21) |

## Next (not this box)
- **A self-pruning look.** Shaded lower limbs are shed too slowly, or kept by the side light the single-row garden gives.
- **Candidates:** C5's shedding thresholds, against `T_rel`, which is fixed from the literature (ADR 0032); limb death from sustained low vigour.
- **The gate:** the garden's `cbH` against the hedgerow band (the closest regime) and the stand band.
- **Rule:** under the [validation policy](../background/validation-policy.md), a new mechanism needs an ADR.

**Reproduce:** the run script of [the recruits note](2026-11-06-garden-recruits.md), with `code/2026-11-06-crown-base/no_irregularity.py` applied to the params (it zeroes `shootLengthSD`, `betaSD` and `axisSD`, and removes stochastic `budBreak`).
