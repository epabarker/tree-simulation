# Why the garden holds few canopy trees, and why hornbeam floods it (2026-11-11)

**Exploratory: seeds 1–3, widths 160 and 66.** This is the second round of the [suppression probe](2026-11-10-garden-suppression-probe.md) for [#121](https://github.com/epabarker/tree-simulation/issues/121), on the branch `probe/121-suppression`. Nothing is adopted. Every lever here is a probe patch, and none changes flora, presets, goldens or regressions.

**Question.** The first round left two limits:
- the stand holds about 80–110 canopy trees/ha;
- hornbeam's seed supply fills the cap.

What causes each (evidence first), and which existing levers move them, at what cost?

The suppression rule throughout is the dark-top signal A1 (`o4.suppressionSignal: "topLight"`, θ_q 0.3 unless stated), with D = 64.

**Answer.**
- **No condition meets the #121 criteria.** 11 conditions × 6 runs; one frame of all 198 meets band, canopy share and mix together.
- **The canopy count is set by crown size in a stand.** No existing mechanism narrows stand crowns, so a closed stand self-thins to a few very wide crowns.
- **Hornbeam floods the cap because of its reproductive sink.** Its fRep 0.8 was set as a height brake, not fitted to seed output. Raising hornbeam's seed cost brings its seeds per tree into line with the other species. With c_seed 300 alone (a2) the cap is never reached in 3 of 6 runs and for only 2–22 seasons in two more. Hornbeam still dominates, through shade establishment and survival.
- **Closest condition:** hornbeam c_seed 300 with θ_q 0.15 (d1). It has the most canopy (94/ha at 160, 76 at 66) and the lowest hornbeam share (median 0.60–0.63). The cap is never reached in 1 of 6 runs and for 26–60 seasons in three more; 160 seed 3 and 66 seed 2 sit at it for over 200. It still fails the band and canopy-share bars.
- **The 66-cell garden cannot meet the per-hectare bar with real-sized canopy crowns.** It needs its own bar (section 5).

## 1. Why so few canopy trees

### The planted trees' fate

`fate.py` on A1 θ 0.3, 160 cells:

| run | O4 draw (canopy / below) | R1 starved | R3 thrown | alive at 300 | median death season (O4) |
|---|---|---|---|---|---|
| seed 1 | 14 / 7 | 0 | 3 | 2 | 57 |
| seed 2 | 15 / 7 | 0 | 2 | 2 | 55 |
| seed 3 | 13 / 9 | 0 | 2 | 2 | 51.5 |
| r6 (carbon signal), seed 2 | 5 / 5 | 7 | 2 | 7 | 79.5 |

- **The canopy rate plays no part.** With m_c = 0 (c1) the fate is unchanged (seed 1: the same 14/7, 3 thrown, 2 alive), so these O4 deaths are the top-light signal.
- **Co-dominant planted trees die in the dense young stand.** Their tops are dark against θ_q.
- **Lowering θ_q to 0.15 spares about half of them**, but R1 starvation then takes the overtopped ones. Seed 2: 6 + 7 O4 deaths, 6 starved, 3 alive at 300.
- **The canopy thins from 22–23 trees at season 25 to 12–16 at 50 and 3–8 at 100 in every condition**, including m_c = 0, θ_q 0.15, crown shyness on, and 800 saplings/ha.

### Crown size over time

`fate.py`, A1 θ 0.3, 160 cells. Each cell gives canopy trees, median crownWidth in cells (1 cell = 0.25 m), and summed crown ellipse area over the plot's area:

| season | seed 1 | seed 2 | seed 3 |
|---|---|---|---|
| 25 | 22, 45, 3.45 | 23, 40, 3.37 | 22, 44, 3.66 |
| 50 | 12, 50, 2.58 | 13, 46, 2.77 | 13, 46, 2.96 |
| 100 | 5, 45, 1.88 | 3, 94, 1.81 | 7, 63, 2.94 |
| 150 | 3, 102, 1.82 | 3, 89, 1.83 | 7, 63, 3.00 |
| 300 | 2, 107, 1.74 | 3, 88, 1.56 | 8, 67, 2.75 |

- **Crowns are wide from the start.** At season 25, with 22 canopy trees on 0.064 ha (about 340/ha), the median crown is already 40–45 cells (10–11 m) wide. Summed crown area is 3.4–3.7× the plot, so the crowns interpenetrate heavily.
- **Crowns widen further after neighbours die**, to 90–110 cells (22–28 m) once 2–3 remain. They fill whatever space opens.
- **It is mostly one tree, not a few long limbs.** The robust width at season 300 (5–95% of the tree's metamer tips) is 0.55–0.70 of crownWidth:
  - planted canopy hornbeams: 115 → 75, 99 → 65, 113 → 74, 88 → 51 cells;
  - birch: 83 → 53.
  - So a canopy hornbeam's crown is 16–19 m across by the robust measure and 22–29 m tip to tip.
- **The open-grown hornbeam is wide too.** At season 100 the lone hornbeam is 117–153 cells (29–38 m) wide at 117 cells (29 m) tall, W/H 1.0–1.3. Its fit target is 0.7 ± 0.2 (`analysis/fit/targets/hornbeam.toml`, round 4).

### The real-forest target and its source

The repo has **no closed-stand crown-width-against-DBH anchor**:
- `docs/research/2026-11-03-reference-data-and-evaluation.md` names Tallo (Jucker et al. 2022) for crown radius against DBH, but it is not fitted.
- The nearest anchors are Pretzsch et al. 2015's envelopes in the fit targets. They are 95%-quantile crown radius and 5%-quantile height, mostly on forest plots, so an upper bound:
  - hornbeam W/H 0.53 and H/D 60 at d 40 cm: H ≈ 24 m, crown ≈ 12.7 m;
  - birch W/H 0.55 and H/D 38 at d 40 cm: H ≈ 15 m, crown ≈ 8.4 m.
- **The bar's own arithmetic:** 200–400 drawn stems/ha at ≥ 60% canopy needs ≥ 120 canopy trees/ha. That is ≤ 83 m² of crown each, about 10 m across with no overlap.
- **For stem counts:** the regeneration note's Uholka primeval beech forest has 435 trees/ha ≥ 6 cm DBH in three layers (`docs/research/2026-11-08-regeneration.md` §3).
- **Comparison:** simulated canopy crowns are about 10–11 m at season 25, when real crowns at that density would be far smaller, and 16–19 m robust (22–29 m tip to tip) at maturity. That is 1.3–2× the upper envelope across, or 2–4× the area. So self-thinning ends at about 30–100 canopy trees/ha instead of ≥ 120.

## 2. Why hornbeam floods the cap

`seeds.py`, r6, 160 cells, seeds 1–3 pooled. Units: maturity in cells, d in cells, seeds per seeding tree-season.

| species | fRep | maturity | c_seed | d | Q_est | p_est | seeding tree-seasons | seeds | seeds per seeding tree-season | recruits |
|---|---|---|---|---|---|---|---|---|---|---|
| hornbeam | 0.8 | 115 | 5 | 20 | 0.04 | 0.3 | 456 | 1,237,899 | 2,715 | 2,027 |
| birch | 0.1 | 40 | 2 | 40 | 0.25 | 0.3 | 793 | 31,797 | 40 | 34 |
| maple | 0.1 | 30 | 5 | 25 | 0.05 | 0.3 | 253 | 10,784 | 43 | 615 |
| beech | 0.1 | 40 | 10 | 12 | 0.03 | 0.3 | 266 | 5,929 | 22 | 271 |
| holly | 0.8 | 60 | 8 | 40 | 0.01 | 0.3 | 67 | 658 | 10 | 91 |

- **Hornbeam makes 60–120× the seeds per seeding tree-season of beech, birch or maple.**
  - Its fRep is 8× theirs.
  - Its crowns are the largest, so its surplus is the largest.
  - Its c_seed (5) is half beech's.
- **fRep 0.8 was not fitted to seed output.** It is a hand override, "natural mature heights" (overnight 2026-11-06, agent Y2; `analysis/fit/hand-overrides.toml`): a reproductive sink so that height levels off instead of climbing past the species' height band. The garden's own maturity of 115 cells is a value from that same override.
- **The regeneration note has no per-tree seed output** for any species, so no seed count is "out of line with the note" directly. What the note gives:
  - hornbeam first seeds at 10–30 years, with large crops every 1–2 years: a frequent seeder, not a masting one (§2);
  - closed-canopy banks are about 10⁴ stems/ha (Uholka 34,642/ha, 69% under 40 cm, §3).
- **Out of line is hornbeam against the other species.** A hornbeam nutlet is lighter than a beechnut, but not 100× lighter.
- **The cap bar is out of line with the note's bank.** A realistic bank of 10⁴/ha cannot be simulated as individual trees under a 2,500/ha cap. "The cap never reached" and "a real seedling bank" contradict each other at this cap. With hornbeam brought into line (c_seed 300, below), the cap is still reached in some runs.
- **Hornbeam also dominates through establishment and tolerance.** It establishes at a ground light of 0.04 (only beech 0.03 and holly 0.01 go lower) and has shade tolerance 3.97. Even with its seed count cut to 26 per seeding tree-season (c_seed 300, matching birch's 32 and maple's 28), it recruits 2,773 trees over the three desktop seeds and stays the top species: median share 0.84 (a2), 0.63 (d1).

## 3. Levers

Each lever is a probe patch on top of A1 θ_q 0.3, unless stated otherwise.

| condition | patch | kind |
|---|---|---|
| A1 θ 0.3 (base) | `o4.suppressionSignal topLight, topLightThreshold 0.3` | rule (probe) |
| a1 | hornbeam `o4.cSeed` 40 | species (seed count only) |
| a2 | hornbeam `o4.cSeed` 300 | species (seed count only) |
| a3 | hornbeam `r1.fRep` 0.1 | species (carbon split; touches form) |
| b1 | `o2.enabled` true (crown shyness by abrasion; off in the garden) | world |
| b2 | `r5.dLambda` 0.02 → 0.1 (stronger neighbour shade avoidance) | world (all species) |
| c1 | `o4.mCanopy` 0 | world |
| c2 | planting 800/ha, spacing 8 | world |
| c3 | θ_q 0.15 | rule knob |
| d1 | a2 + c3 | species + rule knob |
| d2 | a2 + c3 + b1 + c2 | all |

Results. Counts are frames out of 9 per width, or runs out of 3. "Canopy/ha" is the median over seasons 100–300. "Hornbeam" is the median share over the judged frames. Seasons at cap are per seed, 1/2/3.

| condition | 160 band | 160 canopy ≥ 0.6 | 160 all three | 66 band | 66 canopy ≥ 0.6 | 66 all three | canopy/ha 160 / 66 | seasons at cap 160 | seasons at cap 66 | hornbeam 160 / 66 | canopy after 50 160 / 66 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 θ 0.3 | 1 | 4 | 0 | 1 | 6 | 0 | 47 / 38 | 171/214/188 | 167/215/128 | 0.89 / 1.00 | 3/3 / 3/3 |
| a1 c_seed 40 | 1 | 4 | 0 | 0 | 5 | 0 | 47 / 38 | 137/200/162 | 149/204/117 | 0.84 / 1.00 | 3/3 / 3/3 |
| a2 c_seed 300 | 0 | 5 | 0 | 2 | 7 | 0 | 47 / 38 | **0**/22/153 | 2/**0**/**0** | 0.84 / 1.00 | 3/3 / 3/3 |
| a3 fRep 0.1 | 1 | 3 | 0 | 1 | 7 | 0 | 31 / 38 | 191/215/172 | 157/107/108 | 0.93 / 1.00 | 3/3 / 2/3 |
| b1 O2 on | 2 | 2 | 0 | 1 | 6 | 0 | 62 / 38 | 193/218/180 | 180/208/183 | 0.89 / 1.00 | 3/3 / 3/3 |
| b2 R5 δλ 0.1 | 1 | 2 | 0 | 0 | 8 | 0 | 47 / 38 | 223/239/253 | 139/194/164 | 0.37 / 1.00 | 3/3 / 3/3 |
| c1 m_c 0 | 3 | 4 | 0 | 0 | 5 | 0 | 47 / 38 | 169/227/232 | 167/215/187 | 0.82 / 1.00 | 3/3 / 3/3 |
| c2 800/ha | 0 | 2 | 0 | 1 | 9 | 0 | 62 / 76 | 182/244/218 | 149/213/135 | 0.88 / 1.00 | 3/3 / 3/3 |
| c3 θ 0.15 | 3 | 2 | 0 | 1 | 3 | **1** | 78 / 76 | 180/218/228 | 181/250/181 | 0.83 / 0.67 | 3/3 / 3/3 |
| **d1** a2 + c3 | 0 | 3 | 0 | 2 | 2 | 0 | **94 / 76** | **0**/36/233 | 26/220/60 | **0.63 / 0.60** | 3/3 / 3/3 |
| d2 a2 + c3 + b1 + c2 | 2 | 1 | 0 | 1 | 8 | 0 | 94 / 38 | 67/208/125 | **0**/22/101 | 0.87 / 0.86 | 3/3 / 3/3 |

- **(a) Hornbeam's seed cost works on the cap.** c_seed 300 cuts hornbeam's seeds per seeding tree-season from 2,715 to 26 and leaves the cap unreached in 3 of 6 runs (2 and 22 seasons at it in two more; 153 at 160 seed 3).
  - c_seed 40 is too little.
  - fRep 0.1 does not help: the cap is still reached in 6 of 6 runs.
- **(b) No existing mechanism narrows stand crowns.**
  - O2 crown shyness on (b1): summed crown area at season 25 is 3.59× the plot (against 3.45), and the canopy still falls to 6 at season 100 (seed 1).
  - Stronger neighbour shade avoidance (b2) changes hornbeam's share at 160 (0.37) but not the canopy count.
  - C5's shedding works on shaded limbs inside the crown, not on the crown's spread into a neighbour; R3 sag and breakage act on load. None stops a shoot growing into another tree's crown.
- **(c) Survival levers move the canopy count only a little.**
  - m_c = 0 changes nothing.
  - 800 saplings/ha give a denser start (29–36 canopy trees at season 25), but it thins to 3–9 by season 100.
  - θ_q 0.15 keeps more co-dominants (canopy 78/ha at 160).
- **(d) The combinations reach 94 canopy/ha at 160**, about r6's level, still short of ≥ 120. They put no frame in band with ≥ 60% canopy.

**A new rule.** Only a new rule could narrow crowns in a stand. I describe it here and did not build it:
- **Occupancy-gated growth**, Palubicki et al. 2009's own space competition (their marker-based space colonisation): a shoot may not extend into a cell that already holds another tree's foliage, or does so only with a probability that falls with that tree's foliage density there.
- It reads the owner grid that O2 and R5 already build each season.
- Crowns would then abut instead of interpenetrating. The stand would hold more, narrower crowns.
- It is a C1/C3 rule change, so it needs an ADR and a spec section, outside #121's scope.

## 4. Guard: the lone open-grown hornbeam

`guard.py`. The lone stage at season 100, seeds 1–3, HEAD against patch:

| patch | height (cells) | crownWidth | liveCrownBase | w90 | hash |
|---|---|---|---|---|---|
| HEAD | 117.4 / 116.7 / 116.7 | 153 / 138 / 117 | 0.009 | 0.50 / 0.40 / 0.28 | |
| hornbeam fRep 0.1 (a3) | 142.4 / 151.6 / 165.8 | 179 / 167 / 182 | 0.006–0.007 | 0.58 / 0.56 / 0.43 | changed |
| world levers b1 + b2, c_seed 300, θ_q 0.15 | identical | identical | identical | identical | **bit-identical** (859812b6, 66b88c89, f4a96f3e) |

- **fRep 0.1 removes the height brake** the hand override was added for: the lone hornbeam reaches 36–41 m instead of 29 m. It fails the guard.
- **The world levers and c_seed do not touch the lone tree:**
  - abrasion and R5's neighbour signal need another tree;
  - c_seed only counts seeds, and the lone stage does not recruit.

## 5. The 66-cell garden

- The phone garden is 66 × 64 cells, 16.5 × 16 m = 264 m² (0.0264 ha).
- With a real canopy crown of about 10 m (40 cells, 79 m²), at most 3 crowns fit without overlap.
- The bar needs at least 200/ha, which is 6 drawn stems (5 would be 189/ha). At ≥ 60% canopy, 4 of those 6 must be canopy trees: about 316 m² of crown, more than the plot.
- **So the 66-cell garden cannot meet the per-hectare bar with real-sized crowns, whatever the rules.** It holds 2–3 canopy trees at best. In every simulated condition it holds one wide crown (83–98 cells) for most of the run.
- **A sensible phone bar:** at least 2 canopy trees and 4–8 drawn stems (150–300/ha) from season 100, no gap phase and the cap never reached. Or judge the per-hectare bars on the desktop width and require of the phone only no gap phase, no cap and no species over 70%. Choosing one is the user's call.

## 6. What the closest condition would need

**d1 = hornbeam c_seed 300 + A1 θ_q 0.15:**
- **Hornbeam `o4.cSeed` 5 → 300** is a species expression: it changes a fitted flora value (`flora-fitted.ts` is generated from the fit plus `hand-overrides.toml`). It needs the ≥ 20-seed adoption rule and a recorded reason. It does not change the lone tree (bit-identical above).
- **Alternatively, hornbeam's fRep could be fitted to a seed-output anchor**, if one is found. The research has none per tree, and fRep 0.1 fails the lone guard.
- **The A1 dark-top suppression signal with θ_q 0.15** is a rule change: ADR 0063 decision 3 and spec §O4 amended. There is no checkpoint change (see the first round's note).
- **D 64** is unchanged.

**What d1 still fails:**
- the canopy count (94/ha at 160, 76/ha at 66, against ≥ 120);
- hence the canopy share and band bars;
- the cap at 160 seed 3 (233 seasons, mostly hornbeam and the bank);
- hornbeam's share (0.6).

Moving the canopy count needs occupancy-gated growth (a rule) or a lower bar (a decision). Neither is a rate.

## Files

- Code: `code/2026-11-10-garden-schedule/`
  - `fate.py`, `seeds.py`: the diagnosis (sections 1–2);
  - `guard.py`: the lone-tree guard (section 4);
  - `sweep.ts`, `bars.py`, `canopy.py`, `table.py`: the runs and their tables.
- Runs (not committed):
  - lever conditions: `runs/garden-schedule/L-*/`;
  - the lone-tree guards: `runs/probe/guard-hornbeam-frep/`, `runs/probe/guard-hornbeam-world/`.

## Per-condition tables

Each cell gives drawn stems (per ha), canopy share and top species. The base A1 θ 0.3 table is in [the first round's note](2026-11-10-garden-suppression-probe.md).

**L-a1-hbcSeed40** `{"params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.3}}, "species": {"hornbeam": {"o4": {"cSeed": 40}}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 6 (94), 0.83, hornbeam 50% | 3 (47), 1.00, hornbeam 67% | 4 (63), 0.75, hornbeam 75% | 137 | yes | 0.50/0.67/0.75 |
| 160 | 2 | 4 (63), 0.75, hornbeam 75% | 148 (2313), 0.01, hornbeam 100% | 51 (797), 0.04, hornbeam 100% | 200 | yes | 0.75/1.00/1.00 |
| 160 | 3 | 113 (1766), 0.06, hornbeam 88% | 52 (813), 0.10, hornbeam 92% | 19 (297), 0.47, hornbeam 84% | 162 | yes | 0.88/0.92/0.84 |
| 66 | 1 | 1 (38), 1.00, hornbeam 100% | 2 (76), 0.50, hornbeam 100% | 5 (189), 0.20, hornbeam 100% | 149 | yes | 1.00/1.00/1.00 |
| 66 | 2 | 1 (38), 1.00, hornbeam 100% | 2 (76), 0.50, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 204 | yes | 1.00/1.00/1.00 |
| 66 | 3 | 2 (76), 1.00, hornbeam 50% | 5 (189), 0.20, hornbeam 100% | 5 (189), 0.60, hornbeam 100% | 117 | yes | 0.50/1.00/1.00 |

**L-a2-hbcSeed300** `{"params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.3}}, "species": {"hornbeam": {"o4": {"cSeed": 300}}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 6 (94), 0.83, hornbeam 50% | 2 (31), 1.00, hornbeam 100% | 3 (47), 0.67, hornbeam 100% | 0 | yes | 0.50/1.00/1.00 |
| 160 | 2 | 4 (63), 0.75, hornbeam 75% | 104 (1625), 0.02, hornbeam 98% | 42 (656), 0.07, hornbeam 100% | 22 | yes | 0.75/0.98/1.00 |
| 160 | 3 | 74 (1156), 0.09, hornbeam 62% | 37 (578), 0.14, hornbeam 84% | 9 (141), 0.67, hornbeam 78% | 153 | yes | 0.62/0.84/0.78 |
| 66 | 1 | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 8 (303), 0.13, hornbeam 100% | 2 | yes | 1.00/1.00/1.00 |
| 66 | 2 | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 4 (152), 0.25, hornbeam 100% | 0 | yes | 1.00/1.00/1.00 |
| 66 | 3 | 2 (76), 1.00, hornbeam 50% | 1 (38), 1.00, hornbeam 100% | 7 (265), 1.00, hornbeam 100% | 0 | yes | 0.50/1.00/1.00 |

**L-a3-hbfRep01** `{"params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.3}}, "species": {"hornbeam": {"r1": {"fRep": 0.1}}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 6 (94), 0.83, hornbeam 50% | 6 (94), 0.33, hornbeam 100% | 149 (2328), 0.01, hornbeam 100% | 191 | yes | 0.50/1.00/1.00 |
| 160 | 2 | 4 (63), 0.75, hornbeam 75% | 152 (2375), 0.01, hornbeam 100% | 59 (922), 0.03, hornbeam 100% | 215 | yes | 0.75/1.00/1.00 |
| 160 | 3 | 111 (1734), 0.06, hornbeam 90% | 42 (656), 0.10, hornbeam 93% | 16 (250), 0.75, hornbeam 88% | 172 | yes | 0.90/0.93/0.88 |
| 66 | 1 | 1 (38), 1.00, hornbeam 100% | 5 (189), 0.20, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 157 | yes | 1.00/1.00/1.00 |
| 66 | 2 | 1 (38), 1.00, hornbeam 100% | 16 (606), 0.25, hornbeam 100% | 32 (1212), 0.69, hornbeam 100% | 107 | no | 1.00/1.00/1.00 |
| 66 | 3 | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 10 (379), 0.70, hornbeam 100% | 108 | yes | 1.00/1.00/1.00 |

**L-b1-o2** `{"params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.3}, "o2": {"enabled": true}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 6 (94), 1.00, hornbeam 50% | 20 (313), 0.10, hornbeam 100% | 9 (141), 0.22, hornbeam 100% | 193 | yes | 0.50/1.00/1.00 |
| 160 | 2 | 7 (109), 0.86, hornbeam 43% | 82 (1281), 0.04, hornbeam 99% | 53 (828), 0.06, hornbeam 98% | 218 | yes | 0.43/0.99/0.98 |
| 160 | 3 | 75 (1172), 0.12, hornbeam 87% | 56 (875), 0.11, hornbeam 89% | 14 (219), 0.57, hornbeam 71% | 180 | yes | 0.87/0.89/0.71 |
| 66 | 1 | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 3 (114), 0.33, hornbeam 100% | 180 | yes | 1.00/1.00/1.00 |
| 66 | 2 | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 7 (265), 0.14, hornbeam 100% | 208 | yes | 1.00/1.00/1.00 |
| 66 | 3 | 3 (114), 0.67, hornbeam 67% | 2 (76), 1.00, hornbeam 50% | 13 (492), 0.54, hornbeam 92% | 183 | yes | 0.67/0.50/0.92 |

**L-b2-r5dl10** `{"params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.3}, "r5": {"dLambda": 0.1}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 3 (47), 1.00, hornbeam 67% | 155 (2422), 0.01, beech 89% | 19 (297), 0.32, beech 74% | 223 | yes | 0.67/0.10/0.26 |
| 160 | 2 | 3 (47), 1.00, hornbeam 67% | 89 (1391), 0.03, hornbeam 100% | 51 (797), 0.06, hornbeam 100% | 239 | yes | 0.67/1.00/1.00 |
| 160 | 3 | 54 (844), 0.15, beech 52% | 59 (922), 0.07, beech 92% | 33 (516), 0.03, beech 97% | 253 | yes | 0.37/0.05/0.03 |
| 66 | 1 | 2 (76), 1.00, hornbeam 50% | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 139 | yes | 0.50/1.00/1.00 |
| 66 | 2 | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 24 (909), 0.04, hornbeam 100% | 194 | yes | 1.00/1.00/1.00 |
| 66 | 3 | 2 (76), 1.00, hornbeam 50% | 2 (76), 1.00, hornbeam 50% | 17 (644), 0.76, hornbeam 88% | 164 | yes | 0.50/0.50/0.88 |

**L-c1-mc0** `{"params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.3, "mCanopy": 0}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 6 (94), 0.83, hornbeam 50% | 3 (47), 1.00, hornbeam 67% | 4 (63), 0.50, hornbeam 100% | 169 | yes | 0.50/0.67/1.00 |
| 160 | 2 | 6 (94), 0.67, hornbeam 67% | 3 (47), 1.00, hornbeam 100% | 12 (188), 0.25, hornbeam 100% | 227 | yes | 0.67/1.00/1.00 |
| 160 | 3 | 17 (266), 0.47, hornbeam 59% | 22 (344), 0.27, hornbeam 82% | 22 (344), 0.14, hornbeam 95% | 232 | yes | 0.59/0.82/0.95 |
| 66 | 1 | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 2 (76), 0.50, hornbeam 100% | 167 | yes | 1.00/1.00/1.00 |
| 66 | 2 | 2 (76), 0.50, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 5 (189), 0.20, hornbeam 100% | 215 | yes | 1.00/1.00/1.00 |
| 66 | 3 | 4 (152), 1.00, birch 25% | 1 (38), 1.00, hornbeam 100% | 5 (189), 0.20, hornbeam 100% | 187 | yes | 0.25/1.00/1.00 |

**L-c2-plant800** `{"params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.3, "planting": {"density": 800, "spacing": 8, "species": ["birch", "oak", "willow", "beech", "birch", "hornbeam", "rowan", "birch", "holly", "maple"]}}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 6 (94), 0.50, hornbeam 67% | 50 (781), 0.06, hornbeam 100% | 42 (656), 0.07, hornbeam 100% | 182 | yes | 0.67/1.00/1.00 |
| 160 | 2 | 11 (172), 0.82, hornbeam 45% | 155 (2422), 0.03, hornbeam 99% | 31 (484), 0.26, hornbeam 94% | 244 | yes | 0.45/0.99/0.94 |
| 160 | 3 | 9 (141), 0.56, hornbeam 67% | 26 (406), 0.38, hornbeam 88% | 6 (94), 1.00, hornbeam 67% | 218 | yes | 0.67/0.88/0.67 |
| 66 | 1 | 2 (76), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 149 | yes | 1.00/1.00/1.00 |
| 66 | 2 | 2 (76), 1.00, hornbeam 100% | 2 (76), 1.00, hornbeam 100% | 3 (114), 0.67, hornbeam 100% | 213 | yes | 1.00/1.00/1.00 |
| 66 | 3 | 4 (152), 1.00, hornbeam 50% | 2 (76), 1.00, hornbeam 50% | 8 (303), 0.88, hornbeam 100% | 135 | yes | 0.50/0.50/1.00 |

**L-c3-q15** `{"params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.15}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 8 (125), 0.75, hornbeam 38% | 18 (281), 0.11, hornbeam 100% | 18 (281), 0.11, hornbeam 100% | 180 | yes | 0.38/1.00/1.00 |
| 160 | 2 | 10 (156), 0.80, hornbeam 30% | 154 (2406), 0.02, hornbeam 98% | 63 (984), 0.10, hornbeam 95% | 218 | yes | 0.30/0.98/0.95 |
| 160 | 3 | 95 (1484), 0.11, hornbeam 79% | 82 (1281), 0.10, hornbeam 83% | 24 (375), 0.33, hornbeam 71% | 228 | yes | 0.79/0.83/0.71 |
| 66 | 1 | 2 (76), 0.50, beech 50% | 15 (568), 0.07, hornbeam 100% | 17 (644), 0.06, hornbeam 100% | 181 | yes | 0.50/1.00/1.00 |
| 66 | 2 | 5 (189), 0.80, beech 20% | 14 (530), 0.21, hornbeam 79% | 12 (455), 0.25, hornbeam 83% | 250 | yes | 0.20/0.79/0.83 |
| 66 | 3 | 5 (189), 0.40, beech 40% | 3 (114), 0.67, beech 33% | 9 (341), 0.78, hornbeam 67% | 181 | yes | 0.20/0.33/0.67 |

**L-d1-cSeed300-q15** `{"params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.15}}, "species": {"hornbeam": {"o4": {"cSeed": 300}}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 8 (125), 0.75, hornbeam 38% | 12 (188), 0.25, hornbeam 100% | 3 (47), 0.67, hornbeam 100% | 0 | yes | 0.38/1.00/1.00 |
| 160 | 2 | 10 (156), 0.80, hornbeam 30% | 138 (2156), 0.02, hornbeam 96% | 46 (719), 0.17, hornbeam 89% | 36 | yes | 0.30/0.96/0.89 |
| 160 | 3 | 81 (1266), 0.12, hornbeam 56% | 67 (1047), 0.12, hornbeam 63% | 38 (594), 0.24, hornbeam 53% | 233 | yes | 0.56/0.63/0.53 |
| 66 | 1 | 2 (76), 0.50, beech 50% | 11 (417), 0.09, hornbeam 100% | 19 (720), 0.05, hornbeam 100% | 26 | yes | 0.50/1.00/1.00 |
| 66 | 2 | 7 (265), 0.57, holly 29% | 10 (379), 0.30, hornbeam 70% | 11 (417), 0.27, hornbeam 82% | 220 | yes | 0.29/0.70/0.82 |
| 66 | 3 | 5 (189), 0.40, beech 40% | 3 (114), 0.67, beech 33% | 5 (189), 1.00, hornbeam 60% | 60 | yes | 0.20/0.33/0.60 |

**L-d2-cSeed300-q15-o2-plant800** `{"params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.15, "planting": {"density": 800, "spacing": 8, "species": ["birch", "oak", "willow", "beech", "birch", "hornbeam", "rowan", "birch", "holly", "maple"]}}, "o2": {"enabled": true}}, "species": {"hornbeam": {"o4": {"cSeed": 300}}}}`

| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |
|---|---|---|---|---|---|---|---|
| 160 | 1 | 5 (78), 0.80, hornbeam 80% | 72 (1125), 0.03, hornbeam 100% | 40 (625), 0.08, hornbeam 100% | 67 | yes | 0.80/1.00/1.00 |
| 160 | 2 | 21 (328), 0.52, hornbeam 24% | 122 (1906), 0.05, hornbeam 87% | 27 (422), 0.33, hornbeam 59% | 208 | yes | 0.24/0.87/0.59 |
| 160 | 3 | 77 (1203), 0.09, hornbeam 91% | 58 (906), 0.21, hornbeam 90% | 16 (250), 0.38, beech 50% | 125 | yes | 0.91/0.90/0.44 |
| 66 | 1 | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 1 (38), 1.00, hornbeam 100% | 0 | yes | 1.00/1.00/1.00 |
| 66 | 2 | 4 (152), 0.75, hornbeam 50% | 3 (114), 1.00, hornbeam 67% | 3 (114), 0.33, hornbeam 100% | 22 | yes | 0.50/0.67/1.00 |
| 66 | 3 | 5 (189), 0.80, hornbeam 40% | 4 (152), 0.75, hornbeam 75% | 7 (265), 0.71, hornbeam 86% | 101 | yes | 0.40/0.75/0.86 |

