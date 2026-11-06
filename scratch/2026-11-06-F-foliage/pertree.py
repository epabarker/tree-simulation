"""pertree.py RUNSDIR [KIND...]: per live tree at 100 and 150, by kind and size class (canopy: H >= 10 m).
Leaf area, metamers, crown width, leaf light, P/M; the share of each kind's metamers held by canopy trees,
and planted vs recruit."""
import sys, glob, json, os
import polars as pl

D = sys.argv[1]
want = set(sys.argv[2:])
COLS = "season tree species H nm def light both other rdef rlight rboth low area q alo qtop P M nout aout".split()
rows = []
for run in sorted(glob.glob(f"{D}/runs/*")):
    kind, arg, seed = os.path.basename(run).split("-")
    if kind == "stand":
        kind = f"stand-{arg}"
    if want and kind not in want:
        continue
    p = json.load(open(f"{run}/params.json"))
    npl = len(p["trees"])
    met = pl.read_csv(f"{run}/run/metrics.csv", infer_schema_length=0).filter(pl.col("season").is_in(["100", "150"]) & (pl.col("alive") == "1"))
    met = met.select(pl.col("season").cast(pl.Int64), pl.col("tree").cast(pl.Int64), "species",
                     *[pl.col(c).cast(pl.Float64) for c in ("metamers", "height", "crownWidth", "production", "maintenance", "leafCrownRatio", "limbBase")])
    dg = []
    for line in open(f"{run}/diag.txt"):
        if line.startswith("SHED "):
            f = line.split()[1:]
            s = int(float(f[0])) + 1
            if s in (100, 150):
                dg.append((s, int(f[1]), float(f[13]), float(f[14]), float(f[20])))
    dg = pl.DataFrame(dg, schema=["season", "tree", "area", "q", "aout"], orient="row")
    j = met.join(dg, on=["season", "tree"], how="left").with_columns(
        pl.lit(kind).alias("kind"), pl.lit(int(seed[1:])).alias("seed"),
        pl.when(pl.col("tree") < npl).then(pl.lit("planted")).otherwise(pl.lit("recruit")).alias("origin"),
        pl.when(pl.col("height") >= 40).then(pl.lit("canopy")).otherwise(pl.lit("under")).alias("cls"))
    rows.append(j)
df = pl.concat(rows)
pl.Config.set_tbl_rows(80); pl.Config.set_tbl_cols(30); pl.Config.set_tbl_width_chars(250)
nseeds = df.group_by("kind").agg(pl.col("seed").n_unique().alias("ns"))
g = df.group_by(["kind", "season", "cls"]).agg(
    pl.len().alias("trees"), pl.col("metamers").sum().alias("m"), pl.col("metamers").median().alias("m_med"),
    pl.col("area").median().round(0).alias("area_med"), pl.col("height").median().round(0).alias("H_med"),
    pl.col("crownWidth").median().round(1).alias("cw_med"), pl.col("q").median().round(3).alias("q_med"),
    (pl.col("production") / pl.col("maintenance")).median().round(2).alias("PM_med"),
    pl.col("aout").sum().alias("aout"), pl.col("area").sum().alias("area"))
g = g.join(nseeds, on="kind").with_columns((pl.col("trees") / pl.col("ns")).round(1).alias("trees_per_seed"),
                                          (pl.col("m") / pl.col("ns")).round(0).alias("m_per_seed"),
                                          (pl.col("aout") / pl.col("area")).round(3).alias("aout_share")).drop("aout", "area", "m")
print(g.sort(["season", "kind", "cls"]))
o = df.filter(pl.col("season") == 150).group_by(["kind", "origin"]).agg(pl.len(), pl.col("metamers").sum()).join(nseeds, on="kind").with_columns(
    (pl.col("len") / pl.col("ns")).round(1).alias("trees_per_seed"), (pl.col("metamers") / pl.col("ns")).round(0).alias("m_per_seed"))
print(o.sort(["kind", "origin"]))
