# Species round 5: form by hand, physiology by fit

Written 2026-10-31 on `3d-port` f9deeae (PR #33 merged), after round 4's birch panel. Supersedes step E of the [round-4 plan](2026-10-31-species-round4.md); its steps B–D stand (the harness, the targets' sources, ADR 0028). Decided with the user in a planning session; the decision is recorded as ADR 0029.

## 0. Why

Round 3's beech met every measured target as a tiered cone (η 1.18). Round 4's birch met all five of its measured targets as a tiered cone at 60 and a flat-topped pagoda at 100 (`r2.levels.1.setPoint` 83°, κ 1.86). Both are the same move: the loss reads a few shape numbers from field-guide prose at half weight, and the search has eight architectural knobs it can move along any direction the loss does not read. Each round added the observable that would have caught the last failure. The audit of the loss as the search sees it (the species note, "Round 5") lists the cheap route for every observable, and the free directions remaining after any two more observables.

**The decision:** stop fitting architecture. The described shape targets were a proxy for the form parameters; set those directly, by botany and the eye, and fit only the physiology against the measured targets. Shape is reported beside every fit, never scored, until a shape target is measured (routes C and D, after shipping).

## 1. The split

| | parameters | how set |
|---|---|---|
| **Form** (held) | `r2.levels.0.lambda`, `r2.levels.1.lambda`, `r2.levels.1.setPoint`, `r2.levels.1.branchAngle`, `r2.levels.1.eta`, `r2.levels.2.setPoint`, `r2.aC`, `r2.dLambda`, `r2.kappa` | by hand, from the form sheet (§3.2), as `[form]` assignments in the targets file, applied like `[fixed]` |
| **Physiology** (fitted) | `c3.alpha`, `c5.Trel`, `c6.r0` (m_w derived), `r1.Lh`, `r1.mf`, `r3.c`, `r6.qMin`, `r6.leafArea`, `r2.hJ` | the LM + CMA-ES search as built, 9 knobs |

**In the loss** (size, growth, girth, leaf area, light; measured or described, since none of these can be met by a wrong architecture once form is held): `stand.height`, `lone.earlyShare`, `stand.lateShare`, `lone.slenderness`, `stand.slenderness`, `stand.lai`, `stand.crownRatio` (the limb measure; T_rel's), `shade.survivalLight`. Weights and kinds as ADR 0028 left them.

**Reported, never scored:** `lone.profile`, `lone.spread`, `lone.widestAt`, `lone.crownFullness`, `lone.forkHeight`, `lone.leaderDominance`, `lone.branchAngle`, `lone.limbDroop`, and new `lone.limbElevation` (§3.1); each at 60 and 100; the stand's crown ratio at 100 beside 60. They move to a `[[report]]` list in the targets file, keeping their described values as the reference the sheet and the panel are judged against.

The Tikhonov term stays on the nine physiology knobs. Bounds unchanged.

## 2. What could still go wrong, and what catches it

| route | catch |
|---|---|
| `r6.leafArea` meets LAI with big leaves on a sparse skeleton; the picture draws leaves at true scale, so it diverges from the light model | report leafy buds per crown volume beside LAI; the panel |
| `r3.c` meets H/D with stress wood at thin r0 | report the trunk's pipe radius beside its total (pilot 1 saw this); the gallery check |
| T_rel kept low to hold the stand's crown ratio at 60, stripped by 100 | the crown ratio at 100 is reported; the panel shows the stand at 100 |
| the physiology knobs change the shape the eye set (α, λ are shape knobs too; λ is held, α is not) | the gallery check (§3.3): a fit whose shape observables land nearer a reject than the hand form is flagged; the panel after LM (§3.4) |
| the hand form is wrong for 3D (κ and η low recurred; "a finding about 3D crowns") | the sheet is run on the 3D core; what the eye picks is what 3D does |

## 3. Steps

### 3.1 Stop round 4; the elevation observable (the agent)
- Stop the round-4 run. Keep birch's result in `fits/round4/` as the gallery's specimen; the species note's "Round 4" section records the panel's verdict and why the round stopped.
- `form.rs`: `limbElevation`, the length-weighted median elevation of the first-order limbs' segments (not a base-to-tip chord: a limb that rises then arches flat reads as ascending by its chord). A unit test on a hand-built limb (a level limb 0°, a 45° limb 45°, a limb that rises at 60° then runs level reads between). `FORM_COLUMNS` 11 → 12; `LoneTraits` carries it; no golden moves.
- `runLone` reads at 100 as well as 60: the profile, spread, elevation and the rest of the reported set as `…100`; `runStand` reports `crownRatio100`. Time the lone trial to 100 (expected ≈ 2× 60's); the fit still scores nothing at 100.

### 3.2 The form sheet (the agent builds; the user judges)
- `docs/experiments/code/2026-10-31-species-round5/form-sheet.py`: for one species, a grid over `r2.levels.1.setPoint` × `r2.levels.1.eta` × `r2.kappa` (4 × 4 × 3; the other form knobs at the hand value; physiology at round 2's), a lone tree per cell at seed 1, native `treesim --preset oakOpen --species-patch … --seasons 100` with snapshots at 60 and 100, drawn from `metamers.csv` as a frontal skeleton with leaf points (matplotlib, no browser), the profile, elevation, spread, fork and dominance under each cell. One PNG per species per grid, two pages (60 and 100). A lone tree is ≈ 9 s to 60; a 48-cell grid is minutes on 12 workers.
- The starting hand values are round 2's adopted form (`FLORA`), with the species' §9 silhouette and the traits note's descriptions as the brief: birch narrow, ascending, fine and drooping at the tips; beech a dome of spreading limbs; oak broad with heavy near-level limbs; hornbeam a dense egg; willow broad and low; rowan slender and steep; holly a dense cone; maple rounded.
- The user picks a cell per species (or asks for a second grid on the other knobs: a_C, dλ, branch angle, the level-2 set point). The picks go into each targets file's `[form]` with a dated comment. The lab panel (`panel-links.ts`, round `form`) shows the chosen form at the lab's own scale before anything is fitted.

### 3.3 The gallery and its check (the agent)
- `analysis/fit/gallery/<species>-<name>.json`: patches the panel rejected, with the verdict and the date: round 2's spindles (as adopted), round 3's beech cone, oak and hornbeam parasols, round 4's birch pagoda. Add every future reject.
- `m27_gallery.py`: evaluates the gallery, the hand form and a given fit on the lone trial (seeds 1001–1003) and prints the reported shape observables side by side, with each fit's nearest gallery entry in standardised observable space. The fit driver runs it on the LM point and on the final point and prints the nearest entry: a fit nearer a reject than the hand form is flagged in the results file (`"shapeFlag"`), never accepted silently.
- Before round 5 starts, the check must show the hand form separated from every reject on the observables; if two coincide, the observables cannot see the difference and the panel decides.

### 3.4 The driver (the agent)
- `fit.py`: `[form]` applied to every candidate like `[fixed]`; `[[report]]` traits evaluated and written, not scored; `m27_rescore.py` and `margins` show them under a "reported" heading.
- `fit_lm.py`: at every accepted step, log the physiology knobs and the reported shape at 60 and 100 beside the hand form's, so drift shows at iteration 2.
- `m27_fit.py --pilot`: one species to the end of LM, then its panel (the round-4 pipeline), then stop. The overnight runs only after the user has judged the pilot's panel.

### 3.5 Round 5 (the laptop)
1. Sheets for the eight; the user's picks into `[form]`.
2. The gallery check passes for every species.
3. **Pilot:** beech, `--pilot` (≈ 25 min), panel, the user judges.
4. **The eight:** `m27_fit.py --method lm --start round2 --species garden --out round5 --workers 12`, overnight (≈ 6–8 h: nine knobs, no shade-only species change). Panels for all eight; the gallery check on each.
5. The hold-out on round 5; hand overrides (ADR 0023); adoption as its own ADR; goldens updated with the reason; the mixed wood on the phone. As the round-4 plan's step E.

## 4. ADR 0029 (the agent drafts; the user accepts)
"Form by hand, physiology by fit": amends ADR 0020 (what is fitted) and ADR 0028 (the profile trait leaves the loss, stays reported). Context: rounds 3 and 4's tiers. Decision: the split in §1; shape reported, not scored, until measured; the form sheet as the record of each hand value; the gallery as the regression set; the pilot-and-panel before any overnight. Consequences: fewer evaluations per round; the described shape targets stop being targets and become the brief the sheet is judged against; routes C and D are the way shape becomes fitted again.
