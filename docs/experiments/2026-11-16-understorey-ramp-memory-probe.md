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

This section reads the light-memory probe's runs only: s3d against each memory arm, with cap seasons paired by seed. It is `python3 -I m2.py <runs/light-memory-probe>`. The bootstrap uses 10,000 resamples of the 20 seeds; the sign-flip test is exact over all 2²⁰ sign patterns.

| width | arm | median cap (s3d's) | difference of medians [95% boot] | median paired d [95% boot] | mean d | worse / better / equal | sign test p | sign-flip p |
|---|---|---|---|---|---|---|---|---|
| 66 | s3dT25 | 14.5 (11) | +3.5 [−16.5, +10.5] | +0.5 [−10.5, +7.5] | −7.0 | 10 / 9 / 1 | 1.00 | 0.23 |
| 66 | s3dT5 | 17 (11) | +6 [−10.5, +18] | +2.5 [−4, +8] | −2.4 | 11 / 8 / 1 | 0.65 | 0.68 |
| 66 | s3dT10 | 17.5 (11) | +6.5 [−9.5, +21] | **+10 [+4, +13.5]** | +2.3 | **15 / 5 / 0** | **0.04** | 0.70 |
| 160 | s3dT25 | 62.5 (79.5) | −17 [−47, +18.5] | −2 [−37.5, +8] | −8.0 | 9 / 11 / 0 | 0.82 | 0.42 |

- **τ 2.5's 3.5-season miss is inside seed noise.** Paired by seed, the memory is worse in 10 runs and better in 9. The median paired difference is +0.5 season and the mean is −7, because a few seeds with long caps under s3d (seeds 5, 11 and 12: 66, 85 and 82 seasons) lose 30–78 seasons under τ 2.5. The 3.5 is a difference between the medians of two skewed sets: s3d's per-seed caps run from 0 to 85, and its bootstrap interval spans −16.5 to +10.5.
- **τ 10's miss is systematic.** It is worse in 15 of 20 seeds (sign test p 0.04), with a median paired difference of +10 seasons [+4, +13.5]. Its mean stays near 0 only because of the same long-cap seeds.
- So M2 as written ("median ≤ s3d's") failed τ 2.5 on a noise-sized gap. A paired bar would not have failed it. The bar stands as it was pre-registered; this is a reading for the user.

## Results (seeds 1–20, b223db6)

**Runs:** 300 new runs at b223db6 (240 for the new arms, plus head, s3d and M re-run at 66 cells) took 81.1 min on 10 simulators, after a clean pilot (seeds 1–3, 13.9 min). Another 60 runs were linked. **The reuse holds.** Every linked run's params equal this script's, and all 60 re-runs at 66 cells have the light-memory probe's hashes ([`reuse-check.txt`](code/2026-11-16-understorey-ramp-memory-probe/reuse-check.txt)). Gates 3–4 pass in every arm, 10 of 10 tests each ([`tests.json`](code/2026-11-16-understorey-ramp-memory-probe/tests.json)). The output is in [`bars.txt`](code/2026-11-16-understorey-ramp-memory-probe/bars.txt), [`output.txt`](code/2026-11-16-understorey-ramp-memory-probe/output.txt), [`b2-tables.md`](code/2026-11-16-understorey-ramp-memory-probe/b2-tables.md) and [`m2.txt`](code/2026-11-16-understorey-ramp-memory-probe/m2.txt).

### The ramp arms: none passes

| arm | #122 gates 1–2, 160 / 66 | ADR 0068 bars 1–5 vs head | bar 1: ≥ 7 cm in band, frames (median/ha) | bar 2: share ≥ 0.6, frames (median) | N1 | canopy/ha | canopy deaths/run | light-demander frames | wall/run at 66 (÷ head) | cap seasons 160 / 66 | cohort dead by 300, 160 / 66 | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| head | 20 / 20 | – | 19 (266) | 21 (0.50) | – | 109 | 10.3 | 53 | 111 s (1.00) | 235 / 186.5 | 22% / 58% | – |
| s3d | 20 / 19 | ✗✗✓✓✗ | 14 (258) | 22 (0.54) | – | 109 | 10.8 | 47 | 129 s (1.16) | 79.5 / 11 | 29% / 73% | reference |
| M | 20 / 19 | ✗✗✓✓✗ | 16 (297) | 18 (0.50) | – | 133 | 10.1 | 49 | 107 s (0.96) | 62.5 / 14.5 | **22%** / 47% | reference |
| Mr10 | 20 / 18 | ✗✗✓✓✗ | 15 (250) | 29 (0.55) | ✗ (bar 1) | 125 | 14.6 | 46 | 102 s (0.92) | 57.5 / 19.5 | 42% / 79% | fail |
| Mr15 | 20 / 18 | ✗✓✓✗✗ | 9 (196) | 37 (0.73) | ✗ (bar 1) | 117 | 15.7 | 49 | 104 s (0.94) | 47 / 17 | 67% / 91% | fail |
| Mr25 | 20 / **17** | ✗✓✗✗✗ | 9 (109) | 42 (0.83) | ✗ (bar 1) | 102 | 22.9 | 44 | 102 s (0.92) | 64 / 14 | 91% / 96% | fail (and gates) |
| s3dr15 | 20 / **17** | ✗✓✓✗✗ | 7 (156) | 41 (0.79) | ✗ (bar 1) | 109 | 20.7 | 49 | 132 s (1.19) | 58 / 19 | 73% / 93% | fail (and gates) |

- **No arm passes.** Bar 1 (≥ 7 cm stems in 200–400/ha) fails everywhere: no arm reaches 30 of 60 frames, and none beats head's 19. Bar 5 (light-demanders in the canopy) fails everywhere too: 44–49 frames against head's 53. Every ramp arm also fails N1, because the ramp costs band frames against its arm without the ramp.
- **What the memory changes is small.** At θ_hi 0.15, the memory arm (`Mr15`) against the control (`s3dr15`):
  - the cohort's deaths fall from 73% to 67%;
  - band frames rise from 7 to 9;
  - canopy deaths per run fall from 20.7 to 15.7, which is still 1.52× head's, so bar 4 fails by a hair;
  - #122's phone gate rises from 17 to 18 of 20.
  The memory delays the ramp's kills a little. It does not stop them.
- **The ramp still kills before release, as in the first probe.** The cohort's death share rises with θ_hi: 42% (0.10), 67% (0.15), 91% (0.25). Only θ_hi 0.10 comes near head's 22%. The survivors cross 7 cm more often (48–76% against head's 29%), but there are fewer of them. So the ≥ 7 cm count is held below the band through season 200 (Mr15: 156 / 172 / 446 per ha at 100 / 200 / 300), and it reaches the band late or overshoots.
- **The phone empties again.** At 66 cells every ramp arm leaves a median of 38–76 stems ≥ 7 cm/ha from season 200, one or two stems in the plot (head: 114). #122's gate 2 falls to 17–18 of 20.
- **M without the ramp is where the memory helps.** It keeps head's 22% cohort deaths, the most canopy trees/ha (133), the phone's season at 0.96× head's, and the most ≥ 7 cm/ha at 160 (median 297, though it overshoots to 1,055/ha at season 300). It fails ADR 0068's bars 1, 2 and 5 as s3d does. So "the ramp isn't needed" is not shown either: neither M nor any ramp arm reaches the band.
- **The wall-time bar passes** in every arm: 0.92–1.19× head's at 66 cells.
- **Cap seasons (reported):** the ramp lowers the desktop's cap (M 62.5 → 47–64) and raises the phone's (14.5 → 14–19.5).

### The B2 arms: both fail; the memory does not stop beech's takeover

| B2 arm | vs | B2a beech bar 6, z at 100 / 300 | B2b hornbeam at 100 / 300 (inside support); its share at 300 | B2c beech's share at 300 | B2d maple@300 | B2e band frames | B2f gates | B2g phone cap | verdict |
|---|---|---|---|---|---|---|---|---|---|
| MB2 | M | 1.32 / 0.95 ✗ | unreadable (7) / unreadable (5); 0.08 ✗ | 0.89 ✗ | ✓ (fails in M too) | 12 vs 16 ✗ | ✓ (19/20 at 66) | 40.5 vs 14.5 ✗ | fail |
| Mr15B2 | Mr15 | 0.59 / 0.61 ✓ | unreadable (4) / unreadable (5); 0.08 ✗ | 0.89 ✗ | ✓ (unreadable in Mr15) | 14 vs 9 ✓ | ✗ (16/20 at 66) | 20.5 vs 17 ✗ | fail |

- **Beech takes the canopy as it did in #134's stand check.** At 300, beech holds 0.89 of the canopy trees in both B2 arms (B2 alone: 0.92; M: 0.13; Mr15: 0.04). Hornbeam falls to 0.08, and its cells become unreadable: 4–7 trees inside Tallo's support.
- **The takeover happens between seasons 100 and 200**, as #134's trace found. In MB2 at 160 cells, the canopy's species at 100 are hornbeam 0.27 and beech 0.25; at 200, beech 0.86.
- **The memory doesn't reverse it.** It cut recruitment ÷ 10 in the light-memory probe. Here, under B2, the canopy still turns to beech in the same window. Recruits were not traced in this probe, so whether they are still beech's is not shown; #134's trace says they were without the memory.
- **With the ramp, beech passes bar 6** at both seasons (z 0.59 and 0.61; Mr15 alone, 1.57 and 1.62). That is beech's own bar on a beech wood, as in B2's own result.
- **MB2 costs the phone:** cap seasons 14.5 → 40.5, and no ≥ 7 cm frame in the band at 66 cells (median 1,269/ha at 300).

### The diagnostic

| arm | drawn < 7 cm at 200, per run (160) | dead by 300, 160 / 66 | survivors ≥ 7 cm at 300 (160) |
|---|---|---|---|
| head | 63.9 | 22% / 58% | 29% |
| s3d | 43.1 | 29% / 73% | 32% |
| M | 56.9 | 22% / 47% | 37% |
| Mr10 | 51.4 | 42% / 79% | 48% |
| Mr15 | 38.7 | 67% / 91% | 65% |
| Mr25 | 27.3 | 91% / 96% | 76% |
| s3dr15 (control) | 20.1 | 73% / 93% | 61% |

- **Lower with memory than in the control:** yes, but by 6 points at 160 cells (67% against 73%) and 2 at 66 (91% against 93%).
- **Toward head's 22%:** only at θ_hi 0.10 (42%), and the phone stays at 79%. The first probe's no-memory arms were 60% (t10), 79% (t15) and 92% (t25). So the memory with stubs moves each θ_hi by about 10–18 points, not to head's level.

## Conclusions and recommendation

- **No arm passes its bars, and the ramp should not be adopted on this evidence.**
  - The light memory removes one season's noise from `topLight`, but the ramp's failure in the first probe was not the noise. A stem whose mean top light sits below θ_hi is genuinely dark, and the ramp kills it before a gap comes. The memory only delays that by about τ seasons.
  - The ramp concentrates the ≥ 7 cm stems in the canopy (bar 2 passes at θ_hi ≥ 0.15). But it does that by removing the subcanopy, so the band (bar 1) is never reached, and the phone width empties.
- **What #132 would need is not a re-tune.** These are the first probe's options:
  - a release term, such as a death rate that waits for a stem to have had a chance at a gap;
  - a phone-specific ceiling;
  - a different stand.
  Light memory was the cheapest candidate for "a release term", and it is not enough.
- **M (stubs + τ 2.5) without the ramp is the best garden in this probe:**
  - head's cohort survival;
  - +22% canopy trees;
  - the phone's season cheaper than head's;
  - the paired M2 reading (above) shows its phone cap is no worse than s3d's, seed for seed.
  
  If ADR 0072/0073 are adopted, M is the candidate. The understorey band (#129's targets 2–3) stays open: under M the ≥ 7 cm count crosses the band between 200 and 300 rather than holding in it.
- **B2 is not rescued by the understorey rules.**
  - Beech's takeover survives the memory. The ramp acts on dark stems, so it cannot touch a beech that is winning the race (an inference: `topLight` per tree was not read here).
  - B2's bar set fails on hornbeam, beech's share and the phone's cap in both arms.
  - #135 (the lone λ₀ arm) should go ahead with today's beech in the stand. A beech-side competitive cost, or accepting a beech wood, is still the user's call (#134).
- **For the user:** whether to close #132's probe phase on this (the ramp stays built and off). Separately, whether the M2 bar should be read paired, which would make τ 2.5 pass the light-memory probe.

## Decisions (the user, 2026-11-19)

The user accepted both recommendations (in chat: "I'll accept your recommendations"):
1. #132's probe phase is closed on this result. The `topLight` ramp (ADR 0068) stays built and off. The understorey band stays open.
2. M2 is read paired by seed, so τ 2.5 passes the light-memory probe (ADR 0073's status). M (s3d + τ 2.5, no ramp) is the candidate for the one garden adoption.
