import sys
import polars as pl
run = sys.argv[1]
for season in [int(s) for s in sys.argv[2:]]:
    m = (pl.scan_csv(f"{run}/metamers.csv").filter(pl.col("season") == season)
         .select("birthId", "parentBirthId", "y1", "length", "birthSeason", "angle").collect())
    H = m["y1"].max()
    bs = m["birthSeason"].max(); new = m.filter(pl.col("birthSeason") == bs); print("latest birthSeason", bs)
    ids = set(new["birthId"].to_list())
    # a shoot's first metamer: its parent was not born this season
    first = new.filter(~pl.col("parentBirthId").is_in(list(ids)))
    # shoot size n = metamers in the chain from first; with the length rule l = v'/n
    n_new, n_shoots = new.height, first.height
    print(f"{run} s{season} H {H:.1f}: new metamers {n_new}, shoots {n_shoots}, metamers/shoot {n_new/max(1,n_shoots):.2f}")
    with pl.Config(tbl_rows=12, float_precision=3):
        print(first.with_columns(lb=(pl.col("length") * 4).floor() / 4).group_by("lb").len().sort("lb"))
        print("share of new shoots with first metamer in the top tenth:", (first["y1"] > 0.9 * H).mean(),
              " in top fifth:", (first["y1"] > 0.8 * H).mean())
