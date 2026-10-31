"""Species round 5: the user's form picks regrown at seeds 1–3, beside round 2's at the same seeds.

Each pick (PICKS: a grid cell's assignments, with the user's date and flag) is grown as the form
sweep's cells (the lone trial's world, natively, 60 and 100) at seeds 1, 2 and 3, and so is round 2's
form, so that a change of kind across seeds shows against the reference's own. One sheet per
species and season: the pick's row, then round 2's.

    uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/form-picks.py hornbeam [--workers 14] [--redraw]

writes docs/experiments/figures/2026-10-31-form-picks-<species>-<season>.png (full resolution in
runs/form-picks/<species>/sheet-<season>.png).
"""

from __future__ import annotations

import argparse
import importlib.util
import subprocess
import tomllib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("form_grid", HERE / "form-grid.py")
grid = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(grid)
sweep, REPO, FIGURES, Evaluator = grid.sweep, grid.REPO, grid.FIGURES, grid.Evaluator

SEEDS = (1, 2, 3)
#: The user's picks (2026-10-31): grid cell → assignments over round 2's form, and a flag.
#: Beech stays at round 2's form (the grids hold no dome; the next question is the core).
PICKS = {
    "beech": ({}, "round 2's form, flagged: no dome in the grids or the dome sweep"),
    "hornbeam": ({"r2.aC": 15, "r2.dLambda": 0.08, "r2.levels.0.lambda": 0.56},
                 "provisional: aC 15 / dΛ 0.08 / λ0 0.56"),
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("species", choices=sorted(PICKS))
    ap.add_argument("--workers", type=int, default=14)
    ap.add_argument("--redraw", action="store_true")
    args = ap.parse_args()
    sp = args.species
    pick, flag = PICKS[sp]
    spec = tomllib.loads((REPO / "analysis" / "fit" / "targets" / f"{sp}.toml").read_text())
    brief = {t["name"]: t for t in [*spec["trait"], *spec.get("report", [])]
             if t["kind"] == "described" and t["name"].startswith("lone.")}
    cells = REPO / "runs" / "form-picks" / sp
    cells.mkdir(parents=True, exist_ok=True)
    fixed = spec.get("fixed", {})
    ev = Evaluator()
    try:
        patches = {"pick": ev.ask({"amend": sp, "assign": {**fixed, **pick}})["patch"],
                   "round2": ev.ask({"amend": sp, "assign": dict(fixed)})["patch"]}
    finally:
        ev.close()
    jobs = {f"{name}-{s}": (patch, s) for name, patch in patches.items() for s in SEEDS}
    if not args.redraw:
        subprocess.run(["cargo", "build", "--release", "--quiet", "--locked", "-p", "treesim",
                        "--target-dir", str(REPO / "rust" / "target" / "native")],
                       cwd=REPO / "rust", check=True)
        with ThreadPoolExecutor(args.workers) as pool:
            list(pool.map(lambda kv: sweep.run_cell(sp, kv[1][0], cells / f"{kv[0]}.npz", kv[1][1]),
                          jobs.items()))
    # The sheet's reference cell is round 2's at seed 1 (also the second row's first cell).
    (cells / "hand.npz").unlink(missing_ok=True)
    (cells / "hand.npz").symlink_to(cells / "round2-1.npz")
    rows = [[(f"{name}-{s}", f"{label}, seed {s}", None) for s in SEEDS]
            for name, label in (("pick", "pick"), ("round2", "round 2"))]
    ref = "the pick:\n" + ("\n".join(f"{grid.SHORT.get(p, p)} {v}" for p, v in pick.items()) or "round 2's")
    command = f"uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/form-picks.py {sp}"
    for s in sweep.SEASONS:
        head = (f"{sp}: the form pick at seeds 1–3, season {s} (lone tree; round 2's form below)", flag)
        out = FIGURES / f"2026-10-31-form-picks-{sp}-{s}.png"
        print(grid.draw_cells(s, rows, head, ref, brief, cells, command, out))


if __name__ == "__main__":
    main()
