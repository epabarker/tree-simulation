"""#104, before against after: reads <dir>/<species>-<base|fix>-<seed>.json (lowlimb.ts) and prints,
per species and season, the medians over the seeds present in both builds and the paired moves.
  python3 summary.py <dir>"""
import json, sys, glob, os, statistics as st
d = sys.argv[1]
runs = {}
for f in glob.glob(os.path.join(d, "*-*-*.json")):
    sp, build, seed = os.path.basename(f)[:-5].split("-")
    runs[(sp, build, int(seed))] = json.load(open(f))
KEYS = ["heightM", "widthM", "boleM", "boleLimb", "boleLeaf", "crownRatio", "metamers", "shed", "resting", "lowBuds", "lowQ", "outside"]
med = lambda xs: st.median(xs) if xs else float("nan")
for sp in sorted({k[0] for k in runs}):
    seeds = sorted(s for (a, b, s) in runs if a == sp and b == "base" and (sp, "fix", s) in runs)
    same = sum(runs[(sp, "base", s)]["hash"] == runs[(sp, "fix", s)]["hash"] for s in seeds)
    print(f"\n## {sp}: {len(seeds)} seeds; hash unchanged in {same}")
    seasons = [r["season"] for r in runs[(sp, "base", seeds[0])]["rows"]]
    for k, season in enumerate(seasons):
        rows = {b: [runs[(sp, b, s)]["rows"][k] for s in seeds if len(runs[(sp, b, s)]["rows"]) > k and len(runs[(sp, "fix" if b == "base" else "base", s)]["rows"]) > k] for b in ("base", "fix")}
        n = len(rows["base"])
        print(f"season {season} (n={n})")
        for key in KEYS:
            a = [r[key] for r in rows["base"] if r[key] is not None]
            b = [r[key] for r in rows["fix"] if r[key] is not None]
            pairs = [(x[key], y[key]) for x, y in zip(rows["base"], rows["fix"]) if x[key] is not None and y[key] is not None]
            up = sum(y > x for x, y in pairs); down = sum(y < x for x, y in pairs)
            print(f"  {key:11s} median {med(a):10.3f} -> {med(b):10.3f}   range {min(a):.3f}..{max(a):.3f} -> {min(b):.3f}..{max(b):.3f}   up {up} down {down} same {len(pairs)-up-down}")
        print(f"  seeds with resting buds: {sum(r['resting']>0 for r in rows['base'])} -> {sum(r['resting']>0 for r in rows['fix'])}")
