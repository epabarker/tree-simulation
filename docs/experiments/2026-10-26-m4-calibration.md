# M4: calibrating shadow and shedding with C2–C6 all on

## Question
With Borchert–Honda allocation, direction, shedding and girth all on, which shadow constants (a, b, qMax) and shedding threshold T make an isolated tree:
1. survive the seedling stage;
2. stay full rather than over-pruned;
3. lift its crown base, the "clear bole" of §7 M4?

## Setup
- Preset `bh`, plus C4, C5 and C6 on. 50 seasons; seeds 1–5.
- Grid: a ∈ {0.05, 0.1, 0.2}, b ∈ {1.3, 1.5, 2}, qMax ∈ {6, 10}, T ∈ {0.05, 0.1, 0.15}, λ ∈ {0.5, 0.56}. That is 540 runs.

```bash
uv run --project analysis python analysis/experiments/m4_calibration.py   # writes analysis/out/m4_calibration.csv
```

## Result (medians over 5 seeds, qMax = 6)

| a | b | T | λ | survive | metamers | bole | width |
|---|---|---|---|---|---|---|---|
| 0.05 | 1.5 | 0.1 | 0.5 | 5/5 | 14,161 | 1.0 | 122 (fills the box) |
| 0.1 | 1.5 | 0.1 | 0.5 | 5/5 | 4,942 | 1.0 | 93 |
| 0.2 | 1.3 | 0.1 | 0.5 | 5/5 | 798 | 4.1 | 49 |
| **0.2** | **1.5** | **0.1** | **0.5** | **5/5** | **1,186** | **2.6** | **58** |
| 0.2 | 1.5 | 0.15 | 0.5 | 5/5 | 731 | 2.6 | 52 |
| 0.2 | 2.0 | 0.1 | 0.5 | 5/5 | 2,118 | 1.0 | 72 |

- **Survival.** 100% for a ≤ 0.1; 99.4% for a = 0.2 across all its configurations.
- **Over-pruning.** In earlier single-seed scans, T ≥ 0.2 over-pruned trees into sparse "lollipops" of under 150 metamers.

## Findings

1. **The seedling starvation trap.** The buds of a young shoot fall into the same 1×1 cell and shade each other: k buds in one cell see Q ≤ C − (k − 1)·a. A bud grows only if α·Q ≥ 1 (when the split is roughly proportional). With a = 0.2 and α = 2, four buds in one cell all get v < 1 and the tree stalls for ever. Nothing can break the stall until reserves (R1) or bud release (R4) exist. Traced case: seed 1, λ 0.54. Smaller a removes the trap, but then trees fill the whole box.
2. **No clear bole on isolated trees.** The bole stays at 1–6 cells in every configuration. The lowest laterals reach past the crown edge, outside the 45° shadow triangles of the buds above, so they stay lit. Like open-grown trees, they keep low branches.
   - **What should lift the crown base:** neighbour shade (§C5.9, tested at M5), and the Beer–Lambert sky sweep (M6), whose shade depends on the leaf area above rather than on distance.
   - **What C5 does here:** it clears the interior. It sheds hundreds to thousands of metamers per tree, and the trees are smaller than without it.
3. **Leonardo exponent.** Δ = n exactly at every junction without a scar, as the pure pipe model predicts (§10). Scarred junctions fall below n.

## Decisions
- **New defaults:** a = 0.2, b = 1.5 (was 2), qMax = 6, T = 0.1 (was 0.3), C = 1. All still marked `calibrate`.
- The M4 visible test is satisfied in the §8 ablation sense: C5 off gives a cluttered interior and no bole. The bole itself is retested in stands at M5.

## Update at M5
In 10-tree stands (4 seeds, 40 trees), a = 0.2 left 5 seedlings stalled and a = 0.15 left none (median tree 786 metamers). The default is now **a = 0.15**, following spec §2's advice to lower a in 2D.
