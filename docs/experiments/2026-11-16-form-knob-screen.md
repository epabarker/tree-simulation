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

### 2.1 Wave 2 (added after wave 1's beech, before any wave-2 run)

Wave 1's beech moved on one knob only: the leader's λ (`lam0+`: W/H at 100 in band in 3 of 5 seeds; every other single knob left it at HEAD's 1.3–1.7). Wave 2 doses that knob, and tries holding λ against its ontogenetic fall (`r2.dLambda`: beech 0.014 from season 14, hornbeam 0.073 from season 2 over 20 seasons):

| arm | change | beech | hornbeam |
|---|---|---|---|
| `lam0+14` | `levels.0.lambda` +0.14 | 0.671 | – |
| `lam0+20` | `levels.0.lambda` +0.20 | 0.731 | – |
| `lam0+&dL0` | `lam0+` and `r2.dLambda` 0 | 0.611, 0 | – |
| `lam0+03` | `levels.0.lambda` +0.03 | – | 0.610 |
| `lam0+05` | `levels.0.lambda` +0.05 | – | 0.630 |
| `dL/2` | `r2.dLambda` halved | – | 0.036 |

**Hornbeam's wave 2 was changed before it ran.** Wave 1's hornbeam `lam0+` read after the beech arms above were committed: a 50–52 m pole at the box's top on a 13–16 cm stem (H/D 323–380). Larger doses could only be poles too, so hornbeam's wave 2 brackets HEAD and `lam0+` instead: two smaller doses, and HEAD's λ with half its fall.

30 more runs (`code/2026-11-16-form-knob-screen/arms2.json`, `run2.sh`), read and judged by the same §3 rule.

## 3. What counts as promising (fixed before any run)

The triad note's §5 bars, as amended by ADR 0067, read on 5 seeds:
- **W/H at 100** in 0.6–1.2 in at least 4 of 5 seeds (bar 3);
- **W/H at 25** below HEAD's median by at least 15%: the early width #134 names;
- **H/D at 100** in `lone.slenderness`'s band in at least 4 of 5 seeds (beech 40–56, hornbeam 48–68), or no further from it than HEAD (bar 1);
- **H at 100** at least 90% of HEAD's median: a narrower crown must not come from a stunted tree.

W/H at 60 against bar 2 (beech 0.4–0.8, hornbeam 0.5–0.9) is reported but not required: it is a fit trait, and a screen cannot fit it. An arm that meets all four is **promising**. One that meets the first two and misses one of the others is **partial**. The 1–2 arms per species named for a 20-seed confirmation come from these, ranked by W/H at 100. If none qualifies, the screen says so and names the arm nearest.

Not read here: the stand gate (bars 6–8), the namer panel, birch and holly (bar 5). Any arm carried forward needs the stand check, because ADR 0067's stand gate is the gate and narrow crowns lit the floor in the crown-extent probe.

## 4. Results

All 120 runs finished, and every tree was alive at 100. The table comes from `code/2026-11-16-form-knob-screen/table.ts`, which applies §3's rule. Ranges are the minimum and maximum over seeds 1–5. Counts in brackets are seeds in the bar. "÷HEAD" is the arm's median W/H at 25 over HEAD's.

| species | arm | W/H 25: median (range); ÷HEAD | W/H 60 (in bar 2) | W/H 100 (in 0.6–1.2) | H 100 m: median (range) | D at 1.3 m, 100 (cm) | H/D 100 (in band) | metamers 100 (k) | verdict |
|---|---|---|---|---|---|---|---|---|---|
| beech | head | 1.66 (1.53–1.85); 1.00 | 1.43–1.76 (0) | 1.38–1.59 (0) | 35.5 (33.6–36.4) | 35–49 | 69–104 (0) | 246–274 | baseline |
| beech | sp-12 | 1.79 (1.65–1.82); 1.08 | 1.55–1.81 (0) | 1.46–1.68 (0) | 34.3 (32.5–35.8) | 31–68 | 50–115 (1) | 237–265 | no |
| beech | sp-20 | 1.62 (1.46–1.67); 0.98 | 1.37–1.70 (0) | 1.36–1.59 (0) | 34.6 (33.1–37.7) | 28–50 | 74–116 (0) | 234–253 | no |
| beech | lam0+ | 1.37 (1.25–1.51); 0.82 | 1.01–1.33 (0) | 0.95–1.27 (3) | 41.4 (39.0–44.4) | 53–81 | 48–84 (2) | 188–213 | no |
| beech | lam1- | 1.71 (1.65–1.76); 1.03 | 1.49–1.66 (0) | 1.44–1.61 (0) | 34.0 (33.4–35.0) | 40–49 | 68–85 (0) | 240–256 | no |
| beech | kap1=0 | 1.71 (1.61–2.02); 1.03 | 1.39–1.80 (0) | 1.33–1.68 (0) | 33.8 (33.5–36.5) | 40–55 | 62–90 (0) | 243–261 | no |
| beech | le1=2 | 1.59 (1.39–1.78); 0.96 | 1.50–1.67 (0) | 1.42–1.63 (0) | 35.6 (33.9–35.7) | 28–44 | 76–126 (0) | 250–268 | no |
| beech | curve1-15 | 1.60 (1.38–1.70); 0.96 | 1.43–1.66 (0) | 1.33–1.55 (0) | 35.9 (34.5–37.0) | 29–41 | 87–120 (0) | 237–252 | no |
| beech | sp-12+lam0+ | 1.32 (1.29–1.46); 0.80 | 1.06–1.38 (0) | 1.09–1.50 (2) | 38.9 (34.8–42.8) | 43–81 | 43–94 (2) | 191–213 | no |
| beech | lam0+14 | 1.21 (1.12–1.41); 0.73 | 0.97–1.37 (0) | 0.98–1.29 (4) | 39.4 (38.7–41.7) | 51–63 | 62–78 (0) | 174–189 | partial |
| beech | lam0+20 | 1.15 (1.09–1.41); 0.70 | 0.91–1.14 (0) | 0.85–1.19 (5) | 38.8 (38.1–42.3) | 34–71 | 54–122 (1) | 140–166 | partial |
| beech | lam0+&dL0 | 1.39 (1.22–1.55); 0.84 | 0.84–1.16 (0) | 0.80–1.28 (4) | 42.7 (37.7–47.9) | 39–75 | 50–115 (2) | 174–206 | partial |
| hornbeam | head | 1.26 (0.98–1.60); 1.00 | 1.04–1.37 (0) | 1.04–1.35 (2) | 29.2 (29.1–29.4) | 19–48 | 62–150 (1) | 70–110 | baseline |
| hornbeam | sp-12 | 1.21 (1.13–1.41); 0.96 | 1.10–1.45 (0) | 1.11–1.46 (3) | 29.0 (28.8–29.5) | 20–30 | 98–151 (0) | 77–113 | no |
| hornbeam | sp-20 | 1.29 (1.23–1.60); 1.02 | 1.13–1.63 (0) | 1.14–1.64 (1) | 29.1 (28.9–29.5) | 20–36 | 82–147 (0) | 90–123 | no |
| hornbeam | lam0+ | 0.98 (0.86–1.36); 0.78 | 0.52–0.82 (5) | 0.44–0.58 (0) | 51.0 (49.7–51.5) | 13–16 | 323–380 (0) | 43–58 | no |
| hornbeam | lam1- | 1.25 (1.14–1.42); 0.99 | 1.14–1.40 (0) | 1.14–1.43 (1) | 28.9 (28.8–29.1) | 20–47 | 62–145 (1) | 85–114 | no |
| hornbeam | kap1=0 | 1.08 (1.00–1.54); 0.86 | 0.95–1.51 (0) | 0.95–1.51 (3) | 28.9 (28.8–29.6) | 12–41 | 70–238 (0) | 59–109 | no |
| hornbeam | le1=2 | 1.29 (1.16–1.39); 1.02 | 1.22–1.40 (0) | 1.22–1.36 (0) | 29.1 (28.9–29.1) | 16–28 | 102–179 (0) | 74–112 | no |
| hornbeam | curve1-15 | 1.25 (1.10–1.39); 0.99 | 1.02–1.33 (0) | 1.01–1.33 (3) | 29.0 (28.8–29.0) | 20–31 | 92–145 (0) | 61–106 | no |
| hornbeam | sp-12+lam0+ | 1.14 (0.95–1.24); 0.90 | 0.68–0.90 (5) | 0.49–0.86 (3) | 46.9 (29.1–50.8) | 16–19 | 180–302 (0) | 48–62 | no |
| hornbeam | lam0+03 | 1.13 (0.84–1.27); 0.90 | 0.82–1.02 (2) | 0.74–1.02 (5) | 30.9 (29.0–34.4) | 14–22 | 129–246 (0) | 49–73 | no |
| hornbeam | lam0+05 | 1.08 (0.92–1.33); 0.86 | 0.81–0.92 (3) | 0.66–0.92 (5) | 35.8 (28.9–40.2) | 12–18 | 197–335 (0) | 50–62 | no |
| hornbeam | dL/2 | 1.09 (0.95–1.66); 0.87 | 0.74–1.30 (1) | 0.61–1.30 (4) | 36.0 (29.3–38.5) | 12–25 | 129–315 (0) | 47–85 | no |

**No arm is promising by §3's rule.** Three beech arms are partial. No hornbeam arm qualifies.

**What the screen shows:**
- **Of the knobs screened, only the leader's λ (`levels.0.lambda`, with `r2.dLambda`, its fall) moves W/H.**
  - On both species, the limbs' set point (−12°, −20°), the limbs' λ, the limbs' κ, `lateralEvery` 2 and an upward curve leave W/H inside or near HEAD's range at 25, 60 and 100.
  - The set point is the knob `H4k8`'s posture pointed to, and it does nothing: an upright limb grows as far as a level one does.
  - That fits ADR 0050's finding for the physiology knobs: the crown's width is set by how the leader and the limbs share resource, not by where the limbs point.
- **Beech: a stronger leader narrows the crown early and late, and keeps the tree growing.**
  - `lam0+14` (0.531 → 0.671) puts W/H at 100 in band in 4 of 5 seeds (0.98–1.29, against HEAD's 1.38–1.59). At 25 the crown is 27% narrower (1.21 against 1.66): 12–13 m across at 11–12 m tall, where HEAD is 16–20 m.
  - Its H/D at 1.3 m is 62–78, out of the 40–56 band in every seed. HEAD's is 69–104, so the arm is no worse (the median distance from the band is 18 for both). The verdict is partial only because §3 asked for "no further than HEAD", and the two tie to within rounding.
  - `lam0+20` puts W/H at 100 in band in 5 of 5 (0.85–1.19), but its stems scatter more (34–71 cm; H/D 54–122).
  - Every leader arm is taller than HEAD: 38–48 m at 100, against 34–36 m.
  - Even `lam0+20` misses bar 2 (W/H at 60 of 0.4–0.8) in every seed, at 0.91–1.14.
- **Hornbeam: the same knob turns the tree into a pole.**
  - `lam0+` (+0.08) reaches the box's top (50–52 m) on a 13–16 cm stem.
  - The smaller doses narrow the crown into band (`lam0+03`: W/H at 100 of 0.74–1.02 in 5 of 5; `lam0+05`: 0.66–0.92 in 5 of 5), but the stem at 1.3 m falls to 12–22 cm and H/D to 129–335. Halving λ's fall (`dL/2`) does the same.
  - HEAD's lone hornbeam is already slender: H/D at 1.3 m is 62–150, in band (48–68) in 1 of 5 seeds, on 19–48 cm stems.
  - As the crown-extent probe found (its §3, §5), girth follows the crown, so narrowing the crown moves the hornbeam further from the H/D band. For hornbeam the screened knobs cannot meet bars 1 and 3 together.
- **HEAD's lone hornbeam stops at 29.1–29.4 m in every seed and every arm that keeps HEAD's λ.** That is a ceiling, not seed scatter. Its cause was not traced here.

## 5. Recommendation

- **Beech: confirm `lam0+14` on 20 seeds, with `lam0+20` beside it.** Read the triad bars with pass rates, the late edge rate (#134's last criterion), and the lone height: 39–42 m is taller than HEAD, and the fit's lone height traits were not read here.
  - The stand check is needed before any adoption. λ at level 0 acts on every beech in the stand, not only the lone one. Narrow crowns lit the floor in the crown-extent probe, and the stand gate (bars 6–8) is the gate.
  - The namer panel needs a look too: a beech at W/H 1.0–1.2 is narrower than the 1.50 panel check.
- **Hornbeam: nothing to confirm.** The nearest arm is `lam0+03` (W/H in band in 5 of 5, but H/D 129–246, against HEAD's 62–150). Its lone crown is wide at 60 and the stem thin at 1.3 m, and these knobs trade one for the other. Whether hornbeam needs a girth change (R3/C6, the crown-extent probe's §5), different bars, or W/H at 100 left at HEAD (in band in 2 of 5) is a question for the user, not for a form knob.
- Bar 2 (W/H at 60) is met by no beech arm. It may need the fit, not the screen.
