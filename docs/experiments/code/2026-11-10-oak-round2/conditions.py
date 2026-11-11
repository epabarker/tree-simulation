"""#124 round two: the screened neighbours of d12a13 and the screening set, fixed before running.

Writes runs/oak-round2/<name>.json, each an oak-only species patch for cli/oak-crown.ts --patch.
Only the oak's existing ontogenetic fall (r2.dLambda, r2.aC, r2.ramp; HEAD 0.04 / 13.51 / 15).
Already tried on seeds 1-3 (2026-11-08 oak-lambda and oak-schedule notes), not repeated:
d08a13, d08a30, d12a30, aC 18 and 22, ramp 40, and the per-level shares. Later or slower falls
gave boxes and are ruled out by the page; so the neighbours are deeper, earlier or faster, with
one shallower control.

Screening set (8 seeds, fixed before running): the worst boxes of round one (1, 10, 16: by eye and
top3 >= 0.64), the worst flanks (8, 7, 6: 2.1, 2.4, 2.6 %; 6 is also an eye box), two clean domes
(2, 13). Rank: seeds of 8 passing both bars (flank, w90), then seeds with top3 < 0.64 (no box by
the measure), then height at 30 (higher is the smaller cost).

    uv run --project analysis python docs/experiments/code/2026-11-10-oak-round2/conditions.py
    node cli/oak-crown.ts --patch runs/oak-round2/<name>.json --seeds 1,2,6,7,8,10,13,16 \
        --no-head --species oak --snapshots 100 --out runs/oak-crown
"""

import json
from pathlib import Path

SCREEN = [1, 2, 6, 7, 8, 10, 13, 16]
CANDIDATES = {
    "d14a13": {"dLambda": 0.14, "aC": 13.5},
    "d16a13": {"dLambda": 0.16, "aC": 13.5},
    "d12a11": {"dLambda": 0.12, "aC": 11},
    "d12a9": {"dLambda": 0.12, "aC": 9},
    "d12a13r8": {"dLambda": 0.12, "aC": 13.5, "ramp": 8},
    "d14a11": {"dLambda": 0.14, "aC": 11},
    "d10a13": {"dLambda": 0.10, "aC": 13.5},
}

if __name__ == "__main__":
    out = Path("runs/oak-round2")
    out.mkdir(parents=True, exist_ok=True)
    for name, r2 in CANDIDATES.items():
        (out / f"{name}.json").write_text(json.dumps({"species": {"oak": {"r2": r2}}}) + "\n")
        print(out / f"{name}.json")
