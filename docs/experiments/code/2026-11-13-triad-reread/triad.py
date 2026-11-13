"""The crown-extent probe's runs re-read (#131; EXPLORATORY, seeds 1-3, no new simulation). Reads
runs/probe/129-<arm>-<species>/ (the crown-extent note's run.sh) with the path-length note's
measurement (dbh.py's allometry.csv) and the core's own metrics.csv.

    python3 docs/experiments/code/2026-11-13-triad-reread/triad.py lone <arm> ...
    python3 docs/experiments/code/2026-11-13-triad-reread/triad.py taper <arm> ...
    python3 docs/experiments/code/2026-11-13-triad-reread/triad.py stand <arm> ...
    python3 docs/experiments/code/2026-11-13-triad-reread/triad.py floor <arm> ...

lone: the triad per arm, species and anchor (season 60, season 100, DBH 25/40/50 cm crossed):
  W = 2 x dbh.py's mean crown radius; W / Pretzsch's 95% edge at the tree's DBH; W/H;
  the fit's own W/H beside it (lone.spread: max of the core's crownWidth and crownDepth, full
  extents, over height; cli/trials.ts); H/D two ways: over the core's trunkRadius (the root metamer, which the fit's lone.slenderness
  reads, cli/trials.ts) and over dbh.py's DBH (the trunk cylinder at 1.3 m of stem, which the
  matched-DBH anchors read). Seed ranges (min-max of seeds 1-3).
taper: the ratio of the two diameters, DBH at 1.3 m / the root metamer's, per arm and species.
stand: the canopy trees (over half the top height) at 160 cells, per species and season: crown
  diameter at the tree's DBH against Tallo's forest-grown q10-q90 and q50, Hemery's mean, and
  Pretzsch's edge; then crown cover (the sum of pi cr^2 over the canopy trees, and over every
  drawn stem, / the plot's area: over 1 the crowns as measured interpenetrate); and the robust
  crown, the mean of dbh.py's 5-95% tip spreads in x and z, against the same Tallo q50.
floor: the ground's light (ground.csv q, a fraction of open sky) per run and season.
"""

import csv
import json
import math
import statistics as st
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
OLD = HERE.parent / "2026-11-11-garden-pathlength"
sys.path.insert(0, str(OLD))
from anchors import hemery, pretzsch95, tallo  # noqa: E402
from matched import load, rng  # noqa: E402

ROOT = HERE.parents[3] / "runs" / "probe"
EXEMPLARS = ("oak", "maple", "birch", "beech", "hornbeam", "holly")
SEEDS = (1, 2, 3)
CELL = 0.25
DBH_AT = (25, 40, 50)

# The fit's targets (analysis/fit/targets/<species>.toml): lone.slenderness (target, band, weight)
# and lone.spread at 60 (target, band); ADR 0041's accepted lone beech W/H at 100.
HD = {"beech": (48, 8, 1), "hornbeam": (58, 10, 0.5), "birch": (40, 8, 0.5), "oak": (48, 8, 0.5), "maple": (48, 8, 0.5)}
SPREAD60 = {"beech": (0.6, 0.2), "hornbeam": (0.7, 0.2), "oak": (0.75, 0.25), "maple": (0.7, 0.2)}
ADR0041_WH100 = {"beech": 1.50}


def run_dirs(arm, species, stage):
    side = "head" if arm == "base" else "patch"
    out = [ROOT / f"129-{arm}-{species}" / side / f"{stage}-seed{s}" for s in SEEDS]
    return [r for r in out if (r / "allometry.csv").exists()]


def trunk_d(run, spread=None):
    """(tree, season) -> the core's base diameter in cm (2 x trunkRadius), from metrics.csv. With
    `spread` (a dict), also fills it with the fit's lone.spread: max(crownWidth, crownDepth) /
    height, the core's full extents (cli/trials.ts)."""
    out = {}
    for r in csv.DictReader(open(run / "metrics.csv")):
        if r["alive"] == "1":
            key = (r["tree"], int(r["season"]))
            out[key] = 2 * float(r["trunkRadius"]) * CELL * 100
            if spread is not None and float(r["height"]) > 0:
                spread[key] = max(float(r["crownWidth"]), float(r["crownDepth"])) / float(r["height"])
    return out


def lone_series(run):
    """Tree 0's snapshots, each with the base diameter beside dbh.py's DBH."""
    spread = {}
    base = trunk_d(run, spread)
    out = []
    for s in load(run)["0"]:
        key = ("0", int(s["season"]))
        if key in base:
            out.append({**s, "d0_cm": base[key], "spread": spread.get(key, 0.0)})
    return out


