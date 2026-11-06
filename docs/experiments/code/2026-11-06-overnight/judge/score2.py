# usage: score2.py <key.json with batch,name> <answers dir>
import json, sys, glob, collections, re
from pathlib import Path
key = {(e["batch"], e["name"]): e for e in json.load(open(sys.argv[1]))}
rows = []
for f in sorted(glob.glob(sys.argv[2] + "/*.json")):
    b = Path(f).stem.split("-")[0]
    for a in json.load(open(f)):
        e = key.get((b, a["name"]))
        if not e: print("unknown", b, a["name"]); continue
        rows.append(dict(set=e["set"], correct=a["real"] == e["real_side"], pick=a["real"], conf=a.get("confidence") or 0, cue=a.get("cue", "")))
print("answers", len(rows))
by = collections.defaultdict(list)
for r in rows: by[r["set"]].append(r)
print(f"{'set':26s} {'n':>3s} {'detect%':>8s} {'pickA%':>7s} {'conf':>5s}")
for s in sorted(by, key=lambda s: (not s.startswith("cal"), s)):
    rs = by[s]; n = len(rs)
    print(f"{s:26s} {n:3d} {100*sum(r['correct'] for r in rs)/n:8.0f} {100*sum(r['pick']=='A' for r in rs)/n:7.0f} {sum(r['conf'] for r in rs)/n:5.1f}")
if "--cues" in sys.argv:
    for s in sorted(by):
        if s.startswith("cand"): print("--", s); [print("   ", r["correct"], r["cue"]) for r in by[s][:4]]
