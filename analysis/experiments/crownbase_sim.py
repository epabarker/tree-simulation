"""Crown base and bole (2026-11-05; docs/experiments/2026-11-05-crown-base-and-bole.md): simulated stands described
as Level 1 reads them, for the new descriptors (crownBase80/70/90, trunkTortuosity05) and the registered ones beside.

Each condition is (label, assign, patch): `crownbase_dump.ts` dumps the four measured stand trees at seasons 50..100
by 10 and the lone tree; the stand's trees at the size-matched season (and the lone tree where asked) are coarsened as registration v5's `sim_rule` (inflate, prune at BioDiv's
d_min) and described; the season is the size match of v5 (`size_match.rule`: the first season at which the median
over seeds of the per-seed median DBH of the live measured trees reaches 0.291 m). z and spread ratio against BioDiv's
distribution (level1.distribution of the median over repeats, detrended on ln DBH to 0.291 m; runs/crown-base/real.json,
written by gate_c_v32.py register), as level1.score and spread_ratios do, pooled over the seeds' trees.

  uv run --project analysis python -I analysis/experiments/crownbase_sim.py ztable   # the hand, v3, v4 on 101-110
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

from treesim import coarsen as co  # noqa: E402
from treesim import cylinders as cy  # noqa: E402
from treesim import level1 as l1  # noqa: E402
from treesim import simtree  # noqa: E402
from treesim import describe as ds  # noqa: E402
from treesim.describe import DIAGNOSTIC, describe  # noqa: E402

OUT = ROOT / "runs/crown-base"
DUMPS = OUT / "dumps"
REG = json.loads((ROOT / "analysis/fit/sources/level1-beech.json").read_text())
D_MIN = REG["d_min_m"]
AT = REG["size_match"]["dbh"]
SEASONS = [50, 60, 70, 80, 90, 100]
NEW = ["crownBase80", "crownBase70", "crownBase90", "trunkTortuosity05"]
NAMES = NEW + sorted(REG["descriptors"])
FITS = ROOT / "docs/experiments/fits"


def hand_assign() -> dict:
    return json.loads((FITS / "level1-pilot-v4/beech.json").read_text())["hand"]["assign"]


def fit_assign(v: str) -> dict:
    return json.loads((FITS / f"level1-pilot-{v}/beech.json").read_text())["fit"]["assign"]


def _dump(args) -> str:
    name, job = args
    out = DUMPS / f"{name}.json"
    if out.exists():
        return str(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    jf = out.with_suffix(".job.json")
    jf.write_text(json.dumps(job))
    part = out.with_suffix(".partial")
    r = subprocess.run(["node", str(HERE / "crownbase_dump.ts"), str(jf), str(part)], cwd=ROOT, capture_output=True,
                       text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{name}: {r.stderr[-2000:]}")
    part.rename(out)
    return str(out)


SWAY = ("trunkSway", "trunkSwayWhole")


def sway(c: cy.Cylinders, base: float) -> dict:
    """A diagnostic, not a descriptor (it is not in describe.py, whose hash v3.2 registered): the trunk's largest
    distance (metres) from the chord of its stretch, root to crownBase80's height (`trunkSway`) and root to its top
    (`trunkSwayWhole`), on the path resampled at 0.5 m. Path over chord reads a gentle sway only to second order
    (a sine of amplitude A over wavelength λ: 1 + (πA/λ)²), so a bole that visibly snakes can read 1.005."""
    c, _ = ds.drop_below_ground(c)
    labels = ds.geometric_labels(c)
    out = {}
    for name, b in (("trunkSway", base), ("trunkSwayWhole", 1.0 + 1e-9)):
        pts = ds.trunk_stretch(c, labels, b)
        if pts is None or len(pts) < 2:
            out[name] = math.nan
            continue
        pts = ds._resample(pts)
        a, e = pts[0], pts[-1]
        u = (e - a) / max(np.linalg.norm(e - a), 1e-12)
        rel = pts - a
        out[name] = float(np.linalg.norm(rel - np.outer(rel @ u, u), axis=1).max())
    return out


def _sizes(path: str) -> list[dict]:
    """Pass 1: every stand tree's DBH (uncoarsened, cylinders.dbh) by season, for the size match."""
    d = json.loads(Path(path).read_text())
    return [{"trial": t["trial"], "season": t["season"], "index": t["index"], "alive": t["alive"],
             "dbh": cy.dbh(simtree.from_dump(t).cylinders) if t["alive"] else math.nan}
            for t in d["trees"] if t["trial"] == "stand"]


