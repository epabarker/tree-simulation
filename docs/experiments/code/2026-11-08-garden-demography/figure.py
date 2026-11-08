"""Exploratory: the garden from the front at seasons 50, 150 and 300 (columns), seeds 1-3 (rows).

Every live metamer is drawn as a segment (x, y), its width by radius: planted trees dark, recruits
orange. One figure per width. 4 cells = 1 m.

    uv run --project analysis python docs/experiments/code/2026-11-08-garden-demography/figure.py runs/garden-demography w160 out.png
"""
import json
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import polars as pl
from matplotlib.collections import LineCollection

d, kind, out = sys.argv[1], sys.argv[2], sys.argv[3]
SEASONS = [50, 150, 300]
seeds = [1, 2, 3]
fig, axes = plt.subplots(len(seeds), len(SEASONS), figsize=(16 if kind == "w160" else 9, 10),
                         sharex=True, sharey=True, squeeze=False)
for r, seed in enumerate(seeds):
    case = f"{d}/{kind}-s{seed}"
    planted = len(json.load(open(f"{case}.json"))["trees"])
    mm = pl.read_csv(f"{case}/metamers.csv", infer_schema_length=None)
    for c, s in enumerate(SEASONS):
        ax = axes[r][c]
        m = mm.filter(pl.col.season == s)
        for rec, colour in [(False, "#2b2b2b"), (True, "#e07020")]:
            q = m.filter((pl.col.tree >= planted) == rec)
            segs = [[(a / 4, b / 4), (e / 4, f / 4)]
                    for a, b, e, f in q.select("x0", "y0", "x1", "y1").rows()]
            lw = (q["radius"].to_numpy() * 6).clip(0.2, 6)
            ax.add_collection(LineCollection(segs, colors=colour, linewidths=lw))
        n = m["tree"].unique()
        nr = (n >= planted).sum()
        ax.set_title(f"seed {seed}, season {s}: {n.len()} stems, {nr} recruits", fontsize=10 if kind == "w160" else 7.5)
        ax.set_facecolor("#eef2f5")
        ax.set_aspect("equal")
        ax.autoscale_view()
for ax in axes[-1]:
    ax.set_xlabel("x (m)")
for row in axes:
    row[0].set_ylabel("height (m)")
    row[0].set_ylim(0, None)
fig.savefig(out, dpi=100, bbox_inches="tight")
