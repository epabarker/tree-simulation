"""#134's beech stand check: its tables and bars (docs/experiments/2026-11-16-beech-stand-check.md, bars
fixed before any run). Reads runs/134-beech-stand/<arm>/w<width>-s<seed>/ (run.ts).

    uv run --project analysis python -I docs/experiments/code/2026-11-16-beech-stand-check/stand.py [-j 10]

Measures every run once with the path-length note's dbh.py (its `measure`: DBH at 1.3 m of stem and the tip
crown), into runs/134-beech-stand/measure/ (the linked runs are other probes': nothing is written beside them).
Writes runs/134-beech-stand/{summary.json, tables.md} and prints the tables.
"""

import csv
import importlib.util
import json
import math
import statistics as st
import sys
from collections import defaultdict
from multiprocessing import Pool
from pathlib import Path

import polars as pl

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
sys.path.insert(0, str(REPO / "analysis"))
from treesim import tallo  # noqa: E402

_argv, sys.argv = sys.argv, [sys.argv[0]]  # dbh.py measures its argv's runs on import: give it none
_spec = importlib.util.spec_from_file_location("dbh", HERE.parent / "2026-11-11-garden-pathlength" / "dbh.py")
dbh = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dbh)
sys.argv = _argv

ROOT = REPO / "runs" / "134-beech-stand"
ARMS = ("head", "s3d", "B1", "B2", "B1s3d", "B2s3d")
BASELINE = {"B1": "head", "B2": "head", "B1s3d": "s3d", "B2s3d": "s3d"}
WIDTHS = (160, 66)
SEEDS = range(1, 21)
FRAMES = (100, 200, 300)
GATE_SEASONS = (100, 300)
CELL = 0.25
DRAWN = 1.3 / CELL
FLOOR = 8
GATE_OF_20 = 18
STAND_HD = {"beech": (70, 94), "hornbeam": (74, 98)}
H100_SOURCE = (28.5, 32.5)
H100_FIT = ((122 - 26) * CELL, (122 + 26) * CELL)
CURVES = tallo.load_targets()["species"]
GATED = [s for s, e in CURVES.items() if e.get("gated") and "support" in e.get("CR", {})]


def ha(width):
    return width * 64 * 0.0625 / 1e4


def run_dir(arm, width, seed):
    return ROOT / arm / f"w{width}-s{seed}"


def measure_path(arm, width, seed):
    return ROOT / "measure" / f"{arm}-w{width}-s{seed}.csv"


def measure(job):
    """dbh.py's measure per (season, tree) at the frames, joined to the core's height, slenderness and species."""
    arm, width, seed = job
    out = measure_path(arm, width, seed)
    if out.exists():
        return
    d = run_dir(arm, width, seed)
    core = (
        pl.scan_csv(d / "metrics.csv", infer_schema_length=0)
        .filter(pl.col("season").is_in([str(f) for f in FRAMES]) & (pl.col("alive") == "1"))
        .select("season", "tree", "species", "height", "slenderness")
        .collect()
    )
    core_by = {(int(r[0]), r[1]): r for r in core.iter_rows()}
    trees = defaultdict(list)
    with open(d / "metamers.csv") as f:
        rd = csv.reader(f)
        h = {k: i for i, k in enumerate(next(rd))}
        cols = [h[k] for k in ("birthId", "parentBirthId", "radius", "length", "x0", "y0", "x1", "y1", "z0", "z1")]
        s, t = h["season"], h["tree"]
        for r in rd:
            trees[(int(r[s]), r[t])].append((r[cols[0]], r[cols[1]]) + tuple(float(r[c]) for c in cols[2:]))
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".tmp")
    with open(tmp, "w", newline="") as f:
        w = None
        for (season, tree), rows in sorted(trees.items(), key=lambda kv: (kv[0][0], int(kv[0][1]))):
            c = core_by.get((season, tree))
            if c is None:
                continue
            m = {"season": season, "tree": tree, "species": c[2], "h_cells": float(c[3]), "hd_core": float(c[4]),
                 **dbh.measure(rows)}
            if w is None:
                w = csv.DictWriter(f, fieldnames=list(m))
                w.writeheader()
            w.writerow({k: (f"{v:.4f}" if isinstance(v, float) else v) for k, v in m.items()})
    tmp.rename(out)


