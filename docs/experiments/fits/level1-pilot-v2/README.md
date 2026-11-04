# Level 1 beech pilot v2: the run's results (provisional)

**Provisional: nothing here is accepted into species params** (the plan's §g: pending Level 0's pass and ADR 0052).
The write-up is [the note](../../2026-11-04-level1-beech-pilot-v2.md).

- **Ran from:** registration v3 of `analysis/fit/sources/level1-beech.json`. Its `prior` holds v2 (44a21ba, the
  pilot's run), and v2's holds v1 (3c64f48). The commit the run launched from is the first line of
  `runs/level1-pilot-v2/beech.log`.
- **Written before the run** (the registration commit):
  - `noise.json`: the hand's noise floor on the v3 loss, on the pilot's own seed draws (numpy seed 20261106), the
    pilot's floor beside it, and the seed decision (`analysis/experiments/level1_noise.py`);
  - `correlation.json`: the 16 × 16 correlation of the detrended descriptors, the real trees (BioDiv's 53) beside the
    simulated hand (seeds 1–20, stand); only the real matrix sets the weights and the draw;
  - `control.json`: the real-tree control under the v3 hold-outs, with spread on all 16
    (`level1_gate.py --control`).
  - `weights-bootstrap.json`: the weights' and clusters' stability over 2,000 resamples of the real trees
    (`docs/experiments/code/2026-11-04-level1-pilot-v2/weights_bootstrap.py`; reported, never used).
- **Written by the run** (`LEVEL1_OUT=level1-pilot-v2 analysis/experiments/level1_fit_gate.sh beech 32 H`).
  **Stopped at generation 10 of 32 (the user, 19:08 UTC); checkpoint kept, resumable**
  (`runs/level1-pilot-v2/beech/checkpoint.pkl`). These are partial results, as the run wrote them after generation 9:
  - `beech-best.json`: the in-run best (generation 8, 3.935 on the search seeds), with its patch, traits and
    contributions;
  - `beech-progress.csv`: all 120 candidates.

  Never written, since the run stopped before its finalists and gate: `beech.json` (the hand and the finalist on
  101–110) and the gate files.
- **Written after the launch, beside the run:** `hand-search-seeds.json`, the hand on the run's ten fixed search seeds
  with the same Measure (hide=True), so that in-run losses read against the hand on identical seeds
  (`docs/experiments/code/2026-11-04-level1-pilot-v2/hand_on_search_seeds.py`).
- **Held-out values** appear only in the gate files. The fit's own files carry none, and neither does the
  registration commit: `correlation.json` holds correlations only.
