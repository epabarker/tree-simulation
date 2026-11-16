# The seedling-stubs probe: §O4.11's "keep seedlings as stubs until lit" against the cap (2026-11-16)

**Ticket:** [#137](https://github.com/epabarker/tree-simulation/issues/137) (ADR 0068, decision 4; ADR 0070 rejected the seed-supply cut). Spec §O4.4, §O4.11, §O4.13, §6, §10; ADRs 0063, 0065, 0068, 0070; the draft [ADR 0072](../decisions/0072-seedling-stubs.md).

**Question.** If seeds that land where a tree cannot stand (the cap is full, the ground is not lit enough, or a trunk is in the way) join a per-cell count of seedling stubs outside `maxTrees`, and a stub becomes a tree only where its cell is lit and the cap has room, does the garden spend far fewer seasons at its compute cap, while #122's canopy gates, the canopy's trees and hornbeam's place in the canopy hold, and does the stub pool reach the order of a real seedling bank (3·10⁴/ha, Uholka: the regeneration note §3)?

**Script:** [`cli/seedling-stubs-probe.ts`](../../cli/seedling-stubs-probe.ts) (`node cli/seedling-stubs-probe.ts --seeds 1-3 -j 6` for the pilot, then `--arms head,<arms>` for seeds 1–20; resumable).

## The rule (ADR 0072's design)

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

### Addendum: the demotion arms (fixed before their runs, after the first pilot's desktop runs)

Written after the first pilot's desktop runs (seeds 1–2) showed s1, s3 and s1q10 at the cap as long as head (199–230 seasons against 184–230), and before any run of the arms below. The reason read from those runs: promotion fills every freed slot at once from a pool of ~10⁴ stubs, and a promoted tree that is later shaded stays a full tree (bank trees die at ≤ 0.065 a season), so the bank of full trees re-forms. "Until lit" read both ways: a bank tree that is no longer lit returns to its cell's stub count.

- **The rule (`o4.stubDemote`, species-merged, absent 0: no demotion).** In O4's phase, after the stubs' deaths and promotions and before the season's seeds, each live tree of age ≥ 1 below the display threshold (1.3 m, not drawn) whose crown-top light Q_top/C (C5's, phase 2) is below `stubDemote` leaves the stand (not alive) and joins its root cell's stub count. It draws no death this season as a stub. Q_top is computed for every garden species (each has C5's `Trel` > 0).
- **Arms:** **s1d**, s1 with `stubDemote: 0.075` (half of `stubLight`, so a tree promoted at 0.15 is not demoted at once); **s3d**, s3 with `stubDemote: 0.075`.
- **Pilot and bars:** as above, unchanged. The first three arms are judged by the same pilot rule.

### Expected
At the cap about 1,200 seeds a season are dispersed on the desktop; with p_est 0.3 about 400 join the pool. At hornbeam's 0.065 the pool settles near 400/0.065 ≈ 6·10³ stubs (≈ 10⁵/ha); at s3 about a third of that. The full-tree bank should shrink to what the lit cells hold, so the cap should fall sharply; the risk is the gates, if 0.15 is rarely reached on the floor (3–13% of open sky at HEAD) and gaps refill too slowly.

## Pilot (seeds 1–3)

