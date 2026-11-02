# 0045: The latched light lift: wood keeps the rise it earned when lit (r2.lightLatch, the metamers' `lit` column, checkpoint version 3)

- **Status:** proposed (beech round 2, 2026-11-02; not accepted, not adopted). Built at the user's request as Part 2's second candidate.
- **Date:** 2026-11-02
- **Spec:** §R3 (posture), §R2 (set point by physiological age), ADR 0042 (light orthotropy)
- **Round:** [the brief](../plans/2026-11-02-beech-round2.md), Part 2; [the diagnosis, step 1b](../experiments/2026-11-02-beech-round2-stand-diagnosis.md)

## Context
Under a realistic bark the lone beech reads as oak (blind test v3, sets 3–4: "stout spreading limbs", "layered clumps"). The diagnosis measured why: the first-order scaffold rises at 36°, but the old second-order wood inside the crown is level (77°) while the lit young shoots at the surface stand at 48°. ADR 0042 re-reads the light every season, so once the crown closes over a limb its light falls below `lightLo`, its set point returns to its level's 94.6°, and R3 postures it back toward level. The ADR's own intent (Troll's model: the base of a plagiotropic axis straightens and stays straight) is the reverse. Wood that has straightened does not bend back when it is later shaded.

## Decision (proposed)
- **A per-metamer column `lit`** (f64, last in `Metamers`): the largest light fraction, clamp((q − lightLo)/(lightHi − lightLo)), the metamer has seen in R3's posture pass (this season's new wood takes its parent's, as ADR 0042 does).
- **With `r2.lightLatch` true**, posture passes that latched fraction to ADR 0042's rule in place of this season's (`lit_set_point`), so the target it earned when lit is kept. Growth is unchanged: a new shoot still takes its own bud's light.
- **Off (the default):** the column is never written and the light is re-read every season, as ADR 0042 says. Bit-identical.
- **The goldens:** `hash.rs` hashes `lit` only when it holds a non-zero value, as ADR 0011 did for `stressWood` and `moment` in 2D, so every golden made before the column holds; a build with the latch on hashes it.
- **Checkpoints go to version 3** (`checkpoint.rs`): version 2 bytes load with `lit` zero (no forest saved before the column had the latch), version 1 as before. The TS schema (`METAMER_SCHEMA`) gains `lit` last, where the page reads tables by index.

## What it does, measured
- In a world (the test `with_the_latch_old_wood_keeps_the_rise_it_earned_when_lit`): the adopted beech alone for 60 seasons, old second-order wood 73° with the latch against 78° without. **The gain is small**, because R3 turns wood toward its set point by c·Δr/r a season (Bastien's AC model, c 0.049 for beech): the latched target reaches only young wood, whose Δr/r is still large. Old wood's level is set by sag.
- 20-seed evidence: see Evidence below (filled when the runs finish).

## Consequences
- A column in the tables and a checkpoint version, for a rule whose effect posture cannot deliver at the model's girth. The honest reading of the diagnosis is that the plates are level because thin wood sags (sag goes as 1/(E·r⁴), and ADR 0027's radii are about half a real stand's): the lever is the girth model, not the set point.
- **Tests:** `the_latched_fraction_is_the_lights_clamped_term_and_sets_the_same_point` (R2), `with_the_latch_old_wood_keeps_the_rise_it_earned_when_lit` (R3, a world), `a_version_2_checkpoint_loads_with_lit_zero_and_grows_on_as_version_3_does` (checkpoint).
