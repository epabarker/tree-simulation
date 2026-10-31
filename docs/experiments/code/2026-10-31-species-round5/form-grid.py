"""Species round 5, §3.2's second page: the three-knob grid on the knobs the user named, and the posture sweep.

For one species, the grid's knobs (GRIDS, the user's after the form-sweep review,
docs/experiments/2026-10-31-form-sweep-review.md) at evenly spaced values, every combination; the
other form knobs and the physiology at round 2's (FLORA). The cells are grown and drawn as the form
sweep's (form-sweep.py: the lone trial's world, natively, seed 1, a snapshot at 60 and the end at
100, each reduced to an npz). The cells the review named nearest the brief, each a single-knob cell
of the sweep, are marked in red at the grid cell nearest them (each knob over its grid's span; the
knobs a review cell leaves out at round 2's).

One PNG per season. A grid of three knobs is a block of rows per value of the third, a row per value
of the first, a column per value of the second; the round-2 tree on the right of the first row. A
one-knob sweep (--posture: `r2.levels.1.postureSetPoint` at 20, 43, 67, 90) is one row.

    uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/form-grid.py beech [--posture] [--workers 12] [--redraw]

writes docs/experiments/figures/2026-10-31-form-{grid,posture}-<species>-<season>.png (half size,
64 colours; full resolution in runs/form-{grid,posture}/<species>/sheet-<season>.png).
"""

from __future__ import annotations

import argparse
import importlib.util
import itertools
import json
import math
import subprocess
import sys
import tomllib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("form_sweep", HERE / "form-sweep.py")
sweep = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sweep)
REPO, FIGURES, WIDTH = sweep.REPO, sweep.FIGURES, sweep.WIDTH
sys.path.insert(0, str(REPO / "analysis"))
from treesim.fit import Evaluator  # noqa: E402

POSTURE = "r2.levels.1.postureSetPoint"

#: The grids as the user set them (2026-10-31): (path, lo, hi, steps), first × second × third.
#: Beech is not the review's grid: the user read aC 27–40, kappa 1.3–2.7 and dLambda 0 as spruces;
#: the dome needs a leader kept for 20–40 seasons and then lapsing, which only the combination shows.
#: Hornbeam's aC is 13–25: 13 read as pyramidal with a flaring base, 27 as too narrow.
GRIDS = {
    "beech": [("r2.aC", 20, 40, 4), ("r2.dLambda", 0.02, 0.06, 4), ("r2.kappa", 0, 2, 3)],
    "birch": [("r2.levels.0.lambda", 0.55, 0.59, 4), ("r2.levels.1.lambda", 0.49, 0.55, 4),
              (POSTURE, 50, 75, 3)],
    "oak": [("r2.aC", 20, 40, 4), ("r2.dLambda", 0.04, 0.10, 4), ("r2.kappa", 0, 1.5, 3)],
    "hornbeam": [("r2.aC", 13, 25, 4), ("r2.dLambda", 0.04, 0.10, 4),
                 ("r2.levels.0.lambda", 0.56, 0.60, 3)],
    "willow": [("r2.levels.1.lambda", 0.48, 0.52, 4), ("r2.levels.1.setPoint", 60, 90, 4),
               ("r2.levels.2.setPoint", 54, 120, 3)],
    "rowan": [("r2.aC", 20, 40, 4), ("r2.dLambda", 0, 0.04, 4), ("r2.levels.1.setPoint", 15, 40, 3)],
    "holly": [("r2.levels.0.lambda", 0.52, 0.56, 4), ("r2.dLambda", 0.01, 0.04, 4),
              ("r2.levels.1.setPoint", 20, 62, 3)],
    "maple": [("r2.aC", 5, 20, 4), ("r2.dLambda", 0.04, 0.08, 4),
              ("r2.levels.0.lambda", 0.55, 0.60, 3)],
}
#: The posture sweep (birch and oak): the tenth form knob alone, the rest at round 2's.
POSTURE_SWEEP = [(POSTURE, 20, 90, 4)]

#: The sweep cells the review named nearest each brief (its "rows that change the kind"), as
#: single-knob assignments; {} is round 2 itself (holly: "already a cone").
NAMED = {
    "beech": [({"r2.dLambda": 0}, "dΛ 0"), ({"r2.kappa": 1.333}, "κ 1.33"),
              ({"r2.aC": 26.67}, "aC 26.7"), ({"r2.aC": 40}, "aC 40")],
    "birch": [({"r2.levels.0.lambda": 0.5667}, "λ0 0.567")],
    "oak": [({"r2.dLambda": 0.08}, "dΛ 0.08"), ({"r2.aC": 40}, "aC 40")],
    "hornbeam": [({"r2.aC": 13.33}, "aC 13.3"), ({"r2.levels.0.lambda": 0.6}, "λ0 0.60")],
    "willow": [({"r2.levels.1.lambda": 0.48}, "λ1 0.48")],
    "rowan": [({"r2.dLambda": 0}, "dΛ 0"), ({"r2.aC": 40}, "aC 40")],
    "holly": [({}, "round 2")],
    "maple": [({"r2.aC": 13.33}, "aC 13.3")],
}
SHORT = {"r2.aC": "aC", "r2.dLambda": "dΛ", "r2.kappa": "κ", "r2.levels.0.lambda": "λ0",
         "r2.levels.1.lambda": "λ1", "r2.levels.1.setPoint": "sp1", "r2.levels.2.setPoint": "sp2",
         POSTURE: "post1"}


