"""causes.py GLOB : planted beech, per season bin: branches shed by cause (carbon deficit only / T_rel only / both),
their light weight n_b, metamers grown, buds held leafless by the lifespan (old-wood spurs), live short shoots."""
import sys, glob, json, polars as pl
rows = []
for run in sorted(glob.glob(sys.argv[1])):
    p = json.load(open(run + "/params.json"))
    planted = {i for i, t in enumerate(p["trees"]) if t["species"] == "beech"}
    seed = run.rsplit("-s", 1)[1]
    shed = {}; grow = {}
    for line in open(run + "/n1.txt"):
        f = line.split()
        if f[0] == "N1SHED" and int(f[2]) in planted:
            shed[(int(float(f[1])), int(f[2]))] = [float(x) for x in f[4:10]]
        elif f[0] == "N1GROW" and int(f[2]) in planted:
            grow[(int(float(f[1])), int(f[2]))] = (int(f[4]) - int(f[3]), int(f[5]), int(f[6]))
    for k, g in grow.items():
        s = shed.get(k, [0] * 6)
        rows.append(dict(seed=seed, season=k[0], tree=k[1], grown=g[0], heldLeafless=g[1], spurs=g[2],
                         shedDef=s[0], shedTrel=s[1], shedBoth=s[2], wDef=s[3], wTrel=s[4], wBoth=s[5]))
df = pl.DataFrame(rows).with_columns(((pl.col("season") - 1) // 10 * 10 + 1).alias("bin"))
out = df.group_by("bin").agg(pl.len().alias("tree-seasons"), *[pl.col(c).mean().round(2) for c in
      ("grown", "spurs", "heldLeafless", "shedDef", "shedTrel", "shedBoth", "wDef", "wTrel", "wBoth")]).sort("bin")
with pl.Config(tbl_rows=30, tbl_cols=20, tbl_width_chars=220):
    print(sys.argv[1], "(means per live planted beech per season)")
    print(out)
