"""Species round 5, §3.2 as the user ordered it: the form sheet's first page, a one-at-a-time sweep.

For one species, each of the nine form knobs (FORM) at four values spanning its range in the targets
file (`[[formRange]]`, round 4's search bounds; on the log scale where the range asks for it), the other eight at round 2's adopted value
(FLORA), physiology at round 2's: one lone tree per cell at seed 1, natively (`treesim --preset
oakOpen`, the lone trial's world: 160 wide, the woods' top, one tree at x 80), run to 100 with a
snapshot at 60. The round-2 tree at its own values is the reference cell. Each run is reduced to its
skeleton, leaves and shape numbers (runs/form-sweep/<species>/*.npz) and its CSVs deleted.

One PNG per season: a 9 × 4 sheet, a row per knob, the round-2 tree at the right of the first row.
Every cell is drawn at one scale (cells), frontal (x against height; depth is not drawn), wood width
by pipe radius, leaves as points at their buds; under each, the crown's width profile in ten bands
(the brief's described profile in grey where the targets file has one), then limbElevation, the
lone spread (W/H), forkHeight and leaderDominance.

    uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/form-sweep.py beech [--workers 12] [--redraw]

writes docs/experiments/figures/2026-10-31-form-sweep-<species>-<season>.png (half size, 64 colours;
full resolution in runs/form-sweep/<species>/sheet-<season>.png). --redraw draws from the npz files
without running anything.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
import tomllib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import polars as pl
from matplotlib.collections import LineCollection
from PIL import Image

REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO / "analysis"))
from treesim.fit import Evaluator  # noqa: E402

#: The nine form knobs (the round-5 plan, §1), held by hand in round 5.
FORM = [
    "r2.levels.0.lambda",
    "r2.levels.1.lambda",
    "r2.levels.1.setPoint",
    "r2.levels.1.branchAngle",
    "r2.levels.1.eta",
    "r2.levels.2.setPoint",
    "r2.aC",
    "r2.dLambda",
    "r2.kappa",
]
SEASONS = (60, 100)
STEPS = 4
#: The lone trial's world (cli/trials.ts loneParams): 160 wide, the woods' top (TOP), no walls.
WIDTH, TOP = 160, 200
TREESIM = REPO / "rust" / "target" / "native" / "release" / "treesim"
FIGURES = REPO / "docs" / "experiments" / "figures"
#: Wood and leaf colours: the scene's light-theme bark and leaf (src/web/render/scene.css).
WOOD, LEAF, BRIEF = "#5b4636", "#4f7a3a", "#9a9a9a"


def knob_values(p: dict) -> list[float]:
    """STEPS values from the bound's low end to its high end, evenly on its (log) scale, 4 s.f."""
    lo, hi = p["lo"], p["hi"]
    us = np.linspace(0, 1, STEPS)
    if p.get("log"):
        vs = [math.exp(math.log(lo) + u * (math.log(hi) - math.log(lo))) for u in us]
    else:
        vs = [lo + u * (hi - lo) for u in us]
    return [float(f"{v:.4g}") for v in vs]


def run_cell(species: str, patch: dict, out: Path) -> None:
    """One lone tree to 100 at seed 1, reduced to out (.npz); its raw files deleted."""
    raw = out.with_suffix("")
    params = {
        "world": {"width": WIDTH, "height": TOP, "walls": []},
        "trees": [{"x": WIDTH / 2, "species": species}],
        "species": {species: patch},
    }
    raw.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [str(TREESIM), "--preset", "oakOpen", "--params", "-", "--seed", "1", "--seasons", "100",
         "--snapshots", "60", "--light", "--quiet", "--out", str(raw)],
        input=json.dumps(params), text=True, check=True,
    )
    m = pl.read_csv(raw / "metamers.csv", infer_schema_length=None).filter(pl.col("tree") == 0)
    b = pl.read_csv(raw / "buds.csv").filter((pl.col("tree") == 0) & (pl.col("leaf") > 0))
    f = pl.read_csv(raw / "form.csv", infer_schema_length=None)
    mt = pl.read_csv(raw / "metrics.csv", infer_schema_length=None).filter(pl.col("tree") == 0)
    arrays: dict[str, np.ndarray] = {}
    for s in SEASONS:
        ms = m.filter(pl.col("season") == s)
        seg = ms.select("x0", "y0", "x1", "y1", "radius").to_numpy()
        bs = b.filter(pl.col("season") == s)
        idx = bs["metamer"].to_numpy()
        tips = seg[idx][:, 2:4] if len(idx) else np.zeros((0, 2))
        arrays[f"seg{s}"] = seg
        arrays[f"leaf{s}"] = np.column_stack([tips, bs["leaf"].to_numpy()]) if len(idx) else np.zeros((0, 3))
        fs = f.filter(pl.col("season") == s)
        row = mt.filter(pl.col("season") == s)
        if fs.height == 0 or row.height == 0:
            arrays[f"shape{s}"] = np.full(5, np.nan)
            arrays[f"profile{s}"] = np.zeros(10)
            continue
        h = float(row["height"][0])
        spread = max(float(row["crownWidth"][0]), float(row["crownDepth"][0])) / h if h > 0 else 0.0
        arrays[f"shape{s}"] = np.array([
            float(fs["limbElevation"][0]), spread, float(fs["forkHeight"][0]),
            float(fs["leaderDominance"][0]), h,
        ])
        arrays[f"profile{s}"] = np.array([float(fs[f"p{k}"][0]) for k in range(10)])
    np.savez_compressed(out, **arrays)
    shutil.rmtree(raw)


