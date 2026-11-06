"""The fresh-look render harness: one candidate → one sheet, natively, no browser.

A candidate is a species patch (a JSON object merged over the species' patch in rust/presets.json,
arrays merged by index) or a dotted assignment file ({"r2.levels.1.setPoint": 28, ...}). For each
seed it runs the lone tree (oakOpen, 160 wide, one tree at x 80, to 100 with a snapshot at 60) and
the closed stand (84 wide, periodic sides, opaque faces, 12 trees in three rows, to 100): the same
two trials the species harness measures (cli/trials.ts loneParams, standParams). It draws them
frontal at one scale, leaf-on (leaves as points from buds.csv) and leaf-off (wood only, width by
pipe radius), with the shape numbers underneath, and writes metrics.json beside the sheet.

    uv run --project analysis python docs/experiments/code/2026-11-01-fresh-look-beech/render.py \
        --species beech --assign picks.json --seeds 1,2,3 --out runs/fresh-look/beech-picks

    --patch patch.json      a nested species patch instead of dotted assigns (or as well)
    --label "text"          the sheet's title
    --workers 2             parallel runs
    --no-run                redraw from the runs already in --out

Reads the sheet's layout from nothing else in the repo: it depends only on the treesim binary at
rust/target/release/treesim (or TREESIM) and rust/presets.json.
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import polars as pl
from matplotlib.collections import LineCollection

REPO = Path(__file__).resolve().parents[4]
TREESIM = Path(os.environ.get("TREESIM", REPO / "rust" / "target" / "release" / "treesim"))
PRESETS = json.loads((REPO / "rust" / "presets.json").read_text())
TOP = 200
LONE_W, STAND_W = 160, 84
STAND_ROW = [10.5, 31.5, 52.5, 73.5]
DEPTH, SPACING = 64, 21
SEASONS = (60, 100)


def deep_merge(base, patch):
    """Objects merge by key, arrays by index (a shorter array patches the first elements)."""
    if isinstance(base, dict) and isinstance(patch, dict):
        out = dict(base)
        for k, v in patch.items():
            out[k] = deep_merge(base.get(k), v) if k in base else v
        return out
    if isinstance(base, list) and isinstance(patch, list):
        out = list(base)
        for i, v in enumerate(patch):
            out[i] = deep_merge(base[i], v) if i < len(base) else v
        return out
    return patch


def assign_path(obj, path: str, value):
    keys = path.split(".")
    cur = obj
    for k in keys[:-1]:
        if isinstance(cur, list):
            cur = cur[int(k)]
        else:
            cur = cur.setdefault(k, {})
    last = keys[-1]
    if isinstance(cur, list):
        cur[int(last)] = value
    else:
        cur[last] = value


def species_patch(species: str, assigns: dict | None, patch: dict | None) -> dict:
    """The species' full patch: the preset's, with the assigns and the patch applied."""
    base = copy.deepcopy(PRESETS["presets"]["oakOpen"]["species"][species])
    if patch:
        base = deep_merge(base, patch)
    for k, v in (assigns or {}).items():
        assign_path(base, k, v)
    return base


def stand_trees(species: str) -> list[dict]:
    rows = max(1, round(DEPTH / SPACING))
    return [
        {"x": (x + (r * SPACING) / rows) % STAND_W, "z": DEPTH * (r + 0.5) / rows, "species": species}
        for r in range(rows)
        for x in STAND_ROW
    ]


def run(trial: str, species: str, patch: dict, seed: int, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    if trial == "lone":
        params = {"world": {"width": LONE_W, "height": TOP, "walls": []}, "trees": [{"x": LONE_W / 2, "species": species}]}
    else:
        params = {
            "world": {"width": STAND_W, "height": TOP, "walls": [], "sides": "periodic", "faces": [0, 0]},
            "trees": stand_trees(species),
        }
    params["species"] = {species: patch}
    subprocess.run(
        [str(TREESIM), "--preset", "oakOpen", "--params", "-", "--seed", str(seed), "--seasons", "100",
         "--snapshots", "60", "--light", "--quiet", "--out", str(out)],
        input=json.dumps(params), text=True, check=True,
    )


def load(out: Path, season: int):
    m = pl.read_csv(out / "metamers.csv", infer_schema_length=None).filter(pl.col("season") == season)
    b = pl.read_csv(out / "buds.csv", infer_schema_length=None).filter((pl.col("season") == season) & (pl.col("leaf") > 0))
    mt = pl.read_csv(out / "metrics.csv", infer_schema_length=None).filter(pl.col("season") == season)
    f = pl.read_csv(out / "form.csv", infer_schema_length=None).filter(pl.col("season") == season)
    g = None
    if (out / "ground.csv").exists():
        g = pl.read_csv(out / "ground.csv", infer_schema_length=None).filter(pl.col("season") == season)
    return m, b, mt, f, g


def draw(ax, m: pl.DataFrame, b: pl.DataFrame, width: int, leaves: bool, focus: int | None = None) -> None:
    """Frontal projection; farther rows (larger z) drawn paler so the stand reads in depth."""
    ax.set_xlim(0, width)
    ax.set_ylim(0, TOP)
    ax.set_aspect("equal")
    ax.set_xticks([])
    ax.set_yticks([])
    for s in ax.spines.values():
        s.set_linewidth(0.4)
    if m.height == 0:
        return
    z = ((m["z0"] + m["z1"]) / 2).to_numpy()
    order = np.argsort(-z)  # back to front
    seg = m.select("x0", "y0", "x1", "y1").to_numpy()[order]
    rad = m["radius"].to_numpy()[order]
    zz = z[order]
    fade = np.clip((zz - zz.min()) / max(1e-9, zz.max() - zz.min()), 0, 1) if zz.max() > zz.min() else np.zeros_like(zz)
    # 1 cell = 1 data unit; linewidth in points: scale by the axes size.
    bbox = ax.get_window_extent()
    pts_per_cell = bbox.height / TOP * 72 / ax.figure.dpi
    lw = np.maximum(0.25, 2 * rad * pts_per_cell)
    wood = np.array([[0.30, 0.22, 0.16]])
    colors = wood * (1 - fade[:, None] * 0.55) + fade[:, None] * 0.55
    ax.add_collection(LineCollection([[(x0, y0), (x1, y1)] for x0, y0, x1, y1 in seg], linewidths=lw, colors=colors, capstyle="round"))
    if leaves and b.height > 0:
        # buds.csv's `metamer` is the index into its tree's metamer array (parent-before-child
        # order), which metamers.csv lists per tree in that order (form-sweep.py reads it so).
        tips = m.select("x1", "y1", "z1").to_numpy()
        tree = m["tree"].to_numpy()
        first = {}
        for i, t in enumerate(tree):
            first.setdefault(int(t), i)
        count = {int(t): int(n) for t, n in zip(*np.unique(tree, return_counts=True))}
        rows, las = [], []
        for t, k, la in zip(b["tree"].to_numpy(), b["metamer"].to_numpy(), b["leaf"].to_numpy()):
            t, k = int(t), int(k)
            if t in first and k < count[t]:
                rows.append(first[t] + k)
                las.append(la)
        if rows:
            tp = tips[rows]
            la = np.array(las)
            zf = np.clip((tp[:, 2] - zz.min()) / max(1e-9, zz.max() - zz.min()), 0, 1) if zz.max() > zz.min() else np.zeros(len(rows))
            green = np.array([[0.16, 0.42, 0.14]])
            lc = green * (1 - zf[:, None] * 0.5) + zf[:, None] * 0.5
            ax.scatter(tp[:, 0], tp[:, 1], s=np.clip(la, 0.3, 4) * pts_per_cell * 1.2, c=lc, marker="o", linewidths=0, zorder=3)


def lone_numbers(mt: pl.DataFrame, f: pl.DataFrame) -> dict:
    if mt.height == 0 or f.height == 0:
        return {}
    r, fr = mt.row(0, named=True), f.row(0, named=True)
    h = r["height"]
    return {
        "height": round(h, 1),
        "W/H": round(max(r["crownWidth"], r["crownDepth"]) / h, 2) if h else None,
        "H/D": round(r["slenderness"], 0),
        "limbCrownRatio": round(r["limbCrownRatio"], 2),
        "limbElevation": round(fr["limbElevation"], 0),
        "forkHeight": round(fr["forkHeight"], 2),
        "leaderDominance": round(fr["leaderDominance"], 2),
    }


def stand_numbers(mt: pl.DataFrame, g) -> dict:
    if mt.height == 0:
        return {}
    alive = mt.filter(pl.col("alive") == 1)
    mid = alive.filter((pl.col("rootZ") > DEPTH / 3) & (pl.col("rootZ") < 2 * DEPTH / 3))
    use = mid if mid.height else alive
    out = {
        "alive": f"{alive.height}/{mt.height}",
        "height": round(float(use["height"].mean()), 1) if use.height else None,
        "H/D": round(float(use["slenderness"].mean()), 0) if use.height else None,
        "crownRatio(limb)": round(float(use["limbCrownRatio"].mean()), 2) if use.height else None,
        "crownRatio(leaf)": round(float(use["leafCrownRatio"].mean()), 2) if use.height else None,
    }
    if g is not None and g.height:
        out["floor"] = f"{100 * float(g['q'].mean()):.1f}%"
        out["LAI"] = round(float(g["lai"].mean()), 1)
    return out


def fmt(d: dict) -> str:
    return "\n".join(f"{k} {v}" for k, v in d.items())


def sheet(out: Path, seeds: list[int], label: str) -> dict:
    cols = [("lone", 60, True), ("lone", 60, False), ("lone", 100, True), ("lone", 100, False), ("stand", 100, True), ("stand", 100, False)]
    fig, axes = plt.subplots(len(seeds), len(cols), figsize=(3.0 * len(cols), 4.3 * len(seeds)), squeeze=False, gridspec_kw={"wspace": 0.08, "hspace": 0.45})
    metrics: dict = {}
    for r, seed in enumerate(seeds):
        cache = {}
        for c, (trial, season, leaves) in enumerate(cols):
            ax = axes[r][c]
            key = (trial, season)
            if key not in cache:
                cache[key] = load(out / f"{trial}-{seed}", season)
            m, b, mt, f, g = cache[key]
            draw(ax, m, b, LONE_W if trial == "lone" else STAND_W, leaves)
            ax.set_title(f"seed {seed}: {trial} at {season}, {'leaf-on' if leaves else 'leaf-off'}", fontsize=8)
            if leaves:
                nums = lone_numbers(mt, f) if trial == "lone" else stand_numbers(mt, g)
                metrics[f"{trial}{season}-seed{seed}"] = nums
                ax.text(0.5, -0.02, fmt(nums), transform=ax.transAxes, ha="center", va="top", fontsize=6.5, family="monospace")
    fig.suptitle(label, fontsize=10)
    png = out / "sheet.png"
    fig.savefig(png, dpi=110, bbox_inches="tight")
    plt.close(fig)
    (out / "metrics.json").write_text(json.dumps(metrics, indent=1))
    return metrics


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--species", default="beech")
    ap.add_argument("--assign", help="JSON file of dotted assignments")
    ap.add_argument("--patch", help="JSON file: a nested species patch")
    ap.add_argument("--seeds", default="1,2,3")
    ap.add_argument("--out", required=True)
    ap.add_argument("--label", default=None)
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--no-run", action="store_true")
    ap.add_argument("--lone-width", type=int, default=160,
                    help="the lone world's width (default 160, the species harness's); wider lets a broad crown clear the sides")
    a = ap.parse_args()
    LONE = globals()
    LONE["LONE_W"] = a.lone_width
    seeds = [int(s) for s in a.seeds.split(",")]
    out = Path(a.out)
    assigns = json.loads(Path(a.assign).read_text()) if a.assign else None
    patch = json.loads(Path(a.patch).read_text()) if a.patch else None
    sp = species_patch(a.species, assigns, patch)
    out.mkdir(parents=True, exist_ok=True)
    (out / "species-patch.json").write_text(json.dumps(sp, indent=1))
    if not a.no_run:
        jobs = [(t, s) for s in seeds for t in ("lone", "stand")]
        with ThreadPoolExecutor(a.workers) as ex:
            list(ex.map(lambda j: run(j[0], a.species, sp, j[1], out / f"{j[0]}-{j[1]}"), jobs))
    label = a.label or f"{a.species}: {a.assign or a.patch or 'today'}"
    metrics = sheet(out, seeds, label)
    print(json.dumps(metrics, indent=1))
    print("sheet", out / "sheet.png")


if __name__ == "__main__":
    sys.exit(main())
