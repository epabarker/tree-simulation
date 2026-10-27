"""M11: periodic sides, O4 stand dynamics and O2 abrasion (ADR 0013). Does a dense even-aged stand
thin itself along a log–log line, with size inequality and bimodality judged alongside (§10;
Reynolds & Ford 2005)? Do seedlings refill a canopy gap? Does abrasion widen crown gaps?

1. Self-thinning: the `thinning` preset (an edgeless ring, 210 cells) planted at 3.5, 5, 7 and
   10.5 cells, 150 seasons, no recruitment.
2. Forest: the `forest` preset for 300 seasons, kept or with tree 4 felled at season 100.
3. Crown gaps: 21 trees 10 cells apart on the ring for 80 seasons, O2 off or on.

    uv run --project analysis python analysis/experiments/m11_stand_dynamics.py
"""

import json
import math
import subprocess
from concurrent.futures import ThreadPoolExecutor

import polars as pl
from plotnine import (
    aes,
    geom_abline,
    geom_path,
    ggplot,
    labs,
    scale_x_log10,
    scale_y_log10,
    theme_minimal,
)
from treesim import REPO, Run, load_runs, run_many

EXPERIMENT = "runs/m11-stand-dynamics"
FIGURE = REPO / "docs" / "experiments" / "figures" / "2026-10-27-m11-thinning.png"
SEEDS = range(1, 6)
W = 210
root = REPO / EXPERIMENT

# 1. Self-thinning at four planting densities.
SPACINGS = [3.5, 5.0, 7.0, 10.5]


def planted(spacing: float) -> list[dict]:
    n = round(W / spacing)
    return [{"x": (k + 0.5) * W / n} for k in range(n)]


runs = [Run(f"{EXPERIMENT}/thin_{s}_s{seed}", "thinning", seed, 150, {"trees": planted(s)}) for s in SPACINGS for seed in SEEDS]
# 2. The forest, kept (felled runs replay the same params with an event below).
runs += [Run(f"{EXPERIMENT}/forest_kept_s{seed}", "forest", seed, 300) for seed in SEEDS]
# 3. Crown gaps with and without abrasion; snapshot geometry at the end.
GAPPED = {"trees": [{"x": 5 + 10 * k} for k in range(21)], "o4": {"enabled": False}}
runs += [
    Run(f"{EXPERIMENT}/gaps_{name}_s{seed}", "forest", seed, 80, {**GAPPED, "o2": {"enabled": on}})
    for name, on in (("off", False), ("on", True))
    for seed in (1, 2, 3)
]
run_many(runs)


def felled(seed: int) -> None:
    params = json.loads((root / f"forest_kept_s{seed}" / "run.json").read_text())["params"]
    replay = root / f"forest_felled_s{seed}.json"
    replay.write_text(json.dumps({"params": params, "events": [{"season": 100, "type": "removeTree", "tree": 4}], "seasons": 300}))
    out = root / f"forest_felled_s{seed}"
    subprocess.run(["node", "cli/run.ts", "--replay", str(replay), "--out", str(out), "--quiet"], cwd=REPO, check=True)


with ThreadPoolExecutor() as pool:
    list(pool.map(felled, SEEDS))

meta = (
    pl.col("run").str.extract(r"^([a-z]+)_").alias("kind"),
    pl.col("run").str.extract(r"^[a-z]+_([\w.]+)_s\d+$").alias("condition"),
)
df = load_runs(root).with_columns(*meta)
live = df.filter(pl.col("alive") == 1)


def bimodality(xs: list[float]) -> float:
    """Sarle's bimodality coefficient (> 0.555 suggests two modes)."""
    n = len(xs)
    if n < 4:
        return float("nan")
    m = sum(xs) / n
    s2 = sum((x - m) ** 2 for x in xs) / n
    if s2 == 0:
        return float("nan")
    g = sum((x - m) ** 3 for x in xs) / n / s2**1.5
    k = sum((x - m) ** 4 for x in xs) / n / s2**2 - 3
    return (g * g + 1) / (k + 3 * (n - 1) ** 2 / ((n - 2) * (n - 3)))


# --- 1. Self-thinning
thin = (
    live.filter(pl.col("kind") == "thin")
    .group_by("run", "condition", "seed", "season")
    .agg(
        pl.len().alias("n"),
        pl.col("woodVolume").mean().alias("mass"),
        (pl.col("woodVolume").std(ddof=0) / pl.col("woodVolume").mean()).alias("cv"),
        pl.col("woodVolume").alias("masses"),
    )
    .sort("run", "season")
    .with_columns((pl.col("n") / W).alias("density"))
)
slopes = []
for (run, cond), g in thin.group_by("run", "condition"):
    g = g.sort("season")
    n0 = g["n"][0]
    # The thinning phase: from the first death until the last, while the stand closes.
    dying = g.filter(pl.col("n") < n0)
    if dying.height < 5 or dying["n"].min() == dying["n"].max():
        slopes.append({"condition": cond, "slope": None})
        continue
    x = [math.log(v) for v in dying["density"]]
    y = [math.log(v) for v in dying["mass"]]
    mx, my = sum(x) / len(x), sum(y) / len(y)
    sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
    sxx = sum((a - mx) ** 2 for a in x)
    slopes.append({"condition": cond, "slope": sxy / sxx if sxx > 0 else None})
