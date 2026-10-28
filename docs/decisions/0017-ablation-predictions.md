# 0017: The §8 predictions for ξ and R4 follow the model

- **Status:** accepted
- **Date:** 2026-10-28
- **Spec:** §8 (ablations), §C4 (ξ), §R4

## Context
M22 tested every §8 ablation (`ablation.test.ts`, `docs/experiments/2026-10-28-m22-ablations.md`). Two of the spec's predictions don't hold, for reasons the model makes explicit:
- **ξ = 0.** Crowns still lean into gaps and toward an oblique sun. Lean has three causes here:
  - shoot direction (ξ);
  - Borchert–Honda allocation to the lit side;
  - shedding of the shaded side.
  Only the first stops; under an oblique sun it is about a fifth of the lean.
- **R4 off.** Gaps refill no slower. The R4-off baseline grows any live bud with v ≥ 1 and never needs to release one, so it is more permissive than R4.

## Decision
The user agreed (2026-10-28) to amend spec §8's rows to what the model does:
- **ξ = 0:** shoots stop turning to the light, and crowns still lean by allocation and shedding.
- **R4 off:** no dormant bud bank, no release after a disturbance and no epicormic shoots, with gaps refilling no slower.
- **Pooled light:** size inequality drops and nothing is suppressed. Bimodality is left out while the directional stand isn't clearly bimodal.

The tests assert these.

## Consequences
- The spec stays the source of truth for what the tests check.
- If a later change makes phototropism dominate lean, or makes R4 the only route into a gap, revisit these rows.
