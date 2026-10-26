"""M0 visible test: with every bud growing, metamer count explodes exponentially (Borchert–Slade).

    uv run --project analysis python analysis/experiments/m0_growth.py
"""

from pathlib import Path

import polars as pl
from plotnine import aes, geom_line, ggplot, labs, scale_y_log10, theme_minimal

from treesim import REPO, Run, load_runs, run_many

EXPERIMENT = "runs/m0-growth"
OUT = REPO / "analysis" / "out"

run_many([Run(out=f"{EXPERIMENT}/seed{s}", preset="explosion", seed=s, seasons=12) for s in (1, 2, 3)])
metrics = load_runs(REPO / EXPERIMENT)

ratios = (
    metrics.sort("run", "season")
    .with_columns((pl.col("metamers") / pl.col("metamers").shift(1)).over("run").alias("ratio"))
    .filter(pl.col("season") > 2)
    .group_by("run")
    .agg(pl.col("ratio").mean().alias("mean growth ratio per season"))
    .sort("run")
)
print(ratios)

OUT.mkdir(parents=True, exist_ok=True)
plot = (
    ggplot(metrics.to_pandas(), aes("season", "metamers", colour="run"))
    + geom_line()
    + scale_y_log10()
    + labs(title="M0: every bud grows", y="metamers (log scale)")
    + theme_minimal()
)
plot.save(OUT / "m0_growth.png", width=6, height=4, dpi=120, verbose=False)
print(f"wrote {Path(OUT / 'm0_growth.png').relative_to(REPO)}")
