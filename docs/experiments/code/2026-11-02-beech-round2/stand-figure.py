"""Round 2, Part 2: the beech stand at 100 with the leaf below each tree's limb crown base marked
(orange), today's beech beside the accepted build, seeds 1–3 (the dev seeds), drawn by the fresh-
look harness (render.py). Prints the low leaf's light against the tree's top light (C5's Q_top:
the 90th percentile of its leafy buds' q) beside beech's T_rel 0.008.

    uv run --project analysis python docs/experiments/code/2026-11-02-beech-round2/stand-figure.py \
        runs/fresh-look/evidence20-today runs/fresh-look/evidence20-repair-notvig \
        docs/experiments/figures/2026-11-02-beech-round2-stand-low-leaf.png
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import polars as pl  # noqa: E402

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("render", HERE.parent / "2026-11-01-fresh-look-beech" / "render.py")
render = importlib.util.module_from_spec(spec)
spec.loader.exec_module(render)
SEEDS = (1, 2, 3)


def main() -> None:
    today, accepted, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    fig, axes = plt.subplots(2, len(SEEDS), figsize=(5.2 * len(SEEDS), 2 * 5.6))
    ratios = {}
    for r, (label, d) in enumerate((("today", today), ("accepted", accepted))):
        rs = []
        for c, s in enumerate(SEEDS):
            m, b, mt, _, _ = render.load(d / f"stand-{s}", 100)
            ax = axes[r][c]
            render.draw(ax, m, b, render.STAND_W, True)
            ax.set_ylim(0, 160)
            tips = m.select("x1", "y1").to_numpy()
            tree = m["tree"].to_numpy()
            first = {}
            for i, t in enumerate(tree):
                first.setdefault(int(t), i)
            base = dict(zip(mt["tree"].to_list(), mt["limbBase"].to_list()))
            alive = dict(zip(mt["tree"].to_list(), mt["alive"].to_list()))
            qtop = {int(t): float(g["q"].quantile(0.9)) for (t,), g in b.group_by(["tree"])}
            pts = []
            for t, k, y, q in zip(b["tree"].to_list(), b["metamer"].to_list(), b["y"].to_list(), b["q"].to_list()):
                if alive.get(t) == 1 and y < base[t]:
                    pts.append(tips[first[t] + k])
                    rs.append(q / qtop[t] if qtop[t] else np.nan)
            if pts:
                p = np.array(pts)
                ax.scatter(p[:, 0], p[:, 1], s=5, c="#e07000", zorder=4, linewidths=0)
            ax.set_title(f"{label}, seed {s}: leaf below the limb crown base in orange", fontsize=8)
        ratios[label] = np.array(rs)
    fig.suptitle("The beech stand at 100 (84 wide, 12 trees): where the low leaf sits", fontsize=10)
    fig.savefig(out, dpi=80, bbox_inches="tight")
    print(out)
    for k, v in ratios.items():
        v = v[np.isfinite(v)]
        print(f"{k}: low leaf q / Q_top median {np.median(v):.3f}, p10 {np.quantile(v, 0.1):.3f}, "
              f"share below 0.02: {(v < 0.02).mean():.2f} (T_rel 0.008)")


if __name__ == "__main__":
    main()
