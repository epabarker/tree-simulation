"""Level 0 trunk diagnosis, the figure (docs/experiments/2026-11-03-level0-trunk.md, step 6): median z_H and z_CR at
60, 100, 150 for the hand params, the final fit and the probes, beech and oak, with the gate's ±T band.

  uv run --project analysis python -I analysis/experiments/level0_trunk_figure.py OUT.png
"""

import json
import sys
from pathlib import Path

import polars as pl
from plotnine import (aes, annotate, element_blank, element_text, facet_grid, geom_hline, geom_line, geom_point,
                      ggplot, labs, scale_color_manual, scale_shape_manual, scale_x_continuous, theme, theme_minimal)

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from treesim import tallo  # noqa: E402

FITS = Path("docs/experiments/fits/level0")
PROBES = Path("docs/experiments/fits/level0-trunk")
# Fixed categorical order (the dataviz reference palette, light): blue, orange, aqua, yellow.
SERIES = {"hand": "#2a78d6", "final fit": "#eb6834", "r0 ×2": "#1baf7a", "r0 ×2, m_w ÷4": "#eda100"}
SHAPES = {"hand": "o", "final fit": "s", "r0 ×2": "^", "r0 ×2, m_w ÷4": "D"}
T = {s: tallo.load_targets()["species"][s]["control"]["T"] for s in ("beech", "oak")}


def rows(species, label, traits):
    for k, season in enumerate((60, 100, 150)):
        for trait, key in (("z_H", "talloH"), ("z_CR", "talloCR")):
            z = traits.get(f"stand.{key}.{k}")
            if z is not None:
                yield {"species": species, "series": label, "season": season, "trait": trait, "z": z}


def main(out):
    data = []
    for s in ("beech", "oak"):
        fit = json.load(open(FITS / f"{s}.json"))
        data += rows(s, "hand", fit["hand"]["traits"])
        data += rows(s, "final fit", fit["fit"]["traits"])
        probe = {c["label"]: c["traits"] for c in json.load(open(PROBES / f"{s}-r0mw.json"))["conditions"]}
        data += rows(s, "r0 ×2", probe["r0x2"])
        data += rows(s, "r0 ×2, m_w ÷4", probe["r0x2 mw/4"])
    df = pl.DataFrame(data).with_columns(
        pl.col("series").cast(pl.Enum(list(SERIES))), pl.col("trait").cast(pl.Enum(["z_H", "z_CR"])))
    p = (
        ggplot(df.to_pandas(), aes("season", "z", color="series", shape="series"))
        + geom_hline(yintercept=0, color="#c3c2b7", size=0.5)
        + geom_line(size=1)
        + geom_point(size=3, fill="white", stroke=1)
        + facet_grid("trait ~ species")
        + scale_color_manual(values=SERIES)
        + scale_shape_manual(values=SHAPES)
        + scale_x_continuous(breaks=[60, 100, 150])
        + labs(x="season", y="median z (0 at Tallo's median; ±1 at its 10/90% lines)", color="", shape="",
               title="Level 0: residuals against Tallo by season (hand and fit: seeds 101–110; probes: seeds 1–5)",
               caption=f"dashed: the gate's T (beech {T['beech']:.2f}, oak {T['oak']:.2f}; drawn at 0.85)")
        + geom_hline(yintercept=0.85, linetype="dashed", color="#7a7974", size=0.5)
        + geom_hline(yintercept=-0.85, linetype="dashed", color="#7a7974", size=0.5)
        + theme_minimal()
        + theme(figure_size=(9, 6.5), legend_position="top", panel_grid_minor=element_blank(),
                plot_title=element_text(size=10), plot_caption=element_text(size=8))
    )
    p.save(out, dpi=150, verbose=False)
    print(out)


if __name__ == "__main__":
    main(sys.argv[1])
