# The understorey probe: `topLight`'s ramp against each species' survival light (2026-11-13)

**Ticket:** [#132](https://github.com/epabarker/tree-simulation/issues/132), part of [#129](https://github.com/epabarker/tree-simulation/issues/129). **Design:** [ADR 0068](../decisions/0068-understorey-signal-design.md). Spec §O4.4, §O4.6, §6, §10; ADRs 0063, 0065, 0067.

**Question.** Does O4's `topLight` suppression signal, made a ramp from a world ceiling θ_hi down to each species' sapling survival light θ_sp (`o4.survivalLight`, built in 731f279), bring the garden's stems ≥ 7 cm DBH into 200–400/ha with a canopy share of at least 0.6 (#129's targets 2 and 3), without costing the canopy, its trees, or the light-demanders?

**Script:** [`cli/understorey-probe.ts`](../../cli/understorey-probe.ts) (`node cli/understorey-probe.ts --seeds 1-3` for the pilot, then with no options for seeds 1–20; resumable, so the full run reuses the pilot's runs).

## Bars, fixed before the runs

Written and committed before any run of this note. Nothing below this section changes them.

### Arms
- **head:** `forestParams(width, seed)` at this commit: the `carbon` signal, m_s 1.
- **t10, t15, t25:** `o4.suppressionSignal: "topLight"`, `topLightThreshold` (θ_hi) 0.10, 0.15 or 0.25, `mSuppression` (m_s) 1.
- **t15m3:** θ_hi 0.15 at m_s 3 (the rate bracket).
- **θ_sp per species** in every `t` arm (`o4.survivalLight`, a species patch):
  - the target file's `shade.survivalLight` point target where there is one (Hagemeier & Leuschner 2019): birch 0.21, oak 0.114, beech 0.034, hornbeam 0.033;
  - otherwise the midpoint of the file's `survivalLight` band ("by score"): willow 0.16, rowan 0.11, maple 0.075, holly 0.035 (pine 0.25 and fir 0.0275 are set but not in the garden's mix).
- No other change: hornbeam's seed supply is HEAD's (d1's `cSeed` 300 is not carried).
- **ADR 0068's check:** C5's relative test is on for every garden species (`c5.enabled`, `Trel` > 0), so Q_top is computed for all of them.
- **Widths 160 and 66**, seeds 1–20, 300 seasons, natively: 5 arms × 2 widths × 20 seeds = 200 runs. Metamers are kept at seasons 100, 200 and 300 (`--snapshots`) for DBH. **Pilot first:** seeds 1–3, read for crashes and wall time only; the bars are judged on seeds 1–20.

### Definitions
- **DBH:** `cli/allometry.ts`'s, 2 × the radius of the trunk cylinder whose span holds 1.3 m of stem length, read from metamers.csv. Codominant forks are not pooled here (ADR 0067's pooling lands in #134).
- **A canopy tree:** stand.rs's (ADR 0065): drawn (≥ 1.3 m) and strictly over half the top height (stand.csv `topHeight100`) in that season.
- **Per hectare:** `Math.round(n / ha)`, ha = width × 64 × 0.0625 m² / 10⁴ (0.064 ha at 160 cells: 13–25 stems is 200–400/ha).
- **The ≥ 7 cm canopy share:** stems ≥ 7 cm DBH that are canopy trees, over stems ≥ 7 cm DBH (0 with none).
- **A canopy death:** a tree that was a canopy tree in the season before it died, and was not thrown (metrics.csv `broken` 0 on its death row). Starvation deaths are not separated; under every arm they are R1's, as at head.
- **Light-demanding:** shade tolerance below 3 (the scale's middle): birch, willow, oak and rowan.

### Gates (#122; each ≥ 18 of seeds 1–20, per arm × width)
1. A canopy tree in every season after 50 (stand.csv `canopy` ≥ 1, seasons 51–300).
2. At 66 cells, a canopy tree in every season from 100.
3. A garden checkpoint (`forestParams(66, 1)`, 30 seasons) saved by this build loads, takes the arm's params by `setParams`, and grows on 10 seasons alike twice; the frozen fixtures (v2, v3, garden 0.14.0) load.
4. Lone oak and hornbeam (`loneTreeParams`), seeds 1–3, season 100, under the arm's patch: state hashes equal head's.

### Adoption bars (160 cells; 60 frames: seasons 100, 200, 300 × 20 seeds)
An arm passes only if it passes every gate and all five:
1. stems ≥ 7 cm at 200–400/ha in **≥ 30 of 60** frames, **and in more frames than head**;
2. a ≥ 7 cm canopy share ≥ 0.6 in **≥ 30 of 60** frames, **and in more frames than head**;
3. canopy trees/ha from season 100 not below head's: the median over runs of each run's median canopy trees/ha over seasons 100–300, at least head's (#129's target 1 is not bought);
4. canopy deaths per run (the mean over runs) **≤ 1.5×** head's;
5. frames with a light-demanding species in the canopy **≥** head's.

If more than one arm passes, the recommendation is the one with the most frames on bar 1, then bar 2. A pass recommends adoption; adopting it is the user's call and a new ADR (ADR 0068's Consequences).

