# 0051: Crowns interpenetrate because nothing removes a lit limb inside a neighbour's crown; rule on CR's reading

- **Status:** accepted as a realism probe only (the user, 2026-11-04). See the user's rulings below.
- **Spec:** §O2 (abrasion, crown shyness), §C2 (light), §C5 (shedding), §R4–R6 (bud fates). ADR 0013 (O2 off), 0024 (the
  slab), 0049 (the principle line), 0050 (Level 0; ruling 2, CR's definition, open).
- **Evidence:** [the findings note](../experiments/2026-11-04-crown-competition.md). Scripts: `analysis/experiments/crown_*.{ts,py}`.

## Context
- **The gate's verdict.** After night 1 on v2, oak fails Level 0 on crown radius at every seed at 60: the fit's CR is
  4.9 m at DBH 21 cm, against Tallo's median 2.3 m at 20 cm. Beech sits at z_CR ≈ +0.7. Birch is too wide at 60.
- **The stand.** Trees stand 5.25–5.6 m apart (357 stems/ha).
- **The hypothesis tested:** lateral growth into a neighbour's crown is not penalised by the light rules, so crowns
  overlap, and the fit compensates through qMin.
- **Two premises corrected:**
  - 6.5–7.2 m is the shipped oak; the fit is 4.5–4.9 m.
  - qMin is at its bound only for birch.

## Evidence, by step
1. **Overlap** (3 species, hand and fit, seeds 1–5, seasons 60/100/150).
   - 24–42% of live-bud tips lie nearer a neighbour's stem than their own. The tips that set CR are on a neighbour's
     side in 84–100% of directions.
   - **The gate's CR is the Voronoi ceiling plus the reach past the midpoint.** The ceiling is ≈ 2.8 m, half the
     spacing, in every oak and birch case; for oak fit at 60, 4.92 = 2.83 + 2.1 m.
   - A crown stopping at the midpoint would score z ≈ +0.46, inside T 1.04. **Oak's whole binding term is the reach
     past the midpoint.**
   - **The extreme tips:**
     - at 60, they are young encroaching wood (65–80% under 10 years);
     - by 150, old limbs (oak fit: median 37 years) kept as leafy short shoots (72–82%);
     - nothing laid down before canopy closure.
   - **Where they sit:** inside the neighbour's foliage, not above it (oak and birch: 35–90% within).
   - **Their light** is the same as own-side tips' at the same height (q ratio 0.96–1.16). Leafy-only CR equals the
     gate's CR within 0.25 m.
2. **The code.** Nothing makes growing into an occupied crown worse than growing into open space at equal light:
   - Light is ownerless (`season.rs:246–262`), and so is Borchert–Honda (`c3.rs:53–61`).
   - A bud that does not grow rests and never dies of light (`r6.rs:39–45`).
   - Dormant death is age-only (`r4.rs:38–40`).
   - Shedding reads Q_b/n_b against T_rel·Q_top, or a carbon deficit (`c5.rs:46–83`), so a lit limb is never shed.
   - The one owner-aware rule that is on, R5's neighbour signal (`r5.rs:50`, `season.rs:264–280`), *lengthens* and
     steepens shoots under another tree's foliage (`season.rs:502`).
   - The spec's owner-aware loss process, §O2 abrasion (`o2.rs:79–124`), is **off**. ADR 0013 switched it off because
     in 2D light alone kept crowns apart (≈ 3% of canopy rows touching). In 3D the median reach exceeds half the
     spacing in every species and set.
3. **Rivals.**
   - **Light resolution** (K 32, sky p 0.5): excluded.
   - **Mortality:** excluded for oak and birch (no deaths); partial for beech (4–6.6 of 12 dead by 150; neighbours of
     the dead reach further).
   - **The slab:** excluded for oak (six rows and open faces both leave z_CR ≥ +1.6 at 60); not excluded for beech
     (six rows: z_CR +0.39 / +0.23 / +0.34).
   - **Spacing:** sets the ceiling, not the reach past it. Tallo records no stand density.
   - **qMin:** the premise is refuted. Past the bound, LAI collapses, trees die, survivors spread into the gaps, and
     beech's CR *rises*.
4. **Spread** (beech, seeds 1–20): no association detected between CR at 60 and height rank at 150 (ρ +0.12 hand,
   −0.12 fit). Height at 60 predicts height at 150.
5. **Levers** (oak and beech, hand and fit, seeds 1–5). No probed lever brings oak fit's z_CR at 60 under T without
   collapsing the canopy:
   - **T_rel ×10:** +1.24 at LAI 3.3 (from 5.2), with z_H at 150 up to +1.42. It bounds CR by losing crown.
   - **qMin 0.3 / 0.5:** LAI 2.8 / 1.6, the shade house fails, deaths.
   - **e_s and L_dorm:** flat.
   - **O2 at ADR 0013's settings (p_abr 0.5), oak fit:**
     - CR at 60 does not move: 4.84 against 4.85 m, down in 2 of 5 seeds, z_CR at 60 +1.93.
     - It separates crowns: foreign tips at 60 32 → 20%, down in 5 of 5 seeds.
     - z_H rises in 4 of 5 seeds at 100 and at 150 (+0.1 to +0.45): a possible height cost, suggestive on 5 seeds.
   - **O2 at p_abr 1, beyond ADR 0013:**
     - Oak fit's CR at 60 is 4.39 m and its foreign tips 16%.
     - z_H at 100 rises in 5 of 5 seeds.
     - Choosing p_abr 1 for its effect on CR would be fitting it to CR.
   - **Hand oak at 0.5:** CR at 60 falls in 5 of 5 seeds (−0.23 to −0.54 m, 6.65 → 6.27).
   - **Beech:** the O2 effects are within seed noise.
   - **Why every lever falls short:** the gate reads a maximum over ~2,000 tips, so it moves only when the last
     intruding tip goes. For oak fit, the 95th percentile of reach scores z +1.08 / +0.59 / +0.77 against the max's
     +1.76 / +1.11 / +1.25.
   - **Untested:** R3's bending of long horizontal limbs.

## The surviving mechanism
- **Light alone does not keep 3D crowns apart.** Ownerless light is correct physics: in a real stand, light at a point
  does not depend on whose foliage shades it.
- **What the stand lacks is a loss process for a lit limb inside another tree's crown.** The spec has one (§O2), and
  it is off.
- **What the gate amplifies.** It reads the single furthest tip, and that tip lives in the tail which any bulk loss
  process reaches last.

## Options
**A. Rule on CR's reading first; no core change now (recommended).**
- **The ruling:** put ADR 0050's ruling 2 to the user with this evidence.
  - The gate's CR is the extreme reach of any live bud: in a closed stand, the ceiling plus the deepest intrusion.
  - Tallo's CR is mostly from 2–8 orthogonal field radii or a crown projection area (Jucker et al. 2022, §2.1); how
    overlap was handled is not documented.
  - Readings to choose from (reported here, none proposed): the max, the 95th percentile of reach, leafy-only.
- **Meanwhile:**
  - No code, goldens or params change.
  - Oak's Level 0 waits on the ruling. Beech and birch go on as planned.
  - Nights 2–3 are unaffected unless the ruling changes the measurement. If it does, the registered targets stay, and
    the measurement in `cli/allometry.ts` changes, with its parity test.
- **Cost:** oak stays failed until the ruling. If the ruling keeps the max, no probed lever passes oak: neither B
  nor the parameter-only alternative. Only an undemonstrated C remains.

**B. O2 on in the woods, at ADR 0013's settings (a preset and trial setting, not a rule change).**
- **What it is:** §O2 exists and is tested (`o2.rs`). Its switch is world-level (`season.rs:382`), so it is set in
  `cli/trials.ts` (`standParams`, and `woodParams` for the floor) and in the wood presets (`src/core/presets.ts`:
  `forest`, `mixedWood`, `beechWood`, `oakOpen`).
- **Parameters:** k_sway 0.0005, p_abr 0.5, max sway 3, from ADR 0013. Never fitted to Tallo CR: fitted, p_abr would be
  a knob added to serve a fit (ADR 0049 §b).
- **Within the line:** O2 reads the owner grid, which is built from foliage deposits. That is a bud reading its local
  foliage, as R5 already does.
- **Out of the line:** anything reading stem positions or Voronoi cells (an envelope).
- **Downstream:**
  - The goldens `oakOpen`, `forest`, `mixedWood` and `beechWood` change (`npm run golden:update` with a devlog reason).
  - `tests/trials.test.ts` needs checking.
  - Level 0 nights 1–3 re-run (≈ 8.6 h a night).
  - Phases 1d-ii and 3 wait on the new fits.
  - The garden's look changes: crowns stand slightly apart. The user judges it on the phone.
- **Expected gain:** crown separation, not the gate.
  - Oak fit's foreign tips at 60 fall 32 → 20% (5 of 5 seeds).
  - Its CR at 60 does not move (4.84 against 4.85 m). Hand oak's falls ≈ 6%.
  - **Possible cost:** oak fit's z_H at 100 and 150 rises in 4 of 5 seeds. Measure it on 20 seeds before any adoption.
- **Not a Level 0 fix.** Its case is realism and the spec's own design.

**C. A rule change to O2 (a candidate for its own probe session, not adopted here).**
- **What it would do:** let abrasion reach the tail. Its sway (`o2.rs:69–71`) depends on Q·h/r and reaches only the
  nearest cells, and it skips dormant buds (`o2.rs:84`).
- **Candidates:** a sway from limb length or lever arm, or abrasion of dormant buds on limbs in another tree's foliage.
- **Files:** `rust/core/src/principles/o2.rs` (`sway_of`, `abrade`), `rust/core/src/params.rs` and
  `src/core/params.ts` (any new O2 field), O2's unit tests, `rust/presets.json` (`node cli/export-presets.ts`).
- **Downstream:** every golden with O2 on changes; with B, the four woods. Level 0 re-runs; 1d-ii and phase 3 wait.
- **Line:** inside ADR 0049's line only if its parameters come from the abrasion literature (sway amplitude against
  limb length), never from CR.
