# The seedling-stubs probe: §O4.11's "keep seedlings as stubs until lit" against the cap (2026-11-16)

**Ticket:** [#137](https://github.com/epabarker/tree-simulation/issues/137) (ADR 0068, decision 4; ADR 0070 rejected the seed-supply cut). Spec §O4.4, §O4.11, §O4.13, §6, §10; ADRs 0063, 0065, 0068, 0070; the draft [ADR 0071](../decisions/0071-seedling-stubs.md).

**Question.** If seeds that land where a tree cannot stand (the cap is full, the ground is not lit enough, or a trunk is in the way) join a per-cell count of seedling stubs outside `maxTrees`, and a stub becomes a tree only where its cell is lit and the cap has room, does the garden spend far fewer seasons at its compute cap, while #122's canopy gates, the canopy's trees and hornbeam's place in the canopy hold, and does the stub pool reach the order of a real seedling bank (3·10⁴/ha, Uholka: the regeneration note §3)?

**Script:** [`cli/seedling-stubs-probe.ts`](../../cli/seedling-stubs-probe.ts) (`node cli/seedling-stubs-probe.ts --seeds 1-3 -j 6` for the pilot, then `--arms head,<arms>` for seeds 1–20; resumable).

## The rule (ADR 0071's design)

Off by default (`o4.stubs` absent or false): the code path, the goldens, the regressions and the checkpoint bytes are HEAD's. On (the world's `o4.stubs: true`), in O4's phase 3 (spec §6), after the trees' deaths:

1. **The pool.** The world keeps, per species, a count of stubs per ground cell (x and z floored; 0.25 m × 0.25 m). Stubs are not trees: no metamers, no light, no `maxTrees` slot, not drawn.
2. **Stub deaths.** Each stub that began the season dies with p = min(m_stub · e^(−β_s(T − 1)), 1): `o4.stubDeath` m_stub (species-merged; absent 0) scaled by the species' shade tolerance T and slope β_s as O4's suppression rate is (`tolerance_scaled` with deficit 1). [RNG: stubDeath, keyed by the cell, the species and the stub's index in the cell's count.] At m_stub 1 this is hornbeam 0.065, beech 0.038, maple 0.13, birch 0.39 a season.
3. **Promotion.** The cells that held stubs at the season's start, with no live trunk within one cell of the cell's centre, are visited brightest first (ground light at the centre, y 0.5; ties by cell index). While the cap has room, a cell whose light reaches a stub species' threshold max(`o4.qEst`, `o4.stubLight`) promotes one of them, the species drawn in proportion to the eligible counts [RNG: stubPromotion, keyed by the cell], to a seedling planted at the cell's centre next season (as an established seed is). At most one a cell a season.
4. **Seeds.** Dispersal and seed rain draw as now. A seed inside the world that passes p_est becomes a tree where HEAD's rule would place one *and* its light reaches max(`qEst`, `stubLight`); otherwise (the cap full, too dark, a trunk within a cell) it joins its cell's stub count. A seed that fails p_est is lost, as now. With stubs on the season no longer stops at the cap: every parent's pool is turned into seeds.
5. **State.** The pool is saved in checkpoints as version 5 (a `stubs` table in the header) only when it is not empty; a world with no stubs writes version 4's bytes. Versions 1–4 load with no stubs. The state hash folds the pool in only when it is not empty.

The CLI writes `stubs.csv` (season, species, stubs) when stubs are on.

## Bars, fixed before the runs

Written and committed before any run of this note. Nothing below this section changes them.

