"""The lean audit's geometry read (2026-11-05; docs/experiments/2026-11-05-lean-audit.md, "After ADR 0054"): what
`lean_audit.py`'s uniformity test cannot see, read from its cached summaries without re-running anything.

ADR 0054 turns each seedling's L by a per-tree azimuth, so half the leans now point into the slab's depth: a bounded
axis (D = 64 cells = 16 m, faces beyond which nothing grows), where x is a ring (the stand) or 160 cells (the lone
tree). A lean that the faces turn back would leave the azimuths concentrated on ±x, both signs, which a one-sided
Rayleigh test reads as uniform. So, per set:
  - an axial (doubled-angle) Rayleigh test: concentration on an axis, whichever sign;
  - the spread (SD) of the lean's x component against its depth component;
  - the share of trees whose top or crown centroid lies past the slab's faces (z ∉ [0, D]);
  - the lean as the frontal picture draws it (x against up) beside the 3D angle.

  uv run --project analysis python -I analysis/experiments/lean_geometry.py runs/lean-audit-v2-before runs/lean-audit-v2
"""

import json
import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from lean_audit import MIDDLE, SEEDS, rayleigh  # noqa: E402

DEPTH = 64 * 0.25  # metres: the slab's depth (params.world.depth, 64 cells; perArea's rows)
SETS = [f"{a}/{t}/L+x" for a in ("hand", "v3", "v4") for t in ("stand", "lone-open", "lone-0.2")]
ROWS = {"middle": MIDDLE, "all12": None, "front": [0, 1, 2, 3], "back": [8, 9, 10, 11]}


def load(root: Path, name: str, season: int) -> list[dict]:
    out = []
    for s in SEEDS:
        f = root / name / f"{s}.json"
        if f.exists():
            out += [dict(r, seed=s) for r in json.loads(f.read_text())["rows"] if r["season"] == season]
    return out


def read(rows: list[dict]) -> dict:
    if not rows:
        return {"n": 0}
    az = [r["az"] for r in rows]
    axial = rayleigh([(2 * a) % 360 for a in az])
    dx = np.array([r["dx"] for r in rows])
    dz = np.array([r["dy"] for r in rows])
    top = np.array([r["root"][1] + r["dy"] for r in rows])
    cen = np.array([r["root"][1] + r["cy"] for r in rows])
    front = np.degrees(np.arctan2(np.abs(dx), np.array([r["height"] for r in rows])))
    return {
        "n": len(rows), "rayleigh": rayleigh(az), "axial": {**axial, "axis": axial["mean"] / 2 if axial["n"] else None},
        "sd_x": float(dx.std(ddof=1)), "sd_depth": float(dz.std(ddof=1)),
        "top_outside": int(((top < 0) | (top > DEPTH)).sum()), "centroid_outside": int(((cen < 0) | (cen > DEPTH)).sum()),
        "lean3d": float(np.median([r["lean"] for r in rows])), "lean_frontal": float(np.median(front)),
    }


def main(roots: list[str]) -> None:
    out = {}
    for root in map(Path, roots):
        res = {}
        for name in SETS:
            season = 70 if "/stand/" in name else 100
            rows = load(root, name, season)
            parts = ROWS if "/stand/" in name else {"tree": None}
            for part, idx in parts.items():
                res[f"{name}:{part}"] = read([r for r in rows if idx is None or r["index"] in idx])
            res[f"{name}:age10"] = read(load(root, name, 10))
        out[root.name] = res
        print(f"\n## {root}")
        print(f"{'set':34s} {'n':>4s} {'Rayl R':>7s} {'p':>8s} {'axial R':>8s} {'p':>8s} {'axis':>6s} {'SD x':>6s} "
              f"{'SD z':>6s} {'top out':>8s} {'cen out':>8s} {'3D':>6s} {'front':>6s}")
        for k, d in res.items():
            if not d["n"]:
                continue
            r, a = d["rayleigh"], d["axial"]
            print(f"{k:34s} {d['n']:4d} {r['R']:7.2f} {r['p']:8.1e} {a['R']:8.2f} {a['p']:8.1e} {a['axis']:6.0f} "
                  f"{d['sd_x']:6.2f} {d['sd_depth']:6.2f} {d['top_outside']:8d} {d['centroid_outside']:8d} "
                  f"{d['lean3d']:6.1f} {d['lean_frontal']:6.1f}")
    Path(roots[-1], "geometry.json").write_text(json.dumps(out, indent=1, default=float))


if __name__ == "__main__":
    main(sys.argv[1:])
