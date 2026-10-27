"""M10: R4 dormancy and release, R5 shade avoidance (ADR 0012). Do the recommended settings give
the §7 M10 visible test (an epicormic flush after a neighbour is felled, slender stand trees)
without spoiling the M6–M9 stand patterns, and what does each part contribute?

Conditions: neither principle; R4 alone; R5 alone; both with the recommended settings now in the
sky presets (rec); and one-change variants of rec: no bud bank, the sugar route only (no light
trigger), a higher Q_rel, a stronger leader bias δλ, stronger elongation e_s. For each: the
ten-tree stand with tree 4 felled at season 50 and kept, for 100 seasons, and the open-grown tree.

    uv run --project analysis python analysis/experiments/m10_release_shade.py
"""

import json
import subprocess
from concurrent.futures import ThreadPoolExecutor

import polars as pl
from plotnine import aes, facet_wrap, geom_line, ggplot, labs, stat_summary, theme_minimal
from treesim import REPO, Run, load_runs, run_many, run_one

EXPERIMENT = "runs/m10-release-shade"
FIGURE = REPO / "docs" / "experiments" / "figures" / "2026-10-27-m10-flush.png"
SEEDS = range(1, 6)
SEASONS = 100
FELL = 50
WINDOW = 6

CONDITIONS = {
    "off": {"r4": {"enabled": False}, "r5": {"enabled": False}},
    "R4": {"r5": {"enabled": False}},
    "R5": {"r4": {"enabled": False}},
    "rec": {},
    "noBank": {"r4": {"bank": False}},
    "sugarOnly": {"r4": {"qRel": 99}},
    "qRel0.15": {"r4": {"qRel": 0.15}},
    "dLambda0.04": {"r5": {"dLambda": 0.04}},
    "eS0.3": {"r5": {"eS": 0.3}},
}

root = REPO / EXPERIMENT
runs = [Run(f"{EXPERIMENT}/open_{c}_s{s}", "skyTree", s, SEASONS, p) for c, p in CONDITIONS.items() for s in SEEDS]
runs += [
    Run(f"{EXPERIMENT}/kept_{c}_s{s}", "skyStand", s, SEASONS, p, snapshots=[FELL + WINDOW])
    for c, p in CONDITIONS.items()
    for s in SEEDS
]
run_many(runs)


def felled(cond: str, seed: int) -> None:
    """The stand with tree 4 felled at season FELL, by replaying the kept run's params with an event."""
    params = json.loads((root / f"kept_{cond}_s{seed}" / "run.json").read_text())["params"]
    out = root / f"felled_{cond}_s{seed}"
    replay = root / f"felled_{cond}_s{seed}.json"
    replay.write_text(json.dumps({"params": params, "events": [{"season": FELL, "type": "removeTree", "tree": 4}], "seasons": SEASONS}))
    cmd = ["node", "cli/run.ts", "--replay", str(replay), "--snapshots", str(FELL + WINDOW), "--out", str(out), "--quiet"]
    subprocess.run(cmd, cwd=REPO, check=True)


with ThreadPoolExecutor() as pool:
    list(pool.map(lambda cs: felled(*cs), [(c, s) for c in CONDITIONS for s in SEEDS]))

meta = (
    pl.col("run").str.extract(r"^([a-z]+)_").alias("stand"),
    pl.col("run").str.extract(r"^[a-z]+_([\w.]+)_s\d+$").alias("condition"),
)
metrics = load_runs(root).with_columns(*meta)
m = load_runs(root, "metamers").with_columns(*meta).filter(pl.col("season") == FELL + WINDOW)

# Epicormic shoots on the felled tree's neighbours (3 and 5): axes started in seasons FELL…FELL+5
# on trunk wood at least 10 seasons old.
parents = m.select("run", "tree", pl.col("birthId").alias("parentBirthId"), pl.col("order").alias("pOrder"), pl.col("birthSeason").alias("pBorn"))
epi = (
    m.filter(pl.col("tree").is_in([3, 5]), pl.col("axis") == pl.col("birthId"), pl.col("birthSeason") >= FELL)
    .join(parents, on=["run", "tree", "parentBirthId"])
    .filter(pl.col("pOrder") == 0, pl.col("birthSeason") - pl.col("pBorn") >= 10)
    .group_by("stand", "condition")
    .agg(pl.len().alias("n"))
    .pivot(on="stand", index="condition", values="n")
    .rename({"kept": "epicormic kept", "felled": "epicormic felled"})
)

at = lambda s: pl.col("season") == s - 1  # metrics.csv rows are written after each season
interior = metrics.filter(pl.col("stand") == "kept", ~pl.col("tree").is_in([0, 9]))
stand = interior.group_by("condition").agg(
    pl.col("height").filter(at(50)).median().round(0).alias("h50"),
    pl.col("height").filter(at(100)).median().round(0).alias("h100"),
    (pl.col("height").filter(at(100)).median() - pl.col("height").filter(at(70)).median()).round(1).alias("Δh 70→100"),
    pl.col("slenderness").filter(at(50)).median().round(0).alias("H/D 50"),
    pl.col("boleHeight").filter(at(50)).median().round(0).alias("bole 50"),
    (pl.col("alive").filter(at(100)) == 0).sum().alias("dead /40"),
    (100 * pl.col("groundLight").filter(at(50)).mean()).round(1).alias("floor % 50"),
    pl.col("released").filter(pl.col("season") >= 50).mean().round(2).alias("releases/tree/season"),
    pl.col("aborted").filter(pl.col("season") >= 50).mean().round(2).alias("aborts/tree/season"),
    pl.col("epicormic").filter(pl.col("season") >= 50).mean().round(2).alias("epicormic/tree/season"),
)
edge = metrics.filter(pl.col("stand") == "kept", pl.col("tree") == 0, at(50)).group_by("condition").agg(pl.col("centroidOffset").median().round(1).alias("edge lean"))
opened = metrics.filter(pl.col("stand") == "open").group_by("condition").agg(
    pl.col("height").filter(at(100)).median().round(0).alias("open h100"),
    pl.col("slenderness").filter(at(50)).median().round(0).alias("open H/D 50"),
)
summary = stand.join(edge, on="condition").join(opened, on="condition").join(epi, on="condition", how="left").sort("condition")
with pl.Config(tbl_cols=20, tbl_width_chars=260):
    print(summary)

# Figure: epicormic releases per neighbour around the felling (R4 alone, both, R5 alone).
around = (
    metrics.filter(pl.col("tree").is_in([3, 5]), pl.col("condition").is_in(["rec", "R4", "R5"]), pl.col("season").is_between(40, 70))
    .with_columns(pl.col("stand").replace({"kept": "kept stand", "felled": "tree 4 felled at season 50"}))
)
fig = (
    ggplot(around, aes("season", "epicormic", colour="stand"))
    + stat_summary(geom=geom_line, fun_y=lambda s: s.mean())
    + facet_wrap("condition")
    + labs(y="trunk buds released per tree", title="Epicormic release on the felled tree's neighbours (5 seeds, trees 3 and 5)", colour="")
    + theme_minimal()
)
fig.save(FIGURE, width=9, height=3.2, dpi=110, verbose=False)
print("figure written")
