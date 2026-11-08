import polars as pl
import sys
IN = sys.argv[1] + "/"
b = pl.read_csv(IN + "q_buds.csv").filter(pl.col("season")==120)
top = b.group_by("case").agg(pl.col("y").max().alias("top"))
b = b.join(top, on="case").with_columns(
  zb=pl.when(pl.col("z")<4).then(pl.lit("1 front edge 0-1m")).when(pl.col("z")<16).then(pl.lit("2 front 1-4m"))
     .when(pl.col("z")<48).then(pl.lit("3 middle")).when(pl.col("z")<60).then(pl.lit("4 back 1-4m")).otherwise(pl.lit("5 back edge 0-1m")),
  yb=pl.when(pl.col("y")<pl.col("top")/3).then(pl.lit("low")).when(pl.col("y")<2*pl.col("top")/3).then(pl.lit("mid")).otherwise(pl.lit("high")))
t = b.group_by(["case","yb","zb"]).agg(pl.col("q").median().round(3).alias("q"), pl.len().alias("n")).sort(["case","yb","zb"])
pl.Config.set_tbl_rows(100)
w = t.pivot(on="yb", index=["case","zb"], values=["q","n"]).sort(["case","zb"])
print(w.select(["case","zb","q_low","q_mid","q_high","n_low","n_mid","n_high"]))
o = b.filter(pl.col("case").str.starts_with("oak")).with_columns(
  xb=pl.when((pl.col("x")<8)|(pl.col("x")>=152)).then(pl.lit("x edge 0-2m")).otherwise(pl.lit("x interior")))
print(o.filter(pl.col("zb")=="3 middle").group_by(["case","yb","xb"]).agg(pl.col("q").median().round(3), pl.len()).sort(["case","yb","xb"]))
print(b.group_by("case").agg(pl.len(), pl.col("z").quantile(0.05).alias("z05"), pl.col("z").quantile(0.95).alias("z95"), pl.col("x").min(), pl.col("x").max()))
