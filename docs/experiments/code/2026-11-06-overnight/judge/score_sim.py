# usage: score_sim.py <key.json> <answers dir>  -> share choosing cfg1, by kind x regime (and by cfg pair)
import json, sys, glob, collections
from pathlib import Path
k = json.load(open(sys.argv[1])); items = {(i["batch"], i["name"].replace(".png", "")): i for i in k["items"]}
rows = []
for f in sorted(glob.glob(sys.argv[2] + "/*.json")):
    b = Path(f).stem.split("-")[0]
    for a in json.load(open(f)):
        i = items.get((b, a["file"].replace(".png", "")))
        if i is None: print("unknown", b, a["file"]); continue
        rows.append(dict(kind=i["kind"], regime=i["regime"], c1=str(i["cfg1"])[:40], c2=str(i["cfg2"])[:40],
                         won=a["pick"] == i["cfg1_side"], pickA=a["pick"] == "A", conf=a.get("conf", 0), cue=a.get("cue", "")))
print("answers", len(rows), "files", len(glob.glob(sys.argv[2] + "/*.json")))
g = collections.defaultdict(list)
for r in rows: g[(r["kind"], r["regime"])].append(r); g[(r["kind"], "all")].append(r)
for key in sorted(g):
    rs = g[key]; n = len(rs)
    print(f"{key[0]:16s} {key[1]:6s} n={n:3d} cfg1 chosen {100*sum(r['won'] for r in rs)/n:5.1f}%  pickA {100*sum(r['pickA'] for r in rs)/n:4.0f}%  conf {sum(r['conf'] for r in rs)/n:.1f}")
if "--pairs" in sys.argv:
    p = collections.defaultdict(list)
    for r in rows: p[(r["kind"], r["c1"], r["c2"])].append(r["won"])
    for key, v in sorted(p.items()): print(" ", key, f"{sum(v)}/{len(v)}")
