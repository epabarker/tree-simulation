"""#133's wind-load probe, its tables and bars (EXPLORATORY, seeds 1-3). Reads
runs/probe/133-<arm>-<species>/ (run.sh) and HEAD's linked runs, measured by the path-length note's
dbh.py (allometry.csv beside each run) and by this file's own breast-height measure.

    python3 docs/experiments/code/2026-11-15-wind-load/wind.py [arm ...]

With no arms, every arm in patches/ beside HEAD. HEAD's runs are read from any arm's head/ side.

The bars are the triad re-read's section 5 (docs/experiments/2026-11-13-triad-reread.md, as amended
by ADR 0067), fixed in docs/experiments/2026-11-15-wind-load-probe.md before any run:
  1. lone H/D with D at 1.3 m, codominant forks below it pooled as sqrt(sum d^2), in
     lone.slenderness's band at seasons 60 and 100: beech 40-56, hornbeam 48-68 (every seed);
  7. the stand H/D (the core's, as the fit's stand.slenderness reads it) of the canopy trees in
     stand.slenderness's band: beech 70-94, hornbeam 74-98 (the median, seeds and the seasons
     100, 150, 200 and 300 pooled; read on at least 8 trees);
  9. trees thrown by R3, planted cohort at 160 cells, seeds pooled: no more than HEAD's;
 10. no inverted fork: at every fork of the trunk (or a pooled stem) below 1.3 m of stem, in the
     lone beech and hornbeam at 60 and 100, sum r_c^2 <= 1.3 r_p^2 (every seed).
Reported beside them: the triad's other bars (W/H at 60 and 100, W / Pretzsch's edge), the root
metamer's H/D, lone D on H4k8's crowns over D on HEAD's (the load's job is to make D independent
of the crown's width), canopy trees/ha (#129's target 1), and limb breaks in storm seasons.
"""

import csv
import json
import math
import statistics as st
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
OLD = HERE.parent / "2026-11-11-garden-pathlength"
sys.path.insert(0, str(OLD))
from anchors import pretzsch95  # noqa: E402

ROOT = HERE.parents[3] / "runs" / "probe"
SEEDS = (1, 2, 3)
LONE = ("beech", "hornbeam", "birch", "holly")
GUARD = ("beech", "hornbeam")
CELL = 0.25
BREAST = 1.3 / CELL
CODOMINANT = 0.5  # cli/allometry.ts: a side child with >= half the continuing child's volume
JUNCTION = 1.3  # bar 10: sum r_c^2 <= 1.3 r_p^2
HD_BAND = {"beech": (40, 56), "hornbeam": (48, 68)}
STAND_BAND = {"beech": (70, 94), "hornbeam": (74, 98)}
STAND_SEASONS = (100, 150, 200, 300)
STAND_MIN = 8
CANDIDATES_ORDER = ("H4k8W1", "H4k8W2", "H4k8W4", "H4k8L2")


def arms_in_patches():
    return sorted(p.stem for p in (HERE / "patches").glob("*.json"))


def runs(arm, species, stage):
    """The arm's finished runs ("lone" or "garden160"), each measured by dbh.py once."""
    if arm == "base":
        out = [ROOT / f"129-base-{species}" / "head" / f"{stage}-seed{s}" for s in SEEDS]
    else:
        out = [ROOT / f"133-{arm}-{species}" / "patch" / f"{stage}-seed{s}" for s in SEEDS]
    out = [r for r in out if (r / "hash.txt").exists()]
    todo = [str(r) for r in out if not (r / "allometry.csv").exists()]
    if todo:
        subprocess.run([sys.executable, str(OLD / "dbh.py"), *todo], check=True)
    return out


def rng(xs, nd=0):
    xs = [x for x in xs if x is not None]
    if not xs:
        return "–"
    lo, hi = min(xs), max(xs)
    return f"{lo:.{nd}f}" if lo == hi else f"{lo:.{nd}f}–{hi:.{nd}f}"


# ---- the lone tree: breast height, pooled forks and junctions, from metamers.csv ----


