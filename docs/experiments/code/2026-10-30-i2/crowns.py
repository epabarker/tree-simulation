"""I2's crowns from the CLI's metamers.csv (z0, z1 since I2): per season, the median tree's height
and crown depth (the z extent of its metamers' tips), and the share of all tips in each 4-cell band
across the slab, front face first, with the outer 2 cells on both sides ("faces", against an even
spread's 4/D), as the prototype's note §3 reported them (it counted live buds; these are tips).

  python3 docs/experiments/code/2026-10-30-i2/crowns.py runs/i2-crowns/full-interior [D] [planted]

With `planted` (the count of planted trees, ids 0…planted−1), the height and depth are of the planted
trees alone (O4's recruits are small and many); the bands are of every tip.
"""
import sys

import polars as pl

run = sys.argv[1]
D = int(sys.argv[2]) if len(sys.argv) > 2 else 64
planted = int(sys.argv[3]) if len(sys.argv) > 3 else None
m = pl.read_csv(f"{run}/metamers.csv")
for season in sorted(m["season"].unique()):
    s = m.filter(pl.col("season") == season)
    per = s.group_by("tree").agg(
        pl.col("y1").max().alias("h"),
        (pl.col("z1").max() - pl.col("z1").min()).alias("depth"),
        pl.len().alias("n"),
    ).filter(pl.col("n") > 50)
    if planted is not None:
        per = per.filter(pl.col("tree") < planted)
    z = s["z1"].to_numpy()
    bands = [((z >= b) & (z < b + 4)).mean() * 100 for b in range(0, D, 4)]
    faces = ((z < 2) | (z >= D - 2)).mean() * 100
    beyond = int(((z < 0) | (z >= D)).sum())
    print(
        f"season {season}: {len(per)} trees, height p50 {per['h'].median():.1f}, crown depth p50 {per['depth'].median():.1f} "
        f"(depth/height {(per['depth'] / per['h']).median():.2f}); faces {faces:.1f}% (even {400 / D:.1f}), beyond {beyond}"
    )
    print("  bands: " + " ".join(f"{b:.1f}" for b in bands))
