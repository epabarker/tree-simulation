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

## Results (seeds 1–20, 7d54173)

**Neither arm passes. Both release the saplings (bars 1–3 pass with room), and both fail the band (bar 6) and canopy deaths (bar 9). The per-species arm also costs hornbeam's bar 6 at 300 as beech takes the canopy; the all-species arm freezes maple (bar 7). Nothing is adopted; ADR 0071 stays deferred.**

**Runs:** 240 new runs at 7d54173 (the pilot, seeds 1–3, 24.4 min; the rest 43.9 min, 10 simulators), and `M`'s 20 gardens at 160 cells linked. **The reuse holds:** every linked record's params equal this script's, and `M`'s 20 re-runs at 66 cells hash as the ramp re-probe's ([`reuse-check.txt`](code/2026-11-19-sapling-release-on-m/reuse-check.txt)). **`Mbh25` was not run:** the pilot's condition did not hold (`Mbh40`'s median stems ≥ 7 cm/ha over the nine frames at 160 cells was 141, against `M`'s 203). The output is in [`bars.txt`](code/2026-11-19-sapling-release-on-m/bars.txt), [`output.txt`](code/2026-11-19-sapling-release-on-m/output.txt), [`pilot.txt`](code/2026-11-19-sapling-release-on-m/pilot.txt) and [`tables.md`](code/2026-11-19-sapling-release-on-m/tables.md) (`stand.py`).

### The bars

`M`: pooled no growth 0.68 (`M` − 0.10 = 0.58); canopy/ha 133 / 76; band frames 16 of 60 (median 297/ha); maple 0.83; hornbeam bar 6 z −0.74 / −0.08 (passing); canopy deaths 10.1 a run; the phone's wall 89 s; gates 20 / 19.