def values(lo: float, hi: float, n: int) -> list[float]:
    return [float(f"{v:.4g}") for v in np.linspace(lo, hi, n)]


def marks(knobs: list[tuple[str, list[float]]], hand: dict, named: list) -> dict[tuple, list[str]]:
    """Each named sweep cell → the grid cell nearest it, each knob scaled to its grid's span."""
    out: dict[tuple, list[str]] = {}
    for assign, label in named:
        point = [assign.get(p, hand[p]) for p, _ in knobs]
        best = min(
            itertools.product(*[range(len(vs)) for _, vs in knobs]),
            key=lambda ix: sum(((vs[i] - x) / (vs[-1] - vs[0])) ** 2
                               for (_, vs), i, x in zip(knobs, ix, point, strict=True)),
        )
        out.setdefault(best, []).append(label)
    return out


def layout(knobs: list[tuple[str, list[float]]]) -> list[list[tuple]]:
    """Rows of cell indices: three knobs → (third, first) rows × second columns; one → one row."""
    if len(knobs) == 1:
        return [[(c,) for c in range(len(knobs[0][1]))]]
    n1, n2, n3 = (len(vs) for _, vs in knobs)
    return [[(a, b, c) for b in range(n2)] for c in range(n3) for a in range(n1)]


def key(ix: tuple) -> str:
    return "-".join(map(str, ix))


def draw_sheet(species: str, season: int, knobs, hand: dict, marked: dict, brief: dict, cells: Path,
               kind: str, command: str) -> Path:
    rows = [[(key(ix), "  ".join(f"{SHORT[p]} {vs[i]:g}" for (p, vs), i in zip(knobs, ix, strict=True)),
              marked.get(ix)) for ix in row] for row in layout(knobs)]
    span = " × ".join(f"{SHORT[p]} {vs[0]:g}–{vs[-1]:g} ({len(vs)})" for p, vs in knobs)
    what = "the posture sweep" if kind == "posture" else "the three-knob grid"
    head = (f"{species}: {what} at season {season} (lone tree, seed 1; {span}; the rest at round 2's)",
            "red: nearest a sweep cell the review named nearest the brief")
    ref = "round 2's:\n" + "\n".join(f"{SHORT[p]} {hand[p] if hand[p] is not None else '= sp1'}" for p, _ in knobs)
    out = FIGURES / f"2026-10-31-form-{kind}-{species}-{season}.png"
    return draw_cells(season, rows, head, ref, brief, cells, command, out)


