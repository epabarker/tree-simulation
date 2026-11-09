"""Exploratory: frontal view of each lone crown, leaves coloured by light, and where it sheds and grows.

Columns: oak, maple, birch. Rows: seed 1 and seed 2 with shedding at HEAD (season 100), then
seed 1 with no shedding (season 90). Leafy buds are coloured by Q / Q90 (the leafy buds' 0.9
quantile); black crosses are the bases of branches shed with leaves in seasons 90-99 (none in the
no-shed row); white dots are the tips of that season's new metamers. 4 cells = 1 m.

    uv run --project analysis python docs/experiments/code/2026-11-08-flat-cap/figure.py runs/flat-cap out.png
"""
import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import polars as pl

d, out = sys.argv[1], sys.argv[2]
rows = [("lone", 1, 100), ("lone", 2, 100), ("noshed", 1, 90)]
cols = ["oak", "maple", "birch"]
fig, axes = plt.subplots(len(rows), len(cols), figsize=(13, 12), sharex=True, sharey=True)
for r, (kind, seed, season) in enumerate(rows):
    for c, sp in enumerate(cols):
        ax = axes[r][c]
        case = f"{d}/{kind}-{sp}-s{seed}"
        b = pl.read_csv(f"{case}_buds.csv").filter(pl.col.season == season, pl.col.leaf > 0)
        q90 = b["q"].quantile(0.9)
        b = b.sort("q")
        sc = ax.scatter(b["dx"] / 4, b["dy"] / 4, c=(b["q"] / q90).clip(0, 1.2), s=2, cmap="viridis",
                        vmin=0, vmax=1.2, linewidths=0)
        n = pl.read_csv(f"{case}_new.csv").filter(pl.col.season == season)
        ax.scatter(n["dx"] / 4, n["dy"] / 4, s=3, c="white", edgecolors="none", alpha=0.8)
        x = pl.read_csv(f"{case}_sheds.csv", infer_schema_length=None)
        if x.height:
            x = x.filter(pl.col.season.is_between(season - 10, season - 1), pl.col.leaf > 0)
            ax.scatter(x["dx"] / 4, x["dy"] / 4, s=10, marker="x", c="black", linewidths=0.6)
        ax.set_facecolor("#ddd")
        ax.set_aspect("equal")
        lbl = "no shedding" if kind == "noshed" else "HEAD"
        ax.set_title(f"{sp}, seed {seed}, {lbl}, season {season}", fontsize=10)
for ax in axes[-1]:
    ax.set_xlabel("x from root (m)")
for row in axes:
    row[0].set_ylabel("height (m)")
fig.colorbar(sc, ax=axes, shrink=0.5, label="bud Q / Q90")
fig.savefig(out, dpi=110, bbox_inches="tight")
