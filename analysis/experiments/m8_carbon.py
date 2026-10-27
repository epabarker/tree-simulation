"""M8: R1 carbon balance (ADR 0010). Which settings give the §7 M8 visible test (a height plateau,
a suppressed tree that dies, a crown base that rises) without breaking the M6 patterns?

Conditions: no R1 (baseline); the recommended settings now in the sky presets (live-sapwood and
foliage costs, the path-length plateau cause, carbon-or-relative branch shedding, α = 3); and
one-change variants: C5's light rule, the reproductive cause instead of L_h, no plateau cause,
L_h = 80, no sapwood cost, a higher compensation point, α left at 2. Each on an open tree, a ten-tree stand, the late tree, and
a seedling planted at season 20 under the closed stand.

    uv run --project analysis python analysis/experiments/m8_carbon.py
"""

import polars as pl
from plotnine import (
    aes,
    facet_wrap,
    geom_line,
    ggplot,
    labs,
    stat_summary,
    theme_minimal,
)
from treesim import REPO, Run, load_runs, run_many

EXPERIMENT = "runs/m8-carbon"
FIGURE = REPO / "docs" / "experiments" / "figures" / "2026-10-27-m8-height.png"
SEEDS = range(1, 6)
SEASONS = 100
# The sky presets carry the recommended R1 settings (presets.ts SKY, params.ts r1): live-sapwood
# and foliage costs, L_h = 60, carbon-or-relative shedding, α = 3. "off" is the pre-R1 stand.
OFF = {"c3": {"alpha": 2}, "r1": {"enabled": False}}


def rec(**r1) -> dict:
    """The recommended settings with some R1 params changed."""
    return {"r1": r1}


CONDITIONS = {
    "off": OFF,
    "rec": {},
    "recC5": rec(shed="c5"),  # C5's light rule instead of the carbon test
    "recRep": rec(Lh=0, fRep=0.6, maturity=70),  # the reproductive plateau cause instead of L_h
    "recNoLh": rec(Lh=0),  # no plateau cause: maintenance alone
    "recLh80": rec(Lh=80),  # a longer path-length scale
    "recNoWood": rec(mw=0),  # ablation: no sapwood cost
    "recMf12": rec(mf=0.12),  # a light-demanding compensation point (Q_c = 4%)
    "recA2": {"c3": {"alpha": 2}},  # α left at its pre-R1 value 2
}
PRESETS = ["skyTree", "skyStand", "skyLate"]
# A seedling planted at season 20 under the closed stand, between trees 3 and 4.
UNDER = {"trees": [{"x": x} for x in [20, 41, 62, 83, 104, 125, 146, 167, 188, 209]] + [{"x": 93.5, "plantSeason": 20}]}

runs = [
    Run(f"{EXPERIMENT}/{preset}_{cond}_s{seed}", preset, seed, SEASONS, patch)
    for cond, patch in CONDITIONS.items()
    for preset in PRESETS
    for seed in SEEDS
]
runs += [
    Run(f"{EXPERIMENT}/under_{cond}_s{seed}", "skyStand", seed, SEASONS, {**patch, **UNDER})
    for cond, patch in CONDITIONS.items()
    for seed in SEEDS
]
run_many(runs)

df = load_runs(REPO / EXPERIMENT).with_columns(
    pl.col("run").str.extract(r"^([A-Za-z]+)_").alias("preset"),
    pl.col("run").str.extract(r"^[A-Za-z]+_(\w+)_s\d+$").alias("condition"),
)
at = lambda s: pl.col("season") == s

stand = df.filter(pl.col("preset") == "skyStand", ~pl.col("tree").is_in([0, 9]))
summary = (
    stand.group_by("condition")
    .agg(
        pl.col("height").filter(at(50)).median().round(0).alias("h50"),
        pl.col("height").filter(at(100)).median().round(0).alias("h100"),
        (pl.col("height").filter(at(100)).median() - pl.col("height").filter(at(70)).median()).round(1).alias("Δh 70→100"),
        pl.col("boleHeight").filter(at(50)).median().round(0).alias("bole50"),
        pl.col("boleHeight").filter(at(100)).median().round(0).alias("bole100"),
        pl.col("slenderness").filter(at(50)).median().round(0).alias("H/D 50"),
        (pl.col("alive").filter(at(100)) == 0).sum().alias("dead (of 40)"),
        (100 * pl.col("groundLight").filter(pl.col("season") > 40, pl.col("season") <= 50).mean()).round(1).alias("floor % 41–50"),
    )
    .join(
        df.filter(pl.col("preset") == "skyTree")
        .group_by("condition")
        .agg(
            pl.col("height").filter(at(100)).median().round(0).alias("open h100"),
            (pl.col("height").filter(at(100)).median() - pl.col("height").filter(at(70)).median()).round(1).alias("open Δh 70→100"),
        ),
        on="condition",
    )
    .join(
        df.filter(pl.col("preset") == "skyLate", pl.col("tree") == 1)
        .group_by("condition")
        .agg(
            (pl.col("alive").filter(at(SEASONS)) == 0).sum().alias("late dead (of 5)"),
            pl.col("metamers").filter(at(SEASONS)).median().alias("late size"),
        ),
        on="condition",
    )
    .join(
        df.filter(pl.col("preset") == "under", pl.col("tree") == 10)
        .group_by("condition")
        .agg(
            (pl.col("alive").filter(at(SEASONS)) == 0).sum().alias("under dead (of 5)"),
            (pl.col("season").filter(pl.col("alive") == 0).min() - 20).alias("seasons to die"),
        ),
        on="condition",
    )
    .join(
        df.filter(pl.col("preset") == "skyStand", ~pl.col("tree").is_in([0, 9]), pl.col("season") == 50)
        .group_by("condition")
        .agg((100 * pl.col("maintenance") / pl.col("production")).median().round(0).alias("M/P % s50")),
        on="condition",
        how="left",
    )
    .sort("condition")
)
with pl.Config(tbl_cols=20, tbl_width_chars=220):
    print(summary)

fig = (
    ggplot(
        df.filter(pl.col("preset").is_in(["skyTree", "skyStand"]), pl.col("condition").is_in(["off", "rec", "recRep", "recNoLh"]))
        .filter(~((pl.col("preset") == "skyStand") & pl.col("tree").is_in([0, 9]))),
        aes("season", "height", colour="condition"),
    )
    + stat_summary(geom=geom_line, fun_y=lambda s: s.median())
    + facet_wrap("preset")
    + labs(y="median height (cells)", title="Height under R1 settings (stand: interior trees)")
    + theme_minimal()
)
fig.save(FIGURE, width=8, height=3.5, dpi=110, verbose=False)
print("figure written")