def snapshots(run, tree="0"):
    """season -> the tree's metamer rows (birthId, parentBirthId, radius, length, y0, y1)."""
    by = defaultdict(list)
    with open(run / "metamers.csv") as f:
        rd = csv.reader(f)
        h = {k: i for i, k in enumerate(next(rd))}
        cols = [h[k] for k in ("birthId", "parentBirthId", "radius", "length", "y0", "y1")]
        s, t = h["season"], h["tree"]
        for r in rd:
            if r[t] == tree:
                by[int(r[s])].append((r[cols[0]], r[cols[1]], *(float(r[c]) for c in cols[2:])))
    return by


def breast(rows):
    """(D at 1.3 m in cm, pooled over codominant stems; the junction ratios sum r_c^2 / r_p^2 at
    every fork of those stems below 1.3 m; the number of stems; height in m)."""
    n = len(rows)
    index = {r[0]: i for i, r in enumerate(rows)}
    parent = [index.get(r[1], -1) for r in rows]
    vol = [r[2] * r[2] * r[3] for r in rows]
    for i in range(n - 1, 0, -1):
        if parent[i] >= 0:
            vol[parent[i]] += vol[i]
    kids = defaultdict(list)
    for i in range(1, n):
        if parent[i] >= 0:
            kids[parent[i]].append(i)
    diam, ratios = [], []
    stems = [(0, 0.0)]  # (first metamer, stem length below it)
    while stems:
        at, along = stems.pop()
        while True:
            along += rows[at][3]
            ks = kids.get(at, [])
            if along >= BREAST or not ks:
                diam.append(2 * rows[at][2] * CELL * 100)
                break
            ks = sorted(ks, key=lambda k: -vol[k])
            if len(ks) > 1:
                ratios.append(sum(rows[k][2] ** 2 for k in ks) / rows[at][2] ** 2)
            for k in ks[1:]:
                if vol[k] >= CODOMINANT * vol[ks[0]]:
                    stems.append((k, along))
            at = ks[0]
    height = (max(r[5] for r in rows) - rows[0][4]) * CELL
    return math.sqrt(sum(d * d for d in diam)), ratios, len(diam), height


def lone_rows(arm, sp):
    """Per seed and season (60, 100): the breast-height measures beside dbh.py's and the core's."""
    out = []
    for seed, run in zip(SEEDS, runs(arm, sp, "lone")):
        snaps = snapshots(run)
        allo = {int(r["season"]): r for r in csv.DictReader(open(run / "allometry.csv")) if r["tree"] == "0"}
        met = {int(r["season"]): r for r in csv.DictReader(open(run / "metrics.csv")) if r["tree"] == "0" and r["alive"] == "1"}
        for s in (60, 100):
            if s not in snaps or s not in allo or s not in met:
                out.append({"seed": seed, "season": s, "dead": True})
                continue
            d, ratios, stems, h = breast(snaps[s])
            a, m = allo[s], met[s]
            w = 2 * float(a["cr_m"])
            p = pretzsch95(sp, d)
            d0 = 2 * float(m["trunkRadius"]) * CELL * 100
            out.append({
                "seed": seed, "season": s, "dead": False, "H": h, "D": d, "stems": stems,
                "HD": h / (d / 100), "HD0": h / (d0 / 100), "D0": d0,
                "WH": w / h, "spread": max(float(m["crownWidth"]), float(m["crownDepth"])) / float(m["height"]),
                "WP": w / p if p else None, "junction": max(ratios) if ratios else 0.0,
                "forks": len(ratios),
            })
    return out


# ---- the garden at 160 cells ----


def planted_fates(run):
    """(planted, thrown): a planted tree's death is R3's throw if its dead row counts a break
    (the crown-extent note's fates, table.py)."""
    stand = list(csv.DictReader(open(run / "stand.csv")))
    n = int(stand[0]["live"])
    last, dead = {}, {}
    for r in csv.DictReader(open(run / "metrics.csv")):
        t = int(r["tree"])
        if t >= n:
            continue
        if r["alive"] == "1":
            last[t] = r
        elif t in last and t not in dead:
            dead[t] = r
    thrown = sum(1 for t, d in dead.items() if float(d["broken"] or 0) > float(last[t]["broken"] or 0) and float(d["broken"]) > 0)
    return n, thrown


