# #133's wind-load probe: a height-dependent load in R3 (bars fixed before the runs)

_2026-11-15. EXPLORATORY: seeds 1–3, nothing adopted on these runs. Issue [#133](https://github.com/epabarker/tree-simulation/issues/133), part of [#129](https://github.com/epabarker/tree-simulation/issues/129). This section was committed before any arm ran; results follow in a later commit._

## Question

Does a wind load in R3's stress (ADR 0067 decision 5; spec §R3.4, §O2.4) let a narrow-crowned stem thicken and stand?
- **The test case:** under `H4k8`'s narrow crowns, R3 throws 26 of 79 planted trees (HEAD: 8).
- **Beside it, a diagnostic:** σ ÷ 2. This separates "needs more wood" from "needs wood that depends on height".

**The rule** (built off by default at 0e2a1ea: goldens, regressions and lone hashes unchanged; `spec-reviewer` found no divergences):
- **The moment:** M_w,i = Σ_j f_j·max(0, y_j − y_base,i) over i's subtree (j = i included).
- **The force:** f_j = k_w·(a_leaf,j + k_s·2·r_j·l_j)·(y_j / H_ref), with
  - y_j: j's tip height, clamped at 0;
  - a_leaf,j: R6's leaf area on j's live buds;
  - β: 1;
  - H_ref: 100 cells.
- **Where it enters:** σ = 4(|M_g| + M_w)/(πr³), in stress wood and the break check only. Sag, posture and the windthrow ramp stay on gravity.
- **Params:** `r3.windLoad` (k_w) and `r3.windStem` (k_s).

## The dose (calibrated before the bars, the user's choice of 2026-11-15)

ADR 0067 fixes the form, not k_w. `cli/wind-calibrate.ts` measures M_w ÷ |M_g| at the root metamer on HEAD's lone trees at season 60:
- **Method:** grow to 59 with the wind off, then run season 60 from the save twice, wind off and on, both with `r3.girthGain` 0 so the base's radius is the same. σ ∝ (|M_g| + M_w)/r³ then gives the ratio.
- **Linear:** the ratio per unit k_w is identical at k_w 0.001 and 0.004 in all 12 cells.
- **Limb breaks:** the extra breaks in that one season are an artefact of freezing stress wood (a limb cannot thicken to meet the load). They do not move the root's ratio.

| species | seed | leaf only (k_s 0) | leaf + stem (k_s 1) |
|---|---|---|---|
| hornbeam | 1 | 233 | 245 |
| hornbeam | 2 | 1114 | 1170 |
| hornbeam | 3 | 347 | 365 |
| beech | 1 | 1276 | 1338 |
| beech | 2 | 529 | 556 |
| beech | 3 | 291 | 305 |

The numbers are M_w ÷ |M_g| per unit k_w. The stem adds about 5% on these leafy trees.

**The ladder:**
- **Anchor:** hornbeam's median, seeds 1–3, leaf + stem: 365 per unit k_w.
- **Levels:** k_w = 0.0014, 0.0028 and 0.0056, i.e. M_w ≈ 0.5×, 1× and 2× gravity's moment at the lone hornbeam's base at season 60.
- **Leaf only:** the same middle k_w, so the leaf-only and leaf + stem arms differ only in the stem's term.

## Arms

Each arm is a patch in `code/2026-11-15-wind-load/patches/`.
- **Stages:**
  - lone beech, hornbeam, birch and holly to season 100;
  - the garden at 160 cells to season 300 (snapshots 25, 50, 75, 100, 150, 200, 300).
- **Seeds:** 1–3.
- **HEAD:** linked from the crown-extent probe's `129-base-*`, reproduced bit for bit at this build (lone hornbeam seed 1 hashes 859812b6 at both).

| arm | crowns | r3 |
|---|---|---|
| `H4k8` | `c1.extentLimit` height (#129's `H4k8`) | – (re-run: its hornbeam runs are gone) |
| `W1`, `W2`, `W4` | HEAD | windLoad 0.0014, 0.0028, 0.0056; windStem 1 |
| `L2` | HEAD | windLoad 0.0028; windStem 0 |
| `H4k8W1`, `H4k8W2`, `H4k8W4`, `H4k8L2` | `H4k8` | as above |
| `S2`, `H4k8S2` | HEAD, `H4k8` | sigmaTarget 1500, sigmaBreak 3500 (both ÷ 2, keeping ADR 0027's safety factor): the bracket, not a candidate |

## Bars (the triad re-read's §5, as ADR 0067 amended it)

Every bar is computed by `code/2026-11-15-wind-load/wind.py`.

1. **Lone H/D with D at 1.3 m, codominant forks below it pooled** as √Σd², in `lone.slenderness`'s band at seasons 60 and 100.
   - Bands: beech 40–56, hornbeam 48–68.
   - Pass: 6 of 6 per species (3 seeds × 2 seasons).
   - The measure: the trunk is followed by the larger subtree volume. A side child with at least half the continuing child's volume (cli/allometry.ts's `CODOMINANT`) starts a stem of its own. Each stem's diameter is read where its stem length reaches 1.3 m. The root metamer's H/D is reported beside it.
2. **Stand H/D** in `stand.slenderness`'s band: beech 70–94, hornbeam 74–98.
   - The measure: the core's root-metamer diameter, which the fit's term reads. The 1.3 m measure is reported beside it; the two agree on the garden's boles.
   - The statistic: the median over canopy trees (drawn, over half the top height), with seeds and the seasons 100, 150, 200 and 300 pooled.
   - The floor: read on at least 8 trees. Hornbeam must be read; beech, which is rare in the garden (6 trees at HEAD), may stay unread without failing the bar.
3. **Throws:** trees thrown by R3, from the planted cohort at 160 cells with seeds pooled, no more than HEAD's 8 of 79.
4. **No inverted fork:** Σr_c² ≤ 1.3·r_p² at every fork of a stem below 1.3 m of stem length.
   - Scope: lone beech and hornbeam at 60 and 100.
   - Pass: 6 of 6 per species.

**Rule for choosing.**
- **Candidates:** the wind arms on `H4k8`'s crowns.
- **Pass:** a candidate passes if it clears bars 1, 7, 9 and 10. If several pass, the lowest dose wins, and leaf + stem wins over leaf only at the same dose.
- **On HEAD's crowns,** the wind arms are reported, not judged. ADR 0067 expects HEAD's wide crowns to read worse on lone H/D under the load, by construction.
- **The σ bracket** is never a candidate.
- **A passing arm is not adopted on these runs.** It goes to 20 seeds with stated pass rates, an ADR superseding ADR 0013's deferral, and #134's refit.
- **If no arm passes,** the note says which bar fails and why.
- **If bar 10 fails under every load,** the reserve cure goes to the user: stress wood passed down the pipe, reopening ADR 0011 §3.

**Reported, not gated:**
- the triad's other bars: W/H at 60 (the fit's `lone.spread`), W/H at 100, and W ÷ Pretzsch's 95% edge;
- the root metamer's H/D;
- lone D on `H4k8`'s crowns ÷ D on HEAD's at season 100 (the load's job is to make D independent of crown width, so the ratio should move toward 1);
- canopy trees/ha at the 100–300 snapshots (#129's target 1);
- limb breaks per run, and their share in storm seasons (`code/2026-11-15-wind-load/storms.ts`).

## HEAD on these measures (from the linked runs, before any arm)

**Lone trees:**
- **H/D at 1.3 m, pooled:**
  - beech 15–24 at 60 and 17–26 at 100;
  - hornbeam 16–38 and 15–38;
  - both 0 of 6 on bar 1.
- **Worst junction:** beech 2.06–3.62 at 60 and 1.52–2.91 at 100; hornbeam 1.66–3.40 and 1.55–3.46. Both 0 of 6 on bar 10.

**Garden:**
- **Throws:** 8 of 79 planted thrown.
- **Stand H/D, root:** hornbeam 45 (41 trees), out of band; beech 54 (6 trees), unread.
- **Canopy trees/ha, median per run:** 70, 148 and 156.
- **Limb breaks:** all of them fall in storm seasons.

## Expected (written before the runs)

- **Lone D:** the load thickens the base by about (1 + M_w/|M_g|)^⅓. That is ×1.14, ×1.26 and ×1.44 on the ladder, before the crown answers.
  - **Hornbeam under `H4k8`** sits at H/D 43–69 (dbh.py's unpooled D). `H4k8W1`–`W2` should keep it in band, and `W4` may push it below 48.
  - **Beech under `H4k8`** is too slender at season 60 (59–61) and should come into band at `W1`–`W2`.
- **Throws:** these should fall toward HEAD's under the load on `H4k8`. That is the issue's test.
- **The inverted fork:** probably stays. Wind adds to each limb's own moment at the fork as well as to the stem's, and stress wood is still local (ADR 0011 §3). Expect bar 10 to fail, and the reserve cure to go to the user.
- **The σ bracket:** expect it to thicken every limb (σ_target is the set point), with more wood but no height dependence. Expect lone W/H and the canopy count close to its crowns' arm, with the stand H/D lower.

## Cost

| | runs | each run's length | simulators |
|---|---|---|---|
| lone stage | 11 arms × 4 species × 3 seeds = 132 | 100 seasons | – |
| garden stage | 11 arms × 3 seeds = 33 | 300 seasons | – |
| per arm | – | – | at most 12 (`run.sh`: 6 garden + 3 + 3 lone) |

`rust/` is not edited while the runs are queued.

## Reproduce

```
node cli/wind-calibrate.ts --species hornbeam,beech --seeds 1,2,3 --at 60
node docs/experiments/code/2026-11-15-wind-load/storms.ts > runs/probe/133-storms.json
docs/experiments/code/2026-11-15-wind-load/run.sh all
python3 docs/experiments/code/2026-11-15-wind-load/wind.py
```
