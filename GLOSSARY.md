# Glossary

Terms of the tree simulation's domain. Definitions only; the design is in `docs/spec.md`, the decisions in `docs/decisions/`.

**World effect**
A cause of a tree's form that comes from the setting rather than the tree: how light enters the slab (from above, front, back, edges), the slab's depth and boundaries, the stand's density and the timing of seeding.
_Avoid_: environment bug, setting issue.

**Form feature**
A recognisable trait of a tree's shape that emerges from local principles and can appear in many species: a rounded crown, a bare bole, a flat cap. Each has a mechanism (the principles and world conditions that produce it) and a way to see it.
_Avoid_: look, characteristic (too vague).

**Species expression**
How one species shows a form feature: the parameter settings that turn a feature on, off or up for that species, judged against how the real species looks. A species is a set of expressions, not a free fit.
_Avoid_: calibration target, species fit.

**Side light**
Light that reaches a bud through the slab's front, back or edges rather than down through the canopy above it. It is part of the world, the same for every species in it; species differ only in how they respond to it.
_Avoid_: face light, edge glow.

**Open-grown**
A tree with nothing around it in any direction: open sky on all four sides, and room for its crown to spread without meeting the world's bounds. The lone tree in the lab is open-grown; a tree at a wood's edge is not.
_Avoid_: lone (when the sides are walled), free-standing.

**Seedling bank**
The young trees that have established but are still below the display threshold: alive and growing, waiting under the canopy for a gap, and not yet part of the stand a visitor sees.
_Avoid_: undergrowth, recruits (which also covers those above the threshold).

**Display threshold**
The height a young tree must pass to be drawn and counted as a stem of the stand: 1.3 m, the forestry convention for counting a stem.
_Avoid_: visibility cut-off.

**Gap phase**
A stretch of a stand's life when the canopy trees have died and nothing has yet grown tall enough to replace them, leaving the stand without a canopy.
_Avoid_: empty forest (that is the regression where no trees grow at all).
