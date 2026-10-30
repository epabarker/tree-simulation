"""Form step 1: planted trees by season (median/tallest height, alive, metamers broken by R3 that season, median H/D), forest runs.

    uv run --project analysis python docs/experiments/code/2026-10-30-form/collapse.py runs/form
"""
import sys, polars as pl
d=sys.argv[1]
for v in ("base-t02","k8-t02","k8-t0"):
    print(v)
    for s in (1,2,3):
        m=pl.read_csv(f"{d}/forest/{v}-s{s}/metrics.csv",infer_schema_length=0).with_columns(pl.exclude("species").cast(pl.Float64))
        p=m.filter(pl.col("tree")<30)
        g=p.group_by("season").agg(
            pl.col("height").filter(pl.col("alive")==1).median().alias("h"),
            pl.col("height").filter(pl.col("alive")==1).max().alias("hmax"),
            (pl.col("alive")==1).sum().alias("alive"),
            pl.col("broken").filter(pl.col("alive")==1).sum().alias("broken"),
            pl.col("slenderness").filter(pl.col("alive")==1).median().alias("hd"),
        ).sort("season")
        rows=g.filter(pl.col("season").is_in([float(x) for x in range(140,301,10)])).rows()
        print(f" s{s}: "+" ".join(f"{int(r[0])}:{r[1]:.0f}/{r[2]:.0f} a{r[3]} b{r[4]:.0f} hd{r[5]:.0f}" for r in rows))
        # broken metamers per season, all planted, 140-210
        b=g.filter((pl.col("season")>=140)&(pl.col("season")<=210)).select("season","broken","h").rows()
        big=[(int(x),int(y)) for x,y,_ in b if y>200]
        print("   seasons with >200 broken:",big[:15])
