"""Selection measure (fixed 2026-11-06 before the variant runs): median, over seeds 1-20, of each seed's
median leafy buds per metamer ((buds - dormantBuds) / metamers) over live birch >= 40 cells at season 150."""
import polars as pl, glob, sys, statistics, os
for run in sys.argv[1:]:
    per=[]
    for sd in glob.glob(f"{run}/s*"):
        m=pl.read_csv(f"{sd}/stand/metrics.csv",infer_schema_length=0).with_columns([pl.col(c).cast(pl.Float64) for c in ("season","alive","height","metamers","buds","dormantBuds")])
        b=m.filter((pl.col("season")==150)&(pl.col("alive")==1)&(pl.col("species")=="birch")&(pl.col("height")>=40))
        if b.height: per.append(((b["buds"]-b["dormantBuds"])/b["metamers"]).median())
    print(f"{os.path.basename(run)}: birch leafy/metamer at 150, median over {len(per)} seeds with birch: {statistics.median(per):.3f}" if per else f"{run}: no birch")
