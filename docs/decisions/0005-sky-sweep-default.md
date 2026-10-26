# 0005: The sky sweep is the default light model

- **Status:** accepted
- **Date:** 2026-10-26
- **Spec:** §C2.4 (sky sweep as "recommended upgrade"), §C2.6 parameters, §7 M6

## Context
The shadow triangle reaches only q_max layers below a bud, so neither isolated trees nor stands could lift their crown base (M4, M5). The sky sweep's shade depends on the foliage along K sky directions, not on distance (`docs/experiments/2026-10-26-m6-sky-sweep.md`).

## Decision
`c2.model` defaults to `"sky"` (k_ext = 0.5, K = 7, weights ∝ sin(elevation), minimum elevation 15°, tilt 0). The M1–M5 presets pin `"triangle"`, so their milestone tests and goldens keep testing the baseline; the M6 presets and the page's start presets use the sky. Three details the spec leaves open:

1. **Own cell.** A bud receives the light entering its cell; the cell's own foliage does not shade it ("a bud does not cast a shadow on itself", generalised to the cell). This also removes the same-cell seedling trap of the triangle.
2. **Sides of the world.** Rays from beyond the world's sides are unobstructed (open sky); growth is still confined to the box (Q = 0 outside). This is what lets edge trees lean outward.
3. **Sky weighting.** w_k ∝ sin(elevation)^p · max(0, 1 + tilt·cos θ_k), normalised to Σ w_k = C; p = 1 is cosine-weighted, tilt models an oblique sun.

## Consequences
Stands form clear boles and gaps refill by lean; cost is O(K·W·H) per season (≈ 3 ms for a 10-tree stand). Suppressed decurrent trees can lose their crown to C5 in one season (onset of self-thinning). Revisit the weighting if R5 (shade avoidance) or O4 (stands) need a directional sun.
