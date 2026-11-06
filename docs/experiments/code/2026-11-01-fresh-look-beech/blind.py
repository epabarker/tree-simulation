"""The blind naming test's images (blind-test.md): one panel per image, neutral names, shuffled.

Each source is a harness run folder (render.py's --out). For each source, seed and view it draws a
single panel with no title and no numbers, at one scale, and saves it under a random three-letter
name. The key (name → source, seed, view) goes to --key, outside the folder the reviewer sees.

    analysis/.venv/bin/python docs/experiments/code/2026-11-01-fresh-look-beech/blind.py \
        --source candidate=runs/fresh-look/solve-round1 --source today=runs/fresh-look/beech-today \
        --source decoyA=runs/fresh-look/decoy-fir --source decoyB=runs/fresh-look/decoy-hornbeam \
        --out runs/fresh-look/blind-round1/images --key runs/fresh-look/blind-round1/key.json
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import random
import string
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

_spec = importlib.util.spec_from_file_location("render", Path(__file__).with_name("render.py"))
render = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(render)

VIEWS = [("lone", 60, True), ("lone", 100, True), ("lone", 100, False), ("stand", 100, True)]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", action="append", required=True, help="label=run-folder")
    ap.add_argument("--seeds", default="1,2,3")
    ap.add_argument("--out", required=True)
    ap.add_argument("--key", required=True)
    ap.add_argument("--shuffle-seed", type=int, default=20261101)
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    rng = random.Random(a.shuffle_seed)
    used: set[str] = set()
    key = {}
    for src in a.source:
        label, folder = src.split("=", 1)
        for seed in [int(s) for s in a.seeds.split(",")]:
            for trial, season, leaves in VIEWS:
                run = Path(folder) / f"{trial}-{seed}"
                m, b, *_ = render.load(run, season)
                # The world's own width (a run may use render.py's --lone-width), so no panel is cropped.
                width = json.loads((run / "run.json").read_text())["params"]["world"]["width"]
                fig, ax = plt.subplots(figsize=(3.2 * width / 160 + 0.4, 4.2))
                render.draw(ax, m, b, width, leaves)
                while True:
                    name = "".join(rng.choice(string.ascii_lowercase) for _ in range(3))
                    if name not in used:
                        used.add(name)
                        break
                fig.savefig(out / f"tree-{name}.png", dpi=110, bbox_inches="tight")
                plt.close(fig)
                key[f"tree-{name}.png"] = {"source": label, "seed": seed, "trial": trial, "season": season, "leaves": leaves}
    Path(a.key).write_text(json.dumps(key, indent=1, sort_keys=True))
    print(len(key), "images in", out)


if __name__ == "__main__":
    main()
