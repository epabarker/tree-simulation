"""M6d: relative shedding (C5 T_rel, ADR 0007) and short shoots (R6, ADR 0006). Calibrate T_rel,
Q_ss and a_ss against several patterns at once (pattern-oriented calibration, ROADMAP):

- short-shoot leaf share > 50% (Millan et al. 2022);
- fewer one-season crown losses in stands (the M6 known issue);
- no stalled seedlings;
- interior crown base still lifted and H/D still 50-90;
- suppressed trees keep deeper crowns than dominant ones at T_rel > 0 (Sprugel 2002).

    uv run --project analysis python analysis/experiments/m6d_shedding_short_shoots.py
"""

import itertools

import polars as pl
from plotnine import aes, facet_grid, geom_line, geom_point, ggplot, labs, stat_summary, theme_minimal

from treesim import REPO, Run, load_runs, run_many

EXPERIMENT = "runs/m6d"
FIGURE = REPO / "docs" / "experiments" / "figures" / "2026-10-27-m6d-shedding-short-shoots.png"
SEEDS = range(1, 6)
SEASONS = 50
TREL = [0.0, 0.2, 0.4, 0.6]
# (Q_ss, a_ss); None = R6 off.
R6 = [None, *itertools.product([0.1, 0.2, 0.4], [0.5, 1.0, 2.0])]


def label(trel, r6):
    return f"t{trel}-" + ("off" if r6 is None else f"q{r6[0]}-a{r6[1]}")


runs = []
for trel, r6, seed in itertools.product(TREL, R6, SEEDS):
    patch = {"c5": {"Trel": trel}, "r6": {"enabled": False} if r6 is None else {"enabled": True, "qMin": r6[0], "leafArea": r6[1]}}
    for preset, short in (("skyStand", "stand"), ("skyTree", "tree")):
        runs.append(Run(f"{EXPERIMENT}/{short}-{label(trel, r6)}-s{seed}", preset, seed, SEASONS, patch))
run_many(runs)

df = load_runs(REPO / EXPERIMENT).with_columns(
    pl.col("run").str.extract(r"^(stand|tree)").alias("setting"),
    pl.col("run").str.extract(r"-t([0-9.]+)-").cast(pl.Float64).alias("Trel"),
    pl.col("run").str.extract(r"-(off|q[0-9.]+-a[0-9.]+)-s").alias("r6"),
    pl.col("run").str.extract(r"-q([0-9.]+)-").cast(pl.Float64).alias("qMin"),
    pl.col("run").str.extract(r"-a([0-9.]+)-s").cast(pl.Float64).alias("leafArea"),
)
df = df.with_columns(
    active=pl.col("buds") - pl.col("dormantBuds") - pl.col("shortShoots"),
    crownDepth=pl.col("height") - pl.col("boleHeight"),
)
df = df.with_columns(
    ssShare=pl.when(pl.col("shortShoots") > 0)
    .then(pl.col("leafArea") * pl.col("shortShoots") / (pl.col("leafArea") * pl.col("shortShoots") + pl.col("active")))
    .otherwise(0.0)
)

# One-season crown loss: a living stand tree loses more than half its metamers in one season.
losses = (
    df.filter(pl.col("setting") == "stand")
    .sort("run", "tree", "season")
    .with_columns(prev=pl.col("metamers").shift(1).over("run", "tree"))
    .filter((pl.col("prev") > 20) & (pl.col("metamers") < 0.5 * pl.col("prev")))
    .group_by("Trel", "r6")
    .agg(pl.len().alias("crown losses"))
)

final = df.filter(pl.col("season") == SEASONS)
stand = final.filter(pl.col("setting") == "stand")
interior = stand.filter(~pl.col("tree").is_in([0, 9]))
# Suppressed vs dominant: within each stand, the shortest and tallest interior trees.
ranked = interior.with_columns(rank=pl.col("height").rank("ordinal").over("run"))
depth = (
    ranked.filter(pl.col("rank").is_in([1, 8]))
    .with_columns(pl.when(pl.col("rank") == 1).then(pl.lit("suppressed")).otherwise(pl.lit("dominant")).alias("status"))
    .group_by("Trel", "r6", "status")
    .agg(pl.col("crownDepth").median())
    .pivot(on="status", index=["Trel", "r6"], values="crownDepth")
    .with_columns((pl.col("suppressed") / pl.col("dominant")).round(2).alias("depth ratio s/d"))
)
summary = (
    interior.group_by("Trel", "r6")
    .agg(
        pl.col("ssShare").median().round(2).alias("stand ss share"),
        pl.col("boleHeight").median().alias("interior bole"),
        pl.col("slenderness").median().round(0).alias("H/D"),
        (pl.col("metamers") <= 10).sum().alias("stalled"),
        pl.col("metamers").median().alias("metamers"),
    )
    .join(
        final.filter(pl.col("setting") == "tree")
        .group_by("Trel", "r6")
        .agg(pl.col("ssShare").median().round(2).alias("open ss share"), pl.col("boleHeight").median().alias("open bole")),
        on=["Trel", "r6"],
    )
    .join(losses, on=["Trel", "r6"], how="left")
    .join(depth.select("Trel", "r6", "depth ratio s/d"), on=["Trel", "r6"])
    .with_columns(pl.col("crown losses").fill_null(0))
    .sort("Trel", "r6")
)
with pl.Config(tbl_rows=60, tbl_cols=20, tbl_width_chars=200):
    print(summary)

plot_df = summary.filter(pl.col("r6") != "off").with_columns(
    pl.col("r6").str.extract(r"q([0-9.]+)").alias("Q_ss"), pl.col("r6").str.extract(r"a([0-9.]+)").cast(pl.Float64).alias("a_ss")
)
long = plot_df.unpivot(index=["Trel", "Q_ss", "a_ss"], on=["stand ss share", "crown losses", "interior bole"], variable_name="measure")
plot = (
    ggplot(long.to_pandas(), aes("a_ss", "value", color="Q_ss"))
    + geom_point()
    + stat_summary(geom=geom_line, fun_y=lambda x: x.median())
    + facet_grid("measure ~ Trel", scales="free_y", labeller="label_both")
    + labs(title=f"Relative shedding × short shoots, skyStand interior, season {SEASONS}, 5 seeds", x="a_ss", y="")
    + theme_minimal()
)
FIGURE.parent.mkdir(parents=True, exist_ok=True)
plot.save(FIGURE, width=10, height=6, dpi=90, verbose=False)
print(f"wrote {FIGURE.relative_to(REPO)}")
