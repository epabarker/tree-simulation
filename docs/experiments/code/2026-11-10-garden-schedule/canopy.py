"""Canopy stems per hectare (stand.csv `canopy`, over half the top height), median over seasons
100-300, per round and width, seeds 1-3 pooled (#121's suppression probe; EXPLORATORY): how many
canopy trees a hectare of the simulated stand holds, against the >= 120/ha that 200-400 drawn
stems at >= 60% canopy need.

    python3 docs/experiments/code/2026-11-10-garden-schedule/canopy.py r6 sB-d96 sB-d128 ...
"""

import csv
import json
import statistics as st
import sys
from pathlib import Path

ROOT = Path("runs/garden-schedule")
for rnd in sys.argv[1:]:
    out = []
    for width in (160, 66):
        vals = []
        for seed in (1, 2, 3):
            run = ROOT / rnd / f"w{width}-s{seed}"
            world = json.load(open(run / "record.json"))["params"]["world"]
            ha = width * world.get("depth", 64) * 0.0625 / 10_000
            for r in csv.DictReader(open(run / "stand.csv")):
                if 100 <= int(r["season"]) <= 300:
                    vals.append(float(r["canopy"]) / ha)
        out.append(f"{width}: {st.median(vals):.0f}/ha (q10 {sorted(vals)[len(vals) // 10]:.0f}, q90 {sorted(vals)[9 * len(vals) // 10]:.0f})")
    print(rnd, "|", " | ".join(out))
