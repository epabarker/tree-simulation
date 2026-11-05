"""The lean audit (2026-11-05; docs/experiments/2026-11-05-lean-audit.md): why the simulated beech lean one way.

Axes are simtree's (x, y depth, z up, metres): x is the core's x, y the core's z (the slab's depth, 0 = front face).
An azimuth is atan2(y, x) in degrees: 0° = world +x, 90° = +z in the core (toward the back face). Every lean is
relative to the tree's own root (metamer 0's base).

Per tree (`summary`): the chord from the root to the highest point (lean angle from vertical, azimuth, its x and depth
components), the leaf-weighted crown centroid's offset, and the path from the root to that top (the leader as it
stands): its tilt from vertical by height, the top 2 m's tilt and its azimuth.

Stages (each run's summary cached under runs/lean-audit-v2/<condition>/<seed>.json, the dump deleted):
  runs      every condition below, seeds 1-20 (12 workers)
  sky       the sky's net horizontal weight per season (slab_sweep.rs `sky`, `sky_offsets`), seasons 1-70
  real      BioDiv's 53 beeches: chord lean angle (median over the optimum set's repeats) → runs/lean-audit-v2/real.json
  bole      boleSway re-read on crown-base's dumps (hand, v3, v4; seeds 101-110, season 70) with bent-over trees flagged
  report    the tables the note quotes, and the figure

  uv run --project analysis python -I analysis/experiments/lean_audit.py runs|sky|real|bole|report
"""

import json
import math
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "analysis"))
sys.path.insert(0, str(HERE))

from treesim import simtree  # noqa: E402

OUT = ROOT / "runs/lean-audit-v2"
FITS = ROOT / "docs/experiments/fits"
FIG = ROOT / "docs/experiments/figures/2026-11-05-lean-audit.png"
EPS = 1e-6  # degrees: sin ≈ 1.7e-8, above normalize_or's 1e-12; flips L's flat part's sign, nothing else measurable
SEEDS = list(range(1, 21))
N_STAND = 12
MIDDLE = [4, 5, 6, 7]  # cli/trials.ts STAND_MEASURED
ALT = [EPS if i % 2 == 0 else -EPS for i in range(N_STAND)]
LONE_AGES = [1, 2, 3, 5, 10, 30, 100]
STAND_AGES = [1, 2, 3, 5, 10, 70]
WORKERS = 12


def assigns() -> dict[str, dict]:
    return {
        "hand": json.loads((FITS / "level1-pilot-v4/beech.json").read_text())["hand"]["assign"],
        "v3": json.loads((FITS / "level1-pilot-v3/beech.json").read_text())["fit"]["assign"],
        "v4": json.loads((FITS / "level1-pilot-v4/beech.json").read_text())["fit"]["assign"],
    }


def conditions() -> dict[str, dict]:
    """name → job fields (seed and assign added per run)."""
    out = {}
    for a in ("hand", "v3", "v4"):
        open_ = {"trial": "lone", "world": {"faces": [1, 1]}, "seasons": LONE_AGES}
        out[f"{a}/lone-open/L+x"] = {**open_, "lean": 0}
        out[f"{a}/lone-open/L-x"] = {**open_, "lean": -EPS}
        out[f"{a}/lone-0.2/L+x"] = {"trial": "lone", "seasons": LONE_AGES, "lean": 0}
        stand = {"trial": "stand", "all": True, "seasons": STAND_AGES}
        out[f"{a}/stand/L+x"] = {**stand, "lean": 0}
        out[f"{a}/stand/L-x"] = {**stand, "lean": -EPS}
        out[f"{a}/stand/alt"] = {**stand, "lean": ALT}
        out[f"{a}/stand/mirror"] = {**stand, "lean": 0, "mirror": True}
    for k in (7, 13):  # the sky-phase control: L stays +x, the sky's rotation phase moves by k seasons
        out[f"hand/lone-open/plant{k}"] = {"trial": "lone", "world": {"faces": [1, 1]}, "seasons": LONE_AGES,
                                           "lean": 0, "plantSeason": k}
    return out