| arm | 1: no growth falls per seed (≥ 15) | 2: gain rises per seed (≥ 15) | 3: pooled no growth (≤ 0.61) | 4: gates 160 / 66 (≥ 18) | 5: canopy/ha 160 / 66 (≥ M's) | 6: band frames, 160 (≥ 16) | 7: maple no growth (≤ 0.88) | 8: bar 6: hornbeam z 100 / 300; M's cells kept | 9: canopy deaths/run (≤ 15.1) | 10: phone wall (≤ 1.25×) | 11: lone hashes | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `Mbh40` | 19 ✓ | 18 ✓ | 0.39 ✓ | 20 / 18 ✓ | 141 / 76 ✓ | 6 (median 344/ha) ✗ | 0.79 ✓ | −0.64 / **−1.97**; hornbeam@300 lost ✗ | 24.9 ✗ | 104 s (1.18) ✓ | 12 / 12 equal ✓ | **fail** (6, 8, 9) |
| `Mdl40` | 18 ✓ | 18 ✓ | 0.45 ✓ | 20 / 20 ✓ | 172 / 114 ✓ | 9 (median 438/ha) ✗ | **0.97** ✗ | −0.22 / −0.51 ✓ | 25.6 ✗ | 99 s (1.12) ✓ | 12 / 12 equal ✓ | **fail** (6, 7, 9) |

- **The release is real and larger than on HEAD.** The pooled no-growth share falls from 0.68 to 0.39 (`Mbh40`) and 0.45 (`Mdl40`), against `dl40`'s 0.60 on HEAD; the median gain per decade rises from 0.04 m to 1.24 and 0.75 m (P90 3.8 and 3.5 m). The per-seed misses are seeds 7 and 16 (and 3 for `Mdl40`); `Mbh40`'s seed 7 has 30 sapling-seasons, at the floor.
- **The per-species patch releases more than the world patch**, because its beech and hornbeam are not shaded by released maple, holly and rowan: beech 0.63 → 0.35, hornbeam 0.68 → 0.58 (`Mdl40`: 0.41, 0.52).
- **The lone trees do not move:** all 24 arm runs (beech, hornbeam, oak and maple, seeds 1–3) hash as `M`'s; beech's, hornbeam's and oak's are also the sapling-release probe's HEAD hashes (c9f55e42, 859812b6, 9d18cdbd for seed 1). R5's signal is neighbour shade, zero for a tree alone, so the lone triad is untouched.

### The costs

| arm | ≥ 7 cm/ha at 160, frames 100 / 200 / 300 (band 200–400) | at 66 | ≥ 7 cm canopy share ≥ 0.6, frames at 160 | seedling bank per frame, 160 / 66 | cap seasons, 160 / 66 | thrown/run, 160 | sapling-seasons | canopy species at 300, 160 cells (pooled) |
|---|---|---|---|---|---|---|---|---|
| `M` | 203 / 204 / 1,055 | 114 / 114 / 76 | 18 | 7.5 / 0 | 62.5 / 14.5 | 4.3 | 199,764 | hornbeam 0.74, beech 0.13, birch 0.03 |
| `Mbh40` | 94 / **1,141** / 1,000 | 76 / 190 / 265 | 31 | 0 / 0 | 40 / 37 | 8.4 | 85,806 | **beech 0.84**, hornbeam 0.16 |
| `Mdl40` | 156 / **1,407** / 1,352 | 152 / 190 / 549 | 35 | 0 / 0 | 44.5 / 39.5 | 15.0 | 94,500 | beech 0.62, hornbeam 0.35 |

- **The flood comes a century earlier.** Under `M` the stems ≥ 7 cm stay in the band to 200 and overshoot by 300. Under both arms the released saplings cross 7 cm by 200 (1,141 and 1,407/ha at 160 cells), so the band holds only at 100, if at all. With the ramp closed nothing thins them, and they die as canopy trees instead: canopy deaths per run 10.1 → 24.9 and 25.6, thrown 4.3 → 8.4 and 15.0.
- **`Mbh40` turns the garden into a beech wood,** as B2 did in #134's stand check: beech holds 0.84–0.86 of the canopy trees at 200 and 300 (`M` 0.13–0.16). Hornbeam falls to 78 canopy trees at 300 and fails bar 6 (z −1.97). Beech passes bar 6 at both seasons (z 0.85, 0.97), and the stand H/D moves into its band (beech 47 → 91 at 300, band 70–94; hornbeam 69 → 96, band 74–98).
- **`Mdl40` keeps hornbeam passing** (z −0.22, −0.51) and adds oak at 300 (z 0.80), but beech still takes 0.62 of the canopy at 300 and maple freezes (0.83 → 0.97), as `dl40` did on HEAD; maple has 1–4 canopy trees in the whole stand.
- **The seedling bank empties at 160 cells** (a median of 7.5 stems under 1.3 m a frame → 0) and sapling-seasons fall by more than half: the released stems leave the class and the closed canopy recruits nothing beneath.
- **The phone (66 cells):** gates 18 / 20 (`Mbh40`, at the bar) and 20 / 20 (`Mdl40`); the wall 1.18× and 1.12× `M`'s; the stand sits at its cap 37–39.5 seasons against `M`'s 14.5. Canopy trees/ha 76 (`Mbh40`, equal to `M`'s) and 114 (`Mdl40`).

## Conclusions

- **δλ releases M's saplings well, on 20 seeds, with the lone trees bit-identical,** whether set on beech and hornbeam or on every species. The release is not the problem.
- **What a release costs on M is the stand:** the released beech and hornbeam reach 7 cm by 200, overshoot ADR 0068's band 3–4×, and then die in the canopy at 2.5× `M`'s rate. Without the ramp (closed) or another sink for stems ≥ 7 cm, no dose of δλ that releases the saplings can keep bar 6 (the band) or bar 9.
- **The per-species patch makes it worse for the canopy's mix:** it frees beech alone of the shade-tolerant species that grow tall, and beech wins the race to the canopy (0.84 at 300), the same takeover as #134's B2. ADR 0071's scope 2 should not be adopted.
- **The world patch keeps hornbeam and oak but freezes maple** and floods the band hardest (1,407/ha at 200).
- **So #138 is not closed by δλ on M.** The saplings' freeze and the band are one problem on this stand: the band is met under `M` only because the saplings are frozen. What would free them without the flood is a mortality or thinning term on the released stems (#132's "release term", now closed) or a stand with a lower carrying density. Both are design choices for the user.

## Decisions for the user

1. **Keep ADR 0071 deferred, or reject it?** Neither scope passes on M. The recommendation is to mark it rejected for the garden as it stands (scope 2 actively harmful: a beech wood), and keep `r5.dLambda` at 0.02.
2. **Close #138 as "frozen saplings are what keeps the band"?** Or keep it open behind a new sink for stems ≥ 7 cm (the ramp is closed). The freeze is a property of M's band, not only of C3's split.
3. **Whether the flood is acceptable** if the user prefers released saplings to the band: `Mdl40` passes every bar but the band (6), maple (7) and canopy deaths (9), gains canopy trees (133 → 172/ha) and moves the stand H/D toward its bands.

## Limits

- One dose per scope: `Mbh25` was not run (its pre-registered condition failed on the pilot); a lower dose would release less and flood less, but the band frames already fall at the dose that releases.
- `M`'s 160-cell gardens were made on another commit (6a1bd67); the 66-cell hashes show the garden unchanged since. `M`'s sapling probe and lone trees are new at 7d54173.
- The lone gate reads seeds 1–3 to season 100; it is a hash gate, not a triad reading, and every hash matched.

## Reproduce

```
node docs/experiments/code/2026-11-19-sapling-release-on-m/run.ts -j 10 --seeds 1-3 --reuse <the ramp re-probe's runs/132-ramp-memory>
node docs/experiments/code/2026-11-19-sapling-release-on-m/run.ts -j 10 --reuse <the same>
uv run --project analysis python -I docs/experiments/code/2026-11-19-sapling-release-on-m/stand.py
node docs/experiments/code/2026-11-19-sapling-release-on-m/bars.ts runs/138-dl-on-m
```

Runs (not committed): `runs/138-dl-on-m/`.