def _describe(args) -> list[dict]:
    """Pass 2: the live stand trees at `season` and (if asked) the lone tree, coarsened as v5's sim_rule."""
    path, season, lone = args
    d = json.loads(Path(path).read_text())
    rows = []
    for t in d["trees"]:
        if not t["alive"] or not ((t["trial"] == "stand" and t["season"] == season) or (lone and t["trial"] == "lone")):
            continue
        st = simtree.from_dump(t)
        v = describe(co.coarsen(st.cylinders, co.Resolution(D_MIN, (), ()), inflated=True))
        rows.append({"trial": t["trial"], "season": t["season"], "index": t["index"], "alive": True,
                     "dbh": cy.dbh(st.cylinders), "height": v["height"],
                     **{k: float(v[k]) for k in NAMES + list(DIAGNOSTIC) + ["crownBase"]},
                     **sway(co.coarsen(st.cylinders, co.Resolution(D_MIN, (), ()), inflated=True), v["crownBase80"])})
    return rows


def _cached(fn, path: str, tag: str, args) -> list[dict]:
    store = Path(path).with_suffix(f".{tag}.json")
    if store.exists():
        return json.loads(store.read_text())
    rows = fn(args)
    store.write_text(json.dumps(rows))
    return rows


def _sizes_c(path):
    return _cached(_sizes, path, "sizes", path)


def _describe_c(args):
    path, season, lone = args
    return _cached(_describe, path, f"s{season}{'L' if lone else ''}", args)


def run(conditions: dict[str, dict], seeds: list[int], lone: list[int] | None = None, describe_lone: bool = False,
        workers: int = 12) -> dict:
    """conditions: label → {assign, patch}. Returns label → {"season", "seeds": seed → described rows}, the season by
    v5's size match on the stand's DBH (pass 1), the trees described at that season only (pass 2); cached per dump."""
    jobs = [(f"{label}/{s}", {"species": "beech", "seed": s, "assign": c.get("assign", {}),
                              "patch": c.get("patch", {}), "stand": SEASONS, "lone": lone or [100]})
            for label, c in conditions.items() for s in seeds]
    with ProcessPoolExecutor(workers) as ex:
        paths = list(ex.map(_dump, jobs))
        sizes = list(ex.map(_sizes_c, paths))
        by_label: dict = {}
        for (name, _), p, sz in zip(jobs, paths, sizes):
            label, s = name.rsplit("/", 1)
            by_label.setdefault(label, {})[int(s)] = (p, sz)
        season = {label: match({s: sz for s, (_, sz) in v.items()}) for label, v in by_label.items()}
        todo = [(label, s, (p, season[label], describe_lone)) for label, v in by_label.items()
                for s, (p, _) in v.items() if season[label] is not None]
        rows = list(ex.map(_describe_c, [t[2] for t in todo], chunksize=1))
    out = {label: {"season": season[label], "seeds": {}} for label in by_label}
    for (label, s, _), r in zip(todo, rows):
        out[label]["seeds"][s] = r
    return out


def match(by_seed: dict[int, list[dict]]) -> int | None:
    per_seed = [{s: float(np.median([t["dbh"] for t in rows if t["trial"] == "stand" and t["alive"]
                                     and t["season"] == s]))
                 for s in SEASONS if any(t["trial"] == "stand" and t["alive"] and t["season"] == s for t in rows)}
                for rows in by_seed.values()]
    return l1.match_season(per_seed, AT, SEASONS)


def real_distribution() -> dict:
    real = json.loads((OUT / "real.json").read_text())
    dbh = [r["dbh"] for r in real.values()]
    out = {}
    for k in NAMES + list(DIAGNOSTIC):
        vals = [math.nan if r.get(k) is None else r[k] for r in real.values()]
        out[k] = l1.distribution(vals, dbh, AT) if k in NAMES else {
            "median": float(np.nanmedian(vals)), "n": int(np.isfinite(vals).sum())}
    return out


