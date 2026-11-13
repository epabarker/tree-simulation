"""The crown-extent probe's tables (#129; EXPLORATORY, seeds 1-3), from the feature probe's runs
(runs/probe/129-<arm>-<species>/, run.sh). The measurement is the path-length note's: dbh.py's
allometry.csv beside each run (DBH at 1.3 m by the pipe radius, the mean crown radius over +-x
and +-z), Pretzsch et al. 2015's open-grown 95% edge (anchors.py), and the core's own stand.csv.

    python3 docs/experiments/code/2026-11-13-crown-extent/table.py lone <arm> ...
    python3 docs/experiments/code/2026-11-13-crown-extent/table.py garden <arm> ... [--runs]
    python3 docs/experiments/code/2026-11-13-crown-extent/table.py crowns <arm> ...

lone: per arm and exemplar, the min-max over seeds 1-3 at season 100, and where the tree first
reaches DBH 40 cm (the bar: crown diameter at or under Pretzsch's edge at matched DBH).
garden: ADR 0065 decision 1's targets with counts, at 160 cells; the phone's bar at 66.
crowns: the garden's canopy trees at 160 cells against the edge, per species and season.
"""

import csv
import json
import statistics as st
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
OLD = HERE.parent / "2026-11-11-garden-pathlength"
sys.path.insert(0, str(OLD))
from anchors import pretzsch95  # noqa: E402
from matched import at_dbh, load, rng  # noqa: E402

ROOT = HERE.parents[3] / "runs" / "probe"
EXEMPLARS = ("oak", "maple", "birch", "beech", "hornbeam", "holly")
SEEDS = (1, 2, 3)
AT = (100, 200, 300)
CELL = 0.25


def runs(arm, species, stage):
    """The arm's finished runs of one stage ("lone" or "garden160"), measured by dbh.py."""
    side = "head" if arm == "base" else "patch"
    out = [ROOT / f"129-{arm}-{species}" / side / f"{stage}-seed{s}" for s in SEEDS]
    out = [r for r in out if (r / "hash.txt").exists()]
    todo = [str(r) for r in out if not (r / "allometry.csv").exists()]
    if todo:
        subprocess.run([sys.executable, str(OLD / "dbh.py"), *todo], check=True)
    return out


