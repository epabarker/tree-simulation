import sys
import polars as pl
run, season = sys.argv[1], int(sys.argv[2])
m = (pl.scan_csv(f"{run}/metamers.csv").filter(pl.col("season") == season)
     .select("length", "birthSeason").collect())
print(run, season, "metamers", m.height)
print("length quantiles 5/25/50/75/95:", [round(m["length"].quantile(q), 3) for q in (0.05, .25, .5, .75, .95)],
      " CV", round(m["length"].std() / m["length"].mean(), 3),
      " share within 1.000±0.01:", round(((m["length"] - 1).abs() < 0.01).mean(), 3))
print(m.with_columns(era=(pl.col("birthSeason") // 10 * 10)).group_by("era").agg(
    n=pl.len(), med=pl.col("length").median(), cv=pl.col("length").std() / pl.col("length").mean(),
    one=((pl.col("length") - 1).abs() < 0.01).mean()).sort("era"))
