# The form sweep, reviewed: three knobs per species for the grid (2026-10-31)

A reading of the round-5 form sheets (`runs/form-sweep/<species>/sheet-{60,100}.png`, seed 1, one knob at a time, the rest at round 2's; the [round-5 plan](../plans/2026-10-31-species-round5.md) §3.2, ADR 0029) against each species' brief (the [traits note](../research/2026-10-28-species-traits.md), spec §9, the targets files' `[[report]]` entries). Nothing under `analysis/fit/` was changed and no fit was started. The user picks; this names the rows and the ranges.

**How much of this was seen, and how much was read from the numbers.** Every cell's profile, elevation, W/H, fork, dominance and height were read from the sweep's npz files (all 72 cells × 2 seasons × 8 species). The sheets themselves were opened at full size in three-row strips, but the session's image budget dropped many of them. Seen as pictures: oak (both seasons, every row), willow (both, every row), maple (both, every row), birch at 100 (every row) and birch at 60 (aC, dLambda, kappa only), hornbeam at 100 (every row) and at 60 (λ₀, λ₁, set point only), holly at 100 (every row). **Not seen as pictures, read from the numbers alone: beech (both seasons), rowan (both), holly at 60, birch at 60 rows 1–6, hornbeam at 60 rows 4–9.** For those the "reads as" lines are inferences from the profile bars and the four numbers, and the user's own look at the sheet overrides them.

Conventions: "profile" is the ten band widths base → top over the widest; "widest at band k" means k/10 of the crown from the base. `limbElevation` is "elev". Cells are named `knob = value`. Height is ignored except where it marks an artefact (a pancake, a pole) or the 200-cell ceiling.

**What the sweep shows across all eight species (the user's reading, confirmed on the pictures seen):**
- `levels.1.branchAngle` and `levels.1.eta` change nothing in kind for any species. The elevation of the limbs is set by the set point (R3's `postureSetPoint` where a species has one; the `setPoint` where not) and the outline does not follow either knob.
- `levels.1.setPoint` moves elev from ≈ 70° to ≈ 0° for every species but birch (held at 21° by its `postureSetPoint` 70). For most species the outline does not move with it. For oak, willow and holly the base bands fill at 90 (level limbs along the ground), which is a change of outline worth a look: it is the only row that puts "heavy near-level limbs" on the oak.
- `levels.2.setPoint` ≥ 80 is an artefact row for every broadleaf: 80 makes a parasol of level tiers (oak, hornbeam, willow, maple, birch), 120–160 a mound or a bristling column. Only 40 and the species' own value are usable; the knob should stay out of the grids except where twig droop is the brief (birch, willow).
- The ontogeny knobs (`aC`, `dLambda`), acrotony (`kappa`) and the two λ's are the rows where the kind of tree changes.

---

## Beech (read from the numbers; the sheet was not seen)

1. **Brief:** a dome of spreading limbs, widest in the lower middle (profile widest 0.4, full 0.75), W/H 0.6 ± 0.2, fork 0.7 ± 0.2, dominance 2 ± 0.8, limbs 55° ± 10°.
2. **Round 2 reads as:** at 60 a cone widest at the base (profile 1.00 0.90 0.82 0.90 0.79 0.63 0.59 0.47 0.34 0.21; W/H 0.55, fork 1.00, dom 1.9, H 143): the spindle. At 100 H 203 against the 200 ceiling, W/H 0.40, a flat-topped column: the ceiling, not a form. Judge beech at 60.
3. **Rows that change the kind:**
   - `levels.0.lambda = 0.5`: the leader is lost; W/H 1.65, fork 0.03, dom 1.25, H 72. A broad low bush, still widest at the base (profile 1.00 → 0.59), not a dome. 0.5333 and up: the cone again.
   - `levels.1.lambda = 0.5467` and `0.58`: the crown turns over. At 0.5467 the widest band is 6–7 (profile 0.65 0.67 0.63 0.69 0.79 0.93 1.00 0.90 0.69), W/H 0.72, fork 0.08: a vase forking at the base. At 0.58 widest at band 8–9, W/H 0.85: an inverted cone. The dome's "widest in the lower middle" lies between round 2's 0.512 (widest at base) and 0.5467 (widest at 0.6): a narrow window around 0.52–0.54.
   - `dLambda = 0`: widest at band 4 (profile 0.84 0.82 0.88 0.95 1.00 0.80 0.81 0.62 0.56 0.34), fork 0.87, dom 2.4, W/H 0.50. This is the brief's profile shape, tall and narrow. `dLambda = 0.04` is already a pancake at seed 1 (W/H 1.93, H 70, fork 0.10); 0.08 and 0.12 worse (W/H 4.1, 4.6).
   - `kappa = 1.333`: widest at band 3 (0.93 0.85 0.93 1.00 0.96 0.92 0.78 0.65 0.54 0.38), W/H 0.52, dom 1.7: an ovoid rather than a cone. `kappa = 2.667`: widest at band 4, W/H 0.61, dom 1.5. `kappa = 4`: W/H 0.78, dom 1.2, widest at band 1. `kappa = 0`: W/H 0.87 but H 103, fork 0.75: broad and low.
   - `aC = 26.67` and `40`: widest at band 3 (0.96 0.91 0.97 1.00 0.93 0.73 … and 0.84 0.85 0.93 1.00 0.95 0.82 …), W/H 0.52–0.53, fork 0.95: a trunk, then a crown widest a third of the way up.
   - `levels.2.setPoint = 40`: the base bands empty (0.47 0.82 1.00 0.93); 160: fuller mid bands (0.86 0.88 0.84). A change of fullness, not of kind.
4. **Rows that do nothing:** `levels.1.setPoint` (elev 63° → −0.4°, outline unchanged), `levels.1.branchAngle`, `levels.1.eta`.
5. **Grid:** `aC` 15–40, `kappa` 1.0–3.0, `levels.1.lambda` 0.51–0.55 (hold `dLambda` at round 2's 0.014). Reason: these three move the widest band up from the base (to 0.3–0.6) while keeping the leader and the fork, which is what the dome asks for; the two routes in the user's draft (losing the leader with `levels.0.lambda` 0.50, or `dLambda` ≥ 0.04) give a bush and a pancake, both widest at the base.
6. **Where this disagrees with the user's draft** (`levels.0.lambda` 0.50–0.54, `dLambda` 0.01–0.05, `aC` 10–40): the dome the draft saw at `levels.0.lambda` 0.50 / `dLambda` 0.02–0.04 / `kappa` 0 has a lost leader and fork 0.03–0.10, outside the brief's fork 0.7 ± 0.2, and its profile is widest at the base. `dLambda` 0.04 is a pancake at seed 1, so a grid to 0.05 spends a third of its cells there; if `dLambda` is kept, 0–0.03. The rows whose profile actually peaks at 0.3–0.5 of the crown are `dLambda` 0, `kappa` 1.3–2.7, `aC` 27–40 and `levels.1.lambda` ≈ 0.53, none of which loses the leader. **Unsettled:** this reading is from the bars, not the picture; the beech sheet must be looked at before the grid is run. A second grid with `dLambda` 0–0.03 × `levels.1.lambda` 0.51–0.55 × `levels.0.lambda` 0.52–0.56 is the fallback if the first gives cones.

## Birch (seen at 100 in full; at 60 the aC, dLambda and kappa rows; the rest from the numbers)

1. **Brief:** narrow and ascending, fine, drooping at the tips; an ovoid widest below the middle (0.4, full 0.7), W/H 0.55 ± 0.12, fork 0.9 ± 0.1, dominance 3 ± 1, limbs 45° ± 10°, droop 15°.
2. **Round 2 reads as:** a spire at both seasons. At 60 W/H 0.38, fork 1.00, dom 2.7, profile 0.91 1.00 0.94 0.90 0.83 0.84 0.69 0.69 0.50 0.34, widest at band 1. At 100 (H 161, W/H 0.32) a conifer-like spire of level limbs (elev 21°) with the lower ones drooping. Narrow, fine and drooping as the brief says; the outline is a cone, not an ovoid, and the limbs are level rather than ascending.
3. **Rows that change the kind:**
   - `levels.0.lambda = 0.5667`: W/H 0.48 at 60 and 0.60 at 100, fork 0.98–0.99, dom 2.4, widest at band 2 (0.85 0.88 1.00 0.94 0.79 0.78 0.67 0.65 0.46 0.34; at 100 0.78 0.93 1.00 0.79 …). The nearest thing to the brief's ovoid in the sweep: a fuller crown with a leader, widest a fifth of the way up. `0.5333`: W/H 0.77–0.97, H 91, a low dome with the leader going; `0.5`: a bush (H 56, W/H 2.6).
   - `levels.1.lambda = 0.5467`: W/H 0.77 (0.64 at 100), profile 0.78 1.00 0.97 0.84 0.67 …: a broader cone, still widest at band 1. `0.58`: W/H 1.05, at 100 a pagoda of long level tiers. Broadens the cone; it does not lift the widest band.
   - `kappa = 1.333`: W/H 0.49, dom 1.8, tufts on the limbs; 2.667 and 4: W/H 0.59–0.61, dom 1.5, a broad tufted cone (seen at both seasons). Opens the crown but takes dominance away from the brief's 3.
   - `levels.2.setPoint = 120`: twigs hang, W/H 0.40–0.42, a conifer with a weeping fringe (seen at 100); `80`: a parasol at 100 (W/H 0.57, flat top: artefact); `40`: a bristling column (fork 0.66, dom 3.7; artefact).
   - `aC = 0`: a broad skirt under a spike (profile 1.00 0.55 0.48 …, W/H 0.92); `13.33`: a broad-based cone (W/H 0.59). `40`: taller and narrower (H 159, W/H 0.32).
   - `dLambda = 0` and `0.04`: taller spires (H 171, 159; W/H 0.31, 0.38; dom 3.5–3.7); `0.12`: a low broad crown (H 108, W/H 0.63 → 0.96 at 100).
4. **Rows that do nothing:** `levels.1.setPoint` (elev 21–22° throughout: the `postureSetPoint` 70 holds the limbs), `levels.1.branchAngle`, `levels.1.eta`.
5. **Grid:** `levels.0.lambda` 0.55–0.59, `levels.1.lambda` 0.49–0.55, `postureSetPoint` 50–75 (the tenth knob, level 1). Reason: the first lifts the widest band and fills the crown toward the ovoid, the second sets its breadth, and the posture set point is the only thing that will make the limbs ascend (elev 21° in every cell of the sweep against a brief of 45°).
6. **Where this disagrees with the user's draft** (`levels.1.lambda` 0.50–0.55, `kappa` 0.5–2.5, `postureSetPoint` 50–75): agreed on the posture knob and on `levels.1.lambda`. `kappa` 1.3–2.7 opens the cone with tufts but leaves it widest at the base and lowers dominance to 1.5–1.8 against the brief's 3 ± 1; `levels.0.lambda` 0.5667 is the one row whose profile is an ovoid (widest at band 2, W/H 0.48–0.60) and it keeps dom 2.4 and fork 0.98. So swap `kappa` for `levels.0.lambda`. **Unsettled:** `levels.0.lambda` is steep between 0.533 (leader going) and 0.567 (ovoid), so the grid's low end may lose the leader on other seeds; twig droop (`levels.2.setPoint`) is held at round 2's 145, which already hangs the twigs, and 120 is the only alternative worth a cell.

## Oak (seen in full at both seasons)

1. **Brief:** broad with heavy near-level limbs, a rounded crown widest about its middle (0.5, full 0.72), W/H 0.75 ± 0.25, fork 0.3 ± 0.15, dominance 1.3 ± 0.5, limbs 55° ± 10°.
2. **Round 2 reads as:** a fine broom. At 60 a V-shaped fan of many fine ascending twigs from a basal fork (W/H 1.25, fork 0.04, dom 1.5, profile 0.20 0.42 0.60 0.64 0.71 … widest at the top), no heavy limbs. At 100 (H 160, W/H 0.92) a tall V-fan of fine twigs, still widest at the top: an inverted cone, not a dome.
3. **Rows that change the kind:**
   - `aC = 26.67`: a trunk, then a crown (fork 0.37, dom 2.9, H 117); at 100 an untidy fan on a trunk with one or two wild low limbs. `aC = 40`: fork 0.79, dom 3.4, H 126, at 100 (W/H 0.90) a clear trunk with long near-level lower limbs and a spiky top: the one cell with something like heavy limbs. `aC = 0` and `13.33`: fans.
   - `dLambda = 0.04`: fork 1.00, dom 1.6, H 129, W/H 0.68, widest at band 3 (0.34 0.77 0.95 1.00 0.76 …): a conical ovoid on a short trunk (a Christmas tree at 60, an elongated cone at 100, W/H 0.51). `dLambda = 0.08`: fork 0.29, W/H 0.94, widest at band 4 (0.26 0.56 0.78 0.89 1.00 …): a rounded, slightly lumpy crown at 60, the best outline in the sweep; at 100 narrower (W/H 0.58, widest at band 2). `dLambda = 0`: a tall tree with a tuft on top and long low limbs (H 162 → 202, dom 4.3 → 10.4): wild. `0.12` (round 2's): the fan.
   - `kappa = 0`: low and broad (H 75, W/H 1.44, a flat-topped bush); `1.333`–`4`: taller fans (H 111–120, at 100 H 183–192, W/H 0.71–0.81).
   - `levels.1.setPoint = 90`: elev 0°, the base bands fill (profile 0.75 0.81 0.87 0.96 0.89 …; at 100 0.60 0.65 0.72 0.79): a fuller, rounder outline with limbs lying along the ground. The only row that gives the oak level limbs; it does not change the fine-twig structure.
   - `levels.0.lambda = 0.6`: a trunk appears (fork 0.25, dom 2.4, W/H 0.83); the rest fans. `levels.1.lambda`: fans throughout (W/H 0.95–1.19).
   - `levels.2.setPoint` 80: a parasol (W/H 2.35, H 67); 120 and 160: low mounds on the ground (H 58). Artefacts.
4. **Rows that do nothing:** `levels.1.branchAngle`, `levels.1.eta`.
5. **Grid:** `aC` 20–40, `dLambda` 0.04–0.10, `kappa` 0–1.5. Reason: `aC` makes the trunk and the fork height, `dLambda` 0.04–0.08 turns the fan into a rounded crown widest at mid-height, and low `kappa` keeps it broad and low; these are the three rows where the oak changes kind.
6. **Agrees with the user's draft.** Two notes: `kappa` 0 with everything else at round 2's is a low flat bush (H 75), so the grid's bottom corner may read as scrub; and the heavy near-level limbs are not in any of the three knobs. They appear only in `levels.1.setPoint` 90 (and in the `aC` 40 / `dLambda` 0 cells as long low limbs). A tenth-knob sweep of oak's posture, or a second grid with `levels.1.setPoint` 60–90 in place of `kappa`, is where the limbs will come from. The fineness of the twigs (no girth hierarchy) is not a form knob at all and will not move in any grid.

## Hornbeam (seen at 100 in full; at 60 the λ₀, λ₁ and set-point rows; the rest from the numbers)

1. **Brief:** a dense egg, rounded, widest about the middle (0.45, full 0.72), W/H 0.7 ± 0.2, fork 0.4 ± 0.2, dominance 1.6 ± 0.6, limbs 50° ± 10°.
2. **Round 2 reads as:** a vase. At 60 a fan of ascending limbs from a low fork with a flat dense cap (W/H 1.04, fork 0.21, dom 1.5; profile 0.29 0.39 0.52 0.64 0.69 … widest at the top). At 100 (H 144, W/H 1.00) the same vase, fuller.
3. **Rows that change the kind:**
   - `aC = 13.33`: an egg on a short trunk. At 60 fork 0.71, dom 2.5, H 118, W/H 0.69, widest at band 3 (0.27 0.40 0.69 1.00 0.96 …); at 100 W/H 0.59, fork 0.54, widest at bands 2–4, a tall rounded crown with a leader (seen). The closest cell to the brief (W/H 0.69 against 0.7). `aC = 26.67`: narrower (W/H 0.47 at 60, 0.62 at 100, H 140 → 175). `aC = 40`: a column (W/H 0.33–0.35, H 159 → 200, the ceiling).
   - `levels.0.lambda = 0.6`: a leader appears (fork 0.92, dom 2.0, H 138, W/H 0.64), widest at bands 4–5 (0.38 0.55 0.74 0.94 0.97 …): an upright egg at 60; at 100 (H 182, W/H 0.59) an irregular upright crown. `0.5`–`0.5667` (round 2 is 0.58): vases all.
   - `dLambda = 0`: a tall egg at 60 (fork 0.88, dom 3.7, W/H 0.60, widest at band 2) that reaches the ceiling at 100 as a pole (H 208, W/H 0.25). `dLambda = 0.04`: a spire (H 171 → 205, W/H 0.32). `0.12`: a lower broader vase (W/H 1.46, H 90).
   - `levels.2.setPoint` 80: a parasol (fork 0.92, flat tiers); 120: a conifer-like cone (profile 1.00 at the base, seen at 100); 160: a column with a skirt. Kind changes, all away from the brief.
   - `kappa` ≥ 1.333: taller vases (H 138–143, at 100 at the ceiling), fork ≈ 0.04. `kappa = 0`: a vase.
4. **Rows that do nothing:** `levels.1.lambda` (W/H 1.00–1.07, vases), `levels.1.setPoint` (elev 68° → 4°, outline unchanged), `levels.1.branchAngle`, `levels.1.eta`.
5. **Grid:** `aC` 10–30, `dLambda` 0.04–0.10, `levels.0.lambda` 0.56–0.60. Reason: `aC` around 13 gives the egg on a trunk at the brief's W/H; `dLambda` between the spire at 0.04 and the vase at 0.08 sets how much leader survives; `levels.0.lambda` near its top is the other route to the leader.
6. **Where this disagrees with the user's draft** (`aC` 20–40, `dLambda` 0.04–0.10, `levels.0.lambda` 0.53–0.58): at seed 1 the egg is at `aC` 13 (W/H 0.69) and `aC` 27–40 are a narrow egg and a column (W/H 0.47, 0.33), so the range should start lower, 10–30. The vase holds across `levels.0.lambda` 0.50–0.58 (round 2's 0.58 is a vase) and the egg appears only at 0.60, so 0.53–0.58 lies entirely in the vase; 0.56–0.60 straddles the change. **Unsettled:** the transition between 0.58 and 0.60 is one sweep step wide; `dLambda` 0.04 alone is a spire, so the grid's low-`dLambda` cells depend on `aC` pulling the crown back out; the 100 sheet's upper `aC` and `dLambda` cells hit the ceiling.

## Willow (seen in full at both seasons)

1. **Brief:** broad and low, a full crown widest about the middle (0.5, full 0.72), W/H 1.6 ± 0.4, fork 0.15 ± 0.15, dominance 1.1 ± 0.4, limbs 45° ± 10°, droop 10°.
2. **Round 2 reads as:** a low wide V-fan. At 60 (H 69, W/H 1.47, fork 0.03, dom 0.9) fine ascending twigs from a basal fork, flat-topped, widest at the top (profile 0.08 0.22 0.44 0.54 0.68 …). At 100 (H 83, W/H 1.40) the same with longer leaning limbs, sparse. Broad and low in proportion; the outline is a V, hollow below.
3. **Rows that change the kind:**
   - `levels.1.lambda = 0.48`: a rounded crown, widest at band 4 (0.21 0.54 0.72 0.83 1.00 …), W/H 0.95, fork 0.19, H 76; at 100 W/H 0.81, widest at band 3. The one cell whose outline is the brief's, though narrower than W/H 1.6. `0.5467`: a V (W/H 1.26); `0.58`: a tall wide-armed V (H 133).
   - `levels.1.setPoint = 90`: elev 3°, the base fills (0.43 0.46 0.59 0.67 0.72 …), W/H 1.41, H 59: a lower, rounder, broader bush with limbs along the ground. `20`: taller (H 85). The set point is live for willow's outline.
   - `levels.2.setPoint = 120` and `160`: a full low mound of hanging twigs (profile 1.00 at the base, 0.85–0.98 through the middle; H 57–59, W/H 1.22–1.28, fork 0.07): broad, low, full and weeping, but on the ground with no visible trunk. `80`: a parasol (W/H 2.15, H 52).
   - `levels.0.lambda = 0.5333`: a leader returns (fork 0.93, dom 1.0, W/H 0.88, a conical ovoid); `0.5667` and `0.6`: spires (H 167–170, at 100 the ceiling). Round 2's 0.517 is one step from the leader.
   - `aC = 26.67` and `40`: a crown on a trunk (fork 0.44–0.67, W/H 0.65–0.67): upright, away from the brief.
   - `dLambda = 0`: a cone with a leader (fork 1.00, W/H 0.61); `0.08` and `0.12`: at 100 enormous spreading V's of long limbs (H 163–169). `kappa = 0`: the lowest, widest fan (H 53, W/H 1.49); `4`: narrower (W/H 1.01).
4. **Rows that do nothing:** `levels.1.branchAngle` (70 is smaller, same kind), `levels.1.eta` (1.0 narrows to W/H 0.94, same kind).
5. **Grid:** `levels.1.lambda` 0.48–0.52, `levels.1.setPoint` 60–90, `levels.2.setPoint` 54–120. Reason: the first rounds the V into a crown widest at mid-height, the second lays the limbs out and fills the base, the third hangs the twigs; all three fill the hollow below the fan without adding a trunk or a leader.
6. **Unsettled:** W/H 1.6 is reached only by the V-fan and the parasol; the rounded cells are W/H 0.9–1.4, so the brief's breadth and its fullness pull against each other and the physiology fit (height) will decide the ratio. Whether the `levels.2.setPoint` 120 mound is a willow or an artefact is the user's call on the picture. `levels.0.lambda` must stay below 0.53 or the willow becomes a spire.

## Rowan (read from the numbers; the sheet was not seen)

1. **Brief:** slender with steep limbs (35° from vertical), an open oval widest about the middle (0.5, full 0.68), W/H 0.4 ± 0.12, fork 0.6 ± 0.2, dominance 2 ± 0.8, droop 5°.
2. **Round 2 reads as:** by the numbers, already an oval with a leader: at 60 W/H 0.56, fork 0.84, dom 2.1, elev 45°, profile 0.49 1.00 0.96 0.90 0.93 … widest at bands 1–2 and holding to the middle; at 100 (H 114) W/H 0.52, fork 0.95, profile 0.72 1.00 0.97 0.92. Broader than the brief's W/H 0.4 and widest low rather than at the middle; the limbs at 45° against the brief's steeper 35°.
3. **Rows that change the kind:**
   - `levels.1.lambda = 0.5467` and `0.58`: the oval becomes a vase (fork 0.02, W/H 1.02–1.18, widest at the top). 0.48–0.513 keep the oval.
   - `levels.0.lambda = 0.5667` and `0.6`: a tall spire (H 149–164, W/H 0.29–0.33, fork 1.00); `0.5`: a bush (H 53, W/H 1.8). Round 2's 0.534 sits between.
   - `dLambda = 0`: narrower and taller (H 141, W/H 0.36, fork 0.93, dom 2.2, profile 0.92 1.00 0.89 0.80 0.66 …): inside the brief's W/H band. `0.08`: broad (W/H 0.91, fork 0.65); `0.12`: a low broad crown (W/H 1.43, fork 0.21).
   - `aC = 40`: narrower (W/H 0.39, H 127, profile 0.83 1.00 0.92 …); `26.67`: W/H 0.48; `0`: low and broad (W/H 1.15, H 68).
   - `levels.1.setPoint = 20`: elev 52° (steep limbs, W/H 0.54); `90`: elev 8°. The set point is live for rowan and moves the limb angle, the brief's steepness, without moving the outline.
   - `levels.2.setPoint` ≥ 80: the base fills (profile 1.00 at the base), a broad-based cone; `kappa = 0`: W/H 0.65, H 79, fork 0.73.
4. **Rows that do nothing:** `levels.1.branchAngle` (elev 52° → 39°, outline unchanged), `levels.1.eta`.
5. **Grid:** `aC` 20–40, `dLambda` 0–0.04, `levels.1.setPoint` 15–40. Reason: the oval is already there; the brief asks for it slenderer and steeper-limbed, and `aC` and `dLambda` narrow it (toward W/H 0.4) while the set point is the only knob that steepens the limbs (elev 52° at 20 against the brief's ≈ 55°).
6. **Unsettled:** not seen as a picture; the profile bars may hide a tiered or lumpy crown. Whether `levels.1.setPoint` or a `postureSetPoint` should hold rowan's limb angle is the same question as birch's. `dLambda` 0 reaches H 172 at 100, so the physiology fit will have to pull height back.

## Holly (seen at 100 in full; at 60 from the numbers)

1. **Brief:** a dense cone, widest near the base (0.15, full 0.55), W/H 0.5 ± 0.15, fork 0.9 ± 0.1, dominance 3 ± 1, limbs 60° ± 10°.
2. **Round 2 reads as:** already a cone. At 60 W/H 0.63, fork 1.00, dom 1.3, profile 0.89 0.96 1.00 0.89 0.78 … widest at band 2. At 100 (H 101, W/H 0.45) a neat dense conifer-like cone, widest near the base (seen). Dominance 1.3 is well under the brief's 3.
3. **Rows that change the kind:**
   - `levels.0.lambda`: steep. `0.5` a pancake (H 28); `0.5333` a broad low cone (W/H 0.96 → 0.69 at 100, H 58 → 81); `0.5667` a narrow spire (H 116 → 160, W/H 0.39 → 0.22, dom 3.1); `0.6` a wandering pole (H 110 → 208, dom 5). The cone lives in 0.53–0.55.
   - `levels.1.lambda = 0.48`: a wide skirt under a narrow top (profile 1.00 0.54 0.50 0.49 …, W/H 1.17); `0.5467`: a broader rounded cone (widest at band 3, W/H 1.14 → 0.81); `0.58`: a splayed fan (W/H 2.0, fork 0.06).
   - `levels.1.setPoint = 20`: elev 70°, a narrow steep cone (W/H 0.65 → 0.43, fork 0.75–0.91); `90`: elev 0°, a cone with a wide level skirt (W/H 1.08, profile 1.00 0.61 0.65 …). Live for holly and it changes the skirt.
   - `dLambda = 0`: a tall spire (H 142 → 188, dom 2.2–4.2); `0.04`: a broad low cone (W/H 1.34, H 62); `0.08`, `0.12`: pancakes (H 20, 13).
   - `levels.2.setPoint = 40`: a bristling column (fork 0.55, profile widest at the top); `80`: a pagoda of level tiers; `160`: a shaggy column.
   - `aC = 40`: a taller cone with a bare base and a wandering leader at 100 (H 121 → 143, W/H 0.46, dom 1.7–3.4).
4. **Rows that do nothing:** `levels.1.branchAngle`, `levels.1.eta` (two cells lean at 100, which looks like seed noise rather than the knob), `kappa` (W/H 0.60–0.63 throughout).
5. **Grid:** `levels.0.lambda` 0.52–0.56, `dLambda` 0.01–0.04, `levels.1.setPoint` 20–62. Reason: the cone is round 2's; these three set its proportion (height and dominance from λ₀, breadth from `dLambda`, the skirt and the limb steepness from the set point) without leaving the cone, and `levels.0.lambda` is the one knob that raises dominance toward the brief's 3.
6. **Unsettled:** the 60 sheet was not seen; `levels.0.lambda` is one step from a spire on one side and a pancake on the other, so the grid's edges will be artefacts on some seeds; `dLambda` 0.04 is already a broad cone (W/H 1.34) at seed 1, so the usable span is narrow.

## Maple (seen in full at both seasons)

1. **Brief:** rounded, forking low, widest near the middle (0.45, full 0.72), W/H 0.7 ± 0.2, fork 0.35 ± 0.2, dominance 1.6 ± 0.6, limbs 45° ± 10°.
2. **Round 2 reads as:** a flat-topped vase. At 60 a V of ascending limbs from a low fork with a flat dense cap (W/H 1.05, fork 0.22, dom 1.4; profile 0.27 0.40 0.54 0.63 0.74 … widest at the top). At 100 (H 78, W/H 1.20) the same vase, broader. Top-heavy: an inverted cone, not a rounded crown.
3. **Rows that change the kind:**
   - `aC = 13.33`: a trunk and a lumpy rounded crown (fork 0.49, dom 1.65, W/H 0.76, widest at bands 3–4: 0.32 0.43 0.58 0.68 0.64 …); at 100 (W/H 0.71, fork 0.42) a tall rounded crown on a trunk. The most maple-like cell. `aC = 26.67`: a narrow column of tiers (W/H 0.35, fork 0.80); `40`: a pole (W/H 0.25). `0`: a broad fan (W/H 1.34, fork 0.04).
   - `dLambda = 0.04`: a conical ovoid (H 90, W/H 0.47, fork 0.92, widest at band 4: 0.60 0.83 0.97 0.97 1.00 …); at 100 an elongated cone (H 118). `dLambda = 0`: a pole (H 157 → 207). `0.12`: a broader flatter vase (W/H 1.32).
   - `levels.0.lambda = 0.6`: an upright ovoid with a leader (H 96, W/H 0.48, fork 0.86, dom 2.5); at 100 a narrow column (H 128, W/H 0.35). `0.5667` (round 2's step): the vase with a slightly rounder top.
   - `levels.2.setPoint = 120`: a rounded shaggy dome (profile 0.82 1.00 0.94 0.95 1.00, H 54, W/H 1.32, fork 0.79), at 100 a broad dome with a weeping fringe; `160`: a mound of hanging twigs. Rounded in outline but built as a single trunk with hanging branches, the opposite of forking low. `80`: a parasol.
   - `levels.1.lambda = 0.48`: a little rounder (fork 0.35, W/H 0.95); `0.58`: a wide V (W/H 1.46).
4. **Rows that do nothing:** `levels.1.setPoint` (elev 70° → 4°, the vase unchanged; at 90 the base bands fill slightly), `levels.1.branchAngle`, `levels.1.eta`, `kappa` (W/H 0.97–1.18, vases all).
5. **Grid:** `aC` 5–20, `dLambda` 0.04–0.08, `levels.0.lambda` 0.55–0.60. Reason: `aC` near 13 is the trunk and the rounded crown, `dLambda` between the cone at 0.04 and the vase at 0.08 is where "rounded" lies, and a stronger leader keeps the outline from going top-heavy; `aC` above 20 is a column and should stay out.
6. **Unsettled:** fork height and roundness pull against each other here (the rounded cells have fork 0.4–0.9, the brief wants 0.35), so the grid will trade one for the other; the `levels.2.setPoint` 120 dome is a weeping artefact and is noted only so it is not mistaken for a pick.

---

## The eight grids

| species | knob 1 | knob 2 | knob 3 | reason in a line | against the user's draft |
|---|---|---|---|---|---|
| beech | `aC` 15–40 | `kappa` 1.0–3.0 | `levels.1.lambda` 0.51–0.55 | lift the widest band off the base without losing the leader | disagrees: `levels.0.lambda` 0.50 is a bush, `dLambda` ≥ 0.04 a pancake |
| birch | `levels.0.lambda` 0.55–0.59 | `levels.1.lambda` 0.49–0.55 | `postureSetPoint` (level 1) 50–75 | the ovoid from λ₀, its breadth from λ₁, ascending limbs from posture | disagrees on `kappa` (lowers dominance, keeps the base widest); agrees on the rest |
| oak | `aC` 20–40 | `dLambda` 0.04–0.10 | `kappa` 0–1.5 | trunk and fork from `aC`, rounding from `dLambda`, breadth from low `kappa` | agrees; the level limbs are in `levels.1.setPoint` 90, not in these three |
| hornbeam | `aC` 10–30 | `dLambda` 0.04–0.10 | `levels.0.lambda` 0.56–0.60 | the egg is at `aC` ≈ 13; the leader returns at λ₀ 0.6 | disagrees on both ranges: `aC` 27–40 is too narrow, λ₀ 0.53–0.58 is all vase |
| willow | `levels.1.lambda` 0.48–0.52 | `levels.1.setPoint` 60–90 | `levels.2.setPoint` 54–120 | round the V, fill the base, hang the twigs | — |
| rowan | `aC` 20–40 | `dLambda` 0–0.04 | `levels.1.setPoint` 15–40 | the oval is there; make it slenderer and steeper-limbed | — |
| holly | `levels.0.lambda` 0.52–0.56 | `dLambda` 0.01–0.04 | `levels.1.setPoint` 20–62 | the cone is there; set its dominance, breadth and skirt | — |
| maple | `aC` 5–20 | `dLambda` 0.04–0.08 | `levels.0.lambda` 0.55–0.60 | the trunk and rounded crown at `aC` ≈ 13; a leader against the top-heavy vase | — |

## What this review could not settle at this resolution

- **Sheets not seen as pictures:** beech (both seasons), rowan (both), holly at 60, birch at 60 rows 1–6, hornbeam at 60 rows 4–9. Those readings rest on the profile bars and four numbers; the beech and hornbeam disagreements with the user's draft in particular should be checked against the sheet before either grid is run.
- **One seed.** Every "kind" here is seed 1's. The λ₀ transitions (willow 0.517 → 0.533, hornbeam 0.58 → 0.60, holly 0.53 → 0.57) are one sweep step wide and will move on other seeds; the grids straddle them on purpose, and a grid at three seeds would say which cells are stable.
- **`levels.2.setPoint` ≥ 80 collapses every broadleaf** into a parasol, a mound or a bristling column. That looks like a behaviour of the core (the level-2 twigs going level or pendulous take the whole crown with them) rather than a form, and is worth a note for C3–R3 after shipping; here it only says the knob's usable span is 40 to the species' own value.
- **The posture set point.** For birch it is the whole question (elev 21° in every cell); for rowan and holly the sweep's `levels.1.setPoint` already moves the limb angle, so a tenth knob is not needed there; for oak the level limbs appear only at `setPoint` 90, which argues for sweeping oak's posture too.
- **Limb elevation reads back the set point** (as the status note says) and so carries no information beyond the knob; the pictures were judged on outline, fork and dominance instead.
- **The ceiling at 100:** beech everywhere, hornbeam's `aC` 40 / `dLambda` 0–0.04 / `kappa` ≥ 1.3, willow's λ₀ ≥ 0.567, maple's and holly's `dLambda` 0 and λ₀ 0.6 all flatten against 200. Those cells were judged at 60.
- **Couplings with height the physiology fit will move:** rowan's and hornbeam's `dLambda` 0 cells are tall as well as narrow; willow's breadth (W/H 1.6) is only reached by the fan; maple's fork height against its roundness. These are the trades the pilot's panel will show.
- **Second grids, if the first fail:** beech `dLambda` 0–0.03 × `levels.1.lambda` 0.51–0.55 × `levels.0.lambda` 0.52–0.56; oak `levels.1.setPoint` 60–90 in place of `kappa` for the limbs; birch with `levels.2.setPoint` 120 as an extra cell for the droop.
