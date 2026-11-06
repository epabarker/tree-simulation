"""M26: the §10 validation targets never measured, and the crown form of the ten species.

Settings follow M25's (m25_species.py): the `oakOpen` woodland principles, a lone open-grown tree on
160 × 160 and a stand of ten (interior trees 2–7), 60 seasons, 5 seeds, all ten species. Then:

- allometry at season 60: median junction exponent Δ (§10: 1.8–2.3), the length–diameter slope of
  limbs (l ∝ d^(2/3) under elastic similarity) and the leaf–section slope (≈ 1, Shinozaki et al.);
- crown form (src/core/form.ts): the width profile open-grown against stand-grown, apical control,
  branch angles by order;
- neighbour response (Purves et al. 2007): two trees at 8–48 cells, each crown's displacement away
  from its neighbour at season 40;
- crown shyness (van der Zee et al. 2021): the gap between adjacent crowns in the stands against
  the pair's slenderness;
- gravitropic recovery (Bastien et al. 2013): a seedling planted at 40° (`trees[].lean`), the trunk's
  chord and mid-stem tilt each season, with and without R3 posture control.

    uv run --project analysis python analysis/experiments/m26_validation.py   # 230 runs, ≈ 2 min on 4 cores
"""

import polars as pl
from plotnine import (
    aes,
    facet_wrap,
    geom_hline,
    geom_line,
    geom_path,
    geom_point,
    ggplot,
    labs,
    scale_colour_manual,
    scale_linetype_manual,
    theme,
    theme_minimal,
)
from treesim import REPO, Run, load_runs, run_many

EXPERIMENT = "runs/m26-validation"
FIGURES = REPO / "docs" / "experiments" / "figures"
NOTE = "2026-10-28-m26"
SEEDS = range(1, 6)
SPECIES = ["birch", "oak", "beech", "fir", "hornbeam", "maple", "holly", "rowan", "willow", "pine"]
COLOURS = {
    "birch": "#2a78d6",
    "oak": "#eb6834",
    "beech": "#1baf7a",
    "fir": "#7a7a7a",
    "hornbeam": "#0f6b4f",
    "maple": "#e2b100",
    "holly": "#4b2a6b",
    "rowan": "#c0262d",
    "willow": "#8fb3e6",
    "pine": "#3b3b3b",
}
STAND = [20, 41, 62, 83, 104, 125, 146, 167, 188, 209]
PAIR_SPECIES = ["birch", "oak", "beech"]
SPACINGS = [8, 12, 16, 24, 32, 48]
LEAN_SPECIES = ["oak", "beech", "birch", "pine"]
LEAN_SEASONS = 30

runs = []
for sp in SPECIES:
    for seed in SEEDS:
        runs.append(Run(f"{EXPERIMENT}/lone/{sp}_s{seed}", "oakOpen", seed, 60,
                        {"world": {"width": 160, "height": 160, "walls": []}, "trees": [{"x": 80, "species": sp}]},
                        snapshots=[30]))
        runs.append(Run(f"{EXPERIMENT}/stand/{sp}_s{seed}", "oakOpen", seed, 60,
                        {"world": {"width": 230, "height": 160, "walls": []},
                         "trees": [{"x": x, "species": sp} for x in STAND]}))
for sp in PAIR_SPECIES:
    for d in SPACINGS:
        for seed in SEEDS:
            runs.append(Run(f"{EXPERIMENT}/pair/{sp}_d{d}_s{seed}", "oakOpen", seed, 40,
                            {"world": {"width": 200, "height": 160, "walls": []},
                             "trees": [{"x": 100 - d / 2, "species": sp}, {"x": 100 + d / 2, "species": sp}]}))
for sp in LEAN_SPECIES:
    for posture in [True, False]:
        for seed in SEEDS:
            runs.append(Run(f"{EXPERIMENT}/lean/{sp}_{'post' if posture else 'nopost'}_s{seed}", "oakOpen", seed,
                            LEAN_SEASONS,
                            {"world": {"width": 160, "height": 160, "walls": []},
                             "trees": [{"x": 80, "species": sp, "lean": 40}]},
                            snapshots=list(range(1, LEAN_SEASONS + 1)),
                            species_patch={sp: {"r3": {"posture": posture}}}))
run_many(runs)


def species_of(df: pl.DataFrame) -> pl.DataFrame:
    return df.with_columns(pl.col("run").str.extract(r"^(\w+?)_").alias("sp"))


def finite(col: str) -> pl.Expr:
    return pl.col(col).filter(pl.col(col).is_finite())


