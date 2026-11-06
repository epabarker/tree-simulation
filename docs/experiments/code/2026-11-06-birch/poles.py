"""Birch poles gate (fixed 2026-11-06 before the 20-seed run): per seed, the median slenderness of
birch recruits alive at season 100 and >= 40 cells tall; a seed passes at <= 120 or with none such.
Pass: >= 15 of 20 seeds."""
import polars as pl, json, glob, os, sys, statistics
for run in sys.argv[1:]:
    res=[]
    for sd in sorted(glob.glob(f"{run}/s*"), key=lambda p:int(p.rsplit('s',1)[1])):
        n=len(json.load(open(f"{sd}/params.json"))["trees"])
        m=pl.read_csv(f"{sd}/stand/metrics.csv",infer_schema_length=0).with_columns([pl.col(c).cast(pl.Float64) for c in ("season","tree","alive","height","slenderness")])
        b=m.filter((pl.col("season")==100)&(pl.col("alive")==1)&(pl.col("species")=="birch")&(pl.col("tree")>=n)&(pl.col("height")>=40))
        med=b["slenderness"].median() if b.height else None
        res.append((os.path.basename(sd), b.height, med))
    passes=sum(1 for _,k,med in res if med is None or med<=120)
    meds=[med for _,_,med in res if med is not None]
    print(f"{os.path.basename(run)}: {passes}/20 pass; tall birch recruits per seed median {statistics.median([k for _,k,_ in res])}; their H/D median-of-medians {statistics.median(meds) if meds else None:.0f}" if meds else f"{run}: {passes}/20")
    print("   ", " ".join(f"{s}:{k}/{'-' if med is None else round(med)}" for s,k,med in res))
