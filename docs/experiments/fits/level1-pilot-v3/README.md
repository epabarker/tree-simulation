# Level 1 beech pilot v3: the run's results (provisional)

**Provisional: nothing here is accepted into species params** (the plan's §g: pending Level 0's pass and ADR 0052).
The plan's State (`docs/plans/2026-11-03-reference-fidelity.md`) holds the registration, the launch and the morning's
reading; the write-up follows the run.

- **Ran from:** registration v4 of `analysis/fit/sources/level1-beech.json` (8e7594b). Its `prior` holds v3 (81b157a,
  pilot v2's run), and so on back to v1. The commit the run launched from is the first line of
  `runs/level1-pilot-v3/beech.log`.
- **What v4 changed** (the registration's `changes`): stand.lateShare and stand.height100 reported, not scored, in
  the Level 1 loss; a one-sided spread penalty on every fitted descriptor, `l1.<k>.spr` = w_k (ln(min(1, r/0.5)) /
  ln 2)², r the simulated SD over the real. Everything else as v3, the ten search seeds included.
- **Written before the run** (after the registration commit, before the fit):
  - `noise.json`: the hand on v3's three 10-seed draws (numpy seed 20261106) under the v4 loss, its SD beside v3's
    on the same draws, and the cross-check against `../level1-pilot-v2/noise.json` on the same trees
    (`analysis/experiments/level1_noise_v4.py`). Reported only; the seeds per candidate stay at 10 (the user).
- **Written by the run** (`LEVEL1_OUT=level1-pilot-v3 analysis/experiments/level1_fit_gate.sh beech 32 9`):
  - `beech-best.json`, `beech-progress.csv`: the in-run best and every candidate, rewritten each generation;
  - `beech.json`: the hand and the finalist re-measured on 101–110, with per-term `contributions` and, beside them,
    the `reported` terms lateShare and height at 100 would add;
  - the gate: `runs/level1-pilot-v3/beech.gate.txt` and `beech.gate.json` (git-ignored; copy here once read).
- **Held-out values** appear only in the gate files.