# ---- per-tree geometry -------------------------------------------------------------------------------------------

def _azimuth(dx: float, dy: float) -> float:
    return math.degrees(math.atan2(dy, dx)) % 360.0


def summary(t: dict) -> dict:
    st = simtree.from_dump(t)
    c = st.cylinders
    tip = c.tip
    root = c.start[0]
    top_i = int(np.argmax(tip[:, 2]))
    top = tip[top_i]
    d = top - root
    hor = math.hypot(d[0], d[1])
    leaf = st.leaf
    pts = 0.5 * (c.start + tip)
    if leaf.sum() > 0:
        cen = (pts * leaf[:, None]).sum(0) / leaf.sum()
    else:
        cen = pts.mean(0)
    # The leader as it stands: the path from the root to the top.
    path = []
    i = top_i
    while i >= 0:
        path.append(i)
        i = int(c.parent[i])
    path = path[::-1]
    ax = c.axis[path]
    z = c.start[path, 2] - root[2]
    tilt = np.degrees(np.arccos(np.clip(ax[:, 2], -1, 1)))
    H = float(d[2])
    prof = {}
    for f in (0.1, 0.25, 0.5, 0.75, 0.9):
        k = int(np.searchsorted(z, f * H))
        prof[f"tilt{int(f * 100)}"] = float(tilt[min(k, len(tilt) - 1)])
    upper = z >= H - 2.0
    up = (c.axis[path][upper] * c.length[path][upper, None]).sum(0)
    return {
        "index": t["index"], "alive": t["alive"], "season": t["season"], "lean_set": t.get("lean", 0),
        "root": [float(root[0]), float(root[1])],
        "height": H, "dx": float(d[0]), "dy": float(d[1]), "lean": math.degrees(math.atan2(hor, d[2])),
        "az": _azimuth(d[0], d[1]),
        "cx": float(cen[0] - root[0]), "cy": float(cen[1] - root[1]),
        "top2_tilt": math.degrees(math.atan2(math.hypot(up[0], up[1]), up[2])) if upper.any() else math.nan,
        "top2_az": _azimuth(up[0], up[1]) if upper.any() else math.nan,
        **prof,
        "level0": t.get("level0"),
    }


