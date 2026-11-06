"""Species step 1b: the lone beech of the lab links, round 2 against round 3 at seasons 60 and 100,
side by side at one scale, with the lone traits (lone-traits.json) under each.

The screenshots are the lab's plate (`?preset=oakOpen&seed=1&p=…&bench&seasons=N`, lone-links.ts),
framed to the tree. Each is rescaled to one pixel-per-cell: the tree's height in pixels (ground line
to the highest foliage pixel) against its height in cells.
    uv run --project analysis python docs/experiments/code/2026-10-30-species-3d/lone-figure.py <shots> <out.png>
"""

import json
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

shots, out = Path(sys.argv[1]), Path(sys.argv[2])
traits = json.loads((Path(__file__).parent / "lone-traits.json").read_text())
PLATE = (0, 40, 580, 515)  # the plate, under the title and above the charts


def lum_at(img: np.ndarray, y: int) -> float:
    return float(img[y, 5].astype(int).mean())


def tree_rows(img: np.ndarray) -> tuple[int, int]:
    """(top, ground): the highest foliage-or-wood row and the ground line's row."""
    r, g, b = (img[..., k].astype(int) for k in range(3))
    # The ground is the first row whose left-edge pixel (open sky above it) is brown.
    ground = next(y for y in range(img.shape[0]) if r[y, 5] > g[y, 5] > b[y, 5] and lum_at(img, y) < 170)
    lum = (r + g + b) / 3
    dark = (lum < 150) & (g >= b)
    rows = np.where(dark[:ground].sum(axis=1) > 0)[0]
    return int(rows.min()), int(ground)


#: The window each picture is cut to, cells: 120 wide around the trunk, 210 tall from the ground.
WIDE, TALL = 120, 210
crops = {}
for rnd in (2, 3):
    for season in (60, 100):
        img = np.asarray(Image.open(shots / f"r{rnd}-{season}.png").convert("RGB").crop(PLATE)).copy()
        # The lab's hint line sits in the plate's top rows: paint them with the sky just below.
        img[:24] = img[24]
        top, ground = tree_rows(img)
        p = (ground - top) / traits[f"round {rnd}"][str(season)]["height"]
        # The trunk: the darkest columns just above the ground.
        band = img[ground - 4 : ground].astype(int).sum(axis=2).mean(axis=0)
        cx = int(np.argmin(band))
        # Pad with the edge colours (sky above, ground below) so the window can run past the frame.
        pad = int(TALL * p)
        padded = np.pad(img, ((pad, pad), (pad, pad), (0, 0)), mode="edge")
        y0, y1 = ground + pad - int(TALL * p), ground + pad + int(6 * p)
        x0, x1 = cx + pad - int(WIDE / 2 * p), cx + pad + int(WIDE / 2 * p)
        crops[(rnd, season)] = Image.fromarray(padded[y0:y1, x0:x1]).resize((int(WIDE * 3), int((TALL + 6) * 3)), Image.LANCZOS)
fig, axes = plt.subplots(1, 4, figsize=(13, 7.4), gridspec_kw={"wspace": 0.05})
for ax, key in zip(axes, [(2, 60), (3, 60), (2, 100), (3, 100)]):
    ax.imshow(crops[key])
    ax.set_xticks([])
    ax.set_yticks([])
    t = traits[f"round {key[0]}"][str(key[1])]
    ax.set_title(f"round {key[0]}, season {key[1]}", fontsize=12)
    ax.set_xlabel(f"height {t['height']:.0f} cells · H/D {t['hd']:.0f}\nspread {t['spread']:.2f} · fork {t['fork']:.2f}\n"
                  f"leaf crown ratio {t['leafCrownRatio']:.2f}", fontsize=10.5)
fig.suptitle("Lone beech (oakOpen, seed 1, top 200), one scale (120 × 210 cells): round 2 as adopted, round 3's fit",
             fontsize=12, y=0.96)
fig.savefig(out, dpi=90, bbox_inches="tight")
print("saved", out)
