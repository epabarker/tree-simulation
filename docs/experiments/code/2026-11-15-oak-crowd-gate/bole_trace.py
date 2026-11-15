"""Why the guard's bare-bole cells fail at 66 cells under the gated oak (read-only, the guard's runs).

    python3 -I docs/experiments/code/2026-11-15-oak-crowd-gate/bole_trace.py runs/oak-garden-guard-k10 66

Reads metrics.csv of both arms (head, d16a13 = the gated patch), seeds 1-20. For beech and hornbeam
>= 10 m at 100/150/300, as the guard pools them: (A) who the trees are, (B) liveCrownBase at matched
height, (C) the same planted tree in both arms, (D) the change per garden against the change in oak,
(E) the stand around them. Heights in m (cells of 0.25 m).
"""
import csv, sys, statistics as st
from collections import defaultdict
from pathlib import Path

root, W = Path(sys.argv[1]), int(sys.argv[2])
ARMS, AT, SPECIES, CELL, TALL = ("head", "d16a13"), (100, 150, 300), ("beech", "hornbeam"), 0.25, 10.0
PLANTED = round(400 * W * 64 * 0.0625 / 10_000)
med = lambda v: st.median(v) if v else float("nan")

rows = defaultdict(list)  # (arm, seed, season) -> live trees
for arm in ARMS:
    for seed in range(1, 21):
        for r in csv.DictReader(open(root / arm / f"w{W}-s{seed}" / "metrics.csv")):
            s = int(float(r["season"]))
            if s in AT and r["alive"] == "1":
                rows[arm, seed, s].append(dict(tree=int(float(r["tree"])), sp=r["species"], h=float(r["height"]) * CELL,
                    age=float(r["age"]), lcb=float(r["liveCrownBase"]), gl=float(r["groundLight"]), q=float(r["meanBudQ"])))

def tall(arm, s, sp):
    return [(seed, t) for seed in range(1, 21) for t in rows[arm, seed, s] if t["sp"] == sp and t["h"] >= TALL]

print(f"width {W}, planted ids < {PLANTED}\n\nA. who the judged trees are (pooled over 20 gardens)")
print("cell            arm     n  planted  med h m  med age  med lcb  gardens with any")
for sp in SPECIES:
    for s in AT:
        for arm in ARMS:
            v = tall(arm, s, sp)
            print(f"{sp:9s}@{s:3d}  {arm:6s} {len(v):3d}  {sum(t['tree'] < PLANTED for _, t in v):5d}   {med([t['h'] for _, t in v]):6.1f}  {med([t['age'] for _, t in v]):6.0f}   {med([t['lcb'] for _, t in v]):.3f}   {len({g for g, _ in v})}")

print("\nB. median liveCrownBase by height band (n): head | gated")
BANDS = ((10, 15), (15, 20), (20, 25), (25, 99))
for sp in SPECIES:
    for s in AT:
        cells = []
        for lo, hi in BANDS:
            a = [t["lcb"] for _, t in tall("head", s, sp) if lo <= t["h"] < hi]
            b = [t["lcb"] for _, t in tall("d16a13", s, sp) if lo <= t["h"] < hi]
            cells.append(f"{lo}-{hi if hi < 99 else ''}: {med(a):.3f} ({len(a)}) | {med(b):.3f} ({len(b)})")
        print(f"{sp:9s}@{s:3d}  " + "   ".join(cells))

print("\nB2. by age band (n): head | gated")
AGES = ((0, 60), (60, 100), (100, 150), (150, 999))
for sp in SPECIES:
    for s in AT:
        cells = []
        for lo, hi in AGES:
            a = [t["lcb"] for _, t in tall("head", s, sp) if lo <= t["age"] < hi]
            b = [t["lcb"] for _, t in tall("d16a13", s, sp) if lo <= t["age"] < hi]
            if a or b:
                cells.append(f"age {lo}-{hi if hi < 999 else ''}: {med(a):.3f} ({len(a)}) | {med(b):.3f} ({len(b)})")
        print(f"{sp:9s}@{s:3d}  " + "   ".join(cells))

print("\nC. the same planted tree, >= 10 m in both arms: n, median lcb head, gated, median paired difference, lower/higher")
for sp in SPECIES:
    for s in AT:
        d = []
        for seed in range(1, 21):
            a = {t["tree"]: t for t in rows["head", seed, s] if t["sp"] == sp and t["h"] >= TALL and t["tree"] < PLANTED}
            b = {t["tree"]: t for t in rows["d16a13", seed, s] if t["sp"] == sp and t["h"] >= TALL and t["tree"] < PLANTED}
            d += [(a[i]["lcb"], b[i]["lcb"]) for i in a.keys() & b.keys()]
        if d:
            print(f"{sp:9s}@{s:3d}  n {len(d):2d}  {med([x for x, _ in d]):.3f}  {med([y for _, y in d]):.3f}  diff {med([y - x for x, y in d]):+.3f}  {sum(y < x for x, y in d)}/{sum(y > x for x, y in d)}")
        else:
            print(f"{sp:9s}@{s:3d}  n 0")

print("\nD. per garden at 150 and 300: oaks >= 10 m (head -> gated), tallest oak m, hornbeam+beech >= 10 m n and median lcb")
for s in (150, 300):
    more, same = [], []
    for seed in range(1, 21):
        o = {arm: [t["h"] for t in rows[arm, seed, s] if t["sp"] == "oak" and t["h"] >= TALL] for arm in ARMS}
        b = {arm: [t["lcb"] for t in rows[arm, seed, s] if t["sp"] in SPECIES and t["h"] >= TALL] for arm in ARMS}
        dl = med(b["d16a13"]) - med(b["head"]) if b["head"] and b["d16a13"] else float("nan")
        (more if len(o["d16a13"]) > len(o["head"]) else same).append(dl)
        print(f"  s{s} seed {seed:2d}: oaks {len(o['head'])} -> {len(o['d16a13'])}  tallest {max(o['head'], default=0):4.1f} -> {max(o['d16a13'], default=0):4.1f}   judged n {len(b['head']):2d} -> {len(b['d16a13']):2d}  lcb {med(b['head']):.3f} -> {med(b['d16a13']):.3f}  ({dl:+.3f})")
    f = lambda v: [x for x in v if x == x]
    print(f"  season {s}: gardens with more tall oaks under the gate: {len(more)}, median lcb change {med(f(more)):+.3f} (n {len(f(more))}); the rest: {len(same)}, {med(f(same)):+.3f} (n {len(f(same))})")

print("\nE. the stand, per garden medians over 20 gardens: head | gated")
for s in AT:
    def g(fn):
        return " | ".join(f"{med([fn(rows[arm, seed, s]) for seed in range(1, 21)]):.2f}" for arm in ARMS)
    print(f"  season {s}: live trees {g(len)}; trees >= 10 m {g(lambda v: sum(t['h'] >= TALL for t in v))}; "
          f"oaks >= 10 m {g(lambda v: sum(t['h'] >= TALL and t['sp'] == 'oak' for t in v))}; top height m {g(lambda v: max((t['h'] for t in v), default=0))}; "
          f"ground light at the judged trees {g(lambda v: med([t['gl'] for t in v if t['sp'] in SPECIES and t['h'] >= TALL]))}; "
          f"their mean bud light {g(lambda v: med([t['q'] for t in v if t['sp'] in SPECIES and t['h'] >= TALL]))}")
