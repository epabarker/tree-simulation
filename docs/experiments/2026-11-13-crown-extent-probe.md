# Which mechanism brings crown extent and girth into range? (2026-11-13)

**Ticket:** [#129](https://github.com/epabarker/tree-simulation/issues/129), acceptance criterion 1 only: a probe that chooses a mechanism or rejects them all. **Exploratory: seeds 1–3.** Nothing is adopted: every rule is a probe param, off by default and bit-identical, and no preset, species or golden changes. Branch `probe/129-crown-extent`, cut from `3d-port` bdacf98.

**Question.** The [path-length probe](2026-11-11-garden-pathlength-probe.md) found the crowns 1.4–4.2× Pretzsch et al. 2015's open-grown edge at matched DBH and the stems 2–3× too thick for their age, and left four questions (its §10). Which of these brings the lone tree into the open-grown envelope and the garden to [ADR 0065](../decisions/0065-garden-demography-reported-targets.md) decision 1's targets: lateral shoots slowed by the tree's size with the leader spared, a C6 girth recalibration, or both? Spec §C1 (shoot extension), §C6 (girth), §O4 (the garden's demography); ADRs 0062, 0063, 0065.

## The user's answers to §10 (2026-11-13, before any code)

1. **An imposed crown radius is not a candidate.** The candidate is an emergent rule: shoots slowed by the tree's size, upright ones spared. The reach limit is run as it was on `probe/121-pathlength`, as a yardstick only. Choosing it would need a new ask and its own ADR.
2. **Girth is recalibrated with the crown rule:** a 2×2 of C6 (as fitted, thinned) by crown rule (off, on).
3. **Planting density:** every arm at 400 saplings/ha; the leading arm alone is repeated at 1,000/ha.
4. **The understorey at the cap is out of scope.** No establishment, bank or cap tuning. Its counts are reported.
5. (Settled by ADR 0065: a canopy stem is a drawn stem over half the top height.)

Two design choices were also put to the user and agreed: the leader is spared **by the bud's own heading** (not by position in the crown or by axis), and the tests sit at four seams (g, the chance, `grow_buds`, the World's hash).

## Bars and the rule for choosing, fixed before the runs

Written and committed before any arm was run. Nothing below this section changes them.

### The rule under test (`c1.extentLimit`, probe only)
- A shoot extends this season with a chance p, drawn once per live bud and season; a barred bud rests as one below its threshold does. g(L) = max(g_min, 1 / (1 + (L / L_x)^k)), with L read at the bud's node as the season began.
- **L** (`c1.extentLimit`): `reach`, the node's horizontal distance from the stem base; `height`, the tree's height; `path`, the node's path length from the stem base.
- **Sparing** (`c1.extentSpare`): p = u² + (1 − u²)·g, where u is the upward part of the bud's heading (0 for a level or drooping bud). Without it p = g.
- It is one rule with one g (the path-length note §9). The arms differ only in L and in sparing.

### Arms
| arm | what | patch |
|---|---|---|
| `base` | HEAD: round 6's garden (r6), the fitted species | none |
| `R16k8` | the yardstick: reach, L_x 16, k 8, no floor, no sparing (the path-length note's closest condition) | `patches/R16k8.json` |
| `H40k2f` | laterals slowed by tree height, leader spared: L_x 40 (10 m), k 2, g_min 0.1. Choi et al. 2001's exposed-margin rates give g 0.5, 0.2 and 0.1 at 10, 20 and 30 m | `patches/H40k2f.json` |
| `P60k2f` | the same by path length (local): L_x 60 (15 m), k 2, g_min 0.1 | `patches/P60k2f.json` |
| `C6half` | girth alone: every species' `c6.r0` halved with m_w·r0² kept (`r1.mw` × 4), so R1's wood cost is unchanged and every radius on the same skeleton is half | `patches/C6half.json` |
| leading arm × `C6half` | the 2×2's fourth cell | |
| leading arm at 1,000/ha | `o4.planting.density` 1000 | |

- **Calibration variants** of the emergent rule (L_x, k, g_min) may be screened on the lone beech and hornbeam before the garden is run. Every variant run is reported.
- **Stages:** the lone open-grown tree (`loneTreeParams`, the 60 m box of ADR 0062) for the six exemplars, snapshots every 10 seasons to 100; the garden (`forestParams`) at 160 and 66 cells to season 300, snapshots at 25/50/75/100/150/200/300. Seeds 1–3. All through `npm run probe` (`run.sh`), at most 12 simulators.
- **Measurement:** the path-length note's (`dbh.py`: DBH at 1.3 m by the pipe radius; crown diameter twice the mean crown radius over ±x and ±z; `anchors.py`: Pretzsch's edge). The garden's counts are the core's own `stand.csv`, whose `canopy` is ADR 0065's.

### Bars
- **The lone open-grown envelope** (the path-length note §1.1): crown diameter ÷ Pretzsch's open-grown 95% edge at matched DBH, where the tree first reaches 40 cm and at season 100. A lone tree should sit at or under the edge. Read for the five species with a line (oak, maple by the sycamore's line, birch, beech, hornbeam): **at or under 1.0 passes; 1.0–1.2 is near.**
- **Lone guards, reported:** height at season 100 against `base`; the box held (`budsOutside` 0 in every season); round in plan (≥ 0.75); `w90` (a column has 0.6–0.8); top-fifth leaf; the crown-edge rate over seasons 60–100 (Choi: 2–3 cm/yr at that size).
- **The garden's targets** (ADR 0065 decision 1, owned by #129), at 160 cells:
  1. at least 120 canopy trees/ha: in every season from 100 (runs of 3), and at the frames 100/200/300 (frames of 9);
  2. 200–400 drawn stems/ha at seasons 100/200/300 (frames of 9);
  3. at least 60% of drawn stems in the canopy (frames of 9).
- **Reported beside them:** the seasons at the cap, the top species' share in frames with ≥ 8 drawn stems, the canopy trees' DBH, height and crown at season 100, and at 66 cells a canopy tree in every season from 100.

### The rule for choosing
- **An arm is chosen** (for a 20-seed adoption run, which this probe does not make) only if, on seeds 1–3:
  1. **lone:** beech and hornbeam are at or under 1.2× the edge at DBH 40 and at season 100 in every seed, no species is further over the edge than at `base`, and each species' median height at season 100 is at least 0.9 of `base`'s;
  2. **garden, 160 cells:** the median canopy count from season 100 is at least 120/ha in 3 of 3 runs, and more frames hold ≥ 120/ha than at `base`;
  3. it is not the yardstick.
- Targets 2 and 3 (the band and the canopy share) do not enter the rule, because the understorey is out of scope (answer 4). Their counts are reported and named as what stays red.
- **If no arm meets it, all are rejected,** and the note names the closest and what it lacks.
- **Girth** is judged by the 2×2: whether `C6half` alone or with the leading arm moves the lone ratio and the garden's canopy count in the wanted direction, with the DBH for age (Lockow's hornbeam table: 26–36 cm mean at 100 years) reported.

_Results follow below once the runs are in._
