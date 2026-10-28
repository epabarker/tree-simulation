# 0016: Species per tree

- **Status:** accepted
- **Date:** 2026-10-27
- **Spec:** §9 (species character), §5 (global state), §6 (the season loop), §O4 (recruits). It extends ADR 0009, whose species were whole-world presets.

## Context
- **The user's plan** (2026-10-27): the home page's forest becomes a mixed forest with succession, with birch pioneers giving way to beech and oak. Plate II becomes a lone oak grown in the open. The cards give field-guide species names, and each species is calibrated on published numbers (the "species-calibrated" route: 2D, but measured rather than "looks right").
- **The obstacle:** `Params` are world-wide, so every tree in a world grows by one set of rules. M7's species (ADR 0009) are therefore separate presets, and a mixed stand is impossible.

## Decision
- **The species table:** `Params.species` is a table of named overrides, `SpeciesPatch`. Each gives the per-tree groups that differ by species: c1, c3, c4, c5, c6, r1, r2, r3, r4, r5 and r6, plus O4's per-tree quantities. Those are seed cost, dispersal distance, the light a seedling needs and its establishment chance (all read from the parent), and background mortality (read from the tree). Succession depends on them: birch seeds travel far and need open ground, while beech and oak seedlings establish in shade. A patch may also carry page-only labels: a common name, a Latin name and a leaf style.
- **Trees and recruits:** a planted tree names its species (`TreeSpec.species`). O4 recruits take their parent's species. A visitor's seedling (`plantTree`) takes the species of the nearest live tree, or one the event names.
- **Resolved params:** `World.paramsOf(tree)` merges the tree's species over the world's params, cached per species and dropped when a params event arrives. Every per-tree pass reads it: deposits, sampling, allocation, growth, shedding, girth, mechanics, abrasion and starvation.
- **What stays world-wide:** the light model (one shared field, so species compete for the same light; `c2`, including k_ext), storms, O4's cap on live trees, world geometry and the seed.
- **Golden-safe:** a tree without a species gets the world's params object itself, so every existing preset and golden is unchanged.
- **Snapshots** carry each tree's species, and the species' labels and leaf styles, for the page.

## Consequences
- **Easier:**
  - mixed stands, succession and species-specific plates;
  - calibrating each species in single-species stands and then mixing them unchanged.
- **Harder:**
  - **Shared light:** a species can't change the light model, so a darker-crowned species casts more shade only through the leaf area it deposits (r6), not through k_ext.
  - **Per-species tables:** the R2 physiological-age table (`r2.levels`) becomes per species.
- **Revisit** if species need to differ in a world-level process, such as how their foliage attenuates light (k_ext).
