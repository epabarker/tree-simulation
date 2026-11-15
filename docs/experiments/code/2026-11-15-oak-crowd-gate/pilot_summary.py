"""ADR 0069's pilot: HEAD, d16a13 and d16a13 + r2.dLambdaCrowd 10 in the garden, read per planted oak.

    python3 -I docs/experiments/code/2026-11-15-oak-crowd-gate/pilot_summary.py runs/oak-crowd-gate/pilot

The pilot's statistic is f = (gate's median peak height − d16a13's) / (HEAD's − d16a13's) over the
planted oaks (the same tree ids in the three arms of a garden). Heights are cells of 0.25 m.
Reported beside it: the last live season, oaks reaching r1.maturity (32.5 m), oaks alive and
seeding at 150, the shade and the gate the gated oaks read, and the leader's axis switches.
"""
import csv
import statistics as st
import sys
from pathlib import Path

d = Path(sys.argv[1])
ARMS = ("head", "d16a13", "gate")
CELL, MATURITY, AC = 0.25, 32.5, 13.5


def load(p):
    trees = {}
    for r in csv.DictReader(open(p)):
        if r["alive"] == "1":
            trees.setdefault(int(r["tree"]), {})[int(float(r["season"]))] = r
    return trees


def switches(ss, upto):
    axes = [ss[x]["leaderAxis"] for x in sorted(ss) if x <= upto]
    return sum(a != b for a, b in zip(axes, axes[1:]))


peaks = {a: [] for a in ARMS}
last = {a: [] for a in ARMS}
print("garden   tree | peak height m: head  d16a13  gate | last live season: head d16a13 gate | leader switches to 60: head d16a13 gate")
gate_rows = []
for w in (160, 66):
    for s in (1, 2, 3):
        t = {a: load(d / f"{a}-w{w}-s{s}.csv") for a in ARMS}
        ids = sorted(set(t["head"]) | set(t["d16a13"]) | set(t["gate"]))
        for i in ids:
            row = {}
            for a in ARMS:
                ss = t[a].get(i, {})
                pk = max((float(r["height"]) for r in ss.values()), default=0.0) * CELL
                row[a] = (pk, max(ss, default=-1), switches(ss, 60))
                peaks[a].append(pk)
                last[a].append(max(ss, default=-1))
                if a == "gate":
                    gate_rows += [(float(r["age"]), float(r["crowd"]), float(r["gate"]), float(r["gatedFall"]), float(r["fall"])) for r in ss.values()]
            print(f"w{w}-s{s} {i:4d} |  {row['head'][0]:5.1f}  {row['d16a13'][0]:5.1f}  {row['gate'][0]:5.1f} | {row['head'][1]:4d} {row['d16a13'][1]:4d} {row['gate'][1]:4d} | {row['head'][2]:3d} {row['d16a13'][2]:3d} {row['gate'][2]:3d}")

n = len(peaks["head"])
med = {a: st.median(peaks[a]) for a in ARMS}
print(f"\nplanted oaks: {n}")
print("median peak height, m: " + ", ".join(f"{a} {med[a]:.1f}" for a in ARMS))
f = (med["gate"] - med["d16a13"]) / (med["head"] - med["d16a13"])
print(f"f = ({med['gate']:.1f} - {med['d16a13']:.1f}) / ({med['head']:.1f} - {med['d16a13']:.1f}) = {f:.2f}")
better = sum(g > p for g, p in zip(peaks["gate"], peaks["d16a13"]))
print(f"oaks whose peak is higher under the gate than under d16a13: {better} of {n}; at or above HEAD's: {sum(g >= h for g, h in zip(peaks['gate'], peaks['head']))} of {n}")
for a in ARMS:
    print(f"{a:7s}: reach {MATURITY} m: {sum(p >= MATURITY for p in peaks[a])} of {n}; alive at 150: {sum(x >= 150 for x in last[a])}; alive at 299: {sum(x >= 299 for x in last[a])}; median last live season {st.median(last[a]):.0f}")

# Seeding: a live planted oak with seeds > 0, by garden, at 150 (the guard's reading) and ever.
print("\ngardens with a seeding planted oak (seeds > 0): at season 150 | ever")
for a in ARMS:
    at150 = ever = 0
    for w in (160, 66):
        for s in (1, 2, 3):
            tt = load(d / f"{a}-w{w}-s{s}.csv")
            at150 += any(150 in ss and float(ss[150]["seeds"]) > 0 for ss in tt.values())
            ever += any(float(r["seeds"]) > 0 for ss in tt.values() for r in ss.values())
    print(f"  {a:7s}: {at150} of 6 | {ever} of 6")

print("\nunder the gate, by age: mean neighbour shade median [min-max]; share of tree-seasons with the fall fully off (g = 0); median fall applied / ungated")
for lo, hi in ((AC, 20), (20, 30), (30, 45), (45, 60), (60, 90), (90, 150), (150, 301)):
    v = [r for r in gate_rows if lo < r[0] <= hi]
    if v:
        print(f"  age {lo:>5}-{hi:<3}: {st.median(r[1] for r in v):.3f} [{min(r[1] for r in v):.3f}-{max(r[1] for r in v):.3f}]  g=0 in {sum(r[2] == 0 for r in v) / len(v):.2f}  fall {st.median(r[3] for r in v):.3f} / {st.median(r[4] for r in v):.3f}  n={len(v)}")
