"""Canopy stems per hectare over seasons at 160 cells, seeds 1-3, for the occupancy probe's
baselines and closest conditions (#121; EXPLORATORY), against the >= 120/ha that the bars need.

    uv run --project analysis python docs/experiments/code/2026-11-10-garden-schedule/occupancy_figure.py
"""

from pathlib import Path

import polars as pl
from plotnine import (
    aes,
    element_blank,
    facet_wrap,
    geom_hline,
    geom_line,
    ggplot,
    labs,
    scale_linetype_manual,
    theme,
    theme_bw,
)

ROOT = Path(__file__).resolve().parents[4]
CONDITIONS = {
    "r6": "r6: no levers, rule off",
    "O-D0": "d1 levers, rule off",
    "O2-D-gate-r4": "d1 + gate, radius 4",
    "O3-D-light-r2-3d": "d1 + light, radius 2, 3D",
    "O3-N-light-r2-3d": "no levers + light, radius 2, 3D",
}
frames = []
for rnd, name in CONDITIONS.items():
    for s in (1, 2, 3):
        ha = 160 * 64 * 0.0625 / 10_000
        d = pl.read_csv(ROOT / f"runs/garden-schedule/{rnd}/w160-s{s}/stand.csv")
        frames.append(
            d.select("season", (pl.col("canopy") / ha).alias("canopy")).with_columns(
                condition=pl.lit(name), seed=pl.lit(f"seed {s}")
            )
        )
df = pl.concat(frames).to_pandas()
df["condition"] = df["condition"].astype("category").cat.set_categories(list(CONDITIONS.values()))
p = (
    ggplot(df, aes("season", "canopy", linetype="seed"))
    + geom_hline(yintercept=120, colour="#888888", linetype="dashed", size=0.4)
    + geom_line(colour="#2a78d6", size=0.5)
    + scale_linetype_manual(values=["solid", "dashed", "dotted"])
    + facet_wrap("condition", ncol=3)
    + labs(
        y="canopy trees / ha (dashed grey: 120, the bars' floor)",
        title="Garden at 160 cells, canopy trees over seasons (exploratory, seeds 1-3)",
    )
    + theme_bw()
    + theme(legend_title=element_blank(), legend_position="bottom")
)
out = ROOT / "docs/experiments/figures/2026-11-11-garden-crown-occupancy.png"
p.save(out, width=9, height=5.5, dpi=90, verbose=False)
print(out)
