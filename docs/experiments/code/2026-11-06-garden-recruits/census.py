import polars as pl, sys, glob, json, os
S=sys.argv[1]; tag=sys.argv[2] if len(sys.argv)>2 else "base"
rows=[]
for d in sorted(glob.glob(f"{S}/runs/{tag}-w*-s*")):
    w,sd=os.path.basename(d).split('-')[1:]
    n=len(json.load(open(f"{d}/params.json"))["trees"])
    m=pl.read_csv(f"{d}/run/metrics.csv",infer_schema_length=0).select(
        pl.col("season").cast(pl.Int32),pl.col("tree").cast(pl.Int32),pl.col("alive").cast(pl.Int32),
        pl.col("height").cast(pl.Float64),pl.col("seeds").cast(pl.Float64),pl.col("species"))
    live=m.filter(pl.col("alive")==1)
    for s in (20,40,60,80,100,150,200,300):
        L=live.filter(pl.col("season")==s)
        rec=L.filter(pl.col("tree")>=n)
        rows.append(dict(w=w,seed=sd,s=s,planted=n,pl_alive=L.height-rec.height,recruits=rec.height,
          small=rec.filter(pl.col("height")<20).height, mid=rec.filter((pl.col("height")>=20)&(pl.col("height")<80)).height,
          big=rec.filter(pl.col("height")>=80).height))
    first=m.filter(pl.col("tree")>=n)["season"].min()
    seeds_by=m.filter(pl.col("seeds")>0).group_by("species").agg(pl.col("season").min().alias("firstSeedSeason"))
    print(w,sd,"planted",n,"first recruit season",first, dict(zip(seeds_by["species"],seeds_by["firstSeedSeason"])))
df=pl.DataFrame(rows)
pl.Config.set_tbl_rows(200); pl.Config.set_tbl_cols(20)
print(df.group_by(["w","s"]).agg(pl.col("planted").median(),pl.col("pl_alive").median(),pl.col("recruits").median(),pl.col("small").median(),pl.col("mid").median(),pl.col("big").median()).sort(["w","s"]))
