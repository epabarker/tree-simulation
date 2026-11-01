# 0042: Light orthotropy: lit wood of a vigorous tree is held erect (r2.lightSetPoint, lightLo, lightHi, lightOver)

- **Status:** proposed (the fresh-look beech round, repair, 2026-11-01; not accepted, not adopted)
- **Date:** 2026-11-01
- **Spec:** §R2 (set point by physiological age), §C4 (growth direction), §R3 (posture)
- **Round:** [the ledger](../experiments/code/2026-11-01-fresh-look-beech/notes.md), Repair; [the review](../experiments/2026-11-01-fresh-look-beech-review.md)

## Context
The solver's lone beech read as a cedar of Lebanon: its width was level pa-2 fans (set point 94.6°) reaching up to 80 cells out from a narrow, steep scaffold, at 93–97° at every height and wood age. Lowering pa 2's set point everywhere broke the stand (LAI 9.7–10.2, 9 of 12 alive); light alone, ungated, raised the stand's LAI to 9–10. Only the vigour gate (ADR 0041) told lone from stand.

## Decision (proposed)
For wood of pa ≥ 1, the set point (degrees from vertical) in growth (C4, from the bud's light) and in posture (R3, from C5's light per metamer of the subtree; this season's new wood takes its parent's) moves from its level's own value toward `lightSetPoint` by

u = g·clamp((Q − `lightLo`) / (`lightHi` − `lightLo`))·min(1, (wood age + 1) / `lightOver`),

with g ADR 0041's vigour gate (1 when its bounds are unset). This season's shoot spreads near its level's angle and its base rises over `lightOver` seasons; shaded wood stays at its level's angle. The trunk and its relays (pa 0) are untouched. Absent: off, and the core is bit-identical (the light array is not built and the set point is returned unchanged).

**Botanical basis.** Nicolini & Caraglio 1994 [r]: vertical lateral axes are more frequent in full light (0.18–0.45) than in shade (0.03–0.1). Nicolini 2000, abstract [s]: axes of trees "very young or under dense cover" are plagiotropic with a flat crown, those of vigorous trees orthotropic. Troll's model (Pfisterer 2000 [r]; Hallé et al. 1978): the trunk is built by secondary straightening of the bases of plagiotropic axes, here extended from the trunk to every lit limb on a vigorous tree, which is the round's step, not the source's.

Beech's proposed values: lightSetPoint 35, lightLo 0.2, lightHi 0.8, lightOver 3, with ADR 0041's gate 3000–10000.

## Consequences
- **Generic,** with the same absolute-unit gate as ADR 0041.
- **It makes the tree taller:** the repair's lone beech is 133–143 cells at 100 (33–36 m) against the solver's 96–99 and an open-grown beech's ≈ 20 m (the card).
- **Present but inactive is not bit-identical to absent.** With `lightSetPoint` set and u = 0 (shaded wood, or a tree under the gate), R3 still converts the posture set point to degrees and back, which can change its last bit. Found in review (beech's lone tree with the rule present and inactive diverges from beech with it absent; the stand happened not to). Absent stays bit-identical; skipping the round trip when u = 0 would make present-but-inactive identical too, at the cost of a new realisation for the repair's beech.
- **Tests:** `lit_wood_of_a_vigorous_tree_rises_and_shaded_wood_stays_level` (the rule). R3's use of it has no test of its own.
