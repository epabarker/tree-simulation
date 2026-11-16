# Two traces: the stubs' churn (#137) and the lone hornbeam's 29 m ceiling (2026-11-16)

**Tickets:** [#137](https://github.com/epabarker/tree-simulation/issues/137) (ADR 0072, the [seedling-stubs probe](2026-11-16-seedling-stubs-probe.md)); the [form-knob screen](2026-11-16-form-knob-screen.md)'s untraced ceiling (#134). Spec §O4.11, §C2.8, §R1. Report only: nothing here changes a default.

**Code:** [`code/2026-11-16-stub-churn-and-hornbeam-ceiling/`](code/2026-11-16-stub-churn-and-hornbeam-ceiling/): `ceiling.ts`/`ceiling.sh` (trace A), `churn.ts`, `churn-read.ts` and `floor.ts` (trace B), `bars.ts` (B's probe). The probe's runs use [`cli/seedling-stubs-probe.ts`](../../cli/seedling-stubs-probe.ts) with three new arms.

## A. The lone hornbeam's ceiling

**Hypothesis (from the screen):** `r1.maturity` is 115 cells (28.75 m) with `fRep` 0.8, so above that height 80% of the surplus goes to seed and growth stops near 29 m.

**Runs:** `ceiling.sh`: the lone hornbeam (`cli/trials.ts`' lone stage, the screen's), seeds 1–3, 150 seasons, in WASM, at HEAD, with `r1.maturity` 140 cells (35 m), and with maturity out of reach (10⁹). Each season: height, P, M, the surplus N = P − M, the season's reproduction (the tree's cumulative count differenced) and v_base.

| arm | seed | first season with seed | height then (cells) | v_base the season before → that season | H at 60 / 100 / 150 (m) | metamers at 100 → 150 |
|---|---|---|---|---|---|---|
| head | 1 | 68 | 117.5 | 36,099 → 4,285 | 27.2 / 29.3 / 29.4 | 110k → 108k |
| head | 2 | 58 | 114.4 | 31,259 → 3,569 | 29.3 / 29.2 / 29.2 | 93k → 92k |
| head | 3 | 46 | 116.7 | 28,281 → 3,153 | 29.2 / 29.2 / 29.2 | 70k → 70k |
| maturity 140 | 1 | 101 | 141.4 | 43,131 → 4,668 | 27.2 / 35.4 / 35.4 | 185k → 164k |
| maturity 140 | 2 | 81 | 139.9 | 36,814 → 4,303 | 29.5 / 35.5 / 35.5 | 134k → 130k |
| maturity 140 | 3 | 66 | 140.2 | 36,077 → 4,053 | 33.8 / 35.2 / 35.2 | 115k → 113k |
| maturity off | 1–3 | never | – | – | 27.2–33.8 / 35.4–43.2 / 44.0–51.1 | 175–185k → 222–236k |

**Confirmed.** From the first season R1 finds the tree at 115 cells (its own height, read before the season's growth; the table's is the metrics' after it), the seed share of the surplus goes from 0 to exactly 0.8 and stays there; v_base falls to an eighth (0.9 N → 0.1 N, `sr` 0.1); the height stops within a season (29.2–29.4 m, every seed) and the crown thins slowly (metamers fall). The ceiling moves with the parameter: at maturity 140 every seed stops at 35.2–35.5 m, a season past 140 cells; with no maturity the tree is still growing at 150 (44–51 m, at the box's 50 m top). Until maturity the three arms are the same run (seed 1: 27.2 m at 60 in all three).

So the 29 m stop is R1's maturity switch, not light, hydraulics or form: a step from all growth to one ninth of it, at a fixed height. Whether 29 m is right is a calibration question (hornbeam's 25–30 m is plausible, as the brief says); the shape (a hard stop at a height threshold rather than a slowing) is the model's, and every λ-keeping arm of the screen inherits it.

## B. Stub churn

### B.1 The trace (s3d, 160 cells, seed 1, 150 seasons, WASM)

