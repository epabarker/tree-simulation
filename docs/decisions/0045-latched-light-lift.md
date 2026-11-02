# 0045: The latched light lift: wood keeps the rise it earned when lit (r2.lightLatch, the metamers' `lit` column, checkpoint version 3)

- **Status:** proposed (beech round 2, 2026-11-02; not accepted, not adopted). Built at the user's request as Part 2's second candidate; **the 20-seed evidence is against it** (below): track E recommends it is not adopted.
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
- In a world (the test `with_the_latch_old_wood_keeps_the_rise_it_earned_when_lit`): the adopted beech alone for 60 seasons, old second-order wood 73° with the latch against 78° without. **The gain is small**, because R3 turns wood toward its set point by c·Δr/r a season (Bastien's AC model, c 0.049 for beech): the latched target reaches only young wood, whose Δr/r is still large. Old wood's level is not sag's either (below): it is the level that shaded wood was born at.
- 20-seed evidence on the adopted beech ([the diagnosis note, step 2b](../experiments/2026-11-02-beech-round2-stand-diagnosis.md)): old second-order wood 69° against 78°, and the lone tree a column again (H 151 against 120; W/H 0.83 against 1.50; the photograph band on 0 of 20 seeds against 9). The stand is byte-identical on every seed. Wood 16× stiffer (seeds 1–3) leaves the plates at 73°: sag is not their cause. The plates are ADR 0042 working as written (shaded wood born level, growing outward); the latch removes the width they gave without giving limbs that rise then arch, which would need a curve along the limb as well (ADR 0034 on the second level).

## Consequences
- A column in the tables and a checkpoint version, for a rule the evidence is against. If it is not adopted, the user chooses whether the code stays (off, documented, a zero column in every saved forest) or is reverted; the finding stands either way.
- The plates' level is neither posture's target nor sag (wood 16× stiffer leaves them at 73°): it is ADR 0042 working as written, shaded second-order wood born level and growing outward. A dome of limbs that rise then arch would need the kept lift *and* a curve along the limb (ADR 0034's `curve` on the second level), a third candidate outside round 2.
- **Tests:** `the_latched_fraction_is_the_lights_clamped_term_and_sets_the_same_point` (R2), `with_the_latch_old_wood_keeps_the_rise_it_earned_when_lit` (R3, a world), `a_version_2_checkpoint_loads_with_lit_zero_and_grows_on_as_version_3_does` (checkpoint).
