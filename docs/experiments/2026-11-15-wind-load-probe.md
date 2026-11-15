# #133's wind-load probe: a height-dependent load in R3 (bars fixed before the runs)

_2026-11-15. EXPLORATORY: seeds 1–3, nothing adopted on these runs. Issue [#133](https://github.com/epabarker/tree-simulation/issues/133), part of [#129](https://github.com/epabarker/tree-simulation/issues/129). Everything down to "Cost" was committed before any arm ran (50e0220). The results are in "Result" below._

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

## Result

**No arm passes: the probe is rejected, and the wind load stays built and off.**

The full tables are in `code/2026-11-15-wind-load/out/wind.md`; the storm seasons are in `out/storms.json`.

**Every wind run used the wind-load build.** All 120 wind-arm runs hash differently from the same run without wind: 8 arms × (4 species' lone trees + the garden) × 3 seeds, with none identical and none missing.

### The candidates (wind on `H4k8`'s crowns)

| arm (dose) | thrown, bar 9 (HEAD 8 of 79) | lone H/D at 1.3 m in band, bar 1 | stand H/D, bar 7: beech / hornbeam | no inverted fork, bar 10 | runs ≥ 120 canopy trees/ha |
|---|---|---|---|---|---|
| `H4k8` (no wind) | 26 | beech 2/6, hornbeam 3/6 | 78 in / 75 in | beech 0/6, hornbeam 6/6 | 3 of 3 |
| `H4k8W1` (0.5×) | 20 | 2/6, 4/6 | 82 in / 51 out | 0/6, 6/6 | 2 of 3 |
| `H4k8W2` (1×) | 15 | 1/6, 4/6 | 100 out / 51 out | 1/6, 4/6 | 3 of 3 |
| `H4k8W4` (2×) | 9 | 0/6, 0/6 | 68 out / 35 out | 2/6, 6/6 | 3 of 3 |
| `H4k8L2` (1×, leaf only) | 14 | 0/6, 2/6 | 82 in / 48 out | 1/6, 6/6 | 3 of 3 |
| `H4k8S2` (σ ÷ 2, the bracket) | 16 | 1/6, 4/6 | 78 in / 58 out | 0/6, 2/6 | 3 of 3 |

**Why none passes:**
- **Throws and girth pull in opposite directions.** The throws fall with the dose (26 → 20 → 15 → 9), but even 2× leaves one over HEAD's 8.
- **Even the lowest dose over-thickens the stand.** The stand hornbeam's H/D falls from 75, in band, to 51 at 0.5× and 35 at 2×, against a band of 74–98.
- **No dose meets both bars.** The dose that stops the throws is about four times the one that keeps the stand slender.
- **The lone beech is too stout at every dose** (H/D 19–38 at season 100 against 40–56). The lone hornbeam is in band at 0.5× and 1× (4 of 6) and too stout at 2×.
- **The inverted fork stays in beech** at every dose (at most 2 of 6 pass). This was expected before the runs: wind loads each limb at the fork as well as the stem below it, and stress wood is still local (ADR 0011 §3).

**The bracket answers the diagnostic question.**
- **The comparison:** σ ÷ 2 on the same crowns throws 16, as the 1× wind does (15). Its stand hornbeam is less stout (58 against 51), and bars 1 and 10 read alike.
- **The answer:** "needs more wood" explains what the load did here. The height dependence bought nothing that more wood everywhere did not.
- **The caveat:** σ ÷ 2 is not a candidate (ADRs 0011 and 0027 keep σ_target at its physical value).

### The load's job, D independent of crown width: not done

Lone D at 1.3 m on `H4k8`'s crowns, as a share of D on HEAD's crowns, at season 100:

| species | without wind | with wind, every dose and form |
|---|---|---|
| beech | 0.35–0.78 | 0.36–0.89 |
| hornbeam | 0.36–0.76 | 0.26–0.74 |
| birch | 0.20–0.24 | 0.22–0.64 |
| holly | 0.35–0.57 | 0.15–0.38 |

- **The ratio does not move toward 1.**
- **A likely reason, from the form:** a narrow crown carries less leaf area as well as a smaller gravity moment, so f_j shrinks with the crown too. Only the y_j/H_ref factor and the lever are independent of width, and on these trees of a similar height they barely differ.

### On HEAD's crowns (reported, not judged)

| arm | thrown | stand H/D: beech / hornbeam | runs ≥ 120 canopy trees/ha |
|---|---|---|---|
| HEAD | 8 | 54 (6 trees) / 45 | 1 of 3 |
| `W1` | 8 | 78 / 33 | 0 of 3 |
| `W2` | 5 | 52 / 30 | 0 of 3 |
| `W4` | 2 | 41 / 21 | 1 of 3 |
| `L2` | 5 | 68 / 32 | 1 of 3 |
| `S2` | 5 | 68 / 31 | 1 of 3 |

- Bars 1 and 10 fail for both species in every arm on HEAD's crowns.
- The stand is too stout already at HEAD, and the load makes it more so, as ADR 0067 predicted for wide crowns.

### Reported beside the bars

- **The lone crown narrows under the load.** On `H4k8`'s crowns at season 100:
  - W/H falls from 0.52–0.85 to 0.39–0.70;
  - W ÷ Pretzsch's 95% edge falls from 1.21–1.57 to 0.78–1.39;
  - `H4k8W2`'s hornbeam reads 1.00–1.04.
  - The cause is the limbs' own stress wood, which sags them less and so spreads them less. That is a side effect, not this ticket's aim.
- **The lone trees plateau.** The lone hornbeam stops near 29 m by season 50 and holly near 15 m at HEAD. Their seasons 60 and 100 read nearly the same, so bar 1's two seasons are close to one sample.
- **Limb breaks** happen only in storm seasons, in every arm.
  - On `H4k8`'s crowns the load doubles them, from 23.5k to 44.3k–49.7k metamers a run.
  - On HEAD's crowns they fall, from 142k to 101k–124k.
  - These are corrected numbers. `broken` is a per-season count (season.rs resets it), and the first version of `wind.py` differenced it as if cumulative. That undercounted consecutive break seasons by 2–4%.
- **Canopy trees/ha (#129's target 1)** holds in 2–3 of 3 runs on every `H4k8` arm. It fails in most runs on HEAD's crowns.

### A correction during the runs

**The σ bracket's first runs were void.**
- **The fault:** every species carries its own `r3.sigmaTarget` and `sigmaBreak` (3000 and 7000), which override a world-level patch. So `S2` and `H4k8S2` first hashed bit-identical to HEAD and to `H4k8`.
- **The fix:** the patches now set σ on every species, and both arms were re-run. The bracket's numbers above are from the re-run.
- **The wind arms were not affected:** no species sets `r3.windLoad`, and the hash check above shows every wind run differs.
- **What this means for later probes:** a world-level `r3` patch reaches only the fields no species sets.

**The sweep was paused and resumed once.**
- **What happened:** during the pause, the checkout was switched to `3d-port`, which would have rebuilt `treesim` without the wind load on resume.
- **The fix:** it was switched back before resuming, and the rebuild came from sources identical to 0e2a1ea.
- **The check:** `H4k8W4`'s birch runs, the ones at risk, differ from `H4k8`'s.

### Who is thrown (a re-read of these runs, after the results)

_Added after the results at the user's request, to choose between a light-scaled load and closing the ticket. No new simulation: `code/2026-11-15-wind-load/thrown.py`, full output in `out/thrown.md`._

**The question:** R3's windthrow (ADR 0027) acts only in storm seasons. Its chance is THROW·stormLoad·min(1, H/100 cells)²·ramp(H/D), and the ramp is 0 up to H/D 80. The ramp's lower edge sits inside hornbeam's stand band (74–98). So bars 7 and 9 might conflict by construction, with no girth mechanism able to satisfy both.

**The answer: they don't.** The thrown trees are slender canopy trees far beyond the band:

| arm | thrown | canopy trees among them | H/D at the last living season, median (range) | inside 74–98 |
|---|---|---|---|---|
| HEAD | 8 | 8 | 106 (57–188) | 2 |
| `H4k8` | 26 | 25 | 175 (105–297) | 0 |
| `H4k8W2` | 15 | 13 | 121 (80–170) | 5 |
| `H4k8W4` | 9 | 7 | 106 (27–159) | 3 |
| `H4k8S2` | 16 | 15 | 139 (95–185) | 1 |

- **Every throw falls in a storm season,** in every arm.
- **A few read H/D under 80 the season before.** These are 1 per arm at most. The core reads H/D after the storm season's stress wood and height, not the season before's.

**Exposure: planted trees going into a storm, by their H/D (throws ÷ tree-storms).**

| arm | under 80 | 80–110 | over 110 |
|---|---|---|---|
| HEAD | 1/438 | 4/124 | 3/104 (2.9%) |
| `H4k8` | 0/294 | 4/152 | 22/257 (8.6%) |
| `H4k8W2` | 0/387 | 5/133 | 10/173 (5.8%) |
| `H4k8W4` | 1/472 | 4/205 | 4/53 (7.5%) |

**Reading:**
- **Narrow crowns grow a large tail of very slender planted stems.** Under `H4k8`, 257 tree-storms come from trees over H/D 110, against HEAD's 104. Those trees are more extreme (median 175 at death), so the ramp sits near its cap of 2.
- **The wind load cuts throws by shrinking that tail** (257 → 173 → 53). But it thickens every other stem as well, the stand's median included. That is why bar 7 fails first.
- **A light-scaled load would likely make things worse.** The thrown trees are canopy trees, so they are lit and would keep their drag. The slender intermediates just below the canopy would lose theirs.
- **What bar 9 counts:** how many very slender stems a stand of narrow crowns grows. That depends on how crowns compete for height, which is #134's refit, more than on R3.

**So the recommendation is to close #133 as rejected and carry bar 9 to #134.** #134's refit should report the H/D-over-110 tail, for example its tree-storms or its share of the canopy, beside the throw count.
- **A response targeted at slenderness** would be a new rule and a spec change: stress wood answering the stem's own H/D, closer to thigmomorphogenesis than a drag load. It is not proposed here.

### Conclusion and what would change it

- **Rejected as built.** In this form the load stops throws only at doses that over-thicken every stem that does not need it, and it does not make D independent of crown width.
- **ADR 0067's own fallback names the next variant:** scale f_j by the metamer's light, since O2.4 lets Q stand for exposure. The re-read above argues against it: the thrown trees are lit canopy trees.
- **The reserve cure for bar 10:** stress wood passed down the pipe, reopening ADR 0011 §3. Beech's inverted fork survives every load, so this ticket's acceptance puts it to the user.
- **For #134:** the narrow crowns' throws (26 at `H4k8`) remain the obstacle. Neither the wind load nor more wood (the bracket) brings them to HEAD's 8 without over-thickening the stand.
- **What this changes:** no default, golden, preset or regression; `r3.windLoad` stays an off probe param.

## Reproduce

```
node cli/wind-calibrate.ts --species hornbeam,beech --seeds 1,2,3 --at 60
node docs/experiments/code/2026-11-15-wind-load/storms.ts > runs/probe/133-storms.json
docs/experiments/code/2026-11-15-wind-load/run.sh all   # about 7.5 min an arm on 12 simulators
python3 docs/experiments/code/2026-11-15-wind-load/wind.py
python3 docs/experiments/code/2026-11-15-wind-load/thrown.py
```
