"""Seed supply by species (#121's second probe round; EXPLORATORY, seeds 1-3): each species'
reproductive params as the runs used them (record.json's species patches over the world's), and
from metrics.csv its seeding tree-seasons, seeds made (the `seeds` column), seeds per seeding
tree-season, reproductive carbon (`reproduction`) and recruits (trees born after the planting).

    python3 docs/experiments/code/2026-11-10-garden-schedule/seeds.py runs/garden-schedule/r6/w160-s1 ...
"""

import collections
import csv
import json
import sys

agg = collections.defaultdict(lambda: collections.Counter())
params = None
for run in sys.argv[1:]:
    p = json.load(open(f"{run}/record.json"))["params"]
    params = params or p
    w, d = p["world"]["width"], p["world"].get("depth", 64)
    n = round(400 * w * d * 0.0625 / 10_000)
    born = set()
    for r in csv.DictReader(open(f"{run}/metrics.csv")):
        if r["alive"] != "1":
            continue
        a = agg[r["species"]]
        seeds = float(r["seeds"] or 0)
        a["treeSeasons"] += 1
        if seeds > 0:
            a["seedingTreeSeasons"] += 1
            a["seeds"] += seeds
            a["reproduction"] += float(r["reproduction"] or 0)
        if int(r["tree"]) >= n and r["tree"] not in born:
            born.add(r["tree"])
            a["recruits"] += 1

world_r1, world_o4 = params["r1"], params["o4"]
print("species | fRep | maturity (cells) | cSeed | d | qEst | pEst | seeding tree-seasons | seeds | "
      "seeds per seeding tree-season | reproduction per seeding tree-season | recruits")
for sp, a in sorted(agg.items(), key=lambda kv: -kv[1]["seeds"]):
    s = params["species"].get(sp, {})
    r1 = {**world_r1, **s.get("r1", {})}
    o4 = {**world_o4, **s.get("o4", {})}
    k = max(1, a["seedingTreeSeasons"])
    print(f"{sp} | {r1.get('fRep')} | {r1.get('maturity')} | {o4.get('cSeed')} | {o4.get('d')} | "
          f"{o4.get('qEst')} | {o4.get('pEst')} | {a['seedingTreeSeasons']} | {a['seeds']:.0f} | "
          f"{a['seeds'] / k:.0f} | {a['reproduction'] / k:.0f} | {a['recruits']}")
