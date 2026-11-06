"""Form step 2's readings (plan §3): the crown ratio by leaf area against the branch measure, per
seed at 150, 200, 300, the stand (planted trees' median) against the lone tree, at τ 0.2 and τ 0.
Stop if the lone tree's is below the stand's at 300 in every seed at τ 0.

    uv run --project analysis python docs/experiments/code/2026-10-30-form/leaf.py runs/form sb7000 lone/k8

(The lone tree is rescale.sh's, the stand's own params; `oak200/k8` reads the fitted oak instead.)
"""

import json
import sys
from statistics import median

import polars as pl

d, stand_v, lone_v = sys.argv[1], sys.argv[2], sys.argv[3]


def read(run):
    n = len(json.load(open(f"{run}/run.json"))["params"]["trees"])
    m = pl.read_csv(f"{run}/metrics.csv", infer_schema_length=0).with_columns(pl.exclude("species").cast(pl.Float64))
    return m.filter((pl.col("tree") < n) & (pl.col("alive") == 1))


for tau in ("t02", "t0"):
    below = 0
    print(f"τ {'0.2' if tau == 't02' else '0'}")
    for s in (1, 2, 3):
        st, lo = read(f"{d}/forest/{stand_v}-{tau}-s{s}"), read(f"{d}/{lone_v}-{tau}-s{s}")
        cells = []
        for season in (150, 200, 300):
            a, b = st.filter(pl.col("season") == season), lo.filter(pl.col("season") == season)
            cells.append(
                f"{season}: stand {median(a['leafCrownRatio']):.2f} (branch {median(a['crownRatio']):.2f}, "
                f"base {median(a['leafBase']):.0f} of {median(a['height']):.0f}), lone {b['leafCrownRatio'][0]:.2f} "
                f"(branch {b['crownRatio'][0]:.2f})"
            )
        a = st.filter(pl.col("season") == 300)
        lone = lo.filter(pl.col("season") == 300)["leafCrownRatio"][0]
        below += lone < median(a["leafCrownRatio"])
        everywhere = (st["leafCrownRatio"] <= st["crownRatio"]).mean()
        print(f"  seed {s}: " + "; ".join(cells) + f"; leaf ≤ branch in {everywhere:.1%} of stand rows")
    print(f"  lone below stand at 300 in {below} of 3 seeds")
