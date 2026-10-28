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
