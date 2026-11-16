# #134's form-knob screen: lone beech and hornbeam (2026-11-16)

**EXPLORATORY.** Seeds 1–5, lone tree only. Nothing here supports an adoption claim; AGENTS.md asks for ≥ 20 seeds with stated pass rates. The screen picks which arms are worth a 20-seed confirmation.

## 1. Question

Can the existing form knobs (ADRs 0028, 0034, 0036), with no new rule, narrow the lone beech and hornbeam early (W/H at season 25) and bring W/H at 100 into ADR 0067's 0.6–1.2, without breaking H/D at 1.3 m? The crown-extent probe's `H4k8` (docs/experiments/2026-11-13-crown-extent-probe.md §2, §3) narrowed crowns by slowing level shoots and sparing upright ones: L_x 4, k 8, no floor, so a lateral's extension was scaled by the square of its heading's upward part once the tree passed about 1.5 m. That is a statement about shoot posture. The nearest existing knobs are the limbs' set point (more upright limbs) and the leader's λ (a stronger leader). The others in #134's list are screened beside them.

## 2. Arms (fixed before any run)

Each arm changes one or two knobs on the species' own patch (`cli/trials.ts` `withAssign`, so a species' own fields are patched, not the world's). Level 0 is the trunk, level 1 the limbs. HEAD values: beech `levels.0.lambda` 0.531, `levels.1.lambda` 0.512, `levels.1.setPoint` 34.3°, `r2.kappa` 0.431; hornbeam 0.580, 0.501, 38.7°, 0.273. Neither species sets `lateralEvery` or a level-1 `curve`. Beech has `curve` 30 on level 0, which acts on relays only.

| arm | change (both species) | why |
|---|---|---|
| `head` | none | the baseline |
| `sp-12` | `levels.1.setPoint` −12° (beech 22.3, hornbeam 26.7) | limbs more upright: `H4k8`'s posture, by the set point |
| `sp-20` | `levels.1.setPoint` −20° (14.3, 18.7) | the same, a stronger dose |
| `lam0+` | `levels.0.lambda` +0.08 (0.611, 0.660) | a stronger leader takes resource from the limbs |
| `lam1-` | `levels.1.lambda` −0.06 (0.452, 0.441) | limbs share more with their laterals, so their tips run less far |
| `kap1=0` | `levels.1.kappa` 0 | ADR 0036: at 0 birch narrowed (0.73 → 0.55) |
| `le1=2` | `levels.1.lateralEvery` 2 | ADR 0036's sparser laterals, on the limbs |
| `curve1-15` | `levels.1.curve` −15, `curveLength` 20 | limbs sweep up along their length (ADR 0034) |
| `sp-12+lam0+` | `sp-12` and `lam0+` | the two posture knobs together |

**Runs:** `cli/trials.ts`' lone stage (the open-grown box, ADR 0062), seeds 1–5, to season 100, read at 25, 60 and 100. That is 9 arms × 2 species × 5 seeds = 90 runs, at most 6 at once (`code/2026-11-16-form-knob-screen/run.sh`).

**Read:**
- W/H on the fit's measure (`lone.spread`: the larger of the core's crown width and depth over height);
- height H (m);
- D at 1.3 m, pooled over a codominant fork below it (`cli/allometry.ts` `pooledDbh`, ADR 0067);
- H/D on that D.

## 3. What counts as promising (fixed before any run)

The triad note's §5 bars, as amended by ADR 0067, read on 5 seeds:
- **W/H at 100** in 0.6–1.2 in at least 4 of 5 seeds (bar 3);
- **W/H at 25** below HEAD's median by at least 15%: the early width #134 names;
- **H/D at 100** in `lone.slenderness`'s band in at least 4 of 5 seeds (beech 40–56, hornbeam 48–68), or no further from it than HEAD (bar 1);
- **H at 100** at least 90% of HEAD's median: a narrower crown must not come from a stunted tree.

W/H at 60 against bar 2 (beech 0.4–0.8, hornbeam 0.5–0.9) is reported but not required: it is a fit trait, and a screen cannot fit it. An arm that meets all four is **promising**. One that meets the first two and misses one of the others is **partial**. The 1–2 arms per species named for a 20-seed confirmation come from these, ranked by W/H at 100. If none qualifies, the screen says so and names the arm nearest.

Not read here: the stand gate (bars 6–8), the namer panel, birch and holly (bar 5). Any arm carried forward needs the stand check, because ADR 0067's stand gate is the gate and narrow crowns lit the floor in the crown-extent probe.

## 4. Results

(To be filled in after the runs.)
