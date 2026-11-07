"""shadesum.py GLOB : shade-house beech: death season per seed, and median trajectory."""
import sys, glob, polars as pl
for g in sys.argv[1:]:
    runs = sorted(glob.glob(g)); res = []; traj = []
    for run in runs:
        m = pl.read_csv(run + "/run/metrics.csv", infer_schema_length=10000).filter(pl.col("tree") == 0)
        d = m.filter(pl.col("alive") == 0)
        res.append(d["season"][0] if d.height else None)
        traj.append(m.filter(pl.col("season").is_in([10, 20, 30, 50, 80, 100, 150]) & (pl.col("alive") == 1)))
    t = pl.concat(traj).group_by("season").agg(pl.len().alias("n"), (pl.col("height").median() * 0.25).round(1).alias("h_m"), pl.col("metamers").median(),
        pl.col("shortShoots").median(), pl.col("meanBudQ").median().round(3), pl.col("groundLight").median().round(3),
        pl.col("production").median().round(1), pl.col("maintenance").median().round(1), (pl.col("crownWidth") * 0.25).median().round(1).alias("w_m")).sort("season")
    print(g, "alive at 150:", sum(r is None for r in res), "/", len(res), "deaths", sorted(r for r in res if r is not None))
    with pl.Config(tbl_rows=20, tbl_width_chars=200): print(t)
