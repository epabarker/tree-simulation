"""The form atlas (track B, docs/plans/2026-11-01-tracks.md §1 row B): one sheet per new form rule.

For each rule in RULES, a sheet per season (60, 100): a row per (species, knob), beech, oak and
birch, the knob at four values across its range with the rule's other knobs at their centre
(`base`), and in the left column the species as it stands today with the rule off (its round-5
`[form]` picks over round 2's physiology, the reference). Every cell is one lone tree at seed 1,
natively (form-sweep.py's `run_cell`: `treesim --preset oakOpen`, 160 wide, the woods' top at
200, one tree at x 80), run to 100 with a snapshot at 60, drawn frontal at one scale for the whole
sheet (wood width by pipe radius, leaves as points), with its shape numbers underneath (limb
elevation, W/H, fork height, leader dominance, height). The user judges each sheet by eye; nothing
is adopted until they do (ADR 0029).

    uv run --project analysis python docs/experiments/code/2026-11-01-atlas/atlas.py relay [--workers 4] [--redraw]

writes docs/experiments/figures/2026-11-01-atlas-<rule>-<season>.png (half size, 64 colours; full
resolution in runs/atlas/<rule>/sheet-<season>.png). --redraw draws from the npz files.
"""

from __future__ import annotations

import argparse
import importlib.util
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

REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO / "analysis"))
from treesim.fit import Evaluator  # noqa: E402

_spec = importlib.util.spec_from_file_location(
    "form_sweep", REPO / "docs/experiments/code/2026-10-31-species-round5/form-sweep.py")
fs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fs)

SPECIES = ("beech", "oak", "birch")
SEASONS = (60, 100)
FIGURES = REPO / "docs" / "experiments" / "figures"

#: The rules, each a centre setting and the knobs swept one at a time around it (ADR 0033 on).
RULES: dict[str, dict] = {
    # ADR 0033: the sympodial relay. Centre: two relays, the leader ends from age 20 with p 0.3.
    "relay": {
        "adr": "0033",
        "base": {"r2.relay": 2, "r2.relayAge": 20, "r2.relayPTerm": 0.3},
        "rows": [
            ("r2.relay", [1, 2, 3, 4]),
            ("r2.relayAge", [10, 20, 40, 60]),
            ("r2.relayPTerm", [0.1, 0.3, 0.6, 1.0]),
        ],
    },
    # ADR 0034: curvature along the limb. Centre: the limbs (level 1) arch 30° over 30 nodes. The
    # third row curves the relays (level 0) with the relay on (ADR 0033 at relay 2, pTerm 0.6).
    "curve": {
        "adr": "0034",
        "base": {"r2.levels.1.curve": 30, "r2.levels.1.curveLength": 30},
        "rows": [
            ("r2.levels.1.curve", [-30, 15, 30, 60]),
            ("r2.levels.1.curveLength", [10, 20, 40, 80]),
            ("r2.levels.0.curve", [20, 40, 60, 90],
             {"r2.relay": 2, "r2.relayAge": 20, "r2.relayPTerm": 0.6, "r2.levels.0.curveLength": 30}),
        ],
    },
    # ADR 0035: pendulous twigs. Centre: level 2's growth set point at 45 (so nothing hangs by it,
    # unlike birch's 145 today), its thin axes hanging at 140 up to radius 0.01. The third row hangs
    # level 1's thin ends as well (the scaffold's own set point unchanged).
    "pendulous": {
        "adr": "0035",
        "base": {"r2.levels.2.setPoint": 45, "r2.levels.2.pendulous": 140,
                 "r2.levels.2.pendulousRadius": 0.01},
        "rows": [
            ("r2.levels.2.pendulous", [100, 120, 140, 170]),
            ("r2.levels.2.pendulousRadius", [0.005, 0.01, 0.02, 0.04]),
            ("r2.levels.1.pendulous", [100, 120, 140, 170], {"r2.levels.1.pendulousRadius": 0.01}),
        ],
    },
}


def species_base(sp: str) -> dict:
    """The species today: its targets file's `fixed` and `[form]` picks (read, never written)."""
    spec = tomllib.loads((REPO / "analysis" / "fit" / "targets" / f"{sp}.toml").read_text())
    return {**spec.get("fixed", {}), **spec.get("form", {})}


def cells_of(rule: dict) -> dict[str, tuple[str, dict]]:
    """Cell key → (species, assign). `<sp>-off` is the reference; `<sp>-<row>-<col>` the sweep."""
    out = {}
    for sp in SPECIES:
        base = species_base(sp)
        out[f"{sp}-off"] = (sp, base)
        for r, (path, values, *extra) in enumerate(rule["rows"]):
            for c, v in enumerate(values):
                out[f"{sp}-{r}-{c}"] = (sp, {**base, **rule["base"], **(extra[0] if extra else {}), path: v})
    return out


