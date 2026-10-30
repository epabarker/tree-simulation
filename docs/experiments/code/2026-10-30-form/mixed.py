"""Form step 1c: the mixed wood's planted trees by species at 300 (mixed.sh): planted, alive, thrown
(R3's windthrow: `broken` = the tree's metamers in its first dead row), other deaths; the thrown
trees' H/D and height in their last live season; the survivors' median height and H/D.

    uv run --project analysis python docs/experiments/code/2026-10-30-form/mixed.py runs/form/mixed sb7000
"""

import json
import sys
from collections import defaultdict
from statistics import median

import polars as pl

d, v = sys.argv[1], sys.argv[2]
by = defaultdict(lambda: {"planted": 0, "alive": 0, "thrown": 0, "other": 0, "thrown_hd": [], "thrown_h": [], "h": [], "hd": []})
for s in (1, 2, 3):
    run = f"{d}/{v}-s{s}"
    n = len(json.load(open(f"{run}/run.json"))["params"]["trees"])
    m = pl.read_csv(f"{run}/metrics.csv", infer_schema_length=0).with_columns(pl.exclude("species").cast(pl.Float64))
    m = m.filter(pl.col("tree") < n).sort("season")
    for t, g in m.group_by("tree"):
        sp = g["species"][0]
        e = by[sp]
        e["planted"] += 1
        dead = g.filter(pl.col("alive") == 0)
        if dead.height == 0:
            last = g.row(-1, named=True)
            e["alive"] += 1
            e["h"].append(last["height"])
            e["hd"].append(last["slenderness"])
            continue
        first = dead.row(0, named=True)
        live = g.filter((pl.col("alive") == 1) & (pl.col("season") < first["season"]))
        if first["broken"] >= first["metamers"] > 0:
            e["thrown"] += 1
            if live.height:
                lr = live.row(-1, named=True)
                e["thrown_hd"].append(lr["slenderness"])
                e["thrown_h"].append(lr["height"])
        else:
            e["other"] += 1
tot = defaultdict(int)
for sp, e in sorted(by.items()):
    for k in ("planted", "alive", "thrown", "other"):
        tot[k] += e[k]
    med = lambda xs: f"{median(xs):.0f}" if xs else "-"
    print(f"{sp:9s} planted {e['planted']:3d}, alive {e['alive']:3d}, thrown {e['thrown']:3d} ({e['thrown'] / e['planted']:.0%}), "
          f"other deaths {e['other']:3d}; thrown at H/D {med(e['thrown_hd'])}, height {med(e['thrown_h'])}; "
          f"survivors height {med(e['h'])}, H/D {med(e['hd'])}")
print(f"all       planted {tot['planted']}, alive {tot['alive']}, thrown {tot['thrown']} ({tot['thrown'] / tot['planted']:.0%}), other {tot['other']}")
