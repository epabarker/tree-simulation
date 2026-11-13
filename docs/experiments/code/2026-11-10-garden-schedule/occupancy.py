"""The crown-occupancy probe's table (#121; docs/experiments/2026-11-11-garden-crown-occupancy.md;
EXPLORATORY). Per sweep.ts round, judged against the bars as the user amended them (2026-11-11):

- desktop (160 cells) carries the per-hectare bars: drawn stems 200-400/ha at seasons
  100/200/300, >= 60% of drawn stems in the canopy, a canopy tree in every season after 50, the
  cap never reached, no species above 70% of drawn stems;
- phone (66 cells): at least 2 canopy trees in every season from 100, a canopy tree in every
  season after 50, the cap never reached, no species above 70% at 100/200/300.

Also: canopy trees/ha (median over seasons 100-300), the canopy trees' median robust crown width
(the 5-95% spread of their metamer tips in x, cells; 4 cells = 1 m) at each season metamers.csv
holds, summed crown ellipse area (pi/4 W D, metrics.csv crownWidth/crownDepth) over the plot at
25/50/100, hornbeam's median share at 100/200/300, and the planted cohort's fate (as fate.py).

    python3 docs/experiments/code/2026-11-10-garden-schedule/occupancy.py <round> ... [--runs] [--json out.json]
"""

import collections
import csv
import json
import math
import statistics as st
import sys
from pathlib import Path

ROOT = Path("runs/garden-schedule")
AT = (100, 200, 300)


def quantile(v, q):
    v = sorted(v)
    return v[min(len(v) - 1, max(0, math.ceil(q * len(v)) - 1))]


def run_stats(run: Path):
    params = json.load(open(run / "record.json"))["params"]
    width, depth = params["world"]["width"], params["world"].get("depth", 64)
    ha = width * depth * 0.0625 / 10_000
    n_planted = round(400 * ha)
    stand = {int(r["season"]): r for r in csv.DictReader(open(run / "stand.csv"))}
    top = {s: float(r["topHeight"]) for s, r in stand.items()}
    spp = collections.defaultdict(dict)
    for r in csv.DictReader(open(run / "stand-species.csv")):
        spp[int(r["season"])][r["species"]] = float(r["share"])
    # metrics: canopy crowns and the planted cohort.
    crowns = collections.defaultdict(list)  # season -> [(tree, W, D)]
    last, dead = {}, {}
    canopy_ids = collections.defaultdict(set)
    with open(run / "metrics.csv") as f:
        for r in csv.DictReader(f):
            s = int(r["season"])
            t = r["tree"]
            alive = r["alive"] == "1"
            if alive and float(r["height"]) > top.get(s, 0) / 2:
                crowns[s].append((t, float(r["crownWidth"]), float(r["crownDepth"])))
                canopy_ids[s].add(t)
            if int(t) < n_planted:
                if alive:
                    last[t] = r
                elif t in last and t not in dead:
                    dead[t] = r
    fate = collections.Counter()
    for i in range(n_planted):
        t = str(i)
        if t not in last:
            continue
        if t not in dead:
            fate["alive"] += 1
            continue
        d, lv = dead[t], last[t]
        cause = ("thrown" if float(d["broken"] or 0) > 0
                 else "starved" if float(d["starved"] or 0) > float(lv["starved"] or 0) else "o4")
        size = "canopy" if float(lv["height"]) > top.get(int(lv["season"]), 0) / 2 else "below"
        fate[f"{cause}-{size}"] += 1
    area = width * depth
    cover = {s: sum(math.pi / 4 * w * d for _, w, d in crowns[s]) / area for s in (25, 50, 100)}
    # Robust widths from metamer tips at the seasons metamers.csv holds.
    tips = collections.defaultdict(list)
    with open(run / "metamers.csv") as f:
        for r in csv.DictReader(f):
            s = int(r["season"])
            if r["tree"] in canopy_ids[s]:
                tips[(s, r["tree"])].append(float(r["x1"]))
    robust = {}
    for s in AT:
        ws = [quantile(xs, 0.95) - quantile(xs, 0.05) for (ss, _), xs in tips.items() if ss == s and len(xs) >= 20]
        if ws:
            robust[s] = st.median(ws)
    drawn = {s: int(stand[s]["drawn"]) for s in AT}
    canopy = {s: int(stand[s]["canopy"]) for s in AT}
    top_share = {s: max(spp[s].values(), default=0.0) for s in AT}
    top_sp = {s: max(spp[s], key=spp[s].get) if spp[s] else "-" for s in AT}
    after50 = [int(r["canopy"]) for s, r in stand.items() if s > 50]
    from100 = [int(r["canopy"]) for s, r in stand.items() if s >= 100]
    cap_seasons = sum(int(r["capReached"]) > 0 for r in stand.values())
    can_ha = st.median(int(r["canopy"]) / ha for s, r in stand.items() if 100 <= s <= 300)
    return dict(
        width=width, ha=ha, drawn=drawn, perHa={s: drawn[s] / ha for s in AT},
        canopyShare={s: canopy[s] / drawn[s] if drawn[s] else 0.0 for s in AT},
        topShare=top_share, topSp=top_sp, hornbeam={s: spp[s].get("hornbeam", 0.0) for s in AT},
        nogap=min(after50) >= 1, min100=min(from100), capSeasons=cap_seasons, canopyHa=can_ha,
        robust=robust, cover=cover, fate=dict(fate), canopy=canopy,
        canopy25=len(crowns[25]), canopy50=len(crowns[50]),
    )


