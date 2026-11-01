"""The garden's beeches before and after the round, drawn from the native runs of garden-gate.py
(review of the fresh-look beech, 2026-11-01). Each row is one garden world (forestParams at the
phone's plate, 54 cells, or the laptop's, 146), its columns before (the round's rules off) and after,
at 60 and 100 seasons, drawn by the round's harness (frontal, farther rows paler, leaves as dots).
A ▲ under the ground marks each planted beech's root, with its vigour gate g at that season.

    uv run --project analysis python docs/experiments/code/2026-11-01-fresh-look-beech/garden-figure.py \
        runs/fresh-look/garden docs/experiments/figures
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import polars as pl  # noqa: E402

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("render", HERE / "render.py")
render = importlib.util.module_from_spec(spec)
spec.loader.exec_module(render)
LO, HI = 3000.0, 10000.0


def load(out: Path, season: int):
    m = pl.read_csv(out / "metamers.csv", infer_schema_length=None).filter(pl.col("season") == season)
    b = pl.read_csv(out / "buds.csv", infer_schema_length=None).filter((pl.col("season") == season) & (pl.col("leaf") > 0))
    mt = pl.read_csv(out / "metrics.csv", infer_schema_length=None).filter(pl.col("season") == season)
    return m, b, mt


def figure(root: Path, stems: list[str], out: Path, title: str) -> None:
    cols = [("before", 60), ("after", 60), ("before", 100), ("after", 100)]
    width = json.loads((root / f"{stems[0]}.json").read_text())["world"]["width"]
    w = 2.2 if width < 100 else 4.2
    fig, axes = plt.subplots(len(stems), len(cols), figsize=(w * len(cols), 2.9 * len(stems)), squeeze=False)
    for r, stem in enumerate(stems):
        p = json.loads((root / f"{stem}.json").read_text())
        planted = len(p["trees"])
        for c, (which, season) in enumerate(cols):
            ax = axes[r][c]
            d = root / "off" / stem if which == "before" else root / stem
            m, b, mt = load(d, season)
            render.draw(ax, m, b, p["world"]["width"], True)
            ax.set_ylim(-14, 150)
            beech = mt.filter((pl.col("species") == "beech") & (pl.col("alive") == 1) & (pl.col("tree") < planted))
            for row in beech.iter_rows(named=True):
                g = min(1.0, max(0.0, (row["vBase"] - LO) / (HI - LO)))
                ax.annotate(f"▲ beech, g {g:.2f}", (row["rootX"], -2), ha="center", va="top", fontsize=6, color="#7a2e00")
            ax.set_title(f"{stem}: {which} at {season}", fontsize=7)
    fig.suptitle(title, fontsize=9)
    fig.savefig(out, dpi=90, bbox_inches="tight")
    plt.close(fig)
    print(out)


def main() -> None:
    root, figs = Path(sys.argv[1]), Path(sys.argv[2])
    figure(root, ["garden-w54-s2", "garden-w54-s3", "garden-w54-s12", "garden-w54-s13"],
           figs / "2026-11-01-fresh-look-beech-review-garden-phone.png",
           "The garden's phone plate (54 cells): the round's beech before and after")
    figure(root, ["garden-w146-s1", "garden-w146-s2", "garden-w146-s3", "garden-w146-s9", "garden-w146-s10"],
           figs / "2026-11-01-fresh-look-beech-review-garden-laptop.png",
           "The garden's laptop plate (146 cells): the round's beech before and after")


if __name__ == "__main__":
    main()
