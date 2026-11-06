import sys
import polars as pl
run, season = sys.argv[1], int(sys.argv[2])
m = (pl.scan_csv(f"{run}/metamers.csv").filter(pl.col("season") == season)
     .select("x1", "y1", "z1", "order", "birthSeason", "length", "angle", "qSum", "nSum", "vIn").collect().with_row_index("metamer"))
b = pl.scan_csv(f"{run}/buds.csv").filter(pl.col("season") == season).select("metamer", "q", "leaf").collect()
H = m["y1"].max()
m = m.with_columns(band=((pl.col("y1") / H) * 10).floor().clip(0, 9).cast(pl.Int32),
                   dz=(pl.col("z1") - 32).abs(), dx=(pl.col("x1") - 80).abs())
new = m.filter(pl.col("birthSeason") >= season - 4)
print(run, season, "H", round(H, 1), "metamers", m.height, "born in last 5 seasons", new.height)
with pl.Config(tbl_rows=20, float_precision=3, tbl_width_chars=200):
    print(new.group_by("band").agg(n=pl.len(), dx50=pl.col("dx").median(), dz50=pl.col("dz").median(),
          up=(pl.col("angle")).median(), o=pl.col("order").median()).sort("band", descending=True))
    print("new by order"); print(new.group_by("order").len().sort("order"))
    # silhouette: leafy bud tips, front view
    lv = b.filter(pl.col("leaf") > 0).join(m, on="metamer")
    R = lv["dx"].quantile(0.98)
    sil = (lv.with_columns(r=(pl.col("dx") / R * 8).floor().clip(0, 8).cast(pl.Int32))
           .group_by("r").agg(top=pl.col("y1").quantile(0.98), bot=pl.col("y1").quantile(0.02), n=pl.len()).sort("r"))
    print("half-width R (98% |dx|)", round(R, 1)); print(sil)
    t0 = sil.filter(pl.col("r") == 0)["top"].item(); t6 = sil.filter(pl.col("r") == 6)["top"].item()
    print("dome index (top(0) - top(0.75R))/R =", round((t0 - t6) / R, 3), " hemisphere 0.34, flat 0")
