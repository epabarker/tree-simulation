"""Where crowns overlap (the occupancy probe, #121; EXPLORATORY). For a sweep.ts run and a season
metamers.csv holds: the canopy trees' (over half the top height) metamer tips binned to plan
columns (x, z) and to 3D cells; per tree, the share of its plan columns that another canopy tree
also occupies, the share of its 3D cells another tree also occupies, and, in the shared columns,
the median height gap between the two trees' highest tips. Plan overlap with few shared cells
means crowns stack (one under another) or interleave at a finer scale than the occupancy reads.

    python3 docs/experiments/code/2026-11-10-garden-schedule/overlap.py <run dir> <season>
"""

import collections
import csv
import json
import math
import statistics as st
import sys

run, season = sys.argv[1], sys.argv[2]
params = json.load(open(f"{run}/record.json"))["params"]
W, D = params["world"]["width"], params["world"].get("depth", 64)
stand = {r["season"]: float(r["topHeight"]) for r in csv.DictReader(open(f"{run}/stand.csv"))}
canopy = {r["tree"] for r in csv.DictReader(open(f"{run}/metrics.csv"))
          if r["season"] == season and r["alive"] == "1" and float(r["height"]) > stand[season] / 2}
cols = collections.defaultdict(lambda: collections.defaultdict(float))  # (x, z) -> tree -> top y
cells = collections.defaultdict(set)
mine = collections.defaultdict(set)
for r in csv.DictReader(open(f"{run}/metamers.csv")):
    if r["season"] != season or r["tree"] not in canopy:
        continue
    x, y, z = float(r["x1"]), float(r["y1"]), float(r["z1"])
    c = (math.floor(x) % W, math.floor(z) % D)
    t = r["tree"]
    cols[c][t] = max(cols[c][t], y)
    cell = (c[0], math.floor(y), c[1])
    cells[cell].add(t)
    mine[t].add(cell)
plan = collections.defaultdict(lambda: [0, 0])
gaps = []
for c, trees in cols.items():
    for t in trees:
        plan[t][0] += 1
        if len(trees) > 1:
            plan[t][1] += 1
    if len(trees) > 1:
        tops = sorted(trees.values(), reverse=True)
        gaps.append(tops[0] - tops[1])
shared3 = {t: sum(len(cells[c]) > 1 for c in cs) / len(cs) for t, cs in mine.items()}
print(f"{run} s{season}: {len(canopy)} canopy trees, plan cover {len(cols) / (W * D):.2f} of the plot")
print(f"  plan columns shared with another canopy tree: median {st.median(s / n for n, s in plan.values()):.2f}")
print(f"  3D cells shared: median {st.median(shared3.values()):.3f}")
print(f"  in shared columns, top-tip height gap (cells): median {st.median(gaps) if gaps else 0:.0f}")
