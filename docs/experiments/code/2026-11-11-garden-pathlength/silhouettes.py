"""Frontal silhouettes of the lone open-grown trees at season 100, seed 1 (#121's path-length
probe; EXPLORATORY): one row per round, one column per species, every metamer a line from its
base to its tip (x against height, metres), all panels on one scale.

    uv run --project analysis python docs/experiments/code/2026-11-11-garden-pathlength/silhouettes.py base R16k8 R20k8
"""

import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import polars as pl  # noqa: E402
from matplotlib.collections import LineCollection  # noqa: E402

ROOT = Path(__file__).resolve().parents[4]
SPECIES = ["oak", "maple", "birch", "beech", "hornbeam", "holly"]
rounds = sys.argv[1:]
fig, axes = plt.subplots(len(rounds), len(SPECIES), figsize=(2.6 * len(SPECIES), 2.3 * len(rounds)), squeeze=False)
for i, rnd in enumerate(rounds):
    for j, sp in enumerate(SPECIES):
        ax = axes[i][j]
        run = ROOT / "runs/pathlength/lone" / rnd / f"{sp}-s1"
        if (run / "metamers.csv").exists():
            m = pl.read_csv(run / "metamers.csv", columns=["season", "x0", "y0", "x1", "y1", "radius"]).filter(pl.col("season") == 100)
            x0 = m["x0"].to_numpy()[0]
            seg = [((a - x0) / 4, b / 4, (c - x0) / 4, d / 4) for a, b, c, d in zip(m["x0"], m["y0"], m["x1"], m["y1"])]
            ax.add_collection(LineCollection([((a, b), (c, d)) for a, b, c, d in seg], colors="black", linewidths=0.15, alpha=0.5))
        ax.set_xlim(-28, 28)
        ax.set_ylim(0, 40)
        ax.set_aspect("equal")
        ax.tick_params(labelsize=6)
        if i == 0:
            ax.set_title(sp, fontsize=9)
        if j == 0:
            ax.set_ylabel(rnd, fontsize=9)
out = ROOT / "docs/experiments/figures/2026-11-11-garden-pathlength-lone.png"
fig.tight_layout()
fig.savefig(out, dpi=75)
print(out)
