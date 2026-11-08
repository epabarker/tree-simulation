"""Exploratory: frontal view of each lone exemplar at season 100, half-walled box over open box.

Columns: oak, maple, birch, beech, hornbeam, holly. Rows: walled (beechOpen's 240 x 64, tau 0.2)
and open (240 x 240, tau 1), one seed. Leafy buds are coloured by Q / Q90 (the leafy buds' 0.9
quantile); faint black crosses are the bases of branches shed with leaves in season 99; white dots
are the tips of season 100's new metamers. 4 cells = 1 m.

    uv run --project analysis python docs/experiments/code/2026-11-08-open-box/figure.py runs/open-box 1 out.png
"""
import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import polars as pl

d, seed, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
season = 100
rows = ["wall", "open"]
cols = ["oak", "maple", "birch", "beech", "hornbeam", "holly"]
fig, axes = plt.subplots(len(rows), len(cols), figsize=(22, 5.2), sharex=True, sharey=True)
for r, cond in enumerate(rows):
    for c, sp in enumerate(cols):
        ax = axes[r][c]
        case = f"{d}/cap/{cond}-{sp}-s{seed}"
        b = pl.read_csv(f"{case}_buds.csv").filter(pl.col.season == season, pl.col.leaf > 0)
        q90 = b["q"].quantile(0.9)
        b = b.sort("q")
        sc = ax.scatter(b["dx"] / 4, b["dy"] / 4, c=(b["q"] / q90).clip(0, 1.2), s=1.5, cmap="viridis",
                        vmin=0, vmax=1.2, linewidths=0)
        n = pl.read_csv(f"{case}_new.csv").filter(pl.col.season == season)
        ax.scatter(n["dx"] / 4, n["dy"] / 4, s=2, c="white", edgecolors="none", alpha=0.8)
        x = pl.read_csv(f"{case}_sheds.csv", infer_schema_length=None)
        if x.height:
            x = x.filter(pl.col.season == season - 1, pl.col.leaf > 0)
            ax.scatter(x["dx"] / 4, x["dy"] / 4, s=4, marker="x", c="black", linewidths=0.3, alpha=0.35)
        ax.set_facecolor("#ddd")
        ax.set_aspect("equal")
        lbl = "walled" if cond == "wall" else "open"
        ax.set_title(f"{sp} s{seed}, {lbl}", fontsize=9)
for ax in axes[-1]:
    ax.set_xlabel("x from root (m)")
for row in axes:
    row[0].set_ylabel("height (m)")
fig.colorbar(sc, ax=axes, shrink=0.5, label="bud Q / Q90")
fig.savefig(out, dpi=90, bbox_inches="tight")
