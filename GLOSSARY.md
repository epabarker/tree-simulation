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

**Canopy tree**
A drawn stem taller than half the canopy height: the height that nine in ten of the stand's drawn stems do not exceed. One tall leader does not set it.
_Avoid_: dominant (a crown class), overstorey tree, tall tree.

**Gap phase**
A stretch of a stand's life when the canopy trees have died and nothing has yet grown tall enough to replace them, leaving the stand without a canopy.
_Avoid_: empty forest (that is the regression where no trees grow at all).

**Rounded crown**
A Form feature: a crown whose outline is full at the top, lying between a cone of the same width-to-height ratio and an ellipse, with its leaf spread down the crown rather than piled in a layer at the top. It is judged while the tree is still growing taller; a widening crown relative to height is one species' way of showing it, not the definition.
_Avoid_: dome (when it means only W/H), wide crown.

**Flat cap**
A dense layer of leaf on a flat top over a thinner crown below. It is the defect when it appears on a tree still growing taller; on an old tree whose height growth has stalled, a flattened top is realistic.
_Avoid_: lid (that is a closed stand's crown recession under its neighbours).

**Vigorous phase**
The part of a tree's life while its leader still extends strongly each year. The rounded crown is expected in this phase; the phases after it, as height growth stalls, flatten, thin and fragment the top.
_Avoid_: young (a tree's phase follows its growth, not its age).

**Sink limit**
A limit on how much a shoot can grow that comes from the growing tip itself, not from a shortage of carbon: the tip cannot use what the tree has made, because it lacks the water pressure to expand. Higher and farther from the root, the limit is stronger.
_Avoid_: hydraulic limit (which also names the carbon-supply reading), path-length cost.

**Bare bole**
A Form feature: a trunk clear of living limbs for a large share of its height, as beech and hornbeam grow in a closed stand, where their lower limbs die as the canopy closes above them. It is judged in the stand; an open-grown tree keeping its low limbs is not the defect.
_Avoid_: clear trunk (when dead stubs are meant too), self-pruning (that is the process, not the feature).

**Live crown base**
The height of a tree's lowest living limb, measured as a share of the tree's height. Dead stubs below it do not count.
_Avoid_: crown base (when it is unclear whether dead limbs count), bole length.
