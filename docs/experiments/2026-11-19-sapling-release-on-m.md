# #138 re-probed on M: R5's shade term on λ, per species and for all (2026-11-19)

**Ticket:** [#138](https://github.com/epabarker/tree-simulation/issues/138) (understorey saplings with a carbon surplus do not grow), step 3 of [#129](https://github.com/epabarker/tree-simulation/issues/129)'s chain. **ADRs:** [0071](../decisions/0071-shade-apical-control.md) (δλ 0.40, deferred), [0068](../decisions/0068-understorey-signal-design.md) (the band), [0072](../decisions/0072-seedling-stubs.md) and [0073](../decisions/0073-light-memory.md) (M). Exploratory: params only, nothing under `rust/` or `src/` changes, and no default moves.

**Why.** [The sapling-release probe](2026-11-16-sapling-release-probe.md)'s confirmation found that δλ 0.40 (`dl40`) releases HEAD's frozen saplings on 20 seeds, but at a cost: stems ≥ 7 cm reached 852/ha against ADR 0068's band of 200–400, canopy trees/ha 109 → 188, and maple's no-growth share 0.78 → 0.97. ADR 0071 deferred it until the stand changed and named a per-species patch (beech and hornbeam) as the variant to try first. The stand has changed: the candidate garden is now **M** (stubs s3d + `o4.lightMemory` 2.5, no ramp; [the ramp re-probe](2026-11-16-understorey-ramp-memory-probe.md)'s decisions, the user, 2026-11-19). The ramp is closed, so nothing absorbs extra stems ≥ 7 cm, and M already overshoots the band by season 300 (median 1,055/ha at 160 cells). **Does δλ release the saplings on M, and at what cost to the band and the bushier species?**

**Code:** [`code/2026-11-19-sapling-release-on-m/`](code/2026-11-19-sapling-release-on-m/): `run.ts` (arms, runs, reuse, summary), `bars.ts` (the verdicts), `stand.py` (bar 6 through #134's `stand.py`).

## Arms and bars (fixed before the runs)

Written and committed before any run of this probe. Nothing below this heading changes them.

### Arms

| arm | world | per species | why |
|---|---|---|---|
| `M` | o4: s3d (`stubs`, `stubLight` 0.15, `stubDeath` 3, `stubDemote` 0.075) + `lightMemory` 2.5 | – | the reference: the candidate garden |
| `Mbh40` | as `M` | beech and hornbeam: `r5.dLambda` 0.40 | ADR 0071's scope 2, the variant named first: the species `dl40` released |
| `Mdl40` | as `M`, and `r5.dLambda` 0.40 | every species: `r5.dLambda` 0.40 | ADR 0071's scope 1 (`dl40` on M) |
| `Mbh25` (conditional) | as `M` | beech and hornbeam: `r5.dLambda` 0.25 | a lower per-species dose, run only on the pilot's condition below |

- **Patched per species.** No species patch carries an `r5` today, so a world-level δλ would reach them, but `Mdl40` sets it on every species' own patch too (a world-level patch misses fields that species set). `run.ts` prints each species' effective δλ per arm as a check.
- **Held fixed:** M's params; HEAD's seed supply, `maxTrees`, `c2.rotate`; R1's `unspent` "lost" (the bank stays off); the ramp off; one commit for every new run.
- **Stages, per arm and seed:** the garden (`forestParams(width, seed)`) at 160 and 66 cells to season 300, metamers at 100, 200 and 300; the sapling probe (`rust/core/examples/sapling_probe.rs`, the trace's) on the same 160-cell params to 300, rows from season 40, 1–10 m; lone beech, hornbeam, oak and maple (`loneTreeParams`, under the arm's params) to 100, seeds 1–3.
- **Reuse:** `M`'s gardens at 160 cells are linked from the ramp re-probe's runs after each record's params are checked equal to this script's. At 66 cells `M` is re-run here: the phone's wall times within one load, and the reuse check (each hash must equal the ramp re-probe's; if any differs, `M` at 160 is re-run too and the note says so). `M`'s sapling probe and lone trees are new.
- **Pilot:** seeds 1–3 first, read for crashes, wall time and the condition; its runs are part of the 20. **`Mbh25` runs** on seeds 1–20 only if the pilot shows the flood under `Mbh40`: its median stems ≥ 7 cm/ha over the nine frames at 160 cells more than 1.25× `M`'s on the same seeds.
- **Simulators:** at most 10 (`-j 10`, the sapling probe counted), after `pgrep -c treesim`.

### Definitions

- **The sapling class** (the sapling-release probe's): live trees 4–20 cells (1–5 m) at seasons 50–290 of the 160-cell sapling probe, all species. A **sapling-season without growth** has no metamer born; **gain per decade** is the height gain over the next 10 seasons of a tree alive then.
- **The garden's measures** (the ramp re-probe's run.ts, unchanged): DBH from `cli/allometry.ts`'s trunk cylinder at 1.3 m, unpooled; a canopy tree is drawn and strictly over half the season's top height; per hectare on width × 64 cells of 0.25 m; frames 100, 200 and 300 (60 per arm and width); a canopy death is a canopy tree in the season before its death, not thrown; cap seasons are `run.json` `meta.capSeasons`; wall time is `wall.txt`, its median over the 20 runs at 66 cells.

### Bars (each arm against `M`)

1. **Per seed, no growth:** the arm's no-growth share below `M`'s on the same seed in **≥ 15 of 20** seeds.
2. **Per seed, gain:** the arm's median gain per decade above `M`'s on the same seed in **≥ 15 of 20**. In both, a seed where either side has under 30 sapling-seasons counts as a miss.
3. **Pooled no growth:** seeds 1–20 pooled, **≤ 0.61** (the sapling-release probe's bar, kept as written; `M`'s own pooled share − 0.10 is reported beside it).
4. **#122's gates:** a canopy tree every season after 50 at 160 cells, and at 66 cells that plus one every season from 100, in **≥ 18 of 20** runs at each width.
5. **Canopy trees/ha:** at each width, the median over runs of each run's median canopy trees/ha over seasons 100–300, **at least `M`'s**.
6. **The band kept:** ADR 0068's bar-1 frames (stems ≥ 7 cm DBH at 200–400/ha) at 160 cells **no fewer than `M`'s** (of 60). The ramp is closed, so this is the flood's bar: a release that only adds stems ≥ 7 cm fails it.
7. **Maple not frozen harder:** maple's pooled no-growth share **at most `M`'s + 0.05** (both with ≥ 30 sapling-seasons; otherwise a miss).
8. **Bar 6** (#134's `stand.py`: per species, |median Tallo CR z| ≤ 1 on ≥ 8 canopy trees inside Tallo's support, seeds pooled, 160 cells, at 100 and 300): **hornbeam passes at 100 and 300, and no species–season cell that passes under `M` fails**.
9. **Canopy deaths** per run (mean, 160 cells) **at most 1.5× `M`'s**.
10. **The phone's wall time:** the median per run at 66 cells **at most 1.25× `M`'s** (same load).
11. **The lone trees:** state hashes at 100 equal `M`'s for beech, hornbeam, oak and maple, seeds 1–3. Where a hash differs, the sapling-release pilot's bar 3 decides for that species: the arm's median height and W/H over seeds 1–3 inside [0.9 × `M`'s lowest seed, 1.1 × `M`'s highest], and the note reports the move.

An arm **passes** if it passes all eleven. **A pass is not adoption:** it is recommended to the user, with ADR 0071 updated only on the user's call. No default changes in this PR.

**Reported, not gated:** stems ≥ 7 cm/ha by frame at both widths and their canopy share; the seedling bank (live stems under 1.3 m) per frame; cap seasons at both widths; top height; thrown canopy trees; the gain per decade's P90 and share of decades with none; the no-growth share per species (≥ 30 sapling-seasons) and per seed; `stand.py`'s stand H/D and the canopy's species.

### Expected (written before the runs)

- **`Mdl40`:** as `dl40` on HEAD: the saplings released (bars 1–3 likely), the band lost (bar 6) and maple frozen (bar 7). M's stubs and memory do not touch C3's split, so the mechanism is the same.
- **`Mbh40`:** beech and hornbeam are most of the sapling class, so bars 1–2 may pass; the pooled share is diluted by the species left at δλ 0.02 (bar 3 at risk). Maple's own λ is unchanged, but released beech and hornbeam shade it harder. The band likely overshoots as in `dl40`, less so.
- **The lone trees:** R5's signal is neighbour shade, zero for a tree alone, so every lone hash should equal `M`'s (the pilot's nine `dl*` lone runs did on HEAD).

## Reproduce

```
node docs/experiments/code/2026-11-19-sapling-release-on-m/run.ts -j 10 --seeds 1-3 --reuse <the ramp re-probe's runs/132-ramp-memory>
node docs/experiments/code/2026-11-19-sapling-release-on-m/run.ts -j 10 --reuse <the same>
uv run --project analysis python -I docs/experiments/code/2026-11-19-sapling-release-on-m/stand.py
node docs/experiments/code/2026-11-19-sapling-release-on-m/bars.ts runs/138-dl-on-m
```

Runs (not committed): `runs/138-dl-on-m/`.