def bars(x):
    if x["width"] >= 100:
        band = sum(200 <= x["perHa"][s] <= 400 for s in AT)
        share = sum(x["canopyShare"][s] >= 0.6 for s in AT)
        mix = sum(x["topShare"][s] <= 0.7 for s in AT)
        ok = band == 3 and share == 3 and mix == 3 and x["nogap"] and x["capSeasons"] == 0
        return dict(band=band, share=share, mix=mix, nogap=x["nogap"], capfree=x["capSeasons"] == 0, pass_=ok)
    mix = sum(x["topShare"][s] <= 0.7 for s in AT)
    two = x["min100"] >= 2
    ok = two and x["nogap"] and x["capSeasons"] == 0 and mix == 3
    return dict(two=two, mix=mix, nogap=x["nogap"], capfree=x["capSeasons"] == 0, pass_=ok)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    out_json = sys.argv[sys.argv.index("--json") + 1] if "--json" in sys.argv else None
    if out_json:
        args = [a for a in args if a != out_json]
    per_run = "--runs" in sys.argv
    dump = {}
    print("| condition | 160: band / canopy >= 0.6 / mix (frames of 9), no gap, cap-free, runs passing | 66: >= 2 canopy from 100, no gap, cap-free, mix (frames of 9), runs passing | canopy/ha 160 / 66 | robust crown width, canopy, 160 (m) at 100/200/300 | crown area / plot at 25/50/100 (160) | hornbeam 160 / 66 |")
    print("|---|---|---|---|---|---|---|")
    for rnd in args:
        rows = {}
        for w in (160, 66):
            for seed in (1, 2, 3):
                run = ROOT / rnd / f"w{w}-s{seed}"
                if (run / "stand.csv").exists():
                    rows[(w, seed)] = run_stats(run)
        d = [rows[k] for k in sorted(rows) if k[0] == 160]
        p = [rows[k] for k in sorted(rows) if k[0] == 66]
        bd, bp = [bars(x) for x in d], [bars(x) for x in p]
        def m(v):
            v = [x for x in v if x == x]
            return st.median(v) if v else float("nan")
        rob = "/".join(f"{m([x['robust'].get(s, float('nan')) for x in d]) / 4:.1f}" for s in AT)
        cov = "/".join(f"{m([x['cover'][s] for x in d]):.2f}" for s in (25, 50, 100))
        desk = (f"{sum(b['band'] for b in bd)} / {sum(b['share'] for b in bd)} / {sum(b['mix'] for b in bd)}, "
                f"{sum(b['nogap'] for b in bd)}/3, {sum(b['capfree'] for b in bd)}/3, {sum(b['pass_'] for b in bd)}/3")
        phone = (f"{sum(b['two'] for b in bp)}/3, {sum(b['nogap'] for b in bp)}/3, {sum(b['capfree'] for b in bp)}/3, "
                 f"{sum(b['mix'] for b in bp)}, {sum(b['pass_'] for b in bp)}/3")
        hb = f"{m([x['hornbeam'][s] for x in d for s in AT]):.2f} / {m([x['hornbeam'][s] for x in p for s in AT]):.2f}"
        print(f"| {rnd} | {desk} | {phone} | {m([x['canopyHa'] for x in d]):.0f} / {m([x['canopyHa'] for x in p]):.0f} | {rob} | {cov} | {hb} |")
        dump[rnd] = {f"{k[0]}-{k[1]}": v for k, v in rows.items()}
        if per_run:
            for (w, seed), x in sorted(rows.items()):
                fr = "; ".join(f"{x['drawn'][s]} ({x['perHa'][s]:.0f}), {x['canopyShare'][s]:.2f}, {x['topSp'][s]} {100 * x['topShare'][s]:.0f}%" for s in AT)
                print(f"|   {w} s{seed} | {fr} | canopy 25/50 {x['canopy25']}/{x['canopy50']}, min from 100 {x['min100']}, cap {x['capSeasons']} | fate {x['fate']} | robust {', '.join(f'{s}:{v / 4:.1f}' for s, v in x['robust'].items())} m |")
    if out_json:
        json.dump(dump, open(out_json, "w"), indent=1, default=str)


main()