`churn.ts` follows every tree recruited in the run: a promoted stub (it stands on a cell's centre exactly) or a seed that became a tree at once (its landing point lit to `stubLight`). It records the light that recruited it (that season's field, at the root, y 0.5) and, every later season, its age, height and Q_top/C, until it leaves the stand or reaches 1.3 m. Output: [`churn-trace.txt`](code/2026-11-16-stub-churn-and-hornbeam-ceiling/churn-trace.txt); the floor's, [`floor.txt`](code/2026-11-16-stub-churn-and-hornbeam-ceiling/floor.txt) and [`floor-norotate.txt`](code/2026-11-16-stub-churn-and-hornbeam-ceiling/floor-norotate.txt).

| recruits (150 seasons) | n | demoted | reached 1.3 m | still bank trees | demoted after 1 / 2 / 3 / ≥ 4 seasons |
|---|---|---|---|---|---|
| promoted stubs | 2,912 | 2,859 (98.2%) | 0 | 53 | 2,144 / 562 / 115 / 38 |
| seeds as trees at once | 1,008 | 963 (95.5%) | 31 | 14 | 745 / 151 / 51 / 16 |

| the demoted (3,822) | median [p10, p90] |
|---|---|
| ground Q/C at the root, y 0.5, recruiting season (promotion's measure) | 0.186 [0.157, 0.231] |
| the same point, the next season | 0.015 [0.003, 0.059] |
| Q_top/C, the first season it is read (demotion's measure) | 0.030 [0.005, 0.113] |
| Q_top/C when demoted | 0.020 [0.004, 0.055] |

- **Most promotions are churn.** 98% of the promoted stubs, and 96% of the seeds that became trees at once, are demoted; three quarters at the first season demotion may read them (age 1). In 150 seasons only 31 recruits reached 1.3 m, all of them seeds that landed in the open (ground 0.58, Q_top 1.0), none a promoted stub.
- **The two measures are not the cause: the light field is.** At one season the demoted saw 0.19 on the ground; at the next the same point saw 0.015, and their top 0.03. Promotion's reading predicts nothing a season on: the rank correlation of the recruiting season's ground light with the first Q_top/C is 0.09, and at the cell's centre higher up it is no better (0.08 at y 1.5, 0.07 at y 2.5, 0.08 at y 4.5). The next season's ground at the same point does correlate with that season's Q_top/C (0.49): the two measures agree when read on the same field.
- **The floor's light is a fresh draw every season** (`floor.ts`, every ground cell of the same run at seasons 100–102). The rank correlation of a cell's ground light between consecutive seasons is 0.02 (0.03 for its 3 × 3 mean). Of the 2.3% of cells at ≥ 0.15 one season, 1.7% are still ≥ 0.15 the next and 84% are below 0.075; none holds ≥ 0.15 three seasons running. With the sky's per-season rotation off (`c2.rotate: false`, the same run otherwise) the correlation is 0.83, 46% of the lit cells stay lit and 35% stay lit three seasons. The garden's sky has K = 16 directions and `rotate` on (§C2.8, the streak fix): under a closed canopy the ground light is the few directions that find a gap this season, and they move.
- **So:** brightest-first promotion selects the season's luckiest cells, and demotion reads the next season's draw. Promotion and demotion each read one season of a field that has no memory under the canopy; no stateless reading of one season's field can predict the next.

### B.2 The two stateless fixes (params, off by default)

Both are absent from every preset, so HEAD, the goldens, the regressions and the checkpoints are unchanged.

1. **`o4.stubLightY`** (the world's, cells; absent 0.5): the height at which promotion samples a stub's cell and a seed's landing point is tested for `stubLight`. At 1.5 promotion reads the cell a one-season seedling's top buds sit in (its h is 1 cell), which is what Q_top reads: the nearest stateless stand-in for "promote on demotion's measure". B.1 predicts it will not help (ρ 0.08 at y 1.5); it is run because the issue named it.
2. **`o4.stubDemoteAge`** k (species-merged; absent 1): demotion reads only trees of age ≥ k. A tree's age is in every checkpoint (a tree scalar), so the gate needs no new state. B.1 predicts it can only spread the lottery over k seasons: a tree promoted on a lucky season is still most likely dark at age k, but it holds its slot k seasons, so promotions (and the cost of planting) fall.

### B.3 The probe: arms and bars (fixed before the runs)

Written and committed before any run of B.3. Nothing below this heading changes them.

- **Arms:** `head` and `s3d` as the stubs probe's; **`s3dY15`**, s3d with `stubLightY` 1.5; **`s3dk3`** and **`s3dk5`**, s3d with `stubDemoteAge` 3 and 5. World params, as s3d's.
- **Runs:** `node cli/seedling-stubs-probe.ts -j 6 --out runs/stub-churn-probe --arms head,s3d,s3dY15,s3dk3,s3dk5`: widths 160 and 66, seeds 1–20, 300 seasons, natively, frames at 100, 200 and 300, at most 6 simulators. Definitions, gates and reported measures are the stubs probe's.
- **Reuse:** the stubs probe's head and s3d runs at 160 cells (made at ea5a247/d42cc9a, whose core is this build's with the two new params absent) are linked in, not re-run. Head and s3d at 66 cells are re-run here, for bar C3's wall time and as the check that reuse is sound: each re-run's `hash.txt` must equal the stubs probe's run of the same arm and seed, or the 160-cell runs are re-run too.
- **Gates:** the stubs probe's 1–4, unchanged (gate 4: the lone hornbeam's hashes equal head's).
- **Bars**, judged by `bars.ts`. A churn arm passes only if it passes the gates and:
  - **C1, churn halves:** recruits per run ≤ ½ s3d's, at both widths;
  - **C2, s3d's gains hold:** the stubs probe's adoption bars 1–5 against head, unchanged (cap ≤ ½ head's median and below head in ≥ 15 of 20 at each width; canopy trees/ha ≥ head's at 160; hornbeam in the canopy in ≥ 30 of 60 frames; other-species takeover ≤ head's + 6; the median wall per run at 66 ≤ 1.25 × head's);
  - **C3, no dearer than s3d:** the median wall per run at 66 cells ≤ s3d's.
- If more than one arm passes, the pick is the one with the fewest recruits per run at 160 cells. A pass is a recommendation; adopting it is the user's call.
- **Reported, not gated:** cap seasons per run, recruits reaching 1.3 m, the bank, the stub pool, drawn stems/ha, wall at 160 (head's and s3d's from the reused runs, made under another load: not comparable).
- **Expected (B.1):** s3dY15 fails C1. s3dk3 and s3dk5 cut recruits by up to k-fold, but each holds bank trees k seasons, so the cap seasons may climb back toward s3 (no demotion), against C2's bar 1.

### B.4 Results (seeds 1–20)

160 new runs (120 of the three arms; head and s3d at 66 cells) in about 2½ hours on 6 simulators beside another agent's 6 (load 18–30 on 16 cores, so every wall time here is slower than the stubs probe's; the ratios at 66 cells are within this run). **The reuse holds:** all 40 re-runs at 66 cells have the stubs probe's hashes. Gates 1–4 pass in every arm (the lone hornbeam's hashes are head's; the fixtures and the stubs-on checkpoint load and grow on alike). Output: [`bars.txt`](code/2026-11-16-stub-churn-and-hornbeam-ceiling/bars.txt), [`bars.json`](code/2026-11-16-stub-churn-and-hornbeam-ceiling/bars.json); the full summaries in `runs/stub-churn-probe/` (generated).

| arm | gates | stubs bars 1–5 | C1 recruits/run, 160 / 66 (÷ s3d) | C3 wall/run, 66 (÷ s3d) | cap median, 160 / 66 | runs below head | reaching 1.3 m/run, 160 | bank, 160 / 66 | drawn/ha, 160 / 66 | verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| head | – | – | 1,016 / 737 | 74 s | 235 / 186.5 | – | 162 | 68 / 55 | 1,297 / 322 | – |
| s3d | ✓ | ✓✓✓✓✓ | 7,756 / 3,511 | 88 s (1.19 × head) | 79.5 / 11 | 20 / 20 | 140 | 50 / 20.5 | 657 / 152 | reference |
| s3dY15 | ✓ | ✓✓✓✓✓ | 8,052 / 3,936 (1.04, 1.12) ✗ | 92 s (1.04) ✗ | 68.5 / 30 | 20 / 20 | 142 | 44 / 21.5 | 743 / 133 | fail |
| s3dk3 | ✓ | ✗✓✓✓✓ | 4,912 / 2,426 (0.63, 0.69) ✗ | 86 s (0.97) ✓ | 141.5 / 45.5 | 20 / 19 | 149 | 69.5 / 44 | 1,172 / 189 | fail |
| s3dk5 | ✓ | ✗✓✓✓✓ | 3,423 / 1,815 (0.44, 0.52) ✗ | 87 s (0.99) ✓ | 164.5 / 75 | 20 / 19 | 141 | 99.5 / 52.5 | 805 / 171 | fail |

**No arm passes.** As B.1 predicted:
- **Reading higher (s3dY15) changes nothing.** Recruits rise 4–12%; the cap, the bank and the pool are s3d's within noise. One season's light at any height says nothing about the next.
- **The age gate trades churn for the cap, about one for one.** k 3 cuts recruits by a third and k 5 by about half (0.44 on the desktop, 0.52 on the phone: just short of C1 there), but every gated tree holds a slot k seasons whatever its light, so the bank of full trees re-forms (desktop 50 → 69.5 → 99.5 a frame) and the cap's median seasons climb back toward head's (79.5 → 141.5 → 164.5 on the desktop; bar 1 needs ≤ 117.5). Recruits reaching 1.3 m do not change (140–149 a run): the extra seasons give a shaded seedling nothing. The phone's season is no cheaper (0.97–0.99 × s3d).
- Every arm keeps canopy trees/ha, hornbeam in the canopy (59–60 of 60 frames) and the gates.

## Conclusions

**A.** Confirmed: the lone hornbeam's 29.1–29.4 m stop is R1's maturity switch (`maturity` 115 cells, `fRep` 0.8): from the first season R1 finds it at 115 cells, growth drops to an eighth and the height stops; at maturity 140 it stops at 35.2–35.5 m, and with none it is at 44–51 m by 150. Report only: 29 m is a plausible hornbeam height, but the stop is a step, and any #134 arm that keeps λ will meet it.

**B.** The churn s3d brings (7,756 recruits a run against head's 1,016) is not a mismatch between promotion's and demotion's measures: it is the floor's light under the garden's rotating 16-direction sky, which has no memory from one season to the next under a canopy (rank correlation 0.02 between seasons; 0.83 with `rotate` off). Promotion (brightest first) picks the season's luckiest cells, demotion reads the next season's draw; 98% of promotions are demoted, three quarters at age 1, and none reached 1.3 m in the traced run. Neither stateless fix passes: a different sampling height does nothing, and an age gate buys fewer recruits only with more seasons at the cap.

**Recommendation.**
1. **Adopt s3d as it is, accepting the churn, if it is adopted at all.** The churn is invisible (churned seedlings never reach 1.3 m) and costs the phone about 1.2 × head's season; neither tested fix reduces it without giving back the cap. Do not adopt `stubLightY` or `stubDemoteAge`: both stay as off probe params (or are removed with the PR, if preferred).
2. **A per-tree counter would not help either** and is not worth building as the issue framed it: under a memoryless floor a "k dark seasons in a row" counter behaves as the age gate does (in B.1 a recruit's top read ≥ 0.075 in a quarter of first seasons, which would only reset it). What would help is a measure with memory, for both sides: a running mean of each bank tree's Q_top (state per tree, a checkpoint change) and of each stub cell's light (state per cell), or reading O4's establishment and demotion off a sky that does not rotate. Either is a design decision (ADR 0072 and §C2.8's rotation) for the user, not a probe param.
3. **The flicker is wider than stubs.** Every O4 rule that reads one season's floor or bank light (HEAD's establishment at q_est, ADR 0068's top-light ramp) reads the same lottery. Worth a look before #132's ramp is re-probed.

### What this PR changes
Two params, absent from every preset (`o4.stubLightY`, absent 0.5; `o4.stubDemoteAge`, absent 1), with a unit test each; the probe script's three arms. `npm run check` green with the goldens unchanged; the garden's WASM 188.9 kB gzip (budget 200).
