"""Frontal pictures of the #126 probe's garden at one season: HEAD over the patch, seeds 1-3, from the
feature probe's treesim runs (metamers.csv, buds.csv, metrics.csv). Wood by species; each stem >= 10 m
of beech, hornbeam or holly labelled with its live crown base. Exploratory.
Usage: uv run --project analysis python figure.py runs/probe/<label> <season> <out.png> <title>"""
import sys

import matplotlib
import polars as pl

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.collections import LineCollection  # noqa: E402

d, season, out, title = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
COL = {"beech": "#2f8f3a", "hornbeam": "#7b3fb5", "holly": "#2a6f97", "oak": "#9a8c2a", "birch": "#a0702a",
       "maple": "#b0413e", "rowan": "#3a9a7a", "willow": "#a4407a"}
ABBR = {"beech": "be", "hornbeam": "hb", "holly": "ho"}
fig, axes = plt.subplots(2, 3, figsize=(18, 10), sharey=True)
for col, seed in enumerate([1, 2, 3]):
    for row, arm in enumerate(["head", "patch"]):
        r = f"{d}/{arm}/garden160-seed{seed}"
        m = pl.read_csv(f"{r}/metamers.csv", infer_schema_length=None).filter(pl.col.season == season)
        t = pl.read_csv(f"{r}/metrics.csv", infer_schema_length=None, null_values=["NaN"]).filter(
            pl.col.season == season, pl.col.alive == 1)
        m = m.join(t.select("tree", "species", "height", "liveCrownBase", "rootX"), on="tree")
        m = m.filter(pl.col.height >= 5.2)  # drawn stems (1.3 m)
        ax = axes[row][col]
        segs = [((a, b), (c, e)) for a, b, c, e in m.select("x0", "y0", "x1", "y1").iter_rows()]
        lw = [max(0.2, rad * 0.8) for rad in m["radius"]]
        ax.add_collection(LineCollection(segs, linewidths=lw, colors=[COL.get(s, "#555") for s in m["species"]], alpha=0.8))
        tall = t.filter(pl.col.height >= 40, pl.col.species.is_in(["beech", "hornbeam", "holly"]))
        for x, h, lcb, sp in tall.select("rootX", "height", "liveCrownBase", "species").iter_rows():
            ax.plot([x - 3, x + 3], [lcb * h, lcb * h], color="red", lw=1.5)
            ax.text(x, h + 2, f"{ABBR[sp]} {lcb:.2f}", fontsize=7, ha="center", color=COL[sp])
        ax.set_xlim(0, 160); ax.set_ylim(0, 150); ax.set_aspect("equal")
        ax.set_title(f"seed {seed} {'HEAD' if arm == 'head' else 'patch'}: {len(t.filter(pl.col.height >= 5.2))} drawn, "
                     f"{len(t.filter(pl.col.height >= 40))} >= 10 m", fontsize=9)
        ax.tick_params(labelsize=7)
fig.suptitle(title, fontsize=10, wrap=True)
fig.tight_layout()
fig.savefig(out, dpi=80)