def interp(series, d):
    """The snapshot values linearly where the series first reaches DBH d (dbh.py's), or None."""
    for a, b in zip(series, series[1:]):
        if a["dbh_cm"] < d <= b["dbh_cm"]:
            f = (d - a["dbh_cm"]) / (b["dbh_cm"] - a["dbh_cm"])
            return {k: a[k] + f * (b[k] - a[k]) for k in ("season", "height_m", "cr_m", "dbh_cm", "d0_cm", "spread")}
    return None


def triad(sp, s):
    w = 2 * s["cr_m"]
    p = pretzsch95(sp, s["dbh_cm"])
    return {
        "season": s["season"],
        "H": s["height_m"],
        "D": s["dbh_cm"],
        "W": w,
        "WP": w / p if p else None,
        "WH": w / s["height_m"],
        "SP": s["spread"],
        "HD0": s["height_m"] / (s["d0_cm"] / 100),
        "HD13": s["height_m"] / (s["dbh_cm"] / 100),
    }


def lone(arms):
    print(
        "| arm | species | anchor | reached | season | H (m) | DBH (cm) | W (m) | W ÷ Pretzsch 95% | W/H | "
        "W/H, the fit's (lone.spread) | H/D, base (the fit's) | H/D, DBH at 1.3 m |"
    )
    print("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for arm in arms:
        for sp in EXEMPLARS:
            series = [lone_series(r) for r in run_dirs(arm, sp, "lone")]
            if not series:
                continue
            anchors = [("season 60", lambda x: next((s for s in x if s["season"] == 60), None))]
            anchors.append(("season 100", lambda x: next((s for s in x if s["season"] == 100), None)))
            anchors += [(f"DBH {d}", lambda x, d=d: interp(x, d)) for d in DBH_AT]
            for name, pick in anchors:
                hits = [triad(sp, h) for h in (pick(x) for x in series) if h]
                if not hits:
                    print(f"| {arm} | {sp} | {name} | 0 of {len(series)} | | | | | | | | | |")
                    continue
                c = lambda k, nd=1: rng([h[k] for h in hits], nd)  # noqa: E731
                print(
                    f"| {arm} | {sp} | {name} | {len(hits)} of {len(series)} | {c('season', 0)} | {c('H')} | {c('D', 0)} | "
                    f"{c('W')} | {c('WP', 2)} | {c('WH', 2)} | {c('SP', 2)} | {c('HD0', 0)} | {c('HD13', 0)} |"
                )


def taper(arms):
    """DBH at 1.3 m over the root metamer's diameter, lone trees at 60 and 100, and the garden's
    canopy trees at 100 (median, range)."""
    print("| arm | species | lone, season 60 | lone, season 100 | garden canopy trees at 100: n, median (range) |")
    print("|---|---|---|---|---|")
    for arm in arms:
        for sp in EXEMPLARS:
            series = [lone_series(r) for r in run_dirs(arm, sp, "lone")]
            at = lambda s: [x["dbh_cm"] / x["d0_cm"] for ser in series for x in ser if x["season"] == s]  # noqa: E731
            g = []
            for run in run_dirs(arm, "hornbeam", "garden160"):
                base = trunk_d(run)
                for r in canopy_rows(run, 100):
                    d0 = base.get((r["tree"], 100))
                    if r["species"] == sp and d0:
                        g.append(float(r["dbh_cm"]) / d0)
            if not series and not g:
                continue
            gs = f"{len(g)}, {st.median(g):.2f} ({rng(g, 2)})" if g else "–"
            print(f"| {arm} | {sp} | {rng(at(60), 2)} | {rng(at(100), 2)} | {gs} |")


def top_heights(run):
    return {int(r["season"]): float(r["topHeight100"]) * CELL for r in csv.DictReader(open(run / "stand.csv"))}


def canopy_rows(run, season):
    top = top_heights(run)[season]
    return [
        r
        for r in csv.DictReader(open(run / "allometry.csv"))
        if int(r["season"]) == season and float(r["height_m"]) > max(top / 2, 1.3)
    ]


def plot_area(run):
    w = json.load(open(run / "probe-record.json"))["params"]["world"]
    return w["width"] * w.get("depth", 64) * CELL * CELL


def stand(arms):
    print(
        "| arm | species | season | n | DBH (cm) median | H (m) median | crown (m) median | Tallo q50 at the median DBH (q10–q90) | "
        "trees inside Tallo q10–q90 | crown ÷ Tallo q50, median (range) | robust crown (m) median | robust ÷ Tallo q50, median | "
        "Hemery at the median DBH | ÷ Pretzsch 95%, median | H/D (the core's), median |"
    )
    print("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    cover = []
    for arm in arms:
        by = defaultdict(list)
        for seed, run in zip(SEEDS, run_dirs(arm, "hornbeam", "garden160")):
            area = plot_area(run)
            alls = defaultdict(float)
            for r in csv.DictReader(open(run / "allometry.csv")):
                if float(r["height_m"]) >= 1.3:  # a drawn stem (the display threshold)
                    alls[int(r["season"])] += math.pi * float(r["cr_m"]) ** 2
            for s in (50, 100, 200, 300):
                base = trunk_d(run)
                rows = canopy_rows(run, s)
                for r in rows:
                    d0 = base.get((r["tree"], s))
                    by[(r["species"], s)].append({**r, "hd0": float(r["height_m"]) / (d0 / 100) if d0 else None})
                can = sum(math.pi * float(r["cr_m"]) ** 2 for r in rows)
                cover.append((arm, seed, s, len(rows), can / area, alls[s] / area))
        for (sp, s), rs in sorted(by.items(), key=lambda kv: (kv[0][0], kv[0][1])):
            if len(rs) < 3:
                continue
            dbh = [float(r["dbh_cm"]) for r in rs]
            cd = [2 * float(r["cr_m"]) for r in rs]
            md = st.median(dbh)
            t = tallo(sp, md)
            tq = [tallo(sp, d) for d in dbh]
            inside = [lo <= c <= hi for c, q in zip(cd, tq) if q for lo, hi in [(q[0], q[2])]]
            rt = [c / q[1] for c, q in zip(cd, tq) if q]
            rob = [(float(r["rx_m"]) + float(r["rz_m"])) / 2 for r in rs]
            rr = [c / q[1] for c, q in zip(rob, tq) if q]
            hm = hemery(sp, md)
            pz = [c / pretzsch95(sp, d) for c, d in zip(cd, dbh) if pretzsch95(sp, d)]
            print(
                f"| {arm} | {sp} | {s} | {len(rs)} | {md:.0f} | {st.median(float(r['height_m']) for r in rs):.1f} | "
                f"{st.median(cd):.1f} | {f'{t[1]:.1f} ({t[0]:.1f}–{t[2]:.1f})' if t else 'beyond support'} | "
                f"{f'{sum(inside)} of {len(inside)}' if inside else '–'}{'' if len(inside) == len(rs) else f' ({len(rs) - len(inside)} beyond support)'} | "
                f"{f'{st.median(rt):.2f} ({rng(rt, 2)})' if rt else '–'} | {st.median(rob):.1f} | "
                f"{f'{st.median(rr):.2f}' if rr else '–'} | {f'{hm:.1f}' if hm else '–'} | "
                f"{f'{st.median(pz):.2f}' if pz else '–'} | "
                f"{st.median(r['hd0'] for r in rs if r['hd0']):.0f} |"
            )
    print()
    print("| arm | seed | season | canopy trees | canopy crowns' cover (Σ πr² ÷ plot) | every drawn stem's cover |")
    print("|---|---|---|---|---|---|")
    for arm, seed, s, n, c, a in cover:
        print(f"| {arm} | {seed} | {s} | {n} | {c:.2f} | {a:.2f} |")


def floor(arms):
    print("| arm | seed | season | mean | median | cells < 2% | cells < 10% | cells ≥ 50% |")
    print("|---|---|---|---|---|---|---|---|")
    for arm in arms:
        for seed, run in zip(SEEDS, run_dirs(arm, "hornbeam", "garden160")):
            qs = defaultdict(list)
            for r in csv.DictReader(open(run / "ground.csv")):
                qs[int(r["season"])].append(float(r["q"]))
            for s, q in sorted(qs.items()):
                if s < 50:
                    continue
                n = len(q)
                print(
                    f"| {arm} | {seed} | {s} | {st.mean(q):.3f} | {st.median(q):.3f} | {sum(x < 0.02 for x in q) / n:.2f} | "
                    f"{sum(x < 0.10 for x in q) / n:.2f} | {sum(x >= 0.5 for x in q) / n:.2f} |"
                )


def main():
    what, arms = sys.argv[1], sys.argv[2:]
    {"lone": lone, "taper": taper, "stand": stand, "floor": floor}[what](arms)


main()