# --- Allometry and form at season 60 ---------------------------------------------------------
lone = species_of(load_runs(REPO / EXPERIMENT / "lone", "form")).with_columns(pl.lit("open").alias("grown"))
stand = species_of(load_runs(REPO / EXPERIMENT / "stand", "form")).filter(pl.col("tree").is_between(2, 7))
stand = stand.with_columns(pl.lit("stand").alias("grown"))
form = pl.concat([lone, stand], how="diagonal_relaxed").filter(pl.col("season") == 60)

allometry = (
    form.group_by("sp")
    .agg(
        finite("junctionDelta").median().round(2).alias("Δ"),
        finite("ldSlope").mean().round(2).alias("l–d slope"),
        finite("ldSlope").std().round(2).alias("sd"),
        finite("leafStemSlope").mean().round(2).alias("leaf–section slope"),
        finite("leafStemSlope").std().round(2).alias("sd "),
    )
    .sort("sp")
)
shape = (
    form.group_by("sp", "grown")
    .agg(
        finite("widestAt").mean().round(2).alias("widest at"),
        finite("profileCentre").mean().round(2).alias("centre"),
        finite("crownFullness").mean().round(2).alias("fullness"),
        finite("forkHeight").mean().round(2).alias("fork height"),
        finite("leaderDominance").median().round(2).alias("leader dominance"),
        finite("branchAngle2").mean().round(0).alias("angle 2°"),
        finite("limbDroop").median().round(0).alias("droop°"),
    )
    .sort("sp", "grown")
)

# Mean profile per species and condition, drawn as a mirrored silhouette.
bands = [f"p{k}" for k in range(10)]
profile = (
    form.group_by("sp", "grown")
    .agg([pl.col(b).mean() for b in bands])
    .unpivot(index=["sp", "grown"], on=bands, variable_name="band", value_name="w")
    .with_columns(((pl.col("band").str.slice(1).cast(pl.Int32) + 0.5) / 10).alias("h"))
)
silhouette = pl.concat([
    profile.with_columns((pl.col("w") / 2).alias("x"), pl.col("h").alias("order")),
    profile.with_columns((-pl.col("w") / 2).alias("x"), (2 - pl.col("h")).alias("order")),
]).sort("sp", "grown", "order")
fig = (
    ggplot(silhouette, aes("x", "h", linetype="grown", group="grown"))
    + geom_path(size=0.8)
    + facet_wrap("sp", ncol=5)
    + scale_linetype_manual(values={"open": "solid", "stand": "dashed"})
    + labs(x="crown width over the widest band", y="height in the crown (base 0, top 1)", linetype="")
    + theme_minimal()
    + theme(figure_size=(9, 4.2))
)
fig.save(FIGURES / f"{NOTE}-profiles.png", dpi=100, verbose=False)

# --- Neighbour response ------------------------------------------------------------------------
pair = load_runs(REPO / EXPERIMENT / "pair").filter(pl.col("season") == 40, pl.col("alive"))
pair = pair.with_columns(
    pl.col("run").str.extract(r"^(\w+?)_").alias("sp"),
    pl.col("run").str.extract(r"_d(\d+)_").cast(pl.Int32).alias("spacing"),
    # Tree 0 stands on the left: away from its neighbour is a negative offset.
    pl.when(pl.col("tree") == 0).then(-pl.col("centroidOffset")).otherwise(pl.col("centroidOffset")).alias("away"),
)
neighbour = pair.group_by("sp", "spacing").agg(pl.col("away").mean().round(2), pl.col("crownWidth").mean().round(0)).sort("sp", "spacing")
fig = (
    ggplot(neighbour, aes("spacing", "away", colour="sp"))
    + geom_hline(yintercept=0, colour="#999999")
    + geom_line(size=1)
    + geom_point(size=2)
    + scale_colour_manual(values=COLOURS)
    + labs(x="distance between the two trees (cells)", y="crown centroid away from the neighbour (cells)", colour="species")
    + theme_minimal()
    + theme(figure_size=(7, 3.5))
)
fig.save(FIGURES / f"{NOTE}-neighbour.png", dpi=100, verbose=False)

