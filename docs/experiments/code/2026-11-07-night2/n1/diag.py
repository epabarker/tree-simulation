"""diag.py RUNSGLOB : planted beech, median trajectory over all trees (alive or not) and death seasons."""
import sys, json, glob, polars as pl
SEAS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 100, 150]
rows = []; deaths = []
for run in sorted(glob.glob(sys.argv[1])):
    p = json.load(open(run + "/params.json"))
    planted = [i for i, t in enumerate(p["trees"]) if t["species"] == "beech"]
    m = pl.read_csv(run + "/run/metrics.csv", infer_schema_length=10000)
    m = m.filter(pl.col("tree").is_in(planted))
    for t in planted:
        x = m.filter(pl.col("tree") == t)
        d = x.filter(pl.col("alive") == 0)
        if d.height:
            r = d.row(0, named=True)
            last = x.filter(pl.col("alive") == 1).tail(1).row(0, named=True)
            deaths.append((run.rsplit("-s", 1)[1], t, r["season"], round(r["height"] * 0.25, 1), r["metamers"], last["starved"]))
        else:
            deaths.append((run.rsplit("-s", 1)[1], t, None, round(x.tail(1)["height"][0] * 0.25, 1), x.tail(1)["metamers"][0], 0))
    rows.append(m.filter(pl.col("season").is_in(SEAS) & (pl.col("alive") == 1)))
m = pl.concat(rows)
out = m.group_by("season").agg([
    pl.len().alias("alive"),
    (pl.col("height").median() * 0.25).round(1).alias("h_m"),
    pl.col("metamers").median().alias("met"),
    pl.col("shortShoots").median().alias("ss"),
    (pl.col("buds") - pl.col("dormantBuds") - pl.col("shortShoots")).median().alias("active"),
    pl.col("dormantBuds").median().alias("dorm"),
    pl.col("meanBudQ").median().round(3).alias("budQ"),
    pl.col("groundLight").median().round(3).alias("ground"),
    pl.col("production").median().round(1).alias("P"),
    pl.col("maintenance").median().round(1).alias("M"),
    pl.col("reserve").median().round(1).alias("res"),
    pl.col("shed").median().alias("shed/season"),
    pl.col("aborted").median().alias("aborted"),
    pl.col("released").median().alias("released"),
    (pl.col("crownWidth") * 0.25).median().round(1).alias("width_m"),
    pl.col("slenderness").median().round(0).alias("H/D"),
]).sort("season")
with pl.Config(tbl_rows=50, tbl_cols=30, tbl_width_chars=250):
    print(out)
ds = sorted([d[2] for d in deaths if d[2] is not None])
print("deaths", len(ds), "of", len(deaths), "death seasons", ds)
print("at death (height m, metamers):", [(d[3], d[4]) for d in deaths if d[2] is not None])
