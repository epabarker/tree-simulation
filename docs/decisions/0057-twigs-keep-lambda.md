# 0057: Twigs keep λ: a per-level share of the ontogenetic fall of λ (`r2.levels[k].dLambdaShare`)

- **Status:** accepted for birch (the user, 2026-11-06). The param is in the core and off by default (absent = 1, bit-identical). Only birch sets it.
- **Spec:** §R2 (ontogeny: λ declines after a_c). ADR 0031 (the flat cap; its architectural fix, Troll's reiteration, is not this). ADR 0055 (irregularity).
- **Evidence:** agent T, item T of [the day-2 plan](../plans/2026-11-06-day2.md); scripts and summaries in the session scratchpad `T/`.

## Context
- **The rule today:** R2's ontogeny lowers every level's λ by Δλ from a_c.
- **The overnight crown run** (2026-11-06) found the dome comes from order-2 twigs keeping their λ (K2), not from the limbs (K1).
- **The user's ask:** rounding is a priority, existing levers first. The reproductive sink rounded hornbeam but flattened beech (A5 lever 1). So this is lever 2.

## Decision
- **The rule:** `r2.levels[k].dLambdaShare`, default 1. λ at a node of level k is `level.lambda − share·Δλ·t`. Absent, the old expression runs unchanged; tested bit for bit.
- **Birch's twig level** (`r2.levels.2.dLambdaShare` 0) takes none of the fall.

## Consequences
- **Birch,** lone, 10 seeds:
  - D at 100/150 goes from −0.04/−0.02 to 0.105/0.35, inside the real band 0.07–0.61;
  - its height median at 150 is 40.6 m (band 33–42; its tallest seed 46.0);
  - W/H at 150 is 0.46 (real 0.38–0.66);
  - its per-seed D spreads from −0.32 to 1.51: more varied, not uniformly rounder.
- **G-forest** (20 seeds against B0) stays as HEAD's: 0/1/9/12. Three checks sit at their limits, as they already did.
- **Goldens:** `beechWood` s30 aa6bff66 → 6e6fd6bc. The named regression `phoneSeed3` loses a little wood (23 live at 100 against 24, with 7–12% fewer metamers at 100 and 150); its canopy counts are unchanged.
- **Not adopted:**
  - **Beech:** its Δλ is only 0.014, so the lever is weak; its D at 100 reaches 0.224, at the band edge. Its twigs keep λ in the stand's shade too, which deepens planted crowns, and G-forest's crown check fails (5–6 against ≥ 9).
  - **Willow:** not rounded (D ≤ 0.11).
  - **Hornbeam:** share 0 lowers its D, still in band; not needed.
- **For beech, a lever that rounds the lone crown without deepening shaded crowns** (gated on light or vigour) is still to find.