### Arms
- **head:** `forestParams(width, seed)` at this commit (r6's garden).
- **s1:** `o4: {stubs: true, stubLight: 0.15, stubDeath: 1}` (world params). 0.15 is ADR 0068's ceiling θ_hi and d1's θ_q: the top light above which no tree is suppressed, read here as "lit".
- **s3:** as s1 with `stubDeath: 3` (hornbeam 0.20, beech 0.11, birch 1 a season): the death-rate bracket.
- **s1q10:** as s1 with `stubLight: 0.10`: a pilot-only light bracket, run to 20 seeds only if s1 fails the pilot and it passes.
- Widths 160 and 66, 300 seasons, natively, metamers kept at seasons 100, 200 and 300 (`--snapshots`).
- **Pilot:** seeds 1–3, every arm. **Then seeds 1–20** for head and every arm whose pilot passes: gates 3 of 3 at both widths, cap seasons below head's in at least 2 of 3 runs at each width, hornbeam in the canopy in at least 5 of 9 desktop frames. The bars are judged only on seeds 1–20. At most 6 simulators.

### Definitions (as the seed-supply probe's)
- **A canopy tree:** drawn (≥ 1.3 m) and strictly over half the top height (stand.csv `topHeight100`).
- **Seasons at the cap:** run.json `meta.capSeasons` (live trees ≥ `maxTrees`; stubs are not trees and do not count).
- **Per hectare:** n / ha, ha = width × 64 × 0.0625 m² / 10⁴ (0.064 at 160 cells, 0.0264 at 66).
- **The bank:** live trees under 1.3 m at a frame. **The stub pool:** stubs.csv's sum over species at a frame.
- **Frames:** seasons 100, 200 and 300 × 20 seeds = 60 per arm × width.

### Gates (#122; each ≥ 18 of seeds 1–20, per arm × width)
1. A canopy tree in every season after 50.
2. At 66 cells, a canopy tree in every season from 100.
3. **Checkpoints.** (a) The frozen fixtures (v2, v3, garden 0.14.0) load with no stubs, and grow 10 seasons alike twice under the arm's params set by `setParams`. (b) A garden checkpoint saved by this build under the arm's params (`forestParams(66, 1)`, 30 seasons) round-trips: the loaded world's hash and stub pool equal the saved world's, and 10 more seasons give the hash the unbroken world reaches. (c) Under head's params the checkpoint's bytes are version 4's.
4. Lone hornbeam (`loneTreeParams`), seeds 1–3, season 100, under the arm's patch: state hashes equal head's (O4 is off there).

### Adoption bars
An arm passes only if it passes every gate and all five:
1. **The cap falls well below head's:** at each width, the median of the arm's cap seasons ≤ ½ head's median, and its cap seasons are below head's (same seed and width) in ≥ 15 of 20 runs.
2. **Canopy trees/ha not below head's** at 160 cells: the median over runs of each run's median canopy trees/ha over seasons 100–300, at least head's.
3. **Hornbeam stays in the canopy:** a hornbeam canopy tree in ≥ 30 of 60 desktop frames.
4. **No hand-over:** desktop frames in which one species other than hornbeam holds over half the canopy trees, at most head's + 6.
5. **Cheap on the phone:** the median wall time per run at 66 cells ≤ 1.25 × head's.

If more than one arm passes, the recommendation is the one with the lowest median cap seasons at 160 cells. A pass recommends adoption (status proposed); adopting it is the user's call.

### Reported, not gated
At both widths: median and per-run cap seasons, cap-free runs; the stub pool per ha at the frames (median, and its mean split by species) against the order of 3·10⁴/ha (within 3·10³–3·10⁵ is "the order"); the bank (median per frame); stems ≥ 7 cm per ha and their canopy share; drawn stems per ha; recruits per run and hornbeam's share; wall time per season against head's.

### Regressions
`npm run regressions` must not move (no default changes); goldens unchanged (`npm run check`).

### Expected
At the cap about 1,200 seeds a season are dispersed on the desktop; with p_est 0.3 about 400 join the pool. At hornbeam's 0.065 the pool settles near 400/0.065 ≈ 6·10³ stubs (≈ 10⁵/ha); at s3 about a third of that. The full-tree bank should shrink to what the lit cells hold, so the cap should fall sharply; the risk is the gates, if 0.15 is rarely reached on the floor (3–13% of open sky at HEAD) and gaps refill too slowly.
