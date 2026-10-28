"""M18: the row-marched sky sweep against the M6 column sweep (ADR 0005 amendment).

Same presets, same seeds, only `c2.sweep` differs. Do the stand patterns survive the change
within seed-to-seed noise? Height, slenderness, crown ratio and width, crown base, the lean of
edge trees, and ground light, at season 60 over 10 seeds.

    uv run --project analysis python analysis/experiments/m18_light.py
"""

import polars as pl
from treesim import REPO, Run, load_runs, run_many

EXPERIMENT = "runs/m18-light"
SEEDS = range(1, 11)
SEASONS = 60
PRESETS = ["skyTree", "skyStand", "forest"]
SWEEPS = ["columns", "rows"]

runs = [
    Run(f"{EXPERIMENT}/{p}_{sw}_s{seed}", p, seed, SEASONS, {"c2": {"sweep": sw}})
    for p in PRESETS
    for sw in SWEEPS
    for seed in SEEDS
]
run_many(runs)

m = load_runs(REPO / EXPERIMENT).with_columns(
    pl.col("run").str.extract(r"^(\w+?)_").alias("preset"),
    pl.col("run").str.extract(r"_(rows|columns)_").alias("sweep"),
)
last = m.filter(pl.col("season") == SEASONS, pl.col("alive"))
# Stands: interior trees only (the planted trees 2–7); edge lean from the two outermost.
interior = last.filter((pl.col("preset") == "skyTree") | pl.col("tree").is_between(2, 7))
edges = last.filter(pl.col("preset") == "skyStand", pl.col("tree").is_in([0, 9])).with_columns(
    # Outward lean: the left edge tree leans left (negative offset), the right one right.
    pl.when(pl.col("tree") == 0).then(-pl.col("centroidOffset")).otherwise(pl.col("centroidOffset")).alias("lean")
)

per_run = (
    interior.group_by("preset", "sweep", "seed")
    .agg(
        pl.col("height").mean().alias("height"),
        pl.col("slenderness").mean().alias("H/D"),
        pl.col("crownRatio").mean().alias("crown ratio"),
        (pl.col("crownWidth") / pl.col("height")).mean().alias("W/H"),
        pl.col("groundLight").mean().alias("ground light"),
        pl.col("metamers").mean().alias("metamers"),
    )
    .join(
        edges.group_by("preset", "sweep", "seed").agg(pl.col("lean").mean().alias("edge lean")),
        on=["preset", "sweep", "seed"],
        how="left",
    )
)
measures = ["height", "H/D", "crown ratio", "W/H", "ground light", "metamers", "edge lean"]
summary = per_run.group_by("preset", "sweep").agg(
    *[pl.col(c).mean().round(3).alias(c) for c in measures],
    *[pl.col(c).std().round(3).alias(f"{c} sd") for c in measures],
)
# The change in each measure in units of its seed-to-seed spread (pooled sd of the two sweeps).
wide = summary.pivot("sweep", index="preset", values=measures + [f"{c} sd" for c in measures])
effects = wide.select(
    "preset",
    *[
        (
            (pl.col(f"{c}_rows") - pl.col(f"{c}_columns"))
            / ((pl.col(f"{c} sd_rows") ** 2 + pl.col(f"{c} sd_columns") ** 2) / 2).sqrt()
        )
        .round(2)
        .alias(c)
        for c in measures
    ],
)
with pl.Config(tbl_cols=30, tbl_width_chars=250):
    print(summary.select("preset", "sweep", *measures).sort("preset", "sweep"))
    print("change, rows − columns, in pooled seed sd (|d| < 1: within noise)")
    print(effects.sort("preset"))
