"""Round 2, Part 2, step 1: the beech stand's leafy boles and wavy stems, diagnosed (2026-11-02).

The blind namers read the stand at 100 as lime ("pale grey stems with leafy sprouts") or aspen
("pale, slightly wavy stems with lumpy crowns"). This reads, for every live tree of the closed
stand at 100 (render.py's: 84 wide, periodic, 12 trees), from an evidence20.py output folder:

- **Leaf on the bole:** leaf area below the tree's limb crown base (metrics' limbBase), as a share
  of the tree's leaf; the share of it on R6 short shoots (bud state 5); the share on buds of the
  trunk's own metamers (order 0: nothing C5 can shed with a branch); and, for the rest, whether the
  branch's first metamer was born ≥ 10 seasons after the trunk metamer it grows from (a late shoot:
  a released or epicormic bud, R4) or with it (an original lateral that survived).
- **Wavy boles:** the trunk is the order-0 path from the root to the top. Over the clear bole (root
  to limbBase): the largest horizontal distance of the path from the straight line joining its
  ends, as a share of the clear length; and the number of times the path turns by > 15° from one
  metamer to the next.

    uv run --project analysis python docs/experiments/code/2026-11-02-beech-round2/stand-diagnosis.py \
        runs/fresh-look/evidence20-today runs/fresh-look/evidence20-repair-notvig ...
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import polars as pl

SEASON = 100
LATE = 10


def tree_rows(out: Path) -> list[dict]:
    m = pl.read_csv(out / "metamers.csv", infer_schema_length=None).filter(pl.col("season") == SEASON)
    b = pl.read_csv(out / "buds.csv", infer_schema_length=None).filter((pl.col("season") == SEASON) & (pl.col("leaf") > 0))
    mt = pl.read_csv(out / "metrics.csv", infer_schema_length=None).filter((pl.col("season") == SEASON) & (pl.col("alive") == 1))
    rows = []
    for r in mt.iter_rows(named=True):
        t = r["tree"]
        tm = m.filter(pl.col("tree") == t)
        parent = tm["parentBirthId"].to_list()
        bid = tm["birthId"].to_list()
        index = {x: i for i, x in enumerate(bid)}
        order = tm["order"].to_list()
        born = tm["birthSeason"].to_list()
        y0, y1 = tm["y0"].to_list(), tm["y1"].to_list()
        x0, x1, z0, z1 = tm["x0"].to_list(), tm["x1"].to_list(), tm["z0"].to_list(), tm["z1"].to_list()
        base = r["limbBase"]
        tb = b.filter(pl.col("tree") == t)
        leaf = float(tb["leaf"].sum())
        low = tb.filter(pl.col("y") < base)
        late = early = on_trunk = short = 0.0
        heights = []
        for mi, lf, st in zip(low["metamer"].to_list(), low["leaf"].to_list(), low["state"].to_list()):
            short += lf if st == 5 else 0.0
            # Walk to the first order-0 ancestor; the child just below it is the branch's base.
            i, child = mi, None
            while order[i] != 0:
                child = i
                p = parent[i]
                i = index[p]
            if child is None:  # a bud of a trunk metamer: no branch to be shed with
                on_trunk += lf
                continue
            heights.append(y1[i])
            if born[child] - born[i] >= LATE:
                late += lf
            else:
                early += lf
        # The trunk: order-0 path from the root to the highest order-0 metamer.
        trunk = [i for i in range(len(order)) if order[i] == 0]
        top = max(trunk, key=lambda i: y1[i]) if trunk else None
        path = []
        i = top
        while i is not None:
            path.append(i)
            p = parent[i]
            i = index.get(p) if p >= 0 else None
        path.reverse()
        clear = [i for i in path if y1[i] <= base] or path[:1]
        ax, ay, az = x0[clear[0]], y0[clear[0]], z0[clear[0]]
        bx, by, bz = x1[clear[-1]], y1[clear[-1]], z1[clear[-1]]
        L = math.dist((ax, ay, az), (bx, by, bz)) or 1.0
        ux, uy, uz = (bx - ax) / L, (by - ay) / L, (bz - az) / L
        dev = 0.0
        for i in clear:
            px, py, pz = x1[i] - ax, y1[i] - ay, z1[i] - az
            s = px * ux + py * uy + pz * uz
            dev = max(dev, math.dist((px, py, pz), (s * ux, s * uy, s * uz)))
        turns = 0
        for a, c in zip(clear, clear[1:]):
            va = (x1[a] - x0[a], y1[a] - y0[a], z1[a] - z0[a])
            vc = (x1[c] - x0[c], y1[c] - y0[c], z1[c] - z0[c])
            na, nc = math.hypot(*va), math.hypot(*vc)
            if na and nc:
                cos = max(-1.0, min(1.0, sum(p * q for p, q in zip(va, vc)) / (na * nc)))
                turns += math.degrees(math.acos(cos)) > 15
        rows.append({
            "tree": t,
            "height": r["height"],
            "limbBase": base,
            "limbCrownRatio": r["limbCrownRatio"],
            "leaf below limb base": (late + early + on_trunk) / leaf if leaf else 0.0,
            "of it, short shoots": short / (late + early + on_trunk) if late + early + on_trunk else None,
            "of it, on the trunk": on_trunk / (late + early + on_trunk) if late + early + on_trunk else None,
            "of it, late branches": late / (late + early + on_trunk) if late + early + on_trunk else None,
            "branches below (attach median y / H)": (sorted(heights)[len(heights) // 2] / r["height"]) if heights else None,
            "epicormic (run total)": r["epicormic"],
            "released (run total)": r["released"],
            "bole deviation / clear length": dev / L,
            "bole turns > 15°": turns,
        })
    return rows


def main() -> None:
    allr = []
    for d in map(Path, sys.argv[1:]):
        for s in sorted(d.glob("stand-*"), key=lambda p: int(p.name.split("-")[1])):
            for r in tree_rows(s):
                allr.append({"config": d.name, "seed": int(s.name.split("-")[1]), **r})
    df = pl.DataFrame(allr)
    out = Path(sys.argv[-1]).parent / "stand-diagnosis.csv"
    df.write_csv(out)
    agg = df.group_by("config", maintain_order=True).agg(
        pl.len().alias("trees"),
        pl.col("leaf below limb base").median().round(3),
        pl.col("leaf below limb base").quantile(0.9).round(3).alias("leaf below, p90"),
        pl.col("of it, short shoots").median().round(2),
        pl.col("of it, on the trunk").median().round(2),
        pl.col("of it, late branches").median().round(2),
        pl.col("limbCrownRatio").median().round(3),
        pl.col("epicormic (run total)").median(),
        pl.col("released (run total)").median(),
        pl.col("bole deviation / clear length").median().round(3),
        pl.col("bole deviation / clear length").quantile(0.9).round(3).alias("deviation p90"),
        pl.col("bole turns > 15°").median(),
        pl.col("bole turns > 15°").quantile(0.9).alias("turns p90"),
    )
    with pl.Config(tbl_cols=20, tbl_width_chars=250):
        print(agg)
    print(out)


if __name__ == "__main__":
    main()