def draw_tree(ax, seg: np.ndarray, leaf: np.ndarray, scale: float) -> None:
    if len(seg):
        lines = np.stack([seg[:, 0:2], seg[:, 2:4]], axis=1)
        # Pipe radius in cells to points at the sheet's scale, floored so twigs stay visible.
        widths = np.maximum(0.25, seg[:, 4] * 2 * scale)
        ax.add_collection(LineCollection(lines, linewidths=widths, colors=WOOD, capstyle="round"))
    if len(leaf):
        ax.scatter(leaf[:, 0], leaf[:, 1], s=np.clip(leaf[:, 2], 0.2, 4) * 0.25, c=LEAF, alpha=0.3,
                   linewidths=0, zorder=3)


def fmt(v: float, d: int) -> str:
    return "–" if not np.isfinite(v) else f"{v:.{d}f}"


def draw_sheet(species: str, season: int, grid: dict, hand: dict, brief: dict, cells: Path,
               command: str) -> Path:
    data = {k: np.load(cells / f"{k}.npz") for k in [*grid_keys(grid), "hand"]}
    tall = max(float(np.nanmax(d[f"seg{season}"][:, [1, 3]])) if len(d[f"seg{season}"]) else 0
               for d in data.values())
    tall = max(60.0, math.ceil(tall / 20) * 20 + 5)
    xs = [d[f"seg{season}"][:, [0, 2]] for d in data.values() if len(d[f"seg{season}"])]
    half = max(30.0, max(float(np.max(np.abs(x - WIDTH / 2))) for x in xs) + 4)
    cols, rows = STEPS + 1, len(FORM)
    cell_w = 2.3
    cell_h = cell_w * tall / (2 * half)
    fig = plt.figure(figsize=(cols * cell_w, rows * (cell_h + 0.95) + 0.9), dpi=160)
    top = 1 - 0.9 / fig.get_figheight()
    row_h = (top - 0.005) / rows
    tree_h = row_h * cell_h / (cell_h + 0.95)
    # Points per cell at this scale: the axes' height in points over its height in cells.
    scale = tree_h * fig.get_figheight() * 72 / tall
    brief_text = "  ·  ".join(
        f"{k} {v['target']}±{v['band']}" for k, v in brief.items() if "target" in v
    )
    fig.suptitle(
        f"{species}: the form sweep at season {season} (lone tree, seed 1; one knob at a time, the "
        f"rest at round 2's)\nbrief (described): {brief_text or 'none'}\n{command}",
        fontsize=8.5, y=0.999, va="top",
    )

    def cell(r: int, c: int, key: str, title: str, highlight: bool) -> None:
        d = data[key]
        left = c / cols
        y0 = top - (r + 1) * row_h
        ax = fig.add_axes((left + 0.004, y0 + row_h - tree_h, 1 / cols - 0.008, tree_h))
        draw_tree(ax, d[f"seg{season}"], d[f"leaf{season}"], scale)
        ax.set_xlim(WIDTH / 2 - half, WIDTH / 2 + half)
        ax.set_ylim(0, tall)
        ax.set_aspect("equal", adjustable="box")
        ax.set_xticks([])
        ax.set_yticks([])
        ax.axhline(0, color="#8a7a60", lw=1)
        for side in ax.spines.values():
            side.set_color("#c33" if highlight else "#ccc")
            side.set_linewidth(1.4 if highlight else 0.6)
        ax.set_title(title, fontsize=7.5, pad=2, color="#c33" if highlight else "black")
        # The profile: ten bands base to top, each a bar of the band's width over the widest.
        px = fig.add_axes((left + 0.012, y0 + 0.30 * (row_h - tree_h), 0.33 / cols, 0.62 * (row_h - tree_h)))
        prof = d[f"profile{season}"]
        k = np.arange(10)
        px.barh(k, prof, height=0.8, color=LEAF, alpha=0.7)
        if "profile" in brief.get("lone.profile", {}):
            px.plot(np.minimum(brief["lone.profile"]["profile"], 1.05), k, color=BRIEF, lw=1)
        px.set_xlim(0, 1.05)
        px.set_ylim(-0.6, 9.6)
        px.axis("off")
        elev, spread, fork, dom, h = d[f"shape{season}"]
        fig.text(left + 0.38 / cols, y0 + 0.62 * (row_h - tree_h),
                 f"elev {fmt(elev, 0)}°  W/H {fmt(spread, 2)}\nfork {fmt(fork, 2)}  dom {fmt(dom, 1)}\nH {fmt(h, 0)}",
                 fontsize=6.5, va="center", family="monospace")

    for r, path in enumerate(FORM):
        for c, v in enumerate(grid[path]):
            near = min(grid[path], key=lambda x: abs(x - hand[path]))
            cell(r, c, f"{r}-{c}", f"{path.removeprefix('r2.')} = {v:g}", v == near)
    cell(0, STEPS, "hand", "round 2 (adopted)", False)
    # The round-2 values, for every row, under the reference cell.
    fig.text(STEPS / cols + 0.01, top - 1.15 * row_h,
             "round 2's form:\n" + "\n".join(f"{p.removeprefix('r2.')} {hand[p]:.4g}" for p in FORM)
             + "\n\nred: the step nearest round 2's.\nprofile: base to top;\ngrey, the brief's.",
             fontsize=7, va="top", family="monospace")
    # Full resolution beside the cells (runs/, not committed); the committed copy at half the size
    # in 64 colours (≈ 0.45 MB against 3–5 MB).
    full = cells / f"sheet-{season}.png"
    fig.savefig(full)
    plt.close(fig)
    im = Image.open(full).convert("RGB")
    im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    out = FIGURES / f"2026-10-31-form-sweep-{species}-{season}.png"
    im.quantize(colors=64, method=Image.Quantize.MEDIANCUT).save(out, optimize=True)
    return out


