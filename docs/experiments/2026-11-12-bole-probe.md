# Does a re-anchored, accumulating T_rel clear beech and hornbeam in the 0062/0063 garden? (the bare-bole probe)

_2026-11-12. Ticket [#126](https://github.com/epabarker/tree-simulation/issues/126) of spec [#111](https://github.com/epabarker/tree-simulation/issues/111), testing the [bare-bole page](../features/bare-bole.md)'s proposal with #125's `c5.kRel`. Code at `ticket/126` (base `spec/111-feature-playbook` dc4f944, the accepted 0062/0063 garden of #121). **Exploratory: the garden and every patched run rest on seeds 1–3.** HEAD's lone trees run seeds 1–20 for the guard's noise floor. No rounded-crown patch; no shipped params change._

## Method
- **Worlds.** The 0062/0063 garden: `forestParams(160, seed)`, 40 × 16 m, periodic in x and z, 400 saplings/ha, `twoPart` mortality, the cap at 160 live trees. Run 150 seasons. The lone open-grown stage: `loneTreeParams(species, seed)`, the 60 m box (ADR 0062), 100 seasons.
- **Numbers.** `rust/core/examples/bole_limbs.rs` runs each params file as the headless runner does (`World::step`, no events). After every season it writes, per live tree ≥ 1.3 m, the core's measures (`liveCrownBase`, `crownLength`, `topFifthLeaf`, `leafBelowSixth`, the shed causes `shedRelative`/`shedCarbon`/`shedBoth`, `boleSprouts`) and each living first-order limb's light read as C5 reads it: Q_b/n_b over the crown's Q_top. `lowRatio` is the lowest living limb's, the one that sets the live crown base; `medRatio` and `minRatio` are over all living limbs. The ratio is read after the shed phase, so it is the light of the limbs that survived it. Params: `code/2026-11-12-bole-probe/params.ts`; runs: `run.sh` (at most 4 at once); tables: `summary.py`.
- **Stand trees** are stems ≥ 10 m. **Gap trees** stand in for the page's edge trees, because the periodic garden has no edges: a stem with no other stem ≥ 0.8 of its height within 5 m, wrapped on both axes. It is a proxy.

## Step 1: the lowest limbs' light at HEAD of the new garden (before any sweep)

Stems ≥ 10 m, seasons 50–150, seeds 1–3; ratios as tree-season quantiles (q10 / median / q90).

| species | trees | tree-seasons | lowest limb ÷ Q_top | all limbs' median | lowest is the darkest limb | live crown base (median) | T_rel |
|---|---|---|---|---|---|---|---|
| beech | 2 | 130 | 0.46 / 0.76 / 1.12 | 1.06 | 9% | 0.023 | 0.008 |
| hornbeam | 11 | 832 | 0.06 / **0.17** / 0.85 | 0.33 | 17% | 0.021 | 0.025 |
| holly | 2 | 202 | 0.33 / 0.75 / 1.32 | 1.10 | 37% | 0.058 | 0.021 |

- **The new stand darkens hornbeam's lowest limbs, not beech's.** Hornbeam's median lowest limb sits at 0.17 of Q_top, below the swept 0.25 and 0.4 and above 0.1 (the old garden's early look: 0.22 at HEAD). Its median limb sits at 0.33, so the lowest limb is darker than most of its crown, though the darkest limb in only 17% of tree-seasons. A T_rel sweep can act on hornbeam.
- **Beech's lowest limbs are lit at 0.46–1.1 of Q_top** (median 0.76), brighter than in the old garden (0.26). Its median limb is at 1.06. Only two beech reach 10 m in three seeds (seed 2 from season ≈ 50, seed 3 near 150). A T_rel below ≈ 0.45 cannot reach them; one above it would cut the crown's median limbs first.
- **The stand is open, not closed.** Seeds 1 and 2 hold 10–16 drawn stems at seasons 100–150 (160–250/ha), 6–12 of them ≥ 10 m; seed 3 floods to 119–127 drawn stems under 17–19 tall ones. The tallest stems are 29–33 m. The few beech stand in this open canopy, lit from the side.
- **Gap trees** are 43% of beech's tall tree-seasons and 69% of hornbeam's: in this stand most tall stems have no neighbour of 0.8 H within 5 m. Hornbeam's gap trees have the darker lowest limbs (median 0.15 against 0.27 for closed ones), the opposite of the edge effect the page expects; with 11 trees this is not a finding about edges.
- **Sanity:** `q_sum` and `n_sum` are written only by C3's allocation pass, so the ratio read after `step` is this season's.
