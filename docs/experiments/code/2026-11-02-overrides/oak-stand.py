"""The oak's zigzag in the stand (the garden's "lightning bolts"): the closed stand of oaks
(render.py's stand trial, 84 wide, 12 trees) under the lone sweep's variants, seeds 4–6, at 100:
every live tree's trunk straightness (order-0 path, largest offset from straight as a share of
its length; turns > 15° between metamers), with the stand's survival and LAI beside.

    uv run --project analysis python docs/experiments/code/2026-11-02-overrides/oak-stand.py runs/overrides/oak-stand
"""

from __future__ import annotations

import importlib.util
import math
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import polars as pl

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("render", HERE.parent / "2026-11-01-fresh-look-beech" / "render.py")
render = importlib.util.module_from_spec(spec)
spec.loader.exec_module(render)
zig = importlib.util.spec_from_file_location("zig", HERE / "oak-zigzag.py")
oz = importlib.util.module_from_spec(zig)
zig.loader.exec_module(oz)
SEEDS = (4, 5, 6)


def main() -> None:
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    jobs = []
    for name, assigns in oz.VARIANTS.items():
        patch = render.species_patch("oak", assigns or None, None)
        for s in SEEDS:
            jobs.append((patch, s, out / f"{name}-{s}"))
    with ThreadPoolExecutor(4) as ex:
        list(ex.map(lambda j: render.run("stand", "oak", j[0], j[1], j[2]), jobs))
    rows = []
    for name in oz.VARIANTS:
        for s in SEEDS:
            m, b, mt, f, g = render.load(out / f"{name}-{s}", 100)
            nums = render.stand_numbers(mt, g)
            alive = mt.filter(pl.col("alive") == 1)
            for r in alive.iter_rows(named=True):
                tm = m.filter(pl.col("tree") == r["tree"])
                st = oz.trunk_stats(tm, r["height"])
                rows.append({"variant": name, "seed": s, "tree": r["tree"], "H": r["height"], **st,
                             "alive": int(nums["alive"].split("/")[0]), "LAI": nums["LAI"], "H/D": nums["H/D"]})
    df = pl.DataFrame(rows)
    df.write_csv(out / "oak-stand.csv")
    agg = df.group_by("variant", maintain_order=True).agg(
        pl.len().alias("trees"), pl.col("H").median().round(0),
        pl.col("trunk top / H").median().round(2),
        pl.col("trunk offset / length").median().round(3),
        pl.col("trunk offset / length").quantile(0.9).round(3).alias("offset p90"),
        pl.col("trunk turns > 15°").median(), pl.col("trunk turns > 15°").quantile(0.9).alias("turns p90"),
        pl.col("alive").median(), pl.col("LAI").median().round(2), pl.col("H/D").median().round(0))
    with pl.Config(tbl_cols=14, tbl_width_chars=200):
        print(agg)


if __name__ == "__main__":
    main()