def grid_keys(grid: dict) -> list[str]:
    return [f"{r}-{c}" for r, path in enumerate(FORM) for c in range(len(grid[path]))]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("species")
    ap.add_argument("--workers", type=int, default=12)
    ap.add_argument("--redraw", action="store_true")
    args = ap.parse_args()
    sp = args.species
    spec = tomllib.loads((REPO / "analysis" / "fit" / "targets" / f"{sp}.toml").read_text())
    bounds = {p["path"]: p for p in spec["formRange"]}
    grid = {path: knob_values(bounds[path]) for path in FORM}
    brief = {t["name"]: t for t in spec["trait"] if t["kind"] == "described" and t["name"].startswith("lone.")}
    cells = REPO / "runs" / "form-sweep" / sp
    cells.mkdir(parents=True, exist_ok=True)
    ev = Evaluator()
    try:
        hand = ev.ask({"describe": sp, "paths": FORM})["values"]
        fixed = spec.get("fixed", {})
        jobs = {"hand": ev.ask({"amend": sp, "assign": dict(fixed)})["patch"]}
        for r, path in enumerate(FORM):
            for c, v in enumerate(grid[path]):
                jobs[f"{r}-{c}"] = ev.ask({"amend": sp, "assign": {**fixed, path: v}})["patch"]
    finally:
        ev.close()
    if not args.redraw:
        subprocess.run(["cargo", "build", "--release", "--quiet", "--locked", "-p", "treesim",
                        "--target-dir", str(REPO / "rust" / "target" / "native")],
                       cwd=REPO / "rust", check=True)
        with ThreadPoolExecutor(args.workers) as pool:
            list(pool.map(lambda kv: run_cell(sp, kv[1], cells / f"{kv[0]}.npz"), jobs.items()))
        (cells / "grid.json").write_text(json.dumps({"grid": grid, "hand": hand}, indent=1))
    command = (f"uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/"
               f"form-sweep.py {sp}")
    for s in SEASONS:
        print(draw_sheet(sp, s, grid, hand, brief, cells, command))


if __name__ == "__main__":
    main()
