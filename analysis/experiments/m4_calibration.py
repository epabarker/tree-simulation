"""M4 calibration with C2–C6 on: which shadow constants (a, b, qMax) and shedding threshold T
give isolated trees that survive the seedling stage, stay full and lift their crown base?

    uv run --project analysis python analysis/experiments/m4_calibration.py
"""

import itertools

import polars as pl

from treesim import REPO, Run, load_runs, run_many

EXPERIMENT = "runs/m4-calibration"
SEASONS = 50
GRID = {
    "a": [0.05, 0.1, 0.2],
    "b": [1.3, 1.5, 2.0],
    "qMax": [6, 10],
    "T": [0.05, 0.1, 0.15],
    "lambda": [0.5, 0.56],
}
SEEDS = range(1, 6)

runs = []
for a, b, q, T, lam in itertools.product(*GRID.values()):
    patch = {
        "c2": {"a": a, "b": b, "qMax": q},
        "c3": {"lambda": lam},
        "c4": {"enabled": True},
        "c5": {"enabled": True, "T": T},
        "c6": {"enabled": True},
    }
    for seed in SEEDS:
        name = f"a{a}-b{b}-q{q}-T{T}-l{lam}-s{seed}"
        runs.append(Run(out=f"{EXPERIMENT}/{name}", preset="bh", seed=seed, seasons=SEASONS, patch=patch))
run_many(runs)

pattern = r"a([0-9.]+)-b([0-9.]+)-q([0-9]+)-T([0-9.]+)-l([0-9.]+)-s"
final = (
    load_runs(REPO / EXPERIMENT)
    .filter(pl.col("season") == SEASONS)
    .with_columns(
        *[
            pl.col("run").str.extract(pattern, i + 1).cast(pl.Float64).alias(name)
            for i, name in enumerate(["a", "b", "qMax", "T", "lambda"])
        ]
    )
)
summary = (
    final.group_by("a", "b", "qMax", "T", "lambda")
    .agg(
        (pl.col("metamers") > 50).mean().alias("survive"),
        pl.col("metamers").median().alias("metamers"),
        pl.col("boleHeight").median().alias("bole"),
        pl.col("crownWidth").median().round(0).alias("width"),
    )
    .sort("a", "b", "qMax", "T", "lambda")
)
with pl.Config(tbl_rows=200):
    print(summary.filter((pl.col("survive") == 1) & (pl.col("metamers") > 300)))
summary.write_csv(REPO / "analysis" / "out" / "m4_calibration.csv")
