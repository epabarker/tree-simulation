"""The blind test v3 (v2's shuffle): copy the renders into one folder per namer, each its own shuffle,
with neutral names (plate-NN.png), and write the key (species named) to <key-dir>/key.json (default:
beside this script). The shuffles are v3's own, seeded by the key folder's name and the namer, so no
namer sees v2's order or another set's.

    python3 shuffle.py <renders-dir> <namers-root> [<key-dir> [<beech label>]]

The addendum's set: `shuffle.py <renders> ~/blind-plates-v3b clearbole "beech (accepted
build, clearBole)"`, its renders the baseline's 45 non-beech plates with the nine beech plates drawn
under &clearBole.
"""

import json
import random
import shutil
import sys
from pathlib import Path

renders, root = Path(sys.argv[1]), Path(sys.argv[2])
here = Path(__file__).parent
key_dir = here / sys.argv[3] if len(sys.argv) > 3 else here
SPECIES = {"beech": "beech (accepted build)", "today": "beech (today)", "hornbeam": "hornbeam", "oak": "oak", "birch": "birch", "fir": "silver fir"}
if len(sys.argv) > 4:
    SPECIES["beech"] = sys.argv[4]
files = sorted(renders.glob("*.png"))
key = {}
for n in range(1, 4):
    folder = root / f"namer-{n}"
    folder.mkdir(parents=True, exist_ok=True)
    order = list(files)
    random.Random(f"v3-{key_dir.name}-namer-{n}").shuffle(order)
    key[f"namer-{n}"] = {}
    for i, f in enumerate(order, 1):
        source, trial, seed = f.stem.split("-")
        name = f"plate-{i:02d}.png"
        shutil.copyfile(f, folder / name)
        key[f"namer-{n}"][name] = {"source": source, "species": SPECIES[source], "trial": trial, "seed": int(seed[1:])}
key_dir.mkdir(exist_ok=True)
(key_dir / "key.json").write_text(json.dumps(key, indent=1) + "\n")
print(len(files), "renders → 3 folders under", root, "; key in", key_dir)