- **First pilot** (s1, s3, s1q10; runs at 0630ce6 with the code of 38a3496, 36 runs in 15.6 min on 6 simulators; [`pilot.txt`](code/2026-11-16-seedling-stubs-probe/pilot.txt)). Every gate passes. **The cap does not move:** s1 208 / 204 seasons (desktop / phone medians) against head's 230 / 174, s3 199 / 199, s1q10 230 / 225. By the pilot rule only s3 goes on (below head in 2 of 3 at both widths); s1 fails it on the phone (1 of 3), s1q10 at both widths.
- **Why:** the pool holds 1.5–1.7·10⁵ stubs/ha at s1 (4·10⁴ at s3), so every freed slot is refilled at once from a lit cell, and a promoted tree that is later shaded stays a full tree. The bank of full trees re-forms (median 64–70 a desktop frame against head's 72). This led to the addendum (above), committed (b419a73) before its runs.
- **Demotion pilot** (s1d, s3d at 66e0f3c, 12 runs in 9.2 min; [`pilot-demotion.txt`](code/2026-11-16-seedling-stubs-probe/pilot-demotion.txt)): cap medians 95 / 2 (s1d) and 102 / 2 (s3d), below head in 3 of 3 at both widths. Both go on.

## Results (seeds 1–20)

**s3d passes every gate and bar; it is the rule's pick.** s1d fails bar 5 (the phone's cost) and s3 fails bar 1. 136 new runs (the pilots' reused) in 72.0 min on 6 simulators; the full output is [`output.txt`](code/2026-11-16-seedling-stubs-probe/output.txt), the bars [`bars.json`](code/2026-11-16-seedling-stubs-probe/bars.json). The s3 and head runs were made at 0630ce6 (built from 38a3496's code, which 66e0f3c changes only by adding the off-by-default demotion and the hash's separators). The branch was rebased onto 3d-port after the runs, so the run records and the saved outputs name the pre-rebase SHAs: ea5a247 for 0630ce6 and d42cc9a for 66e0f3c.

### Gates and bars

| arm | gate 1, 160 / 66 | gate 2, 66 | 1. cap: median, 160 / 66; runs below head | 2. canopy trees/ha, 160 | 3. hornbeam in canopy (of 60) | 4. other species > ½ canopy | 5. wall per run, 66 (× head) |
|---|---|---|---|---|---|---|---|
| head | 20 / 20 | 20 | 235 / 186.5 | 109 | 60 | 4 | 116 s |
| s3 | 20 / 20 | 20 | 223 / 178; 14 / 12 ✗ | 125 ✓ | 60 ✓ | 2 ✓ | 117 s (1.01) ✓ |
| s1d | 20 / 19 | 19 | **79 / 19**; 20 / 20 ✓ | 109 ✓ | 60 ✓ | 2 ✓ | 151 s (1.30) ✗ |
| **s3d** | 20 / 19 | 19 | **79.5 / 11**; 20 / 20 ✓ | 109 ✓ | 60 ✓ | 2 ✓ | 134 s (1.16) ✓ |

Gates 3 and 4 pass in every arm: the v2, v3 and garden 0.14.0 fixtures load with no stubs (re-saved as version ≤ 4 with no `stubs` table) and grow on alike under each arm's params; the stubs-on garden checkpoint (66, seed 1, season 30) is version 5, loads with the saved hash and reaches the unbroken world's hash 10 seasons on; head's is version 4; lone hornbeam keeps head's hashes (859812b6, 66b88c89, f4a96f3e). The phone's one gate-1/2 miss in s1d and s3d is seed 15 (19 of 20, above the 18 bar), the seed that missed in the seed-supply probe's h4 and h60 too.

### The cap, per run

| arm | 160 cells | 66 cells | paired change, median 160 / 66 | cap-free runs, 160 / 66 |
|---|---|---|---|---|
| head | 184 230 252 195 244 254 241 220 250 219 238 222 238 265 228 246 236 230 182 234 | 174 231 172 167 232 134 91 203 183 158 140 196 246 194 191 180 198 174 190 201 | – | 0 / 0 |
| s3 | 199 223 180 196 244 233 211 207 237 105 227 223 229 223 236 242 233 223 218 216 | 199 205 166 106 243 145 69 210 172 102 74 198 206 168 186 221 227 182 153 174 | −8 / −8.5 | 0 / 0 |
| s1d | 1 95 124 5 187 132 60 35 89 116 69 146 38 95 107 45 39 96 7 37 | 2 2 26 1 58 39 18 21 0 6 96 7 6 29 20 32 64 106 3 9 | −169.5 / −168.5 | 0 / 1 |
| s3d | 0 102 117 0 164 126 51 37 86 20 75 125 16 141 107 114 84 69 0 36 | 2 2 23 3 66 49 39 3 0 8 85 82 10 16 16 12 4 46 5 1 | −162 / −170 | 3 / 1 |

### Reported (160 cells; 66 in the output)

| arm | stub pool/ha, median [range] (hornbeam, beech) | bank, median | ≥ 7 cm/ha; canopy share | drawn/ha | recruits/run (hornbeam) | reaching 1.3 m/run | wall per season, 160 / 66 |
|---|---|---|---|---|---|---|---|
| head | 0 | 68 | 266; 0.50 | 1,297 | 1,016 (0.38) | 162 | 0.73 / 0.39 s |
| s3 | 49,797 [3,547–90,625] (44,163, 2,156) | 65.5 | 258; 0.54 | 1,367 | 636 (0.64) | 164 | 0.73 / 0.39 s |
| s1d | 128,195 [17,047–274,484] (124,191, 5,899) | 64 | 281; 0.59 | 992 | 8,853 (0.90) | 148 | 0.97 / 0.50 s |
| s3d | 48,414 [156–90,016] (44,502, 1,850) | 50 | 258; 0.54 | 657 | 7,756 (0.90) | 140 | 0.91 / 0.45 s |

(The pool's species columns are means per frame.)

- **The pool is of a real bank's order.** s3d's median 4.8·10⁴ stubs/ha on the desktop (6.7·10⁴ on the phone) sits within the order of Uholka's 3·10⁴/ha; s1d's 1.3·10⁵ is at its top. It is about 90% hornbeam, as the seed rain is (hornbeam makes 93% of the seeds).
- **Demotion, not the pool, ends the cap.** Without it (s3) the cap moves by 8 seasons; with it the bank of full trees falls to what is lit (desktop 50 a frame against 68, phone 20.5 against 55) and the cap holds for a median 79.5 / 11 seasons.
- **The cost is churn.** Recruits per run rise from 1,016 to 7,756 (s3d): most likely a cell whose ground reaches 0.15 promotes a seedling whose crown top, a season later, sees less than 0.075, which returns it (not traced; the ground is sampled at the cell's centre at y 0.5, the top by C5's bud-light quantile). Recruits reaching 1.3 m stay near head's (140 against 162). The churn is most of the wall time added: the desktop's season costs 1.24× head's, the phone's 1.16×.
- **The flood halves.** Drawn stems fall from 1,297/ha to 657 on the desktop (322 → 152 on the phone), still above the 200–400 band on the desktop (#132's, reported). Stems ≥ 7 cm and their canopy share are head's.
- **Hornbeam keeps the canopy** in all 60 desktop frames (262 canopy tree-frames against head's 205), and no other species takes over (2 frames against 4).

### Regressions
`npm run regressions` at the final commit: unchanged (no default changed).

## Conclusion

- **Stubs alone (§O4.11 read one way, s1/s3/s1q10) do not end the cap**: a pool of 10⁴–10⁵/ha refills every freed slot, and shaded promoted trees stay trees.
- **Stubs read both ways (s3d: `stubLight` 0.15, `stubDeath` 3, `stubDemote` 0.075) pass every pre-registered gate and bar**: the cap's seasons fall from a median 235 to 79.5 on the desktop and from 186.5 to 11 on the phone, with canopy trees/ha, hornbeam's canopy and #122's gates held, a pool of a real bank's order, and the phone's season 1.16× head's.
- **Recommendation:** adopt s3d as the garden's default only with the churn looked at first: either accept 7–8× the recruits (a cost, not a visible behaviour: the churned seedlings never reach 1.3 m) or test a demotion that waits k seasons (a counter, and checkpoint state). The draft is [ADR 0072](../decisions/0072-seedling-stubs.md), proposed.

### What adoption would touch
- `forestParams` (or `GARDEN_O4`) gains `o4: {stubs: true, stubLight: 0.15, stubDeath: 3, stubDemote: 0.075}`; `node cli/export-presets.ts` for `rust/presets.json`.
- `npm run golden:update` for the garden goldens (any golden whose world is `forestParams`), with the reason in the devlog; `npm run regressions --update` for phoneSeed3 (`forestParams(66, 3)`), whose outcome vector will move; forestRegeneration cannot (its world has no `stubs`).
- Shipped garden checkpoints keep loading (versions 1–4 load with no stubs; gate 3), but a page that saves a garden would write version 5: the garden's host must ship the matching core.
- Spec §O4.4 and §O4.11 name the rule; ADR 0065's cap-seasons report is re-read; the phone is looked at in the browser (fewer drawn stems, the churn invisible below 1.3 m).
