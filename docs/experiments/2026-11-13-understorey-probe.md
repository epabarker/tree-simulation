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

## Results

_Not yet run._
