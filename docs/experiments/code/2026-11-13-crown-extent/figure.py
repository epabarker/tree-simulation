"""The crown-extent probe's figures (#129; EXPLORATORY, seeds 1-3).

1. Crown diameter against DBH, one panel per species: the lone open-grown tree every 10 seasons
   per arm, over Pretzsch et al. 2015's open-grown 95% edge (the bar: at or under the line).
2. Frontal silhouettes of the lone trees at season 100, seed 1: one row per arm, one column per
   species, every metamer a line from base to tip (x against height, metres), one scale.

    uv run --project analysis python docs/experiments/code/2026-11-13-crown-extent/figure.py
"""

import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import polars as pl  # noqa: E402
from matplotlib.collections import LineCollection  # noqa: E402
from plotnine import (  # noqa: E402
    aes,
    element_blank,
    facet_wrap,
    geom_line,
    geom_point,
    ggplot,
    labs,
    scale_color_manual,
    scale_x_continuous,
    theme,
    theme_bw,
)

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "2026-11-11-garden-pathlength"))
from anchors import pretzsch95  # noqa: E402

ROOT = HERE.parents[3]
FIGS = ROOT / "docs/experiments/figures"
SPECIES = ["oak", "maple", "birch", "beech", "hornbeam", "holly"]
ARMS = {
    "base": "HEAD",
    "R16k8": "reach yardstick (R16k8)",
    "H40k2f": "laterals by height, Choi's rates (H40k2f)",
    "H4k8": "laterals by height, strongest (H4k8)",
    "C6half": "half pipe radius (C6half)",
}
SILHOUETTES = ["base", "R16k8", "H40k2f", "H4k8", "S4"]


def run(arm, sp, seed):
    return ROOT / "runs/probe" / f"129-{arm}-{sp}" / ("head" if arm == "base" else "patch") / f"lone-seed{seed}"


rows = []
for arm, label in ARMS.items():
    for sp in SPECIES[:5]:
        for seed in (1, 2, 3):
            f = run(arm, sp, seed) / "allometry.csv"
            if f.exists():
                df = pl.read_csv(f).filter(pl.col("tree") == 0)
                rows.append(
                    df.select(pl.col("dbh_cm").cast(pl.Float64), (2 * pl.col("cr_m")).alias("crown")).with_columns(
                        species=pl.lit(sp), what=pl.lit(label)
                    )
                )
sim = pl.concat(rows).filter(pl.col("dbh_cm") <= 120)
edge = pl.DataFrame(
    [{"species": sp, "dbh_cm": float(d), "crown": pretzsch95(sp, d)} for sp in SPECIES[:5] for d in range(5, 121)]
)
colours = dict(zip(ARMS.values(), ["#b2182b", "#2166ac", "#f4a582", "#4dac26", "#999999"]))
p = (
    ggplot()
    + geom_point(sim.to_pandas(), aes("dbh_cm", "crown", color="what"), size=0.9, alpha=0.7)
    + geom_line(edge.to_pandas(), aes("dbh_cm", "crown"), color="black", size=0.7)
    + facet_wrap("species", nrow=1)
    + scale_color_manual(values=colours)
    + scale_x_continuous(breaks=[0, 40, 80, 120])
    + labs(x="DBH (cm)", y="crown diameter (m)", color="")
    + theme_bw()
    + theme(legend_position="bottom", panel_grid_minor=element_blank(), figure_size=(12, 4.6))
)
out = FIGS / "2026-11-13-crown-extent-probe.png"
p.save(out, dpi=110, verbose=False)
print(out)

fig, axes = plt.subplots(
    len(SILHOUETTES), len(SPECIES), figsize=(2.6 * len(SPECIES), 2.3 * len(SILHOUETTES)), squeeze=False
)
for i, arm in enumerate(SILHOUETTES):
    for j, sp in enumerate(SPECIES):
        ax = axes[i][j]
        f = run(arm, sp, 1) / "metamers.csv"
        if f.exists():
            m = pl.scan_csv(f).filter(pl.col("season") == 100).select("x0", "y0", "x1", "y1").collect()
            x0 = m["x0"][0]
            seg = [(((a - x0) / 4, b / 4), ((c - x0) / 4, d / 4)) for a, b, c, d in m.iter_rows()]
            ax.add_collection(LineCollection(seg, colors="black", linewidths=0.15, alpha=0.5))
        ax.set_xlim(-31, 31)
        ax.set_ylim(0, 40)
        ax.set_aspect("equal")
        ax.tick_params(labelsize=6)
        if i == 0:
            ax.set_title(sp, fontsize=9)
        if j == 0:
            ax.set_ylabel(arm, fontsize=9)
out = FIGS / "2026-11-13-crown-extent-lone.png"
fig.tight_layout()
fig.savefig(out, dpi=75)
print(out)
