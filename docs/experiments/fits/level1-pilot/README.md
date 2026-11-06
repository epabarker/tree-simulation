# Level 1 beech pilot: the overnight fit's results (provisional)

**Provisional: nothing here is accepted into species params** (the plan's §g: the pilot is pending Level 0's pass and
ADR 0052). The fit failed its gate. The write-up is [the note](../../2026-11-04-level1-beech-pilot.md), "The overnight
run".

- **Ran from:** registration v2, `analysis/fit/sources/level1-beech.json`, committed at **44a21ba** (v1 3c64f48 is in its
  `prior`). The tree at launch was 44a21ba; the only later change before the run ended was docs (ceb1551).
- **Command:** `analysis/experiments/level1_fit_gate.sh beech 32 5`, from 11:46 to 15:10 UTC on 2026-11-04: 32
  generations of 12 candidates on 5 seeds (1,960 evaluations, 12 workers).
- **Files** (as the run wrote them, unedited):
  - `beech.json`: the hand and the chosen finalist re-measured on seeds 101–110, each term's contribution, the
    finalists' losses.
  - `beech-best.json`: the best in-run candidate, on its own generation's seeds.
  - `beech-progress.csv`: one row a candidate, with its matched season.
  - `beech.gate.txt`, `.json`: the gate on seeds 1–20. **FAIL:** held out 0/20 (pendulousFraction05 on every seed),
    spread outside ×2, shapeFlag clear.
  - `hand.gate.txt`, `.json`: the baseline gate on the hand params.
  - `control.json`: the real-tree control.
  - `beech.level0-gate.txt`, `.json`: `level0_gate.py` on the finalist.
  - `postfit.json`: the term table on 101–110, the noise floor, and the gallery
    (`docs/experiments/code/2026-11-04-level1-pilot/postfit.py`).
- **Held-out values** appear only in the gate files; the fit's own files carry none (registered).
