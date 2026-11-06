"""C1 round 2, step 1: height against season (height.sh's runs).

Per variant: the planted trees' median height (the lone tree's own), mean of seeds, at seasons
50, 100, …, 300; the gain over the last 50 seasons; the stand's top (95th percentile of every live
tree's height, recruits included); live metamers at 300. "Levels off" here: under 2 cells gained
in seasons 250–300 by every seed, and under 180 cells (20 below the top).

    python3 docs/experiments/code/2026-11-01-c1-round2/height.py runs/c1r2 [--series]
"""

import csv
import json
import os
import sys
from collections import defaultdict
from statistics import mean, median

AT = (50, 100, 150, 200, 250, 300)


def series(run):
    planted = len(json.load(open(os.path.join(run, "run.json")))["params"]["trees"])
    h = defaultdict(list)
    every = defaultdict(list)
    live = defaultdict(int)
    with open(os.path.join(run, "metrics.csv")) as f:
        for r in csv.DictReader(f):
            if r["alive"] != "1":
                continue
            s = int(float(r["season"]))
            every[s].append(float(r["height"]))
            live[s] += int(float(r["metamers"]))
            if int(r["tree"]) < planted:
                h[s].append(float(r["height"]))
    med = {s: median(v) for s, v in h.items()}
    top = {s: sorted(v)[int(0.95 * (len(v) - 1))] for s, v in every.items()}
    return med, top, live


def main(d, full):
    groups = defaultdict(list)
    for name in sorted(os.listdir(d)):
        run = os.path.join(d, name)
        if os.path.exists(os.path.join(run, "metrics.csv")):
            groups[name.rsplit("-s", 1)[0]].append(series(run))
    for g, runs in sorted(groups.items()):
        last = max(min(max(m) for m, _, _ in runs), 0)
        hs = [round(mean(m.get(s, float("nan")) for m, _, _ in runs), 1) for s in AT]
        gains = [round(m.get(last, 0) - m.get(last - 50, 0), 1) for m, _, _ in runs]
        tops = round(mean(t.get(last, 0) for _, t, _ in runs), 1)
        level = all(abs(x) < 2 for x in gains) and max(m.get(last, 0) for m, _, _ in runs) < 180
        out = {"variant": g, "seeds": len(runs), "last": last, "height": dict(zip(AT, hs)), "gain50": gains,
               "standTop": tops, "metamers": [l.get(last, 0) for _, _, l in runs], "levels": level}
        if full:
            out["series"] = [[round(m.get(s, float("nan")), 1) for s in range(10, last + 1, 10)] for m, _, _ in runs]
        print(json.dumps(out))


main(sys.argv[1] if len(sys.argv) > 1 else "runs/c1r2", "--series" in sys.argv)
