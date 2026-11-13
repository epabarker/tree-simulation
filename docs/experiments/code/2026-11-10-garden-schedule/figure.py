"""Drawn and canopy stems per hectare over seasons, rounds r0 (the flip at the bare rates) and r6
(the committed schedule, m_c 0.003), seeds 1-3 at 160 and 66 cells (#121; EXPLORATORY).

    uv run --project analysis python docs/experiments/code/2026-11-10-garden-schedule/figure.py
"""

from pathlib import Path

import polars as pl
from plotnine import aes, annotate, facet_grid, geom_line, ggplot, labs, scale_y_log10, theme_bw

ROOT = Path(__file__).resolve().parents[4]
frames = []
for rnd in ("r0", "r6"):
    for w in (160, 66):
        for s in (1, 2, 3):
            ha = w * 64 * 0.0625 / 10_000
            d = pl.read_csv(ROOT / f"runs/garden-schedule/{rnd}/w{w}-s{s}/stand.csv")
            frames.append(
                d.select(
                    "season",
                    (pl.col("drawn") / ha).alias("drawn"),
                    (pl.col("canopy") / ha).alias("canopy"),
                    (pl.col("live") / ha).alias("live"),
                ).with_columns(round=pl.lit(rnd), width=pl.lit(f"{w} cells"), seed=pl.lit(str(s)))
            )
df = pl.concat(frames).unpivot(index=["season", "round", "width", "seed"], variable_name="stems")
df = df.with_columns(
    (pl.col("value") + 1).alias("value"), (pl.col("stems") + pl.col("seed")).alias("line")
)
p = (
    ggplot(df.to_pandas(), aes("season", "value", colour="stems", group="line"))
    + annotate("rect", xmin=100, xmax=300, ymin=201, ymax=401, alpha=0.15)
    + geom_line(size=0.4)
    + scale_y_log10()
    + facet_grid("round ~ width")
    + labs(y="stems / ha + 1 (target band shaded)", title="Garden schedule, seeds 1–3 (exploratory)")
    + theme_bw()
)
out = ROOT / "docs/experiments/figures/2026-11-10-garden-schedule.png"
p.save(out, width=8, height=5, dpi=110, verbose=False)
print(out)
