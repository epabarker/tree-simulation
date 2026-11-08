"""Static reading (diagnostic 6 of the bare-bole note): if every first-order limb under x·Q_top
were gone at a season, where would the lowest survivor sit? Ignores the dynamics (no regrowth,
no re-lighting), so it bounds the effect of a raised T_rel; it does not predict a run."""
import sys, glob, os
import polars as pl
from plotnine import ggplot, aes, geom_line, geom_hline, facet_wrap, labs, theme_bw, scale_y_log10, theme
d, fig = sys.argv[1], sys.argv[2]
pl.Config.set_tbl_rows(100); pl.Config.set_tbl_width_chars(200)
L = []
for f in sorted(glob.glob(f"{d}/*_limbs.csv")):
    L.append(pl.read_csv(f, infer_schema_length=None).with_columns(case=pl.lit(os.path.basename(f).removesuffix("_limbs.csv"))))
l = pl.concat(L, how="vertical_relaxed")
s = pl.read_csv(f"{d}/all_season.csv", infer_schema_length=None)
planted = s.filter(pl.col.planted).select("case", "tree").unique()
l = l.join(planted, on=["case", "tree"]).filter(pl.col.species.is_in(["beech", "hornbeam", "holly"]))
rows = []
for x in [0.0, 0.1, 0.25, 0.5]:
    r = (l.filter(pl.col.ratio >= x).group_by("case", "tree", "species", "season")
         .agg(bole=pl.col.baseHeight.min(), height=pl.col.height.first(), kept=pl.len()))
    allr = l.group_by("case", "tree", "species", "season").agg(limbs=pl.len())
    r = allr.join(r, on=["case", "tree", "species", "season"], how="left").with_columns(x=pl.lit(x))
    rows.append(r)
w = pl.concat(rows).with_columns(clear=(pl.col.bole / pl.col.height).round(3))
w = w.filter(pl.col.season.is_in([40, 80, 120]))
print(w.pivot(on="x", index=["case", "tree", "species", "season", "limbs"], values="clear").sort("case", "season"))
print(w.pivot(on="x", index=["case", "tree", "species", "season", "limbs"], values="kept").sort("case", "season"))
# figure: lowest limb's ratio against T_rel, planted focus trees
p = s.filter(pl.col.planted, pl.col.species.is_in(["beech", "hornbeam", "holly"]), pl.col.season >= 5).with_columns(
    who=pl.col.case.str.replace(r"-s\d", "") + " s" + pl.col.case.str.extract(r"s(\d)$"))
g = (ggplot(p.to_pandas(), aes("season", "lowRatio", colour="case")) + geom_line()
     + geom_hline(aes(yintercept="trel"), linetype="dashed") + geom_hline(yintercept=0.5, linetype="dotted")
     + facet_wrap("~species") + scale_y_log10() + theme_bw() + theme(figure_size=(10, 3.6))
     + labs(y="lowest limb: light per metamer / Q_top", title="Lowest living first-order limb vs C5's T_rel (dashed) and ~0.5 (dotted); exploratory, seeds 1–2"))
g.save(f"{fig}/2026-11-08-self-pruning-lowest-limb.png", dpi=110, verbose=False)
