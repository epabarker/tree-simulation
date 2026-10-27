"""M7: the three R2 species presets (ADR 0009) against their §9 silhouettes.

Patterns per species, open-grown and in a stand: first-order branch angle from vertical, crown
width over height, where the crown is widest, crown base and H/D; and the birch against a copy
without its λ decline (ontogeny, §R2.4).

    uv run --project analysis python analysis/experiments/m7_species.py
"""

import math

import polars as pl
from plotnine import (
    aes,
    facet_wrap,
    geom_segment,
    ggplot,
    labs,
    scale_colour_manual,
    theme,
    theme_void,
)
from treesim import REPO, Run, load_runs, run_many

EXPERIMENT = "runs/m7-species"
FIGURE = REPO / "docs" / "experiments" / "figures" / "2026-10-27-m7-species.png"
SEEDS = range(1, 6)
SEASONS = 50
SNAPS = [15, 30, 50]
OPEN = ["conifer", "birch", "tropical", "skyTree"]
STANDS = ["coniferStand", "birchStand", "skyStand"]

runs = [Run(f"{EXPERIMENT}/{p}_s{seed}", p, seed, SEASONS, {}, SNAPS) for p in OPEN + STANDS for seed in SEEDS]
runs += [Run(f"{EXPERIMENT}/birchNoDecline_s{seed}", "birch", seed, SEASONS, {"r2": {"dLambda": 0}}, SNAPS) for seed in SEEDS]
OPEN.append("birchNoDecline")
run_many(runs)

metrics = load_runs(REPO / EXPERIMENT).with_columns(pl.col("run").str.extract(r"^(\w+)_s\d+$").alias("preset"))
geo = load_runs(REPO / EXPERIMENT, "metamers").with_columns(pl.col("run").str.extract(r"^(\w+)_s\d+$").alias("preset"))

# Angle from vertical in degrees: 0 up, 90 horizontal, 180 down.
geo = geo.with_columns(
    (pl.arctan2(pl.col("angle").cos().abs(), pl.col("angle").sin()) * 180 / math.pi).alias("fromVertical")
)
final = geo.filter(pl.col("season") == SEASONS)
interior = pl.col("preset").is_in(OPEN) | ~pl.col("tree").is_in([0, 9])

angles = (
    final.filter(pl.col("order") == 1, interior)
    .group_by("preset")
    .agg(pl.col("fromVertical").median().round(0).alias("branch angle°"))
)
# Crown shape: half-width of the lower and upper thirds of the crown (open-grown trees).
shape = (
    final.filter(pl.col("preset").is_in(OPEN))
    .with_columns(
        (pl.col("y1") / pl.col("y1").max().over("run")).alias("h"),
        (pl.col("x1") - pl.col("x1").filter(pl.col("order") == 0).mean().over("run")).abs().alias("dx"),
    )
    .group_by("preset", "run")
    .agg(
        pl.col("dx").filter(pl.col("h") < 1 / 3).max().alias("lower"),
        pl.col("dx").filter(pl.col("h") > 2 / 3).max().alias("upper"),
    )
    .group_by("preset")
    .agg((pl.col("lower") / pl.col("upper")).median().round(2).alias("lower/upper width"))
)
last = metrics.filter(pl.col("season") == SEASONS, interior)
summary = (
    last.group_by("preset")
    .agg(
        pl.col("height").median().round(0).alias("height"),
        (pl.col("crownWidth") / pl.col("height")).median().round(2).alias("width/height"),
        (pl.col("boleHeight") / pl.col("height")).median().round(2).alias("bole/height"),
        pl.col("slenderness").median().round(0).alias("H/D"),
        pl.col("metamers").median().alias("metamers"),
        (pl.col("metamers") <= 10).sum().alias("stalled"),
    )
    .join(angles, on="preset")
    .join(shape, on="preset", how="left")
    .sort("preset")
)
with pl.Config(tbl_cols=20, tbl_width_chars=200):
    print(summary)

# Figure: seed 1 of each open-grown species and stand at season 50.
show = final.filter(pl.col("seed") == 1, ~pl.col("preset").is_in(["skyTree", "birchNoDecline"])).with_columns(
    pl.when(pl.col("order") == 0).then(pl.lit("trunk")).when(pl.col("order") == 1).then(pl.lit("branch")).otherwise(pl.lit("twig")).alias("part")
)
fig = (
    ggplot(show)
    + geom_segment(aes("x0", "y0", xend="x1", yend="y1", colour="part"), size=0.4)
    + facet_wrap("preset", ncol=3, scales="free_x")
    + scale_colour_manual(values={"trunk": "#3b2a1a", "branch": "#6b4a2a", "twig": "#5f8f3a"})
    + labs(colour="")
    + theme_void()
    + theme(figure_size=(10, 7))
)
fig.save(FIGURE, dpi=90, verbose=False)
print("figure written")
