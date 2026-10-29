"""Side-profile measures of flat silhouettes (black tree on white, a.html?mask=1), the same for
scanned and simulated trees:

- profile: the silhouette's width in 10 height bands from the ground to the top, over the widest;
- spread: widest width over height (W/H);
- crownBase: the lowest height, over the tree's height, where the silhouette is at least a quarter
  of its widest (the clear bole);
- fill: tree pixels over the pixels between each crown row's outermost tree pixels, over the crown;
- bigGaps: the share of the crown's interior sky in gaps wider than 3% of the tree's height in
  both directions (a few big holes against fine dappling).

usage: uv run --no-project --with numpy --with pillow --with scipy python profile.py <mask.png>...
       ... profile.py --selftest
"""

import json
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

BANDS = 10


def measure(tree: np.ndarray) -> dict:
    rows = np.flatnonzero(tree.any(axis=1))
    top, bottom = rows[0], rows[-1]
    height = bottom - top + 1
    left = np.full(tree.shape[0], -1)
    right = np.full(tree.shape[0], -1)
    for y in rows:
        xs = np.flatnonzero(tree[y])
        left[y], right[y] = xs[0], xs[-1]
    width = np.where(left >= 0, right - left + 1, 0)
    widest = width.max()
    # Bands from the ground (band 0) to the top.
    profile = []
    for k in range(BANDS):
        lo = bottom - (k + 1) * height / BANDS
        hi = bottom - k * height / BANDS
        ys = [y for y in rows if lo < y <= hi]
        profile.append(float(max((width[y] for y in ys), default=0) / widest))
    crown_rows = [y for y in rows if width[y] >= 0.25 * widest]
    crown_base = (bottom - max(crown_rows)) / height
    inside = np.zeros_like(tree)
    for y in crown_rows:
        inside[y, left[y] : right[y] + 1] = True
    fill = tree[inside].sum() / inside.sum()
    sky = inside & ~tree
    labels, count = ndimage.label(sky)
    big = 0
    if count:
        objs = ndimage.find_objects(labels)
        sizes = ndimage.sum(sky, labels, range(1, count + 1))
        span = 0.03 * height
        for k, sl in enumerate(objs):
            if sl[0].stop - sl[0].start > span and sl[1].stop - sl[1].start > span:
                big += sizes[k]
    return dict(spread=float(widest / height), crownBase=float(crown_base), fill=float(fill),
                bigGaps=float(big / max(1, sky.sum())), profile=profile)


def load(path: str) -> np.ndarray:
    a = np.asarray(Image.open(path).convert("L"), dtype=np.float32)
    return a < 128


def selftest():
    n = 400
    y, x = np.mgrid[0:n, 0:n]
    disc = (x - 200) ** 2 + (y - 200) ** 2 <= 150**2
    m = measure(disc)
    assert abs(m["spread"] - 1) < 0.01 and m["fill"] > 0.99 and m["bigGaps"] == 0, m
    assert abs(max(m["profile"]) - 1) < 1e-9 and m["profile"][0] < 0.7, m
    tri = (y >= 50) & (y < 350) & (np.abs(x - 200) <= (y - 50) / 2)  # apex up, base 300 wide
    m = measure(tri)
    assert abs(m["profile"][0] - 1) < 0.02 and m["profile"][-1] < 0.15, m
    assert m["crownBase"] == 0 and abs(m["spread"] - 1) < 0.02, m
    ring = disc & ~((x - 200) ** 2 + (y - 200) ** 2 <= 100**2)
    m = measure(ring)
    assert m["bigGaps"] > 0.99 and m["fill"] < 0.75, m
    print("selftest ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["--selftest"]:
        selftest()
    else:
        for path in sys.argv[1:]:
            print(json.dumps({"file": path.split("/")[-1], **measure(load(path))}))
