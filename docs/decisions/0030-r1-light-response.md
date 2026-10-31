# 0030: R1's light response, linear or saturating (an ablation)

- **Status:** rejected (2026-10-31, the user): `r1.response` stays in the core as an ablation (default linear, goldens unchanged); no species or preset uses it.
- **Date:** 2026-10-31
- **Amends:** spec §R1 (P = α·Σ a·Q·d(L_path)), ADR 0010, ADR 0021.
- **Note:** [the species note](../experiments/2026-10-30-species-3d.md), round 5: "The cap", "The shed branches, decomposed", "R1's light response".

## Context
The flat caps on hornbeam, oak and maple are R1's carbon shedding: with no shedding the lone hornbeam is a dense rounded crown. The shed branches are almost all single leafy twigs. Their maintenance is foliage (m_f·a; sapwood is under 1% of M_b), and their production is α·a·Q·d(L). So a twig is shed when Q < m_f/(α·d(L)), a compensation light of 0.04–0.08 across the crown's path lengths for hornbeam. Production is linear in Q, so a leaf at a tenth of open sky earns a tenth of a sunlit leaf against the same cost. A real leaf's light response saturates, so a leaf in shade earns more per unit of light than one in full sun; canopy models commonly use a rectangular or non-rectangular hyperbola for it.

## Decision
1. **A switch in R1:** `r1.response` "linear" (absent: the default, the spec's rule) or "saturating", with `r1.qHalf`. The saturating form is f(Q) = Q·(1 + q_half)/(Q + q_half): a rectangular hyperbola scaled to meet the line at Q = 1, so an open-sky leaf produces what it did and a shaded one more. P = α·Σ a·f(Q)·d(L).
2. **Only P changes.** C3's allocation, C5's light test (Q_b/n_b < T_rel·Q_top), R6's Q_ss and R4's light trigger still read Q.
3. **An ablation until the user adopts it** for a species or a preset (`r1-carbon` in `principles/r1.rs`, `light_response`; unit tests for both forms). The goldens are unchanged because no preset sets it.

## Consequences
- The compensation light falls: at q_half 0.2, a leaf at Q 0.04 earns 0.2 rather than 0.04 per unit of α.
- C5's relative-light test (T_rel·Q_top) is unchanged, so a twig can still be shed for being dim relative to the crown top.
- Fitted species carry α, m_f and Q_ss calibrated against the linear response; a species switched to the saturating form would need its physiology refitted.

## Why rejected (2026-10-31)
The test (`code/2026-10-31-species-round5/response.py`; the species note, "R1's light response"): the lone hornbeam at ramp 25, the closed hornbeam stand at 100, and `forest` at τ 0 to 300 on seeds 1–3.

| response | dome (lone hornbeam) | stand crown (limb crown ratio at 100) | plateau (`forest`, seeds 1–3) |
|---|---|---|---|
| linear | no: the flat cap (top fifth 41% of the leaf at 60) | 0.39 | holds on 3 of 3 (median height 74–86 at 300) |
| saturating, q_half 0.2 | at 60 (top fifth 17%); at 100 flattened against the woods' top (H 205) | 0.33 | holds on 1 of 3 (117–125) |
| saturating, q_half 0.5 | at 60, broad; at the woods' top by 100 (H 190) | 0.34 | holds on 1 of 3 (106–118) |

It rounds the lone crown only by raising production below full sun everywhere: the tree also grows taller and runs into the ceiling. The stand's crown gets shallower, not deeper, and the plateau holds on one seed in three where linear holds on all three.
