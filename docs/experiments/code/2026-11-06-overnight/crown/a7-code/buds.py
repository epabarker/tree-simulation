import sys
import polars as pl
run, season = sys.argv[1], int(sys.argv[2])
b = pl.scan_csv(f"{run}/buds.csv").filter(pl.col("season") == season).collect()
m = (pl.scan_csv(f"{run}/metamers.csv").filter(pl.col("season") == season)
     .select("x1", "y1", "z1", "order").collect().with_row_index("metamer"))
d = b.join(m, on="metamer", how="left")
H = d["y1"].max()
d = d.with_columns(
    band=((pl.col("y1") / H) * 10).floor().clip(0, 9).cast(pl.Int32),
    dz=(pl.col("z1") - 32).abs(), dx=(pl.col("x1") - 80).abs(),
    live=pl.col("state").is_in([0, 1, 2, 3, 5]),
)
print(run, "season", season, "H", round(H, 1), "buds", d.height)
print(d.group_by("state").len().sort("state"))
lv = d.filter(pl.col("leaf") > 0)
print("leafy buds: x extent", lv["dx"].max(), " z extent", lv["dz"].max(), " outside slab:", lv.filter((pl.col("z1") < 0) | (pl.col("z1") >= 64)).height)
t = (lv.group_by("band").agg(
        n=pl.len(), q=pl.col("q").mean(), q90=pl.col("q").quantile(0.9),
        v1=(pl.col("v") >= 1).mean(), v3=(pl.col("v") >= 3).mean(),
        dx90=pl.col("dx").quantile(0.9), dz90=pl.col("dz").quantile(0.9),
        nearface=(pl.col("dz") > 24).mean(),
     ).sort("band", descending=True))
with pl.Config(tbl_rows=20, float_precision=3, tbl_width_chars=200):
    print(t)
    # light against depth position, the middle of the crown's height
    u = (lv.with_columns(zb=(pl.col("dz") / 8).floor().cast(pl.Int32), xb=(pl.col("dx") / 16).floor().cast(pl.Int32))
         .filter(pl.col("band").is_between(3, 6))
         .group_by("zb").agg(n=pl.len(), q=pl.col("q").mean(), v1=(pl.col("v") >= 1).mean()).sort("zb"))
    print("bands 0.3-0.7 H, by |z-32| in 8s"); print(u)
    u = (lv.with_columns(xb=(pl.col("dx") / 16).floor().cast(pl.Int32))
         .filter(pl.col("band").is_between(3, 6))
         .group_by("xb").agg(n=pl.len(), q=pl.col("q").mean(), v1=(pl.col("v") >= 1).mean()).sort("xb"))
    print("bands 0.3-0.7 H, by |x-80| in 16s"); print(u)
    # where growth happens: buds with v>=1 by band
    g = d.filter(pl.col("v") >= 1)
    print("buds with v>=1:", g.height, "share in top fifth", (g["band"] >= 8).mean(), " v per Q (median v/q, q>0.05):",
          d.filter(pl.col("q") > 0.05).select((pl.col("v") / pl.col("q")).median()).item())
    vq = (d.filter(pl.col("q") > 0).with_columns(qb=(pl.col("q") * 10).floor().clip(0, 9))
          .group_by("qb").agg(n=pl.len(), v=pl.col("v").median(), v1=(pl.col("v") >= 1).mean(), v3=(pl.col("v") >= 3).mean()).sort("qb"))
    print("v by Q decile"); print(vq)
