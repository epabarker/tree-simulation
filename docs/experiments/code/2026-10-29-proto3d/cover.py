"""THROWAWAY PROTOTYPE: what the picture shows below half height, from the baked stands.

For each stand, leaves (live buds with leaf area: active or short shoots) are projected to the
picture, (x, y), in 1-cell cells. H is the median height of the canopy trees (those reaching half
the tallest). Over the columns that hold any leaf (the stand's footprint), it reports the share of
cells holding a leaf below H/2 and above it, and the leaves per such cell (how opaque it reads).

    python3 docs/experiments/code/2026-10-29-proto3d/cover.py runs/proto3d-tau/stands
"""

import base64
import gzip
import json
import math
import os
import sys
from statistics import median

import numpy as np

DT = {"Float32Array": np.float32, "Float64Array": np.float64, "Int32Array": np.int32, "Uint8Array": np.uint8}


def arr(v):
    return np.frombuffer(base64.b64decode(v["b"]), dtype=DT[v["t"]])


def cover(path):
    o = json.load(gzip.open(path))
    W = int(o["width"])
    x0, y0, ang, ln = (arr(o[k]).astype(np.float64) for k in ("x0", "y0", "angle", "length"))
    tree = arr(o["tree"])
    bm = arr(o["budMetamer"])
    st = arr(o["budState"])
    leafy = (st == 1) | (st == 5)
    j = bm[leafy]
    x = (x0[j] + ln[j] * np.cos(ang[j])) % W
    y = y0[j] + ln[j] * np.sin(ang[j])
    t = tree[j]
    hs = [float(y[t == k].max()) for k in np.unique(t)]
    top = max(hs)
    H = median([h for h in hs if h >= 0.5 * top])
    grid = np.zeros((W, int(math.ceil(top)) + 2), dtype=np.int32)
    np.add.at(grid, (np.floor(x).astype(int) % W, np.clip(np.floor(y).astype(int), 0, grid.shape[1] - 1)), 1)
    cols = grid.sum(axis=1) > 0
    half = int(round(H / 2))
    lo = grid[cols, :half]
    hi = grid[cols, half : int(math.ceil(H))]
    return {
        "H": round(H, 1),
        "columns": int(cols.sum()),
        "coverLow": round(float((lo > 0).mean()), 3),
        "coverHigh": round(float((hi > 0).mean()), 3),
        "leavesPerCellLow": round(float(lo[lo > 0].mean()) if (lo > 0).any() else 0.0, 1),
        "leavesPerCellHigh": round(float(hi[hi > 0].mean()) if (hi > 0).any() else 0.0, 1),
    }


d = sys.argv[1] if len(sys.argv) > 1 else "runs/proto3d-tau/stands"
for name in sorted(os.listdir(d)):
    if name.endswith(".json.gz"):
        print(name[: -len(".json.gz")], json.dumps(cover(os.path.join(d, name))))
