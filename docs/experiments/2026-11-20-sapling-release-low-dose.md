# #138's low-dose ladder on M: δλ 0.10, 0.15 and 0.25 on every species (2026-11-20)

**Ticket:** [#138](https://github.com/epabarker/tree-simulation/issues/138) (understorey saplings with a carbon surplus do not grow). **Follows:** [#138 re-probed on M](2026-11-19-sapling-release-on-m.md) (δλ 0.40, PR #159). **ADRs:** [0071](../decisions/0071-shade-apical-control.md) (δλ, deferred), [0068](../decisions/0068-understorey-signal-design.md) (the band), [0072](../decisions/0072-seedling-stubs.md) and [0073](../decisions/0073-light-memory.md) (M). Exploratory: params only, nothing under `rust/` or `src/` changes, and no default moves. The ladder was approved by the user on 2026-11-20.

**Why.** δλ (`r5.dLambda`) 0.40 on the candidate garden M released the frozen saplings but flooded the band of stems ≥ 7 cm DBH (ADR 0068's 200–400/ha) a century early: 1,141–1,407/ha at frame 200 against M's 204. Only one dose was run on M: the lower per-species dose was skipped because its pilot condition was a median over nine frames, which the early frames held down and so hid the late ones. On HEAD ([the sapling-release probe](2026-11-16-sapling-release-probe.md)) δλ 0.10 gave 5× HEAD's median gain with stems ≥ 7 cm at 328/ha, inside the band. **Is there a dose on M that grows the shaded saplings at a realistic rate without making the late frames worse than M's own?**

**Code:** [`code/2026-11-20-sapling-release-low-dose/`](code/2026-11-20-sapling-release-low-dose/): `run.ts`, `bars.ts` and `stand.py`, copied from the previous probe's and changed only in the arms, the reuse (below) and three added measures (bar 12's saplings, the canopy death rate and the canopy's species per frame); every measure the previous probe read is computed by the same code.

## Arms and bars (fixed before the runs)

Written and committed before any run of this probe. Nothing below this heading changes them.

### Arms

| arm | world | per species | why |
|---|---|---|---|
| `M` | o4: s3d (`stubs`, `stubLight` 0.15, `stubDeath` 3, `stubDemote` 0.075) + `lightMemory` 2.5 | – | the reference: the candidate garden |
| `Mdl10` | as `M`, and `r5.dLambda` 0.10 | every species: `r5.dLambda` 0.10 | HEAD's in-band dose |
| `Mdl15` | as `M`, and `r5.dLambda` 0.15 | every species: `r5.dLambda` 0.15 | between |
| `Mdl25` | as `M`, and `r5.dLambda` 0.25 | every species: `r5.dLambda` 0.25 | the dose under the previous probe's 0.40 |

- **Patched per species.** No species patch carries an `r5` today; each arm sets δλ on the world and on every species' own patch (a world-level patch misses fields species set). `run.ts` prints each species' effective δλ per arm as a check.
- **Held fixed:** M's params; HEAD's seed supply, `maxTrees`, `c2.rotate`; R1's `unspent` "lost"; the ramp off; one commit for every new run.
- **Stages, per arm and seed:** as the previous probe: the garden (`forestParams(width, seed)`) at 160 and 66 cells to season 300, metamers at 100, 200 and 300; the sapling probe (`rust/core/examples/sapling_probe.rs`) on the 160-cell params to 300; lone beech, hornbeam, oak and maple (`loneTreeParams`) to 100, seeds 1–3.
- **Reuse of `M`.** Nothing under `rust/`, `src/core/` or `cli/` has changed since the previous probe's commit (7d54173). `M`'s 160-cell gardens and its sapling probe are linked from the previous probe's runs after each one's params are checked equal to this script's; on seeds 1–3 both are re-run here as well, and the garden's hash and `saplings.csv`'s bytes must equal the linked runs'. `M`'s 66-cell gardens (the phone's wall within one load) and lone trees are re-run on all seeds, and each hash must equal the previous probe's. If any check differs, all of `M` is re-run and the note says so. The check is written to `reuse-check.txt`.
- **Pilot:** seeds 1–3 of every arm first, read for crashes and wall time, and judged on stems ≥ 7 cm/ha at frames 200 and 300 at 160 cells (each seed's value, and the arm's median against `M`'s), not on a median over frames. All three doses then run on seeds 1–20 whatever the pilot shows: the ladder is the question, and the pilot's runs are part of the 20.
- **Simulators:** at most 10 (`-j 10`, the sapling probe counted), after `pgrep -c treesim`.

### Definitions

- As the previous probe's: the sapling class (live trees 4–20 cells, 1–5 m, seasons 50–290 of the 160-cell sapling probe, all species); a sapling-season without growth; the gain per decade; DBH at 1.3 m; a canopy tree (drawn and strictly over half the season's top height); per hectare on width × 64 cells of 0.25 m; frames 100, 200 and 300; canopy deaths (a canopy tree in the season before its death, not thrown); cap seasons; wall time.
- **Shaded beech and hornbeam saplings** (bar 12): the sapling-seasons of beech and hornbeam in the class whose top bud's light `qTop` is under 0.5 (R5's shade s = 1 − Q/C over 0.5, with C = 1). Their gain per decade is the height gain over the next 10 seasons, as above. Under `M` these are 99% of beech's and hornbeam's sapling-seasons.
- **The distance from the band** of a frame's stems ≥ 7 cm/ha x: max(0, 200 − x, x − 400). A frame is **no worse than `M`** when its distance is at most `M`'s.
- **Canopy deaths as a percentage of canopy trees a season:** canopy deaths (not thrown) over the canopy tree-seasons (`stand.csv`'s `canopy`, summed over seasons 1–300), pooled over the 20 runs, × 100.
- **Beech's canopy share at 300:** beech's share of the canopy trees alive at season 300, pooled over the 20 runs.

### Bars (each arm against `M`)

Bars 1–11 are the previous probe's, as written there and judged by the same code (`bars.ts`):

1. **Per seed, no growth** below `M`'s on the same seed in **≥ 15 of 20** seeds.
2. **Per seed, gain** above `M`'s on the same seed in **≥ 15 of 20** (in both, a seed where either side has under 30 sapling-seasons is a miss).
3. **Pooled no growth ≤ 0.61.**
4. **#122's gates** in **≥ 18 of 20** runs at each width.
5. **Canopy trees/ha** at each width **at least `M`'s**.
6. **The band kept:** frames with stems ≥ 7 cm at 200–400/ha at 160 cells **no fewer than `M`'s** (of 60).
7. **Maple's pooled no-growth share at most `M`'s + 0.05.**
8. **#134's bar 6** (`stand.py`): hornbeam passes at 100 and 300, and no species–season cell that passes under `M` fails.
9. **Canopy deaths** per run (mean, 160 cells) **at most 1.5× `M`'s**.
10. **The phone's wall time** (median per run at 66 cells) **at most 1.25× `M`'s**.
11. **The lone trees' hashes** at 100 equal `M`'s (or, where one differs, inside the previous probe's noise bar).

And two new:

12. **Realism:** the median gain per decade of shaded beech and hornbeam saplings, seeds 1–20 pooled, **within 0.1–0.5 m**. `M`'s is 0.04 m (a re-read of the previous probe's runs, which this definition was checked on before any run here); δλ 0.40 gave 0.75 and 1.24 m over the whole class. The number of seeds whose own median (≥ 30 decades) is in the band is reported beside it.
13. **The late frames no worse than `M`:** at 160 cells, the median over runs of stems ≥ 7 cm/ha at frame 200 and at frame 300, each **no farther from the 200–400 band than `M`'s** at the same frame. `M` is 204/ha at 200 (in the band, so the arm must be in it too) and 1,055/ha at 300 (so the arm must be at most 1,055 there). The note states each frame against the band and against `M`'s value, and reports per seed how many seeds are no worse than `M`'s same seed and how many are in the band; the 66-cell values are reported, not gated.

An arm **passes** if it passes all thirteen. **A pass is not adoption:** it is recommended to the user, with ADR 0071 changed only on the user's call. No default changes in this PR.

**Reported, not gated:** maple's no-growth share; the seedling bank (live stems under 1.3 m) per frame; cap seasons at 160 and 66; thrown canopy trees per run; canopy deaths per run and as a percentage of canopy trees a season, at both widths; beech's canopy share at 300 at both widths, and the canopy's leading species; stems ≥ 7 cm/ha by frame at both widths; the gain per decade over the whole class; the no-growth share per species.

### Expected (written before the runs)

- **The release is graded:** on HEAD δλ 0.10 / 0.25 gave a median class gain of 0.10 / 0.33 m, and on M 0.40 gave 0.75, so on M roughly 0.1–0.2 m at 0.10, 0.2–0.3 at 0.15 and 0.4–0.6 at 0.25. Bar 12 likely passes at 0.10 or 0.15 and is at risk above 0.5 at 0.25.
- **The flood may be graded too, or may be a threshold:** if the saplings that grow at all reach 7 cm by 200 the late frames move as with 0.40, only later. On HEAD 0.10 stayed in the band; M's stubs and memory make the stand denser, so frame 200 is at risk at every dose, and least at 0.10.
- **Maple:** 0.40 froze it (0.83 → 0.97); a lower dose shades it less, so bar 7 likely passes at 0.10 and 0.15.
- **The lone trees** hash as `M`'s: R5's signal is neighbour shade, zero for a tree alone.

## Results

Pending.
