import json, sys, glob, collections, re
from pathlib import Path
S = Path(sys.argv[1])
key = {e["item"]+"|"+e["set"]: e for e in json.load(open(S/"keys-overseer/key.json"))}
bmap = {(m["batch"], m["name"]): m for m in json.load(open(S/"keys-overseer/batches.json"))}
rows = []
for f in sorted(glob.glob(str(S/"judge/answers/*.json"))):
    b, j = Path(f).stem.split("-")
    for a in json.load(open(f)):
        m = bmap.get((b, a["name"]))
        if not m: print("unknown", f, a["name"]); continue
        e = key[m["item"]+"|"+m["set"]]
        cue = a.get("cue","").lower()
        tex = bool(re.search(r"textur|thick|thin|line|detail|render|smooth|fine|stroke|noise|jag|chunk", cue))
        rows.append(dict(set=e["set"], regime=e["regime"], judge=f"{b}-{j}", pick=a["real"], real=e["real_side"],
                         correct=a["real"]==e["real_side"], conf=a.get("confidence"), tex=tex, cfg=e.get("other_cfg")))
print("answers:", len(rows), "files:", len(glob.glob(str(S/'judge/answers/*.json'))))
by = collections.defaultdict(list)
for r in rows: by[r["set"]].append(r)
print(f"{'set':28s} {'n':>4s} {'detect%':>8s} {'pickA%':>7s} {'conf':>5s} {'texcue%':>8s}")
for s in sorted(by, key=lambda s: (not s.startswith("cal"), s)):
    rs = by[s]; n = len(rs)
    print(f"{s:28s} {n:4d} {100*sum(r['correct'] for r in rs)/n:8.0f} {100*sum(r['pick']=='A' for r in rs)/n:7.0f} "
          f"{sum(r['conf'] or 0 for r in rs)/n:5.1f} {100*sum(r['tex'] for r in rs)/n:8.0f}")
if "--cues" in sys.argv:
    for f in sorted(glob.glob(str(S/"judge/answers/*.json"))):
        for a in json.load(open(f))[:6]: print(Path(f).stem, a["real"], a.get("confidence"), a.get("cue"))
