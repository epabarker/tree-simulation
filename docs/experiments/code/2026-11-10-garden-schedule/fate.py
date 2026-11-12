"""Why the garden holds few canopy trees (#121's second probe round; EXPLORATORY, seeds 1-3).

Per run (a sweep.ts run directory):
- the planted trees' fate: alive at 300, or the season and cause of death (R3 throw: `broken` > 0
  at the first dead row; R1 starvation: `starved` rose; else the O4 draw), with the height class;
- the canopy crowns over time: crownWidth and crownDepth (metamer extents, cells) of the canopy
  trees (over half the top height) at seasons 25/50/100/150/200/300, and the crowns' summed
  ellipse area (pi/4 W D) over the plot's area: > 1 means the crowns overlap in plan;
- at the last season, each canopy tree's robust width: the 5-95% quantile spread of its metamer
  tips in x and z, against crownWidth (max - min), so a few long limbs show as a large ratio.

    python3 docs/experiments/code/2026-11-10-garden-schedule/fate.py runs/garden-schedule/<round>/w160-s1 ...
"""

import collections
import csv
import json
import math
import statistics as st
import sys


def quantile(v, q):
    v = sorted(v)
    return v[min(len(v) - 1, max(0, math.ceil(q * len(v)) - 1))]


for run in sys.argv[1:]:
    params = json.load(open(f"{run}/record.json"))["params"]
    width, depth = params["world"]["width"], params["world"].get("depth", 64)
    n = round(400 * width * depth * 0.0625 / 10_000)
    rows = list(csv.DictReader(open(f"{run}/metrics.csv")))
    top = {int(r["season"]): float(r["topHeight"]) for r in csv.DictReader(open(f"{run}/stand.csv"))}
    last, dead = {}, {}
    for r in rows:
        t = r["tree"]
        if r["alive"] == "1":
            last[t] = r
        elif t in last and t not in dead:
            dead[t] = r
    fate = collections.Counter()
    when = collections.defaultdict(list)
    for i in range(n):
        t = str(i)
        if t not in last:
            continue
        lv = last[t]
        if t not in dead:
            fate["alive at 300"] += 1
            continue
        d = dead[t]
        h = float(lv["height"])
        size = "canopy" if h > top.get(int(lv["season"]), 0) / 2 else "below canopy"
        cause = ("thrown" if float(d["broken"] or 0) > 0
                 else "starved" if float(d["starved"] or 0) > float(lv["starved"] or 0) else "o4")
        fate[(cause, size)] += 1
        when[cause].append(int(d["season"]))
    print(f"== {run} (planted {n})")
    print("  planted fate:", dict(fate))
    print("  death seasons by cause (median, min-max):",
          {k: (st.median(v), min(v), max(v)) for k, v in when.items()})
    area = width * depth
    for s in (25, 50, 100, 150, 200, 300):
        can = [r for r in rows if int(r["season"]) == s and r["alive"] == "1" and float(r["height"]) > top[s] / 2]
        if not can:
            continue
        w = [float(r["crownWidth"]) for r in can]
        d = [float(r["crownDepth"]) for r in can]
        cover = sum(math.pi / 4 * a * b for a, b in zip(w, d)) / area
        planted = sum(int(r["tree"]) < n for r in can)
        print(f"  s{s}: canopy {len(can)} ({planted} planted), W med {st.median(w):.0f} "
              f"[{min(w):.0f}-{max(w):.0f}], D med {st.median(d):.0f}, summed crown area / plot {cover:.2f}")
    # Robust width at the last season from metamer tips.
    tips = collections.defaultdict(lambda: ([], []))
    with open(f"{run}/metamers.csv") as f:
        for r in csv.DictReader(f):
            if r["season"] == "300":
                tips[r["tree"]][0].append(float(r["x1"]))
                tips[r["tree"]][1].append(float(r["z1"]))
    can300 = [r for r in rows if r["season"] == "300" and r["alive"] == "1" and float(r["height"]) > top[300] / 2]
    out = []
    for r in can300:
        xs, zs = tips[r["tree"]]
        if len(xs) < 20:
            continue
        rw = quantile(xs, 0.95) - quantile(xs, 0.05)
        rd = quantile(zs, 0.95) - quantile(zs, 0.05)
        out.append((r["species"], float(r["crownWidth"]), rw, float(r["crownDepth"]), rd))
    for sp, cw, rw, cd, rd in out:
        print(f"  s300 {sp}: crownWidth {cw:.0f} vs 5-95% tips {rw:.0f}; crownDepth {cd:.0f} vs {rd:.0f}")
