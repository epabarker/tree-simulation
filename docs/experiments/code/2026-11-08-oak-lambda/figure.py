"""Exploratory: frontal contact sheet for wayfinder #91, one seed: the oak's lambda schedules (rows)
without and with the length cap (fric50), at seasons 30, 60 and 100, plus birch (last row) as the
contrast. Leafy buds coloured by Q / Q90; white dots are that season's new metamers. 4 cells = 1 m.

    uv run --project analysis python docs/experiments/code/2026-11-08-oak-lambda/figure.py runs/oak-lambda 1 out.png
"""
import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import polars as pl

d, seed, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
rows = [("oak", c) for c in ["head", "d08a13", "d12a13", "d08a30", "d12a30"]] + [("birch", "head")]
cols = [(f, s) for f in ["", "F"] for s in [30, 60, 100]]
fig, axes = plt.subplots(len(rows), len(cols), figsize=(19, 19), sharex=True, sharey=True)
for r, (sp, cond) in enumerate(rows):
    for c, (f, season) in enumerate(cols):
        ax = axes[r][c]
        case = f"{d}/out/{cond}{f}-{sp}-s{seed}"
        b = pl.read_csv(f"{case}_buds.csv").filter(pl.col.season == season, pl.col.leaf > 0).sort("q")
        q90 = b["q"].quantile(0.9)
        ax.scatter(b["dx"] / 4, b["dy"] / 4, c=(b["q"] / q90).clip(0, 1.2), s=1.2, cmap="viridis",
                   vmin=0, vmax=1.2, linewidths=0)
        n = pl.read_csv(f"{case}_new.csv").filter(pl.col.season == season)
        ax.scatter(n["dx"] / 4, n["dy"] / 4, s=2, c="white", edgecolors="none", alpha=0.8)
        ax.set_facecolor("#ddd")
        ax.set_aspect("equal")
        ax.set_title(f"{sp} s{seed} {cond}{' fric50' if f else ''} @{season}", fontsize=9)
fig.tight_layout()
fig.savefig(out, dpi=80)
