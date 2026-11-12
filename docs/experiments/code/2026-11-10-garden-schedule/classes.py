"""Height gained per season over 5 seasons, and mean bud light, by height class at seasons 150
and 200 (#121's suppression probe; EXPLORATORY): the scale the probe signals' knobs sit on.

    python3 docs/experiments/code/2026-11-10-garden-schedule/classes.py runs/garden-schedule/r6/w160-s2 ...
"""

import collections
import csv
import statistics as st
import sys

for run in sys.argv[1:]:
    rows = list(csv.DictReader(open(f"{run}/metrics.csv")))
    top = {int(r["season"]): float(r["topHeight"]) for r in csv.DictReader(open(f"{run}/stand.csv"))}
    h = {(r["tree"], int(r["season"])): float(r["height"]) for r in rows if r["alive"] == "1"}
    gain, q = collections.defaultdict(list), collections.defaultdict(list)
    for r in rows:
        s = int(r["season"])
        if r["alive"] != "1" or s not in (150, 200):
            continue
        hh, prev = float(r["height"]), h.get((r["tree"], s - 5))
        if prev is None:
            continue
        c = "seedling" if hh < 5.2 else ("canopy" if hh > top[s] / 2 else "under")
        gain[c].append((hh - prev) / 5)
        q[c].append(float(r["meanBudQ"]))
    for c, v in gain.items():
        v = sorted(v)
        print(f"{run} {c} n={len(v)} dH/season q10 {v[len(v) // 10]:.2f} med {st.median(v):.2f} "
              f"q90 {v[9 * len(v) // 10]:.2f}; meanBudQ med {st.median(q[c]):.3f}")
