"""Species round 5: the dome sweep, the knobs the form set leaves out, one at a time.

The grids rounded no broadleaf's top: beech's tables and the flat caps on hornbeam, oak and maple
look like one symptom, the leader lapsing abruptly. R2's ontogeny ramp (`r2.ramp`, the seasons over
which every λ falls by Δλ after a_c; r2.rs) is short and was never swept, nor the leader's sympodial
end (`levels.0.pTerm`), its generator, or how far the twigs sit below the limbs. For beech,
hornbeam, oak and maple, each knob alone, the rest at round 2's (FLORA), grown and drawn as the
form sweep (form-sweep.py: the lone trial's world, natively, seed 1, 60 and 100):

    r2.ramp                 1, 10, 25, 50
    r2.levels.0.pTerm       0, 0.1, 0.3, 0.5
    r2.levels.0.generator   distichous, spiral
    r2.levels.2.setPoint    levels.1.setPoint − 20, − 40 (floored at 0)

Red marks the cell at (or nearest) round 2's value.

    uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/dome-sweep.py beech [--workers 14] [--redraw]

writes docs/experiments/figures/2026-10-31-dome-sweep-<species>-<season>.png (half size, 64
colours; full resolution in runs/dome-sweep/<species>/sheet-<season>.png).
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import tomllib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("form_grid", HERE / "form-grid.py")
grid = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(grid)
sweep, REPO, FIGURES, Evaluator = grid.sweep, grid.REPO, grid.FIGURES, grid.Evaluator

SPECIES = ["beech", "hornbeam", "oak", "maple"]
SP1, SP2 = "r2.levels.1.setPoint", "r2.levels.2.setPoint"


def rows_for(hand: dict) -> list[tuple[str, str, list]]:
    """(path, short name, values) per row; the twig rows read the species' own level-1 set point."""
    return [
        ("r2.ramp", "ramp", [1, 10, 25, 50]),
        ("r2.levels.0.pTerm", "pTerm0", [0, 0.1, 0.3, 0.5]),
        ("r2.levels.0.generator", "gen0", ["distichous", "spiral"]),
        (SP2, "sp2", [round(max(0.0, hand[SP1] - d), 2) for d in (20, 40)]),
    ]


def nearest(vs: list, v) -> int | None:
    """The cell at round 2's value, or the nearest; none for a generator outside the row (maple's
    is opposite)."""
    if v in vs:
        return vs.index(v)
    return None if isinstance(v, str) else min(range(len(vs)), key=lambda i: abs(vs[i] - v))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("species", choices=SPECIES)
    ap.add_argument("--workers", type=int, default=14)
    ap.add_argument("--redraw", action="store_true")
    args = ap.parse_args()
    sp = args.species
    spec = tomllib.loads((REPO / "analysis" / "fit" / "targets" / f"{sp}.toml").read_text())
    brief = {t["name"]: t for t in [*spec["trait"], *spec.get("report", [])]
             if t["kind"] == "described" and t["name"].startswith("lone.")}
    cells = REPO / "runs" / "dome-sweep" / sp
    cells.mkdir(parents=True, exist_ok=True)
    fixed = spec.get("fixed", {})
    ev = Evaluator()
    try:
        hand = ev.ask({"describe": sp, "paths": ["r2.ramp", "r2.levels.0.pTerm", "r2.levels.0.generator", SP1, SP2]})["values"]
        knobs = rows_for(hand)
        jobs = {"hand": ev.ask({"amend": sp, "assign": dict(fixed)})["patch"]}
        for r, (path, _, vs) in enumerate(knobs):
            for c, v in enumerate(vs):
                jobs[f"{r}-{c}"] = ev.ask({"amend": sp, "assign": {**fixed, path: v}})["patch"]
    finally:
        ev.close()
    if not args.redraw:
        subprocess.run(["cargo", "build", "--release", "--quiet", "--locked", "-p", "treesim",
                        "--target-dir", str(REPO / "rust" / "target" / "native")],
                       cwd=REPO / "rust", check=True)
        with ThreadPoolExecutor(args.workers) as pool:
            list(pool.map(lambda kv: sweep.run_cell(sp, kv[1], cells / f"{kv[0]}.npz"), jobs.items()))
        (cells / "grid.json").write_text(json.dumps({"knobs": knobs, "hand": hand}, indent=1))
    rows = []
    for r, (path, short, vs) in enumerate(knobs):
        near = nearest(vs, hand[path])
        rows.append([(f"{r}-{c}", f"{short} = {v}", ["round 2's"] if c == near and path != SP2 else None)
                     for c, v in enumerate(vs)])
    ref = "round 2's:\n" + "\n".join(f"{short} {hand[p]}" for p, short, _ in knobs) + f"\nsp1 {hand[SP1]}"
    command = f"uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/dome-sweep.py {sp}"
    for s in sweep.SEASONS:
        head = (f"{sp}: the dome sweep at season {s} (lone tree, seed 1; one knob at a time, the rest at round 2's)",
                "red: the cell at (or nearest) round 2's value; sp2 rows sit 20 and 40 below sp1 (floored at 0)")
        out = FIGURES / f"2026-10-31-dome-sweep-{sp}-{s}.png"
        print(grid.draw_cells(s, rows, head, ref, brief, cells, command, out))


if __name__ == "__main__":
    main()
