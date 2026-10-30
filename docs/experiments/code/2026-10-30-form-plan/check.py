"""The Form plan's readings (docs/plans/2026-10-30-form.md §0), from run.sh's runs.

    python3 docs/experiments/code/2026-10-30-form-plan/check.py runs/form-plan
"""

import csv
import math
import sys
from collections import defaultdict
from statistics import mean, median

d = sys.argv[1] if len(sys.argv) > 1 else "runs/form-plan"
SEEDS = (1, 2, 3)
PLANTED = 30


def metrics(run):
    return {(int(float(r["season"])), int(r["tree"])): r for r in csv.DictReader(open(f"{run}/metrics.csv"))}


def at(run, name, season):
    return [r for r in csv.DictReader(open(f"{run}/{name}")) if int(float(r["season"])) == season]


# §0.1: R1 under r0 ÷ 8, m_w × 64 (R3 off): every count and cost the same, the trunk ÷ 8.
print("§0.1 lone oak, R3 off, 60 seasons: base against r0 ÷ 8, m_w × 64")
for s in SEEDS:
    a, b = metrics(f"{d}/inv/base-s{s}"), metrics(f"{d}/inv/k8-s{s}")
    cols = ("production", "maintenance", "height", "metamers", "buds", "vBase", "reserve", "shed")
    diff = [c for c in cols if any(a[k][c] != b[k].get(c) for k in a)]
    k = (max(a)[0], 0)
    ra, rb = float(a[k]["trunkRadius"]), float(b[k]["trunkRadius"])
    print(f"  seed {s}: columns that differ: {diff or 'none'}; trunk {ra:.4f} -> {rb:.5f} (÷ {ra / rb:.3f}); "
          f"H/D {float(a[k]['slenderness']):.1f} -> {float(b[k]['slenderness']):.1f}")

# §0.2: the sky's bands (slab_sweep.rs:80).
lo = math.sin(math.radians(15))
for f in (0.0, 0.5, 1.0):
    s_ = [lo + (1 - lo) * (i + f) / 16 for i in range(16)]
    print(f"§0.2 K 16, band offset {f}: top direction {math.degrees(math.asin(min(1, s_[-1]))):.1f}°, "
          f"weight share {s_[-1] / sum(s_):.3f}")


def trunk_split(rows, tree, r0):
    """The root's pipe² (radius − stress wood, squared) against its childless metamers' r0² each (C6's
    tips): the rest is scars and memory."""
    mine = [r for r in rows if int(r["tree"]) == tree]
    parents = {r["parentBirthId"] for r in mine}
    tips = sum(1 for r in mine if r["birthId"] not in parents)
    root = next(r for r in mine if r["parentBirthId"] == "-1")
    rad, sw = float(root["radius"]), float(root["stressWood"])
    pipe = (rad - sw) ** 2
    return rad, sw, pipe, tips * r0**2


def stand(group, v, season, r0=None, root=d):
    hs, hd, tr, cw, buds, p, alive, mets = [], [], [], [], [], [], 0, 0
    floor, lai, prof = [], [], defaultdict(list)
    for s in SEEDS:
        run = f"{root}/{group}/{v}-s{s}"
        for r in at(run, "metrics.csv", season):
            if r["alive"] != "1":
                continue
            mets += float(r["metamers"])
            if int(r["tree"]) < PLANTED:
                alive += 1
                hs.append(float(r["height"])); hd.append(float(r["slenderness"]))
                tr.append(float(r["trunkRadius"])); cw.append(float(r["crownWidth"]))
                buds.append(float(r["buds"])); p.append(float(r["production"]))
        try:
            for r in at(run, "ground.csv", season):
                floor.append(float(r["q"])); lai.append(float(r["lai"]))
            for r in at(run, "light.csv", season):
                prof[int(r["row"])].append(1 - float(r["shade"]))
        except FileNotFoundError:
            pass
    line = (f"  {group}/{v} s{season}: metamers/seed {mets / 3:,.0f}; planted alive {alive}/90; median height "
            f"{median(hs):.1f}, H/D {median(hd):.1f}, trunk r {median(tr):.2f}, crown width {median(cw):.1f}, "
            f"buds {median(buds):.0f}, P {median(p):.0f}, P/bud {median(x / y for x, y in zip(p, buds) if y):.2f}")
    if floor:
        gaps = [q for q, l in zip(floor, lai) if l < 1]
        under = [q for q, l in zip(floor, lai) if l >= 1]
        line += (f"\n      floor {mean(floor):.3f} (gaps {mean(gaps):.3f}, under LAI ≥ 1 {mean(under):.3f}); "
                 f"gap fraction {len(gaps) / len(floor):.0%}; stand LAI {mean(lai):.1f} (under crowns "
                 f"{mean(l for l in lai if l >= 1):.1f}); light by row 0/20/40/50/60/70/80/90: "
                 + " ".join(f"{mean(prof[y]):.2f}" for y in (0, 20, 40, 50, 60, 70, 80, 90)))
    print(line)
    if r0:
        rows = at(f"{root}/{group}/{v}-s1", "metamers.csv", season)
        for t in sorted({int(r["tree"]) for r in rows})[:3]:
            rad, sw, pipe, tip_area = trunk_split(rows, t, r0)
            print(f"      seed 1 tree {t}: trunk r {rad:.2f} (stress wood {sw:.3f}); pipe² {pipe:.2f}: "
                  f"tips {tip_area:.3f}, scars and memory {pipe - tip_area:.2f} ({1 - tip_area / pipe:.0%})")


print("§0.4–0.5 `forest`, 3 seeds")
for v, r0 in (("base", 0.02), ("k7", 0.002857), ("tau0", 0.02)):
    for season in (100, 150):
        stand("diag", v, season, r0 if season == 150 else None)
print("§0.4 R3 ablations at k 8, `forest`, 100 seasons")
for v in ("k8", "nosag", "nopost", "nogirth"):
    stand("r3", v, 100)
print("§0.4 the scar fix (scars record radius − stress wood), `forest`, 3 seeds")
for v, r0 in (("base", 0.02), ("k8", 0.0025)):
    for season in (100, 150):
        stand("diag", v, season, r0 if season == 150 else None, root=f"{d}/scar")
