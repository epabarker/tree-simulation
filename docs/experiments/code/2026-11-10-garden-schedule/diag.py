"""Diagnostics of a garden-schedule run (#121; EXPLORATORY, seeds 1-3), from metrics.csv and stand.csv:

- canopy crowns: crownWidth / crownDepth (cells) of canopy trees at seasons 100 and 150, against
  the 64-cell depth period;
- establishment: each recruit's groundLight in its first row (the light it established in);
- the seedling bank: median seasons alive of trees that die below the display threshold
  (5.2 cells), per species;
- suppression's reach: drawn non-canopy tree-seasons from 100 on, and the share with P/M < 1.

    python3 docs/experiments/code/2026-11-10-garden-schedule/diag.py runs/garden-schedule/<round>/w160-s1 ...
"""

import collections
import csv
import statistics as st
import sys

for run in sys.argv[1:]:
    rows = list(csv.DictReader(open(f"{run}/metrics.csv")))
    top = {int(r["season"]): float(r["topHeight"]) for r in csv.DictReader(open(f"{run}/stand.csv"))}
    width = int(run.rstrip("/").split("/w")[-1].split("-")[0])
    planted = {str(i) for i in range(round(400 * width * 64 * 0.0625 / 10_000))}  # o4.planting's first n
    print(f"== {run}")
    for s in (100, 150):
        can = [r for r in rows if int(r["season"]) == s and r["alive"] == "1" and float(r["height"]) > top[s] / 2]
        if can:
            w = [float(r["crownWidth"]) for r in can]
            d = [float(r["crownDepth"]) for r in can]
            print(f"  s{s}: canopy {len(can)}, crownWidth med {st.median(w):.0f} max {max(w):.0f}, crownDepth med {st.median(d):.0f} max {max(d):.0f} (period 64)")
    first, seen, life = {}, {}, collections.defaultdict(list)
    alive_seasons = collections.Counter()
    last = {}
    for r in rows:
        t = r["tree"]
        if r["alive"] == "1":
            alive_seasons[t] += 1
            last[t] = r
            if t not in first:
                first[t] = r
    for t, r in last.items():
        if int(r["season"]) < 300 and float(r["height"]) < 5.2 and t not in planted:
            life[r["species"]].append(alive_seasons[t])
    gl = collections.defaultdict(list)
    for t, r in first.items():
        if t not in planted:
            gl[r["species"]].append(float(r["groundLight"]))
    print("  recruits' groundLight at establishment (median, n):",
          {k: (round(st.median(v), 3), len(v)) for k, v in sorted(gl.items())})
    print("  seasons alive of seedlings dying < 1.3 m (median, n):",
          {k: (st.median(v), len(v)) for k, v in sorted(life.items())})
    under = [r for r in rows if int(r["season"]) >= 100 and r["alive"] == "1"
             and 5.2 <= float(r["height"]) <= top[int(r["season"])] / 2]
    low = [r for r in under if float(r["maintenance"]) > 0 and float(r["production"]) < float(r["maintenance"])]
    print(f"  understorey tree-seasons from 100: {len(under)}, with P/M < 1: {len(low)}")
