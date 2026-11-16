# 0071: Seedling stubs outside the cap (§O4.11), off by default

- **Status:** draft (the probe's bars are fixed; the status is set by its results).
- **Spec:** §O4.4, §O4.11 ("keep seedlings as stubs until lit"), §O4.13, §6. ADRs 0063, 0065, 0068, 0070.
- **Ticket:** [#137](https://github.com/epabarker/tree-simulation/issues/137).
- **Evidence:** [the seedling-stubs probe](../experiments/2026-11-16-seedling-stubs-probe.md), bars committed before the runs.

## Context
- The garden's compute cap (`o4.maxTrees`, about 2,500/ha) holds the seedling bank as full trees, and the garden sits at it for a median 235 of 300 seasons on the desktop and 186.5 on the phone.
- Mortality cannot clear it (ADR 0068's Context), and a seed-supply cut shortens it without ending it while making seed rain less realistic (ADR 0070, rejected).
- A real bank is of order 3·10⁴/ha (Uholka, the regeneration note §3), ten times the cap. Spec §O4.11 names the representation: keep seedlings as stubs until lit.

## Decision (the design under test)
1. **A pool of counts, not trees.** The world keeps, per species, a count of seedling stubs per ground cell (floored x and z). Stubs have no metamers, take no light, take no `maxTrees` slot and are not drawn. Off unless the world's `o4.stubs` is true.
2. **Where stubs come from.** A seed inside the world that passes p_est becomes a tree only where HEAD's rule places one and its ground light reaches max(`o4.qEst`, `o4.stubLight`); otherwise (the cap full, too dark, a trunk within a cell) it joins its cell's count. With stubs on, the season no longer stops dispersing at the cap.
3. **How they die.** Each stub dies a season with min(m_stub · e^(−β_s(T − 1)), 1), `o4.stubDeath` scaled by shade tolerance as O4's suppression rate is (deficit 1: a stub is by definition unlit). [RNG purpose 22, `STUB_DEATH`.]
4. **How they become trees.** Cells holding stubs at the season's start, with no live trunk within a cell of their centre, are visited brightest first; while the cap has room, a cell lit to a species' threshold promotes one stub of the eligible species (drawn by count, [RNG purpose 23, `STUB_PROMOTION`]) to a seedling at the cell's centre next season. At most one a cell a season. Staging (spec §6): this season's seeds join after promotion.
5. **Params,** off by default and bit-identical: `o4.stubs` (the world's), `o4.stubLight` and `o4.stubDeath` (species-merged; absent 0).
6. **Checkpoints keep their bytes.** A world with an empty pool writes version 4 exactly; a non-empty pool writes version 5, the pool in the header's `stubs` table ({species: [cell, count, …]}). Versions 1–4 load with no stubs. The state hash folds the pool in only when it is not empty.

## Alternatives
- **Individual stub records** (position, species, age): O(stubs) memory with positions the counts do not need; a cell is the establishment test's own resolution (one trunk a cell).
- **Promotion in index order:** biases recruits to low x at the cap; brightest first is "until lit" read literally and needs no draw.
- **Cutting the seed supply:** ADR 0070.
- **Raising `maxTrees`:** the phone's compute cost is what the cap guards.

## Consequences
- Set by the probe's results (below).