### Reported, not gated
At both widths: seasons at the cap (median, cap-free runs); drawn stems ≥ 1.3 m per ha, their band frames and canopy share (the page draws from 1.3 m); the top species' share; the bank (live stems < 1.3 m) per frame, by species, and its lifetimes (age at death of stems that never reached 1.3 m, the median of run medians, by species); the phone width's counts; thrown canopy trees per run.

**Floor light** is reported as the median `groundLight` (metrics.csv: the mean Q/C of the ground cells under the tree's crown) of the bank's stems per frame. That is the light the bank stands in, not ground.csv's plot mean: `--light` writes every bud, too heavy for 200 runs. It is not comparable with the triad note's 3–13%.

### Regressions
`forestRegeneration` must not move (it is unchanged by the rule's build, and the probe changes no default). `phoneSeed3` moves only if an arm is adopted.

## Results (seeds 1–20, 3bfd8be)

**No arm passes.** The full output is [`code/2026-11-13-understorey-probe/output.txt`](code/2026-11-13-understorey-probe/output.txt) and the bars [`bars.json`](code/2026-11-13-understorey-probe/bars.json). 200 runs in 46.8 min on 12 simulators; the pilot (seeds 1–3, 8.3 min) ran clean and its runs are part of these.

### Adoption bars (160 cells, 60 frames)

| arm | 1. ≥ 7 cm in 200–400/ha | 2. ≥ 7 cm share ≥ 0.6 | 3. canopy trees/ha | 4. canopy deaths/run | 5. light-demander frames | gates |
|---|---|---|---|---|---|---|
| head | 19 (median 266/ha) | 21 (median 0.50) | 109 | 10.3 | 53 | pass |
| t10 | 11 ✗ (196/ha) | **38** ✓ (0.64) | 102 ✗ | 14.9 ✓ (1.44×) | 45 ✗ | ✗ (66: 17/20) |
| t15 | 10 ✗ (149/ha) | **39** ✓ (0.75) | 94 ✗ | 17.5 ✗ (1.70×) | 47 ✗ | pass (66: 18/20) |
| t25 | 10 ✗ (125/ha) | **45** ✓ (0.85) | 94 ✗ | 22.6 ✗ (2.19×) | 45 ✗ | ✗ (66: 16/20) |
| t15m3 | 11 ✗ (109/ha) | **44** ✓ (0.87) | 86 ✗ | 21.3 ✗ (2.07×) | 48 ✗ | ✗ (66: 17/20) |

Canopy deaths exclude thrown trees (3.4–4.2 a run in every arm, 3.75 at head). Every lone-tree hash equals head's and every checkpoint test passes in every arm; the gates that fail are gate 1 and 2 at 66 cells.

### Reported

| arm | drawn ≥ 1.3 m/ha (median), band frames, share | cap seasons (median; cap-free runs) | bank (median per frame) | bank lifetimes, hornbeam / beech (seasons) | top share |
|---|---|---|---|---|---|
| head | 1297, 13/60, 0.14 | 235; 0 | 68 (hornbeam 57, beech 20) | 15.8 / 14.0 | 0.78 |
| t10 | 664, 13/60, 0.27 | 228; 0 | 118 (hornbeam 82) | 10.0 / 11.5 | 0.71 |
| t15 | 531, 8/60, 0.23 | 221; 0 | 123 (hornbeam 90) | 10.0 / 10.5 | 0.82 |
| t25 | 281, 16/60, 0.39 | 210; 0 | 140 (hornbeam 112) | 10.0 / 12.8 | 0.80 |
| t15m3 | 196, 11/60, 0.59 | 210; 0 | 145 (hornbeam 112) | 5.0 / 7.0 | 0.70 |

- **The phone (66 cells):** the canopy share on ≥ 7 cm stems reaches 1.00 in every arm (54–57 of 60 frames at ≥ 0.6, head 41), but ≥ 7 cm stems fall from a median 114/ha to 38–57/ha. Gate 1 drops to 16–18 of 20: some phone runs lose every drawn stem for a season.
- **Floor light under the bank** (its stems' `groundLight`, not the plot mean): a median 0.02–0.03 of open sky in every arm, head included.

## Why none passes

**The phone first.** At 66 cells every arm leaves a median of 38 ≥ 7 cm stems/ha, one stem in the 0.0264 ha plot, from season 200 (head: 114/ha, three stems); three of four arms fail gate 1 (16–17 of 20 runs keep a drawn stem in every season after 50). The live site's narrow forest nearly empties. That alone blocks adoption, whatever the 160-cell bars say.

**Bar 1: by frame, head is not in the band either; it crosses it.** ≥ 7 cm stems/ha at 160 cells, runs under 200 / in 200–400 / over 400, of 20 (median):

| arm | season 100 | season 200 | season 300 |
|---|---|---|---|
| head | 7 / 13 / 0 (250) | 8 / 5 / 7 (313) | 5 / 1 / 14 (703) |
| t10 | 13 / 7 / 0 (188) | 11 / 2 / 7 (156) | 6 / 2 / 12 (531) |
| t15 | 16 / 4 / 0 (141) | 11 / 1 / 8 (141) | 9 / 5 / 6 (266) |
| t25 | 19 / 1 / 0 (109) | 13 / 5 / 2 (141) | 12 / 4 / 4 (141) |
| t15m3 | 18 / 2 / 0 (125) | 12 / 3 / 5 (109) | 10 / 6 / 4 (203) |

Head's ≥ 7 cm count climbs through the band and overshoots by season 300 (median 703/ha): the flood reaches 7 cm late. Every arm holds it under the band early and spreads it at 300; none concentrates it in the band.

**The sub-7 cm layer is killed before it is released; #138 is not what limits it.** [`cohort.ts`](code/2026-11-13-understorey-probe/cohort.ts) follows the drawn stems under 7 cm DBH at season 200 (160 cells, seeds 1–20) to season 300 ([output](code/2026-11-13-understorey-probe/cohort.txt)):

| arm | cohort at 200 (a run) | dead by 300 | survivors ≥ 7 cm at 300 | DBH gained by survivors (median) |
|---|---|---|---|---|
| head | 63.9 | 22% | 29% | 1.5 cm |
| t10 | 40.5 | 60% | 54% | 3.5 cm |
| t15 | 31.9 | 79% | 69% | 6.7 cm |
| t25 | 32.6 | 92% | 69% | 10.0 cm |
| t15m3 | 15.5 | 89% | 97% | 10.3 cm |

The survivors grow two to seven times faster than head's and cross 7 cm two to three times as often, so the saplings that stay do respond. Part of that is selection: the survivors are the stems whose tops were bright. What empties the band is death: 60–92% of the cohort dies within 100 seasons. That is the ramp acting as designed, with no release before it acts. #138's stalled saplings (P/M 4–5, ADR 0068) sit below 1.3 m and this cohort does not test them.

**Bar 3 and the canopy deaths.** Canopy trees/ha fall 7–21% and canopy deaths rise 1.4–2.2×. A canopy tree here is any drawn stem over half the top height, so overtopped subcanopy stems count as canopy, and some of these deaths may be the design acting on them. That their tops sit below θ_hi is an inference from ADR 0068's offline reading (canopy Q_top median 0.34), not measured here: metrics.csv does not carry Q_top. Light-demanders hold the canopy in fewer frames (45–48 against 53). Head's canopy count (109/ha) is not raised by any arm; whether crown width (#134) sets it is not tested here.

**The bank refills.** No arm leaves the cap (cap-free runs: 0 of 20 everywhere; median cap seasons 210–228 against 235). The places suppression frees go to hornbeam seedlings: the bank nearly doubles (68 to 118–145) while its lifetimes shorten. That is ADR 0068's Context (mortality cannot clear a cap fed by this seed supply) and #137's.

**What would change the outcome.** The ramp kills the subcanopy faster than gaps release it. A version worth probing would need either a release term (a stem not yet suppressed long enough to have had a gap), a lower ceiling at the phone width, or a seed supply that does not refill the cap (#137). Each is a design question for the user, not a re-tune. The rule stays built and off; a re-probe of its rates needs no code.
