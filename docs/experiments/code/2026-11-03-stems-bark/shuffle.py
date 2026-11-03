"""Stems and bark (2026-11-03): v3's shuffle with conditions as sources. Copies a set's renders
(<tag>-<trial>-s<seed>.png, from render-set.sh) into one folder per namer, each its own shuffle,
named plate-NN.png, and writes the key to <key-dir>/key.json.

    NAMERS=3 python3 shuffle.py <renders-dir> <namers-root> <key-dir>
"""

import json
import os
import random
import shutil
import sys
from pathlib import Path

renders, root, key_dir = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
files = sorted(renders.glob("*.png"))
key = {}
for n in range(1, int(os.environ.get("NAMERS", "3")) + 1):
    folder = root / f"namer-{n}"
    folder.mkdir(parents=True, exist_ok=True)
    order = list(files)
    random.Random(f"stems-{key_dir.name}-namer-{n}").shuffle(order)
    key[f"namer-{n}"] = {}
    for i, f in enumerate(order, 1):
        tag, trial, seed = f.stem.split("-")
        name = f"plate-{i:02d}.png"
        shutil.copyfile(f, folder / name)
        key[f"namer-{n}"][name] = {"source": tag, "trial": trial, "seed": int(seed[1:])}
key_dir.mkdir(parents=True, exist_ok=True)
(key_dir / "key.json").write_text(json.dumps(key, indent=1) + "\n")
print(len(files), "renders →", len(key), "folders under", root, "; key in", key_dir)
