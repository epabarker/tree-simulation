# The crown-extent runs re-read: the lone triad, the stand against Tallo, floor light (2026-11-13)

**Ticket:** [#131](https://github.com/epabarker/tree-simulation/issues/131), step 1 of [#129's sequence](https://github.com/epabarker/tree-simulation/issues/129#issuecomment-6852962561). **Exploratory: seeds 1–3, no new simulation.** It re-reads the [crown-extent probe's](2026-11-13-crown-extent-probe.md) runs (`runs/probe/129-<arm>-<species>/`). No core code, preset, species or golden changes. Branch `probe/131-triad-reread`, cut from `3d-port` 50a9db5.

**Question.** The user's decisions on #129 (2026-11-13) replaced the lone tree's single bar with three linked ratios, crown width at matched DBH, W/H and H/D. The lone tree becomes a guard, and the stand's crown at matched DBH against Tallo becomes the gate for the garden targets. What do the existing runs read on those measures, and how much floor light do the stands leave? This note fixes the bars that the girth probe ([#133](https://github.com/epabarker/tree-simulation/issues/133)) and the species round ([#134](https://github.com/epabarker/tree-simulation/issues/134)) will cite.

## Answer

- **Two measurement problems come first, because they change what the bars mean.**
  - **D is two different diameters.** The fit's `lone.slenderness` reads the core's `slenderness`, height over the root metamer's diameter (`cli/trials.ts`). Every matched-DBH anchor (Pretzsch, Tallo, Level 0) reads the trunk cylinder at 1.3 m of stem. In the garden's clean boles they agree (ratio 0.98–1.00). In the lone trees they differ by 0.5–1.9× from seed to seed (§1).
  - **A low fork can be thicker than its stem.** In lone beech seed 1 at season 60, the stem's base is 73 cm across. At a fork at about 1 m, the two children are 120 and 109 cm across on a parent of 85 cm. This is R3 as built, and as ADR 0011 decided: its moment is the vector sum of the load's first moment, so a balanced crown barely bends the stem below it, while each limb at the fork carries its own unbalanced moment and grows stress wood past its parent. Stress wood is local (ADR 0011 §3), so C6 passes only the pipe part down and the parent never catches up (§1).
- **The lone triad at HEAD.**
  - **Beech:** too stout (H/D 18–31 at season 100 against 48 ± 8), with W/H 1.43–1.49 at season 100, ADR 0041's accepted 1.50. At season 60 its W/H is 1.53–1.67, 2.6–2.8× `lone.spread`'s 0.6 ± 0.2.
  - **Hornbeam:** too stout (H/D 19–36 against 58 ± 10), with W/H 1.02–1.36.
  - **Read the beech crown on W/H at 1.50, and only the stem is wrong.** Read it on 0.6, and the crown is wrong too.
- **Under `H4k8` the hornbeam's triad is in band or at its edge** at seasons 60 and 100: H/D 43–69 (band 48–68), W/H 0.52–0.85, W ÷ Pretzsch 1.19–1.61.
- **The beech under `H4k8` is in band on W/H at 0.6** (0.58–0.78 at season 60), not at 1.50. Its H/D is above the band's 56 (59–61 at season 60, 45–75 at 100).
- **The reach yardstick `R16k8` is closest on W ÷ Pretzsch** (1.02–1.18 at season 100), with H/D and W/H at 60 at or inside their bands (§2).
- **The stand gate passes for hornbeam under `H4k8`:**
  - 3 of 4 canopy trees inside Tallo's q10–q90 at season 100, 4 of 4 at 200, 11 of 13 at 300. That confirms the Fable review's reading (13.1 m at 37 cm against Tallo's 7.8–15.3).
  - **It fails for every other species read:** beech 0 of 4 at 100, at 1.85× Tallo's median; oak 2.8×; maple 1.6×; birch 3.1×.
  - At HEAD the stand hornbeam at seasons 50–200 is beyond Tallo's support (DBH 48–86 cm; the curve stops at 39), so the gate cannot be read there at all.
- **Crown size as measured is an upper bound in the stand.**
  - The canopy trees' crowns, as discs of the mean tip radius, cover the plot 1.3–3.6× at HEAD and 1.7–3.1× under `H4k8`.
  - The robust crown (the 5–95% spread of the tips) is about half as wide. On it, beech under `H4k8` is 1.03× Tallo's median and hornbeam 0.68×.
  - The tip measure is close to Level 0's own (an upper bound on it, §3), so the gate keeps it. The robust crown is reported beside it.
- **Floor light is already in spec M6e's band:**
  - At HEAD the plot's mean ground light from season 50 is 3–13% of open sky (median 1.5–12%). Under `H4k8` it is 5–17%: higher in all 12 frames from season 100, by a median 1.8×.
  - So narrow crowns light the floor more, but not beyond the band. The understorey's flood (ADR 0065's cap) does not come from a bright floor, which supports [#132](https://github.com/epabarker/tree-simulation/issues/132)'s relative signal (§4).

## 1. The two diameters

`triad.py taper`: DBH at 1.3 m (dbh.py's trunk cylinder, following the child of larger subtree volume) over the root metamer's diameter (the core's `trunkRadius`).

| arm | species | lone, season 60 | lone, season 100 | garden canopy trees at 100: n, median (range) |
|---|---|---|---|---|
| base | beech | 1.09–1.50 | 0.97–1.70 | – |
| base | hornbeam | 0.79–1.29 | 0.77–1.31 | 7, 1.00 (0.97–1.07) |
| base | oak | 0.68–1.31 | 0.77–1.24 | 5, 0.99 (0.93–1.00) |
| base | birch | 0.81–1.27 | 0.87–1.21 | 8, 1.00 (1.00) |
| H4k8 | beech | 0.52–1.39 | 0.83–1.86 | 4, 0.96 (0.87–1.05) |
| H4k8 | hornbeam | 0.95–1.01 | 0.95–1.01 | 8, 0.98 (0.86–1.01) |
| S4 | beech | 0.45–0.60 | 0.55–0.66 | – |

- **Above 1:** the cylinder at 1.3 m is thicker than the base. The inverted fork does this: lone beech seed 1 at season 60 has its base metamer at radius 1.45 cells (0.36 m; stress wood 0.31 cells; stress 0.89 of σ_target). The metamer before the fork is at 1.70 cells, and its two children are at 2.39 and 2.18 cells, with stress wood 1.77 and 1.34. The children's Σr² is 3.6× the parent's.
- **Below 1:** the chain at 1.3 m is already one stem of a low fork, so DBH reads one stem, not the bole.
- **Either way, a lone tree's matched DBH is fragile** wherever it forks below about 1.5 m. The garden's trees are lifted clear of this by their bare boles.
- **Why the base is thin** (code, `r3.rs`): a metamer's moment is (S − W·base) × (−ŷ), with S the summed first moment of everything it carries. Load on opposite sides cancels, so a symmetric crown bends its stem little and the stem grows little stress wood.
- **Why the parent stays thinner than its children** (code, `c6.rs`; ADR 0011 §3): stress wood is local by design. C6 sums only the pipe radius r − stressWood, so a junction reinforced by its children's stress wood is not thickened by it.
- **Two cures, not one.** A load that does not cancel (a height-dependent wind load, [#133](https://github.com/epabarker/tree-simulation/issues/133)) would thicken the stem itself. Or stress wood could pass down the pipe, which would undo ADR 0011's choice (Minamino & Tateno 2014's Δ > 2 at heavy junctions). #133 tests the first; bar 10 below tells whether it is enough.

## 2. The lone triad

`triad.py lone`, seeds 1–3 (min–max).
- **W** = 2 × dbh.py's mean crown radius.
- **W/H** is 2 × dbh.py's mean crown radius over the height. The fit's `lone.spread` is a different measure: the larger of the core's full crown width and depth, over the height (`cli/trials.ts`). It reads 1–8% higher; both are in `out/lone.md`. HEAD's beech at season 100 is 1.43–1.49 on dbh.py's measure and 1.49–1.59 on the fit's.
- **H/D, base** is the fit's definition: the core's `slenderness`, which `lone.slenderness` is scored on.
- **H/D, 1.3 m** uses dbh.py's DBH, which the matched-DBH anchors use.
- **Targets:**
  - `lone.slenderness`: beech 48 ± 8 (measured, full weight); hornbeam 58 ± 10 (described, half weight).
  - `lone.spread` at season 60: beech 0.6 ± 0.2; hornbeam 0.7 ± 0.2.
  - ADR 0041's accepted lone beech W/H at season 100: 1.50.

| arm | species | anchor | season | H (m) | DBH (cm) | W (m) | W ÷ Pretzsch 95% | W/H | H/D, base | H/D, 1.3 m |
|---|---|---|---|---|---|---|---|---|---|---|
| base | beech | season 60 | 60 | 23.6–25.2 | 104–126 | 37.0–39.5 | 2.00–2.14 | 1.53–1.67 | 20–33 | 19–24 |
| base | beech | season 100 | 100 | 33.6–36.1 | 138–196 | 50.0–51.7 | 2.09–2.51 | 1.43–1.49 | 18–31 | 17–26 |
| base | beech | DBH 40 | 26–27 | 10.6–11.8 | 40 | 17.7–19.9 | 1.54–1.73 | 1.51–1.87 | 32–38 | 27–29 |
| base | hornbeam | season 60 | 60 | 27.2–29.3 | 76–108 | 29.8–37.1 | 1.65–1.73 | 1.02–1.36 | 21–36 | 25–38 |
| base | hornbeam | season 100 | 100 | 29.2–29.3 | 78–118 | 29.8–38.7 | 1.64–1.69 | 1.02–1.32 | 19–34 | 25–38 |
| base | hornbeam | DBH 40 | 25–28 | 14.0–21.2 | 40 | 19.9–21.5 | 1.57–1.70 | 0.99–1.42 | 43–51 | 35–53 |
| R16k8 | beech | season 60 | 60 | 24.5–24.8 | 37–46 | 14.7–15.3 | 1.20–1.39 | 0.59–0.62 | 63–83 | 54–67 |
| R16k8 | beech | season 100 | 100 | 35.9–39.3 | 56–65 | 15.9–16.5 | 1.11–1.18 | 0.41–0.46 | 51–62 | 58–66 |
| R16k8 | hornbeam | season 60 | 60 | 28.1–29.5 | 39–53 | 14.5–15.3 | 1.03–1.16 | 0.51–0.52 | 56–71 | 55–72 |
| R16k8 | hornbeam | season 100 | 100 | 29.4–29.5 | 43–54 | 14.5–15.2 | 1.02–1.11 | 0.49–0.52 | 55–68 | 54–69 |
| H40k2f | beech | season 100 | 100 | 32.6–34.6 | 112–156 | 38.2–45.7 | 2.05–2.09 | 1.10–1.39 | 21–30 | 21–31 |
| H40k2f | hornbeam | season 100 | 100 | 29.2–30.4 | 45–97 | 26.6–27.5 | 1.34–1.97 | 0.87–0.93 | 29–52 | 31–67 |
| H8k2f02 | beech | season 60 | 60 | 22.2–23.2 | 36–48 | 17.9–20.4 | 1.63–1.69 | 0.79–0.92 | 46–73 | 46–63 |
| H8k2f02 | beech | season 100 | 100 | 32.9–33.5 | 49–83 | 25.2–26.7 | 1.65–1.99 | 0.77–0.80 | 42–61 | 40–67 |
| H8k2f02 | hornbeam | season 60 | 60 | 29.2–29.5 | 33–55 | 18.9–22.6 | 1.45–1.87 | 0.64–0.76 | 48–79 | 54–89 |
| H8k2f02 | hornbeam | season 100 | 100 | 29.3–29.6 | 33–55 | 18.9–22.6 | 1.44–1.85 | 0.64–0.76 | 48–79 | 54–88 |
| H4k8 | beech | season 60 | 60 | 20.9–28.1 | 21–52 | 16.0–16.2 | 1.25–1.91 | 0.58–0.78 | 59–61 | 44–119 |
| H4k8 | beech | season 100 | 100 | 32.7–37.9 | 64–96 | 22.5–25.5 | 1.47–1.57 | 0.64–0.74 | 45–75 | 40–55 |
| H4k8 | beech | DBH 40 | 50–78 | 17.7–30.1 | 40 | 15.2–19.5 | 1.32–1.70 | 0.65–0.86 | 52–63 | 44–75 |
| H4k8 | hornbeam | season 60 | 60 | 24.5–29.1 | 40–54 | 15.0–20.8 | 1.19–1.61 | 0.52–0.85 | 54–69 | 54–72 |
| H4k8 | hornbeam | season 100 | 100 | 29.1–30.3 | 41–69 | 15.5–24.7 | 1.21–1.45 | 0.52–0.85 | 43–68 | 42–72 |
| H4k8 | hornbeam | DBH 40 | 49–56 | 23.8–28.9 | 40 | 14.9–20.0 | 1.18–1.58 | 0.52–0.84 | 59–69 | 59–72 |
| C6half | beech | season 100 | 100 | 33.7–35.8 | 139–202 | 49.8–53.5 | 2.05–2.41 | 1.39–1.59 | 20–25 | 17–26 |
| C6half | hornbeam | season 100 | 100 | 29.0–29.1 | 110–112 | 33.2–39.1 | 1.51–1.76 | 1.15–1.34 | 27–31 | 26 |
| H4k8C6half | beech | season 100 | 100 | 34.6–35.4 | 42–78 | 21.3–24.3 | 1.40–1.87 | 0.60–0.70 | 47–81 | 45–82 |
| H4k8C6half | hornbeam | season 100 | 100 | 28.9–29.0 | 39–52 | 17.3–21.2 | 1.30–1.50 | 0.60–0.73 | 54–74 | 55–73 |

The full table, every arm, the six exemplars, the DBH 25/50 anchors and the fit's `lone.spread` column, is committed as `code/2026-11-13-triad-reread/out/lone.md` (and remade by `triad.py lone <arms>`). Birch and holly are left out of the guard: under `H4k8` the lone birch is H/D 134–162 and the holly 111–151, and at HEAD the birch is 3.05–3.20× the edge.

- **W/D = (W/H) × (H/D).** The three ratios are linked, so any two fix the third. Pretzsch's edge pairs a 95% crown radius with a 5% height from different trees, which makes its W/D the strictest of the three. That is why the arms meet H/D and W/H and still miss W ÷ Pretzsch.
- **HEAD's beech fails on its stem, whichever W/H is read.** At ADR 0041's 1.50 its crown shape is right at season 100 (1.49–1.59 on the fit's measure, the one ADR 0041 read) and only its H/D (18–31) is out. At 0.6 ± 0.2 both are out. Which W/H governs is the user's (#134).
- **The young crown is the problem, as the crown-extent note found.** At DBH 40 (season 26–27), HEAD's beech is 11 m tall and 18–20 m across: W/H 1.5–1.9 at a quarter of its age.

## 3. The stand against Tallo

`triad.py stand base H4k8`: the canopy trees (drawn stems over half the top height) at 160 cells, seeds pooled.
- **Crown:** 2 × the mean tip radius over ±x and ±z, read from every metamer's tip (dbh.py's). Level 0's `cli/allometry.ts` reads the tips of live-bud metamers only, so dbh.py's is an upper bound on Level 0's, close to it because C5 sheds bare limbs. **Robust crown:** the mean of the 5–95% tip spreads in x and z.
- **Tallo:** the forest-grown CR–DBH quantiles in `analysis/fit/sources/tallo-level0-curves.csv`, read at each tree's DBH. Support (DBH, cm): beech 6–54, hornbeam 8–39, oak 11.5–75, maple 10–54, birch 10.5–52; no holly.
- **H/D:** the core's `slenderness`. `stand.slenderness`: beech 82 ± 12, hornbeam 86 ± 12.

| arm | species | season | n | DBH (cm) | H (m) | crown (m) | Tallo q50 (q10–q90) at the median DBH | inside q10–q90 | crown ÷ q50, median | robust (m) | robust ÷ q50 | H/D |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| base | hornbeam | 100 | 7 | 69 | 28.9 | 19.5 | beyond support | – | – | 12.7 | – | 42 |
| base | hornbeam | 300 | 21 | 32 | 14.3 | 7.7 | 9.7 (7.2–13.2) | 11 of 13 | 0.95 | 4.8 | 0.62 | 48 |
| base | beech | 300 | 5 | 42 | 28.2 | 14.4 | 9.0 (6.8–11.3) | 0 of 4 | 1.84 | 8.4 | 1.15 | 53 |
| base | oak | 100 | 5 | 35 | 24.6 | 9.6 | 6.9 (4.7–9.6) | 2 of 5 | 1.40 | 8.9 | 1.25 | 74 |
| base | birch | 100 | 8 | 24 | 26.4 | 11.4 | 5.0 (3.6–7.1) | 1 of 8 | 2.65 | 7.4 | 1.52 | 107 |
| H4k8 | hornbeam | 100 | 8 | 37 | 29.0 | 13.1 | 11.2 (7.8–15.3) | 3 of 4 | 1.29 | 6.7 | 0.68 | 73 |
| H4k8 | hornbeam | 200 | 7 | 37 | 29.0 | 13.2 | 11.0 (7.7–15.0) | 4 of 4 | 1.19 | 7.3 | 0.65 | 71 |
| H4k8 | hornbeam | 300 | 16 | 20 | 20.9 | 8.5 | 6.9 (5.2–9.5) | 11 of 13 | 1.26 | 5.0 | 0.68 | 91 |
| H4k8 | beech | 100 | 4 | 32 | 28.8 | 12.9 | 7.4 (5.4–9.5) | 0 of 4 | 1.85 | 7.2 | 1.03 | 77 |
| H4k8 | beech | 300 | 8 | 26 | 29.8 | 10.9 | 6.4 (4.5–8.4) | 1 of 7 | 1.56 | 6.7 | 1.03 | 88 |
| H4k8 | oak | 100 | 4 | 39 | 32.6 | 17.3 | 7.5 (5.3–10.3) | 0 of 4 | 2.84 | 9.4 | 1.56 | 78 |
| H4k8 | maple | 100 | 8 | 25 | 17.7 | 10.2 | 6.0 (4.2–7.6) | 0 of 7 | 1.62 | 6.5 | 1.09 | 81 |
| H4k8 | birch | 100 | 14 | 12 | 21.3 | 7.2 | 2.4 (1.5–4.3) | 0 of 10 | 3.07 | 3.8 | 1.61 | 173 |

"Inside" counts only the trees within Tallo's support; the rest are beyond it. The full table, with seasons 50–300, Hemery's mean and Pretzsch's edge, is `triad.py stand`.

- **Crown cover** (Σ π cr² of the canopy trees ÷ the 640 m² plot): 1.3–3.6 at HEAD and 1.7–3.1 under `H4k8`, per run and season from 100. Every drawn stem's cover is 1.6–5.3. As measured, the crowns interpenetrate two- to threefold. Some of that is real overlap in depth (the plot is periodic in x and z; crowns occupy a 3D slab). Most is the tip measure's reach: one long limb sets a direction's radius.
- **What the gate reads** (on the tip measure, as Level 0 fits):
  - The hornbeam meets Tallo under `H4k8` on the tip measure, and is narrow on the robust one (0.68× q50).
  - The beech is 1.5–1.9× Tallo on the tip measure and on it (1.03) on the robust one.
  - Oak and birch are wide on both.
  - The gate therefore depends on the crown measure as much as on the trees.
- **The stand H/D** under `H4k8` is in `stand.slenderness`'s band for beech (77–88 against 82 ± 12) and near it for hornbeam (73–91 against 86 ± 12). At HEAD the hornbeam is 42–48, a stem twice as thick for its height as the yield table's.

## 4. Floor light

`triad.py floor`: ground.csv's `q` (the ground's light as a fraction of open sky) over every (x, z) cell of the 160-cell plot. The plot is periodic in both directions, so there is no edge to exclude. Range over seeds 1–3, seasons 100–300.

| arm | mean | median | cells under 2% | cells under 10% |
|---|---|---|---|---|
| base | 0.029–0.119 | 0.015–0.109 | 0.11–0.58 | 0.46–0.94 |
| R16k8 | 0.040–0.127 | 0.022–0.117 | 0.08–0.48 | 0.41–0.89 |
| H8k2f02 | 0.055–0.119 | 0.039–0.092 | 0.12–0.31 | 0.54–0.81 |
| H4k8 | 0.049–0.170 | 0.032–0.158 | 0.05–0.36 | 0.28–0.83 |

- **The targets:** spec M6e wants ground light under a closed stand at 2–10% of open sky, and §10 a few %. Beech's target file holds out a floor of about 1.4%, from Hagemeier & Leuschner's LAI 8.4.
- **HEAD sits in the band**, darker than 2% in up to 58% of its cells. `H4k8`'s mean is higher in all 12 frames (seeds × seasons 100–300), by a median 1.8×; at season 100 it is 7.5–10% (HEAD 4–9%), at the band's top.
- **No cell anywhere reaches 50%:** the canopy has no real gaps. The per-season rows are `triad.py floor <arms>`.
- **This is not what floods the understorey.** The flood that reaches the cap in 184–252 of 300 seasons at HEAD happens under a floor at 3–12% of open sky, with the median cell under 5% in 10 of 12 frames. Suppression reads m_s·(1 − P/M)₊, and the understorey sits at P/M 2–15 ([the schedule note](2026-11-10-garden-schedule.md); hornbeam 6.8, beech 4.9, holly 15 at season 200), so it is not suppressed even in the shade a closed beech stand casts. A relative signal (#132) would need to read the canopy above a sapling, not its own budget.

## 5. Bars for #133 and #134

Fixed here, before either probe runs, and amended the same day by [ADR 0067](../decisions/0067-lone-triad-measures.md), when the user accepted the recommendations on this note's open points (still before either probe ran). Exploratory probes judge every seed of 1–3; adoption needs ≥ 20 seeds with stated pass rates (AGENTS.md).

**The lone guard (beech and hornbeam):**
1. **H/D with D at 1.3 m** (ADR 0067 decision 2), in `lone.slenderness`'s band at seasons 60 and 100: beech 40–56, hornbeam 48–68.
   - **The measure:** `cli/allometry.ts`'s trunk cylinder spanning 1.3 m; a codominant fork below it is pooled as √Σd² (Tallo's convention). The root metamer's H/D is reported beside it.
   - **Why it changed:** the fit's `lone.slenderness` scored the root metamer's diameter against Pretzsch's breast-height target, a defect in a scored trait. In lone trees the two differ by 0.5–1.9× (§1). Until the fit is changed (#134), probes compute the measure themselves.
2. **W/H at 60** on the fit's measure (`lone.spread`, the core's full extents) in its band: beech 0.4–0.8, hornbeam 0.5–0.9.
3. **W/H at 100** in a described, half-weight band of 0.6–1.2, for beech and hornbeam alike (ADR 0067 decision 1, following ADR 0028). ADR 0041's 1.50 is a panel check, not a target: at DBH 40, Pretzsch's edge with H/D 48 gives W/H 0.60.
4. **W ÷ Pretzsch's 95% edge at DBH 40,** reported at half weight (ADR 0028 §3), not a pass/fail. It is printed beside the taper ratio (§1), and not read where that ratio is outside 0.8–1.25 (a fork artefact; a window for the simulator, which models no butt swell).
5. **No species worse than HEAD on any of the three,** birch and holly included (the crown-extent note's second clause, kept).

**The stand gate (160 cells, canopy trees):**
6. **The crown at the tree's DBH on the tip measure**, as ADR 0050's ruling 2 decided for Level 0; the robust crown is reported beside it.
   - **The statistic:** Level 0's, per species, |median z| ≤ 1 at seasons 100 and 300, with z = (ln y − q50)/(q90 − q50) above Tallo's median (below it, with q10). "Half the trees inside q10–q90" is reported beside it.
   - **The floor:** read only on at least 8 trees inside Tallo's support, pooled over seeds and, where needed, over seasons.
   - **Why the tip measure:** Tallo's crown radii are field radii or crown projection areas (ADR 0051), which reach the drip line. dbh.py's tip measure reads every tip, Level 0's live-bud tips only, so dbh.py's is an upper bound wherever the runs carry no bud states.
7. **The stand H/D** in `stand.slenderness`'s band (beech 70–94, hornbeam 74–98) at seasons 100 and 300. This supersedes the generic 60–80 that #133's ticket first quoted (ADR 0028 §3).
8. **#129's target 1** (≥ 120 canopy trees/ha in every season from 100) and the crown cover reported beside the canopy count.

**For #133 only:**
9. **Throws ≤ HEAD's** (8 of 79 planted at 160 cells, seeds pooled).
10. **No inverted fork:** at every trunk fork below 1.3 m in the lone trees at 60 and 100, Σr_c² ≤ 1.3·r_p², in every seed. The taper ratio stays reported; it cannot tell butt taper from a fork. `c6.rs::junction_exponents`' count of junctions it skips on the bole is a cross-check.

## 6. Corrections and additions to the crown-extent note

- **H/D was never computed there.** The Fable review derived it from the note's tables, using DBH at 1.3 m (HEAD beech 17–26, hornbeam 25–38). This note's numbers agree on that definition. The fit reads the base diameter, which for lone trees gives other ranges (§2).
- **Matched DBH in the lone trees is fragile** (§1). The lone bar ("≤ 1.2× Pretzsch at DBH 40") was read on a diameter that can be a fork's limb.
- **"Narrow crowns light the floor"** (its §Answer) holds as a rise of a median 1.8×: at season 100, from 4–9% to 7.5–10% of open sky. That is within M6e's band, not a bright floor (§4).
- **Its canopy count under `H4k8`** counts crowns that, on the tip measure, cover the plot 1.7–3.1 times (§3).
- **The stand gate passes for the hornbeam only** (§3); the note quoted the hornbeam alone.

## Decided (ADR 0067, 2026-11-13)

The user accepted the recommendations on the five points this note left open:
1. **W/H at season 100:** ADR 0028's reading, 0.6–1.2 for beech and hornbeam; ADR 0041's 1.50 becomes a panel check (bar 3).
2. **Which D:** 1.3 m, codominant forks pooled; the fit changes in #134 (bar 1).
3. **The stand gate's crown measure:** the tip measure, under ADR 0050's ruling (bar 6).
4. **The thresholds:**
   - bar 4's taper window kept;
   - bar 10 a junction test;
   - bar 6 Level 0's |median z| on at least 8 trees.
5. **#133's wind load:** drag on leaf and stem area times a height profile, a moment that cannot cancel, in stress wood and the storm's check only. If bar 10 still fails under it, passing stress wood down the pipe (reopening ADR 0011) is the reserve.

## Limits

- Three seeds, and the counts of canopy trees per species are 3–21.
- The lone trees ran to season 100 only.
- Tallo's support stops at DBH 39 cm for hornbeam, so the hornbeam's gate can be read only on narrowed crowns.
- The robust crown is a 5–95% spread of metamer tips in x and z, a statistic of the crown's interior. The field's drip-line radius is closer to the tip measure (ADR 0067 decision 3).

## Reproduce

```
python3 docs/experiments/code/2026-11-13-triad-reread/triad.py lone base R16k8 H40k2f P60k2f H16k1f05 H16k2 H8k2f02 H4k8 C6half S4 H4k8C6half H4k8S4
python3 docs/experiments/code/2026-11-13-triad-reread/triad.py taper base H4k8 C6half S4
python3 docs/experiments/code/2026-11-13-triad-reread/triad.py stand base H4k8
python3 docs/experiments/code/2026-11-13-triad-reread/triad.py floor base H4k8 H8k2f02 R16k8
```

The runs are the crown-extent probe's (local, 39 GB, not committed). If they are gone, `docs/experiments/code/2026-11-13-crown-extent/run.sh base` and `run.sh H4k8` remake the two this note leans on. `allometry.csv` is dbh.py's, written by the crown-extent note's `table.py`.

## Files

- `code/2026-11-13-triad-reread/triad.py`: every table here. It reuses the path-length note's `anchors.py` and `matched.py`.
- `code/2026-11-13-triad-reread/out/`: its four outputs in full (`lone.md`, `taper.md`, `stand.md`, `floor.md`), so the tables outlive the uncommitted runs.
