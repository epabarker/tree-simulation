"""Exploratory: frontal contact sheet for wayfinder #92, one seed: the oak's lambda schedules
(rows) at seasons 30, 60 and 100. Leafy buds coloured by Q / Q90; white dots are that season's
new metamers. 4 cells = 1 m.

    uv run --project analysis python docs/experiments/code/2026-11-08-oak-schedule/figure.py runs/oak-schedule 1 out.png
"""
import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import polars as pl

d, seed, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
rows = ["head", "d12a13", "d12a30", "a18", "a22", "a13r40", "k101", "k001", "k101a22", "k001d20", "k110"]
seasons = [30, 60, 100]
# Two blocks of rows side by side keep the sheet near square.
half = (len(rows) + 1) // 2
fig, axes = plt.subplots(half, 2 * len(seasons), figsize=(19, 3.2 * half), sharex=True, sharey=True)
for i, cond in enumerate(rows):
    r, c0 = i % half, (i // half) * len(seasons)
    case = f"{d}/out/{cond}-oak-s{seed}"
    bs = pl.read_csv(f"{case}_buds.csv")
    ns = pl.read_csv(f"{case}_new.csv")
    for j, season in enumerate(seasons):
        ax = axes[r][c0 + j]
        b = bs.filter(pl.col.season == season, pl.col.leaf > 0).sort("q")
        q90 = b["q"].quantile(0.9)
        ax.scatter(b["dx"] / 4, b["dy"] / 4, c=(b["q"] / q90).clip(0, 1.2), s=1.0, cmap="viridis",
                   vmin=0, vmax=1.2, linewidths=0)
        n = ns.filter(pl.col.season == season)
        ax.scatter(n["dx"] / 4, n["dy"] / 4, s=2, c="white", edgecolors="none", alpha=0.8)
        ax.set_facecolor("#ddd")
        ax.set_aspect("equal")
        ax.set_title(f"oak s{seed} {cond} @{season}", fontsize=9)
if len(rows) % 2:
    for j in range(len(seasons)):
        axes[half - 1][len(seasons) + j].axis("off")
fig.tight_layout()
fig.savefig(out, dpi=72)
