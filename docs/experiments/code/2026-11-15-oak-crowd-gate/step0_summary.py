"""ADR 0069, step 0: the futility test on the crowd probe's CSVs.

    python3 -I docs/experiments/code/2026-11-15-oak-crowd-gate/step0_summary.py runs/oak-crowd-gate/step0

Per planted oak (same tree id in HEAD's and d16a13's garden): the divergence season (first season
its d16a13 height is >= 10% below HEAD's), the largest mean neighbour shade it read from aC to
then, and whether that reaches 0.05 (g <= 0.5 at k 10). Heights are cells of 0.25 m.
"""
import csv, sys, statistics as st
from pathlib import Path

d = Path(sys.argv[1])
AC, BAR, CELL = 13.5, 0.05, 0.25

def load(p):
    trees = {}
    for r in csv.DictReader(open(p)):
        if r["alive"] == "1":
            trees.setdefault(int(r["tree"]), {})[int(float(r["season"]))] = r
    return trees

rows, can = [], 0
print("garden      tree  div  lastH lastD  crowd@aC  max crowd aC..div (season)  seasons>=0.05  H@div head/d16 m  peak head/d16 m  leaderOrder@div head/d16")
for w in (160, 66):
    for s in (1, 2, 3):
        h, p = load(d / f"head-w{w}-s{s}.csv"), load(d / f"d16a13-w{w}-s{s}.csv")
        for t in sorted(set(h) & set(p)):
            ht, pt = h[t], p[t]
            div = None
            for x in sorted(pt):
                if x in ht and float(pt[x]["age"]) > AC and float(pt[x]["height"]) <= 0.9 * float(ht[x]["height"]):
                    div = x; break
            end = div if div is not None else min(max(pt), max(ht))
            win = [x for x in sorted(pt) if float(pt[x]["age"]) > AC and x <= end]
            at_ac = next((float(pt[x]["crowd"]) for x in sorted(pt) if float(pt[x]["age"]) > AC), float("nan"))
            mx, mxs = max(((float(pt[x]["crowd"]), x) for x in win), default=(float("nan"), -1))
            n = sum(float(pt[x]["crowd"]) >= BAR for x in win)
            ok = n > 0
            can += ok
            ph, pp = max(float(r["height"]) for r in ht.values()) * CELL, max(float(r["height"]) for r in pt.values()) * CELL
            rows.append((w, s, t, div, mx, ok, ph, pp))
            hd = f'{float(ht[end]["height"])*CELL:.1f}/{float(pt[end]["height"])*CELL:.1f}' if end in ht else "-"
            lo = f'{ht[end]["leaderOrder"]}/{pt[end]["leaderOrder"]}' if end in ht else "-"
            print(f"w{w}-s{s}  {t:4d}  {str(div):>4} {max(ht):5d} {max(pt):5d}  {at_ac:8.4f}  {mx:8.4f} ({mxs:3d})          {n:3d} of {len(win):3d}   {hd:>12}   {ph:5.1f}/{pp:5.1f}   {lo}")
print(f"\nplanted oaks: {len(rows)}; diverged: {sum(r[3] is not None for r in rows)}; gate can act (crowd >= {BAR} in aC..divergence): {can} of {len(rows)}")
print(f"median peak height, m: HEAD {st.median(r[6] for r in rows):.1f}, d16a13 {st.median(r[7] for r in rows):.1f}")
# the shade every planted oak reads, by age band, both arms pooled per arm
for arm in ("head", "d16a13"):
    print(f"\n{arm}: mean neighbour shade of live planted oaks, by age (median [min-max], n tree-seasons; share >= 0.05, >= 0.1)")
    vals = {}
    for w in (160, 66):
        for s in (1, 2, 3):
            for t, ss in load(d / f"{arm}-w{w}-s{s}.csv").items():
                for x, r in ss.items():
                    a = float(r["age"])
                    b = next(k for k in (10, 14, 20, 30, 45, 60, 90, 150) if a < k or k == 150)
                    vals.setdefault(b, []).append(float(r["crowd"]))
    for b in sorted(vals):
        v = vals[b]
        print(f"  age < {b:3d}: {st.median(v):.4f} [{min(v):.4f}-{max(v):.4f}] n={len(v):4d}  {sum(x>=.05 for x in v)/len(v):.2f}  {sum(x>=.1 for x in v)/len(v):.2f}")