def draw_cells(season: int, rows: list[list[tuple[str, str, list[str] | None]]], head: tuple[str, str],
               ref: str, brief: dict, cells: Path, command: str, out: Path,
               ref_title: str | None = "round 2 (adopted)") -> Path:
    """The sheet: rows of (npz key, title, red label or None), the round-2 cell ("hand") at the right
    of the first row with `ref` under it (none when `ref_title` is None); every cell at one scale, as
    the form sweep's."""
    data = {k: np.load(cells / f"{k}.npz") for row in rows for k, _, _ in row}
    if ref_title is not None:
        data["hand"] = np.load(cells / "hand.npz")
    segs = [d[f"seg{season}"] for d in data.values() if len(d[f"seg{season}"])]
    tall = max([60.0] + [math.ceil(float(np.max(s[:, [1, 3]])) / 20) * 20 + 5 for s in segs])
    half = max([30.0] + [float(np.max(np.abs(s[:, [0, 2]] - WIDTH / 2))) + 4 for s in segs])
    cols, nrows = max(len(row) for row in rows) + (ref_title is not None), len(rows)
    cell_w = 2.3
    cell_h = cell_w * tall / (2 * half)
    head_in = 1.1
    fig = plt.figure(figsize=(cols * cell_w, nrows * (cell_h + 0.95) + head_in), dpi=160)
    top = 1 - head_in / fig.get_figheight()
    row_h = (top - 0.005) / nrows
    tree_h = row_h * cell_h / (cell_h + 0.95)
    scale = tree_h * fig.get_figheight() * 72 / tall
    brief_text = "  ·  ".join(f"{k} {v['target']}±{v['band']}" for k, v in brief.items() if "target" in v)
    fig.suptitle(f"{head[0]}\nbrief (described): {brief_text or 'none'}\n{head[1]}\n{command}",
                 fontsize=8.5, y=0.999, va="top")

    def cell(r: int, c: int, name: str, title: str, label: str | None) -> None:
        d = data[name]
        left = c / cols
        y0 = top - (r + 1) * row_h
        ax = fig.add_axes((left + 0.004, y0 + row_h - tree_h, 1 / cols - 0.008, tree_h))
        sweep.draw_tree(ax, d[f"seg{season}"], d[f"leaf{season}"], scale)
        ax.set_xlim(WIDTH / 2 - half, WIDTH / 2 + half)
        ax.set_ylim(0, tall)
        ax.set_aspect("equal", adjustable="box")
        ax.set_xticks([])
        ax.set_yticks([])
        ax.axhline(0, color="#8a7a60", lw=1)
        hot = label is not None
        for side in ax.spines.values():
            side.set_color("#c33" if hot else "#ccc")
            side.set_linewidth(1.6 if hot else 0.6)
        ax.set_title(title, fontsize=7.5, pad=2, color="#c33" if hot else "black")
        px = fig.add_axes((left + 0.012, y0 + 0.30 * (row_h - tree_h), 0.33 / cols, 0.62 * (row_h - tree_h)))
        k = np.arange(10)
        px.barh(k, d[f"profile{season}"], height=0.8, color=sweep.LEAF, alpha=0.7)
        if "profile" in brief.get("lone.profile", {}):
            px.plot(np.minimum(brief["lone.profile"]["profile"], 1.05), k, color=sweep.BRIEF, lw=1)
        px.set_xlim(0, 1.05)
        px.set_ylim(-0.6, 9.6)
        px.axis("off")
        elev, spread, fork, dom, h = d[f"shape{season}"]
        f = sweep.fmt
        text = (f"elev {f(elev, 0)}°  W/H {f(spread, 2)}\nfork {f(fork, 2)}  dom {f(dom, 1)}\nH {f(h, 0)}"
                + (f"\n◆ {', '.join(label)}" if hot else ""))
        fig.text(left + 0.38 / cols, y0 + 0.62 * (row_h - tree_h), text, fontsize=6.5, va="center",
                 family="monospace", color="#c33" if hot else "black")

    for r, row in enumerate(rows):
        for c, (k, title, label) in enumerate(row):
            cell(r, c, k, title, label)
    if ref_title is not None:
        cell(0, cols - 1, "hand", ref_title, None)
        fig.text((cols - 1) / cols + 0.01, top - 1.15 * row_h,
                 ref + "\n\nprofile: base to top;\ngrey, the brief's.", fontsize=7, va="top", family="monospace")
    full = cells / f"sheet-{season}.png"
    fig.savefig(full)
    plt.close(fig)
    im = Image.open(full).convert("RGB")
    im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    im.quantize(colors=64, method=Image.Quantize.MEDIANCUT).save(out, optimize=True)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("species")
    ap.add_argument("--posture", action="store_true", help="the posture sweep instead of the grid")
    ap.add_argument("--workers", type=int, default=12)
    ap.add_argument("--redraw", action="store_true")
    args = ap.parse_args()
    sp, kind = args.species, "posture" if args.posture else "grid"
    knobs = [(p, values(lo, hi, n)) for p, lo, hi, n in (POSTURE_SWEEP if args.posture else GRIDS[sp])]
    spec = tomllib.loads((REPO / "analysis" / "fit" / "targets" / f"{sp}.toml").read_text())
    brief = {t["name"]: t for t in [*spec["trait"], *spec.get("report", [])]
             if t["kind"] == "described" and t["name"].startswith("lone.")}
    cells = REPO / "runs" / f"form-{kind}" / sp
    cells.mkdir(parents=True, exist_ok=True)
    fixed = spec.get("fixed", {})
    ev = Evaluator()
    try:
        hand = ev.ask({"describe": sp, "paths": [p for p, _ in knobs]})["values"]
        jobs = {"hand": ev.ask({"amend": sp, "assign": dict(fixed)})["patch"]}
        for ix in itertools.product(*[range(len(vs)) for _, vs in knobs]):
            assign = {p: vs[i] for (p, vs), i in zip(knobs, ix, strict=True)}
            jobs[key(ix)] = ev.ask({"amend": sp, "assign": {**fixed, **assign}})["patch"]
    finally:
        ev.close()
    # A knob the species leaves unset (postureSetPoint follows the level's setPoint) is placed by it.
    place = {p: hand[p] if hand[p] is not None else hand.get("r2.levels.1.setPoint", 0) for p, _ in knobs}
    marked = {} if args.posture else marks(knobs, place, NAMED[sp])
    if not args.redraw:
        subprocess.run(["cargo", "build", "--release", "--quiet", "--locked", "-p", "treesim",
                        "--target-dir", str(REPO / "rust" / "target" / "native")],
                       cwd=REPO / "rust", check=True)
        with ThreadPoolExecutor(args.workers) as pool:
            list(pool.map(lambda kv: sweep.run_cell(sp, kv[1], cells / f"{kv[0]}.npz"), jobs.items()))
        (cells / "grid.json").write_text(json.dumps({"knobs": knobs, "hand": hand}, indent=1))
    command = (f"uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/"
               f"form-grid.py {sp}{' --posture' if args.posture else ''}")
    for s in sweep.SEASONS:
        print(draw_sheet(sp, s, knobs, hand, marked, brief, cells, kind, command))


if __name__ == "__main__":
    main()
