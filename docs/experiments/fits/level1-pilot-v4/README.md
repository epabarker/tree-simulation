# Level 1 beech pilot v4: the run's results (provisional)

**Provisional: nothing here is accepted into species params** (the plan's §g: pending Level 0's pass and ADR 0052).
The write-up is [the note](../../2026-11-05-level1-beech-pilot-v4.md).

- **Ran from:** registration v5 of `analysis/fit/sources/level1-beech.json` (edbd327). Its `prior` holds v4 (8e7594b,
  pilot v3's run), and so on back to v1. The commit the run launched from is the first line of
  `runs/level1-pilot-v4/beech.log` (edbd327, clean).
- **What v5 changed** (the registration's `changes`): stand.lateShare scored again in the Level 1 loss at band 0.10
  (`loss.level0_band`; the targets file keeps 0.06); stand.height100 stays reported. Everything else as v4, the
  one-sided spread penalty and the ten search seeds included.
- **Written before the run** (after the registration commit, before the fit):
  - `noise.json`: the hand on v3's three 10-seed draws under the v5 loss (its JSON keys still say "v4"), its SD
    (1.31), and the cross-check against `../level1-pilot-v2/noise.json` on the same trees (9e-16;
    `analysis/experiments/level1_noise_v4.py`). Reported only; the seeds per candidate stay at 10 (the user).
- **Written by the run** (`LEVEL1_OUT=level1-pilot-v4 analysis/experiments/level1_fit_gate.sh beech 32 9`):
  - `beech-best.json`, `beech-progress.csv`: the in-run best and every candidate, rewritten each generation;
  - `beech.json`: the hand and the three finalists re-measured on 101–110, with per-term `contributions` and the
    `reported` height at 100;
  - the gate: `beech.gate.txt` and `beech.gate.json` (copied here from `runs/level1-pilot-v4/`). FAIL: held out 20/20,
    spread outside ×2 on tortuosity05 (0.48) and limbUpturn (0.36), shapeFlag clear.
- **Held-out values** appear only in the gate files.
