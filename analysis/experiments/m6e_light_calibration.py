"""M6e: light calibration of the sky sweep (§C2.4, §10).

1. k_ext scan: which extinction coefficient gives 2–10% of open-sky light on the floor of a closed
   stand, without stalling seedlings, starving the overtopped late tree or changing H/D?
2. K convergence: do the tree patterns at K = 7 match K = 31, and does c2.rotate (a golden-ratio
   step of the directions each season) close any gap at the cost of K = 7?
3. Overcast sky (p = 1.5) against the uniform sky (p = 1).
4. Where the floor light comes from: ground light by tree position, and with the world's sides
   closed by opaque walls (no light from beyond the sides).

    uv run --project analysis python analysis/experiments/m6e_light_calibration.py
"""

import json

import polars as pl
from plotnine import (
    aes,
    coord_equal,
    facet_wrap,
    geom_line,
    geom_tile,
    ggplot,
    labs,
    scale_fill_gradient,
    stat_summary,
    theme,
    theme_minimal,
)

from treesim import REPO, Run, load_runs, run_many

EXPERIMENT = "runs/m6e-light"
FIGURES = REPO / "docs" / "experiments" / "figures"
SEEDS = range(1, 6)
SEASONS = 50
KEXT = [0.25, 0.35, 0.5, 0.75, 1.0]
KS = [7, 11, 15, 31]
PRESETS = ["skyStand", "skyTree", "skyLate"]


def tag(df: pl.DataFrame) -> pl.DataFrame:
    """Splits run names "<preset>_<condition>_s<seed>" into columns."""
    return df.with_columns(
        pl.col("run").str.extract(r"^([A-Za-z]+)_").alias("preset"),
        pl.col("run").str.extract(r"^[A-Za-z]+_(.+)_s\d+$").alias("condition"),
    )


def patterns(df: pl.DataFrame) -> pl.DataFrame:
    """One row per condition: the calibration patterns of the ROADMAP table."""
    final = df.filter(pl.col("season") == SEASONS)
    stand = final.filter(pl.col("preset").is_in(["skyStand", "overcast"]))
    interior = stand.filter(~pl.col("tree").is_in([0, 9]))
    edge = stand.filter(pl.col("tree").is_in([0, 9])).with_columns(
        pl.when(pl.col("tree") == 0).then(-pl.col("centroidOffset")).otherwise(pl.col("centroidOffset")).alias("out")
    )
    # Ground light averaged over the last ten seasons, when the canopy has closed.
    floor = (
        df.filter(pl.col("preset").is_in(["skyStand", "overcast"]), ~pl.col("tree").is_in([0, 9]))
        .filter(pl.col("season") > SEASONS - 10)
        .group_by("condition")
        .agg(
            (100 * pl.col("groundLight").mean()).round(1).alias("floor %"),
            (100 * pl.col("groundLight").quantile(0.1)).round(1).alias("floor p10 %"),
            (100 * pl.col("groundLight").quantile(0.9)).round(1).alias("floor p90 %"),
        )
    )
    out = (
        interior.group_by("condition")
        .agg(
            pl.col("boleHeight").median().round(1).alias("bole"),
            pl.col("crownWidth").median().round(1).alias("width"),
            pl.col("height").median().round(1).alias("height"),
            pl.col("slenderness").median().round(0).alias("H/D"),
            (pl.col("metamers") <= 10).sum().alias("stalled"),
            (pl.col("shortShoots") / pl.col("buds")).median().round(2).alias("ss share"),
        )
        .join(floor, on="condition")
        .join(edge.group_by("condition").agg(pl.col("out").median().round(1).alias("edge out")), on="condition")
    )
    tree = final.filter(pl.col("preset") == "skyTree")
    if tree.height:
        out = out.join(
            tree.group_by("condition").agg(
                pl.col("boleHeight").median().alias("open bole"),
                pl.col("metamers").median().alias("open size"),
            ),
            on="condition",
            how="left",
        )
    late = final.filter(pl.col("preset") == "skyLate", pl.col("tree") == 1)
    if late.height:
        out = out.join(
            late.group_by("condition").agg(
                pl.col("metamers").median().alias("late size"),
                pl.col("alive").sum().alias("late alive"),
            ),
            on="condition",
            how="left",
        )
    return out


def show(title: str, table: pl.DataFrame) -> None:
    print(f"\n{title}")
    with pl.Config(tbl_cols=30, tbl_width_chars=220, tbl_rows=40):
        print(table)


# 1. k_ext scan.
runs = [
    Run(f"{EXPERIMENT}/kext/{preset}_k{k}_s{seed}", preset, seed, SEASONS, {"c2": {"kExt": k}})
    for k in KEXT
    for preset in PRESETS
    for seed in SEEDS
]
# 2. K convergence, with and without rotation.
for K in KS:
    for rotate in (False, True):
        cond = f"K{K}{'r' if rotate else ''}"
        patch = {"c2": {"K": K, "rotate": rotate}}
        for preset in ("skyStand", "skyTree"):
            for seed in SEEDS:
                runs.append(
                    Run(f"{EXPERIMENT}/K/{preset}_{cond}_s{seed}", preset, seed, SEASONS, patch, [SEASONS], light=seed == 1)
                )
# 2b. Ten more seeds for K = 7, K = 7 rotated and K = 31 (the crown base is noisy).
for cond, c2 in {"K7": {"K": 7}, "K7r": {"K": 7, "rotate": True}, "K31": {"K": 31}}.items():
    runs += [Run(f"{EXPERIMENT}/K15/skyStand_{cond}_s{seed}", "skyStand", seed, SEASONS, {"c2": c2}) for seed in range(1, 16)]
