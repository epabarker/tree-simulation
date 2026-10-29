"""Structure vs drawing: a TreeQSM v2.0 .mat (Wytham Woods, Calders et al.) to
  <name>.skel.json  3D skeleton in metres, y up (renderer B), and
  <name>.snap.json  a one-tree planar Snapshot in cells (renderer A), seen from the side.
Leaf sites are the terminal cylinders (no child): TLS QSMs stop at about the finest twigs scanned.
usage: qsm_export.py <in.mat> <out-dir> <name>
"""
import json, sys
import numpy as np, scipy.io as sio

CELL_M = 0.25
src, out, name = sys.argv[1], sys.argv[2], sys.argv[3]
m = sio.loadmat(src, squeeze_me=True)
sta, axe, ln, rad = m["Sta"], m["Axe"], m["Len"], m["Rad"]
par = m["CPar"].astype(np.int64) - 1  # 0-based, -1 = none; parent < child already
n = len(ln)
assert np.all(par < np.arange(n))
end = sta + axe * ln[:, None]
nchild = np.bincount(par[par >= 0], minlength=n)
tip = nchild == 0

# Metres, y up: x east, y = height above the base, z = north (depth).
base = sta[0].copy()
def yup(p):
    q = p - base
    return np.stack([q[:, 0], q[:, 2], q[:, 1]], axis=1)
a3, b3 = yup(sta), yup(end)
seg = np.concatenate([a3, b3, rad[:, None]], axis=1)
leafy = np.flatnonzero(tip)
json.dump({"name": name, "source": src.split("/")[-1], "parent": par.tolist(),
           "seg": np.round(seg, 5).ravel().tolist(), "leafy": leafy.tolist()},
          open(f"{out}/{name}.skel.json", "w"))

# Light proxy for renderer A's leaf shading (the sim gives Q; a scan does not): the openness of
# each cylinder's tip to the sky through a 0.5 m grid of tip counts, along 5 upward directions.
vox = 0.5
lo = b3.min(axis=0) - 1
idx = np.floor((b3[tip] - lo) / vox).astype(int)
shape = tuple(np.floor((b3.max(axis=0) - lo) / vox).astype(int) + 2)
grid = np.zeros(shape)
np.add.at(grid, tuple(idx.T), 1.0)
dirs = [(0, 1, 0), (0.5, 0.85, 0), (-0.5, 0.85, 0), (0, 0.85, 0.5), (0, 0.85, -0.5)]
light = np.zeros(n)
pts = (b3 - lo) / vox
for d in dirs:
    d = np.array(d) / np.linalg.norm(d)
    acc = np.zeros(n)
    for k in range(1, int(max(shape) * 1.5)):
        q = np.floor(pts + d * k).astype(int)
        ok = np.all((q >= 0) & (q < np.array(shape)), axis=1)
        if not ok.any(): break
        acc[ok] += grid[tuple(q[ok].T)]
    light += np.exp(-0.15 * acc)
light /= len(dirs)

# Planar snapshot seen from the south (screen x = east, up = height), in cells. A branch's first
# cylinder starts on its parent's surface, not at its tip: if it starts more than 3 cm from the
# parent's tip it is drawn as its own root at its true start, so nothing shifts along the stem.
link = par.copy()
for i in range(1, n):
    p = par[i]
    if p >= 0 and np.linalg.norm(a3[i] - b3[p]) > 0.03:
        link[i] = -1
dx, dy = (b3[:, 0] - a3[:, 0]), (b3[:, 1] - a3[:, 1])
snap = {
    "season": 0, "width": 400, "height": 200, "metamerCount": n,
    "parent": link.tolist(),
    "x0": np.round(a3[:, 0] / CELL_M + 200, 4).tolist(), "y0": np.round(a3[:, 1] / CELL_M, 4).tolist(),
    "angle": np.round(np.arctan2(dy, dx), 5).tolist(),
    "length": np.round(np.hypot(dx, dy) / CELL_M, 5).tolist(),
    "radius": np.round(rad / CELL_M, 5).tolist(),
    "tree": [0] * n, "birthId": list(range(n)),
    # One order everywhere: the page's ADR 0008 squeeze must not turn a scanned 3D tree again.
    "order": [0] * n,
    "light": np.round(light, 4).tolist(), "resource": [0] * n,
    # Tips are this year's shoots (leafy), the rest old wood.
    "age": np.where(tip, 0, 50).tolist(), "stress": [0] * n,
    "budMetamer": [], "budState": [], "budQ": [],
    "species": {"oak": {"common": "oak", "latin": "Quercus robur", "leaf": "oak"}},
    "metrics": [{"tree": 0, "alive": True, "species": "oak", "rootX": 200,
                 "height": float(b3[:, 1].max() / CELL_M), "crownWidth": float(np.ptp(b3[:, 0]) / CELL_M)}],
}
json.dump(snap, open(f"{out}/{name}.snap.json", "w"))
h = b3[:, 1].max(); w = np.ptp(b3[:, 0]); dpt = np.ptp(b3[:, 2])
print(f"{name}: {n} cylinders, {tip.sum()} tips, {np.sum(link < 0)} drawn roots, height {h:.1f} m, "
      f"width E-W {w:.1f} m, N-S {dpt:.1f} m, base r {rad[0]*100:.0f} cm")
