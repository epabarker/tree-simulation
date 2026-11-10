"""Death causes in a garden-schedule run (#121; EXPLORATORY, seeds 1-3).

For each tree that dies, the cause read from metrics.csv at its first dead row: `broken` > 0
(R3 threw it in a storm), `starved` >= R1's limit (R1 starved it), else O4's mortality draw.
Split by drawn (>= 5.2 cells, 1.3 m) / canopy (> half the top) at its last live season.

    python3 docs/experiments/code/2026-11-10-garden-schedule/deaths.py runs/garden-schedule/<round>/w160-s1 ...
"""

import collections
import csv
import sys

for run in sys.argv[1:]:
    rows = list(csv.DictReader(open(f"{run}/metrics.csv")))
    stand = {int(r["season"]): float(r["topHeight"]) for r in csv.DictReader(open(f"{run}/stand.csv"))}
    last, dead = {}, {}
    for r in rows:
        t = r["tree"]
        if r["alive"] == "1":
            last[t] = r
        elif t in last and t not in dead:
            dead[t] = r
    causes = collections.Counter()
    for t, r in dead.items():
        lv = last[t]
        h = float(lv["height"])
        size = "seedling" if h < 5.2 else ("canopy" if h > stand.get(int(lv["season"]), 0) / 2 else "under")
        if float(r["broken"] or 0) > 0:
            cause = "thrown"
        elif float(r["starved"] or 0) > float(lv["starved"] or 0):
            cause = "starved"
        else:
            cause = "o4"
        causes[(size, cause)] += 1
    print(run, dict(sorted(causes.items())))
