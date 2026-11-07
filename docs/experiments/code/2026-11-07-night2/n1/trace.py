"""trace.py RUNDIR [species] [every] : per planted tree of a species, season by season."""
import sys, json, polars as pl
run = sys.argv[1]; sp = sys.argv[2] if len(sys.argv) > 2 else "beech"; every = int(sys.argv[3]) if len(sys.argv) > 3 else 10
p = json.load(open(run + "/params.json"))
planted = [i for i, t in enumerate(p["trees"]) if t["species"] == sp]
m = pl.read_csv(run + "/run/metrics.csv", infer_schema_length=10000)
cols = ["season", "alive", "height", "metamers", "buds", "dormantBuds", "shortShoots", "qBase", "meanBudQ", "groundLight", "production", "maintenance", "reserve", "starved", "shed", "trunkRadius", "leafBase", "crownWidth"]
for t in planted:
    x = m.filter(pl.col("tree") == t).select(cols)
    x = x.filter((pl.col("season") % every == 0) | (pl.col("season") <= 3) | (pl.col("alive") == 0))
    print(f"--- tree {t} x {p['trees'][t]['x']:.0f}")
    with pl.Config(tbl_rows=60, tbl_cols=30, float_precision=3, tbl_width_chars=250):
        print(x.head(40))
