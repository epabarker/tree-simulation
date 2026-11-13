"""Drawn and canopy stems per hectare over seasons, r6 against d1, seeds 1-20 at 160 and 66 cells
(#122): the median over seeds with the 10-90% range, the 200-400/ha band shaded. Reads
`npm run evidence:garden`'s runs.

    uv run --project analysis python docs/experiments/code/2026-11-12-garden-acceptance/figure.py
"""

from pathlib import Path

import polars as pl
from plotnine import (
    aes,
    annotate,
    facet_grid,
    geom_line,
    geom_ribbon,
    ggplot,
    labs,
    scale_y_log10,
    theme_bw,
)

ROOT = Path(__file__).resolve().parents[4]
frames = []
for cond in ("r6", "d1"):
    for w in (160, 66):
        ha = w * 64 * 0.0625 / 10_000
        for s in range(1, 21):
            d = pl.read_csv(ROOT / f"runs/garden-acceptance/{cond}/w{w}-s{s}/stand.csv")
            frames.append(
                d.select(
                    "season",
                    (pl.col("drawn") / ha).alias("drawn"),
                    (pl.col("canopy") / ha).alias("canopy"),
                ).with_columns(condition=pl.lit(cond), width=pl.lit(f"{w} cells"), seed=pl.lit(s))
            )
df = pl.concat(frames).unpivot(
    index=["season", "condition", "width", "seed"], variable_name="stems"
)
agg = (
    df.group_by(["season", "condition", "width", "stems"])
    .agg(
        pl.col("value").median().alias("med"),
        pl.col("value").quantile(0.1).alias("lo"),
        pl.col("value").quantile(0.9).alias("hi"),
    )
    .with_columns((pl.col(c) + 1).alias(c) for c in ("med", "lo", "hi"))
    .sort("season")
)
agg = agg.with_columns(pl.col("condition").cast(pl.Enum(["r6", "d1"])))
p = (
    ggplot(agg.to_pandas(), aes("season", "med", colour="stems", fill="stems"))
    + annotate("rect", xmin=100, xmax=300, ymin=201, ymax=401, alpha=0.15)
    + geom_ribbon(aes(ymin="lo", ymax="hi"), alpha=0.25, colour="none")
    + geom_line(size=0.6)
    + scale_y_log10()
    + facet_grid("condition ~ width")
    + labs(
        y="stems / ha + 1 (median, 10–90% of seeds; band shaded)",
        title="Garden acceptance, seeds 1–20: r6 against d1",
    )
    + theme_bw()
)
out = ROOT / "docs/experiments/figures/2026-11-12-garden-acceptance.png"
p.save(out, width=8, height=5, dpi=110, verbose=False)
print(out)
