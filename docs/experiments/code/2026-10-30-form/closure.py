"""Form step 3 (plan §4): canopy closure, from rescale.sh's runs (SNAPS=100,150,200).

Per variant (base, k8) and τ (t02, t0), seeds 1–3, at 100, 150, 200, 300:
- the floor: light on the ground row (light.csv, of open sky), split by ground.csv's columns into
  gaps (LAI above < 1) and canopy (the rest), and the canopy's columns with LAI ≥ 6; the gap
  fraction; the faces' share is τ 0.2's floor less τ 0's;
- trees: planted alive of planted; O4's background mortality alone (m0 per season from planting)
  would leave planted × (1 − m0)^s; deaths of planted trees by cause in each window; recruits
  alive and recruits ≥ 20 cells tall;
- crowns: median crown width of the planted alive against the spacing in x (width ÷ trees per row);
- the light profile by row (every 10 rows) and LAI: stand mean, and under the crowns (≥ 1);
- why the stand's leaf crown ratio rises from 150 to 300 (τ 0): the same trees at 150 and 300
  (survivors) against the population's median, split by whether a planted neighbour within
  1.5 spacings died in between; their leaf bases and heights.

    uv run --project analysis python docs/experiments/code/2026-10-30-form/closure.py runs/form3
"""

import json
import math
import sys
from collections import Counter, defaultdict
from statistics import mean, median

import polars as pl

d = sys.argv[1] if len(sys.argv) > 1 else "runs/form3"
SEEDS = (1, 2, 3)
SEASONS = (100, 150, 200, 300)
TALL = 20
TAU = {"t0": "0", "t01": "0.1", "t02": "0.2"}  # t01: tau.sh's row (k8 only)


def csv(path):
    return pl.read_csv(path, infer_schema_length=None)


def metrics(run):
    m = pl.read_csv(f"{run}/metrics.csv", infer_schema_length=0)
    return m.with_columns(pl.exclude("species").cast(pl.Float64))


def cause(first):
    if first["broken"] >= first["metamers"] > 0:
        return "thrown"
    if first["starved"] > 0:
        return "starved"
    return "other"


def read_variant(v, tau):
    out = defaultdict(lambda: defaultdict(list))
    deaths = Counter()
    rise = defaultdict(list)
    for s in SEEDS:
        run = f"{d}/forest/{v}-{tau}-s{s}"
        params = json.load(open(f"{run}/run.json"))["params"]
        trees = params["trees"]
        n = len(trees)
        width = params["world"]["width"]
        rows = len({round(t.get("z", 0), 3) for t in trees})
        spacing = width * rows / n
        m0 = params["o4"]["m0"]
        m = metrics(run)
        light = csv(f"{run}/light.csv")
        ground = csv(f"{run}/ground.csv")
        planted = m.filter(pl.col("tree") < n)
        for season in SEASONS:
            o = out[season]
            fl = light.filter((pl.col("season") == season) & (pl.col("row") == 0))
            o["floor"].append(1 - fl["shade"].mean())
            g = ground.filter(pl.col("season") == season)
            gap = g.filter(pl.col("lai") < 1)
            can = g.filter(pl.col("lai") >= 1)
            dense = g.filter(pl.col("lai") >= 6)
            o["gap_frac"].append(gap.height / g.height)
            o["floor_gap"].append(gap["q"].mean() if gap.height else math.nan)
            o["floor_canopy"].append(can["q"].mean() if can.height else math.nan)
            o["floor_dense"].append(dense["q"].mean() if dense.height else math.nan)
            o["dense_frac"].append(dense.height / g.height)
            o["lai"].append(g["lai"].mean())
            o["lai_crown"].append(can["lai"].mean() if can.height else math.nan)
            prof = light.filter(pl.col("season") == season).group_by("row").agg((1 - pl.col("shade")).mean().alias("q"))
            for r, q in prof.iter_rows():
                if r % 10 == 0:
                    o[f"row{r}"].append(q)
            live = m.filter((pl.col("season") == season) & (pl.col("alive") == 1))
            lp = live.filter(pl.col("tree") < n)
            o["alive"].append(lp.height)
            o["o4_only"].append(n * (1 - m0) ** season)
            o["cw"] += lp["crownWidth"].to_list()
            o["spacing"].append(spacing)
            rec = live.filter(pl.col("tree") >= n)
            o["recruits"].append(rec.height)
            o["recruits_tall"].append(rec.filter(pl.col("height") >= TALL).height)
            o["lcr"] += lp["leafCrownRatio"].to_list()
            o["leafbase"] += lp["leafBase"].to_list()
            o["height"] += lp["height"].to_list()
        # Deaths of planted trees by cause, per window.
        dead = planted.filter(pl.col("alive") == 0).sort("season")
        for t in dead["tree"].unique().to_list():
            first = dead.filter(pl.col("tree") == t).row(0, named=True)
            w = next(f"≤{x}" for x in SEASONS if first["season"] <= x)
            deaths[(w, cause(first))] += 1
        # The leaf crown ratio's rise: survivors from 150 to 300, by whether a neighbour died.
        a = planted.filter((pl.col("season") == 150) & (pl.col("alive") == 1))
        b = planted.filter((pl.col("season") == 300) & (pl.col("alive") == 1))
        pos = {r["tree"]: (r["rootX"], r["rootZ"]) for r in a.iter_rows(named=True)}
        alive300 = set(b["tree"].to_list())
        died = [t for t in pos if t not in alive300]
        for r in b.iter_rows(named=True):
            t = r["tree"]
            if t not in pos:
                continue
            ra = a.filter(pl.col("tree") == t).row(0, named=True)
            x, z = pos[t]

            def near(u):
                dx = abs(pos[u][0] - x)
                dx = min(dx, width - dx)
                return math.hypot(dx, pos[u][1] - z) <= 1.5 * spacing

            lost = any(near(u) for u in died)
            key = "lost a neighbour" if lost else "kept its neighbours"
            rise[key].append((ra["leafCrownRatio"], r["leafCrownRatio"], ra["leafBase"], r["leafBase"], ra["height"], r["height"]))
    return out, deaths, rise


