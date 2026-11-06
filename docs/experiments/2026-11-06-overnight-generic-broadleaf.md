# The overnight run: a generic broadleaf that reads as a tree (2026-11-06)

_Unattended, 00:05–07:30, orchestrated by the overseer.
- **Plans:** [overseer](../plans/2026-11-05-overseer.md), [overnight](../plans/2026-11-06-overnight.md); the
  overnight plan's State block holds every number below.
- **ADR:** [0055](../decisions/0055-within-tree-irregularity.md).
- **Figures:** [hornbeam, before and after](figures/2026-11-06-hornbeam-irregularity.jpg); [the garden, 0.16.0 against the RC](figures/2026-11-06-garden-rc-sheet.jpg) (seeds 12, 9, 10, 2, 3, 6; laptop and phone; seasons 40, 80, 150).
- **The release candidate:** branch `claude/overnight-rc`, [draft PR #49](https://github.com/epabarker/tree-simulation/pull/49) into `3d-port`, stacked on #48; preview at https://preview-3d-edbarker-dev.edbarker.workers.dev/._

**The overseer's look at the garden sheet:** at season 150 the RC's trees are irregular, with rounded crowns, and read more like a mixed wood (seed 2 most clearly). Some flat-topped crowns remain (seed 9). On the phone, seed 3 is nearly empty by season 150 in both builds.

## The question
The user: trees should look like trees, and like their species; variation between trees can wait. Lone trees
must be compared as well as the stand. The species with data come first.

## What the eye-substitute found (and its limits)
- **A blinded "which is real?" judge** (fresh Opus agents, leaf-off, coarsened to QSM resolution, scaled to one
  height).
  - **Calibrated:** real against real 45%, gallery rejects 95%.
  - It caught **every** simulated broadleaf (hand beech, v4 beech, hornbeam, oak, maple, birch, lone and stand),
    144 of 144.
  - **The cues:** 98% regularity ("herringbone laterals", "fans of forks"); only 21% crown outline.
- **The same judge then caught every variant at 100%, including the gallery rejects.** So it couldn't rank
  candidates: it was saturated by scan artefacts and pair-setup cues. It was retired.
- **A simulated-against-simulated judge with a real reference strip was gated on the user's own past picks.**
  It failed the gate: 69% overall (79% lone, 58% stand) against the 75% required. Self against self was 48%.
  **No visual gate was used.** Its lone readings are advisory only.

## The objective instrument
- **Six within-tree descriptors**, computed on coarsened simulated trees and on real QSMs through one code path:
  spacingCV, attachPerM, insertSD, elevSD, curvPersist, earlyFork.
- **The scan-noise floor** comes from BioDiv's repeat reconstructions (5 per tree).
  - curvPersist is noise-dominated and dropped.
  - earlyFork is a check only.
  - The other four are usable, with noise bands (spacingCV ±0.05, insertSD ±6°, elevSD ±5°).
- **Real hornbeam:** TreeML lone n 23; BioDiv stand n 38 (fetched tonight).
- **Data fetched tonight:** TreeML's 342 QSMs (CC0), 68 Belgian hedgerow QSMs (CC-BY), and BioDiv's 38
  hornbeams.

## Results
### Regularity (hornbeam, the generic broadleaf)

| | spacingCV | attachPerM | insertSD | elevSD | summed \|z\| |
|---|---|---|---|---|---|
| real lone (TreeML) | 0.47 | 1.35 | 31.5° | 31.5° | — |
| real stand (BioDiv) | 0.40 | 1.79 | 26.9° | 26.2° | — |
| shipped (R0), lone | 0.28 | 2.32 | 6.2° | 10.6° | 23.1 |
| adopted base, lone and stand | in band | in band | in band | in band | about 5 (4.2–5.5) |

- **Existing params can't do it:** C4's ε and σ, storms and slower juvenile growth barely moved the descriptors.
- **The rules that do** (ADR 0055): stochastic lateral break, lognormal shoot length, and per-axis set-point
  and branch-angle offsets.

### Species (by data; S)

| species | patch | loss, start → tuned (fresh seeds) | in band | caveat |
|---|---|---|---|---|
| beech | shootLengthSD 0.35, betaSD 70 | 6.28 → 3.44 | 4/4 lone and stand | stand survival 26/32 |
| oak | shootLengthSD 0.3, axisSD 35, betaSD 40 | 9.71 → 3.20 | 4/4 lone, 3/4 stand | stand attachPerM low |
| birch | the base | 1.84 | 4/4 lone | no real stand data |

### Crown shape and height
- **Real lone hornbeams are domes** (D 0.55, n 23). Real stand trees are flat.
- **The simulated lone hornbeam is a dome to about 20 m**, then flattens as k falls. It grew to 49 m by 150.
  **The flat cap is a size effect.**
- **Rejected:**
  - L_h height caps: they starve the crown into a pole;
  - `r2.dLambdaTrunk`: a tiered column, with a composition shift;
  - geometry-only arching, skyExponent 0, raised limb λ.
- **Adopted, as a separate commit:** R1's reproductive sink as a height ceiling. Hornbeam is 29 m flat from 100,
  0.62× metamers, D 0.34, a compact rounded crown. Rowan 21.6 m, oak 33.2 m.

### The garden's evidence (`forestParams(160)`, 20 seeds, 300 seasons; the gate is ≥ base − 2)

| | floor | planted H/D | crown base | plateau | metamers | planted alive at 150 |
|---|---|---|---|---|---|---|
| base (d2c4f53) | 2 | 3 | 11 | 11 | 1.00× | 0.44 |
| + generic base | 2 | 2 | 10 | 10 | 1.04× | 0.43 |
| + species | 2 | 3 | 13 | 11 | 0.93× | 0.42 |
| + heights | 1 | 1 | 12 | 13 | 0.96× | 0.42 |

- All variants: all-tree H/D 16/20 against 20/20, a warning outside the gate.
- **Composition with heights:** hornbeam 0.43 → 0.20, beech 0.25 → 0.37, oak 0.01 → 0.06.
- **The milder base** (axisSD 40, betaSD 50) failed planted H/D (0 against 3).

### Memory and the plate
- **The 445 MB "regression" was a measuring artefact:** many worlds in one process, and WASM memory never
  shrinks. ADR 0054 changes memory by nothing.
- **The 200-cell plate peaks at 247 MB with the specimen** (seed 10), over the 230 MB gate. **`PLATE_MAX` is now
  170** (worst 216 MB).

## Open, for the user
1. Merge order: PR #48 (0.16.0) and then the RC; or the RC alone.
2. **The height commit:** keep it (rounded hornbeam, natural heights, but thin G-forest margins and a strong
   composition shift) or revert it.
3. **ADR 0055:** accept, and the purposes 15–17 with it.
4. **The flat cap's next mechanism:** λ's fall by level, with twigs keeping λ.
5. **Oak's stand branch density, and whether the judge is worth rebuilding** (its stand regime failed the gate).
