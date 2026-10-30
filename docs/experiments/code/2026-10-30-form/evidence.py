"""Form step 5: the 20-seed evidence (the user's criteria, 2026-10-30), from evidence.sh's runs.
Each measure is read at its own season, for a reason:
- floor at 150, τ 0, in [0.02, 0.10]: the stand closes by 100 and levels off by 150; after that it
  loses planted trees at O4's background rate with no regeneration at τ 0, so a later floor
  measures the stand's ageing, not its canopy (100 and 300 reported);
- stand H/D at 300 in [60, 80]: the trunk keeps thickening after height levels off (82 at 150,
  70 at 300 in step 3's seeds), so H/D is read late;
- crown base at τ 0: the stand's median leafCrownRatio below the lone tree's (same seed) at 150 and
  at 300. Its rise from 150 to 300 is release beside dead neighbours, behaviour, not a miss;
- plateau: the stand's median height gains < 2 cells over 250–300 and stays < 180.
Pass: ≥ 15 of 20 seeds per measure (AGENTS.md). τ 0.2 (the garden's look) is reported beside.

    uv run --project analysis python docs/experiments/code/2026-10-30-form/evidence.py runs/evidence
"""

import json
import sys
from statistics import median

import polars as pl

d = sys.argv[1] if len(sys.argv) > 1 else "runs/evidence"
SEEDS = range(1, 21)
PASS = 15


def metrics(run):
    m = pl.read_csv(f"{run}/metrics.csv", infer_schema_length=0)
    return m.with_columns(pl.exclude("species").cast(pl.Float64))


def stand(run):
    n = len(json.load(open(f"{run}/run.json"))["params"]["trees"])
    m = metrics(run).filter((pl.col("tree") < n) & (pl.col("alive") == 1))
    at = lambda s, c: median(m.filter(pl.col("season") == s)[c].to_list())
    light = pl.read_csv(f"{run}/light.csv", infer_schema_length=None).filter(pl.col("row") == 0)
    floor = {s: 1 - light.filter(pl.col("season") == s)["shade"].mean() for s in (100, 150, 300)}
    return {
        "floor": floor,
        "hd": at(300, "slenderness"),
        "hd150": at(150, "slenderness"),
        "lcr150": at(150, "leafCrownRatio"),
        "lcr300": at(300, "leafCrownRatio"),
        "h250": at(250, "height"),
        "h300": at(300, "height"),
        "alive": m.filter(pl.col("season") == 300).height,
        "planted": n,
    }


def lone(run):
    m = metrics(run).filter(pl.col("tree") == 0)
    row = lambda s: m.filter(pl.col("season") == s).row(0, named=True)
    return {"lcr150": row(150)["leafCrownRatio"], "lcr300": row(300)["leafCrownRatio"],
            "hd": row(300)["slenderness"], "h250": row(250)["height"], "h300": row(300)["height"]}


for tau in ("t0", "t02"):
    print(f"\n== τ {'0' if tau == 't0' else '0.2'} ==")
    print("seed | floor 100 / 150 / 300 | H/D 150 → 300 | leaf crown ratio 150, 300: stand vs lone | height 250 → 300 | lone H/D, height 300 | planted alive 300")
    count = {"floor": 0, "hd": 0, "crown": 0, "plateau": 0}
    rows = []
    for s in SEEDS:
        st, lo = stand(f"{d}/forest/{tau}-s{s}"), lone(f"{d}/lone/{tau}-s{s}")
        ok = {
            "floor": 0.02 <= st["floor"][150] <= 0.10,
            "hd": 60 <= st["hd"] <= 80,
            "crown": st["lcr150"] < lo["lcr150"] and st["lcr300"] < lo["lcr300"],
            "plateau": st["h300"] - st["h250"] < 2 and st["h300"] < 180,
        }
        for k, v in ok.items():
            count[k] += v
        rows.append(st)
        mark = lambda k: "" if ok[k] else "✗"
        print(
            f"  {s:2d} | {st['floor'][100]:.3f} / {st['floor'][150]:.3f}{mark('floor')} / {st['floor'][300]:.3f} | "
            f"{st['hd150']:.0f} → {st['hd']:.1f}{mark('hd')} | {st['lcr150']:.2f} vs {lo['lcr150']:.2f}, "
            f"{st['lcr300']:.2f} vs {lo['lcr300']:.2f}{mark('crown')} | {st['h250']:.1f} → {st['h300']:.1f}{mark('plateau')} | "
            f"{lo['hd']:.0f}, {lo['h300']:.0f} | {st['alive']}/{st['planted']}"
        )
    print("  passing of 20: " + ", ".join(f"{k} {v}" for k, v in count.items())
          + ("" if tau == "t02" else "  (criteria; " + ("all ≥ 15" if min(count.values()) >= PASS else "UNDER 15: stop") + ")"))
    for k in ("floor150", "hd"):
        xs = [r["floor"][150] if k == "floor150" else r[k] for r in rows]
        print(f"  {k}: median {median(xs):.3f}, range {min(xs):.3f}–{max(xs):.3f}")
