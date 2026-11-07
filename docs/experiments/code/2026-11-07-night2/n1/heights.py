"""heights.py RUNSGLOB : per planted species, median height (m) / alive count / meanBudQ at chosen seasons."""
import sys, json, glob, polars as pl
SEAS = [10, 20, 30, 40, 60, 80, 100, 150]
rows = []
MAXS = int(sys.argv[2]) if len(sys.argv) > 2 else 999
for run in [r for r in sorted(glob.glob(sys.argv[1])) if int(r.rsplit("-s", 1)[1]) <= MAXS]:
    p = json.load(open(run + "/params.json")); n0 = len(p["trees"])
    sp = {i: t["species"] for i, t in enumerate(p["trees"])}
    m = pl.read_csv(run + "/run/metrics.csv", infer_schema_length=10000, columns=["season", "tree", "alive", "height", "meanBudQ", "production", "maintenance", "metamers"])
    m = m.filter((pl.col("tree") < n0) & pl.col("season").is_in(SEAS))
    m = m.with_columns(pl.col("tree").replace_strict(sp, return_dtype=pl.Utf8).alias("sp"))
    rows.append(m)
m = pl.concat(rows)
out = m.group_by(["sp", "season"]).agg([
    (pl.col("alive").sum()).alias("alive"), pl.len().alias("n"),
    (pl.col("height").filter(pl.col("alive") == 1).median() * 0.25).round(1).alias("h_m"),
    pl.col("meanBudQ").filter(pl.col("alive") == 1).median().round(3).alias("budQ"),
    pl.col("metamers").filter(pl.col("alive") == 1).median().alias("met"),
    (pl.col("production") / pl.col("maintenance")).filter(pl.col("alive") == 1).median().round(2).alias("P/M"),
]).sort(["sp", "season"])
with pl.Config(tbl_rows=200, tbl_cols=20, tbl_width_chars=200):
    print(out.pivot(on="season", index="sp", values="h_m"))
    print(out.pivot(on="season", index="sp", values="alive"))
    print(out.pivot(on="season", index="sp", values="budQ"))
    print(out.pivot(on="season", index="sp", values="P/M"))
