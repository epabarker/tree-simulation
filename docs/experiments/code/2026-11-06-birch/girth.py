import polars as pl, json, glob, sys
C=sys.argv[1]; tags=sys.argv[2].split(",")
rows=[]
for t in tags:
  for d in glob.glob(f"{C}/runs/{t}-w160-s*"):
    n=len(json.load(open(f"{d}/params.json"))["trees"])
    m=pl.read_csv(f"{d}/run/metrics.csv",infer_schema_length=0)
    m=m.with_columns([pl.col(c).cast(pl.Float64) for c in ("season","tree","alive","height","trunkRadius","buds","shortShoots","metamers","slenderness","leafCrownRatio","crownWidth")])
    b=m.filter((pl.col("species")=="birch")&(pl.col("alive")==1)&(pl.col("season").is_in([60.0,100.0,150.0]))&(pl.col("height")>=40))
    b=b.with_columns((pl.col("tree")<n).alias("planted"),(pl.col("trunkRadius")**2/(pl.col("buds")+pl.col("shortShoots"))*1e4).alias("r2leaf"),pl.lit(t).alias("tag"))
    rows.append(b)
df=pl.concat(rows)
pl.Config.set_tbl_cols(14); pl.Config.set_tbl_rows(40)
print(df.group_by(["tag","planted","season"]).agg(pl.len(),pl.col("height").median().round(1),pl.col("buds").median(),pl.col("trunkRadius").median().round(3),pl.col("slenderness").median().round(0),pl.col("r2leaf").median().round(2),pl.col("leafCrownRatio").median().round(2),(pl.col("crownWidth")/pl.col("height")).median().round(2).alias("W/H")).sort(["tag","planted","season"]))
