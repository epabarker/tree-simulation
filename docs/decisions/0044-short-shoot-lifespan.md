# 0044: A lifespan for short shoots (r6.lifespan)

- **Status:** proposed (beech round 2, 2026-11-02; not accepted, not adopted). The user chose to build it alongside a renderer rule; adopting it for any species is the user's decision, because it moves the stand's floor and leaf area.
- **Date:** 2026-11-02
- **Spec:** §R6 (short shoots), §R4 (dormant buds' lifespan, L_dorm), §C5 (shedding)
- **Round:** [the brief](../plans/2026-11-02-beech-round2.md), Part 2; [the diagnosis](../experiments/2026-11-02-beech-round2-stand-diagnosis.md)

## Context
The real-renderer blind test named the beech stand at 100 lime ("pale grey stems with leafy sprouts"), and so for today's beech and the accepted build alike. In the stand at 100 (20 seeds), 97% of the leaf below a tree's limb crown base is on R6 short shoots, and 55–63% of it sits on buds of the trunk's own metamers. Such a short shoot cannot end:
- R6 sheds a short shoot only with its branch (§R6.4, ADR 0006), and the trunk is not a branch;
- R4's lifespan counts only the seasons a bud rests dormant, and a leafy short shoot does not age;
- its light (14–17% of the tree's top) is far above beech's Q_ss (0.0126) and T_rel (0.008).

So every trunk node that rested as a short shoot while the stem was young keeps 2.47 leaf units a year for as long as the tree lives. The garden's renderer draws two rosettes on each.

## Decision (proposed)
With `r6.lifespan` = L, a bud that would rest as a short shoot on a metamer whose wood is older than L seasons rests as a leafless dormant bud instead (`r6::outlived`, called in `grow_buds` right after `resting_state`). R4 then ages it like any dormant bud: it aborts after L_dorm, or is released if R4's light release fires first. A short shoot that receives v ≥ 1 still grows a long shoot, whatever its wood's age.
- The clock is the wood's age, not the short shoot's own, because the core keeps no birth season per bud state. On the bole the two are nearly the same: a short shoot forms in its node's first seasons, or not at all.
- Absent (the default): off, and the core is bit-identical. Every golden is unchanged.

## Botanical basis
- Short shoots have finite lives, and on a thickening stem the bark buries them. Beech's short and long shoots are well described (spec §R6; Jarčuška et al. 2012, as cited there).
- No measured lifespan for a beech short shoot was found in this session's searches. Short shoots are hard to age: their bud-scale scars are overgrown, and ring counting fails ([a Springer book chapter on shoot growth](https://link.springer.com/content/pdf/10.1007/978-3-319-73524-5_6.pdf), found by search and not read here).
- **The values tested here (10, 20, 40 seasons) are exploratory.** Track A should source one before any value is adopted.

## Consequences
- **It is general:** any species with R6 on can set it. Set for beech only in the trial runs; no species sets it.
- **It removes leaf where it is lowest and oldest:** the stand's boles, and older wood inside every crown. The floor and LAI move, so the ecology guard decides, at 20 seeds.
- **Tests:**
  - `a_short_shoot_on_wood_older_than_its_lifespan_ends` (the rule);
  - `with_a_lifespan_no_short_shoot_rests_on_old_wood` (in a world, 40 seasons).
