# The seed-supply probe: hornbeam's cost per seed against the cap (2026-11-16)

**Ticket:** [#137](https://github.com/epabarker/tree-simulation/issues/137) (ADR 0068, decision 4). Spec §O4 (seed production, establishment, the cap), §O4.11, §6, §10; ADRs 0063, 0065, 0068.

**Question.** Does cutting hornbeam's seed supply (a flora change, no new state) shorten the garden's seasons at its compute cap (`maxTrees`), without losing #122's canopy gates, the canopy's trees, or hornbeam from the canopy, and without handing the garden to another species? If not, #137's other option, §O4.11's seedling stubs outside `maxTrees`, is next.

**Script:** [`cli/seed-supply-probe.ts`](../../cli/seed-supply-probe.ts) (`node cli/seed-supply-probe.ts --seeds 1-3 -j 6` for the pilot, then `--arms head,<arms>` for seeds 1–20; resumable, so the full run reuses the pilot's runs).

## The knob

O4 turns R1's reproductive pool into ⌊pool / `o4.cSeed`⌋ seeds a season (`rust/core/src/principles/o4.rs`): **`cSeed` is the carbon cost of one seed, so supply × f is `cSeed` ÷ f.** A cut raises it. It is a species field (`flora.ts`: hornbeam 5), so each arm is a species patch (`patchSpecies`), not a world patch. Supply × f is not an exact seed count × f: the pool carries its remainder over, and the run's trees differ once the supply does.

## Bars, fixed before the runs

Written and committed before any run of this note. Nothing below this section changes them.

### Arms
- **head:** `forestParams(width, seed)` at this commit (r6's garden; `carbon` signal, no `topLight`).
- **h2, h4, h10:** hornbeam's supply ½, ¼, 1/10: `species.hornbeam.o4.cSeed` 10, 20, 50.
- **h60:** hornbeam's `cSeed` 300, d1's seed part alone (the acceptance note's d1 also had `topLight` at θ 0.15). A bracket, beyond the three asked for, so the probe can say whether any supply cut reaches the cap.
- **all4:** every garden species' supply ¼ (each species' `cSeed` × 4). A contrast, not a candidate: it says whether the cap is hornbeam's or the stand's.
- No other change. Widths 160 and 66, 300 seasons, natively, metamers kept at seasons 100, 200 and 300 (`--snapshots`) for DBH.
- **Pilot:** seeds 1–3, every arm (36 runs). **Then seeds 1–20** for head and every arm whose pilot looks like passing: gates 3 of 3 at both widths, cap seasons below head's in at least 2 of 3 runs at each width, and hornbeam in the canopy in at least 5 of 9 desktop frames. The bars are judged only on seeds 1–20. At most 6 simulators (the machine is shared).

### Definitions (as the understorey probe's)
- **A canopy tree:** stand.rs's (ADR 0065): drawn (≥ 1.3 m) and strictly over half the top height (stand.csv `topHeight100`) that season.
- **Seasons at the cap:** run.json `meta.capSeasons`.
- **Per hectare:** `Math.round(n / ha)`, ha = width × 64 × 0.0625 m² / 10⁴.
- **The bank:** live stems under 1.3 m at a frame. **DBH, the ≥ 7 cm band and its canopy share:** ADR 0068 decision 3, DBH by `cli/allometry.ts`.
- **A recruit:** a tree first seen after the planting season; **reaching 1.3 m:** a recruit that is ever drawn.
- **Frames:** seasons 100, 200 and 300 × 20 seeds = 60 per arm × width.

### Gates (#122; each ≥ 18 of seeds 1–20, per arm × width)
1. A canopy tree in every season after 50 (stand.csv `canopy` ≥ 1, seasons 51–300).
2. At 66 cells, a canopy tree in every season from 100.
3. A garden checkpoint (`forestParams(66, 1)`, 30 seasons) saved by this build loads, takes the arm's species patch by `setParams` (hornbeam's `cSeed` read back), and grows on 10 seasons alike twice; the frozen fixtures (v2, v3, garden 0.14.0) load.
4. Lone hornbeam (`loneTreeParams`), seeds 1–3, season 100, under the arm's patch: state hashes equal head's (O4 is off for the lone tree, so this holds by construction; it is the check).

### Adoption bars
An arm passes only if it passes every gate and all four:
1. **Seasons at the cap below head's** (the same seed and width) in **≥ 11 of 20** runs, **at each width**.
2. **Canopy trees/ha not below head's** at 160 cells: the median over runs of each run's median canopy trees/ha over seasons 100–300, at least head's.
3. **Hornbeam stays in the canopy:** a hornbeam canopy tree in **≥ 30 of 60** desktop frames.
4. **No hand-over:** desktop frames in which one species other than hornbeam holds over half the canopy trees, **at most head's + 6**.

If more than one arm passes, the recommendation is the one with the lowest median cap seasons at 160 cells. A pass recommends adoption; adopting it is the user's call, a new ADR and a flora change.

### Reported, not gated
At both widths: median cap seasons and cap-free runs; the bank (median per frame, by species); stems ≥ 7 cm per ha and their canopy share; drawn stems per ha; hornbeam's share of the canopy trees, of the recruits and of the recruits reaching 1.3 m; seeds made per run (all and hornbeam's); wall time.

### Regressions
`forestRegeneration` must not move. Its world (`forest`) has no species table, so a species patch cannot reach it, and the probe changes no default: `npm run regressions` at the end confirms it.

### Expected
At the cap 1,200–2,200 seeds arrive a season and 1–6 trees die (ADR 0068's Context), so any supply that still lands more establishing seeds than deaths keeps the garden at the cap. Hornbeam makes most of them, but beech (cSeed 10) and the rest make hundreds too. Expected: h2–h10 move cap seasons little; h60 and all4 move them more, h60 at the risk of bars 3 and 4.
