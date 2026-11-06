"""six.py SUMMARY.csv: six-seed (2,3,6,9,10,12) medians per kind; metamers ratio vs today at 150 (median of seeds,
all live trees, as A4's table); stands use their own seeds."""
import sys
import polars as pl

d = pl.read_csv(sys.argv[1])
six = [2, 3, 6, 9, 10, 12]
d = d.filter(pl.col("kind").str.starts_with("stand") | pl.col("seed").is_in(six))
today = d.filter(pl.col("kind") == "today")["m150"].median()
cols = ["m100", "m150", "mPerCell150", "laiT100", "laiT150", "bornPerCell", "PcumPerCell", "canopy150", "q150", "PM150",
        "L_def", "L_light", "L_both", "L_m0", "L_starved", "L_broken", "L_nout", "born", "lost"]
g = d.group_by("kind").agg(pl.len().alias("n"), *[pl.col(c).median() for c in cols]).with_columns(
    (pl.col("m150") / today).round(3).alias("ratio150"),
    (pl.col("L_def") / pl.col("born")).round(3).alias("defShare"),
    ((pl.col("L_light") + pl.col("L_both")) / pl.col("born")).round(3).alias("lightShare"),
    (pl.col("L_m0") / pl.col("born")).round(3).alias("m0Share"),
    (pl.col("lost") / pl.col("born")).round(3).alias("lostShare")).sort("kind")
pl.Config.set_tbl_rows(50); pl.Config.set_tbl_cols(40); pl.Config.set_tbl_width_chars(260); pl.Config.set_float_precision(3)
print(g.select("kind", "n", "m100", "m150", "ratio150", "mPerCell150", "laiT100", "laiT150", "bornPerCell", "PcumPerCell", "canopy150", "q150", "PM150"))
print(g.select("kind", "n", "born", "lostShare", "defShare", "lightShare", "m0Share", "L_starved", "L_broken", "L_nout"))
# per-seed m150 for the screens
print(d.filter(~pl.col("kind").str.starts_with("stand")).pivot(on="kind", index="seed", values="m150").sort("seed"))
