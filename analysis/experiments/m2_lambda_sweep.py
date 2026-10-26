"""M2 / spec §8 sweep: λ from 0.44 to 0.58. Is the shift in trunk dominance threshold-like?

    uv run --project analysis python analysis/experiments/m2_lambda_sweep.py
"""

import polars as pl
from plotnine import (
    aes,
    facet_wrap,
    geom_line,
    geom_point,
    ggplot,
    labs,
    stat_summary,
    theme_minimal,
)

from treesim import REPO, Run, load_runs, run_many

EXPERIMENT = "runs/m2-lambda"
FIGURE = REPO / "docs" / "experiments" / "figures" / "2026-10-26-m2-lambda-sweep.png"
LAMBDAS = [0.44, 0.46, 0.48, 0.50, 0.52, 0.54, 0.56, 0.58]
SEEDS = range(1, 6)
SEASON = 25

runs = [
    Run(out=f"{EXPERIMENT}/l{lam:.2f}-seed{seed}", preset="bh", seed=seed, seasons=SEASON,
        patch={"c3": {"lambda": lam}})
    for lam in LAMBDAS
    for seed in SEEDS
]
run_many(runs)

metrics = (
    load_runs(REPO / EXPERIMENT)
    .with_columns(pl.col("run").str.extract(r"l([0-9.]+)-").cast(pl.Float64).alias("lambda"))
    .with_columns((pl.col("height") / pl.col("crownWidth")).alias("slenderness"))
)
final = metrics.filter(pl.col("season") == SEASON)
summary = (
    final.group_by("lambda")
    .agg(
        pl.col("height").mean().round(1).alias("height"),
        pl.col("crownWidth").mean().round(1).alias("width"),
        pl.col("slenderness").mean().round(2).alias("height/width"),
        pl.col("metamers").mean().round(0).alias("metamers"),
    )
    .sort("lambda")
)
print(summary)

long = final.unpivot(
    index=["lambda", "seed"], on=["height", "crownWidth", "slenderness", "metamers"]
).to_pandas()
plot = (
    ggplot(long, aes("lambda", "value"))
    + geom_point(alpha=0.5)
    + stat_summary(geom=geom_line, fun_y=lambda x: x.mean())
    + facet_wrap("variable", scales="free_y", ncol=4)
    + labs(title=f"λ sweep, preset bh, season {SEASON}, 5 seeds", x="λ", y="")
    + theme_minimal()
)
FIGURE.parent.mkdir(parents=True, exist_ok=True)
plot.save(FIGURE, width=10, height=3, dpi=100, verbose=False)
print(f"wrote {FIGURE.relative_to(REPO)}")
