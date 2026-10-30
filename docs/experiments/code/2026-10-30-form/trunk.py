"""Form step 1's readings (docs/plans/2026-10-30-form.md §2), from rescale.sh's runs.

Per group (forest, lone), variant (base, k8) and τ (t02, t0), over seeds 1–3, at 150, 200, 300:
- the stand: metamers per seed (every live tree), planted alive, median height, H/D, trunk radius
  and the trunk's own stress-wood share, crown width, crown ratio, limb droop (form.csv); the floor
  (light.csv's row 0, of open sky) and the stand LAI (ground.csv);
- deaths of planted trees by 300, by cause: thrown (R3's windthrow: `broken` = the tree's metamers
  in its last row), starved (R1), other (O4's background mortality);
- the plateau: median planted height at 250 and 300 and the gain between, the tallest at 300;
- the trunk's pipe² (C6: (r − stress wood)²) split into its childless metamers' pipe² (C6's tips)
  and the rest (scars and memory), and its children's pipe² against it;
- by branch order: median radius, the share with R3 stress ≥ 1 (σ ≥ σ_target) and with stress wood.

    uv run --project analysis python docs/experiments/code/2026-10-30-form/trunk.py runs/form
"""

import sys
from statistics import median

import polars as pl

d = sys.argv[1] if len(sys.argv) > 1 else "runs/form"
SEEDS = (1, 2, 3)
SEASONS = (150, 200, 300)


def planted(run):
    import json

    return len(json.load(open(f"{run}/run.json"))["params"]["trees"])


def med(xs):
    return median(xs) if xs else float("nan")


def stand(group, name):
    out = {}
    runs = [f"{d}/{group}/{name}-s{s}" for s in SEEDS]
    ms = [pl.read_csv(f"{r}/metrics.csv", infer_schema_length=0).with_columns(pl.exclude("species").cast(pl.Float64)) for r in runs]
    n_planted = planted(runs[0])
    for season in SEASONS + (250,):
        rows = [m.filter((pl.col("season") == season) & (pl.col("alive") == 1)) for m in ms]
        pl_rows = pl.concat([r.filter(pl.col("tree") < n_planted) for r in rows])
        o = {
            "metamers": sum(r["metamers"].sum() for r in rows) / len(SEEDS),
            "alive": pl_rows.height,
            "height": med(pl_rows["height"].to_list()),
            "tallest": pl_rows["height"].max(),
            "hd": med(pl_rows["slenderness"].to_list()),
            "trunk": med(pl_rows["trunkRadius"].to_list()),
            "cw": med(pl_rows["crownWidth"].to_list()),
            "cr": med(pl_rows["crownRatio"].to_list()),
        }
        floor, lai, droop = [], [], []
        for r in runs:
            try:
                lt = pl.read_csv(f"{r}/light.csv").filter((pl.col("season") == season) & (pl.col("row") == 0))
                floor.append(1 - lt["shade"].mean())
                g = pl.read_csv(f"{r}/ground.csv").filter(pl.col("season") == season)
                lai.append(g["lai"].mean())
            except (FileNotFoundError, TypeError):
                pass
            try:
                f = pl.read_csv(f"{r}/form.csv", infer_schema_length=0).filter(pl.col("season") == str(season))
                f = f.filter(pl.col("tree").cast(pl.Int64) < n_planted)
                droop += [float(x) for x in f["limbDroop"].to_list() if x not in ("", "NaN")]
            except FileNotFoundError:
                pass
        o["floor"] = sum(floor) / len(floor) if floor else float("nan")
        o["lai"] = sum(lai) / len(lai) if lai else float("nan")
        o["droop"] = med(droop)
        out[season] = o
    # Deaths of planted trees by 300, by cause, from each tree's last live row and its first dead one.
    causes = {"thrown": 0, "starved": 0, "other": 0}
    for m in ms:
        dead = m.filter((pl.col("tree") < n_planted) & (pl.col("alive") == 0)).sort("season")
        for t in dead["tree"].unique().to_list():
            first = dead.filter(pl.col("tree") == t).row(0, named=True)
            if first["broken"] >= first["metamers"] > 0:
                causes["thrown"] += 1
            elif first["starved"] > 0:
                causes["starved"] += 1
            else:
                causes["other"] += 1
    out["deaths"] = causes
    out["planted"] = n_planted * len(SEEDS)
    return out


