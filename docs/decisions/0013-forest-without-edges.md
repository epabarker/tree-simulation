# 0013: Periodic world sides, O4 stand dynamics and O2 abrasion

- **Status:** accepted
- **Date:** 2026-10-27
- **Spec:** §O2, §O4, §C2 (sky sweep boundary; ADR 0005), §6 Phase 3, §7 M11, §10 (self-thinning, size inequality, crown shyness)

## Context
- **Edges.** M6e found that open world sides light every stand from its edges: floor light is 20% under edge trees, and closing the sides with walls slows the whole stand. The ROADMAP asked M11 for "world sides that act like a continuing forest" before stand dynamics.
- **O4** (§O4.4): "Seeds = ⌊f_rep·N⁺/c_seed⌋; position ~ parent + Laplace(0,d); establish if ground Q > Q_est with p_est; p_die = m₀ + starvation + breakage".
- **O2** (§O2.4): "Sway A_i ∝ exposure·h/r; if another tree's foliage lies within A_i, kill tip with p_abr; girth bonus ∝ exposure". It "needs grid owner tags".

## Decision
- **Periodic sides** as a world option, `world.sides: "periodic"` (default `"open"`, so every earlier preset and golden is unchanged). The sky sweep wraps x for deposits, samples and rays.
  - Steep rays read their upstream cell across the seam.
  - Shallow rays can cross the width several times before they leave the top, so they are swept around the ring for ⌈3H/(rise·W)⌉ + 1 laps from open sky. The factor 3 covers the linear interpolation's diffusion, and makes the field translation invariant to 10⁻¹⁶. This costs ≈ 2.5× the light of an open world (23 against 9 ms a season for a 210 × 110 stand).
  - Growth wraps too; the page draws crowns where they grew, beyond the edge if need be.
  - The shadow triangle ignores the option.
- **O4** (`principles/o4-stand.ts`), in Phase 3 after R1's starvation deaths:
  - Background mortality with probability m₀ [`Purpose.mortality`].
  - R1's reproductive sink (f_rep of the surplus above the maturity height) fills a per-tree seed pool, and every c_seed of it makes a seed. This is §O4's ⌊f_rep·N⁺/c_seed⌋ with the remainder carried over.
  - Dispersal: Laplace(0, d) [`Purpose.dispersal`], wrapped on a ring and lost beyond open sides.
  - Establishment needs start-of-season ground light ≥ Q_est·C and p_est [`Purpose.establishment`]. Two rules are added: no live trunk within one cell, and at most `maxTrees` live trees (a page safeguard).
  - Recruits are appended to `world.trees` and grow from the next season, with R1's seed reserve.
  - Breakage mortality comes through R3 (off).
- **O2** (`principles/o2-shyness.ts`), in Phase 3 before deaths:
  - The light deposits also fill an owner grid: tree id, or −2 where several trees share a cell.
  - A leafy bud sways A = k_sway·Q·h/r cells (capped at `maxSway`). Its light Q stands in for exposure.
  - If another tree's foliage lies within A in its row, the bud dies with probability p_abr [`Purpose.abrasion`].
  - The girth bonus is not built: R3's stress wood already thickens loaded wood.
- **Presets:**
  - `forest`: 10 trees on a 210-cell ring, sky presets plus f_rep 0.1 above 40 cells and O4.
  - `thinning`: 60 seedlings 3.5 cells apart on the ring, no recruitment.
  - O2 stays off everywhere (below).

## Consequences
- A dense stand thins itself: 60 seedlings fall to 17–19 survivors, with log mean wood volume against log density at slope −2.8 to −3.1. That is §10's 2D hypothesis for kept 3D cylinder mass (w ∝ ρ^−3).
  - Every planting density converges on 15–17 trees per 210 cells.
  - Size inequality peaks higher in denser stands (CV 0.61 against 0.30), as Weiner predicts.
  - Bimodality is marginal: Sarle's coefficient peaks at 0.53–0.86 against a 0.555 threshold.
- Gaps refill from seed: a canopy tree felled at season 100 draws 9 recruits within 12 cells over 40 seasons, against 3 in the kept stand (5 seeds). Over 300 seasons the canopy holds 7–8 trees while the understory turns over.
- Crown shyness emerges from light competition alone: neighbouring crowns already keep gaps (they touch in ≈ 3% of canopy rows). Abrasion only nudges this (touching 0%, median gap 47 → 57 cells, 3 seeds).
- Edge trees no longer lean outward on the ring (1.1 against 4.0 cells), and floor light under the closed canopy falls to 3.4%.
- `world.trees` can now grow during a run, so snapshots, charts and metrics carry a varying number of trees.
- Revisit if O2 gets wind events or a girth bonus, or if the page needs a seam-aware renderer.
