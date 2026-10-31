# Species round 4: revise the targets, then re-fit (the 3D port's track 3, continued)

Written 2026-10-31 on `3d-port` bfb312d (PR #31 and #32 merged), from the [targets audit](../reviews/2026-10-31-species-target-audit.md) and the implementer's [hand-off](../reviews/2026-10-31-species-handoff.md), with the user's decisions in a planning session. Supersedes steps 3–5 of the [species plan](2026-10-30-species.md); its §0–2 still describe the harness.

## Context

Track 3 of the 3D port (review of 2026-11-01 §5) re-fits the garden's species on the 3D core. Steps 0–2 ran (PR #31, #32, merged into `3d-port`): all eight garden species have round-3 fits, five "accepted" by the rule (every measured target in band on fresh seeds). The user stopped step 3 (the hold-out) after its floor section and had the targets audited. The [audit](../reviews/2026-10-31-species-target-audit.md) and the implementer's [hand-off](../reviews/2026-10-31-species-handoff.md) agree on the diagnosis, and the user has taken four decisions (2026-10-31, this session):

1. **The rest of round 3's hold-out runs now** on the laptop, in parallel with the targets work. It answers whether R1's hydraulic discount (ADR 0021) changes before the next re-fit (oak and hornbeam's late share runs high; the stop rule is a late-successional species reaching the top in the 400-season mixed wood).
2. **Data routes A + B + a stand LAI target.** Line-up panels per species; per-species H/D, W/H and crown ratio re-sourced from the open-grown and stand allometry literature; leaf area index from Hagemeier & Leuschner 2019 as a measured target read in the closed stand. Routes C (QSMs from laser scans) and D (traced photographs) are deferred to after shipping and recorded as gaps.
3. **A profile target and η ≤ 1.0 for broadleaves.** `lone.widestAt` and `lone.crownFullness` become one 10-band width-profile trait; first-order `r2.levels.1.eta`'s top drops from 1.5 to 1.0 for the eight broadleaves (fir and pine keep 1.5–2). The bound change is an ADR decision (AGENTS.md: bounds come from the literature review).
4. **Beech's acceptance is withdrawn.** Round 3's lone beech is tiered and pointed (η 1.18, `r2.aC` at its floor): a young conifer, not a dome. Beech re-fits in round 4 with the others.

Findings that shape the plan (from the two documents and this session's reading):
- `lone.slenderness` 48 ± 8 and `stand.slenderness` 70 ± 10 are the same for all ten species. Birch stands run H/D 80–110, so birch "failed" and was "fixed" against the wrong number.
- The own-wood floors are 7–20% for every species (targets 1.3–15%), round 2 and round 3 alike: nothing the fit sees constrains leaf area. Hagemeier & Leuschner's LAI (birch 4.6, oak 5.5, hornbeam 8.3, beech 8.4) with their K_PAR reproduces their measured floors (exp(−K·LAI): 18, 7, 1.5, 1.4%), so **stand LAI is the measured quantity behind the floor**, and the closed stand (≈ 6 s to 100) can report it at no extra trial cost. The floor stays a hold-out.
- Birch's survival-light miss (0.156 against 0.16–0.26) is a harness artefact: its seedlings die at season 4 under every roof ≤ 15.8% and live under ≥ 21.7%, so the true cut lies in (0.158, 0.217], which contains the target 0.21. Two roofs in that gap resolve it.
- `stand.crownRatio` reads the leaf base (5% of leaf area), while the sources mean the lowest live primary limb of the main crown. Beech's 0.315 against 0.55 is partly definition.
- The closed stand's spacing 21 ≈ 5.25 m is ≈ 360 stems/ha, sparser than a yield-table stand at 60. Not changed (the 20-seed H/D evidence was read at 21); noted beside the fits.

Outcome: a targets file per species that is measured wherever the literature allows, a profile the fit cannot satisfy with tiers, a leaf-area constraint that makes the floors a consequence rather than a hope, and round 4 fitted against them. The 3D port's path (I3 alongside; C3–C6 after shipping; then release) is unchanged; only track 3's steps are revised.

## Branch and housekeeping

- Work on a branch off `3d-port` (this plan, the audit and the hand-off were pushed on `claude/c1-calibration-ustbkz`, restarted from `3d-port` bfb312d; continue there or branch from it), PR into `3d-port`.
- Goldens do not change in this plan: no preset, params default, or species patch moves until adoption (a later step).

## Steps

### Step A: the hold-out runs on the laptop now (the user; nothing to build but one flag)
- Add `--skip floor` to `analysis/experiments/m27_holdout.py` (the floors already ran and are in the note; the rest printed nothing). The user runs: `uv run --project analysis python analysis/experiments/m27_holdout.py --round round3 --skip floor --workers 12 --origin http://<lan-ip>:<port>/` with `~/.cargo/bin` on PATH.
- Its result goes into the species note (`docs/experiments/2026-10-30-species-3d.md`, "Step 3b") as the sections print: shade order (Spearman), allometry, release, the six 400-season mixed woods with the tallest tree per species against the top.
- **Stop rule (the plan's, unchanged):** oak, hornbeam or beech at ≥ 190 in the mixed wood → R1's discount is the question (ADR 0021, the user's) before round 4 runs. Otherwise round 4 runs on the model as it stands.

### Step B: the harness (this session, on the branch; `npm run check` after each)
1. **Stand LAI.** `rust/wasm/src/lib.rs`: a `lai(x0, x1)` export beside `ground_light`, the mean over ground cells of Σ_y `lad` (as `rust/cli/src/main.rs:313` computes it for `ground.csv`); `src/wasm/world.ts` `RustWorld.lai`; `cli/trials.ts` `StandTraits.lai` at 60 (and `lai100` when run on). `cli/fit-eval.ts` passes it through unchanged (it serialises the trait record).
2. **The limb crown base.** `rust/core/src/metrics.rs`: `limbBase`, the base height of the lowest live first-order limb carrying ≥ 5% of the tree's live leaf area (the same 5% as `leaf_base`), and `limbCrownRatio`; a unit test beside `the_leaf_base_ignores_one_low_twig_that_sets_the_bole`. `StandTraits` reports `crownRatio` as the limb measure, `leafCrownRatio` and `boleCrownRatio` beside it. Metrics columns are not hashed (form step 2 added two without a golden change): check with `npm run bench -- --compare`.
3. **The profile trait kind.** `analysis/treesim/fit.py`: a `[[trait]]` may have `profile = [t0 … t9]` and `band` (one number) instead of `target`; `seed_traits` flattens `lone.profile` from `formOf(...).profile` (already returned by `runLone` once `LoneTraits` carries it: add `profile: number[]`); `loss` and `fit_lm.py`'s `Problem.residuals` add one residual per band, √(w/10)·(p_k − t_k)/band, so the vector weighs as one trait; `in_band` and `margins` treat the vector as in band when every band is (report the worst band's margin). `widestAt` and `crownFullness` stay reported, not fitted.
4. **The shade house.** `cli/trials.ts` `ROOFS` gains 1.2 and 1.75 (lights to be measured with `docs/experiments/code/2026-10-30-species-3d/roofs.ts`, expected ≈ 26% and ≈ 19%); the comment's light list updated. Check the season-4 death hypothesis in passing: run one fitted birch under roof 2 and print `reserve`/`starved` per season (a scratch script under `code/`); one sentence in the note.
5. **The re-score.** `analysis/experiments/m27_rescore.py --round round3`: each species' fitted assignments (and its round-2 start) evaluated through `fit-eval` at the 6 fresh seeds against the **revised** targets, no search; writes `fits/round3/<sp>-rescore.json` and prints the margins table. Reuses `fit_lm.py`'s `margins`, `in_band` and the `Pool`.
6. **The panels.** Generalise `code/2026-10-30-species-3d/lone-links.ts` and `lone-figure.py` into `panel-links.ts` and `panel-figure.py`: per species, the lone tree at 60 and 100 and the closed stand's middle row at 100, round 2 beside round 3, one scale, traits under each; one PNG per species in `docs/experiments/figures/2026-10-31-species-panel-<sp>.png`. The screenshots are headless Firefox against `npm run dev` on this VM (the lab's `?bench&seasons=N` plate, as before). Reference photographs are linked, not stored (the audit's route A).
7. **The hold-out's `--skip`** (step A's flag) if not already pushed first.

### Step C: the targets (this session; web research, then the files)
Per species, in `analysis/fit/targets/<sp>.toml` and a new section of `docs/research/2026-10-28-species-traits.md` ("Round 4: re-sourced for 3D"), each number with its source:
1. **H/D per species.** `stand.slenderness` from species-specific stand allometry (Pretzsch 2019 *Forests* 10:810 h–d; the NW-FVA and Lockow yield tables' H100 and d100 where the table gives both; birch from a Nordic/Baltic source, e.g. Hynynen et al. 2010 or Niemistö). `lone.slenderness` from open-grown allometry (Hasenauer 1997 as reproduced; Pretzsch et al. 2015 *UFUG* 14:466). Where no species number is found the generic one stays, marked `kind = "described"` and half weight, so acceptance no longer rests on it.
2. **W/H per species** (`lone.spread`) from Pretzsch 2015's crown radius–diameter and height–diameter relations at a mature diameter; measured where the species is among the 22.
3. **Crown ratio** (`stand.crownRatio`, now the limb measure) from Schmucker 2022 (hornbeam, field maple, oak, beech), Dieler 2013 and Pretzsch 2015 where they report crown length; the rest stay described.
4. **LAI** (`stand.lai`): measured for birch 4.6, oak 5.5, hornbeam 8.3, beech 8.4, band ±1.5 (Hagemeier & Leuschner 2019, weight 1); described at half weight for maple and willow if route B's reading finds a stand LAI; none for rowan and holly (their floors stay hold-outs only).
5. **The profile** (`lone.profile`): a 10-band vector from a two-parameter crown shape (centre c = the current described `widestAt`, fullness p = the current `crownFullness`, sampled at band centres), adjusted to Franceschi 2022's shape class where the species is covered (field maple, sycamore as maple's proxy); band 0.1 per band; weight 0.5, `kind = "described"`. Fir and pine: a cone. Replaces `lone.widestAt` and `lone.crownFullness`.
6. **η's top 1.0** for the eight broadleaves' `r2.levels.1.eta`; fir and pine unchanged.
7. **Comments** on `stand.height` and the two shares stating the scale (±20%) and lone-against-stand assumptions (the audit's §1.4), and the stand density caveat on the stand traits.
8. The `[holdout]` floors unchanged; `survivalLight` unchanged.

Then run the re-score (step B.5) at the round-3 points against the revised files and put the table in the note: it says which species move out of band under the new targets before any compute is spent.

### Step D: the decision record and the docs (this session)
- **ADR (next free number) "Species targets for 3D":** the profile trait kind; LAI as a measured target with the floor held out; per-species H/D and W/H; the limb crown base as the stand's crown-ratio measure; η ≤ 1.0 for broadleaves (an amendment to ADR 0020's bounds, with the reason: the box let the fit buy width with tiers, and the panel showed it); the acceptance rule extended: measured targets in band on fresh seeds **and** the species read as itself on the line-up panel (the user's eye). Routes C and D recorded as the way to make the lone-shape targets measured later.
- `docs/plans/2026-10-30-species.md`: a §5 "Round 4 (2026-10-31)" with the decisions and the revised steps 3–5 (below), pointing at the audit.
- STATUS (≤ 40 lines), devlog entry, ROADMAP's species lines, the species note's new sections. `/wrap-up` at the end.

### Step E: round 4 (the laptop, overnight; the user)
- After step A's verdict (and any R1 decision), `m27_fit.py --method lm --start round2 --species garden --out round4 --workers 12`, every species including beech, from round 2's start shifted by round 3's mean shift where that lowers the loss (the driver does this already). ≈ 10–12 h.
- Verification as now, plus the panel for every species (step B.6 against `round4`).
- Then the hold-out on round 4 (`--round round4`), hand overrides if any (ADR 0023's form), and adoption as its own ADR, the goldens updated with the reason in the devlog, the mixed wood judged on the phone. Fir and pine after shipping.

## Files

- `rust/wasm/src/lib.rs`, `src/wasm/world.ts`: `lai`.
- `rust/core/src/metrics.rs`: `limbBase`, `limbCrownRatio` (+ test).
- `cli/trials.ts`, `cli/fit-eval.ts`: `profile`, `lai`, the crown-ratio columns, `ROOFS`.
- `analysis/treesim/fit.py`, `analysis/treesim/fit_lm.py`: the profile trait kind; `in_band`/`margins` on vectors.
- `analysis/experiments/m27_rescore.py` (new), `m27_holdout.py` (`--skip`).
- `analysis/fit/targets/*.toml` (all ten; fir and pine get the profile and comments only).
- `docs/research/2026-10-28-species-traits.md` (new section), `docs/reviews/2026-10-31-species-target-audit.md` (new), `docs/decisions/00NN-species-targets-3d.md` (new), `docs/plans/2026-10-30-species.md` (§5), `docs/experiments/2026-10-30-species-3d.md`, `docs/experiments/code/2026-10-30-species-3d/{panel-links.ts,panel-figure.py}`, STATUS, devlog, ROADMAP.

## Verification

- `npm run check` green after each harness step; `npm run bench -- --compare` shows no hash change.
- `rust` unit tests: the limb base on a hand-built tree (a low twig does not set it; a 5% limb does); `lai` of a one-leaf column equals its deposit area.
- `m27_fit.py --species beech --smoke --method lm` runs end to end with the profile trait and LAI in the residual vector (seconds).
- The re-score table for all eight at round 3's points against the revised targets, in the note, with the worst-band margins.
- The roofs' lights re-measured and listed in `trials.ts`'s comment; birch's fitted seedling under the new roofs gives a survival light inside (0.158, 0.217).
- One panel PNG per species opens and shows the lone tree and the stand at one scale with traits under each; the user judges beech, oak and hornbeam on it.
- The hold-out's `--skip floor` runs the smoke (`--smoke --skip floor`) without the floor section.
