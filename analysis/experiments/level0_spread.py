"""Level 0 v2, night 1: the between-seed spread of a gated species' median z against the control's (the user,
2026-11-04; reported under ADR 0049 §4's factor-of-2 rule, never gated on). Real-data side: the species' control trees
(tallo.joint_rows on the v2 curves), the SD over CONTROL_SEEDS pseudo-seeds of the median z of TREES trees, per trait
(a pseudo-season is exchangeable, so one SD serves every season). Simulated side: the SD over the gate's seeds 1–20 of
each season's median z, read from the gate's --json. Ratio = simulated / real; within the rule when 0.5–2.

    uv run --project analysis python -I analysis/experiments/level0_spread.py beech runs/level0/beech.gate.json
"""

import json
import sys

import numpy as np

sys.path.insert(0, __import__("pathlib").Path(__file__).resolve().parents[1].as_posix())
from treesim import tallo  # noqa: E402
from treesim.fit import LEVEL0_SEASONS  # noqa: E402

species, gate = sys.argv[1], json.loads(open(sys.argv[2]).read())
entry = tallo.load_targets()["species"][species]
zh, zc = tallo.joint_rows(tallo.load(), species, entry)
# A fresh stream, apart from the registration's (RNG_SEED): T and the targets are read, never redrawn.
rng = np.random.default_rng(20261104)
real = {}
for trait, z in (("H", zh), ("CR", zc)):
    med = np.array([np.median(z[rng.choice(len(z), tallo.TREES, replace=False)]) for _ in range(tallo.CONTROL_SEEDS)])
    real[trait] = float(np.std(med, ddof=1))
print(f"{species}: control trees {len(zh)}; real between-pseudo-seed SD of the median z of {tallo.TREES}: "
      f"H {real['H']:.3f}, CR {real['CR']:.3f}\n")
print("| trait | season | seeds | sim mean of median z | sim SD | real SD | ratio | within ×2 |")
print("|---|---|---|---|---|---|---|---|")
for trait in tallo.TRAITS:
    for i, season in enumerate(LEVEL0_SEASONS):
        zs = [r[f"stand.tallo{trait}.{i}"] for r in gate["rows"] if r.get(f"stand.tallo{trait}.{i}") is not None]
        sd = float(np.std(zs, ddof=1))
        ratio = sd / real[trait]
        print(f"| {trait} | {season} | {len(zs)} | {np.mean(zs):+.2f} | {sd:.3f} | {real[trait]:.3f} | {ratio:.2f} | "
              f"{'yes' if 0.5 <= ratio <= 2 else 'no'} |")
