# 0041: The vigour drop: weak wood of a vigorous tree loses apical control (r2.vigourShare, vigourLambda, vigourTreeLo/Hi)

- **Status:** accepted (the user, 2026-11-02), for beech at the fresh-look repair's values without own-crown pruning ([ADR 0043](0043-own-crown-pruning.md), rejected); proposed 2026-11-01. Beech takes it in the garden when `claude/beech-overnight` merges into `3d-port`.
- **Date:** 2026-11-01
- **Spec:** §C3 (Borchert–Honda allocation, λ), §R2 (λ by physiological age and ontogeny)
- **Round:** [the ledger](../experiments/code/2026-11-01-fresh-look-beech/notes.md), Proposal B and Solver decision; [the review](../experiments/2026-11-01-fresh-look-beech-review.md)

## Context
Proposal B found one signal that separates an open-grown crown from a stand member of the same age: the tree's resource v_base, ≈ 17,000–19,000 for the lone beech against ≤ 1,650 for the stand's dominants. Apical control itself is a cliff: R2's ontogenetic dλ at 0.05 turns the lone tower into a mound but also flattens the stand into a lid (floor 1.1%, LAI 11.7).

## Decision
In C3's Borchert–Honda pass, a node's λ falls by g·(1 − u)·`vigourLambda`, where
- u = min(1, (v_in / v_base) / `vigourShare`) is the node's share of its tree's resource (1 at and above the share), and
- g = clamp((v_base − `vigourTreeLo`) / (`vigourTreeHi` − `vigourTreeLo`)) is the tree's own vigour gate (1 when neither bound is set).

So the weak wood of a tree whose whole production is large loses apical control and the top divides into near-equal limbs; a stand member below `vigourTreeLo` is untouched. Off when `vigourShare` is 0 or `vigourLambda` is 0; the core is then bit-identical (the gate is not computed).

**Botanical basis, and how far it goes.** Troll [r]: "aged crowns usually are polyarchic"; Nicolini & Caraglio 1994 [r]: forks at the extremes of growth rate. These say *that* a vigorous open crown divides. *That it does so through weaker apical control in the wood carrying a small share of the tree's flow* is the round's inference, not a cited mechanism.

Beech's proposed values: vigourShare 0.3, vigourLambda 0.03, vigourTreeLo/Hi 3000/10000.

## Consequences
- **Generic,** but **the gate is in absolute resource units.** It must be re-set whenever α, R1's costs, the leaf cost (ADR 0032) or the cell size change, and it is not comparable between species. A beech at a wood edge or in a gap, with v_base between the bounds, gets a partial response (the review's garden check looks at this).
- **It is the part that makes the open-grown crown broad:** without it the solver's lone tree at 100 is a block or column (W/H 0.68–1.11), with it a broad mass (1.48–1.65 at the 160 world).
- **λ is a cliff;** 0.03 at g = 1 is near it.
- **ADR 0042 (light orthotropy) and ADR 0043 (own-crown pruning) reuse the same gate,** so `vigourTreeLo/Hi` set three rules at once, one of them in C5.
- **Tests:** `weak_wood_of_a_vigorous_tree_loses_apical_control` (R2), `a_vigorous_tree_gives_its_weak_wood_less_apical_control` (C3).

## Outcome (2026-11-02)
Accepted with ADRs 0039–0042 as one set for beech, without ADR 0043: the review's 20-seed evidence ([review §7](../experiments/2026-11-01-fresh-look-beech-review.md)) and the overnight comparison of five configurations ([overnight §2c](../experiments/2026-11-02-beech-overnight.md)) found the repair without own-crown pruning the best of five. The ecology guard held on 8 of 20 seeds (today's beech: 6); the lone tree at 100 is 120 cells, W/H 1.50, with 8.4% of its leaf below H/6 (today's: 203, 0.43, 23.5%). In the garden's renderer the round's lone beech was named beech on 18 of 18 plates by three blind namers (today's: 9 of 18), drawn with own-crown pruning on; the stand was named beech by one namer of three, as today's was. The vigour gate stays in resource units (3000–10000): a unit-free gate by R5's neighbour shade was prototyped (commit 219a002, removed) and was no better once own-crown pruning was off. Its absolute units are a maintenance risk: revisit them if α, R1's costs or the cell size change. The goldens `beechOpen:seed1:s40` and `beechWood:seed1:s30` exercise the rule.

Proposal B's ≤ 1,650 for the stand's dominants did not hold at 20 seeds: the stand's largest v_base is 2,409–3,020, so on some seeds the gate opens slightly on the stand's oldest dominants ([review §2](../experiments/2026-11-01-fresh-look-beech-review.md)).