def draw_sheet(name: str, rule: dict, season: int, cells: Path, command: str) -> Path:
    rows = [(sp, r, path, values) for sp in SPECIES for r, (path, values, *_) in enumerate(rule["rows"])]
    data = {k.stem: np.load(k) for k in cells.glob("*.npz")}
    segs = [d[f"seg{season}"] for d in data.values() if len(d[f"seg{season}"])]
    tall = max(60.0, math.ceil(max(float(np.max(s[:, [1, 3]])) for s in segs) / 20) * 20 + 5)
    half = max(30.0, max(float(np.max(np.abs(s[:, [0, 2]] - fs.WIDTH / 2))) for s in segs) + 4)
    steps = max(len(v) for _, _, _, v in rows)
    cols = steps + 1
    cell_w = 2.3
    cell_h = cell_w * tall / (2 * half)
    text_h = 0.55
    fig = plt.figure(figsize=(cols * cell_w, len(rows) * (cell_h + text_h) + 0.8), dpi=160)
    top = 1 - 0.8 / fig.get_figheight()
    row_h = (top - 0.005) / len(rows)
    tree_h = row_h * cell_h / (cell_h + text_h)
    scale = tree_h * fig.get_figheight() * 72 / tall
    base_text = ", ".join(f"{k.removeprefix('r2.')} {v:g}" for k, v in rule["base"].items())
    fig.suptitle(
        f"The form atlas: {name} (ADR {rule['adr']}, proposed), season {season}; lone tree, seed 1. "
        f"Left: the species today, rule off. Each row one knob, the others at the centre ({base_text}).\n"
        f"{command}",
        fontsize=8.5, y=0.999, va="top",
    )

    def cell(r: int, c: int, key: str, title: str, highlight: bool) -> None:
        d = data.get(key)
        left = c / cols
        y0 = top - (r + 1) * row_h
        ax = fig.add_axes((left + 0.004, y0 + row_h - tree_h, 1 / cols - 0.008, tree_h))
        if d is not None:
            fs.draw_tree(ax, d[f"seg{season}"], d[f"leaf{season}"], scale)
        ax.set_xlim(fs.WIDTH / 2 - half, fs.WIDTH / 2 + half)
        ax.set_ylim(0, tall)
        ax.set_aspect("equal", adjustable="box")
        ax.set_xticks([])
        ax.set_yticks([])
        ax.axhline(0, color="#8a7a60", lw=1)
        for side in ax.spines.values():
            side.set_color("#c33" if highlight else "#ccc")
            side.set_linewidth(1.4 if highlight else 0.6)
        ax.set_title(title, fontsize=7.5, pad=2, color="#c33" if highlight else "black")
        if d is None:
            return
        elev, spread, fork, dom, h = d[f"shape{season}"]
        fig.text(left + 0.5 / cols, y0 + 0.5 * (row_h - tree_h),
                 f"elev {fs.fmt(elev, 0)}°  W/H {fs.fmt(spread, 2)}  H {fs.fmt(h, 0)}\n"
                 f"fork {fs.fmt(fork, 2)}  dom {fs.fmt(dom, 1)}",
                 fontsize=6.5, va="center", ha="center", family="monospace")

    for r, (sp, k, path, values) in enumerate(rows):
        cell(r, 0, f"{sp}-off", f"{sp}: today (off)", False)
        centre = rule["base"].get(path)
        for c, v in enumerate(values):
            cell(r, c + 1, f"{sp}-{k}-{c}", f"{sp}: {path.removeprefix('r2.')} = {v:g}", v == centre)
    full = cells / f"sheet-{season}.png"
    fig.savefig(full)
    plt.close(fig)
    im = Image.open(full).convert("RGB")
    im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    out = FIGURES / f"2026-11-01-atlas-{name}-{season}.png"
    im.quantize(colors=64, method=Image.Quantize.MEDIANCUT).save(out, optimize=True)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("rule", choices=sorted(RULES))
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--redraw", action="store_true")
    args = ap.parse_args()
    rule = RULES[args.rule]
    cells = REPO / "runs" / "atlas" / args.rule
    cells.mkdir(parents=True, exist_ok=True)
    jobs = {}
    ev = Evaluator()
    try:
        for key, (sp, assign) in cells_of(rule).items():
            jobs[key] = (sp, ev.ask({"amend": sp, "assign": assign})["patch"])
    finally:
        ev.close()
    if not args.redraw:
        subprocess.run(["cargo", "build", "--release", "--quiet", "--locked", "-p", "treesim",
                        "--target-dir", str(REPO / "rust" / "target" / "native")],
                       cwd=REPO / "rust", check=True)
        todo = {k: v for k, v in jobs.items() if not (cells / f"{k}.npz").exists()}
        with ThreadPoolExecutor(args.workers) as pool:
            list(pool.map(lambda kv: fs.run_cell(kv[1][0], kv[1][1], cells / f"{kv[0]}.npz"),
                          todo.items()))
        (cells / "jobs.json").write_text(json.dumps(jobs, indent=1))
    command = f"uv run --project analysis python docs/experiments/code/2026-11-01-atlas/atlas.py {args.rule}"
    for s in SEASONS:
        print(draw_sheet(args.rule, rule, s, cells, command))


if __name__ == "__main__":
    main()
