"""The oak's zigzag (the user's judging pass, 2026-11-02): "zigzag limbs fan upward from a low
fork, tall and open, no broad dome or stout trunk"; in the garden at 100 the trunks read as
lightning bolts. Oak's R2 has no relay and no elbows; its fit has dLambda 0.1154 over ramp 15:
apical control falls fast with ontogeny, so laterals overtake the leader and each takeover is a
kink. This runs the lone oak (the fresh-look harness's lone world) under variants, seeds 4–6, and
reads the trunk's straightness, the limbs' elevation and the crown's shape at 60 and 100.

    uv run --project analysis python docs/experiments/code/2026-11-02-overrides/oak-zigzag.py runs/overrides/oak
"""

from __future__ import annotations

import importlib.util
import json
import math
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import polars as pl

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("render", HERE.parent / "2026-11-01-fresh-look-beech" / "render.py")
render = importlib.util.module_from_spec(spec)
spec.loader.exec_module(render)
render.LONE_W = 240

PICK = {"r2.levels.1.setPoint": 35, "r2.levels.1.agedSetPoint": 85, "r2.levels.1.agedOver": 50}
VARIANTS = {
    "today": {},
    "pick": PICK,
    "pick-dl06": {**PICK, "r2.dLambda": 0.06},
    "pick-dl03": {**PICK, "r2.dLambda": 0.03},
    "pick-dl03-ramp40": {**PICK, "r2.dLambda": 0.03, "r2.ramp": 40},
    "pick-dl0": {**PICK, "r2.dLambda": 0.0},
}
SEEDS = (4, 5, 6)


def trunk_stats(m: pl.DataFrame, h: float) -> dict:
    """Order-0 path root → top: largest offset from the straight line, and turns > 15°."""
    m = m.sort("birthId")
    bid = m["birthId"].to_list(); index = {b: i for i, b in enumerate(bid)}
    parent = m["parentBirthId"].to_list(); order = m["order"].to_list()
    x0, y0, z0, x1, y1, z1 = (m[c].to_list() for c in ("x0", "y0", "z0", "x1", "y1", "z1"))
    trunk = [i for i in range(len(order)) if order[i] == 0]
    top = max(trunk, key=lambda i: y1[i])
    path = []
    i = top
    while i is not None:
        path.append(i)
        p = parent[i]
        i = index.get(p) if p >= 0 else None
    path.reverse()
    a = (x0[path[0]], y0[path[0]], z0[path[0]]); b = (x1[path[-1]], y1[path[-1]], z1[path[-1]])
    L = math.dist(a, b) or 1.0
    u = [(b[k] - a[k]) / L for k in range(3)]
    dev = 0.0
    for i in path:
        p = (x1[i] - a[0], y1[i] - a[1], z1[i] - a[2])
        s = sum(p[k] * u[k] for k in range(3))
        dev = max(dev, math.dist(p, tuple(s * u[k] for k in range(3))))
    turns = 0
    for i, j in zip(path, path[1:]):
        va = (x1[i] - x0[i], y1[i] - y0[i], z1[i] - z0[i]); vb = (x1[j] - x0[j], y1[j] - y0[j], z1[j] - z0[j])
        na, nb = math.hypot(*va), math.hypot(*vb)
        if na and nb:
            c = max(-1.0, min(1.0, sum(p * q for p, q in zip(va, vb)) / (na * nb)))
            turns += math.degrees(math.acos(c)) > 15
    return {"trunk top / H": y1[top] / h, "trunk offset / length": dev / L, "trunk turns > 15°": turns}


def main() -> None:
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    jobs = []
    for name, assigns in VARIANTS.items():
        patch = render.species_patch("oak", assigns or None, None)
        for s in SEEDS:
            jobs.append((patch, s, out / f"{name}-{s}"))
    with ThreadPoolExecutor(4) as ex:
        list(ex.map(lambda j: render.run("lone", "oak", j[0], j[1], j[2]), jobs))
    rows = []
    for name in VARIANTS:
        for s in SEEDS:
            for season in (60, 100):
                m, b, mt, f, _ = render.load(out / f"{name}-{s}", season)
                r, fr = mt.row(0, named=True), f.row(0, named=True)
                h = r["height"]
                rows.append({"variant": name, "seed": s, "season": season, "H": h,
                             "W/H": max(r["crownWidth"], r["crownDepth"]) / h,
                             "forkHeight": fr["forkHeight"], "limbElevation": fr["limbElevation"],
                             "widestAt": fr["widestAt"], **trunk_stats(m, h)})
    df = pl.DataFrame(rows)
    df.write_csv(out / "oak-zigzag.csv")
    agg = df.group_by("variant", "season", maintain_order=True).agg(pl.all().exclude("seed").median().round(2))
    with pl.Config(tbl_rows=40, tbl_cols=14, tbl_width_chars=200):
        print(agg.sort("season", "variant"))


if __name__ == "__main__":
    main()