# --- Crown shyness: gaps between adjacent crowns in the stands ---------------------------------
mets = species_of(load_runs(REPO / EXPERIMENT / "stand", "metamers")).filter(pl.col("season") == 60)
extent = mets.group_by("run", "sp", "tree").agg(
    pl.min_horizontal(pl.col("x0").min(), pl.col("x1").min()).alias("lo"),
    pl.max_horizontal(pl.col("x0").max(), pl.col("x1").max()).alias("hi"),
)
slender = species_of(load_runs(REPO / EXPERIMENT / "stand")).filter(pl.col("season") == 60, pl.col("alive"))
slender = slender.select("run", "tree", "slenderness", "height")
crowns = extent.join(slender, on=["run", "tree"]).sort("run", "tree")
gaps = (
    crowns.with_columns(
        pl.col("lo").shift(-1).over("run").alias("next_lo"),
        pl.col("tree").shift(-1).over("run").alias("next_tree"),
        pl.col("slenderness").shift(-1).over("run").alias("next_slender"),
    )
    .filter(pl.col("next_tree") == pl.col("tree") + 1, pl.col("tree").is_between(1, 7))
    .with_columns(
        (pl.col("next_lo") - pl.col("hi")).alias("gap"),
        ((pl.col("slenderness") + pl.col("next_slender")) / 2).alias("pair H/D"),
    )
)
shyness = gaps.group_by("sp").agg(
    pl.col("gap").mean().round(1).alias("mean gap"),
    (pl.col("gap") > 0).mean().round(2).alias("share apart"),
    pl.col("pair H/D").mean().round(0).alias("pair H/D"),
    pl.corr("gap", "pair H/D", method="spearman").round(2).alias("ρ within"),
).sort("sp")
rho_all = gaps.select(pl.corr("gap", "pair H/D", method="spearman")).item()
fig = (
    ggplot(gaps, aes("pair H/D", "gap", colour="sp"))
    + geom_hline(yintercept=0, colour="#999999")
    + geom_point(size=1.5, alpha=0.7)
    + scale_colour_manual(values=COLOURS)
    + labs(x="mean slenderness of the pair (H/D)", y="gap between the crowns (cells; < 0 overlap)", colour="species")
    + theme_minimal()
    + theme(figure_size=(7, 3.5))
)
fig.save(FIGURES / f"{NOTE}-shyness.png", dpi=100, verbose=False)

# --- Gravitropic recovery ----------------------------------------------------------------------
lean_m = load_runs(REPO / EXPERIMENT / "lean", "metamers").filter(pl.col("tree") == 0, pl.col("axis") == 0)
lean_m = lean_m.with_columns(
    pl.col("run").str.extract(r"^(\w+?)_").alias("sp"),
    pl.col("run").str.extract(r"_(post|nopost)_").alias("posture"),
)
root_x = load_runs(REPO / EXPERIMENT / "lean").filter(pl.col("tree") == 0).select("run", "season", "rootX")
trunk = (
    lean_m.sort("birthId")
    .group_by("run", "sp", "posture", "season")
    .agg(
        pl.col("x1").last().alias("top_x"),
        pl.col("y1").last().alias("top_y"),
        # Tilt from vertical, degrees, positive to the right: atan2(cos a, sin a).
        pl.col("angle").get(pl.len() // 2).alias("mid_angle"),
    )
    .join(root_x, on=["run", "season"])
    .with_columns(
        (pl.arctan2(pl.col("top_x") - pl.col("rootX"), pl.col("top_y")).degrees()).alias("chord tilt"),
        pl.arctan2(pl.col("mid_angle").cos(), pl.col("mid_angle").sin()).degrees().alias("mid tilt"),
    )
)
recovery = trunk.group_by("sp", "posture", "season").agg(
    pl.col("chord tilt").mean(), pl.col("mid tilt").mean(), pl.col("mid tilt").min().alias("mid min")
).sort("sp", "posture", "season")
fig = (
    ggplot(recovery, aes("season", "chord tilt", colour="sp", linetype="posture"))
    + geom_hline(yintercept=0, colour="#999999")
    + geom_line(size=1)
    + scale_colour_manual(values=COLOURS)
    + scale_linetype_manual(values={"post": "solid", "nopost": "dashed"})
    + labs(x="season", y="trunk chord from vertical (°)", colour="species", linetype="R3 posture")
    + theme_minimal()
    + theme(figure_size=(7, 3.5))
)
fig.save(FIGURES / f"{NOTE}-lean.png", dpi=100, verbose=False)
recovery_summary = trunk.group_by("sp", "posture").agg(
    pl.col("chord tilt").filter(pl.col("season") == 5).mean().round(0).alias("chord @5"),
    pl.col("chord tilt").filter(pl.col("season") == 15).mean().round(0).alias("chord @15"),
    pl.col("chord tilt").filter(pl.col("season") == LEAN_SEASONS).mean().round(0).alias(f"chord @{LEAN_SEASONS}"),
    pl.col("mid tilt").min().round(0).alias("mid-stem min (overshoot < 0)"),
).sort("sp", "posture")

with pl.Config(tbl_cols=20, tbl_width_chars=220, tbl_rows=60):
    print("allometry (season 60, open and stand pooled)")
    print(allometry)
    print("crown form")
    print(shape)
    print("neighbour response (season 40)")
    print(neighbour.pivot("sp", index="spacing", values="away"))
    print("crown shyness (stands, season 60); ρ over all pairs:", round(rho_all, 2))
    print(shyness)
    print("gravitropic recovery (planted at 40°)")
    print(recovery_summary)
print("figures written")
