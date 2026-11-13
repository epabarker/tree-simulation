"""DBH, height and crown size of every tree at every metamer snapshot of a run (#121's path-length
probe; EXPLORATORY). Level 0's measurement rule (cli/allometry.ts), from metamers.csv alone:

- the trunk is the continuation chain from the root, each node continued by the child with the
  larger subtree wood volume; DBH is 2 x the radius of the trunk cylinder holding 1.3 m (5.2
  cells) of stem length; wood only;
- crown radius: the mean over +x, -x, +z, -z of the largest offset of a metamer's tip from the
  trunk's point at 1.3 m. Every metamer's tip is read (allometry.ts reads live-bud metamers; a
  snapshot has no bud table), so a bare limb's tip counts: an upper bound that differs little,
  because C5 sheds bare limbs;
- robust width: the 5-95% spread of the tips in x, and in z (occupancy.py's "robust W").

Coordinates are unwrapped (a garden crown wider than the 16 m depth period laps itself), so the
offsets are the crown's own. 1 cell = 0.25 m.

    python3 docs/experiments/code/2026-11-11-garden-pathlength/dbh.py <run dir> ...

Writes <run dir>/allometry.csv: season, tree, species, dbh_cm, height_m, cr_m (the mean radius),
wx_m, wz_m (full extents), rx_m, rz_m (robust), n (metamers).
"""

import csv
import sys
from collections import defaultdict
from pathlib import Path

CELL = 0.25
BREAST = 1.3 / CELL


def measure(rows):
    n = len(rows)
    index = {r[0]: i for i, r in enumerate(rows)}
    parent = [index.get(r[1], -1) for r in rows]
    vol = [r[2] * r[2] * r[3] for r in rows]
    for i in range(n - 1, 0, -1):
        if parent[i] >= 0:
            vol[parent[i]] += vol[i]
    nxt = [-1] * n
    for i in range(1, n):
        p = parent[i]
        if p >= 0 and (nxt[p] < 0 or vol[i] > vol[nxt[p]]):
            nxt[p] = i
    at, along = 0, 0.0
    while True:
        before = along
        along += rows[at][3]
        if along >= BREAST or nxt[at] < 0:
            break
        at = nxt[at]
    _, _, radius, length, x0, y0, x1, y1, z0, z1 = rows[at]
    f = min(max(BREAST - before, 0.0), length) / length if length > 0 else 0.0
    sx, sz = x0 + (x1 - x0) * f, z0 + (z1 - z0) * f
    xs = sorted(r[6] for r in rows)
    zs = sorted(r[9] for r in rows)
    q = lambda v, p: v[min(n - 1, int(p * (n - 1) + 0.5))]
    ext = [xs[-1] - sx, sx - xs[0], zs[-1] - sz, sz - zs[0]]
    return {
        "dbh_cm": 2 * radius * CELL * 100,
        "height_m": (max(r[7] for r in rows) - rows[0][5]) * CELL,
        "cr_m": sum(max(e, 0.0) for e in ext) / 4 * CELL,
        "wx_m": (xs[-1] - xs[0]) * CELL,
        "wz_m": (zs[-1] - zs[0]) * CELL,
        "rx_m": (q(xs, 0.95) - q(xs, 0.05)) * CELL,
        "rz_m": (q(zs, 0.95) - q(zs, 0.05)) * CELL,
        "n": n,
    }


def one(run: Path):
    species = {}
    with open(run / "metrics.csv") as f:
        for r in csv.DictReader(f):
            species[r["tree"]] = r["species"]
    trees = defaultdict(list)
    with open(run / "metamers.csv") as f:
        rd = csv.reader(f)
        h = {k: i for i, k in enumerate(next(rd))}
        cols = [h[k] for k in ("birthId", "parentBirthId", "radius", "length", "x0", "y0", "x1", "y1", "z0", "z1")]
        s, t = h["season"], h["tree"]
        for r in rd:
            trees[(int(r[s]), r[t])].append(
                (r[cols[0]], r[cols[1]]) + tuple(float(r[c]) for c in cols[2:])
            )
    with open(run / "allometry.csv", "w", newline="") as f:
        w = None
        for (season, tree), rows in sorted(trees.items(), key=lambda kv: (kv[0][0], int(kv[0][1]))):
            m = {"season": season, "tree": tree, "species": species.get(tree, "?"), **measure(rows)}
            if w is None:
                w = csv.DictWriter(f, fieldnames=list(m))
                w.writeheader()
            w.writerow({k: (f"{v:.3f}" if isinstance(v, float) else v) for k, v in m.items()})


for d in sys.argv[1:]:
    # A finished run only (hash.txt is written last); one already measured is left alone.
    if Path(d, "hash.txt").exists() and not Path(d, "allometry.csv").exists():
        one(Path(d))
