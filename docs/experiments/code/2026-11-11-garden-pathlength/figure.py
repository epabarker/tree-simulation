"""The path-length probe's figure (#121; EXPLORATORY, seeds 1-3): crown diameter against DBH.

Left to right, one panel per species: the lone open-grown tree every 10 seasons (rule off, and
the reach limit at L_x 16 and 20 cells), and the garden's canopy trees at each snapshot (rule off
with the d1 levers), over Pretzsch et al. 2015's open-grown 95% edge (solid) and Tallo's
forest-grown median (dashed, within its support).

    uv run --project analysis python docs/experiments/code/2026-11-11-garden-pathlength/figure.py
"""

import sys
from pathlib import Path

import polars as pl
from plotnine import (
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

sys.path.insert(0, str(Path(__file__).parent))
from anchors import pretzsch95, support, tallo  # noqa: E402

ROOT = Path(__file__).resolve().parents[4]
SPECIES = ["oak", "maple", "birch", "beech", "hornbeam"]
LONE = {"base": "lone, rule off", "R16k8": "lone, reach L_x 16", "R20k8": "lone, reach L_x 20"}
GARDEN = {"P0-D": "garden canopy trees, rule off", "P2-D-R16k8": "garden canopy trees, reach L_x 16"}

rows = []
for rnd, label in LONE.items():
    for run in sorted((ROOT / "runs/pathlength/lone" / rnd).glob("*-s*")):
        if (run / "allometry.csv").exists():
            df = pl.read_csv(run / "allometry.csv")
            rows.append(df.select("species", "dbh_cm", (2 * pl.col("cr_m")).alias("crown")).with_columns(what=pl.lit(label)))
for rnd, label in GARDEN.items():
    for run in sorted((ROOT / "runs/garden-schedule" / rnd).glob("w160-s*")):
        if (run / "allometry.csv").exists():
            df = pl.read_csv(run / "allometry.csv")
            top = df.group_by("season").agg(pl.col("height_m").max().alias("top"))
            df = df.join(top, on="season").filter(pl.col("height_m") > pl.col("top") / 2)
            rows.append(df.select("species", "dbh_cm", (2 * pl.col("cr_m")).alias("crown")).with_columns(what=pl.lit(label)))
sim = pl.concat(rows).filter(pl.col("species").is_in(SPECIES) & (pl.col("dbh_cm") <= 120))

lines = []
for sp in SPECIES:
    lo, hi = support(sp)
    for d in range(5, 121):
        lines.append({"species": sp, "dbh_cm": d, "crown": pretzsch95(sp, d), "anchor": "Pretzsch open-grown 95%"})
        if lo <= d <= hi:
            lines.append({"species": sp, "dbh_cm": d, "crown": tallo(sp, d)[1], "anchor": "Tallo forest-grown median"})
anchors = pl.DataFrame(lines)

colours = dict(zip([*LONE.values(), *GARDEN.values()], ["#b2182b", "#2166ac", "#67a9cf", "#f4a582", "#4dac26"]))
p = (
    ggplot()
    + geom_point(sim.to_pandas(), aes("dbh_cm", "crown", color="what"), size=0.9, alpha=0.7)
    + geom_line(anchors.to_pandas(), aes("dbh_cm", "crown", linetype="anchor"), color="black", size=0.7)
    + facet_wrap("species", nrow=1)
    + scale_color_manual(values=colours)
    + scale_x_continuous(breaks=[0, 40, 80, 120])
    + labs(x="DBH (cm)", y="crown diameter (m)", color="", linetype="")
    + theme_bw()
    + theme(legend_position="bottom", legend_box="vertical", panel_grid_minor=element_blank(), figure_size=(12, 5))
)
out = ROOT / "docs/experiments/figures/2026-11-11-garden-pathlength-probe.png"
p.save(out, dpi=110, verbose=False)
print(out)