def stand_trees(by_seed: dict[int, list[dict]], season: int) -> list[dict]:
    return [t for rows in by_seed.values() for t in rows if t["trial"] == "stand" and t["alive"]
            and t["season"] == season]


def zrow(trees: list[dict], real: dict, k: str) -> dict:
    v = l1.detrended(trees, k, real[k]["slope"], AT)
    if len(v) < 2:
        return {"z": math.nan, "ratio": math.nan, "median": math.nan, "n": len(v)}
    med = float(np.median(v))
    return {"z": (med - real[k]["median"]) / real[k]["sd"], "ratio": float(np.std(v, ddof=1)) / real[k]["sd"],
            "median": med, "n": len(v)}


def ztable() -> None:
    conditions = {"shipped": {}, "hand": {"assign": hand_assign()}, "v3": {"assign": fit_assign("v3")},
                  "v4": {"assign": fit_assign("v4")}}
    seeds = list(range(101, 111))
    res = run(conditions, seeds)
    real = real_distribution()
    table = {"real": {k: real[k] for k in NAMES}, "sets": {}}
    for label, r in res.items():
        season, by_seed = r["season"], r["seeds"]
        trees = stand_trees(by_seed, season) if season else []
        table["sets"][label] = {
            "season": season, "trees": len(trees), "dbh": float(np.median([t["dbh"] for t in trees])) if trees else None,
            "height": float(np.median([t["height"] for t in trees])) if trees else None,
            "z": {k: zrow(trees, real, k) for k in NAMES},
            "raw_median": {k: float(np.nanmedian([t[k] for t in trees])) for k in NAMES + list(DIAGNOSTIC) + list(SWAY)},
            "fork_below_base": float(np.mean([t["forkHeight"] < t["crownBase80"] for t in trees
                                              if math.isfinite(t["crownBase80"])])) if trees else None,
        }
    (OUT / "ztable.json").write_text(json.dumps(table, indent=1, default=float))
    print("real:", {k: round(real[k]["median"], 4) for k in NEW}, {k: round(real[k]["sd"], 4) for k in NEW})
    for label, s in table["sets"].items():
        print(label, "season", s["season"], "n", s["trees"], "dbh", s["dbh"], "H", s["height"])
        for k in NEW + ["centroidHeight", "p0", "tortuosity05"]:
            print(f"   {k}: z {s['z'][k]['z']:+.2f} ratio {s['z'][k]['ratio']:.2f} raw {s['raw_median'][k]:.4f}"
                  )
        print("   diag", {k: round(s["raw_median"][k], 3) for k in list(DIAGNOSTIC) + list(SWAY)}, "forkBelow", s["fork_below_base"])


def _real_sway(row: dict) -> dict:
    from treesim import qsm
    from treesim import tolerance as tol

    vals = []
    for k in tol._optimum_set(row["path"]):
        c = qsm.read(row["path"], model=k).cylinders
        vals.append(sway(c, describe(c)["crownBase80"]))
    return {"tree": row["tree"], **{n: float(np.nanmedian([v[n] for v in vals])) for n in SWAY}}


def realsway() -> None:
    """The sway diagnostic on BioDiv's 53 beeches (median over repeats) → runs/crown-base/real-sway.json."""
    from treesim import tolerance as tol

    rows = [r for r in tol.real_sets() if r["dataset"] == "biodiv" and r["species"] == "Fagus_sylvatica"]
    with ProcessPoolExecutor(12) as ex:
        res = list(ex.map(_real_sway, rows))
    (OUT / "real-sway.json").write_text(json.dumps(res, indent=0))
    for n in SWAY:
        v = [r[n] for r in res if math.isfinite(r[n])]
        print(n, "median", round(float(np.median(v)), 3), "IQR", [round(float(np.percentile(v, q)), 3) for q in (25, 75)])


if __name__ == "__main__":
    {"ztable": ztable, "realsway": realsway}[sys.argv[1]]()
