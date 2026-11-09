"""Frontal pictures from the WASM probe's job files: the garden at season 150, HEAD over patch, seeds 1–3.
Usage: uv run --project analysis python figure.py runs/probe/bole-t040k3 <out.png> <title>"""
import json
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection

d, out, title = sys.argv[1], sys.argv[2], sys.argv[3]
fig, axes = plt.subplots(2, 3, figsize=(18, 9), sharey=True)
for col, seed in enumerate([1, 2, 3]):
    for row, p in enumerate([0, 1]):
        r = json.load(open(f"{d}/garden-{seed}-{p}.json"))
        f = [x for x in r["frames"] if x["season"] == 150][0]
        ax = axes[row][col]
        w = f["wood"]
        segs = [((w[i], w[i + 1]), (w[i + 2], w[i + 3])) for i in range(0, len(w), 5)]
        lw = [max(0.3, w[i + 4] * 1.5) for i in range(0, len(w), 5)]
        ax.add_collection(LineCollection(segs, linewidths=lw, colors="#6b4f3a"))
        lv = f["leaves"]
        ax.scatter(lv[0::3], lv[1::3], s=0.4, c="#3d7a3a", alpha=0.35, linewidths=0)
        ax.set_xlim(0, r["width"]); ax.set_ylim(0, 160); ax.set_aspect("equal")
        n = f["numbers"]
        ax.set_title(f"seed {seed} {'patch' if p else 'HEAD'}: ≥10 m {n['over10m']:.0f}, "
                     f"leaf crown base {n['boleLeafTall']:.2f}, limb {n['boleLimbTall']:.2f}", fontsize=9)
        ax.tick_params(labelsize=7)
fig.suptitle(title, fontsize=11)
fig.tight_layout()
fig.savefig(out, dpi=90)
