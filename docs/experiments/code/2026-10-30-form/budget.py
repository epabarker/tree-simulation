"""Form step 3 (plan §4): the bud budget, base against k8, from rescale.sh's runs (buds.csv).

Per variant and τ at 150 and 300, over planted alive trees (medians of per-tree values):
live buds; shares active / short shoot / dormant; share with v ≥ 1; leaf per live bud; P, M and
P/M; v_base/P. Which of them the rescale halved.

    uv run --project analysis python docs/experiments/code/2026-10-30-form/budget.py runs/form3
"""

import json
import sys
from statistics import median

import polars as pl

d = sys.argv[1] if len(sys.argv) > 1 else "runs/form3"
ACTIVE, DORMANT, SHORT = 1, 2, 5


def per_tree(run, season):
    n = len(json.load(open(f"{run}/run.json"))["params"]["trees"])
    b = pl.read_csv(f"{run}/buds.csv", infer_schema_length=None).filter(
        (pl.col("season") == season) & (pl.col("tree") < n)
    )
    g = b.group_by("tree").agg(
        pl.len().alias("buds"),
        (pl.col("state") == ACTIVE).mean().alias("active"),
        (pl.col("state") == SHORT).mean().alias("short"),
        (pl.col("state") == DORMANT).mean().alias("dormant"),
        (pl.col("v") >= 1).mean().alias("v1"),
        pl.col("leaf").mean().alias("leaf"),
    )
    m = pl.read_csv(f"{run}/metrics.csv", infer_schema_length=0).with_columns(pl.exclude("species").cast(pl.Float64))
    m = m.filter((pl.col("season") == season) & (pl.col("alive") == 1) & (pl.col("tree") < n)).select(
        pl.col("tree").cast(pl.Int64), "production", "maintenance", "vBase"
    )
    return g.join(m, on="tree")


for tau in ("t02", "t0"):
    print(f"τ {'0.2' if tau == 't02' else '0'}")
    for season in (150, 300):
        for v in ("base", "k8"):
            t = pl.concat([per_tree(f"{d}/forest/{v}-{tau}-s{s}", season) for s in (1, 2, 3)])
            med = lambda c: median(t[c].to_list())
            pm = median((t["production"] / t["maintenance"]).to_list())
            vp = median((t["vBase"] / t["production"]).to_list())
            print(
                f"  {season} {v:4s}: buds {med('buds'):.0f}; active {med('active'):.0%}, short {med('short'):.0%}, "
                f"dormant {med('dormant'):.0%}; v ≥ 1 {med('v1'):.1%}; leaf/bud {med('leaf'):.2f}; "
                f"P {med('production'):.0f}, M {med('maintenance'):.0f}, P/M {pm:.2f}; vBase/P {vp:.2f}"
            )
