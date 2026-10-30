"""C1: the light and form core's measures, from treesim runs (runs.sh).

Per run and snapshot season (45, 100), over the planted trees (the run's first `trees`):
- floor: mean light on the ground row (light.csv, the field averaged over the slab's depth), of open sky;
- floor under: the same under the crowns, ground columns with LAI ≥ 1 above them (ground.csv,
  round 2), and crown cover, the share of the ground they make up;
- height, crown ratio (crown length / height: 1 − bole/height), crown width (x) and depth (z) over
  height, H/D: medians;
- metamers: the world's live metamers;
- cover low / high: the picture's coverage, as the proto3d note's cover.py: leaves (here the tips
  of metamers up to 4 seasons old, the garden's leafy shoots) in 1-cell cells of (x, y), over the
  columns holding any, below and above half the canopy height;
- own tops: the share of canopy trees (height ≥ half the tallest planted) whose top is the
  highest foliage of any tree within 4 cells of it in x: a crown top of its own, not a mat;
- lean z: median centroidOffsetZ (the crown's centroid from its root in z; negative leans to the
  front face, z = 0).

    uv run --project analysis python docs/experiments/code/2026-10-31-c1/c1.py runs/c1
"""

import csv
import json
import math
import os
import sys
from collections import defaultdict
from statistics import mean, median

LEAF_AGE = 4
SEASONS = tuple(int(x) for x in os.environ.get("SEASONS", "45,100").split(","))


def rows(path):
    with open(path) as f:
        yield from csv.DictReader(f)


def measure(run):
    params = json.load(open(os.path.join(run, "run.json")))["params"]
    W = params["world"]["width"]
    planted = len(params["trees"])
    out = {}
    floor = defaultdict(list)
    if os.path.exists(os.path.join(run, "light.csv")):
        for r in rows(os.path.join(run, "light.csv")):
            if r["row"] == "0":
                floor[int(float(r["season"]))].append(1 - float(r["shade"]))
    # The floor under the crowns (C1 round 2): ground columns with at least one unit of leaf area
    # above them (ground.csv, written by the CLI's --light since round 2).
    under = defaultdict(list)
    covered = defaultdict(lambda: [0, 0])
    if os.path.exists(os.path.join(run, "ground.csv")):
        for r in rows(os.path.join(run, "ground.csv")):
            s_ = int(float(r["season"]))
            lai = float(r["lai"])
            covered[s_][1] += 1
            if lai >= 1:
                under[s_].append(float(r["q"]))
                covered[s_][0] += 1
    metrics = defaultdict(list)
    live = defaultdict(int)
    for r in rows(os.path.join(run, "metrics.csv")):
        s = int(float(r["season"]))
        if r["alive"] != "1":
            continue
        live[s] += int(float(r["metamers"]))
        if int(r["tree"]) < planted:
            metrics[s].append(r)
    tips = defaultdict(list)
    for r in rows(os.path.join(run, "metamers.csv")):
        s = int(float(r["season"]))
        if s - int(float(r["birthSeason"])) <= LEAF_AGE:
            tips[s].append((int(r["tree"]), float(r["x1"]) % W, float(r["y1"])))
    for s in sorted(tips):
        ms = metrics[s]
        if not ms:
            continue
        f = lambda k: median(float(m[k]) for m in ms)
        heights = {int(m["tree"]): float(m["height"]) for m in ms}
        top = max(heights.values())
        canopy = [t for t, h in heights.items() if h >= 0.5 * top]
        H = median(heights[t] for t in canopy)
        # Coverage of the picture.
        cells = defaultdict(int)
        for _, x, y in tips[s]:
            cells[(int(x), int(math.floor(y)))] += 1
        cols = {c for c, _ in cells}
        half = H / 2
        lo = [cells.get((c, y), 0) for c in cols for y in range(int(half))]
        hi = [cells.get((c, y), 0) for c in cols for y in range(int(half), int(math.ceil(H)))]
        # Own tops: each canopy tree's highest leaf against every other tree's within 4 cells.
        best = {}
        for t, x, y in tips[s]:
            if t not in best or y > best[t][1]:
                best[t] = (x, y)
        own = 0
        for t in canopy:
            if t not in best:
                continue
            x, y = best[t]
            rival = any(
                u != t and yy > y and min(abs(xx - x), W - abs(xx - x)) <= 4
                for u, xx, yy in tips[s]
            )
            own += not rival
        out[s] = {
            "floor": round(mean(floor[s]), 4) if floor.get(s) else None,
            "floorUnder": round(mean(under[s]), 4) if under.get(s) else None,
            "crownCover": round(covered[s][0] / covered[s][1], 3) if covered[s][1] else None,
            "height": round(f("height"), 1),
            "crownRatio": round(f("crownRatio"), 2),
            "widthOverH": round(median(float(m["crownWidth"]) / float(m["height"]) for m in ms), 2),
            "depthOverH": round(median(float(m["crownDepth"]) / float(m["height"]) for m in ms), 2),
            "HD": round(f("slenderness"), 1),
            "metamers": live[s],
            "coverLow": round(sum(v > 0 for v in lo) / max(1, len(lo)), 3),
            "coverHigh": round(sum(v > 0 for v in hi) / max(1, len(hi)), 3),
            "ownTops": round(own / max(1, len(canopy)), 2),
            "leanZ": round(f("centroidOffsetZ"), 2),
            "planted": len(ms),
        }
    return out


def main(d):
    groups = defaultdict(list)
    for name in sorted(os.listdir(d)):
        run = os.path.join(d, name)
        if os.path.isdir(run) and os.path.exists(os.path.join(run, "metamers.csv")):
            groups[name.rsplit("-s", 1)[0]].append(measure(run))
    for v, runs in groups.items():
        for s in SEASONS:
            per = [r[s] for r in runs if s in r]
            if not per:
                continue
            keys = per[0].keys()
            def avg(k):
                vals = [p[k] for p in per if p[k] is not None]
                return round(mean(vals), 3) if vals else None

            agg = {k: [p[k] for p in per] if k == "metamers" else avg(k) for k in keys}
            print(json.dumps({"variant": v, "season": s, "seeds": len(per), **agg}))


main(sys.argv[1] if len(sys.argv) > 1 else "runs/c1")
