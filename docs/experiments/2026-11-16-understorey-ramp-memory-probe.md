# #132's ramp re-probed with O4's light memory on (2026-11-16)

**Tickets:** [#132](https://github.com/epabarker/tree-simulation/issues/132) (the understorey), [#134](https://github.com/epabarker/tree-simulation/issues/134) (beech's B2), [#122](https://github.com/epabarker/tree-simulation/issues/122) (the gates). **ADRs:** [0068](../decisions/0068-understorey-signal-design.md) (the `topLight` ramp and its bars), [0072](../decisions/0072-seedling-stubs.md) (stubs, s3d), [0073](../decisions/0073-light-memory.md) (light memory). The design was approved by the user on 2026-11-16 ("I support all recommendations"). Exploratory: nothing here changes a default, and no code under `rust/` changes.

**Why.** [The first #132 probe](2026-11-13-understorey-probe.md) found that the ramp kills the subcanopy before a gap releases it: 60–92% of the drawn stems under 7 cm at season 200 were dead by 300, against HEAD's 22%. [The light-memory probe](2026-11-16-light-memory-probe.md) then found that one season's light under the canopy is noise (ρ ≈ 0 between seasons), and that the ramp read one season's Q_top/C. With `o4.lightMemory` on, the ramp reads each tree's running mean (`principles::memory::top`). The question is whether it then thins the subcanopy without emptying it. And #134's trace found that B2's beech takeover is carried by recruits, which this probe's understorey rules act on.

**Code:** [`code/2026-11-16-understorey-ramp-memory-probe/`](code/2026-11-16-understorey-ramp-memory-probe/): `run.ts` (arms, runs, reuse, summary, gates 3–4), `b2.py` (bar 6 and the canopy's species through #134's `stand.py`), `bars.ts` (the verdicts), `m2.py` (the paired M2 reading).

## Arms and bars (fixed before the runs)

Written and committed before any run of this probe. Nothing below this heading changes them.

### Arms

The garden (`forestParams(width, seed)`) at widths 160 and 66, seeds 1–20, to season 300, natively, with metamers at 100, 200 and 300. A pilot on seeds 1–3 comes first and is read for crashes and wall time only; its runs are part of the 20.

| arm | world o4 | per species | beech |
|---|---|---|---|
| `head` | – | – | HEAD |
| `s3d` | `stubs` on, `stubLight` 0.15, `stubDeath` 3, `stubDemote` 0.075 | – | HEAD |
| `M` | s3d + `lightMemory` 2.5 (the light-memory probe's `s3dT25`) | – | HEAD |
| `Mr10`, `Mr15`, `Mr25` | M + `suppressionSignal` "topLight", `topLightThreshold` (θ_hi) 0.10 / 0.15 / 0.25, `mSuppression` (m_s) 1 | `o4.survivalLight` (θ_sp), the first probe's values | HEAD |
| `s3dr15` (the control) | s3d + the ramp at θ_hi 0.15, m_s 1; memory off | θ_sp | HEAD |
| `MB2` | M | – | `r2.levels.0.lambda` 0.6708 (B2) |
| `Mr15B2` | Mr15 | θ_sp | B2 |

- **θ_sp:** birch 0.21, oak 0.114, beech 0.034, hornbeam 0.033, willow 0.16, rowan 0.11, maple 0.075, holly 0.035, pine 0.25, fir 0.0275 (`cli/understorey-probe.ts`'s `SURVIVAL_LIGHT`).
- **B2** is set on beech's own species patch through `cli/trials.ts` `withAssign`, as #134's stand check set it, after the ramp's species patch.
- **Held fixed:** s3d's params; `maxTrees`; the seed supply (HEAD's, ADR 0070 rejected); `c2.rotate` on; #138's δλ (`r5.dLambda`) and `r1.unspent` at their defaults (off); one commit for every new run. `run.ts` prints each species' effective O4 params and λ₀ per arm, as a check that the patch reaches them. Every garden species has C5's relative test on, so Q_top is computed for all of them (ADR 0068 decision 2).
- **Reuse:**
  - At 160 cells, `head`, `s3d` and `M` are linked from the light-memory probe's runs (`s3dT25` for `M`), which were made at 6a1bd67. Nothing under `rust/`, `src/` or `cli/` has changed since. Each linked run's `record.json` params must equal this script's for that arm and seed, or the script stops.
  - At 66 cells the same three arms are re-run here. That keeps the phone's wall times within one load, and it is the reuse check: every re-run's `hash.txt` must equal the light-memory probe's. If any differs, the 160-cell runs are re-run too and the note says so.
- **Simulators:** at most 10 (`-j 10`).

### Definitions

These are the first #132 probe's definitions, unchanged.
- **DBH:** `cli/allometry.ts`'s trunk cylinder at 1.3 m of stem, unpooled.
- **A canopy tree:** drawn (≥ 1.3 m) and strictly over half the season's top height (`stand.csv` `topHeight100`).
- **Per hectare:** n / ha, ha = width × 64 × 0.0625 m² / 10⁴.
- **Frames:** seasons 100, 200 and 300, so 60 frames per arm and width.
- **A canopy death:** a canopy tree in the season before its death, not thrown.
- **Light-demanding:** shade tolerance below 3.
- **Cap seasons:** `run.json` `meta.capSeasons`.
- **Wall time:** `wall.txt` per run, its median over the 20 runs at 66 cells.

### Gates (#122; each in ≥ 18 of 20 runs per arm and width)

1. A canopy tree in every season after 50.
2. At 66 cells, a canopy tree in every season from 100.
3. A garden checkpoint saved by this build (`forestParams(66, 1)`, 30 seasons) loads, takes the arm's params by `setParams`, and grows on 10 seasons alike twice. The frozen fixtures (v2, v3, garden 0.14.0) load.
4. Lone oak and hornbeam, seeds 1–3, season 100, under the arm's params: state hashes equal to head's.

### Bars for the ramp arms (`Mr10`, `Mr15`, `Mr25`, `s3dr15`)

An arm passes only if it passes every gate and all of these:
- **ADR 0068's adoption bars 1–5 against HEAD, unchanged** (160 cells, 60 frames):
  1. stems ≥ 7 cm at 200–400/ha in ≥ 30 of 60 frames, and in more frames than head;
  2. a ≥ 7 cm canopy share ≥ 0.6 in ≥ 30 of 60 frames, and in more frames than head;
  3. canopy trees/ha from season 100 (the median over runs of each run's median) not below head's;
  4. canopy deaths per run (mean) ≤ 1.5× head's;
  5. frames with a light-demanding species in the canopy ≥ head's.
- **N1, the ramp earns its place:** bar 1's and bar 2's frame counts each no lower than the same arm's without the ramp (`M` for the `Mr` arms, `s3d` for the control). ADR 0068's bars are also read on `M` itself, as a reference. If `M` passes bars 1–5 and no ramp arm beats it on bars 1–2, the ramp isn't needed.
- **The phone's wall time:** the median wall per run at 66 cells ≤ 1.25× head's.

If more than one arm passes, the pick is the one with the most frames on bar 1, then bar 2 (ADR 0068's rule).

**Cap seasons are reported only, with no bar** (ADR 0068 decision 4; ADR 0065 decision 2).

**The diagnostic (reported, not gated):** the drawn stems under 7 cm DBH at season 200, and the share of them dead by 300. It is expected to fall toward HEAD's (22% in the first probe), and to be lower with the memory (`Mr15`) than in the control (`s3dr15`). The share of survivors that are ≥ 7 cm at 300 is reported beside it.

### Bars for the B2 arms (`MB2` against `M`, `Mr15B2` against `Mr15`)

These are the bars posted on #134 (the user, 2026-11-16), each read against the same arm without B2. Bar 6 is #134's stand check's, read by its `stand.py`: 160 cells, canopy trees, seeds pooled, |median Tallo CR z| ≤ 1 on ≥ 8 trees inside Tallo's DBH support, pooled with season 200 below that floor. A B2 arm passes only if all of these hold:
- **B2a:** beech passes bar 6 at 100 and at 300.
- **B2b:** hornbeam stays readable (≥ 8 canopy trees inside Tallo's support) and passing at 100 and at 300, and it holds the largest share of the canopy trees at 300 (seeds pooled, 160 cells).
- **B2c:** beech's share of the canopy trees at 300 ≤ 0.4 (seeds pooled, 160 cells).
- **B2d:** maple@300 kept. If maple passes bar 6 at 300 in the arm without B2, it passes in the B2 arm.
- **B2e:** stems ≥ 7 cm no worse: ADR 0068's bar-1 frame count at 160 cells ≥ the arm without B2's.
- **B2f:** gates 1–4 as above, in ≥ 18 of 20.
- **B2g:** the phone's cap seasons no worse: the median at 66 cells ≤ the arm without B2's.
- The phone's wall time is reported beside them, against the 1.25× bar.

### Also reported

- At both widths: ≥ 7 cm/ha per frame, the ≥ 7 cm canopy share, drawn stems/ha, the bank (drawn below 1.3 m), cap seasons per run, thrown canopy trees.
- `stand.py`'s full tables for `M`, `Mr15`, `MB2` and `Mr15B2`: each species' cells, the stand H/D and the canopy's species at both widths.

### Expected (written before the runs)

- The memory should slow the ramp's kills, because a tree's mean must stay below θ_hi for about τ seasons before the deficit reaches its full value. The cohort's death share should fall from the control's toward head's 22%.
- The risk is the first probe's: the band stays short because the ramp still acts before a gap releases the stem, only later.
- B2 under the memory: s3dT25 cut recruits ÷ 10, and B2's takeover is carried by recruits. So beech's share may fall from B2's 0.92, but whether it reaches 0.4 is open.

## M2, read per seed (existing runs only)

To be filled from `m2.py` on the light-memory probe's runs: s3d against s3dT25 (and τ 5, 10), cap seasons per seed at 66 cells, paired.

## Results

To be filled after the runs.
