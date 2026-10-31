"""Species round 4, step B.6 (the audit's route A): one line-up panel per species. Round 2 (as adopted)
beside a round's fit: the lone tree at 60 and 100 and the closed stand at 100, every picture at one
scale (cells), with the traits under each. Generalises 2026-10-30-species-3d/lone-figure.py.

The pictures are panel-shots.mjs's screenshots of the lab's plate (panel-links.ts's links). Each is
rescaled to one scale: its tallest tree's height in pixels (the ground line to the highest pixel
that differs from the sky beside it) against that tree's height in cells (panel.json).
    uv run --project analysis python docs/experiments/code/2026-10-31-species-round4/panel-figure.py runs/panel round3 docs/experiments/figures
"""

import json
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

shots, rnd, out = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
panel = json.loads((shots / "panel.json").read_text())
fitted = rnd.replace("round", "round ")
#: The window each picture is cut to, cells: 160 wide around the trunk (the lone world's width; the
#: stand's 84-cell ring shown whole), 215 tall from the ground. The woods' top is 200.
WIDE, TALL = 160, 215
#: Rows at the plate's top that hold the title and the hint, painted over with the sky.
TEXT = 60


def rows(img: np.ndarray) -> tuple[int, int, np.ndarray]:
    """(top, ground, mask): the highest row with a tree pixel, the ground line's row, and the tree
    pixels. The sky is a vertical gradient, so a pixel is the tree's where it differs from the plate's
    left-edge pixel in its row; the ground is the first row (from the top) whose left edge is brown."""
    a = img.astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    ground = next(y for y in range(TEXT, a.shape[0]) if r[y, 3] > g[y, 3] + 8 and g[y, 3] >= b[y, 3])
    sky = a[:, 3:4, :]
    mask = np.abs(a - sky).sum(axis=2) > 60
    mask[:TEXT] = False
    mask[ground:] = False
    found = np.where(mask.any(axis=1))[0]
    return int(found.min()), ground, mask


def crop(path: Path, height_cells: float) -> Image.Image:
    img = np.asarray(Image.open(path).convert("RGB")).copy()
    top, ground, mask = rows(img)
    img[:TEXT] = img[TEXT]
    p = (ground - top) / height_cells
    # The middle of the tree pixels just above the ground: a lone trunk, or the stand's centre.
    cols = np.where(mask[max(top, ground - int(30 * p)) : ground].any(axis=0))[0]
    cx = int((cols.min() + cols.max()) / 2)
    pad = int(TALL * p) + 1
    padded = np.pad(img, ((pad, pad), (pad, pad), (0, 0)), mode="edge")
    y0, y1 = ground + pad - int(TALL * p), ground + pad + int(6 * p)
    x0, x1 = cx + pad - int(WIDE / 2 * p), cx + pad + int(WIDE / 2 * p)
    return Image.fromarray(padded[y0:y1, x0:x1]).resize((WIDE * 3, (TALL + 6) * 3), Image.LANCZOS)


def label(view: str, t: dict) -> str:
    if view.startswith("lone"):
        return (f"height {t['height']:.0f} · H/D {t['hd']:.0f}\nW/H {t['spread']:.2f} · widest at {t['widestAt']:.2f}\n"
                f"limb crown ratio {t['limbCrownRatio']:.2f}")
    return (f"middle row: height {t['height']:.0f} · H/D {t['hd']:.0f}\ncrown ratio {t['limbCrownRatio']:.2f} limb, "
            f"{t['leafCrownRatio']:.2f} leaf\nLAI {t['lai']:.1f} · floor {100 * t['floor']:.1f}%")


out.mkdir(parents=True, exist_ok=True)
VIEWS = ["lone 60", "lone 100", "stand 100"]
for sp, rounds in panel.items():
    fig, axes = plt.subplots(2, 3, figsize=(12, 15), gridspec_kw={"wspace": 0.05, "hspace": 0.32})
    for i, name in enumerate(["round 2", fitted]):
        for j, view in enumerate(VIEWS):
            ax = axes[i, j]
            t = rounds[name]["traits"][view]
            shot = shots / f"{sp}-{name.replace(' ', '')}-{view.replace(' ', '')}.png"
            ax.set_xticks([])
            ax.set_yticks([])
            if shot.exists():
                ax.imshow(crop(shot, t.get("top", t["height"])))
            ax.set_title(f"{name}: {view.replace(' ', ' at ')}", fontsize=12)
            ax.set_xlabel(label(view, t), fontsize=10)
    fig.suptitle(f"{sp}: lone tree (seed 1) and closed stand (seed 1, all three rows), one scale "
                 f"({WIDE} × {TALL} cells); round 2 as adopted above, {fitted}'s fit below", fontsize=12, y=0.93)
    path = out / f"2026-10-31-species-panel-{sp}.png"
    fig.savefig(path, dpi=80, bbox_inches="tight")
    plt.close(fig)
    # 128 colours: a quarter of the bytes, small enough to commit.
    Image.open(path).convert("RGB").quantize(128, dither=Image.Dither.NONE).save(path, optimize=True)
    print("saved", path)
