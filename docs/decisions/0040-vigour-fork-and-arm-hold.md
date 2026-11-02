# 0040: The vigour fork, and fork arms that hold their angle (r2.forkAt, r2.forkAngle)

- **Status:** accepted (the user, 2026-11-02), for beech at the fresh-look repair's values without own-crown pruning ([ADR 0043](0043-own-crown-pruning.md), rejected); proposed 2026-11-01. Beech takes it in the garden when `claude/beech-overnight` merges into `3d-port`.
- **Date:** 2026-11-01
- **Spec:** §R2 (relay, ADR 0033; physiological age), §C4 (set point), §R3 (posture)
- **Round:** [the ledger](../experiments/code/2026-11-01-fresh-look-beech/notes.md), Proposal C and Solver decision; [the review](../experiments/2026-11-01-fresh-look-beech-review.md)

## Context
Proposal C instrumented the open-grown beech's leader: from about season 25 to 80 its bud receives v ≈ 2.7–4.1 against a shoot cap of 3 (`c1.maxMetamersPerShoot`). It grows the full shoot every year and the surplus has no outlet but height, which is why no λ or set-point fit changed the kind of tree. ADR 0033's relay arms are also straightened to vertical by the trunk's posture set point (pa 0, postureSetPoint 0), so a relay builds a column of parallel stems rather than a crown.

## Decision
1. **The vigour fork.** A pa-0 shoot whose bud received v ≥ `forkAt`·`c1.maxMetamersPerShoot` ends its apex (its new main bud is set TERMINATED, in `grow_buds`, right after `grow_shoot`), provided the relay is on, the tree is at least `relayAge`, and the juvenile cap no longer holds the shoot below its full length. The relay then makes the laterals on the shoot's top `relay` nodes pa-0 arms. With `forkAngle`, those laterals are re-aimed to that angle from the shoot's heading at fork time.
2. **The arm hold.** With the fork on, every pa-0 axis that is not the trunk's own takes, as its growth set point (C4) and its posture set point (R3), the inclination of its axis's first metamer (found by binary search on `birth_id`), plus ADR 0034's curve; a new arm from a lateral bud takes its bud's inclination. The trunk is straightened as before.

Both are off when `forkAt` is 0 or absent; the core is then bit-identical. No randomness, no new state.

**Botanical basis.** Nicolini & Caraglio 1994 [r]: forks at the highest growth rates; polycyclic shoots 51% in light against 14% in shade, the vigour a real beech spends on polycyclism and forks. Troll, *Fagus* type (Pfisterer 2000 [r]): "all axes develop plagiotropically", only the trunk's base straightened, which is the arm hold. The photograph note (`references-beech.md` §1): each fork gives two near-equal axes. The threshold (1.3 × the full shoot) is a choice, not a measurement.

## Consequences
- **Generic:** any species with the relay can set `forkAt`.
- **Its effect is in the stand, not the lone tree.** The solver found it never fires on the lone tree once ADR 0041's vigour drop is on (the leader's v falls to 1–2.4); in the stand it forks 4 of 36 leaders near season 26 and shapes the stand's tops. Without it the stand failed the guard (floor 5.4% on seed 1, crown ratio 0.22).
- **The threshold sits on a cliff** (Proposal C): first forks at forkAt 1.3 in about 4 of 36 stand trees, 1.2 in 14, 1.1 in 31; at ≤ 1.0 without an age gate the stand breaks (7–10 alive).
- **The hold drifts down.** The arm's set point is its base's *current* inclination, which sag and posture also move, so each season's set point is where last season's sag left it: a ratchet that can only lower an arm. A stored birth angle would be stricter, at the cost of a per-axis column and a checkpoint version.
- **Cost:** a binary search per arm metamer in R3, O(n log n).
- **Tests:** `forks_a_leader_only_at_full_vigour_with_the_relay_on`, `a_leader_grown_at_full_vigour_ends_and_its_top_laterals_leave_at_the_fork_angle`, `an_arm_holds_the_inclination_of_its_base_and_the_trunk_does_not`.

## Outcome (2026-11-02)
Accepted with ADRs 0039–0042 as one set for beech, without ADR 0043: the review's 20-seed evidence ([review §7](../experiments/2026-11-01-fresh-look-beech-review.md)) and the overnight comparison of five configurations ([overnight §2c](../experiments/2026-11-02-beech-overnight.md)) found the repair without own-crown pruning the best of five. The ecology guard held on 8 of 20 seeds (today's beech: 6); the lone tree at 100 is 120 cells, W/H 1.50, with 8.4% of its leaf below H/6 (today's: 203, 0.43, 23.5%). In the garden's renderer the round's lone beech was named beech on 18 of 18 plates by three blind namers (today's: 9 of 18), drawn with own-crown pruning on; the stand was named beech by one namer of three, as today's was. The vigour gate stays in resource units (3000–10000): a unit-free gate by R5's neighbour shade was prototyped (commit 219a002, removed) and was no better once own-crown pruning was off. Its absolute units are a maintenance risk: revisit them if α, R1's costs or the cell size change. The goldens `beechOpen:seed1:s40` and `beechWood:seed1:s30` exercise the rule.