def f(xs, p=1):
    xs = [x for x in xs if x == x]
    return f"{mean(xs) * (100 if p == 100 else 1):.{0 if p == 100 else 2}f}" if xs else "-"


for v in ("k8", "base"):
    for tau in ("t0", "t01", "t02"):
        try:
            out, deaths, rise = read_variant(v, tau)
        except FileNotFoundError as e:
            print(f"{v}-{tau}: missing ({e})")
            continue
        print(f"\n== forest {v}, τ {TAU[tau]} ==")
        print("season | floor | gaps: share, floor | canopy floor | LAI≥6: share, floor | LAI stand / crown | planted alive (O4 alone) | recruits (≥20) | crown width / spacing")
        for s in SEASONS:
            o = out[s]
            print(
                f"  {s} | {mean(o['floor']):.3f} | {mean(o['gap_frac']):.0%}, {f(o['floor_gap'])} | {f(o['floor_canopy'])} | "
                f"{mean(o['dense_frac']):.0%}, {f(o['floor_dense'])} | {mean(o['lai']):.1f} / {f(o['lai_crown'], 1)} | "
                f"{sum(o['alive'])}/{3 * 30} ({sum(o['o4_only']):.0f}) | {sum(o['recruits'])} ({sum(o['recruits_tall'])}) | "
                f"{median(o['cw']):.1f} / {mean(o['spacing']):.0f}"
            )
        print("  light by row (100, 150, 200, 300): " + "; ".join(
            f"row {r}: " + " ".join(f"{mean(out[s][f'row{r}']):.2f}" for s in SEASONS)
            for r in range(0, 100, 10) if all(out[s][f"row{r}"] for s in SEASONS)))
        print("  planted deaths by window and cause: " + ", ".join(f"{w} {c} {k}" for (w, c), k in sorted(deaths.items())))
        print("  leaf crown ratio, population median: " + " ".join(f"{s}: {median(out[s]['lcr']):.2f} (base {median(out[s]['leafbase']):.0f}, height {median(out[s]['height']):.0f})" for s in SEASONS))
        for k, xs in rise.items():
            print(f"  survivors 150 → 300, {k} (n {len(xs)}): ratio {median(x[0] for x in xs):.2f} → {median(x[1] for x in xs):.2f}; "
                  f"leaf base {median(x[2] for x in xs):.0f} → {median(x[3] for x in xs):.0f}; height {median(x[4] for x in xs):.0f} → {median(x[5] for x in xs):.0f}")