def read_run(arm, width, seed):
    d = run_dir(arm, width, seed)
    stand = list(csv.DictReader(open(d / "stand.csv")))
    top = {int(r["season"]): float(r["topHeight100"]) for r in stand}
    canopy = {int(r["season"]): int(r["canopy"]) for r in stand}
    meta = json.load(open(d / "run.json"))["meta"]
    trees = [
        {**r, "season": int(r["season"])}
        for r in csv.DictReader(open(measure_path(arm, width, seed)))
    ]
    for t in trees:
        hc = float(t["h_cells"])
        t["canopy"] = hc >= DRAWN and hc > 0.5 * top[t["season"]]
        t["dbh"] = float(t["dbh_cm"])
        t["cr"] = float(t["cr_m"])
        t["robust_r"] = (float(t["rx_m"]) + float(t["rz_m"])) / 4  # half the mean 5-95% spread: a radius
        t["H"] = hc * CELL
    shares = defaultdict(dict)
    for r in csv.DictReader(open(d / "stand-species.csv")):
        if int(r["season"]) in FRAMES:
            shares[int(r["season"])][r["species"]] = int(r["drawn"])
    floor = {}
    g = d / "ground.csv"
    if g.exists():
        q = pl.read_csv(g).filter(pl.col("season").is_in(FRAMES)).group_by("season").agg(pl.col("q").mean())
        floor = {int(s): float(v) for s, v in q.iter_rows()}
    return {
        "arm": arm, "width": width, "seed": seed,
        "hash": (d / "hash.txt").read_text().strip(),
        "gate1": min(c for s, c in canopy.items() if s >= 51) >= 1,
        "gate2": min(c for s, c in canopy.items() if s >= 100) >= 1,
        "canopyPerHa": st.median(c / ha(width) for s, c in canopy.items() if s >= 100),
        "canopy120": min(c / ha(width) for s, c in canopy.items() if s >= 100) >= 120,
        "capSeasons": int(meta["capSeasons"]),
        "top100": top[100] * CELL,
        "stems7": {f: sum(1 for t in trees if t["season"] == f and t["dbh"] >= 7) / ha(width) for f in FRAMES},
        "drawnBySpecies": shares,
        "floor": floor,
        "trees": [t for t in trees if t["canopy"]],
    }


def z_cell(trees, sp, season, trait="CR"):
    """Bar 6 on the pooled canopy trees of `sp` at `season` (pooled with 200 below the floor)."""
    curve = CURVES[sp][trait]

    def zs(seasons):
        key = "cr" if trait == "CR" else "H"
        rows = [t for t in trees if t["species"] == sp and t["season"] in seasons]
        z = [tallo.z_score(curve, t["dbh"], t[key]) for t in rows]
        return rows, [x for x in z if x is not None]

    seasons = (season,)
    rows, z = zs(seasons)
    if len(z) < FLOOR:
        seasons = tuple(sorted({season, 200}))
        rows, z = zs(seasons)
    if len(z) < FLOOR:
        return {"readable": False, "n": len(rows), "inside": len(z), "seasons": seasons}
    m = float(st.median(z))
    return {"readable": True, "n": len(rows), "inside": len(z), "seasons": seasons, "medianZ": m,
            "passes": abs(m) <= 1}


def fmt(x, nd=2):
    return "–" if x is None or (isinstance(x, float) and math.isnan(x)) else f"{x:.{nd}f}"