- **Not demonstrated:** nothing here shows it would move the maximum. It needs its own probe, and it needs the user's
  approval as a spec change (§O2.4).

**The parameter-only alternative: add c5.Trel (or r6.qMin past its bound) to `[level0] knobs`.**
- Files: `analysis/fit/targets/*.toml` only. No goldens change.
- It bounds CR by losing crown (oak fit LAI 5.2 → 3.3, z_H up) or by killing trees (qMin).
- It does not separate crowns.
- It is a knob added because a fit asks for it: the wrong side of ADR 0049's line.

## Recommendation
**A.**
- **Why:** oak's whole binding term is the reach past the midpoint, read by a maximum, and no probed lever moves that
  maximum without collapsing the canopy. So the reading decides whether oak can pass Level 0 at all under the current
  rules.
- **If the ruling keeps the maximum:** no probed lever passes oak. The honest outcome is that oak fails Level 0 on a
  measurement the model cannot meet, recorded as such, until a C is demonstrated.
- **B is offered separately, on realism alone.**
  - For: it is the spec's own rule, local and unfitted, and its premise for being off (ADR 0013, 2D) no longer holds in
    3D. It separates crowns (oak fit's foreign tips −39%).
  - Against: it does not move oak's gate term, it may cost height, and it changes four goldens and every Level 0 fit.
  - So it is worth a 20-seed probe, never adoption on this evidence.
- **C** waits for a demonstrated case.

## Consequences (if A is accepted)
- No code, goldens or params change. The user rules on CR's reading (ADR 0050, ruling 2).
- Beech's slab effect (six rows) is recorded as a rival not excluded. It is a question for phase 3's stand, not a
  change now.
- Open:
  - shipped birch's tip past its own image at 150 (hand only);
  - R3's limb bending, untested as a bound on reach;
  - beech fit reaches further in +x than in −x (mean 1.7 m at the same tree; the sky is untilted, `c2.skyTilt` 0).

## The user's rulings (2026-11-04)
1. **CR's reading:** the gate keeps the maximum reach. Voronoi-clipped and p95 CR are reported beside it, never gated.
   The missing piece is a loss process for unproductive limbs (self-pruning), not the reading.
2. **This ADR is accepted as a realism probe only.**
   - O2 at ADR 0013's settings, on 20 seeds, decoupled from the gate.
   - Its parameters are never fitted to Tallo CR.
   - It is not the fix.
3. **Before any limb-loss ADR:** audit the provenance of the LAI and shade-house targets and their bands, as lateShare
   was audited. Described numbers become reported; measured ones stay scored, with their source recorded. Read-only,
   one commit.
4. **Then ADR 0052's probe session:** a limb-loss / self-pruning rule under sustained low light or a negative limb
   carbon balance.
   - Judged against Weiser's field crown base/H, its measured target.
   - z_CR, LAI and height reported, not targeted.
   - ADR 0050's option C (the trunk) follows it.
5. **Beech's +x/−x asymmetry** is a suspected bug (open fixes): mirror the seeds and check whether it flips.
