"""surv.py RUNSGLOB : planted beech alive at 150 per seed (and heights in m); beech recruits alive at 150."""
import sys, json, glob, polars as pl
tot = alive = 0; rtot = 0
runs = sorted(glob.glob(sys.argv[1]), key=lambda r: int(r.rsplit("-s", 1)[1]))
for run in runs:
    p = json.load(open(run + "/params.json")); n0 = len(p["trees"])
    planted = [i for i, t in enumerate(p["trees"]) if t["species"] == "beech"]
    m = pl.read_csv(run + "/run/metrics.csv", infer_schema_length=10000, columns=["season", "tree", "alive", "species", "height"])
    last = m["season"].max()
    L = m.filter(pl.col("season") == last)
    a = L.filter(pl.col("tree").is_in(planted) & (pl.col("alive") == 1))
    r = L.filter((pl.col("tree") >= n0) & (pl.col("species") == "beech") & (pl.col("alive") == 1))
    tot += len(planted); alive += a.height; rtot += r.height
    print(run.rsplit("-s", 1)[1], f"{a.height}/{len(planted)}", [round(h * 0.25, 1) for h in a["height"].to_list()], "recruits", r.height)
print(f"{sys.argv[1]}: planted beech alive at {last}: {alive}/{tot}; beech recruits alive {rtot}")
