"""Form step 3's stop check (plan §4: is the floor under LAI ≥ 6 above 10% at τ 0 because the
sweep's transport leaks?). Per column of the picture (light.csv, averaged over depth), its LAI is
Σ lad over rows. At rows 0, 20, 40, 50, 60: mean light in columns with LAI < 1, 1–6 and ≥ 6, and
the correlation of light with the column's LAI. Local shading darkens dense columns just under
the canopy; a uniform floor below says the light there comes from far afield (oblique rays).

    uv run --project analysis python docs/experiments/code/2026-10-30-form/locality.py runs/form3 k8-t0
"""

import sys
from statistics import mean

import polars as pl

d, v = sys.argv[1], sys.argv[2]
for season in (150, 300):
    acc = {}
    for s in (1, 2, 3):
        l = pl.read_csv(f"{d}/forest/{v}-s{s}/light.csv", infer_schema_length=None).filter(pl.col("season") == season)
        lai = l.group_by("col").agg(pl.col("lad").sum().alias("lai"))
        l = l.join(lai, on="col").with_columns(q=1 - pl.col("shade"))
        for row in (0, 20, 40, 50, 60):
            r = l.filter(pl.col("row") == row)
            a = acc.setdefault(row, {"lt1": [], "mid": [], "ge6": [], "corr": []})
            a["lt1"] += r.filter(pl.col("lai") < 1)["q"].to_list()
            a["mid"] += r.filter((pl.col("lai") >= 1) & (pl.col("lai") < 6))["q"].to_list()
            a["ge6"] += r.filter(pl.col("lai") >= 6)["q"].to_list()
            a["corr"].append(r.select(pl.corr("q", "lai")).item())
    print(f"{v} season {season}")
    for row, a in acc.items():
        m = lambda xs: f"{mean(xs):.3f} (n {len(xs)})" if xs else "-"
        print(f"  row {row}: LAI<1 {m(a['lt1'])}, 1–6 {m(a['mid'])}, ≥6 {m(a['ge6'])}; corr(light, LAI) {mean(a['corr']):+.2f}")
