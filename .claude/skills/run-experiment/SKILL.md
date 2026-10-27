---
name: run-experiment
description: Run a parameter sweep, ablation or validation analysis for the tree simulation (spec §8, §10). Runs the headless CLI in parallel from Python, analyses with polars and plotnine, and writes a reproducible note in docs/experiments/. Use when asked to compare settings, sweep a parameter, or check a validation target.
---

# Run an experiment

1. **Question.** State it in one sentence and name the spec section it tests (§8 ablation or sweep, §10 target). Write down the expected outcome before running anything.
2. **Design.**
   - Choose the preset and a params patch per condition.
   - Use at least 5 seeds per condition; trees are chaotic, so never conclude from one seed.
   - Choose the number of seasons and the snapshot seasons.
   - Keep the total cost small: check one run's time from `run.json` `meta.ms` first.
   - For calibration, judge on several patterns at once (e.g. H/D, crown base, crown width, ground light, stalled seedlings, Δ), not one target (pattern-oriented modelling, Reynolds & Ford 2005). Take targets from the ROADMAP calibration table.
3. **Run.**
   - Put the conditions in a script under `analysis/experiments/`. It should build a list of `Run(...)` objects and call `run_many(...)` from `analysis/sweep.py`, which runs `node cli/run.ts` in parallel and writes `runs/<experiment>/<condition>-seed<k>/`.
   - `runs/` is not committed. The script must recreate it exactly.
4. **Analyse.** Load with `treesim_io.load_runs("runs/<experiment>")` into polars, with one row per run, season and tree. Plot with plotnine. Save small figures to `docs/experiments/figures/<note-name>-*.png`.
5. **Write up.** Create `docs/experiments/YYYY-MM-DD-<milestone>-<topic>.md` covering the question, setup (the exact `uv run …` command), result (numbers and figures), and conclusion with follow-ups.
6. **Report.** Give a short summary to the user, and add follow-ups to STATUS or ROADMAP.
