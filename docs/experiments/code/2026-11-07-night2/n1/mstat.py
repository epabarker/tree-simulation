"""mstat.py RUNDIR [species] : per planted tree at each snapshot: metamers by wood age, light per metamer,
branch-base carbon (P_b vs M_b at each lateral's base), trunk P/M."""
import sys, json, polars as pl
run = sys.argv[1]; sp = sys.argv[2] if len(sys.argv) > 2 else "beech"
p = json.load(open(run + "/params.json"))
planted = [i for i, t in enumerate(p["trees"]) if t["species"] == sp]
m = pl.read_csv(run + "/run/metamers.csv", infer_schema_length=10000,
                columns=["season", "tree", "birthId", "parentBirthId", "order", "axis", "length", "qSum", "nSum", "birthSeason", "pSum", "mSum", "y1", "radius"])
for t in planted:
    for s in sorted(m["season"].unique().to_list()):
        x = m.filter((pl.col("tree") == t) & (pl.col("season") == s))
        if x.height == 0:
            continue
        x = x.with_columns((s - pl.col("birthSeason")).alias("age"))
        par = dict(zip(x["birthId"].to_list(), x["order"].to_list()))
        # a branch base: a metamer whose parent has lower order (first metamer of a lateral axis)
        x = x.with_columns(pl.col("parentBirthId").replace_strict(par, default=-1, return_dtype=pl.Int64).alias("porder"))
        bases = x.filter(pl.col("order") > pl.col("porder"))
        root = x.filter(pl.col("parentBirthId") == -1)
        ages = x["age"]
        print(f"tree {t} s{s}: n {x.height}, top {x['y1'].max()*0.25:.1f} m, age q10/50/90 {ages.quantile(0.1):.0f}/{ages.median():.0f}/{ages.quantile(0.9):.0f}, "
              f"born last 5 seasons {x.filter(pl.col('age') < 5).height}, root P {root['pSum'][0]:.1f} M {root['mSum'][0]:.1f} Q/n {root['qSum'][0]/max(1,root['nSum'][0]):.3f}; "
              f"branch bases {bases.height}, P<M {bases.filter(pl.col('pSum') < pl.col('mSum')).height}, "
              f"Q/n at bases med {(bases['qSum']/bases['nSum']).median():.3f}")
