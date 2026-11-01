"""The blind test v2: copy the renders into one folder per namer, each its own shuffle, with neutral
names (plate-NN.png), and write the key (species named) beside this script.

    python3 shuffle.py <renders-dir> <namers-root> [namers]
"""

import json
import random
import shutil
import sys
from pathlib import Path

renders, root = Path(sys.argv[1]), Path(sys.argv[2])
namers = int(sys.argv[3]) if len(sys.argv) > 3 else 3
SPECIES = {"beech": "beech (this branch)", "today": "beech (today)", "hornbeam": "hornbeam", "oak": "oak", "birch": "birch", "fir": "silver fir"}
files = sorted(renders.glob("*.png"))
key = {}
for n in range(1, namers + 1):
    folder = root / f"namer-{n}"
    folder.mkdir(parents=True, exist_ok=True)
    order = list(files)
    random.Random(2026_11_02 + n).shuffle(order)
    key[f"namer-{n}"] = {}
    for i, f in enumerate(order, 1):
        source, trial, seed = f.stem.split("-")
        name = f"plate-{i:02d}.png"
        shutil.copyfile(f, folder / name)
        key[f"namer-{n}"][name] = {"source": source, "species": SPECIES[source], "trial": trial, "seed": int(seed[1:])}
(Path(__file__).parent / "key.json").write_text(json.dumps(key, indent=1) + "\n")
print(len(files), "renders →", namers, "folders under", root)
