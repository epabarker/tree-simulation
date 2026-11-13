"""#124 round two: the season-100 contact sheet, HEAD / d12a13 / the finalists, seen from the front.

Draws each lone oak's wood (metamers.csv x0,y0 -> x1,y1, width by radius) and its shoot tips, on
one scale (the 60 m box's width, 0-50 m up). One PNG per four seeds, and one of all 20.

    uv run --project analysis python docs/experiments/code/2026-11-10-oak-round2/sheet100.py d16a13 d12a9
"""

import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import polars as pl  # noqa: E402
from matplotlib.collections import LineCollection  # noqa: E402

CELL = 0.25
OUT = Path("runs/oak-round2/sheet")


def snap(arm: str, seed: int) -> Path:
    if arm == "HEAD":
        return Path(f"runs/probe/oak124-sheet/head/lone-seed{seed}")
    if arm == "d12a13":
        return Path(f"runs/probe/oak124-sheet/patch/lone-seed{seed}")
    return Path(f"runs/oak-crown/{arm}/oak-s{seed}")


def draw(ax, arm: str, seed: int):
    m = pl.read_csv(snap(arm, seed) / "metamers.csv",
                    columns=["season", "tree", "birthId", "parentBirthId", "x0", "y0", "x1", "y1", "radius"]
                    ).filter((pl.col.season == 100) & (pl.col.tree == 0))
    x0 = m["x0"].to_numpy() * CELL - 30
    x1 = m["x1"].to_numpy() * CELL - 30
    y0 = m["y0"].to_numpy() * CELL
    y1 = m["y1"].to_numpy() * CELL
    r = m["radius"].to_numpy()
    tip = ~m["birthId"].is_in(m["parentBirthId"].implode()).to_numpy()
    ax.scatter(x1[tip], y1[tip], s=0.8, c="#3f8a2a", alpha=0.35, linewidths=0, rasterized=True, zorder=2)
    keep = r >= 0.08
    segs = np.stack([np.stack([x0[keep], y0[keep]], 1), np.stack([x1[keep], y1[keep]], 1)], 1)
    ax.add_collection(LineCollection(segs, linewidths=np.clip(r[keep] * 1.5, 0.15, 3), colors="#6b4a2b"))
    ax.set_xlim(-30, 30)
    ax.set_ylim(0, 40)
    ax.set_aspect("equal")
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_title(f"seed {seed} · {arm} · H {y1.max():.1f} m", fontsize=8)


def sheet(arms: list[str], seeds: list[int], path: Path):
    fig, axes = plt.subplots(len(seeds), len(arms), figsize=(3.2 * len(arms), 2.3 * len(seeds)), squeeze=False)
    for i, seed in enumerate(seeds):
        for j, arm in enumerate(arms):
            draw(axes[i][j], arm, seed)
    fig.suptitle("lone open-grown oak, season 100 (#124 round two; 60 m box, front view)", fontsize=9)
    fig.tight_layout()
    fig.savefig(path, dpi=110)
    plt.close(fig)
    print(path)


if __name__ == "__main__":
    arms = ["HEAD", "d12a13", *sys.argv[1:]]
    OUT.mkdir(parents=True, exist_ok=True)
    for k in range(0, 20, 4):
        sheet(arms, list(range(k + 1, k + 5)), OUT / f"seeds-{k + 1:02d}-{k + 4:02d}.png")
    sheet(arms, list(range(1, 21)), OUT / "all-20.png")
