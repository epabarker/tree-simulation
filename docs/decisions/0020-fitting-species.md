# 0020: Fit species to literature traits by CMA-ES, fitting on form and holding out behaviour

- **Status:** accepted
- **Date:** 2026-10-28
- **Spec:** §9 (species character), §10 (validation targets), §11.11 (Stava et al. 2014, fitting parameters later); extends ADR 0016 (species per tree)

## Context
- **How species are made now:** each species in `flora.ts` was tuned by hand against a few patterns per species (M19, M25). The work is slow, judged partly by eye, and hard to repeat.
- **What the user asked for:** fit the parameters automatically, then check that the fitted species still behave as they do in the wild, and decide.
- **M26 made it possible:** the form metrics (`form.ts`) turn a crown's shape into numbers a fit can aim at.

## Decision
The user agreed the plan (2026-10-28):
- **Not reinforcement learning:** there is no sequential decision, so this is a black-box fit, pattern-oriented calibration (Reynolds & Ford 2005) done automatically.
- **Search:** CMA-ES (`cmaes`) over about 17 of a species' parameters within literature bounds, in a unit cube with log scales where the parameter is multiplicative.
  - Three restarts start from today's values, two from random points.
  - Every candidate in a generation sees the same seeds, drawn afresh each generation.
- **Loss:** Σ weight · ((seed-mean trait − target) / band)², plus penalties for dead trees.
  - Targets and bands live in `analysis/fit/targets/<species>.toml`, each with its source.
  - Measured targets weigh 1, described ones 0.5 (`docs/research/2026-10-28-species-traits.md`).
- **Fit on form, hold out behaviour:**
  - **Fitted:** lone and stand form: height, its curve, W/H, H/D, crown ratio, floor light, crown profile, apical control, angles, droop.
  - **Never in the loss:** shade survival (its order against Niinemets & Valladares's scores), the mixed wood's succession, the §10 allometries and the release after a felled neighbour.
  - **Free, though:** the shade parameters (Q_ss, m_f). So holding tolerance out tests whether form alone pins them where the wild puts them.
- **Machinery:**
  - Trials are defined once (`src/core/trials.ts`) and shared with the calibration tests.
  - A candidate is a set of dotted-path assignments to the species' patch.
  - A long-lived evaluator per core (`cli/fit-eval.ts`) serves the Python driver (`analysis/treesim/fit.py`).
- **Adoption is the user's:** fitted patches are reported (`docs/experiments/fits/`, with lab links) and do not change `flora.ts` or the home forest. Runs longer than about 10 minutes are handed to the user to run.

## Consequences
- **Repeatable:** a species can be re-fitted, or a new one fitted, from a targets file.
- **Unconstrained parameters show:** where the restarts disagree, or a fit sits at a bound, the parameter is under-determined or the model can't reach the target. That is a finding about the model, not something to fix by tightening bounds.
- **Target quality matters most.** Several shape targets are descriptions, and a fit is only as good as its weakest target. Measured crown profiles (laser scans) would be worth more than more compute.
- **Revisit** if the hold-out checks fail systematically: then a metric or a rule is wrong, not the parameters.

## Addendum (2026-10-28): all ten species
- **The user extended the fit** from the pilot (birch, beech) to all ten species, before the pilot fits ran. Targets for the other eight follow the same conventions (`docs/research/2026-10-28-species-traits.md`).
- **A "quick" budget** (`FitSettings.budget("quick")`): one warm and one random restart, 50 generations, 4 seeds. It costs about a sixth of the full budget, for a first look at every species.
- **The hold-out covers every fitted species:**
  - the Spearman correlation of survival light with the tolerance scores, over all ten;
  - the mixed wood with every fitted woodland patch at once;
  - fir and pine in their own woods, since the mixed wood leaves them out.

## Addendum (2026-10-28): shade survival and late growth enter the fit
- **What round 1 showed** ([note](../experiments/2026-10-28-m27-fits.md)): fitting on form alone let shade tolerance drift (Spearman ρ −0.98 → −0.90; holly lost most of its tolerance). It also left height after season 60 unchecked: fitted pine and fir grew to the world's top by season 150.
- **Survival light is fitted** for the four species with measured sapling minimum light (Hagemeier & Leuschner 2019):
  - birch, oak, beech and hornbeam;
  - the trait is `shade.survivalLight`, at full weight; the shade house runs in their fits.
  - The hold-out keeps the other six's survival bands and the Spearman order over all ten. That test is weaker than before, since four of its ten points are now fitted.
- **Late growth is fitted:** the stand runs on to season 100 for every species, and `stand.lateShare` (mean height at 100 over that at 60) is a target, from yield tables where they exist.
- **The juvenile height h_j** (ADR 0022) is free for every species, on 2–150 cells (log).
- **Unchanged:** the mixed wood, allometry, release and the lab woods stay held out.

