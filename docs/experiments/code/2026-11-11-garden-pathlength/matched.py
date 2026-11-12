"""Crown width against stem diameter at matched DBH (#121's path-length probe; EXPLORATORY).
Reads the allometry.csv dbh.py writes beside each run.

    python3 .../matched.py lone <round dir> ...        runs/pathlength/lone/<round>
    python3 .../matched.py garden <round dir> ...      runs/garden-schedule/<round>

lone: per species, the crown diameter (2 x the mean crown radius) where each seed's tree first
reaches DBH 20/40/60 cm (linear between the 10-season snapshots), the season and the height there,
beside Pretzsch's open-grown 95% edge and Tallo's forest-grown q50 (q10-q90); then season 100.
Seed ranges (min-max of seeds 1-3).

garden: the survivors (canopy trees, over half the top height, at the last season): each one's
DBH, height, crown diameter and the crown-edge advance (m of mean radius per season) between
snapshots, beside the same anchors at its DBH.
"""

import csv
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from anchors import STAND_IN, hemery, pretzsch95, tallo  # noqa: E402

MATCH = (20, 40, 60)


def load(run):
    out = defaultdict(list)
    with open(Path(run) / "allometry.csv") as f:
        for r in csv.DictReader(f):
            out[r["tree"]].append({k: (v if k in ("tree", "species") else float(v)) for k, v in r.items()})
    return out


def rng(xs, nd=1):
    xs = [x for x in xs if x is not None]
    if not xs:
        return "–"
    lo, hi = min(xs), max(xs)
    return f"{lo:.{nd}f}" if round(lo, nd) == round(hi, nd) else f"{lo:.{nd}f}–{hi:.{nd}f}"


def fmt(x, nd=1):
    return "–" if x is None else f"{x:.{nd}f}"


def at_dbh(series, d):
    """(season, height, crown diameter) where the series first reaches DBH d, or None."""
    for a, b in zip(series, series[1:]):
        if a["dbh_cm"] < d <= b["dbh_cm"]:
            f = (d - a["dbh_cm"]) / (b["dbh_cm"] - a["dbh_cm"])
            mix = lambda k: a[k] + f * (b[k] - a[k])
            return mix("season"), mix("height_m"), 2 * mix("cr_m")
    return None


def lone(rounds):
    for rd in rounds:
        rd = Path(rd)
        print(f"\n### lone, {rd.name}\n")
        print("| species | DBH (cm) | season reached | height (m) | crown diameter (m) | Pretzsch 95% (m) | sim ÷ Pretzsch | Tallo q50 (q10–q90) (m) | Hemery (m) |")
        print("|---|---|---|---|---|---|---|---|---|")
        runs = defaultdict(list)
        for run in sorted(rd.glob("*-s*")):
            if (run / "allometry.csv").exists():
                runs[run.name.rsplit("-s", 1)[0]].append(load(run)["0"])
        for sp, seeds in runs.items():
            for d in MATCH:
                hit = [h for h in (at_dbh(s, d) for s in seeds) if h]
                p, t, hm = pretzsch95(sp, d), tallo(sp, d), hemery(sp, d)
                tal = f"{t[1]:.1f} ({t[0]:.1f}–{t[2]:.1f})" if t else "beyond support"
                ratio = rng([h[2] / p for h in hit], 2) if p else "–"
                note = f" ({STAND_IN[sp]})" if sp in STAND_IN else ""
                print(
                    f"| {sp} | {d} | {rng([h[0] for h in hit], 0)} ({len(hit)} of {len(seeds)}) | {rng([h[1] for h in hit])} | "
                    f"{rng([h[2] for h in hit])} | {fmt(p)}{note if p else ''} | {ratio} | {tal} | {fmt(hm)} |"
                )
            last = [s[-1] for s in seeds]
            ps = [pretzsch95(sp, s["dbh_cm"]) for s in last]
            ratio = rng([2 * s["cr_m"] / p for s, p in zip(last, ps)], 2) if ps[0] else "–"
            print(
                f"| {sp} | season {last[0]['season']:.0f}: {rng([s['dbh_cm'] for s in last], 0)} | {last[0]['season']:.0f} | "
                f"{rng([s['height_m'] for s in last])} | {rng([2 * s['cr_m'] for s in last])} | {rng(ps)} | {ratio} | – | – |"
            )


def garden(rounds):
    for rd in rounds:
        rd = Path(rd)
        for run in sorted(rd.glob("w*-s*")):
            if not (run / "allometry.csv").exists():
                continue
            trees = load(run)
            seasons = sorted({r["season"] for s in trees.values() for r in s})
            last = seasons[-1]
            top = max(s[-1]["height_m"] for s in trees.values() if s[-1]["season"] == last)
            surv = [s for s in trees.values() if s[-1]["season"] == last and s[-1]["height_m"] > top / 2]
            print(f"\n### garden, {rd.name} {run.name}: {len(surv)} canopy trees at season {last:.0f}\n")
            print("| tree | species | season | DBH (cm) | height (m) | crown diameter (m) | robust x / z (m) | Pretzsch 95% | Tallo q50 (q10–q90) | sim ÷ Pretzsch | edge advance since last (cm/season) |")
            print("|---|---|---|---|---|---|---|---|---|---|---|")
            for s in sorted(surv, key=lambda s: -s[-1]["height_m"]):
                prev = None
                for r in s:
                    sp, d, k = r["species"], r["dbh_cm"], 2 * r["cr_m"]
                    p, t = pretzsch95(sp, d), tallo(sp, d)
                    tal = f"{t[1]:.1f} ({t[0]:.1f}–{t[2]:.1f})" if t else "beyond support"
                    adv = "–" if prev is None else f"{100 * (r['cr_m'] - prev['cr_m']) / (r['season'] - prev['season']):.0f}"
                    print(
                        f"| {r['tree']} | {sp} | {r['season']:.0f} | {d:.0f} | {r['height_m']:.1f} | {k:.1f} | "
                        f"{r['rx_m']:.1f} / {r['rz_m']:.1f} | {fmt(p)} | {tal} | {fmt(k / p if p else None, 2)} | {adv} |"
                    )
                    prev = r


