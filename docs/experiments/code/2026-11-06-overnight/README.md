# The overnight run's code and summaries (2026-11-06)

The run happened in a session scratchpad under `/tmp`. These are the scripts and summary results, kept so the
gates and ADR 0055 can be re-run. Scripts carry the scratchpad's absolute paths; adjust them to rerun.

**Scratchpad folder → folder here** (the overnight plan's State and the note cite the scratchpad names):

| scratchpad | here | what |
|---|---|---|
| `b0/`, `i0/` | `evidence/` | `evidence.py` (G-forest on the garden world, `forestParams(160)`, 20 seeds, 300 seasons; `run` and `compare`), `dump.ts`, the baseline, each candidate's `evidence.md` and its patch |
| `a11/` | `descriptors/` | the six within-tree descriptors (`reg.py`), one code path for coarsened sims and real QSMs |
| `a14/` | `noise/` | the scan-noise floor from BioDiv's repeat reconstructions (`noise.md`) |
| `t/` | `targets/` | real-tree targets per species and regime, and Level 0 height bands. Summary statistics only (licence rule 9) |
| `judge/`, `judge-sim/` | `judge/` | the blinded judges: "which is real?" (retired: saturated) and simulated-against-simulated (`build_pairs.py`, `gate1.py`, `score_sim.py`; its gate failed, so it is lone-only and advisory) |
| `a7/`, `a/` | `crown/` | the flat-cap mechanism (k < 1) and the crown probes, with the dome index D |
| `r/`, `s/`, `y/`, `y2/`, `l/` | `results/` | regularity tuning (R), species (S), heights (Y: L_h starves; Y2: the reproductive sink), and the lone sheet's metrics (L) |
| `m/` | `bench/` | memory and time, **one fresh process per run** (WASM memory never shrinks) |

Not kept: per-tree tables from real QSMs, the judges' answer keys, and raw renders.