def lone(arms):
    print(
        "| arm | species | height (m) | DBH (cm) | crown diameter (m) | ÷ Pretzsch 95% | at DBH 40: season, height (m), "
        "crown (m), ÷ Pretzsch | W/H | edge rate 60–100 (cm/season) | round | box held | top-fifth leaf | w90 | metamers (k) |"
    )
    print("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for arm in arms:
        for sp in EXEMPLARS:
            rs = runs(arm, sp, "lone")
            if not rs:
                continue
            last, hits, feats, rates, held = [], [], [], [], 0
            for run in rs:
                series = load(run)["0"]
                last.append(series[-1])
                hits.append(at_dbh(series, 40))
                by = {s["season"]: s for s in series}
                if 60 in by and 100 in by:
                    rates.append((by[100]["cr_m"] - by[60]["cr_m"]) / 40 * 100)
                rows = [r for r in csv.DictReader(open(run / "metrics.csv")) if r["tree"] == "0"]
                held += all(float(r["budsOutside"] or 0) == 0 for r in rows)
                feats.append(rows[-1])
            p = [pretzsch95(sp, s["dbh_cm"]) for s in last]
            ratio = rng([2 * s["cr_m"] / q for s, q in zip(last, p)], 2) if p[0] else "–"
            hit = [h for h in hits if h]
            p40 = pretzsch95(sp, 40)
            at40 = (
                f"{rng([h[0] for h in hit], 0)}, {rng([h[1] for h in hit])}, {rng([h[2] for h in hit])}, "
                f"{rng([h[2] / p40 for h in hit], 2) if p40 else '–'} ({len(hit)} of {len(rs)})"
                if hit
                else f"not reached (0 of {len(rs)})"
            )
            f = lambda k: [float(r[k]) for r in feats]  # noqa: E731
            w, d = f("crownWidth"), f("crownDepth")
            print(
                f"| {arm} | {sp} | {rng([s['height_m'] for s in last])} | {rng([s['dbh_cm'] for s in last], 0)} | "
                f"{rng([2 * s['cr_m'] for s in last])} | {ratio} | {at40} | "
                f"{rng([2 * s['cr_m'] / s['height_m'] for s in last], 2)} | {rng(rates, 0)} | "
                f"{rng([min(a, b) / max(a, b) for a, b in zip(w, d)], 2)} | {held} of {len(rs)} | "
                f"{rng(f('topFifthLeaf'), 2)} | {rng(f('w90'), 2)} | {rng([s['n'] / 1000 for s in last], 0)} |"
            )


def stand(run):
    params = json.load(open(run / "probe-record.json"))["params"]
    width, depth = params["world"]["width"], params["world"].get("depth", 64)
    ha = width * depth * CELL * CELL / 10_000
    rows = {int(r["season"]): r for r in csv.DictReader(open(run / "stand.csv"))}
    top = defaultdict(lambda: ("–", 0.0))
    for r in csv.DictReader(open(run / "stand-species.csv")):
        s = int(r["season"])
        if float(r["share"]) > top[s][1]:
            top[s] = (r["species"], float(r["share"]))
    canopy = [int(rows[s]["canopy"]) for s in rows if s >= 100]
    after50 = [int(rows[s]["canopy"]) for s in rows if s > 50]
    drawn = {s: int(rows[s]["drawn"]) for s in AT}
    return dict(
        ha=ha,
        drawn=drawn,
        canopy={s: int(rows[s]["canopy"]) for s in AT},
        live={s: int(rows[s]["live"]) for s in AT},
        perHa={s: drawn[s] / ha for s in AT},
        share={s: int(rows[s]["canopy"]) / drawn[s] if drawn[s] else 0.0 for s in AT},
        top={s: top[s] for s in AT},
        min100=min(canopy),
        med100=st.median(canopy),
        nogap=min(after50) >= 1,
        cap=sum(int(r["capReached"]) > 0 for r in rows.values()),
        topHeight={s: float(rows[s]["topHeight100"]) * CELL for s in AT},
    )


def canopy_trees(run, season, top_height):
    """allometry.csv rows of the drawn stems over half the top height at `season`."""
    return [
        r
        for r in csv.DictReader(open(run / "allometry.csv"))
        if int(r["season"]) == season and float(r["height_m"]) > max(top_height / 2, 1.3)
    ]


def garden(arms, per_run):
    n = len(SEEDS)
    print(
        f"| arm | 160: canopy trees/ha from season 100, median (min) per run | runs ≥ 120/ha in every season from 100 (of {n}) | "
        f"frames ≥ 120/ha (of {3 * n}) | frames with 200–400 drawn/ha (of {3 * n}) | frames with canopy share ≥ 0.6 (of {3 * n}) | "
        f"canopy share, median | seasons at the cap, per run | top species ≤ 70% (frames judged) | "
        f"canopy trees at 100: n, median DBH (cm) / height (m) / crown (m) | 66: runs with a canopy tree every season from 100 (of {n}) | "
        f"66: canopy min from 100, cap seasons |"
    )
    print("|---|---|---|---|---|---|---|---|---|---|---|---|")
    for arm in arms:
        d = [(r, stand(r)) for r in runs(arm, "hornbeam", "garden160")]
        p = [stand(r) for r in runs(arm, "hornbeam", "garden66")]
        if not d:
            continue
        ha = d[0][1]["ha"]
        frames = [(x, s) for _, x in d for s in AT]
        judged = [(x, s) for x, s in frames if x["drawn"][s] >= 8]
        can = [r for run, x in d for r in canopy_trees(run, 100, x["topHeight"][100])]
        med = lambda k, nd: f"{st.median(float(r[k]) for r in can):.{nd}f}" if can else "–"  # noqa: E731
        crown = f"{st.median(2 * float(r['cr_m']) for r in can):.1f}" if can else "–"
        print(
            f"| {arm} | {', '.join(f'{x['med100'] / ha:.0f} ({x['min100'] / ha:.0f})' for _, x in d)} | "
            f"{sum(x['min100'] / ha >= 120 for _, x in d)} | {sum(x['canopy'][s] / ha >= 120 for x, s in frames)} | "
            f"{sum(200 <= x['perHa'][s] <= 400 for x, s in frames)} | {sum(x['share'][s] >= 0.6 for x, s in frames)} | "
            f"{st.median(x['share'][s] for x, s in frames):.2f} | {', '.join(str(x['cap']) for _, x in d)} | "
            f"{sum(x['top'][s][1] <= 0.7 for x, s in judged)} of {len(judged)} | "
            f"{len(can)}, {med('dbh_cm', 0)} / {med('height_m', 1)} / {crown} | "
            f"{sum(x['min100'] >= 1 for x in p)} | {', '.join(f'{x['min100']}, {x['cap']}' for x in p)} |"
        )
        if per_run:
            for w, xs in ((160, [x for _, x in d]), (66, p)):
                for seed, x in zip(SEEDS, xs):
                    fr = "; ".join(
                        f"{s}: {x['canopy'][s]} canopy / {x['drawn'][s]} drawn ({x['perHa'][s]:.0f}/ha) / {x['live'][s]} live, "
                        f"{x['top'][s][0]} {100 * x['top'][s][1]:.0f}%, top {x['topHeight'][s]:.0f} m"
                        for s in AT
                    )
                    print(f"|   {w} s{seed} | {fr} | | | | | | | | | | |")


def crowns(arms):
    print("| arm | species | season | n | DBH (cm) median (range) | height (m) | crown diameter (m) median (range) | ÷ Pretzsch 95% median (range) |")
    print("|---|---|---|---|---|---|---|---|")
    for arm in arms:
        by = defaultdict(list)
        for run in runs(arm, "hornbeam", "garden160"):
            rows = {int(r["season"]): r for r in csv.DictReader(open(run / "stand.csv"))}
            for s in (25, 50, 100, 200, 300):
                for r in canopy_trees(run, s, float(rows[s]["topHeight100"]) * CELL):
                    by[(r["species"], s)].append(r)
        for (sp, s), rs in sorted(by.items()):
            if pretzsch95(sp, 10) is None or len(rs) < 3:
                continue
            dbh = [float(r["dbh_cm"]) for r in rs]
            cd = [2 * float(r["cr_m"]) for r in rs]
            ratio = [c / pretzsch95(sp, d) for c, d in zip(cd, dbh)]
            print(
                f"| {arm} | {sp} | {s} | {len(rs)} | {st.median(dbh):.0f} ({rng(dbh, 0)}) | "
                f"{st.median(float(r['height_m']) for r in rs):.1f} | {st.median(cd):.1f} ({rng(cd)}) | "
                f"{st.median(ratio):.2f} ({rng(ratio, 2)}) |"
            )


def main():
    argv = [a for a in sys.argv[1:] if not a.startswith("--")]
    what, arms = argv[0], argv[1:]
    if what == "lone":
        lone(arms)
    elif what == "garden":
        garden(arms, "--runs" in sys.argv)
    else:
        crowns(arms)


main()
