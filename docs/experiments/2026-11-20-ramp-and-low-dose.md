# #138's ramp at θ_hi 0.10 with a low shade dose δλ, on M (2026-11-20)

**Ticket:** [#138](https://github.com/epabarker/tree-simulation/issues/138) (understorey saplings with a carbon surplus do not grow). **Follows:** [the low-dose ladder](2026-11-20-sapling-release-low-dose.md) (δλ 0.10–0.25, PR #161) and [the ramp re-probe](2026-11-16-understorey-ramp-memory-probe.md) (θ_hi 0.10–0.25 with light memory). **ADRs:** [0068](../decisions/0068-understorey-signal-design.md) (the `topLight` ramp, the band), [0071](../decisions/0071-shade-apical-control.md) (δλ), [0072](../decisions/0072-seedling-stubs.md) and [0073](../decisions/0073-light-memory.md) (M). Exploratory: params only, nothing under `rust/` or `src/` changes, and no default moves. The user approved the probe on 2026-11-20; it is the last before the garden adoption.

**Why.** The low-dose ladder found that δλ 0.10 and 0.15 grow M's shaded saplings at a realistic rate (0.18 and 0.28 m a decade) but flood the late frames: stems ≥ 7 cm DBH at frame 200 are 484 and 594/ha against `M`'s 204 (ADR 0068's band is 200–400), and at 300 1,172 and 1,266 against `M`'s 1,055. Its conclusion was that a release needs a sink for the stems it sends past 7 cm. The ramp re-probe found the opposite failure: ADR 0068's `topLight` ramp at θ_hi 0.10 kills dark stems (42% of the cohort dead by 300 against `M`'s 22%) and empties the phone. The two have never been run together. **The idea:** the ramp removes the stems that stay dark, while δλ lets the rest grow out of the dark. **Does the pair give realistic sapling growth without worsening the late overshoot?**

**Code:** [`code/2026-11-20-ramp-low-dose/`](code/2026-11-20-ramp-low-dose/): `run.ts`, `bars.ts` and `stand.py`, copied from the low-dose ladder's and changed only in the arms, the reuse (below), the ramp re-probe's cohort (its code, unchanged) and the phone's stem count added to each garden, and bars 14–16. Every measure the ladder read is computed by the same code.

## Arms and bars (fixed before the runs)

Written and committed before any run of this probe. Nothing below this heading changes them.

### Arms

| arm | world | per species | source |
|---|---|---|---|
| `M` | o4: s3d (`stubs`, `stubLight` 0.15, `stubDeath` 3, `stubDemote` 0.075) + `lightMemory` 2.5 | – | the reference: the candidate garden; reused |
| `Mr10` | as `M`, and o4 `suppressionSignal` "topLight", `topLightThreshold` (θ_hi) 0.10, `mSuppression` 1 | `o4.survivalLight` (θ_sp): the ramp re-probe's values | the ramp re-probe's "M + ramp 0.10"; its 160-cell gardens reused |
| `Mdl10` | as `M`, and `r5.dLambda` 0.10 | every species: `r5.dLambda` 0.10 | the low-dose ladder's; reused |
| `Mdl15` | as `M`, and `r5.dLambda` 0.15 | every species: `r5.dLambda` 0.15 | the low-dose ladder's; reused |
| `Mr10dl10` | as `Mr10`, and `r5.dLambda` 0.10 | θ_sp, and `r5.dLambda` 0.10 | new |
| `Mr10dl15` | as `Mr10`, and `r5.dLambda` 0.15 | θ_sp, and `r5.dLambda` 0.15 | new |

- **θ_sp:** birch 0.21, oak 0.114, beech 0.034, hornbeam 0.033, willow 0.16, rowan 0.11, maple 0.075, holly 0.035, pine 0.25, fir 0.0275 (`cli/understorey-probe.ts`'s `SURVIVAL_LIGHT`, as in the ramp re-probe).
- **Patched per species.** δλ is set on the world and on every species' own patch, θ_sp on every species' patch (a world-level patch misses fields species set). `run.ts` prints each species' effective δλ, signal, θ_hi, m_s, θ_sp and C5 flag per arm as a check.
- **Held fixed:** M's params; HEAD's seed supply, `maxTrees`, `c2.rotate`; R1's `unspent` "lost"; one commit for every new run.
- **Stages, per arm and seed:** as the ladder's: the garden (`forestParams(width, seed)`) at 160 and 66 cells to season 300, metamers at 100, 200 and 300; the sapling probe (`rust/core/examples/sapling_probe.rs`) on the 160-cell params to 300; lone beech, hornbeam, oak and maple (`loneTreeParams`) to 100, seeds 1–3.
- **Reuse.** Nothing under `rust/`, `src/core/`, `src/wasm/` or `cli/` has changed since the ladder's commit (ced255b). Since the ramp re-probe's (b223db6) only #135's floored-height rule was added (`extent.rs`, off and bit-identical by its own check). Every linked run's params must equal this script's, or the script stops.
  - From the ladder: `M`'s 160-cell gardens and sapling probes; `Mdl10`'s and `Mdl15`'s gardens at both widths, sapling probes and lone trees.
  - From the ramp re-probe: `Mr10`'s 160-cell gardens. It ran no sapling probe or lone beech and maple, so `Mr10`'s sapling probes and lone trees are new here.
  - On seeds 1–3 every linked garden and sapling probe is re-run under `check/`: the garden's hash and `saplings.csv`'s bytes must equal the linked run's.
  - `M`'s and `Mr10`'s 66-cell gardens (the phone's wall within this load) and `M`'s lone trees are re-run on every seed, and each hash must equal its source's.
  - If any check differs, the affected arm is re-run in full and the note says so. The check is written to `reuse-check.txt`.
  - `Mdl10`'s and `Mdl15`'s phone wall times are the ladder's load; they are reference arms, and bar 10 for them is read as reported there.
- **Pilot:** seeds 1–3 of the two new arms (with the re-runs and checks) first, read for crashes and wall time, and judged per frame on stems ≥ 7 cm/ha at frames 200 and 300 at 160 cells (each seed's value, against `M`'s, `Mr10`'s and the same dose alone's on the same seed), not on a median over frames. Both new arms then run on seeds 1–20 whatever the pilot shows; the pilot's runs are part of the 20.
- **Simulators:** at most 10 (`-j 10`, the sapling probe counted), after `pgrep -c treesim`.

### Definitions

- As the ladder's: the sapling class (live trees 4–20 cells, 1–5 m, seasons 50–290 of the 160-cell sapling probe, all species); a sapling-season without growth; the gain per decade; the shaded beech and hornbeam saplings (top bud light `qTop` under 0.5); DBH at 1.3 m; a canopy tree (drawn and strictly over half the season's top height); per hectare on width × 64 cells of 0.25 m; frames 100, 200 and 300; canopy deaths; cap seasons; wall time; the distance from the band, max(0, 200 − x, x − 400); beech's canopy share at 300.
- **The cohort** (the ramp re-probe's, its code unchanged): the drawn stems (≥ 1.3 m) under 7 cm DBH alive at season 200, and the share of them dead by 300, pooled over the 20 runs per width. The share of its survivors that are ≥ 7 cm at 300 is reported beside it. Under the ramp re-probe `M` was 22% / 47% (160 / 66 cells) and `Mr10` 42% / 79%.
- **The phone's stems:** the number of stems ≥ 7 cm DBH in the 66-cell plot at a frame (one stem is 38/ha there), the median over the 20 runs. Under the ladder `M` is 114 / 76/ha at frames 200 / 300, that is 3 / 2 stems.

### Bars

Bars 1–13 are the ladder's, as written there and judged by the same code (`bars.ts`), read against `M` for every arm (the two new arms are judged; `Mr10`, `Mdl10` and `Mdl15` are read as references):

1. **Per seed, no growth** below `M`'s on the same seed in **≥ 15 of 20** seeds.
2. **Per seed, gain** above `M`'s on the same seed in **≥ 15 of 20** (in both, a seed where either side has under 30 sapling-seasons is a miss).
3. **Pooled no growth ≤ 0.61.**
4. **#122's gates** in **≥ 18 of 20** runs at each width.
5. **Canopy trees/ha** at each width **at least `M`'s**.
6. **The band kept:** frames with stems ≥ 7 cm at 200–400/ha at 160 cells **no fewer than `M`'s** (of 60; the ladder's `M`: 16).
7. **Maple's pooled no-growth share at most `M`'s + 0.05** (`M` 0.83).
8. **#134's bar 6** (`stand.py`): hornbeam passes at 100 and 300, and no species–season cell that passes under `M` fails.
9. **Canopy deaths** per run (mean, 160 cells) **at most 1.5× `M`'s**.
10. **The phone's wall time** (median per run at 66 cells) **at most 1.25× `M`'s** (`M`'s 66-cell runs re-run in this load).
11. **The lone trees' hashes** at 100 equal `M`'s (or, where one differs, inside the ladder's noise bar).
12. **Realism:** the median gain per decade of shaded beech and hornbeam saplings, seeds 1–20 pooled, **within 0.1–0.5 m** (`M` 0.04). The seeds whose own median is in the band are reported beside it.
13. **The late frames no worse than `M`:** at 160 cells, the median over runs of stems ≥ 7 cm/ha at frame 200 and at frame 300, each **no farther from the 200–400 band than `M`'s**: `M` is 204/ha at 200 (in the band, so the arm must be in it too) and 1,055/ha at 300 (so the arm must be at most 1,055 there). Per seed counts (no worse than `M`'s same seed; in the band) are reported; the 66-cell values are reported, not gated.

And three new, judged on the paired arms (`Mr10dl10`, `Mr10dl15`) only:

14. **The ramp lowers the late stems against the same dose alone:** at 160 cells, the median over runs of stems ≥ 7 cm/ha at frame 200 and at frame 300 each **strictly below** the same dose's δλ-only arm (`Mr10dl10` against `Mdl10`: 484 / 1,172; `Mr10dl15` against `Mdl15`: 594 / 1,266). The seeds lower than the same seed's δλ-only value are reported beside it.
15. **The cohort:** the share of the cohort dead by 300 at 160 and at 66 cells each **at most `Mr10`'s** (the ramp re-probe's 42% / 79%, re-read here on `Mr10`'s runs). This is the idea under test: δλ lets the ramp's dark stems grow out of the dark before it kills them. `M`'s (22% / 47%) is reported beside it.
16. **The phone:** at 66 cells, the median number of stems ≥ 7 cm in the plot at frame 200 and at frame 300, each **at least `M`'s** (3 and 2 stems). The ramp emptied it before (`Mr10`: 38–76/ha from 200). The runs with no such stem at 200 or 300 are reported beside it, against `M`'s.

A paired arm **passes** if it passes all sixteen. **A pass is not adoption:** it is recommended to the user. No default changes in this PR, and no ADR changes.

**Reported, not gated:** maple's no-growth share; beech's canopy share at 300 at both widths, and the canopy's leading species; the seedling bank (live stems under 1.3 m) per frame; cap seasons at 160 and 66; band frames at both widths; stems ≥ 7 cm/ha by frame at both widths; thrown canopy trees and canopy deaths per run, and canopy deaths as a share of canopy trees a season; the gain per decade over the whole class; the no-growth share per species; the cohort's survivors ≥ 7 cm at 300; bars 1–13 on `Mr10` against `M`.

### Expected (written before the runs)

- **Bar 12 likely holds:** the ramp acts on stems that are already dark and not growing; the saplings it spares are released as under δλ alone, so the shaded gain should stay near 0.18 / 0.28 m. It may rise a little (fewer competitors) or fall (the ramp's deficit reduces vigour before death).
- **Bar 14 is the question.** The ramp re-probe's `Mr10` held 250/ha median over frames against `M`'s 297, so the ramp does thin the stems that would cross 7 cm. Whether it thins the δλ arms' extra ~280–390/ha at 200 is open: the stems δλ releases are the ones that grow, and the ramp spares growing stems. The likeliest outcome is a small reduction at 200 and little at 300, so the arms pass 14 and still fail 13.
- **Bar 15 may pass:** δλ raises the top light of released stems, so fewer stay under θ_hi.
- **Bar 16 is at risk:** the ramp emptied the phone in every ramp arm; δλ alone kept `M`'s 114 / 76/ha there at 0.10.
- **Maple (bar 7)** froze at every dose; the ramp adds shade-death for maple saplings under θ_sp 0.075, so it likely fails again.
- **The lone trees** hash as `M`'s: R5's shade and the ramp's deficit are both zero for a lone tree in full light.
