"""Exploratory: frontal contact sheet, one seed, HEAD over the friction-heavy and gravity-heavy sink
limit (wayfinder #87), oak, maple and birch at seasons 30, 60 and 100 in the open-grown box. Leafy buds
coloured by Q / Q90; white dots are that season's new metamers. 4 cells = 1 m.

    uv run --project analysis python docs/experiments/code/2026-11-08-turgor-cap/figure.py runs/turgor 1 out.png
"""
import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import polars as pl

d, seed, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
rows = ["head", "fric", "grav"]
cols = [(sp, s) for sp in ["oak", "maple", "birch"] for s in [30, 60, 100]]
fig, axes = plt.subplots(len(rows), len(cols), figsize=(27, 9.5), sharex=True, sharey=True)
for r, cond in enumerate(rows):
    for c, (sp, season) in enumerate(cols):
        ax = axes[r][c]
        case = f"{d}/cap/{cond}-{sp}-s{seed}"
        b = pl.read_csv(f"{case}_buds.csv").filter(pl.col.season == season, pl.col.leaf > 0).sort("q")
        q90 = b["q"].quantile(0.9)
        sc = ax.scatter(b["dx"] / 4, b["dy"] / 4, c=(b["q"] / q90).clip(0, 1.2), s=1.2, cmap="viridis",
                        vmin=0, vmax=1.2, linewidths=0)
        n = pl.read_csv(f"{case}_new.csv").filter(pl.col.season == season)
        ax.scatter(n["dx"] / 4, n["dy"] / 4, s=2, c="white", edgecolors="none", alpha=0.8)
        ax.set_facecolor("#ddd")
        ax.set_aspect("equal")
        ax.set_title(f"{sp} s{seed} {cond} @{season}", fontsize=9)
for row in axes:
    row[0].set_ylabel("height (m)")
fig.colorbar(sc, ax=axes, shrink=0.5, label="bud Q / Q90")
fig.savefig(out, dpi=80, bbox_inches="tight")
