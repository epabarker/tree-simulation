"""Reach from the root at season 100 (max horizontal distance of any metamer end, per axis and
radial), budsOutside, height and peak memory. Usage: reach.py <runs dir> [<baseline dir>]"""

import sys
from pathlib import Path

import polars as pl

CELL = 0.25


def load(root: Path) -> pl.DataFrame:
    rows = []
    for d in sorted(p for p in root.iterdir() if (p / "hash.txt").exists()):
        sp, seed = d.name.rsplit("-s", 1)
        mm = pl.read_csv(d / "metamers.csv", columns=["season", "tree", "x0", "x1", "z0", "z1", "y1"])
        mm = mm.filter((pl.col("tree") == 0) & (pl.col("season") == mm["season"].max()))
        rx, rz = mm["x0"][0], mm["z0"][0]
        dx = max((mm["x1"] - rx).abs().max(), (mm["x0"] - rx).abs().max())
        dz = max((mm["z1"] - rz).abs().max(), (mm["z0"] - rz).abs().max())
        rad = ((mm["x1"] - rx) ** 2 + (mm["z1"] - rz) ** 2).sqrt().max()
        m = pl.read_csv(d / "metrics.csv", infer_schema_length=0).filter(pl.col("tree") == "0")
        bo = m["budsOutside"].cast(pl.Float64)
        t = (d.parent / f"{d.name}.time").read_text().split()
        rows.append(
            {
                "species": sp,
                "seed": int(seed),
                "season": int(mm["season"][0]),
                "axis_m": max(dx, dz) * CELL,  # what a square box must hold
                "radial_m": rad * CELL,
                "top_m": mm["y1"].max() * CELL,
                "maxH_m": m["height"].cast(pl.Float64).max() * CELL,
                "outSeasons": int((bo > 0).sum()),
                "out100": bo[-1],
                "secs": float(t[0]),
                "MB": float(t[2]) / 1024,
            }
        )
    return pl.DataFrame(rows).sort("species", "seed")


pl.Config.set_tbl_rows(100)
pl.Config.set_tbl_cols(20)
df = load(Path(sys.argv[1]))
print(df)
print(
    df.group_by("species")
    .agg(
        pl.len().alias("n"),
        pl.col("axis_m").median().round(1).alias("axis med"),
        pl.col("axis_m").max().round(1).alias("axis max"),
        pl.col("radial_m").max().round(1).alias("radial max"),
        pl.col("maxH_m").max().round(1).alias("tallest ever"),
        (pl.col("outSeasons") == 0).sum().alias("zero every season"),
        pl.col("MB").max().round(0).alias("peak MB"),
        pl.col("secs").max().round(0).alias("max s"),
    )
    .sort("species")
)
if len(sys.argv) > 2:
    b = load(Path(sys.argv[2])).select("species", "seed", pl.col("axis_m").alias("before"))
    j = df.join(b, on=["species", "seed"]).with_columns((pl.col("axis_m") - pl.col("before")).alias("d"))
    print(
        j.group_by("species")
        .agg(
            pl.len().alias("pairs"),
            pl.col("before").max().round(1).alias("before max"),
            pl.col("axis_m").max().round(1).alias("after max"),
            pl.col("d").median().round(1).alias("median d"),
            pl.col("d").min().round(1).alias("min d"),
            pl.col("d").max().round(1).alias("max d"),
            (pl.col("d") > 0).sum().alias("wider"),
        )
        .sort("species")
    )
