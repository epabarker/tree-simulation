"""M19: the calibrated species (src/core/flora.ts) against their literature patterns.

Three settings per species, all under the woodland's growth rules without stand dynamics or
storms (the `oakOpen` preset's): a lone open-grown tree, a pure stand of ten, and a seedling in a
shade house (a roof letting through a set share of the sky; Sack 2004). Then the `succession`
preset itself: which species hold the canopy over 400 seasons.

    uv run --project analysis python analysis/experiments/m19_species.py
"""

import math

import polars as pl
from plotnine import (
    aes,
    geom_line,
    geom_point,
    ggplot,
    labs,
    scale_colour_manual,
    scale_x_log10,
    theme,
    theme_minimal,
)
from treesim import REPO, Run, load_runs, run_many

EXPERIMENT = "runs/m19-species"
FIGURE = REPO / "docs" / "experiments" / "figures" / "2026-10-27-m19-species.png"
SEEDS = range(1, 6)
SPECIES = ["birch", "oak", "beech", "fir"]
COLOURS = {"birch": "#2a78d6", "oak": "#eb6834", "beech": "#1baf7a", "fir": "#7a7a7a"}
STAND = [20, 41, 62, 83, 104, 125, 146, 167, 188, 209]
ROOFS = [1, 2, 2.6, 3.3, 4, 4.8, 5.6, 6.5]

runs = []
for sp in SPECIES:
    for seed in SEEDS:
        runs.append(
            Run(f"{EXPERIMENT}/lone/{sp}_s{seed}", "oakOpen", seed, 60,
                {"world": {"width": 160, "height": 160, "walls": []}, "trees": [{"x": 80, "species": sp}]})
        )
        runs.append(
            Run(f"{EXPERIMENT}/stand/{sp}_s{seed}", "oakOpen", seed, 60,
                {"world": {"width": 230, "height": 160, "walls": []},
                 "trees": [{"x": x, "species": sp} for x in STAND]})
        )
        for roof in ROOFS:
            runs.append(
                Run(f"{EXPERIMENT}/shade/{sp}_r{roof}_s{seed}", "oakOpen", seed, 30,
                    {"world": {"width": 40, "height": 60, "sides": "periodic",
                               "walls": [{"x": 0, "y": 40, "width": 40, "height": 1, "shade": roof}]},
                     "trees": [{"x": 20, "species": sp}]})
            )
runs += [Run(f"{EXPERIMENT}/succession/s{seed}", "succession", seed, 400) for seed in SEEDS]
run_many(runs)


def species_of(df: pl.DataFrame) -> pl.DataFrame:
    return df.with_columns(pl.col("run").str.extract(r"^(\w+?)_").alias("sp"))


# Lone and stand: the last season; stands use the interior trees 2–7.
lone = species_of(load_runs(REPO / EXPERIMENT / "lone")).filter(pl.col("season") == 60, pl.col("alive"))
stand = species_of(load_runs(REPO / EXPERIMENT / "stand")).filter(
    pl.col("season") == 60, pl.col("alive"), pl.col("tree").is_between(2, 7)
)
summary = (
    lone.group_by("sp")
    .agg(
        pl.col("height").mean().round(0).alias("open H"),
        (pl.col("crownWidth") / pl.col("height")).mean().round(2).alias("open W/H"),
        pl.col("slenderness").mean().round(0).alias("open H/D"),
        pl.col("branchAngle").mean().round(0).alias("open angle°"),
    )
    .join(
        stand.group_by("sp").agg(
            pl.col("height").mean().round(0).alias("stand H"),
            pl.col("slenderness").mean().round(0).alias("stand H/D"),
            pl.col("crownRatio").mean().round(2).alias("stand crown ratio"),
        ),
        on="sp",
    )
)

# Shade house: light at the seedling in its first season, and survival to season 30.
shade = species_of(load_runs(REPO / EXPERIMENT / "shade")).with_columns(
    pl.col("run").str.extract(r"_r([\d.]+)_").cast(pl.Float64).alias("roof")
)
# The light under a uniform roof one cell thick, exactly as the sky sweep sees it: each of the K = 7
# sky directions (15°–165°, weights ∝ sin θ) crosses the roof over a path 1/sin θ (the seedling's
# own crown would shade the ground under it, so its groundLight is not the light it lives in).
THETAS = [math.radians(15 + 150 * k / 6) for k in range(7)]
def roof_light(roof: float, k_ext: float = 0.5) -> float:
    w = [math.sin(t) for t in THETAS]
    return sum(wk * math.exp(-k_ext * roof / math.sin(t)) for wk, t in zip(w, THETAS)) / sum(w)
light = pl.DataFrame({"roof": [float(r) for r in ROOFS], "light": [roof_light(r) for r in ROOFS]})
survival = (
    shade.filter(pl.col("season") == 30)
    .group_by("sp", "roof")
    .agg(pl.col("alive").mean().alias("survival"))
    .join(light, on="roof")
    .sort("sp", "roof")
)
lowest = (
    survival.filter(pl.col("survival") == 1)
    .group_by("sp")
    .agg((pl.col("light").min() * 100).round(0).alias("lowest light all survive %"))
)

# Succession: canopy trees (height ≥ 30) of each species, every 25 seasons, summed over seeds.
succ = load_runs(REPO / EXPERIMENT / "succession")
canopy = (
    succ.filter(pl.col("alive"), pl.col("height") >= 30, pl.col("season") % 25 == 0)
    .group_by("season", "species")
    .agg(pl.len().alias("trees"))
    .with_columns((pl.col("trees") / len(SEEDS)).alias("trees per run"))
    .rename({"species": "sp"})
    .sort("season", "sp")
)

with pl.Config(tbl_cols=20, tbl_width_chars=200, tbl_rows=40):
    print(summary.join(lowest, on="sp").sort("sp"))
    print(canopy.filter(pl.col("season").is_in([50, 100, 200, 300, 400])).pivot("sp", index="season", values="trees per run"))

fig = (
    ggplot(canopy, aes("season", "trees per run", colour="sp"))
    + geom_line(size=1)
    + geom_point(size=2)
    + scale_colour_manual(values=COLOURS)
    + labs(x="season", y="canopy trees per run (height ≥ 30)", colour="species")
    + theme_minimal()
    + theme(figure_size=(7, 3.5))
)
fig.save(FIGURE, dpi=100, verbose=False)
fig2 = (
    ggplot(survival.filter(pl.col("light") > 0), aes("light", "survival", colour="sp"))
    + geom_line(size=1)
    + geom_point(size=2)
    + scale_x_log10()
    + scale_colour_manual(values=COLOURS)
    + labs(x="light at the seedling (share of open sky, log)", y="share alive at season 30", colour="species")
    + theme_minimal()
    + theme(figure_size=(7, 3.5))
)
fig2.save(FIGURE.with_name("2026-10-27-m19-shade-house.png"), dpi=100, verbose=False)
print("figures written")