def summary(rounds):
    """Per round, the 160-cell runs pooled: canopy trees (over half the tallest measured tree) by
    species at each snapshot: how many, median DBH, height and crown diameter, the ratio to the
    anchors, and the median edge advance since the previous snapshot (trees present at both)."""
    import statistics as st

    for rd in rounds:
        rd = Path(rd)
        pool = defaultdict(list)  # (species, season) -> [(row, previous row or None)]
        for run in sorted(rd.glob("w160-s*")):
            if not (run / "allometry.csv").exists():
                continue
            trees = load(run)
            tops = defaultdict(float)
            for s in trees.values():
                for r in s:
                    tops[r["season"]] = max(tops[r["season"]], r["height_m"])
            for s in trees.values():
                prev = None
                for r in s:
                    if r["height_m"] > tops[r["season"]] / 2:
                        pool[(r["species"], r["season"])].append((r, prev))
                    prev = r
        print(f"\n### garden canopy trees by species, {rd.name} (160 cells, runs pooled)\n")
        print("| species | season | n | DBH (cm) median (range) | height (m) | crown diameter (m) median (range) | robust width x (m) | ÷ Pretzsch 95% median (range) | ÷ Tallo q50 median (n in support) | edge advance (cm/season) median |")
        print("|---|---|---|---|---|---|---|---|---|---|")
        m = lambda v, nd=1: f"{st.median(v):.{nd}f}" if v else "–"
        mr = lambda v, nd=1: f"{st.median(v):.{nd}f} ({min(v):.{nd}f}–{max(v):.{nd}f})" if v else "–"
        for (sp, season), rows in sorted(pool.items()):
            rs = [r for r, _ in rows]
            pz = [2 * r["cr_m"] / pretzsch95(sp, r["dbh_cm"]) for r in rs if pretzsch95(sp, r["dbh_cm"])]
            tl = [2 * r["cr_m"] / tallo(sp, r["dbh_cm"])[1] for r in rs if tallo(sp, r["dbh_cm"])]
            adv = [100 * (r["cr_m"] - p["cr_m"]) / (r["season"] - p["season"]) for r, p in rows if p]
            print(
                f"| {sp} | {season:.0f} | {len(rs)} | {mr([r['dbh_cm'] for r in rs], 0)} | {m([r['height_m'] for r in rs])} | "
                f"{mr([2 * r['cr_m'] for r in rs])} | {m([r['rx_m'] for r in rs])} | {mr(pz, 2)} | "
                f"{m(tl, 2)} ({len(tl)}) | {m(adv, 0)} |"
            )


def thinning(rounds):
    """Per round and run (160 cells), at seasons 25/50/100: stems per hectare and their quadratic
    mean diameter at 1.3 m, for all living stems that reach 1.3 m and for the canopy trees (over
    half the tallest), against Pretzsch & Biber 2005's self-thinning lines for unthinned, fully
    stocked stands: ln N = 12.359 - 1.789 ln d (beech), 10.984 - 1.424 ln d (oak); N stems/ha, d
    the quadratic mean diameter in cm (the research note, section 4)."""
    import math

    line = {"beech": (12.359, -1.789), "oak": (10.984, -1.424)}
    n_at = lambda sp, d: math.exp(line[sp][0] + line[sp][1] * math.log(d))
    qmd = lambda rs: math.sqrt(sum(r["dbh_cm"] ** 2 for r in rs) / len(rs))
    print("| round, run | season | stems ≥ 1.3 m: N/ha, QMD (cm) | line at that QMD: beech, oak (N/ha) | N ÷ line: beech, oak | canopy trees: N/ha, QMD (cm) | line at that QMD: beech, oak | N ÷ line: beech, oak |")
    print("|---|---|---|---|---|---|---|---|")
    for rd in rounds:
        rd = Path(rd)
        for run in sorted(rd.glob("w160-s*")):
            if not (run / "allometry.csv").exists():
                continue
            ha = 160 * 64 * 0.0625 / 10_000
            by = defaultdict(list)
            for s in load(run).values():
                for r in s:
                    by[r["season"]].append(r)
            for season in (25, 50, 100):
                rows = [r for r in by[season] if r["height_m"] >= 1.3]
                if not rows:
                    continue
                top = max(r["height_m"] for r in rows)
                cells = []
                for rs in (rows, [r for r in rows if r["height_m"] > top / 2]):
                    n, d = len(rs) / ha, qmd(rs)
                    cells += [
                        f"{n:.0f}, {d:.1f}",
                        f"{n_at('beech', d):.0f}, {n_at('oak', d):.0f}",
                        f"{n / n_at('beech', d):.2f}, {n / n_at('oak', d):.2f}",
                    ]
                print(f"| {rd.name} {run.name} | {season} | " + " | ".join(cells) + " |")


if __name__ == "__main__":
    {"lone": lone, "garden": garden, "summary": summary, "thinning": thinning}[sys.argv[1]](sys.argv[2:])