slope = pl.DataFrame(slopes).group_by("condition").agg(pl.col("slope").median().round(2).alias("slope"), pl.col("slope").min().round(2).alias("min"), pl.col("slope").max().round(2).alias("max"))
final = (
    thin.filter(pl.col("season") == thin["season"].max())
    .with_columns(pl.col("masses").map_elements(lambda m: bimodality(list(m)), return_dtype=pl.Float64).alias("bc"))
    .group_by("condition")
    .agg(pl.col("n").median().alias("live at 150"), pl.col("cv").median().round(2).alias("CV 150"), pl.col("bc").median().round(2).alias("bimodality 150"))
)
peak = (
    thin.with_columns(pl.col("masses").map_elements(lambda m: bimodality(list(m)), return_dtype=pl.Float64).alias("bc"))
    .group_by("run", "condition")
    .agg(pl.col("cv").max().alias("cvmax"), pl.col("bc").max().alias("bcmax"))
    .group_by("condition")
    .agg(pl.col("cvmax").median().round(2).alias("peak CV"), pl.col("bcmax").median().round(2).alias("peak bimodality"))
)
start = thin.filter(pl.col("season") == 1).group_by("condition").agg(pl.col("n").first().alias("planted"))
with pl.Config(tbl_cols=20, tbl_width_chars=200):
    print(start.join(slope, on="condition").join(final, on="condition").join(peak, on="condition").sort("planted", descending=True))

fig = (
    ggplot(thin.filter(pl.col("seed") == 1).with_columns(pl.col("condition").alias("spacing")), aes("density", "mass", colour="spacing"))
    + geom_path()
    + geom_abline(intercept=-1.9, slope=-3, linetype="dashed", colour="grey")
    + scale_x_log10()
    + scale_y_log10()
    + labs(x="live trees per cell of ground", y="mean wood volume (cells³)", title="Self-thinning on the ring (seed 1); dashed: slope −3")
    + theme_minimal()
)
fig.save(FIGURE, width=6.5, height=4, dpi=110, verbose=False)

# --- 2. Forest
forest = df.filter(pl.col("kind") == "forest")
pop = (
    forest.filter(pl.col("alive") == 1)
    .group_by("condition", "seed", "season")
    .agg(pl.len().alias("n"), (pl.col("height") >= 40).sum().alias("canopy"))
    .group_by("condition", "season")
    .agg(pl.col("n").median(), pl.col("canopy").median())
    .filter(pl.col("season").is_in([49, 99, 149, 199, 299]))
    .sort("condition", "season")
)
print(pop)
# Recruits within 12 cells of the felled tree's root (x = 94) established in seasons 100–140.
first = forest.group_by("condition", "seed", "tree").agg(pl.col("season").min().alias("born"), pl.col("rootX").first())
gap = (
    first.filter(pl.col("tree") >= 10, pl.col("born").is_between(100, 140), (pl.col("rootX") - 94).abs() <= 12)
    .group_by("condition")
    .agg(pl.len().alias("recruits in the gap, seasons 100–140 (5 seeds)"))
)
print(gap)
deaths = forest.filter(pl.col("tree") < 10).group_by("condition", "seed", "tree").agg((pl.col("alive") == 0).any().alias("died")).group_by("condition").agg(pl.col("died").sum().alias("planted trees dead by 300 (of 50)"))
print(deaths)

# --- 3. Crown gaps from the final geometry: young tips (≤ 3 seasons) stand for foliage.
m = load_runs(root, "metamers").with_columns(*meta).filter(pl.col("kind") == "gaps", pl.col("season") == 80, pl.col("birthSeason") >= 77)
rows = []
for (run, cond), g in m.group_by("run", "condition"):
    top = g["y1"].max()
    band = g.filter(pl.col("y1") >= 0.75 * top).with_columns(
        (pl.col("x1").floor().cast(pl.Int64) % W).alias("col"), pl.col("y1").floor().cast(pl.Int64).alias("row")
    )
    for (_,), r in band.group_by("row"):
        cells = r.group_by("col").agg(pl.col("tree").unique().alias("owners")).sort("col")
        last_owner, last_col = None, None
        for col, owners in zip(cells["col"], cells["owners"]):
            owner = owners[0] if len(owners) == 1 else -2
            if last_owner is not None and owner != last_owner:
                rows.append({"condition": cond, "gap": col - last_col - 1})
            last_owner, last_col = owner, col
gaps = pl.DataFrame(rows).group_by("condition").agg(
    pl.len().alias("neighbour pairs"),
    pl.col("gap").median().alias("median gap"),
    (pl.col("gap") <= 1).mean().round(3).alias("touching (≤ 1 cell)"),
)
abr = df.filter(pl.col("kind") == "gaps").group_by("condition").agg((pl.col("abraded").sum() / 3 / 80).round(1).alias("buds abraded / season"))
print(gaps.join(abr, on="condition"))
print("figure written")
