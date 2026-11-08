import polars as pl
import sys
IN = sys.argv[1] + "/"
from plotnine import *
F = "docs/experiments/figures/"
names = {"oak": "lone oak, faces τ 0.2 (preset)", "oak_faces1": "lone oak, faces τ 1 (contrast)", "garden": "garden, faces τ 0.2"}
order = list(names.values())
q = (pl.read_csv(IN + "q.csv").filter(pl.col("season")==120)
     .group_by(["case","y","z"]).agg(pl.col("q").mean())
     .with_columns(pl.col("case").replace(names), (pl.col("z")*0.25).alias("zm"), (pl.col("y")*0.25).alias("ym")).to_pandas())
q["case"] = q["case"].astype("category").cat.set_categories(order)
p = (ggplot(q, aes("zm","ym",fill="q")) + geom_tile(width=0.25, height=0.5) + facet_wrap("case")
     + scale_fill_cmap("viridis", name="Q / C", limits=(0,1)) + labs(x="depth z (m): front face 0 ← → 16 back face", y="height (m)",
       title="Q in the depth cross-section, mean over x, season 120 (seed 1, exploratory)")
     + theme_bw() + theme(figure_size=(11,4)))
p.save(F+"2026-11-08-slab-light-section.png", dpi=110, verbose=False)
b = pl.read_csv(IN + "q_buds.csv").filter(pl.col("season")==120)
b = b.join(b.group_by("case").agg(pl.col("y").max().alias("top")), on="case").with_columns(
    third=pl.when(pl.col("y")<pl.col("top")/3).then(pl.lit("lower third of height")).when(pl.col("y")<2*pl.col("top")/3).then(pl.lit("middle third")).otherwise(pl.lit("upper third")),
    zbin=((pl.col("z")/4).floor()*4+2)*0.25)
s = b.group_by(["case","third","zbin"]).agg(pl.col("q").median(), pl.len()).filter(pl.col("len")>=20).with_columns(pl.col("case").replace(names)).to_pandas()
s["case"] = s["case"].astype("category").cat.set_categories(order)
p = (ggplot(s, aes("zbin","q",color="case")) + geom_line() + geom_point(size=1) + facet_wrap("third")
     + labs(x="depth z (m): front face 0 ← → 16 back face", y="median bud Q / C (bins of ≥ 20 buds)", color="",
       title="What a live bud receives, by depth, season 120 (seed 1, exploratory)")
     + theme_bw() + theme(figure_size=(11,4), legend_position="bottom"))
p.save(F+"2026-11-08-slab-light-buds.png", dpi=110, verbose=False)