def trunk(group, name, season=300):
    """The trunk's pipe² split, per live planted tree, and radii and stress by order."""
    split, kids, sw_share = [], [], []
    by_order = {}
    for s in SEEDS:
        run = f"{d}/{group}/{name}-s{s}"
        n_planted = planted(run)
        m = pl.read_csv(f"{run}/metamers.csv", infer_schema_length=None).filter(
            (pl.col("season") == season) & (pl.col("tree") < n_planted)
        )
        m = m.with_columns(pipe2=(pl.col("radius") - pl.col("stressWood")) ** 2)
        parents = m.select("tree", pl.col("parentBirthId").alias("birthId")).unique()
        tips = m.join(parents, on=["tree", "birthId"], how="anti")
        tip_sum = tips.group_by("tree").agg(pl.col("pipe2").sum().alias("tips"))
        roots = m.filter(pl.col("parentBirthId") == -1).select(
            "tree", "birthId", "pipe2", "radius", "stressWood"
        )
        child = (
            m.join(roots.select("tree", pl.col("birthId").alias("parentBirthId")), on=["tree", "parentBirthId"])
            .group_by("tree")
            .agg(pl.col("pipe2").sum().alias("children"))
        )
        t = roots.join(tip_sum, on="tree").join(child, on="tree", how="left").fill_null(0)
        for r in t.iter_rows(named=True):
            split.append(r["tips"] / r["pipe2"])
            kids.append(r["children"] / r["pipe2"])
            sw_share.append(r["stressWood"] / r["radius"])
        for o, g in m.group_by("order"):
            e = by_order.setdefault(o[0], {"r": [], "stress": 0, "sw": 0, "n": 0})
            e["r"] += g["radius"].to_list()
            e["stress"] += g.filter(pl.col("stress") >= 1).height
            e["sw"] += g.filter(pl.col("stressWood") > 0).height
            e["n"] += g.height
    return med(split), med(kids), med(sw_share), by_order


for group in ("forest", "lone"):
    for v in ("base", "k8"):
        for tau in ("t02", "t0"):
            name = f"{v}-{tau}"
            try:
                st = stand(group, name)
            except FileNotFoundError as e:
                print(f"{group}/{name}: missing ({e})")
                continue
            print(f"\n{group}/{name}")
            for season in SEASONS:
                o = st[season]
                print(
                    f"  s{season}: metamers/seed {o['metamers']:,.0f}; planted alive {o['alive']}/{st['planted']}; "
                    f"height {o['height']:.1f} (tallest {o['tallest']:.1f}); H/D {o['hd']:.1f}; trunk r {o['trunk']:.3f}; "
                    f"crown width {o['cw']:.1f}; crown ratio {o['cr']:.2f}; limb droop {o['droop']:.1f}; "
                    f"floor {o['floor']:.3f}; LAI {o['lai']:.2f}"
                )
            gain = st[300]["height"] - st[250]["height"]
            print(f"  plateau: median height 250 {st[250]['height']:.1f} → 300 {st[300]['height']:.1f} (gain {gain:+.1f})")
            print(f"  planted deaths by 300: {st['deaths']}")
            tips, kids, sw, orders = trunk(group, name)
            print(
                f"  trunk at 300: tips' pipe² {tips:.1%} of the root's (scars and memory {1 - tips:.1%}); "
                f"children's pipe² {kids:.1%}; root's own stress wood {sw:.1%} of its radius"
            )
            for o in sorted(orders)[:5]:
                e = orders[o]
                print(
                    f"    order {o}: n {e['n']:,}, median r {med(e['r']):.4f}, stress ≥ 1 {e['stress'] / e['n']:.1%}, "
                    f"with stress wood {e['sw'] / e['n']:.1%}"
                )
