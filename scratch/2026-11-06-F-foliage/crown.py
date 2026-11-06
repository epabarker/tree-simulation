"""crown.py RUNSDIR... : crown geometry of canopy trees (alive, H >= 40 cells = 10 m) at 100 and 150, from metrics.csv:
crownWidth (x), crownDepth (z), leafCrownRatio, limbBase/H, centroidOffsetZ; seeds 2,3,6,9,10,12 for gardens."""
import sys, glob, os
import polars as pl

six = {2, 3, 6, 9, 10, 12}
rows = []
for D in sys.argv[1:]:
    for run in sorted(glob.glob(f"{D}/runs/*")):
        kind, arg, seed = os.path.basename(run).split("-")
        s = int(seed[1:])
        if kind == "stand":
            kind = f"stand-{arg}"
        elif s not in six:
            continue
        m = pl.read_csv(f"{run}/run/metrics.csv", infer_schema_length=0).filter(pl.col("season").is_in(["100", "150"]) & (pl.col("alive") == "1"))
        m = m.select(pl.col("season").cast(pl.Int64), *[pl.col(c).cast(pl.Float64) for c in ("height", "crownWidth", "crownDepth", "leafCrownRatio", "limbBase", "centroidOffsetZ")])
        rows.append(m.filter(pl.col("height") >= 40).with_columns(pl.lit(kind).alias("kind"), pl.lit(s).alias("seed")))
df = pl.concat(rows).unique(subset=None)
pl.Config.set_tbl_rows(40); pl.Config.set_tbl_cols(20); pl.Config.set_tbl_width_chars(200)
print(df.group_by(["kind", "season"]).agg(pl.len().alias("trees"), pl.col("height").median().round(0).alias("H"),
      pl.col("crownWidth").median().round(1).alias("cw_x"), pl.col("crownDepth").median().round(1).alias("cd_z"),
      pl.col("crownDepth").quantile(0.9).round(1).alias("cd_z_p90"), pl.col("leafCrownRatio").median().round(2).alias("LCR"),
      (pl.col("limbBase") / pl.col("height")).median().round(2).alias("limbBase_H"),
      pl.col("centroidOffsetZ").abs().median().round(1).alias("offZ")).sort(["season", "kind"]))