def breaks(run, storms):
    """Limb breaks (metamers) in storm seasons and in all, from the cumulative broken counts of
    living trees: a throw (the death row) is not a limb break."""
    prev, storm, total = {}, 0.0, 0.0
    for r in csv.DictReader(open(run / "metrics.csv")):
        if r["alive"] != "1":
            continue
        t, b = r["tree"], float(r["broken"] or 0)
        dx = b - prev.get(t, 0.0)
        prev[t] = b
        if dx > 0:
            total += dx
            if int(r["season"]) in storms:
                storm += dx
    return storm, total


def stand_rows(run):
    """Canopy trees (drawn, over half the top height) at the stand seasons, with the core's H/D
    (the root metamer, as stand.slenderness reads it) and dbh.py's at 1.3 m."""
    top = {int(r["season"]): float(r["topHeight100"]) * CELL for r in csv.DictReader(open(run / "stand.csv"))}
    d0 = {}
    for r in csv.DictReader(open(run / "metrics.csv")):
        if r["alive"] == "1":
            d0[(r["tree"], int(r["season"]))] = 2 * float(r["trunkRadius"]) * CELL * 100
    out = []
    for r in csv.DictReader(open(run / "allometry.csv")):
        s = int(r["season"])
        h = float(r["height_m"])
        if s in STAND_SEASONS and h > max(top.get(s, 0) / 2, 1.3):
            base = d0.get((r["tree"], s))
            out.append({"species": r["species"], "season": s, "HD0": h / (base / 100) if base else None,
                        "HD13": h / (float(r["dbh_cm"]) / 100)})
    return out


def canopy_per_ha(run):
    """#129's target 1, read at the garden's snapshot seasons from 100 (100, 150, 200, 300): canopy
    trees (drawn, over half the top height) per ha. stand.rs counts every season; this is coarser."""
    w = json.load(open(run / "probe-record.json"))["params"]["world"]
    area = w["width"] * w.get("depth", 64) * CELL * CELL / 1e4
    out = {}
    top = {int(r["season"]): float(r["topHeight100"]) * CELL for r in csv.DictReader(open(run / "stand.csv"))}
    counts = defaultdict(int)
    for r in csv.DictReader(open(run / "allometry.csv")):
        s = int(r["season"])
        if s >= 100 and float(r["height_m"]) > max(top.get(s, 0) / 2, 1.3):
            counts[s] += 1
    for s in sorted(counts):
        out[s] = counts[s] / area
    return out


# ---- the tables and the bars ----


