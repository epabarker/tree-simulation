"""The cap's candidates side by side, one sheet at one scale: the fitted hornbeam flat, with k_shed 3,
with the acclimated leaf cost (c 0.3), with both rules relaxed; beech flat and with both. fitted-cap.py's
own sheets draw one case beside itself (its reference cell is the same run), so they cannot be compared.

    uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/compare-cap.py

writes docs/experiments/figures/2026-10-31-compare-cap-{60,100}.png from runs/fitted-cap/*/cells.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("cap", HERE / "cap.py")
cap = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cap)
grid, REPO, FIGURES = cap.grid, cap.REPO, cap.FIGURES

ROWS = [
    [("fitted", "hornbeam: flat (the pilot)"), ("fitted-kshed3", "hornbeam: kShed 3"),
     ("fitted-leaf0.3", "hornbeam: leaf cost c 0.3"), ("hornbeam-both", "hornbeam: c 0.3 + T_rel 0.025")],
    [("beech-flat", "beech: flat (round 2)"), ("beech-both", "beech: c 0.3 + T_rel 0.008")],
]


def main() -> None:
    cells = REPO / "runs" / "compare-cap"
    cells.mkdir(parents=True, exist_ok=True)
    for row in ROWS:
        for name, _ in row:
            link = cells / f"{name}.npz"
            link.unlink(missing_ok=True)
            link.symlink_to(REPO / "runs" / "fitted-cap" / name / "cells" / f"{name}.npz")
    (cells / "hand.npz").unlink(missing_ok=True)
    (cells / "hand.npz").symlink_to(cells / "fitted.npz")
    rows = [[(name, title, None) for name, title in row] for row in ROWS]
    for s in (60, 100):
        print(grid.draw_cells(s, rows, (f"the cap's candidates at season {s} (lone trees, seed 1; one scale)",
                                        "right of the first row: the flat hornbeam again, for reference"),
                              "", {}, cells, "compare-cap.py", FIGURES / f"2026-10-31-compare-cap-{s}.png",
                              ref_title="hornbeam: flat"))


if __name__ == "__main__":
    main()
