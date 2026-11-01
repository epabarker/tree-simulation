# Beech: the reviewer's checklist

Scored by a fresh reviewer from the renders and this list only, with no account of what changed.
Each cue is scored 0 (absent), 1 (present but weak or inconsistent across seeds), 2 (clear on 2 of
3 seeds). A setting passes at 8 of 12 with no 0 on cues 1–3. The stand at 100 is scored first and
weighs most; the lone tree at 60 and 100 after.

| # | cue (from the identity card) | stand at 100 | lone at 60 | lone at 100 |
|---|---|---|---|---|
| 1 | **No tiers, no pointed top.** The crown outline is a dome or a rounded mass, not a cone with regular level layers. (A tiered cone reads as spruce or fir.) | | | |
| 2 | **Limbs rise then arch.** Main limbs leave the trunk steeply and bend over along their length; several limbs of similar thickness, the trunk lost in the crown with age. | | | |
| 3 | **Dense, opaque foliage** at the crown; no see-through lid. | | | |
| 4 | **Level sprays**: foliage in flat, roughly horizontal plates or layers within the crown, not in tufts or hanging curtains. | | | |
| 5 | **Stand proportion**: a tall clean bole with the crown about the top half (crown ratio ≈ 0.4–0.55), limbs steep in the stand. | | — | — |
| 6 | **Open-grown proportion**: broad, W/H in the region of 0.6–1.0 at 60–100, low branches kept. | — | | |

Then the **confusion test**: is it, at a glance, more like a beech than like (a) a spruce or fir,
(b) a hornbeam, (c) an oak? Answer each with the one feature that decides it.

Then the **ecology guard**, from metrics.json: alive ≥ 10 of 12 at 100; floor 3–5%; LAI about 7;
H/D 70–110; any breach is a fail regardless of the score.

Record the scores and the confusion answers under "Review" in notes.md, then the repair
instructions if any cue scored 0 or 1: name the cue, what in the picture fails it, and what kind
of change (growth rule, renderer, parameter of a new rule) would address it, without prescribing
the implementation.
