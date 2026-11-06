"""C1 round 2: height against season, every seed, for height.sh's and woods.sh's runs.

    uv run --project analysis python docs/experiments/code/2026-11-01-c1-round2/height_plot.py \
        runs/c1r2 runs/c1r2-woods docs/experiments/figures/2026-11-01-c1r2-height.png
"""

import csv
import json
import os
import sys
from collections import defaultdict
from statistics import median

import polars as pl
from plotnine import aes, facet_wrap, geom_hline, geom_line, ggplot, labs, theme, theme_minimal

SHOW = {
    "lone-r1": "lone tree, R1 as it stands",
    "stand-r1": "forest, R1 as it stands",
    "lone-lh40": "lone tree, L_h 40",
    "stand-mw4": "forest, m_w 4",
    "mixedWood": "mixed wood",
    "beechWood": "beech wood",
    "oakWood": "oak wood",
    "birchWood": "birch wood",
}


def heights(run):
    planted = len(json.load(open(os.path.join(run, "run.json")))["params"]["trees"])
    by = defaultdict(list)
    with open(os.path.join(run, "metrics.csv")) as f:
        for r in csv.DictReader(f):
            if r["alive"] == "1" and int(r["tree"]) < planted:
                by[int(float(r["season"]))].append(float(r["height"]))
    return {s: median(v) for s, v in by.items()}


rows = []
for d in sys.argv[1:-1]:
    for name in sorted(os.listdir(d)):
        run = os.path.join(d, name)
        group, seed = name.rsplit("-s", 1)
        if group not in SHOW or not os.path.exists(os.path.join(run, "metrics.csv")):
            continue
        for s, h in heights(run).items():
            rows.append({"case": SHOW[group], "seed": f"seed {seed}", "season": s, "height": h})

df = pl.DataFrame(rows)
order = [v for v in SHOW.values() if v in set(df["case"].to_list())]
df = df.with_columns(pl.col("case").cast(pl.Enum(order)))
p = (
    ggplot(df, aes("season", "height", color="seed"))
    + geom_line()
    + geom_hline(yintercept=200, linetype="dashed")
    + facet_wrap("case", ncol=4)
    + labs(y="median height of the planted trees (cells)", title="Height against season; the world's top at 200")
    + theme_minimal()
    + theme(figure_size=(11, 5.5))
)
p.save(sys.argv[-1], dpi=90)
print(sys.argv[-1])
