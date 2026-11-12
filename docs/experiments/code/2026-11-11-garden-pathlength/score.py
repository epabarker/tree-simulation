"""The path-length probe's garden table (#121; EXPLORATORY). Per sweep.ts round, against the bars:

- desktop (160 cells): >= 120 canopy trees/ha in every season from 100 (8 trees on the 0.064 ha
  plot); drawn stems 200-400/ha at seasons 100/200/300; >= 60% of drawn stems in the canopy; no
  species above 70% of drawn stems; a canopy tree in every season after 50; the cap never reached;
- phone (66 cells), as amended 2026-11-11: >= 1 canopy tree in every season from 100, a canopy
  tree in every season after 50 (no gap), the cap never reached, no species above 70% at
  100/200/300.

Every count is the core's own stand.csv / stand-species.csv, as occupancy.py reads them. With
allometry.csv beside a run (dbh.py), the canopy trees' median DBH, height and crown diameter at
seasons 100 and 200 are added.

    python3 docs/experiments/code/2026-11-11-garden-pathlength/score.py <round> ... [--runs] [--seeds 1-20]
"""

import collections
import csv
import json
import statistics as st
import sys
from pathlib import Path

ROOT = Path("runs/garden-schedule")
AT = (100, 200, 300)


def run_stats(run: Path):
    params = json.load(open(run / "record.json"))["params"]
    width, depth = params["world"]["width"], params["world"].get("depth", 64)
    ha = width * depth * 0.0625 / 10_000
    stand = {int(r["season"]): r for r in csv.DictReader(open(run / "stand.csv"))}
    spp = collections.defaultdict(dict)
    for r in csv.DictReader(open(run / "stand-species.csv")):
        spp[int(r["season"])][r["species"]] = float(r["share"])
    drawn = {s: int(stand[s]["drawn"]) for s in AT}
    canopy = {s: int(stand[s]["canopy"]) for s in AT}
    after50 = [int(r["canopy"]) for s, r in stand.items() if s > 50]
    from100 = [int(r["canopy"]) for s, r in stand.items() if s >= 100]
    x = dict(
        width=width, ha=ha, drawn=drawn, canopy=canopy,
        perHa={s: drawn[s] / ha for s in AT},
        share={s: canopy[s] / drawn[s] if drawn[s] else 0.0 for s in AT},
        top={s: max(spp[s].items(), key=lambda kv: kv[1], default=("-", 0.0)) for s in AT},
        hornbeam=[spp[s].get("hornbeam", 0.0) for s in AT],
        nogap=min(after50) >= 1, min100=min(from100), medHa=st.median(from100) / ha,
        cap=sum(int(r["capReached"]) > 0 for r in stand.values()),
        topHeight={s: float(stand[s]["topHeight"]) * 0.25 for s in AT},
        crowns={},
    )
    if (run / "allometry.csv").exists():
        rows = collections.defaultdict(list)
        for r in csv.DictReader(open(run / "allometry.csv")):
            rows[int(r["season"])].append(r)
        for s in (100, 200):
            can = [r for r in rows[s] if float(r["height_m"]) > x["topHeight"][s] / 2]
            if can:
                x["crowns"][s] = tuple(
                    st.median(f(r) for r in can)
                    for f in (lambda r: float(r["dbh_cm"]), lambda r: float(r["height_m"]), lambda r: 2 * float(r["cr_m"]))
                )
    if width >= 100:
        b = dict(
            can120=x["min100"] / ha >= 120,
            band=sum(200 <= x["perHa"][s] <= 400 for s in AT),
            share=sum(x["share"][s] >= 0.6 for s in AT),
            mix=sum(x["top"][s][1] <= 0.7 for s in AT),
        )
        b["ok"] = b["can120"] and b["band"] == 3 and b["share"] == 3 and b["mix"] == 3 and x["nogap"] and x["cap"] == 0
    else:
        b = dict(one=x["min100"] >= 1, mix=sum(x["top"][s][1] <= 0.7 for s in AT))
        b["ok"] = b["one"] and b["mix"] == 3 and x["nogap"] and x["cap"] == 0
    x["bars"] = b
    return x


def med(v, nd=0):
    v = [a for a in v if a is not None]
    return f"{st.median(v):.{nd}f}" if v else "–"


def main():
    argv = sys.argv[1:]
    seeds = range(1, 4)
    if "--seeds" in argv:
        i = argv.index("--seeds")
        a, b = argv[i + 1].split("-")
        seeds = range(int(a), int(b) + 1)
        del argv[i : i + 2]
    per_run = "--runs" in argv
    rounds = [a for a in argv if not a.startswith("--")]
    n = len(seeds)
    print(f"| condition | 160: canopy ≥ 120/ha from 100 (runs of {n}) | band / canopy share / mix (frames of {3 * n}) | no gap, cap-free | 160 runs passing | canopy/ha 160: median, min from 100 | 66: ≥ 1 canopy from 100, no gap, cap-free | 66 mix (frames of {3 * n}) | 66 runs passing | canopy trees at 100, 160: median DBH (cm) / height (m) / crown diameter (m) | hornbeam share 160 / 66 |")
    print("|---|---|---|---|---|---|---|---|---|---|---|")
    for rnd in rounds:
        rows = {}
        for w in (160, 66):
            for seed in seeds:
                run = ROOT / rnd / f"w{w}-s{seed}"
                if (run / "hash.txt").exists():
                    rows[(w, seed)] = run_stats(run)
        d = [rows[k] for k in sorted(rows) if k[0] == 160]
        p = [rows[k] for k in sorted(rows) if k[0] == 66]
        cr = [x["crowns"].get(100) for x in d]
        crowns = " / ".join(med([c[k] for c in cr if c], nd) for k, nd in ((0, 0), (1, 1), (2, 1)))
        print(
            f"| {rnd} | {sum(x['bars']['can120'] for x in d)} | "
            f"{sum(x['bars']['band'] for x in d)} / {sum(x['bars']['share'] for x in d)} / {sum(x['bars']['mix'] for x in d)} | "
            f"{sum(x['nogap'] for x in d)}, {sum(x['cap'] == 0 for x in d)} | {sum(x['bars']['ok'] for x in d)} of {len(d)} | "
            f"{med([x['medHa'] for x in d])}, {med([x['min100'] / x['ha'] for x in d])} | "
            f"{sum(x['bars']['one'] for x in p)}, {sum(x['nogap'] for x in p)}, {sum(x['cap'] == 0 for x in p)} | "
            f"{sum(x['bars']['mix'] for x in p)} | {sum(x['bars']['ok'] for x in p)} of {len(p)} | {crowns} | "
            f"{med([h for x in d for h in x["hornbeam"]], 2)} / {med([h for x in p for h in x["hornbeam"]], 2)} |"
        )
        if per_run:
            for (w, seed), x in sorted(rows.items()):
                fr = "; ".join(
                    f"{x['drawn'][s]} ({x['perHa'][s]:.0f}/ha), canopy {x['canopy'][s]}, {x['top'][s][0]} {100 * x['top'][s][1]:.0f}%, top {x['topHeight'][s]:.0f} m"
                    for s in AT
                )
                print(f"|   {w} s{seed} | {fr} | min canopy from 100: {x['min100']}, cap seasons {x['cap']}, {'PASS' if x['bars']['ok'] else 'fail'} |")


main()