def main():
    jobs = int(sys.argv[sys.argv.index("-j") + 1]) if "-j" in sys.argv else 10
    todo = [(a, w, s) for a in ARMS for w in WIDTHS for s in SEEDS if (run_dir(a, w, s) / "hash.txt").exists()]
    with Pool(jobs) as p:
        p.map(measure, todo)
    runs = defaultdict(list)
    for a, w, s in todo:
        runs[(a, w)].append(read_run(a, w, s))
    lines = []
    say = lambda s="": (print(s), lines.append(s))  # noqa: E731
    summary = {}

    say("## Gates 1 (#122) and the reported stand, per arm and width\n")
    say("| arm | width | runs | gate 1 | gate 2 | canopy/ha, median | runs ≥ 120/ha every season from 100 | "
        "cap seasons, median (runs at 0) | stems ≥ 7 cm/ha at 100 / 200 / 300 | top height 100 (m) | floor light at 100 / 200 / 300 |")
    say("|---|---|---|---|---|---|---|---|---|---|---|")
    for a in ARMS:
        for w in WIDTHS:
            rs = runs.get((a, w), [])
            if not rs:
                continue
            n = len(rs)
            g1, g2 = sum(r["gate1"] for r in rs), sum(r["gate2"] for r in rs)
            fl = [st.median([r["floor"][f] for r in rs if f in r["floor"]]) if any(f in r["floor"] for r in rs) else None
                  for f in FRAMES]
            row = {
                "runs": n, "gate1": g1, "gate2": g2 if w == 66 else None,
                "gate1Pass": g1 >= GATE_OF_20 * n / 20 and (w != 66 or g2 >= GATE_OF_20 * n / 20),
                "canopyPerHa": st.median(r["canopyPerHa"] for r in rs),
                "canopy120Runs": sum(r["canopy120"] for r in rs),
                "capMedian": st.median(r["capSeasons"] for r in rs),
                "capPerRun": [r["capSeasons"] for r in sorted(rs, key=lambda r: r["seed"])],
                "capFree": sum(r["capSeasons"] == 0 for r in rs),
                "stems7": [st.median(r["stems7"][f] for r in rs) for f in FRAMES],
                "top100": st.median(r["top100"] for r in rs),
                "floor": fl,
            }
            summary.setdefault(a, {})[w] = row
            say(f"| {a} | {w} | {n} | {g1} | {g2 if w == 66 else '–'} | {row['canopyPerHa']:.0f} | {row['canopy120Runs']} | "
                f"{row['capMedian']:g} ({row['capFree']}) | {' / '.join(f'{x:.0f}' for x in row['stems7'])} | "
                f"{row['top100']:.1f} | {' / '.join(fmt(x, 3) for x in fl)} |")
    say()
    say("Cap seasons per run (seeds 1–20):")
    for a in ARMS:
        for w in WIDTHS:
            if a in summary and w in summary[a]:
                say(f"- {a} {w}: {' '.join(map(str, summary[a][w]['capPerRun']))}")
    say()

    # Bar 6, the stand gate (160 cells).
    say("## Bar 6: the stand gate against Tallo (160 cells, canopy trees, seeds pooled)\n")
    say("| arm | species | season (pooled) | canopy trees | inside support | DBH cm, median | crown radius m, median | "
        "crown ÷ q50, median | robust ÷ q50, median | median z CR | passes | median z H |")
    say("|---|---|---|---|---|---|---|---|---|---|---|---|")
    gate = {}
    for a in ARMS:
        trees = [t for r in runs.get((a, 160), []) for t in r["trees"]]
        for sp in sorted({t["species"] for t in trees}):
            for s in GATE_SEASONS:
                if sp not in GATED:
                    continue
                c = z_cell(trees, sp, s)
                zh = z_cell(trees, sp, s, "H")
                gate.setdefault(a, {})[f"{sp}@{s}"] = c
                rows = [t for t in trees if t["species"] == sp and t["season"] in c["seasons"]]
                if not rows:
                    continue
                q50 = []
                rob = []
                for t in rows:
                    lo, hi = CURVES[sp]["CR"]["support"]
                    if lo <= t["dbh"] <= hi:
                        q = math.exp(tallo.predict(CURVES[sp]["CR"], t["dbh"])[0][1])
                        q50.append(t["cr"] / q)
                        rob.append(t["robust_r"] / q)
                say(f"| {a} | {sp} | {s}{'' if c['seasons'] == (s,) else ' (+200)'} | {len(rows)} | {c['inside']} | "
                    f"{st.median(t['dbh'] for t in rows):.0f} | {st.median(t['cr'] for t in rows):.1f} | "
                    f"{fmt(st.median(q50) if q50 else None)} | {fmt(st.median(rob) if rob else None)} | "
                    f"{fmt(c.get('medianZ'))} | {('yes' if c['passes'] else 'no') if c['readable'] else 'unreadable'} | "
                    f"{fmt(zh.get('medianZ'))} |")
    say()

    # Verdicts.
    say("## Verdicts\n")
    say("| arm | baseline | gate 1 (#122) | beech passes bar 6 at 100 / 300 | (a) beech no worse | "
        "(b) baseline's passing cells kept | at least as well | vs head |")
    say("|---|---|---|---|---|---|---|---|")

    def compare(a, b):
        ga, gb = gate.get(a, {}), gate.get(b, {})
        beech_ok = True
        for s in GATE_SEASONS:
            ca, cb = ga.get(f"beech@{s}"), gb.get(f"beech@{s}")
            if ca is None or not ca["readable"]:
                beech_ok = False
                continue
            if ca["passes"]:
                continue
            if cb is None or not cb["readable"] or abs(ca["medianZ"]) > abs(cb["medianZ"]):
                beech_ok = False
        kept = all(ga.get(k, {}).get("passes", False) for k, v in gb.items() if v.get("passes"))
        lost = [k for k, v in gb.items() if v.get("passes") and not ga.get(k, {}).get("passes", False)]
        return beech_ok, kept, lost

    verdicts = {}
    for a, b in BASELINE.items():
        if a not in summary:
            continue
        g1 = all(summary[a][w]["gate1Pass"] for w in WIDTHS if w in summary[a])
        beech = [gate.get(a, {}).get(f"beech@{s}", {}) for s in GATE_SEASONS]
        passes = all(c.get("passes", False) for c in beech)
        ok, kept, lost = compare(a, b)
        okh, keptk, losth = compare(a, "head")
        verdicts[a] = {"baseline": b, "gate1": g1, "beechPasses": passes, "beechNoWorse": ok, "kept": kept,
                       "lost": lost, "atLeastAsWell": g1 and ok and kept,
                       "vsHead": g1 and okh and keptk, "lostVsHead": losth}
        bp = " / ".join(("yes" if c.get("passes") else "no") if c.get("readable") else "unreadable" for c in beech)
        say(f"| {a} | {b} | {'pass' if g1 else 'FAIL'} | {bp} | {'yes' if ok else 'no'} | "
            f"{'yes' if kept else 'no: ' + ', '.join(lost)} | **{'yes' if verdicts[a]['atLeastAsWell'] else 'no'}** | "
            f"{'yes' if verdicts[a]['vsHead'] else 'no' + (': ' + ', '.join(losth) if losth else '')} |")
    for b in ("head", "s3d"):
        if b in summary:
            g1 = all(summary[b][w]["gate1Pass"] for w in WIDTHS if w in summary[b])
            say(f"\n{b}: gate 1 {'pass' if g1 else 'FAIL'}")
    for x, y in (("B1", "B1s3d"), ("B2", "B2s3d")):
        if x in verdicts and y in verdicts:
            same = verdicts[x]["atLeastAsWell"] == verdicts[y]["atLeastAsWell"]
            say(f"Stubs {'do not change' if same else 'CHANGE'} {x}'s answer ({x}: "
                f"{verdicts[x]['atLeastAsWell']}, {y}: {verdicts[y]['atLeastAsWell']})")
    say()

    # Reported: beech's height at 100, the stand H/D, the canopy's species.
    say("## Reported (160 cells)\n")
    say("| arm | canopy beech at 100: n, mean H (m) [run medians' median] | stand H/D core, beech 100 / 300 | "
        "H/DBH beech 100 / 300 | stand H/D core, hornbeam 100 / 300 | H/DBH hornbeam 100 / 300 |")
    say("|---|---|---|---|---|---|")
    rep = {}
    for a in ARMS:
        rs = runs.get((a, 160), [])
        if not rs:
            continue
        trees = [t for r in rs for t in r["trees"]]
        b100 = [t["H"] for t in trees if t["species"] == "beech" and t["season"] == 100]
        per = [st.median([t["H"] for t in r["trees"] if t["species"] == "beech" and t["season"] == 100])
               for r in rs if any(t["species"] == "beech" and t["season"] == 100 for t in r["trees"])]

        def hd(sp, s, key):
            xs = [(float(t["hd_core"]) if key == "core" else t["H"] / (t["dbh"] / 100))
                  for t in trees if t["species"] == sp and t["season"] == s and t["dbh"] > 0]
            return (st.median(xs), len(xs)) if xs else (None, 0)

        cells = {f"{sp}.{k}.{s}": hd(sp, s, k) for sp in STAND_HD for k in ("core", "dbh") for s in GATE_SEASONS}
        rep[a] = {"beech100": (len(b100), st.mean(b100) if b100 else None, st.median(per) if per else None),
                  "hd": cells}
        f = lambda sp, k: " / ".join(f"{fmt(cells[f'{sp}.{k}.{s}'][0], 0)} (n {cells[f'{sp}.{k}.{s}'][1]})"  # noqa: E731
                                     for s in GATE_SEASONS)
        say(f"| {a} | {len(b100)}, {fmt(rep[a]['beech100'][1], 1)} [{fmt(rep[a]['beech100'][2], 1)}] | "
            f"{f('beech', 'core')} | {f('beech', 'dbh')} | {f('hornbeam', 'core')} | {f('hornbeam', 'dbh')} |")
    say(f"\nBands: stand.height100 {H100_SOURCE[0]}–{H100_SOURCE[1]} m (source), {H100_FIT[0]:.1f}–{H100_FIT[1]:.1f} m "
        f"(the fit's); stand H/D beech {STAND_HD['beech']}, hornbeam {STAND_HD['hornbeam']}.\n")

    say("| arm | width | canopy trees by species at 100 / 200 / 300 (pooled; share) | drawn stems' shares at 300 (pooled) |")
    say("|---|---|---|---|")
    for a in ARMS:
        for w in WIDTHS:
            rs = runs.get((a, w), [])
            if not rs:
                continue
            parts = []
            for s in FRAMES:
                c = defaultdict(int)
                for r in rs:
                    for t in r["trees"]:
                        if t["season"] == s:
                            c[t["species"]] += 1
                n = sum(c.values()) or 1
                parts.append(", ".join(f"{k} {v} ({v / n:.2f})" for k, v in sorted(c.items(), key=lambda kv: -kv[1])))
            d = defaultdict(int)
            for r in rs:
                for k, v in r["drawnBySpecies"].get(300, {}).items():
                    d[k] += v
            n = sum(d.values()) or 1
            ds = ", ".join(f"{k} {v / n:.2f}" for k, v in sorted(d.items(), key=lambda kv: -kv[1]) if v)
            say(f"| {a} | {w} | {' / '.join(parts)} | {ds} |")

    (ROOT / "summary.json").write_text(json.dumps({"summary": summary, "gate": gate, "verdicts": verdicts,
                                                   "reported": rep}, indent=1, default=str))
    (ROOT / "tables.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