def main():
    arms = sys.argv[1:] or ["base", *arms_in_patches()]
    if "base" not in arms:
        arms = ["base", *arms]
    storms_path = ROOT / "133-storms.json"
    storms = {int(k): set(v) for k, v in json.load(open(storms_path)).items()} if storms_path.exists() else {}

    lone = {(a, sp): lone_rows(a, sp) for a in arms for sp in LONE}
    print("## Lone trees (seeds 1-3, ranges)\n")
    print("| arm | species | season | alive | H (m) | D at 1.3 m, pooled (cm) | stems at 1.3 m | H/D at 1.3 m | H/D, root (the fit's) | W/H (2 cr) | W/H, the fit's | W ÷ Pretzsch 95% | worst junction Σr_c²/r_p² |")
    print("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for a in arms:
        for sp in LONE:
            for s in (60, 100):
                rs = [r for r in lone[(a, sp)] if r["season"] == s]
                live = [r for r in rs if not r["dead"]]
                c = lambda k, nd=0: rng([r[k] for r in live], nd)  # noqa: E731
                print(f"| {a} | {sp} | {s} | {len(live)} of {len(rs)} | {c('H', 1)} | {c('D')} | {c('stems')} | {c('HD')} | "
                      f"{c('HD0')} | {c('WH', 2)} | {c('spread', 2)} | {c('WP', 2)} | {c('junction', 2)} |")

    print("\n## The load's job: lone D at 1.3 m on H4k8's crowns ÷ on HEAD's, season 100 (per seed)\n")
    print("| pair | " + " | ".join(LONE) + " |")
    print("|---|" + "---|" * len(LONE))
    for wide, narrow in [("base", "H4k8"), ("W1", "H4k8W1"), ("W2", "H4k8W2"), ("W4", "H4k8W4"), ("L2", "H4k8L2"), ("S2", "H4k8S2")]:
        if wide not in arms or narrow not in arms:
            continue
        cells = []
        for sp in LONE:
            a = {r["seed"]: r for r in lone[(wide, sp)] if r["season"] == 100 and not r["dead"]}
            b = {r["seed"]: r for r in lone[(narrow, sp)] if r["season"] == 100 and not r["dead"]}
            cells.append(rng([b[k]["D"] / a[k]["D"] for k in a if k in b], 2))
        print(f"| {narrow} ÷ {wide} | " + " | ".join(cells) + " |")

    print("\n## Garden at 160 cells (seeds pooled)\n")
    print("| arm | planted | thrown (bar 9) | canopy trees/ha at the 100–300 snapshots, median per run | runs ≥ 120/ha at every snapshot from 100 | "
          "stand H/D beech, root (n) | stand H/D hornbeam, root (n) | hornbeam at 1.3 m | limb breaks per run | in storm seasons |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    garden = {}
    for a in arms:
        rs = runs(a, "hornbeam", "garden160")
        planted = thrown = 0
        med, full, st_rows, bs, bt = [], 0, [], 0.0, 0.0
        for seed, run in zip(SEEDS, rs):
            n, t = planted_fates(run)
            planted += n
            thrown += t
            c = canopy_per_ha(run)
            med.append(st.median(c.values()) if c else 0)
            full += bool(c) and min(c.values()) >= 120
            st_rows += stand_rows(run)
            s, tot = breaks(run, storms.get(seed, set()))
            bs, bt = bs + s, bt + tot
        hd = {}
        for sp in GUARD:
            xs = [r["HD0"] for r in st_rows if r["species"] == sp and r["HD0"]]
            hd[sp] = (st.median(xs) if xs else None, len(xs))
        h13 = [r["HD13"] for r in st_rows if r["species"] == "hornbeam"]
        garden[a] = {"planted": planted, "thrown": thrown, "hd": hd, "runs": len(rs)}
        f = lambda v: f"{v[0]:.0f} ({v[1]})" if v[0] else f"– ({v[1]})"  # noqa: E731
        print(f"| {a} | {planted} | {thrown} | {', '.join(f'{m:.0f}' for m in med)} | {full} of {len(rs)} | {f(hd['beech'])} | "
              f"{f(hd['hornbeam'])} | {f'{st.median(h13):.0f}' if h13 else '–'} | {bt / max(1, len(rs)):.0f} | "
              f"{f'{bs / bt:.2f}' if bt and storms else '–'} |")

    print("\n## The bars (wind arms on H4k8's crowns are the candidates; the σ bracket and HEAD's crowns are reported)\n")
    print("| arm | bar 1: lone H/D at 1.3 m in band | bar 7: stand H/D in band | bar 9: thrown ≤ HEAD's | bar 10: no inverted fork | candidate |")
    print("|---|---|---|---|---|---|")
    head_thrown = garden["base"]["thrown"]
    for a in arms:
        b1, b10 = [], []
        for sp in GUARD:
            live = [r for r in lone[(a, sp)] if not r["dead"]]
            lo, hi = HD_BAND[sp]
            b1.append(f"{sp} {sum(lo <= r['HD'] <= hi for r in live)} of 6")
            b10.append(f"{sp} {sum(r['junction'] <= JUNCTION for r in live)} of 6")
        ok1 = all(s.endswith(" 6 of 6") for s in b1)
        ok10 = all(s.endswith(" 6 of 6") for s in b10)
        g = garden[a]
        b7, ok7 = [], True
        for sp in GUARD:
            m, n = g["hd"][sp]
            lo, hi = STAND_BAND[sp]
            if n < STAND_MIN or m is None:
                b7.append(f"{sp} unread ({n})")
                ok7 = ok7 and sp != "hornbeam"  # hornbeam must be read; beech may be too rare
            else:
                inside = lo <= m <= hi
                b7.append(f"{sp} {m:.0f} {'in' if inside else 'out'}")
                ok7 = ok7 and inside
        ok9 = g["runs"] == 3 and g["thrown"] <= head_thrown
        cand = a in CANDIDATES_ORDER and ok1 and ok7 and ok9 and ok10
        print(f"| {a} | {'; '.join(b1)} | {'; '.join(b7)} | {g['thrown']} ({'yes' if ok9 else 'no'}) | {'; '.join(b10)} | "
              f"{'**yes**' if cand else ('–' if a not in CANDIDATES_ORDER else 'no')} |")


main()
