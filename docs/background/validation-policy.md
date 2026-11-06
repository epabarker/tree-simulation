# Validation policy (2026-11-06)

This policy separates what can adopt a change from what only informs it. It was written at [the external review's](../reviews/2026-11-06-external-review.md) suggestion. It formalises what the overseer's runs already did, and it binds every species and look change from the 0.17.0 box on ([plan](../plans/2026-11-06-box-0.17.md)).

## Three labels
Every measure that a plan, a PR or an experiment note cites carries one of three labels.

| label | what it may do | examples |
|---|---|---|
| **hard** | Adopts or blocks a change. Fixed before the results are seen, never loosened afterwards, with a stated pass rate over ≥ 20 seeds (AGENTS.md's seed rule). | G-forest against B0 (each count ≥ base − 2); the birch-pole gate (≥ 15 of 20); G-reg's descriptor bands; the budget (memory, metamers, phone time); `npm run check`; the goldens |
| **soft** | Reported beside the hard gates. It may block a change with a written reason, but never adopts one alone. | width/height and the dome index D against real bands at n 5 seeds; garden composition; all-tree H/D; floor light where it is out of band by construction |
| **advisory** | Never evidence. A reader of the result may use it to find what to measure next. | the simulated-against-simulated judge (failed its 75% calibration: 69%); the "which is real?" judge once it saturates; anyone's eye on a sheet, the user's included |

## Rules
1. **An instrument that fails its own calibration is advisory**, whatever it later says.
2. **No visual fix is called biological validation** unless it also passes an independent quantitative gate. This is the inverse of the garden rule ("no new descriptor without a reason visible in the garden"). A fix can be adopted for the look on the user's word; it is then labelled a look decision, not validation.
3. **A gate is independent of the tuning** when the data it compares against were not used to choose the parameters. Held-out descriptors, fresh seeds or a second dataset all qualify. Where a gate uses the tuning data, the note says so.
4. **No new mechanism without a measured mismatch** that existing parameters cannot fix. A new mechanism goes behind a param, off by default, with an ADR.
5. **Known defects are named regressions** (`npm run regressions`, `tests/regressions.json`). Fixing one is a recorded baseline change, like a golden.
6. **A hard gate at its limit is reported as at its limit**, not as a pass with margin. Where a count is not monotonic in the parameter being swept (for example crown base for birch's trunk λ: 12, 9, 6), the note says the check is noisy there.