def _run(args) -> str:
    name, seed, job = args
    out = OUT / name / f"{seed}.json"
    if out.exists():
        return str(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    jf = out.with_suffix(".job.json")
    jf.write_text(json.dumps(job))
    dump = out.with_suffix(".dump.json")
    r = subprocess.run(["node", str(HERE / "lean_dump.ts"), str(jf), str(dump)], cwd=ROOT, capture_output=True,
                       text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{name}/{seed}: {r.stderr[-2000:]}")
    d = json.loads(dump.read_text())
    rows = [summary(t) for t in d["trees"] if t["alive"] and len(t["m"]["parent"])]
    part = out.with_suffix(".partial")
    part.write_text(json.dumps({"rows": rows, "sky": d["sky"], "plant": d["plant"]}))
    part.rename(out)
    dump.unlink()
    jf.unlink()
    return str(out)


def runs() -> None:
    a = assigns()
    jobs = [(name, s, {"species": "beech", "seed": s, "assign": a[name.split("/")[0]], **c})
            for name, c in conditions().items() for s in SEEDS]
    with ProcessPoolExecutor(WORKERS) as ex:
        for i, p in enumerate(ex.map(_run, jobs, chunksize=1)):
            if i % 40 == 0:
                print(i, "/", len(jobs), p, flush=True)


def load(name: str) -> dict[int, list[dict]]:
    return {s: json.loads((OUT / name / f"{s}.json").read_text())["rows"] for s in SEEDS
            if (OUT / name / f"{s}.json").exists()}


# ---- statistics --------------------------------------------------------------------------------------------------

def rayleigh(az_deg: list[float]) -> dict:
    a = np.radians(np.asarray([x for x in az_deg if math.isfinite(x)]))
    n = len(a)
    if n == 0:
        return {"n": 0}
    C, S = np.cos(a).mean(), np.sin(a).mean()
    R = math.hypot(C, S)
    z = n * R * R
    # Zar (2010) eq. 27.4's approximation to the Rayleigh test's P.
    p = math.exp(-z) * (1 + (2 * z - z * z) / (4 * n) - (24 * z - 132 * z**2 + 76 * z**3 - 9 * z**4) / (288 * n * n))
    return {"n": n, "R": R, "z": z, "p": max(min(p, 1.0), 0.0), "mean": _azimuth(C, S)}


def rows_at(by_seed: dict[int, list[dict]], season: int, idx: list[int] | None = None) -> list[dict]:
    return [dict(r, seed=s) for s, rows in by_seed.items() for r in rows
            if r["season"] == season and (idx is None or r["index"] in idx)]


def describe_set(rows: list[dict]) -> dict:
    if not rows:
        return {"n": 0}
    f = lambda k: [r[k] for r in rows]  # noqa: E731
    return {
        "n": len(rows), "rayleigh": rayleigh(f("az")),
        "lean_median": float(np.median(f("lean"))), "lean_iqr": [float(np.percentile(f("lean"), q)) for q in (25, 75)],
        "dx_mean": float(np.mean(f("dx"))), "dy_mean": float(np.mean(f("dy"))),
        "dx_pos": int(sum(r["dx"] > 0 for r in rows)),
        "cx_mean": float(np.mean(f("cx"))), "cy_mean": float(np.mean(f("cy"))),
        "cx_pos": int(sum(r["cx"] > 0 for r in rows)),
        "top2_tilt_median": float(np.nanmedian(f("top2_tilt"))),
        "top2": rayleigh(f("top2_az")),
        **{k: float(np.median(f(k))) for k in ("tilt10", "tilt25", "tilt50", "tilt75", "tilt90", "height")},
    }


def paired(a: dict[int, list[dict]], b: dict[int, list[dict]], season: int, key: str = "dx") -> dict:
    """Per seed and tree index: the lean component under L = +x (a) against L = −x (b). A pure mirror reads b = −a."""
    pa = {(r["seed"], r["index"]): r for r in rows_at(a, season)}
    pb = {(r["seed"], r["index"]): r for r in rows_at(b, season)}
    keys = sorted(set(pa) & set(pb))
    x = np.array([pa[k][key] for k in keys])
    y = np.array([pb[k][key] for k in keys])
    if len(x) < 2:
        return {"n": len(x)}
    return {"n": len(keys), "a_mean": float(x.mean()), "b_mean": float(y.mean()), "sum_mean": float((x + y).mean()),
            "corr": float(np.corrcoef(x, -y)[0, 1]), "flipped": int(sum((x > 0) != (y > 0))),
            "a_pos": int((x > 0).sum()), "b_pos": int((y > 0).sum()),
            "dy_same_sign": int(sum((pa[k]["dy"] > 0) == (pb[k]["dy"] > 0) for k in keys)),
            "pairs": [[float(u), float(v)] for u, v in zip(x, y)]}


# ---- the sky -----------------------------------------------------------------------------------------------------

GOLDEN = 0.6180339887498949
SILVER = 0.4142135623730951


def sky_net(season: int, K=16, min_el=15.0, p=1.0) -> tuple[float, float]:
    """slab_sweep.rs `sky` at `sky_offsets(true, season)`: Σ w_k d_k's horizontal part, Σw = 1."""
    f, a = (0.5 + season * GOLDEN) % 1.0, (season * SILVER) % 1.0
    lo = math.sin(math.radians(min_el))
    x = z = tw = 0.0
    for i in range(K):
        s = lo + (1 - lo) * (i + f) / K
        c = math.sqrt(1 - s * s)
        az = 2 * math.pi * ((i * GOLDEN + a) % 1.0)
        w = s**p
        x += w * c * math.cos(az)
        z += w * c * math.sin(az)
        tw += w
    return x / tw, z / tw


def sky() -> dict:
    sk = json.loads((OUT / "hand/lone-open/L+x/1.json").read_text())["sky"]
    K, el, p = sk["K"], sk["minElevation"], sk["skyExponent"]
    per = [sky_net(s, K, el, p) for s in range(0, 71)]
    out = {"params": {"K": K, "minElevation": el, "skyExponent": p, "skyTilt": sk.get("skyTilt"),
                      "rotate": sk.get("rotate")},
           "per_season": per,
           "mean_1_5": list(np.mean(per[1:6], axis=0)), "mean_1_10": list(np.mean(per[1:11], axis=0)),
           "mean_1_70": list(np.mean(per[1:71], axis=0)),
           "max_abs": float(max(math.hypot(*v) for v in per))}
    (OUT / "sky.json").write_text(json.dumps(out, indent=1))
    print(json.dumps({k: v for k, v in out.items() if k != "per_season"}, indent=1))
    return out


# ---- real lean ---------------------------------------------------------------------------------------------------

def chord_lean(c) -> dict:
    from treesim import describe as ds

    c, _ = ds.drop_below_ground(c)
    tip = c.tip
    root = c.start[0]
    top = tip[int(np.argmax(tip[:, 2]))]
    d = top - root
    return {"lean": math.degrees(math.atan2(math.hypot(d[0], d[1]), d[2])), "height": float(d[2])}


def _real_one(row: dict) -> dict:
    from treesim import qsm
    from treesim import tolerance as tol

    vals = [chord_lean(qsm.read(row["path"], model=k).cylinders) for k in tol._optimum_set(row["path"])]
    return {"tree": row["tree"], "lean": float(np.median([v["lean"] for v in vals])),
            "height": float(np.median([v["height"] for v in vals])), "dbh": row.get("dbh_measured")}


def real() -> None:
    from treesim import tolerance as tol

    rows = [r for r in tol.real_sets() if r["dataset"] == "biodiv" and r["species"] == "Fagus_sylvatica"]
    with ProcessPoolExecutor(WORKERS) as ex:
        res = list(ex.map(_real_one, rows))
    (OUT / "real.json").write_text(json.dumps(res, indent=0))
    v = [r["lean"] for r in res]
    print("BioDiv n", len(v), "lean median", round(float(np.median(v)), 2), "IQR",
          [round(float(np.percentile(v, q)), 2) for q in (25, 75)], "p90", round(float(np.percentile(v, 90)), 2),
          "max", round(max(v), 2))


# ---- boleSway re-read --------------------------------------------------------------------------------------------

def _corr(a: list[float], b: list[float]) -> float:
    x, y = np.asarray(a, float), np.asarray(b, float)
    ok = np.isfinite(x) & np.isfinite(y)
    return float(np.corrcoef(x[ok], y[ok])[0, 1])


def bole() -> None:
    """crown-base's ztable trees (hand, v3, v4; 101-110; season 70) with each tree's chord lean from its dump, and
    boleSway's z and spread ratio with and without the trees bent over (chord lean above BioDiv's maximum)."""
    import crownbase_sim as cb

    reallean = json.loads((OUT / "real.json").read_text())
    cut = max(r["lean"] for r in reallean)
    real = cb.real_distribution()
    zt = json.loads((cb.OUT / "ztable.json").read_text())
    out = {"cut": cut, "sets": {}}
    for label in ("hand", "v3", "v4"):
        season = zt["sets"][label]["season"]
        trees = []
        for s in range(101, 111):
            desc = json.loads((cb.DUMPS / label / f"{s}.s{season}.json").read_text())
            dump = json.loads((cb.DUMPS / label / f"{s}.json").read_text())
            lean = {t["index"]: summary(t) for t in dump["trees"]
                    if t["trial"] == "stand" and t["season"] == season and t["alive"]}
            for r in desc:
                if r["trial"] == "stand":
                    trees.append({**r, "seed": s, **{k: lean[r["index"]][k] for k in ("lean", "az", "dx", "dy",
                                                                                         "cx", "cy", "top2_tilt")}})
        bent = [t for t in trees if t["lean"] > cut]
        kept = [t for t in trees if t["lean"] <= cut]
        out["sets"][label] = {
            "season": season, "n": len(trees), "bent": [(t["seed"], t["index"], round(t["lean"], 1),
                                                         round(t["boleSway"], 4)) for t in bent],
            "all": cb.zrow(trees, real, "boleSway"), "kept": cb.zrow(kept, real, "boleSway"),
            "corr_lean_sway": _corr([t["lean"] for t in trees], [t["boleSway"] for t in trees]),
            "az": rayleigh([t["az"] for t in trees]), "dx_pos": sum(t["dx"] > 0 for t in trees),
            "lean_median": float(np.median([t["lean"] for t in trees])),
        }
    (OUT / "bole.json").write_text(json.dumps(out, indent=1, default=float))
    print(json.dumps(out, indent=1, default=float))


# ---- report ------------------------------------------------------------------------------------------------------

def report() -> None:
    out: dict = {"sets": {}, "paired": {}, "early": {}}
    for name in conditions():
        by = load(name)
        a, trial, cond = name.split("/")
        last = 100 if trial.startswith("lone") else 70
        e = {}
        if trial == "stand":
            e["middle"] = describe_set(rows_at(by, last, MIDDLE))
            e["all12"] = describe_set(rows_at(by, last))
            for r, idx in (("front", [0, 1, 2, 3]), ("back", [8, 9, 10, 11])):
                e[r] = describe_set(rows_at(by, last, idx))
        else:
            e["tree"] = describe_set(rows_at(by, last))
        for age in (2, 5, 10):
            e[f"age{age}"] = describe_set(rows_at(by, age))
        lv = {json.dumps(r["level0"], sort_keys=True) for rows in by.values() for r in rows if r.get("level0")}
        e["level0"] = [json.loads(x) for x in lv]
        out["sets"][name] = e
    for a in ("hand", "v3", "v4"):
        for trial, last in (("lone-open", 100), ("stand", 70)):
            A, B = load(f"{a}/{trial}/L+x"), load(f"{a}/{trial}/L-x")
            out["paired"][f"{a}/{trial}"] = {f"age{s}": paired(A, B, s) for s in (2, 10, last)}
            out["paired"][f"{a}/{trial}"]["depth"] = paired(A, B, last, "dy")
            out["paired"][f"{a}/{trial}"]["centroid"] = paired(A, B, last, "cx")
    (OUT / "report.json").write_text(json.dumps(out, indent=1, default=float))
    _print(out)
    _figure(out)


def _print(out: dict) -> None:
    print("\n## lean azimuths (final season)")
    for name, e in out["sets"].items():
        for part in ("tree", "middle", "all12", "front", "back"):
            if part not in e:
                continue
            d = e[part]
            r = d["rayleigh"]
            print(f"{name:26s} {part:6s} n {d['n']:3d}  az {r['mean']:6.1f} R {r['R']:.2f} p {r['p']:.1e}  "
                  f"lean {d['lean_median']:5.1f}° dx+ {d['dx_pos']}/{d['n']} dx {d['dx_mean']:+.2f} "
                  f"dy {d['dy_mean']:+.2f}  cx+ {d['cx_pos']} cx {d['cx_mean']:+.2f} cy {d['cy_mean']:+.2f}  "
                  f"top2 {d['top2_tilt_median']:.0f}° tilt10/50/90 {d['tilt10']:.0f}/{d['tilt50']:.0f}/{d['tilt90']:.0f}"
                  f" H {d['height']:.1f}")
        for age in (2, 5, 10):
            d = e[f"age{age}"]
            if d["n"]:
                r = d["rayleigh"]
                print(f"{'':26s} age{age:<3d} n {d['n']:3d}  az {r['mean']:6.1f} R {r['R']:.2f} p {r['p']:.1e}"
                      f"  lean {d['lean_median']:.1f}° dx+ {d['dx_pos']}/{d['n']}")
        print(f"{'':26s} level0 {e['level0']}")
    print("\n## paired L = +x against L = −x")
    for name, p in out["paired"].items():
        for k, d in p.items():
            if d.get("n", 0) >= 2:
                print(f"{name:20s} {k:9s} n {d['n']:3d} +x mean {d['a_mean']:+.3f} −x mean {d['b_mean']:+.3f} "
                      f"sum {d['sum_mean']:+.3f} corr(a,−b) {d['corr']:.3f} flipped {d['flipped']}/{d['n']} "
                      f"(+x: {d['a_pos']}, −x: {d['b_pos']} positive; dy same sign {d['dy_same_sign']})")


def _figure(out: dict) -> None:
    import pandas as pd
    from plotnine import (aes, facet_grid, facet_wrap, geom_abline, geom_boxplot, geom_hline, geom_jitter, geom_point,
                          element_text, geom_vline, ggplot, labs, theme, theme_bw)
    from plotnine.composition import Compose  # noqa: F401  (plotnine ≥ 0.15: | and / compose)

    rows = []
    for name in conditions():
        a, trial, cond = name.split("/")
        last = 100 if trial.startswith("lone") else 70
        for r in rows_at(load(name), last):
            rows.append({"assign": a, "trial": trial, "control": cond, "dx": r["dx"], "dy": r["dy"],
                         "lean": r["lean"], "middle": r["index"] in MIDDLE or trial != "stand"})
    df = pd.DataFrame(rows)
    sel = df[df.control.isin(["L+x", "L-x"]) & df.trial.isin(["lone-open", "stand"])]
    p1 = (ggplot(sel, aes("dx", "dy", colour="control")) + geom_hline(yintercept=0, colour="#bbbbbb")
          + geom_vline(xintercept=0, colour="#bbbbbb") + geom_point(size=1.2, alpha=0.7)
          + facet_grid("trial ~ assign") + theme_bw()
          + labs(x="chord's top − root in x (m)", y="in depth (m, + toward the back face)",
                 title="Lean of every tree, seeds 1–20 (lone at 100, stand at 70): the seedling's L = +x against −x"))
    pr = []
    for name, p in out["paired"].items():
        a, trial = name.split("/")
        last = "age100" if trial == "lone-open" else "age70"
        for u, v in p[last]["pairs"]:
            pr.append({"assign": a, "trial": trial, "L+x": u, "L-x": v})
    p2 = (ggplot(pd.DataFrame(pr), aes("L+x", "L-x", colour="assign")) + geom_abline(slope=-1, intercept=0,
                                                                                      colour="#999999")
          + geom_point(size=1.2, alpha=0.7) + facet_wrap("~ trial", scales="free") + theme_bw()
          + labs(x="x lean with L = +x (m)", y="x lean with L = −x (m), same seed and tree",
                 title="Paired flip: a pure mirror lies on y = −x"))
    real = json.loads((OUT / "real.json").read_text())
    lr = [{"set": "BioDiv (53)", "lean": r["lean"]} for r in real]
    bl = json.loads((OUT / "bole.json").read_text()) if (OUT / "bole.json").exists() else None
    for a in ("hand", "v3", "v4"):
        for r in rows_at(load(f"{a}/stand/L+x"), 70, MIDDLE):
            lr.append({"set": f"{a} stand 70", "lean": r["lean"]})
        for r in rows_at(load(f"{a}/lone-0.2/L+x"), 100):
            lr.append({"set": f"{a} lone 100", "lean": r["lean"]})
    p3 = (ggplot(pd.DataFrame(lr), aes("set", "lean")) + geom_boxplot(outlier_shape="") + geom_jitter(width=0.15,
                                                                                                     size=0.8,
                                                                                                     alpha=0.5)
          + theme_bw() + theme(axis_text_x=element_text(rotation=30, ha="right"))
          + labs(x="", y="chord lean from vertical (°)", title="Lean angle, real against simulated (middle row)"))
    _ = bl
    fig = (p1 / (p2 | p3)) & theme(figure_size=(14, 13))
    FIG.parent.mkdir(parents=True, exist_ok=True)
    fig.save(FIG, dpi=110, verbose=False)
    print("figure", FIG)


if __name__ == "__main__":
    {"runs": runs, "sky": sky, "real": real, "bole": bole, "report": report}[sys.argv[1]]()
