# 0072: Seedling stubs outside the cap (§O4.11), read both ways; built off by default

- **Status:** proposed (the probe's arm s3d passes every pre-registered gate and bar, seeds 1–20 at both widths). Built and off by default; adopting it as the garden's default is the user's call.
- **Spec:** §O4.4, §O4.11 ("keep seedlings as stubs until lit"), §O4.13, §6. ADRs 0063, 0065, 0068, 0070.
- **Ticket:** [#137](https://github.com/epabarker/tree-simulation/issues/137).
- **Evidence:** [the seedling-stubs probe](../experiments/2026-11-16-seedling-stubs-probe.md), bars committed before the runs (0630ce6), the demotion arms in an addendum committed before theirs (b419a73).

## Context
- The garden's compute cap (`o4.maxTrees`, about 2,500/ha) holds the seedling bank as full trees, and the garden sits at it for a median 235 of 300 seasons on the desktop and 186.5 on the phone.
- Mortality cannot clear it (ADR 0068's Context), and a seed-supply cut shortens it without ending it while making seed rain less realistic (ADR 0070, rejected).
- A real bank is of order 3·10⁴/ha (Uholka, the regeneration note §3), ten times the cap. Spec §O4.11 names the representation: keep seedlings as stubs until lit.

## Decision
1. **A pool of counts, not trees.** The world keeps, per species, a count of seedling stubs per ground cell (floored x and z). Stubs have no metamers, take no light, take no `maxTrees` slot and are not drawn. Off unless the world's `o4.stubs` is true.
2. **Where stubs come from.** A seed inside the world that passes p_est becomes a tree only where HEAD's rule places one and its ground light reaches max(`o4.qEst`, `o4.stubLight`); otherwise (the cap full, too dark, a trunk within a cell) it joins its cell's count. With stubs on, the season no longer stops dispersing at the cap.
3. **How they die.** Each stub dies a season with min(m_stub · e^(−β_s(T − 1)), 1), `o4.stubDeath` scaled by shade tolerance as O4's suppression rate is (deficit 1: a stub is by definition unlit). [RNG purpose 22, `STUB_DEATH`.]
4. **How they become trees.** Cells holding stubs at the season's start, with no live trunk within a cell of their centre, are visited brightest first; while the cap has room, a cell lit to a species' threshold promotes one stub of the eligible species (drawn by count, [RNG purpose 23, `STUB_PROMOTION`]) to a seedling at the cell's centre next season. At most one a cell a season. Staging (spec §6): this season's seeds join after promotion.
5. **How trees become stubs again** ("until lit" read both ways; the probe's addendum). After promotion, each live tree of age ≥ 1 below the display threshold whose crown-top light Q_top/C is below `o4.stubDemote` leaves the stand and joins its root cell's count. Without this the pool cannot end the cap: a promoted tree later shaded stays a full tree, and the full-tree bank re-forms (arms s1, s3, s1q10).
6. **Params,** off by default and bit-identical: `o4.stubs` (the world's), `o4.stubLight`, `o4.stubDeath` and `o4.stubDemote` (species-merged; absent 0). The probe's pick, s3d: `stubLight` 0.15 (ADR 0068's θ_hi), `stubDeath` 3, `stubDemote` 0.075.
7. **Checkpoints keep their bytes.** A world with an empty pool writes version 4 exactly; a non-empty pool writes version 5, the pool in the header's `stubs` table ({species: [cell, count, …]}). Versions 1–4 load with no stubs. The state hash folds the pool in only when it is not empty.
8. **Turning stubs off** by a params patch leaves the pool as it is (frozen: no deaths, no promotion), still hashed and saved; turning them on again resumes it.

## Alternatives
- **Stubs one way only** (no demotion): probed, the cap moves by 8 seasons (s3).
- **Individual stub records** (position, species, age): O(stubs) memory with positions the counts do not need; a cell is the establishment test's own resolution (one trunk a cell).
- **Promotion in index order:** biases recruits to low x at the cap; brightest first is "until lit" read literally and needs no draw.
- **Cutting the seed supply:** ADR 0070.
- **Raising `maxTrees`:** the phone's compute cost is what the cap guards.

## Consequences
- **Now:** nothing changes by default: goldens, regressions, presets and lone hashes are HEAD's.
- **s3d's evidence** (seeds 1–20): cap seasons 235 → 79.5 (desktop) and 186.5 → 11 (phone), below head in 20 of 20 runs at both widths; canopy trees/ha 109 (head's); hornbeam in all 60 desktop canopy frames; #122's gates 20/20 and 19/20; the pool 4.8·10⁴/ha (desktop) and 6.7·10⁴ (phone), 90% hornbeam; drawn stems 1,297 → 657/ha.
- **The cost is churn:** recruits 1,016 → 7,756 a desktop run, most promoted only to be returned; a season costs 1.24× head's on the desktop and 1.16× on the phone (bar 1.25 on the phone). A demotion that waits k dark seasons would cut it but needs a per-tree counter (checkpoint state).
- **If adopted:** `forestParams` gains s3d's params and `rust/presets.json` is regenerated; the garden goldens and phoneSeed3's regression vector are re-baselined with a devlog reason; spec §O4.4/§O4.11 name the rule; a page that saves a garden writes version 5, so a host must ship the matching core; the phone is looked at in the browser.