# 3. Overcast against uniform sky (the uniform condition is K7 in part 2).
runs += [Run(f"{EXPERIMENT}/sky/overcast_p1.5_s{seed}", "overcast", seed, SEASONS) for seed in SEEDS]
# 4. Closed sides: opaque walls two cells wide at both edges, full height.
WALLS = [{"x": 0, "y": 0, "width": 2, "height": 110, "shade": 50}, {"x": 228, "y": 0, "width": 2, "height": 110, "shade": 50}]
for k in (0.25, 0.5, 1.0):
    patch = {"c2": {"kExt": k}, "world": {"width": 230, "height": 110, "walls": WALLS}}
    runs += [Run(f"{EXPERIMENT}/sides/skyStand_k{k}_s{seed}", "skyStand", seed, SEASONS, patch) for seed in SEEDS]
run_many(runs)

kext = tag(load_runs(REPO / EXPERIMENT / "kext"))
show(
    "1. k_ext scan (interior trees of skyStand at season 50; floor = ground light, seasons 41–50)",
    patterns(kext).with_columns(pl.col("condition").str.slice(1).cast(pl.Float64).alias("kExt")).sort("kExt"),
)
Ks = tag(load_runs(REPO / EXPERIMENT / "K"))
show("2. K convergence (r = rotate)", patterns(Ks).sort("condition"))
ms = (
    pl.DataFrame(
        [
            {"condition": p.parent.name.split("_")[1], "ms": json.loads(p.read_text())["meta"]["ms"]}
            for p in (REPO / EXPERIMENT / "K").glob("skyStand_*/run.json")
        ]
    )
    .group_by("condition")
    .agg(pl.col("ms").median())
    .sort("condition")
)
show("   run time, skyStand 50 seasons (ms)", ms)
sky = tag(load_runs(REPO / EXPERIMENT / "sky"))
uniform = Ks.filter(pl.col("condition") == "K7", pl.col("preset") == "skyStand").with_columns(
    pl.lit("p1").alias("condition")
)
show("3. Overcast (p = 1.5) against uniform (p = 1)", patterns(pl.concat([uniform, sky], how="diagonal_relaxed")))

K15 = tag(load_runs(REPO / EXPERIMENT / "K15")).filter(pl.col("season") == SEASONS, ~pl.col("tree").is_in([0, 9]))
show(
    "2b. 15 seeds: interior bole, width and size (mean and sd over seeds of the per-seed median or sum)",
    K15.group_by("condition", "seed")
    .agg(pl.col("boleHeight").median().alias("bole"), pl.col("crownWidth").median().alias("width"), pl.col("metamers").sum().alias("metamers"))
    .group_by("condition")
    .agg(
        pl.col("bole").mean().round(1),
        pl.col("bole").std().round(1).alias("bole sd"),
        pl.col("width").mean().round(1),
        pl.col("metamers").mean().round(0),
        pl.col("metamers").std().round(0).alias("metamers sd"),
    )
    .sort("condition"),
)


def by_position(df: pl.DataFrame) -> pl.DataFrame:
    """Ground light (% of open sky, seasons 41–50) under each tree of the stand, by k_ext."""
    return (
        df.filter(pl.col("season") > SEASONS - 10)
        .group_by("condition", "tree")
        .agg((100 * pl.col("groundLight").mean()).round(1).alias("floor"))
        .sort("tree")
        .pivot(on="tree", index="condition", values="floor")
        .sort("condition")
    )


show("4. Floor light by tree (0 and 9 at the edges), open sides", by_position(kext.filter(pl.col("preset") == "skyStand")))
sides = tag(load_runs(REPO / EXPERIMENT / "sides"))
show("   closed sides", by_position(sides))
show("   closed sides: interior patterns", patterns(sides).select("condition", "bole", "height", "H/D", "stalled", "floor %"))

# Figure 1: ground light over time against the 2–10% target band.
floor_t = kext.filter(pl.col("preset") == "skyStand", ~pl.col("tree").is_in([0, 9])).with_columns(
    (100 * pl.col("groundLight")).alias("ground"), pl.col("condition").str.slice(1).alias("k_ext")
)
fig = (
    ggplot(floor_t, aes("season", "ground", colour="k_ext"))
    + stat_summary(geom=geom_line, fun_y=lambda s: s.mean())
    + labs(y="floor light (% of open sky)", x="season", colour="k_ext", title="Ground light under interior crowns")
    + theme_minimal()
)
fig.save(FIGURES / "2026-10-27-m6e-ground-light.png", width=6, height=3.5, dpi=110, verbose=False)

# Figure 2: the season-50 shade field of seed 1 for K = 7, K = 7 rotated and K = 31.
fields = []
for cond in ("K7", "K7r", "K31"):
    f = pl.read_csv(REPO / EXPERIMENT / "K" / f"skyStand_{cond}_s1" / "light.csv")
    # √(Q/C) stretches the deep shade, where the streaks are, while open sky stays at 1.
    fields.append(f.with_columns(pl.lit(cond).alias("condition"), (1 - pl.col("shade")).sqrt().alias("light")))
field = pl.concat(fields)
fig = (
    ggplot(field, aes("col", "row", fill="light"))
    + geom_tile()
    + facet_wrap("condition", ncol=1)
    + scale_fill_gradient(low="#16241a", high="#f4f1e6", limits=(0, 1))
    + coord_equal()
    + labs(x="", y="", fill="√(Q/C)", title="Season-50 light field, seed 1")
    + theme_minimal()
    + theme(figure_size=(7, 10))
)
fig.save(FIGURES / "2026-10-27-m6e-fields.png", dpi=90, verbose=False)
print("\nfigures written")
