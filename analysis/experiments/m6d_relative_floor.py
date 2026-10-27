"""M6d, second sweep: relative shedding with a lower absolute floor.

The first sweep (m6d_shedding_short_shoots.py) showed that max(T, T_rel·Q_top) only raises the
threshold in an even-aged stand, because every canopy tree's top sees near-open sky (Q_top ≈ 1).
Correlative inhibition needs T as a low shade-tolerance floor and T_rel·Q_top ≈ the old T for
canopy trees, so that overtopped trees prune at lower light. Test on the stand, an open-grown
tree and a late, overtopped tree (the M5 `late` preset under the sky sweep), with R6 at the
first sweep's choice (Q_ss 0.1, a_ss 2).

    uv run --project analysis python analysis/experiments/m6d_relative_floor.py
"""

import itertools

import polars as pl

from treesim import REPO, Run, load_runs, run_many

EXPERIMENT = "runs/m6d-floor"
SEEDS = range(1, 6)
SEASONS = 50
R6 = {"enabled": True, "qMin": 0.1, "leafArea": 2}
CONDITIONS = [(0.1, 0.0), (0.05, 0.1), (0.03, 0.1), (0.05, 0.15), (0.03, 0.15), (0.03, 0.12)]

runs = []
for (T, trel), seed in itertools.product(CONDITIONS, SEEDS):
    patch = {"c5": {"T": T, "Trel": trel}, "r6": R6}
    late = {**patch, "c2": {"enabled": True, "model": "sky"}}
    name = f"T{T}-t{trel}-s{seed}"
    runs.append(Run(f"{EXPERIMENT}/stand-{name}", "skyStand", seed, SEASONS, patch))
    runs.append(Run(f"{EXPERIMENT}/tree-{name}", "skyTree", seed, SEASONS, patch))
    runs.append(Run(f"{EXPERIMENT}/late-{name}", "late", seed, SEASONS, late))
run_many(runs)

df = load_runs(REPO / EXPERIMENT).with_columns(
    pl.col("run").str.extract(r"^(stand|tree|late)").alias("setting"),
    pl.col("run").str.extract(r"-T([0-9.]+)-").cast(pl.Float64).alias("T"),
    pl.col("run").str.extract(r"-t([0-9.]+)-s").cast(pl.Float64).alias("Trel"),
    (pl.col("height") - pl.col("boleHeight")).alias("crownDepth"),
)
losses = (
    df.filter(pl.col("setting") == "stand")
    .sort("run", "tree", "season")
    .with_columns(prev=pl.col("metamers").shift(1).over("run", "tree"))
    .filter((pl.col("prev") > 20) & (pl.col("metamers") < 0.5 * pl.col("prev")))
    .group_by("T", "Trel")
    .agg(pl.len().alias("crown losses"))
)
final = df.filter(pl.col("season") == SEASONS)
key = ["T", "Trel"]
interior = final.filter((pl.col("setting") == "stand") & ~pl.col("tree").is_in([0, 9]))
summary = (
    interior.group_by(key)
    .agg(
        pl.col("boleHeight").median().alias("stand bole"),
        pl.col("slenderness").median().round(0).alias("H/D"),
        pl.col("metamers").median().alias("stand metamers"),
    )
    .join(losses, on=key, how="left")
    .join(
        final.filter(pl.col("setting") == "tree")
        .group_by(key)
        .agg(pl.col("boleHeight").median().alias("open bole"), pl.col("metamers").median().alias("open size")),
        on=key,
    )
    .join(
        final.filter((pl.col("setting") == "late") & (pl.col("tree") == 1))
        .group_by(key)
        .agg(
            pl.col("crownDepth").median().round(1).alias("late crown depth"),
            pl.col("metamers").median().alias("late metamers"),
            (pl.col("metamers") > 10).sum().alias("late alive (of 5)"),
        ),
        on=key,
    )
    .join(
        final.filter((pl.col("setting") == "late") & (pl.col("tree") != 1))
        .group_by(key)
        .agg(pl.col("crownDepth").median().round(1).alias("neighbour crown depth")),
        on=key,
    )
    .with_columns(pl.col("crown losses").fill_null(0))
    .sort("Trel", "T")
)
with pl.Config(tbl_cols=20, tbl_width_chars=200):
    print(summary)
