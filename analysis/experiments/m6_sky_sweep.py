"""M6: the Beer–Lambert sky sweep. Calibrate k_ext and check the §7 M6 visible tests:
edge trees lean outward, crown bases lift in stands, neighbours lean into a gap, and crowns
follow an oblique sun.

    uv run --project analysis python analysis/experiments/m6_sky_sweep.py
"""

import json
import subprocess

import polars as pl
from plotnine import aes, facet_wrap, geom_line, geom_point, ggplot, labs, stat_summary, theme_minimal

from treesim import REPO, Run, load_runs, run_many, run_one

EXPERIMENT = "runs/m6-sky"
FIGURE = REPO / "docs" / "experiments" / "figures" / "2026-10-26-m6-sky-sweep.png"
SEEDS = range(1, 6)
SEASONS = 50
KEXT = [0.25, 0.5, 1.0, 2.0]

# 1. k_ext scan: a ten-tree stand and an open-grown tree.
runs = []
for k in KEXT:
    for seed in SEEDS:
        patch = {"c2": {"kExt": k}}
        runs.append(Run(f"{EXPERIMENT}/scan/stand-k{k}-s{seed}", "skyStand", seed, SEASONS, patch))
        runs.append(Run(f"{EXPERIMENT}/scan/tree-k{k}-s{seed}", "skyTree", seed, SEASONS, patch))
run_many(runs)

final = (
    load_runs(REPO / EXPERIMENT / "scan")
    .filter(pl.col("season") == SEASONS)
    .with_columns(
        pl.col("run").str.extract(r"^(stand|tree)").alias("setting"),
        pl.col("run").str.extract(r"-k([0-9.]+)-").cast(pl.Float64).alias("kExt"),
    )
)
stand = final.filter(pl.col("setting") == "stand")
edge = stand.filter(pl.col("tree").is_in([0, 9])).with_columns(
    # Outward lean: positive when an edge tree's crown leans away from the stand.
    pl.when(pl.col("tree") == 0).then(-pl.col("centroidOffset")).otherwise(pl.col("centroidOffset")).alias("outward")
)
interior = stand.filter(~pl.col("tree").is_in([0, 9]))
summary = (
    interior.group_by("kExt")
    .agg(
        pl.col("boleHeight").median().alias("interior bole"),
        pl.col("crownWidth").median().round(0).alias("interior width"),
        (pl.col("metamers") <= 10).sum().alias("stalled"),
    )
    .join(edge.group_by("kExt").agg(pl.col("outward").median().round(1).alias("edge lean out")), on="kExt")
    .join(
        final.filter(pl.col("setting") == "tree")
        .group_by("kExt")
        .agg(pl.col("boleHeight").median().alias("open-grown bole"), pl.col("metamers").median().alias("open-grown size")),
        on="kExt",
    )
    .sort("kExt")
)
with pl.Config(tbl_cols=20, tbl_width_chars=160):
    print(summary)

# 2. Gap: fell the middle tree (id 5) at season 25 and compare its neighbours with an intact stand.
gap_rows = []
for seed in SEEDS:
    base = run_one(Run(f"{EXPERIMENT}/gap/params-s{seed}", "skyStand", seed, 1))
    params = json.loads((base / "run.json").read_text())["params"]
    replay = base / "felled.json"
    replay.write_text(json.dumps({"params": params, "events": [{"season": 25, "type": "removeTree", "tree": 5}], "seasons": 50}))
    for name, extra in (("felled", ["--replay", str(replay)]), ("kept", ["--preset", "skyStand", "--seed", str(seed), "--seasons", "50"])):
        out = REPO / EXPERIMENT / "gap" / f"{name}-s{seed}"
        subprocess.run(["node", "cli/run.ts", *extra, "--out", str(out), "--quiet"], cwd=REPO, check=True)
        m = pl.read_csv(out / "metrics.csv", infer_schema_length=None).filter(pl.col("season") == 50)
        for tree in (4, 6):
            off = m.filter(pl.col("tree") == tree)["centroidOffset"][0]
            gap_rows.append({"seed": seed, "stand": name, "tree": tree, "offset": off})
gap = pl.DataFrame(gap_rows).pivot(on="stand", index=["seed", "tree"], values="offset").with_columns(
    (pl.col("felled") - pl.col("kept")).round(1).alias("shift toward +x")
)
print(gap.sort("tree", "seed"))

long = edge.select("kExt", "seed", pl.col("outward").alias("value")).with_columns(pl.lit("edge lean outward").alias("measure"))
long = pl.concat(
    [long, interior.select("kExt", "seed", pl.col("boleHeight").alias("value")).with_columns(pl.lit("interior bole height").alias("measure"))],
    how="diagonal_relaxed",
)
plot = (
    ggplot(long.to_pandas(), aes("kExt", "value"))
    + geom_point(alpha=0.4)
    + stat_summary(geom=geom_line, fun_y=lambda x: x.median())
    + facet_wrap("measure", scales="free_y")
    + labs(title=f"Sky sweep, ten-tree stand, season {SEASONS}, 5 seeds", x="k_ext", y="cells")
    + theme_minimal()
)
FIGURE.parent.mkdir(parents=True, exist_ok=True)
plot.save(FIGURE, width=8, height=3, dpi=100, verbose=False)
print(f"wrote {FIGURE.relative_to(REPO)}")
