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
Sources found and read by the user, 2026-11-02: the German forestry texts in full, the papers from their abstracts. Roloff 1988, Nicolini 2001 and Thiébaut's chapter in *Le Hêtre* (the likeliest places for chain-age counts) were not open to them.

- **Lifespan: about 10–15 years, rarely more.**
  - A beech short shoot keeps only its end bud and extends from it each year without branching, building an unbranched chain that is commonly 10–15 years old (Aas, *Die Rotbuche*, LWF Wissen 86).
  - Chains wait up to 15 years in poor conditions (shade, drought) and form long shoots again if conditions improve (AFZ-DerWald 4/2022, *Baum des Jahres: Die Rotbuche*).
  - Fine twigs in the beech upper crown are shed from a shoot age of about 10–15 years, whatever the tree's vigour (Roloff 1988, *Flora*, abstract).
  - No chain of 20+ years was reported. None of these is a demography study.
- **Age and light both act.** Roloff's shedding is independent of vigour, which suggests a built-in limit. Shoot death across temperate species is mainly self-shading, and late-successional species such as beech keep their shoots longest (Seiwa et al. 2005). In birch, a shoot's chance of dying rises with age and falls with light (Umeki et al. 2006). Short shoots conduct water poorly (Cochard et al. 2005), a possible cause of an age limit (the user's inference).
- **A clean bole is right for the stand.** In the forest, beech loses its lower branches early and the crown often begins 10–20 m up (de.wikipedia, *Rotbuche*). Fast diameter growth suppresses trunk epicormics (Colin et al. 2012). Heavy epicormic cover belongs to suppressed understorey trees (Nicolini et al. 2001). In thinned stands most trees carry one to five epicormic branches (Fortu 2023).
- **How the rule maps onto this:**
  - The cap is the hard age limit: about 15 by the sources.
  - Light already acts through Q_ss: a short shoot below it rests dormant.
  - A spur that receives vigour already grows a long shoot (§R6.4).
  - A dormant bud left by the cap can be released by R4's light release.
  - A soft limit (a yearly death chance rising with age and shade) would be closer to the birch data; it is left for later.
- **The clock is the wood's age, not the chain's.** A spur that formed later on old wood, from a dormant bud, ends sooner than its own age would say. On the bole, where the problem is, the two agree.

## Consequences
- **It is general:** any species with R6 on can set it. Set for beech only in the trial runs; no species sets it.
- **It removes leaf where it is lowest and oldest:** the stand's boles, and older wood inside every crown. The floor and LAI move, so the ecology guard decides, at 20 seeds.
- **Tests:**
  - `a_short_shoot_on_wood_older_than_its_lifespan_ends` (the rule);
  - `with_a_lifespan_no_short_shoot_rests_on_old_wood` (in a world, 40 seasons).

## Evidence (beech, 20 seeds, 2026-11-02)
[The diagnosis note, step 2](../experiments/2026-11-02-beech-round2-stand-diagnosis.md):

| | accepted | L 40 | L 20 | L 10 |
|---|---|---|---|---|
| ecology guard passes | 8 of 20 | 12 | 11 | 0 |
| stand LAI, median | 7.9 | 7.7 | 7.0 | 5.35 |
| leaf on the stand's trunks | 63% of the low leaf | 0 | 0 | 0 |
| lone tree's leaf below H/6 | 8.4% | 6.7% | 6.7% | 7.8% |

- L 20–40 clears the trunks and brings LAI into band.
- L 10 thins the crowns themselves.
- What remains low at L 40 is mostly R4's released shoots.
- **Recommendation, if adopted:** the sourced value is about 15. Its 20-seed evidence decides between 15 and 20 (L 10 thinned the crowns; L 20 passed).
